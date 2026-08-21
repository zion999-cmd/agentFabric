// Knowledge Ingest — Fabric operational control for the Shared Knowledge layer.
// P0008.4 §10: the Agent (Hermes) executes the Ingest flow defined in KNOWLEDGE.md.
// Fabric only: (1) enumerates raw sources + marks provenance-referenced state,
// (2) provides an explicit Ingest entry that launches Hermes in the current
// Fabric Workspace, (3) surfaces Hermes's report verbatim.
// Fabric NEVER summarizes raw, generates pages, or designs a Knowledge Engine.

import { Router } from 'express';
import type { Database as Db } from 'better-sqlite3';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { HermesSessionClient } from '#platform/runtime/hermes/index.js';
import type { CreateSessionParams } from '#platform/runtime/hermes/index.js';
import { buildKnowledgeStatus } from '#app/runtime/shared-knowledge/status.js';
import { initSharedKnowledgeLayer } from '#app/runtime/shared-knowledge/index.js';
import { collectTurn } from './situation-chat.js';
import type { SituationChatClient } from './situation-chat.js';

/** Raw source upload limits (first version: text only, no PDF/DOCX pipeline). */
export const MAX_SOURCE_BYTES = 500_000;
const ALLOWED_SOURCE_EXT = new Set(['.txt', '.md']);

/** Validation result for a raw source upload. */
export type UploadResult = { ok: true; filename: string } | { ok: false; status: number; error: string };

/** Validate a raw-source upload without touching the filesystem (pure). */
export const validateRawUpload = (filename: string, content: string): UploadResult => {
  const name = filename.trim();
  if (!name) return { ok: false, status: 400, error: '缺少文件名。' };
  if (basename(name) !== name) return { ok: false, status: 400, error: '文件名不能包含路径。' };
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_SOURCE_EXT.has(ext)) {
    return { ok: false, status: 400, error: '第一版仅支持 .txt / .md 文本资料。' };
  }
  if (name.startsWith('.')) return { ok: false, status: 400, error: '文件名不能以点开头。' };
  if (!content.trim()) return { ok: false, status: 400, error: '内容为空，未上传。' };
  if (content.length > MAX_SOURCE_BYTES) {
    return { ok: false, status: 400, error: `内容超过 ${MAX_SOURCE_BYTES / 1000}KB 限制。` };
  }
  return { ok: true, filename: name };
};

/** Write a raw source into the raw dir (immutable provenance: never overwrite). */
export const storeRawSource = (rawDir: string, filename: string, content: string): UploadResult => {
  const target = resolve(rawDir, filename);
  if (!target.startsWith(rawDir + '/')) return { ok: false, status: 400, error: '非法路径。' };
  if (existsSync(target)) {
    return {
      ok: false,
      status: 409,
      error: `同名文件「${filename}」已存在，拒绝覆盖。请重命名后重新上传。`,
    };
  }
  try {
    writeFileSync(target, content, 'utf-8');
    return { ok: true, filename };
  } catch (err) {
    return { ok: false, status: 500, error: err instanceof Error ? err.message : '写入失败' };
  }
};

interface KnowledgeIngestOptions {
  /** Directory of the Fabric Workspace (contains knowledge-sources/raw/ + knowledge/). */
  workspaceDir: string;
  /** Hermes serve URL */
  hermesUrl?: string;
  /** Hermes profile name */
  profile?: string;
  /** Client factory (injectable for tests; defaults to HermesSessionClient). */
  clientFactory?: (url?: string) => SituationChatClient;
  /** Database handle — unused today; reserved so mounting stays uniform. */
  db?: Db;
}

/** Minimal prompt: instruct Hermes to execute the KNOWLEDGE.md Ingest flow. */
const INGEST_PROMPT = [
  '执行 knowledge/KNOWLEDGE.md 中定义的 Ingest 流程（Operations → Ingest）。',
  '请：',
  '1. 阅读 knowledge-sources/raw/ 目录下的源材料，优先处理尚未被任何 knowledge 页面 sources 引用的源；',
  '2. 按治理规则判断 create vs update：新主题创建 knowledge/ 页面，相关主题更新已有页面；',
  '3. 每个页面 YAML frontmatter 的 sources 字段必须引用对应的 raw 文件；',
  '4. 更新 knowledge/INDEX.md 导航；',
  '5. 在 knowledge/log.md 追加本次 ingest 记录；',
  '6. 只写 knowledge/ 目录，永不修改 knowledge-sources/raw/。',
  '完成后用列表汇报你创建/更新了哪些页面、更新了哪些 INDEX/log。',
].join('\n');

export const knowledgeRouter = (options: KnowledgeIngestOptions): Router => {
  const router = Router();
  // Knowledge layer is independent of the systems/capabilities projection: seed
  // raw + knowledge if absent (idempotent, never clears) without writeProjection,
  // so constructing this router never races with other servers on the workspace.
  const workspaceDir = resolve(options.workspaceDir);
  initSharedKnowledgeLayer(workspaceDir);

  // Reused Hermes session (created lazily on first ingest).
  let ingestSession: { client: SituationChatClient; hermesSessionId: string } | null = null;

  const ensureSession = async (): Promise<{ client: SituationChatClient; hermesSessionId: string }> => {
    if (ingestSession) return ingestSession;
    const client = options.clientFactory
      ? options.clientFactory(options.hermesUrl)
      : new HermesSessionClient(options.hermesUrl ? { url: options.hermesUrl } : {});
    await client.connect();
    const params: CreateSessionParams = { cwd: workspaceDir };
    if (options.profile) params.profile = options.profile;
    const created = await client.createSession(params);
    ingestSession = { client, hermesSessionId: created.sessionId };
    return ingestSession;
  };

  // GET /api/knowledge/status — enumerate raw sources + provenance-referenced state.
  router.get('/knowledge/status', (_req, res) => {
    try {
      const status = buildKnowledgeStatus(workspaceDir);
      res.json({ success: true, data: status });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to build knowledge status',
      });
    }
  });

  // POST /api/knowledge/upload — add a raw source (first version: .txt / .md).
  // Raw sources are immutable provenance: no overwrite, no online edit, never
  // written outside knowledge-sources/raw/.
  router.post('/knowledge/upload', (req, res) => {
    const filename = (req.body?.filename ?? '').toString().trim();
    const content = (req.body?.content ?? '').toString();

    const validated = validateRawUpload(filename, content);
    if (!validated.ok) {
      res.status(validated.status).json({ success: false, error: validated.error });
      return;
    }

    const rawDir = resolve(workspaceDir, 'knowledge-sources', 'raw');
    const stored = storeRawSource(rawDir, validated.filename, content);
    if (!stored.ok) {
      res.status(stored.status).json({ success: false, error: stored.error });
      return;
    }

    res.json({ success: true, filename: stored.filename, status: buildKnowledgeStatus(workspaceDir) });
  });

  // POST /api/knowledge/ingest — launch Hermes in the Fabric Workspace to run the
  // KNOWLEDGE.md Ingest flow. Hermes reads raw → organizes → writes knowledge/*.md
  // → updates INDEX.md → appends log.md. Fabric relays Hermes's report verbatim.
  // On Agent timeout/error, still return a FRESH filesystem status so the UI can
  // honestly separate "Agent execution" from "what actually landed on disk".
  router.post('/knowledge/ingest', async (req, res) => {
    const target = (req.body?.source ?? '').toString().trim();
    try {
      const active = await ensureSession();

      let prompt = INGEST_PROMPT;
      if (target) {
        prompt = `只处理源材料 ${target}：\n${INGEST_PROMPT}`;
      }

      const replyPromise = collectTurn(active.client, active.hermesSessionId);
      await active.client.submitPrompt(active.hermesSessionId, prompt);
      const reply = await replyPromise;

      res.json({
        success: true,
        agentStatus: 'completed',
        sessionId: active.hermesSessionId,
        reply,
        // Post-ingest state (Fabric-side, pure enumeration) so the operator sees
        // whether provenance coverage moved without Fabric judging content.
        status: buildKnowledgeStatus(workspaceDir),
      });
    } catch (err) {
      ingestSession = null; // drop session so the next ingest can retry fresh
      const message = err instanceof Error ? err.message : 'Ingest failed';
      res.status(200).json({
        success: false,
        // Distinguish a turn timeout (model slow/stalled — known P0009 limitation)
        // from a hard connection error.
        agentStatus: /timed out/i.test(message) ? 'timeout' : 'error',
        error: message,
        // Fresh filesystem truth regardless of Agent status — never fabricate.
        status: buildKnowledgeStatus(workspaceDir),
      });
    }
  });

  return router;
};

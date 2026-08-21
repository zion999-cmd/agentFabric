// Knowledge Ingest — Fabric operational control for the Shared Knowledge layer.
// P0008.4 §10: the Agent (Hermes) executes the Ingest flow defined in KNOWLEDGE.md.
// Fabric only: (1) enumerates raw sources + marks provenance-referenced state,
// (2) provides an explicit Ingest entry that launches Hermes in the current
// Fabric Workspace, (3) surfaces Hermes's report verbatim.
// Fabric NEVER summarizes raw, generates pages, or designs a Knowledge Engine.

import { Router } from 'express';
import type { Database as Db } from 'better-sqlite3';
import { HermesSessionClient } from '#platform/runtime/hermes/index.js';
import type { CreateSessionParams } from '#platform/runtime/hermes/index.js';
import { buildKnowledgeStatus } from '#app/runtime/shared-knowledge/status.js';
import { ensureWorkspace, collectTurn } from './situation-chat.js';
import type { SituationChatClient } from './situation-chat.js';

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
  const workspaceDir = ensureWorkspace(options.workspaceDir);

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

  // POST /api/knowledge/ingest — launch Hermes in the Fabric Workspace to run the
  // KNOWLEDGE.md Ingest flow. Hermes reads raw → organizes → writes knowledge/*.md
  // → updates INDEX.md → appends log.md. Fabric relays Hermes's report verbatim.
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
        sessionId: active.hermesSessionId,
        reply,
        // Post-ingest state (Fabric-side, pure enumeration) so the operator sees
        // whether provenance coverage moved without Fabric judging content.
        status: buildKnowledgeStatus(workspaceDir),
      });
    } catch (err) {
      ingestSession = null; // drop session so the next ingest can retry fresh
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Ingest failed',
      });
    }
  });

  return router;
};

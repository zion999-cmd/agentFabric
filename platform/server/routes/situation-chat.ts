// Situation Chat Runtime Bridge — Browser ↔ Fabric ↔ Hermes Session.
// P0008.3. Holds Situation → Hermes session mapping SERVER-SIDE (in-memory).
//
// Flow:
//   POST /api/situation/:id/chat  { message }
//     → ensure Hermes session exists for this situation (cwd = Fabric Workspace)
//     → prompt.submit
//     → accumulate message.delta events into response text
//     → return { sessionId, reply }
//
// Session mapping is held here (Fabric server), NOT in the browser. Legacy
// /api/chat remains untouched.

import { Router } from 'express';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Database as Db } from 'better-sqlite3';
import { HermesSessionClient } from '#platform/runtime/hermes/index.js';
import type { HermesEvent, CreateSessionParams, CreateSessionResult } from '#platform/runtime/hermes/index.js';
import { writeProjection } from '#app/runtime/fabric-workspace/index.js';
import { JD_FIXTURE } from '#app/runtime/fabric-workspace/jd-fixture.js';
import { loadCapabilityEntries } from '#app/runtime/fabric-workspace/capability-loader.js';
import { initSharedKnowledgeLayer } from '#app/runtime/shared-knowledge/index.js';
import {
  loadSituation,
  loadLearningContext,
  storeInvestigationInLearningContext,
} from '#app/experience/learning-context-producer.js';
import { buildInvestigationPrompt, parseInvestigation } from '#app/runtime/investigation/index.js';

// ---- Session registry (server-side) ----

/** Minimal interface the bridge needs from a Hermes session client (testable). */
export interface SituationChatClient {
  connect(): Promise<void>;
  createSession(params: CreateSessionParams): Promise<CreateSessionResult>;
  submitPrompt(sessionId: string, text: string): Promise<void>;
  onEvent(handler: (event: HermesEvent) => void): () => void;
  close(): void;
}

interface ActiveSituationSession {
  client: SituationChatClient;
  hermesSessionId: string;
}

interface SituationChatOptions {
  /** Directory to project the Fabric Workspace into */
  workspaceDir: string;
  /** Hermes serve URL */
  hermesUrl?: string;
  /** Hermes profile name */
  profile?: string;
  /** Client factory (injectable for tests; defaults to HermesSessionClient) */
  clientFactory?: (url?: string) => SituationChatClient;
  /** Database handle — enables delivering the situation's Learning Context to Hermes. */
  db?: Db;
}

/** Lazily build the Fabric Agent Workspace: systems/ + capabilities/ (projected) + knowledge/ (seeded, persistent). */
export const ensureWorkspace = (dir: string): string => {
  writeProjection(
    {
      worldModel: JD_FIXTURE.worldModel,
      bindings: JD_FIXTURE.bindings,
      capabilities: loadCapabilityEntries(),
    },
    dir,
  );
  // P0008.4: seed the Shared Knowledge layer (raw immutable + knowledge Read Model).
  // Idempotent — never deletes Agent-maintained knowledge pages.
  initSharedKnowledgeLayer(dir);
  return resolve(dir);
};

/** Deliver a situation's Learning Context into the Hermes session workspace. */
const writeLearningContextToWorkspace = (dir: string, situationId: string, ctx: unknown): void => {
  const situationsDir = resolve(dir, 'situations');
  mkdirSync(situationsDir, { recursive: true });
  writeFileSync(resolve(situationsDir, `${situationId}.json`), JSON.stringify(ctx, null, 2), 'utf-8');
};

/** Accumulate message.delta text until message.complete, resolve with full reply. */
export const collectTurn = (client: SituationChatClient, sessionId: string, timeoutMs = 300_000): Promise<string> => {
  return new Promise((resolveTurn, rejectTurn) => {
    let text = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      unsubscribe();
      rejectTurn(new Error('Turn timed out waiting for message.complete'));
      // Hermes model latency is unstable (documented: 71-77s fast path, >180s
      // slow path; an ingest that reads sources + writes pages takes longer).
      // 300s keeps the Agent's real completion time inside the window.
    }, timeoutMs);

    const unsubscribe = client.onEvent((event: HermesEvent) => {
      if (event.session_id !== undefined && event.session_id !== sessionId) return;

      if (event.type === 'message.delta') {
        const delta = String(event.payload?.text ?? '');
        text += delta;
      } else if (event.type === 'message.complete') {
        // Terminal event (Hermes WS gateway emits message.complete, not turn.end).
        if (timedOut) return;
        clearTimeout(timeout);
        unsubscribe();
        if (event.payload?.status === 'error') {
          rejectTurn(new Error(`Hermes message error: ${event.payload?.text ?? ''}`));
          return;
        }
        // message.complete carries the full text; prefer accumulated if non-empty.
        const complete = String(event.payload?.text ?? '');
        resolveTurn((text.trim() || complete.trim()).trim());
      }
    });
  });
};

// ---- Router ----

export const situationChatRouter = (options: SituationChatOptions): Router => {
  const router = Router();
  const sessions = new Map<string, ActiveSituationSession>();
  const workspaceDir = ensureWorkspace(options.workspaceDir);

  // POST /api/situation/:id/chat — send a message in a situation-scoped session.
  router.post('/situation/:id/chat', async (req, res) => {
    const situationId = req.params['id'];
    if (!situationId) {
      res.status(400).json({ error: 'Missing situation ID' });
      return;
    }
    const message = (req.body?.message ?? '').toString().trim();
    if (!message) {
      res.status(400).json({ error: 'Missing message' });
      return;
    }

    try {
      // Ensure session (create on first message, reuse after).
      let active = sessions.get(situationId);
      if (!active) {
        // Deliver the situation's Learning Context into the session workspace so
        // Hermes can read it (Fabric's experience delivery layer — Memory stays
        // with Hermes). Best-effort: absence of a context is not fatal.
        if (options.db) {
          const ctx = loadLearningContext(options.db, situationId);
          if (ctx) writeLearningContextToWorkspace(workspaceDir, situationId, ctx);
        }

        const client = options.clientFactory
          ? options.clientFactory(options.hermesUrl)
          : new HermesSessionClient(options.hermesUrl ? { url: options.hermesUrl } : {});
        await client.connect();
        const created = await client.createSession({
          cwd: workspaceDir,
          ...(options.profile ? { profile: options.profile } : {}),
        });
        active = { client, hermesSessionId: created.sessionId };
        sessions.set(situationId, active);
      }

      // Register event collection BEFORE submit — no events are missed.
      const replyPromise = collectTurn(active.client, active.hermesSessionId);
      await active.client.submitPrompt(active.hermesSessionId, message);
      const reply = await replyPromise;

      res.json({
        success: true,
        sessionId: active.hermesSessionId,
        reply,
      });
    } catch (err) {
      // On failure, drop the cached session so the next message can retry fresh.
      sessions.delete(situationId);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Chat failed',
      });
    }
  });

  // GET /api/situation/:id/session — expose the server-held session mapping (read-only).
  router.get('/situation/:id/session', (req, res) => {
    const situationId = req.params['id'];
    const active = sessions.get(situationId ?? '');
    res.json({
      situationId,
      hasSession: Boolean(active),
      hermesSessionId: active?.hermesSessionId ?? null,
    });
  });

  // GET /api/situation/:id/investigation — the situation's stored P0010
  // Investigation Contract (read-only; null when not yet investigated).
  router.get('/situation/:id/investigation', (req, res) => {
    const situationId = req.params['id'];
    if (!options.db) {
      res.json({ success: false, error: 'Investigation requires a database' });
      return;
    }
    const investigation = loadLearningContext(options.db, situationId)?.investigation ?? null;
    res.json({ success: true, situationId, investigation });
  });

  // POST /api/situation/:id/investigate — P0010 Knowledge-Guided Investigation.
  // Runs in the SAME Hermes session as the situation chat (sessions Map), so the
  // capability-execution result returns into the same turn. Fabric owns: trigger,
  // situation+evidence delivery, capability tool, persistence, workspace surface.
  // Hermes owns: reading Knowledge, forming understanding, choosing the Next
  // Question, selecting a capability, acquiring evidence, updating understanding.
  // On timeout, returns agentStatus:'timeout' + the persisted state (never
  // fabricates a completed investigation).
  router.post('/situation/:id/investigate', async (req, res) => {
    const situationId = req.params['id'];
    if (!situationId) {
      res.status(400).json({ success: false, error: 'Missing situation ID' });
      return;
    }
    if (!options.db) {
      res.status(500).json({ success: false, error: 'Investigation requires a database' });
      return;
    }

    const situation = loadSituation(options.db, situationId);
    if (!situation) {
      res.status(404).json({ success: false, error: 'Situation not found' });
      return;
    }

    try {
      // Ensure the SAME session used by situation chat (reuse, no new session).
      let active = sessions.get(situationId);
      if (!active) {
        if (options.db) {
          const ctx = loadLearningContext(options.db, situationId);
          if (ctx) writeLearningContextToWorkspace(workspaceDir, situationId, ctx);
        }
        const client = options.clientFactory
          ? options.clientFactory(options.hermesUrl)
          : new HermesSessionClient(options.hermesUrl ? { url: options.hermesUrl } : {});
        await client.connect();
        const created = await client.createSession({
          cwd: workspaceDir,
          ...(options.profile ? { profile: options.profile } : {}),
        });
        active = { client, hermesSessionId: created.sessionId };
        sessions.set(situationId, active);
      }

      const ctx = loadLearningContext(options.db, situationId);
      const prompt = buildInvestigationPrompt(situation, ctx);

      const replyPromise = collectTurn(active.client, active.hermesSessionId, 600_000);
      await active.client.submitPrompt(active.hermesSessionId, prompt);
      const reply = await replyPromise;

      // Phase 2: if the Agent ran the investigation but did not emit the
      // structured contract (prose report), ask it — in the SAME session — to
      // structure what it did. Fabric does NOT synthesize the contract.
      let parsed = parseInvestigation(reply, situationId);
      if (!parsed.ok) {
        const finalizePrompt = [
          `You just investigated situation ${situationId}. Now output ONLY the Investigation Contract as a single JSON object (no prose, no markdown fences).`,
          `Use the exact shape: {"situationId":"${situationId}","currentUnderstanding":"...","knownEvidence":[...],"hypotheses":[{"statement":"...","status":"..."}],"unknowns":[...],"nextQuestion":"...","requiredEvidence":[...],"investigationRequest":"...","findings":[{"question":"...","evidenceRefs":[...],"answer":"...","impactOnHypothesis":"..."}],"judgment":"...","stopReason":"...","capabilityUsed":"...","evidenceAcquired":[...]}`,
          `Base every field on what you actually did and observed in this investigation. Do not invent capabilities or evidence you did not acquire.`,
        ].join('\n');
        const reply2Promise = collectTurn(active.client, active.hermesSessionId, 240_000);
        await active.client.submitPrompt(active.hermesSessionId, finalizePrompt);
        const reply2 = await reply2Promise;
        const parsed2 = parseInvestigation(reply2, situationId);
        if (!parsed2.ok) {
          res.status(200).json({
            success: false,
            agentStatus: 'error',
            error: parsed2.error,
            rawReply: (reply + '\n---\n' + reply2).slice(0, 2000),
          });
          return;
        }
        parsed = parsed2;
      }

      // Persist the Investigation Contract into the situation's Learning Context.
      storeInvestigationInLearningContext(options.db, situation, parsed.investigation);

      res.json({
        success: true,
        agentStatus: 'completed',
        situationId,
        sessionId: active.hermesSessionId,
        investigation: parsed.investigation,
      });
    } catch (err) {
      sessions.delete(situationId);
      const message = err instanceof Error ? err.message : 'Investigation failed';
      res.status(200).json({
        success: false,
        agentStatus: /timed out/i.test(message) ? 'timeout' : 'error',
        error: message,
        // Persisted state is the ground truth if Hermes wrote an investigation
        // before the turn timed out (never fabricate completion).
        investigation: loadLearningContext(options.db, situationId)?.investigation ?? null,
      });
    }
  });

  return router;
};

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
import { HermesSessionClient } from '#platform/runtime/hermes/index.js';
import type { HermesEvent, CreateSessionParams, CreateSessionResult } from '#platform/runtime/hermes/index.js';
import { writeProjection } from '#app/runtime/fabric-workspace/index.js';
import { JD_FIXTURE } from '#app/runtime/fabric-workspace/jd-fixture.js';

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
}

/** Lazily project the Fabric Agent Workspace (deterministic, rebuildable). */
const ensureWorkspace = (dir: string): string => {
  writeProjection(
    {
      worldModel: JD_FIXTURE.worldModel,
      bindings: JD_FIXTURE.bindings,
    },
    dir,
  );
  return resolve(dir);
};

/** Accumulate message.delta text until message.complete, resolve with full reply. */
const collectTurn = (client: SituationChatClient, sessionId: string): Promise<string> => {
  return new Promise((resolveTurn, rejectTurn) => {
    let text = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      unsubscribe();
      rejectTurn(new Error('Turn timed out waiting for message.complete'));
    }, 120_000);

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

  return router;
};

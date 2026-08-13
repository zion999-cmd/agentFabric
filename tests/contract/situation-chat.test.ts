// P0008.3 — Situation Chat Runtime Bridge HTTP-level contract tests.
// Verifies server-side session mapping: same situation reuses session,
// different situations get isolated sessions.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { situationChatRouter } from '#platform/server/routes/situation-chat.js';
import type { SituationChatClient } from '#platform/server/routes/situation-chat.js';
import type { HermesEvent, CreateSessionParams, CreateSessionResult } from '#platform/runtime/hermes/index.js';

const TEST_WORKSPACE = resolve(tmpdir(), 'fabric-workspace-test-chat');

// ---- Mock Hermes session client ----

class MockClient implements SituationChatClient {
  private handlers: ((e: HermesEvent) => void)[] = [];
  static createdSessionIds: string[] = [];
  static submitCounts: Record<string, number> = {};

  constructor(public readonly url?: string) {}

  async connect(): Promise<void> {}

  async createSession(_params: CreateSessionParams): Promise<CreateSessionResult> {
    const sid = `mock-${MockClient.createdSessionIds.length}`;
    MockClient.createdSessionIds.push(sid);
    return { sessionId: sid };
  }

  async submitPrompt(sessionId: string, _text: string): Promise<void> {
    MockClient.submitCounts[sessionId] = (MockClient.submitCounts[sessionId] ?? 0) + 1;
    // Emit a terminal message.complete event on the next microtask (async, like real Hermes).
    await Promise.resolve();
    for (const h of this.handlers) {
      h({ type: 'message.complete', session_id: sessionId, payload: { text: `reply-for-${sessionId}` } });
    }
  }

  onEvent(handler: (event: HermesEvent) => void): () => void {
    this.handlers.push(handler);
    return () => {};
  }

  close(): void {}
}

// ---- Test harness ----

describe('Situation Chat Runtime Bridge', () => {
  let server: Server;
  let base: string;

  beforeEach(() => {
    MockClient.createdSessionIds = [];
    MockClient.submitCounts = {};
  });

  beforeAll(() => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api',
      situationChatRouter({
        workspaceDir: TEST_WORKSPACE,
        clientFactory: (url) => new MockClient(url),
      }),
    );
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3000;
    base = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
    rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  });

  const chat = async (situationId: string, message: string) => {
    const res = await fetch(`${base}/api/situation/${situationId}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };

  it('POST /api/situation/:id/chat returns sessionId + reply', async () => {
    const { status, body } = await chat('sit-A', '第一个问题');
    expect(status).toBe(200);
    expect(body['success']).toBe(true);
    expect(typeof body['sessionId']).toBe('string');
    expect(typeof body['reply']).toBe('string');
  });

  it('same situation reuses the SAME Hermes session across two turns', async () => {
    const r1 = await chat('sit-same', '第一个问题');
    const r2 = await chat('sit-same', '第二个问题');
    expect(r1.body['sessionId']).toBe(r2.body['sessionId']);
    // Only one session was created (not two).
    expect(MockClient.createdSessionIds).toHaveLength(1);
    // Both turns submitted to the same session.
    const sid = r1.body['sessionId'] as string;
    expect(MockClient.submitCounts[sid]).toBe(2);
  });

  it('different situations use DIFFERENT Hermes sessions', async () => {
    const rA = await chat('sit-diff-1', 'B 的问题');
    const rC = await chat('sit-diff-2', 'C 的问题');
    expect(rA.body['sessionId']).not.toBe(rC.body['sessionId']);
    expect(MockClient.createdSessionIds).toHaveLength(2);
  });

  it('exposes the server-held session mapping via GET', async () => {
    await chat('sit-mapping', '创建会话');
    const res = await fetch(`${base}/api/situation/sit-mapping/session`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body['hasSession']).toBe(true);
    expect(typeof body['hermesSessionId']).toBe('string');
  });

  it('rejects empty message', async () => {
    const res = await fetch(`${base}/api/situation/sit-A/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    expect(res.status).toBe(400);
  });
});

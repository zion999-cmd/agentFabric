// P0008.3 — HermesSessionClient tests (mock WebSocket).
// Validates JSON-RPC framing: session.create / prompt.submit / event dispatch.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HermesSessionClient } from '#platform/runtime/hermes/index.js';
import type { HermesEvent } from '#platform/runtime/hermes/index.js';

// ---- Mock WebSocket ----

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  sent: string[] = [];
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((msg: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3; // CLOSED
  }

  // Test helpers
  emitOpen(): void { this.readyState = 1; this.onopen?.(); }
  emitMessage(obj: unknown): void {
    this.onmessage?.({ data: typeof obj === 'string' ? obj : JSON.stringify(obj) });
  }
}

// ---- Tests ----

describe('HermesSessionClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connect opens a WebSocket to /api/ws', async () => {
    const client = new HermesSessionClient({ url: 'ws://localhost:9119/api/ws' });
    const connectPromise = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    await connectPromise;
    expect(ws.url).toBe('ws://localhost:9119/api/ws');
  });

  it('createSession sends a valid session.create JSON-RPC frame', async () => {
    const client = new HermesSessionClient();
    const connectPromise = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    await connectPromise;

    const createPromise = client.createSession({ cwd: '/tmp/fabric-ws', profile: 'jd' });
    const frame = JSON.parse(ws.sent[0]!);
    expect(frame.jsonrpc).toBe('2.0');
    expect(frame.method).toBe('session.create');
    expect(frame.params.cwd).toBe('/tmp/fabric-ws');
    expect(frame.params.profile).toBe('jd');
    expect(typeof frame.id).toBe('number');

    // Respond with session_id.
    ws.emitMessage({ jsonrpc: '2.0', id: frame.id, result: { session_id: 'abc12345' } });
    const result = await createPromise;
    expect(result.sessionId).toBe('abc12345');
  });

  it('submitPrompt sends a valid prompt.submit frame', async () => {
    const client = new HermesSessionClient();
    const connectPromise = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    await connectPromise;

    const submitPromise = client.submitPrompt('abc12345', '流量为什么下降？');
    const frame = JSON.parse(ws.sent[0]!);
    expect(frame.method).toBe('prompt.submit');
    expect(frame.params.session_id).toBe('abc12345');
    expect(frame.params.text).toBe('流量为什么下降？');

    ws.emitMessage({ jsonrpc: '2.0', id: frame.id, result: {} });
    await submitPromise;
  });

  it('dispatches streamed events to onEvent handlers', async () => {
    const client = new HermesSessionClient();
    const connectPromise = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    await connectPromise;

    const events: HermesEvent[] = [];
    client.onEvent((e) => events.push(e));

    ws.emitMessage({ jsonrpc: '2.0', method: 'event', params: { type: 'message.delta', payload: { text: '流量' }, session_id: 'abc12345' } });
    ws.emitMessage({ jsonrpc: '2.0', method: 'event', params: { type: 'message.complete', payload: { text: '流量下降' }, session_id: 'abc12345' } });

    expect(events.map((e) => e.type)).toEqual(['message.delta', 'message.complete']);
  });

  it('rejects createSession when server returns an error', async () => {
    const client = new HermesSessionClient();
    const connectPromise = client.connect();
    const ws = MockWebSocket.instances[0]!;
    ws.emitOpen();
    await connectPromise;

    const createPromise = client.createSession({ cwd: '/tmp' });
    const frame = JSON.parse(ws.sent[0]!);
    ws.emitMessage({ jsonrpc: '2.0', id: frame.id, error: { code: 1, message: 'profile not found' } });
    await expect(createPromise).rejects.toThrow(/Hermes error/);
  });
});

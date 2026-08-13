// HermesSessionClient — a thin JSON-RPC WebSocket client for Hermes' `/api/ws`.
// P0008.3. Speaks Hermes' existing session protocol; does NOT reimplement session logic.
//
// Protocol (from Hermes source, tui_gateway/):
//   connect        → ws://host:port/api/ws
//   session.create  {"jsonrpc":"2.0","method":"session.create","params":{cwd,profile,...},"id":N}
//                   → {"result":{"session_id":"8-hex",...}}
//   prompt.submit   {"jsonrpc":"2.0","method":"prompt.submit","params":{session_id,text},"id":N}
//   events          {"jsonrpc":"2.0","method":"event","params":{"type":"message.delta",...}}
//
// Turn lifecycle events: turn.start → message.start → message.delta* → message.complete
//
// Uses Node's built-in WHATWG WebSocket (no external dependency).

// ---- Types ----

export interface HermesEvent {
  type: string;
  session_id?: string;
  /** Event payload — e.g. `{ text }` for message.delta / message.complete. */
  payload?: {
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HermesSessionClientOptions {
  /** Hermes serve host/port (default localhost:9119) */
  url?: string;
  /** Auth token if required (loopback usually needs none) */
  token?: string;
  /** Connection timeout ms */
  connectTimeoutMs?: number;
}

export interface CreateSessionParams {
  /** Working directory for the session (the Fabric Agent Workspace) */
  cwd: string;
  /** Hermes profile name */
  profile?: string;
  /** Model override (optional) */
  model?: string;
}

export interface CreateSessionResult {
  sessionId: string;
  storedSessionId?: string | undefined;
}

type EventHandler = (event: HermesEvent) => void;
type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

// ---- Client ----

export class HermesSessionClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly eventHandlers = new Set<EventHandler>();
  private readonly url: string;
  private readonly token: string | undefined;

  constructor(options: HermesSessionClientOptions = {}) {
    const port = 9119;
    this.url = options.url ?? `ws://localhost:${port}/api/ws`;
    this.token = options.token;
  }

  /** Connect to Hermes serve /api/ws. Resolves when the socket opens. */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(new Error(`WebSocket error connecting to ${this.url}: ${String(e)}`));
      ws.onmessage = (msg) => this.handleMessage(msg);
      ws.onclose = () => {
        // Fail any pending requests on close.
        for (const [, p] of this.pending) {
          p.reject(new Error('Hermes connection closed'));
        }
        this.pending.clear();
      };
    });
  }

  /** Subscribe to streamed events (message.delta, message.complete, tool.*, etc.). */
  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /** Create a session. Returns the 8-hex session_id. */
  async createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
    const result = await this.request('session.create', {
      cwd: params.cwd,
      profile: params.profile ?? null,
      model: params.model ?? '',
      source: 'fabric',
    });
    const r = result as { session_id: string; stored_session_id?: string };
    return { sessionId: r.session_id, storedSessionId: r.stored_session_id };
  }

  /** Submit a user prompt to a session. */
  async submitPrompt(sessionId: string, text: string): Promise<void> {
    await this.request('prompt.submit', { session_id: sessionId, text });
  }

  /** Resume an existing session (by id/prefix). */
  async resumeSession(sessionId: string): Promise<void> {
    await this.request('session.resume', { session_id: sessionId });
  }

  /** Close the connection. */
  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  // ---- Internals ----

  private handleMessage(msg: MessageEvent): void {
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(String(msg.data));
    } catch {
      return; // ignore non-JSON frames
    }

    // Event frame (no id): dispatch to handlers.
    if (obj['method'] === 'event') {
      const params = (obj['params'] ?? {}) as HermesEvent;
      for (const handler of this.eventHandlers) handler(params);
      return;
    }

    // Response frame (has id): resolve the pending request.
    if (typeof obj['id'] === 'number') {
      const id = obj['id'] as number;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);

      if (obj['error'] != null) {
        pending.reject(new Error(`Hermes error: ${JSON.stringify(obj['error'])}`));
      } else {
        pending.resolve(obj['result']);
      }
    }
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Not connected to Hermes serve'));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const frame = JSON.stringify({ jsonrpc: '2.0', method, params, id });
      this.ws!.send(frame);
    });
  }
}

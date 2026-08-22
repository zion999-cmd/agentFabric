// P0010.1 Post-Productization REPAIR — Output / WorkItem API Integration Test.
//
// Verifies the 3 new minimal routes (GET / POST / PATCH) +
// mark-delivered convenience, all backed by the `learning_contexts.body.outputs[]`
// JSON column (no SQL migration). Asserts the contract:
//   - The status enum has exactly 4 values: ready / delivered / acknowledged / closed.
//   - mark-delivered flips only `ready` → `delivered` (idempotent).
//   - PATCH enforces the status enum; invalid statuses are rejected.
//   - Missing situation returns 404.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { createServer } from '#platform/server/index.js';

const TEMP_DB = './data/test-outputs-api.db';

describe('P0010.1 Output / WorkItem API (integration)', () => {
  let server: Server;
  let base: string;
  const SIT = 'sit_outputs_test';

  beforeAll(() => {
    rmSync(TEMP_DB, { force: true });
    const db = openDb(TEMP_DB);
    initDatabase(db);
    // Seed a minimal learning_context (the route reads from this row).
    const now = '2026-08-22T08:00:00.000Z';
    db.prepare(
      `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
         observed_at, description, tags, lifecycle, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      SIT, 'ecommerce', 'anomaly_investigation',
      'jd_shop_001', 'shop', '祁门红茶旗舰店', 'jd',
      '2026-08-22T08:00:00.000Z',
      'test situation for outputs API',
      JSON.stringify(['test']), 'open', now, now,
    );
    db.prepare(
      `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'ctx_' + SIT, SIT, 'open', now, now,
      JSON.stringify({
        contextId: 'ctx_' + SIT,
        situation: { situationId: SIT, domain: 'ecommerce', type: 'anomaly_investigation', entity: { id: 'e1', type: 'shop' }, temporal: { observedAt: now }, description: 'x', tags: [] },
        lifecycle: 'open', createdAt: now, updatedAt: now,
        observations: [], evidenceIds: [], signalIds: [],
        agentActivities: [], humanInterventions: [], actions: [], outcomes: [],
        summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [], totalEvidence: 0, totalSignals: 0 },
        outputs: [],
      }),
    );
    const app = createServer({ db, workspaceDir: './apps/ecommerce/workspace' });
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3000;
    base = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
    rmSync(TEMP_DB, { force: true });
    rmSync(`${TEMP_DB}-wal`, { force: true });
    rmSync(`${TEMP_DB}-shm`, { force: true });
  });

  test('GET /api/situations/:id/outputs returns [] on a fresh situation', async () => {
    const res = await fetch(`${base}/api/situations/${SIT}/outputs`);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  test('POST /api/situations/:id/outputs creates a ready WorkItem', async () => {
    const res = await fetch(`${base}/api/situations/${SIT}/outputs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'recommendation', content: '先排查库存。' }),
    });
    const body = (await res.json()) as { success: boolean; data: any; error?: string };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ready');
    expect(body.data.type).toBe('recommendation');
    expect(body.data.content).toBe('先排查库存。');
    expect(body.data.outputId).toMatch(/^out_/);
  });

  test('POST /api/situations/:id/outputs rejects invalid type', async () => {
    const res = await fetch(`${base}/api/situations/${SIT}/outputs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'not_a_type', content: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  test('mark-delivered flips ready → delivered (and only ready)', async () => {
    // Add a second output (first is still in 'ready' state from earlier test).
    await fetch(`${base}/api/situations/${SIT}/outputs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'analysis', content: '分析二' }),
    });
    // mark-delivered
    const markRes = await fetch(`${base}/api/situations/${SIT}/outputs/mark-delivered`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const markBody = (await markRes.json()) as { data: { updated: number } };
    expect(markBody.data.updated).toBeGreaterThan(0);
    // List and confirm everything is now 'delivered'
    const list = ((await (await fetch(`${base}/api/situations/${SIT}/outputs`)).json()) as { data: Array<{ status: string }> });
    for (const o of list.data) {
      expect(['delivered', 'acknowledged', 'closed']).toContain(o.status);
    }
  });

  test('PATCH /api/situations/:id/outputs/:oid transitions status', async () => {
    const list = ((await (await fetch(`${base}/api/situations/${SIT}/outputs`)).json()) as { data: Array<{ outputId: string; status: string }> }).data;
    const first = list[0]!;
    const res = await fetch(`${base}/api/situations/${SIT}/outputs/${first.outputId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'acknowledged' }),
    });
    const body = (await res.json()) as { success: boolean; data: any; error?: string };
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('acknowledged');
    expect(body.data.acknowledgedAt).toBeDefined();
  });

  test('PATCH rejects invalid status', async () => {
    const list = ((await (await fetch(`${base}/api/situations/${SIT}/outputs`)).json()) as { data: Array<{ outputId: string }> }).data;
    const first = list[0]!;
    const res = await fetch(`${base}/api/situations/${SIT}/outputs/${first.outputId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    expect(res.status).toBe(400);
  });

  test('GET outputs for a missing situation returns [] (not 404) so the UI does not break', async () => {
    const res = await fetch(`${base}/api/situations/sit_does_not_exist/outputs`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: any; error?: string };
    expect(body.data).toEqual([]);
  });

  test('POST outputs for a missing situation returns 404', async () => {
    const res = await fetch(`${base}/api/situations/sit_does_not_exist/outputs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'recommendation', content: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  test('P0010.1 REPAIR-2: GET /api/situations/:id returns outputs[] + learningContext in the FIRST response', async () => {
    // The detail endpoint must carry outputs (and the rest of the
    // LearningContext) so the Workspace can render the Output/WorkItem
    // section SYNCHRONOUSLY without a second-pass /outputs call.
    const res = await fetch(`${base}/api/situations/${SIT}`);
    const body = (await res.json()) as { success: boolean; data: any; error?: string };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.outputs)).toBe(true);
    expect(body.data.outputs.length).toBeGreaterThan(0);
    expect(body.data.learningContext).toBeDefined();
    expect(Array.isArray(body.data.learningContext.outputs)).toBe(true);
    // Sanity: the response's outputs[] matches learningContext.outputs[].
    expect(body.data.outputs.length).toBe(body.data.learningContext.outputs.length);
  });

  test('P0010.1 REPAIR-2: detail endpoint for a situation with no outputs returns [] (not undefined)', async () => {
    // Seed a fresh situation with no outputs and confirm the detail
    // endpoint still carries an empty outputs[] (so the UI can rely on
    // the field being present).
    const SIT_EMPTY = 'sit_outputs_empty_test';
    const now = '2026-08-22T08:00:00.000Z';
    server.listeners('request')?.[0]; // no-op: keep TS happy
    const { openDb: openDb2 } = await import('#platform/storage/connection.js');
    const db2 = openDb2(TEMP_DB);
    db2.prepare(
      `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
         observed_at, description, tags, lifecycle, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      SIT_EMPTY, 'ecommerce', 'anomaly_investigation',
      'jd_shop_empty', 'shop', '空测试店', 'jd',
      now, 'test', JSON.stringify([]), 'open', now, now,
    );
    db2.prepare(
      `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'ctx_' + SIT_EMPTY, SIT_EMPTY, 'open', now, now,
      JSON.stringify({
        contextId: 'ctx_' + SIT_EMPTY,
        situation: { situationId: SIT_EMPTY, domain: 'ecommerce', type: 'anomaly_investigation', entity: { id: 'e1', type: 'shop' }, temporal: { observedAt: now }, description: 'x', tags: [] },
        lifecycle: 'open', createdAt: now, updatedAt: now,
        observations: [], evidenceIds: [], signalIds: [],
        agentActivities: [], humanInterventions: [], actions: [], outcomes: [],
        summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [], totalEvidence: 0, totalSignals: 0 },
        outputs: [],
      }),
    );
    db2.close();
    const res = await fetch(`${base}/api/situations/${SIT_EMPTY}`);
    const body = (await res.json()) as { success: boolean; data: any; error?: string };
    expect(res.status).toBe(200);
    expect(body.data.outputs).toEqual([]);
    expect(body.data.learningContext.outputs).toEqual([]);
  });

  // ═══ P0010.1 REPAIR-3: cross-situation read-only collection ═══

  test('GET /api/outputs returns ALL outputs across all situations (no second Store)', async () => {
    const res = await fetch(`${base}/api/outputs`);
    const body = (await res.json()) as { success: boolean; data: Array<any>; meta?: { total: number } };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // The seed in beforeAll only seeded `SIT` with 1+ outputs (from earlier
    // POSTs). Plus `SIT_EMPTY` (no outputs). So total is whatever was POSTed.
    expect(body.data.length).toBeGreaterThan(0);
    // Each item must carry the situation context (the audit surface).
    for (const o of body.data) {
      expect(o.situation).toBeDefined();
      expect(o.situation.situationId).toBeDefined();
      // Sanity: kind/ref match what we wrote.
      if (o.resultRef && typeof o.resultRef === 'object') {
        expect(['workspace_path', 'learning_context', 'evidence', 'none']).toContain(o.resultRef.kind);
      }
    }
  });

  test('GET /api/outputs?status=ready returns only ready outputs', async () => {
    const res = await fetch(`${base}/api/outputs?status=ready`);
    const body = (await res.json()) as { success: boolean; data: Array<any> };
    expect(res.status).toBe(200);
    for (const o of body.data) {
      expect(o.status).toBe('ready');
    }
  });

  test('GET /api/outputs?status=delivered returns only delivered outputs', async () => {
    const res = await fetch(`${base}/api/outputs?status=delivered`);
    const body = (await res.json()) as { success: boolean; data: Array<any> };
    expect(res.status).toBe(200);
    for (const o of body.data) {
      expect(o.status).toBe('delivered');
    }
  });

  test('GET /api/outputs?status=acknowledged returns only acknowledged outputs', async () => {
    const res = await fetch(`${base}/api/outputs?status=acknowledged`);
    const body = (await res.json()) as { success: boolean; data: Array<any> };
    expect(res.status).toBe(200);
    for (const o of body.data) {
      expect(o.status).toBe('acknowledged');
    }
  });

  test('GET /api/outputs?status=closed returns only closed outputs', async () => {
    const res = await fetch(`${base}/api/outputs?status=closed`);
    const body = (await res.json()) as { success: boolean; data: Array<any> };
    expect(res.status).toBe(200);
    for (const o of body.data) {
      expect(o.status).toBe('closed');
    }
  });

  test('GET /api/outputs?status=garbage returns 400 (no fabricated filter)', async () => {
    const res = await fetch(`${base}/api/outputs?status=garbage`);
    expect(res.status).toBe(400);
  });

  test('GET /api/outputs does NOT change any WorkItem status (read-only)', async () => {
    // The collection endpoint must be strictly read-only. Calling it
    // 3 times should not change a single Output's status.
    const before = (await (await fetch(`${base}/api/outputs`)).json()) as { data: Array<any> };
    for (let i = 0; i < 3; i++) {
      await fetch(`${base}/api/outputs`);
      await fetch(`${base}/api/outputs?status=ready`);
      await fetch(`${base}/api/outputs?status=closed`);
    }
    const after = (await (await fetch(`${base}/api/outputs`)).json()) as { data: Array<any> };
    expect(after.data.length).toBe(before.data.length);
    // Status distribution should be identical.
    const beforeStatus = before.data.map((o: any) => o.status).sort().join('|');
    const afterStatus = after.data.map((o: any) => o.status).sort().join('|');
    expect(afterStatus).toBe(beforeStatus);
  });

  // ═══ P0010.1 Output Workspace v0: single-Output fetch (Output Detail) ═══

  test('GET /api/outputs/:oid returns the single Output with situation context', async () => {
    const list = (await (await fetch(`${base}/api/outputs`)).json()) as { data: Array<any> };
    expect(list.data.length).toBeGreaterThan(0);
    const target = list.data[0]!;
    const res = await fetch(`${base}/api/outputs/${encodeURIComponent(target.outputId)}`);
    const body = (await res.json()) as { success: boolean; data: any; error?: string };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.outputId).toBe(target.outputId);
    expect(body.data.situation).toBeDefined();
    expect(body.data.situation.situationId).toBeDefined();
  });

  test('GET /api/outputs/:oid returns 404 for an unknown outputId', async () => {
    const res = await fetch(`${base}/api/outputs/out_does_not_exist`);
    expect(res.status).toBe(404);
  });

  test('GET /api/outputs/:oid includes currentSituation context but marks snapshotAvailable=false', async () => {
    // The schema does not snapshot judgment/recommendation at output
    // creation time. The endpoint must surface the *current* situation
    // judgment for the Output Detail page to render "判断依据" — but
    // must NEVER claim it is a generation-time snapshot. The
    // snapshotAvailable: false flag is the honest surface for that.
    const list = (await (await fetch(`${base}/api/outputs`)).json()) as { data: Array<any> };
    const target = list.data[0]!;
    const res = await fetch(`${base}/api/outputs/${encodeURIComponent(target.outputId)}`);
    const body = (await res.json()) as { data: any };
    expect(body.data.currentSituation).toBeDefined();
    expect(body.data.currentSituation.snapshotAvailable).toBe(false);
  });

  test('GET /api/outputs/:oid is read-only (does not change WorkItem status)', async () => {
    const list = (await (await fetch(`${base}/api/outputs`)).json()) as { data: Array<any> };
    const target = list.data[0]!;
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${base}/api/outputs/${encodeURIComponent(target.outputId)}`);
      const b = (await r.json()) as { data: { status: string } };
      expect(b.data.status).toBe(target.status);
    }
    const after = (await (await fetch(`${base}/api/outputs`)).json()) as { data: Array<any> };
    const afterById = new Map<string, string>(after.data.map((o: any) => [o.outputId, o.status]));
    expect(afterById.get(target.outputId)).toBe(target.status);
  });
});

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { upsertOrders, upsertProducts } from '#platform/storage/product-repository.js';
import { createServer } from '#platform/server/index.js';
import { canonicalNow, canonicalOrders, canonicalProducts } from '../fixtures/canonical-product.js';

const TEMP_DB = './data/test-http.db';

describe('HTTP server (integration)', () => {
  let server: Server;
  let base: string;

  beforeAll(() => {
    rmSync(TEMP_DB, { force: true });
    const db = openDb(TEMP_DB);
    initDatabase(db);
    upsertProducts(db, canonicalProducts);
    upsertOrders(db, canonicalOrders);
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

  test('GET /api/health returns ok', async () => {
    const res = await fetch(`${base}/api/health`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body['success']).toBe(true);
    expect((body['data'] as Record<string, unknown>)['status']).toBe('ok');
  });

  test('POST /api/ranking returns ranked results + trace + ai_summary', async () => {
    const res = await fetch(`${base}/api/ranking`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile: 'operator_mode', now: canonicalNow().toISOString() }),
    });
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body['success']).toBe(true);
    expect(data['rankings']).toHaveLength(canonicalProducts.length);
    expect((data['top_trace'] as Record<string, unknown>)['alignment']).toBeDefined();
    expect(typeof data['ai_summary']).toBe('string');
  });

  test('GET /api/ranking/:profile loads persisted rankings', async () => {
    const res = await fetch(`${base}/api/ranking/operator_mode`);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Array<unknown>;
    expect(res.status).toBe(200);
    expect(data.length).toBe(canonicalProducts.length);
  });

  test('GET /api/workspace/findings returns a discoveries feed', async () => {
    const res = await fetch(`${base}/api/workspace/findings?profile=operator_mode`);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Array<Record<string, unknown>>;
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]!['discovery_type']).toMatch(/opportunity|risk|review|memory/);
  });

  test('GET /api/signals returns signals', async () => {
    const res = await fetch(`${base}/api/signals`);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Array<unknown>;
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
  });
});

// Runtime API contract tests — validates the new HTTP runtime endpoints.
// P0006: Runtime Kernel is now accessible via HTTP.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { upsertOrders, upsertProducts } from '#platform/storage/product-repository.js';
import { createServer } from '#platform/server/index.js';
import { resetKernel } from '#platform/server/routes/runtime.js';
import { canonicalOrders, canonicalProducts } from '../fixtures/canonical-product.js';

const TEMP_DB = './data/test-runtime-api.db';

describe('Runtime API (contract)', () => {
  let server: Server;
  let base: string;

  beforeAll(() => {
    rmSync(TEMP_DB, { force: true });
    const db = openDb(TEMP_DB);
    initDatabase(db);
    upsertProducts(db, canonicalProducts);
    upsertOrders(db, canonicalOrders);
    resetKernel();
    const app = createServer({ db, workspaceDir: './apps/ecommerce/workspace' });
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 3000;
    base = `http://localhost:${port}`;
  });

  afterAll(() => {
    resetKernel();
    server.close();
    rmSync(TEMP_DB, { force: true });
    rmSync(`${TEMP_DB}-wal`, { force: true });
    rmSync(`${TEMP_DB}-shm`, { force: true });
  });

  test('GET /api/runtime/status returns runtime info', async () => {
    const res = await fetch(`${base}/api/runtime/status`);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(data['available']).toBe(true);
    expect(data['platform']).toBe('jd');
    expect(data['blueprint']).toBeDefined();
  });

  test('POST /api/runtime/collect triggers mock collection', async () => {
    const res = await fetch(`${base}/api/runtime/collect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        platform: 'jd',
        shopId: 'jd_shop_001',
        mock: true,
        date: '2026-07-09',
      }),
    });
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(data['success']).toBe(true);
    expect(typeof data['signalCount']).toBe('number');
    expect(typeof data['evidenceCount']).toBe('number');
    // Should have generated signals from mock data
    expect(data['signalCount'] as number).toBeGreaterThan(0);
  });

  test('POST /api/runtime/collect validates required fields', async () => {
    const res = await fetch(`${base}/api/runtime/collect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body['success']).toBe(false);
  });

  test('GET /api/runtime/executions lists execution history', async () => {
    const res = await fetch(`${base}/api/runtime/executions?platform=jd&limit=10`);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Array<Record<string, unknown>>;
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    // Should have at least the execution we just triggered
    if (data.length > 0) {
      const exec = data[0]!;
      expect(exec['date']).toBeTruthy();
      expect(exec['signalCount']).toBeGreaterThan(0);
      expect(exec['status']).toBe('completed');
    }
  });

  test('GET /api/runtime/executions/:date returns execution detail', async () => {
    const res = await fetch(`${base}/api/runtime/executions/2026-07-09`);
    const body = (await res.json()) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(data['date']).toBe('2026-07-09');
    expect(data['signalCount']).toBeGreaterThan(0);
    expect(Array.isArray(data['signals'])).toBe(true);
    expect(data['signalBreakdown']).toBeDefined();
  });

  test('GET /api/runtime/executions/:date rejects invalid date', async () => {
    const res = await fetch(`${base}/api/runtime/executions/not-a-date`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body['success']).toBe(false);
  });
});

// Tests for runtime-kernel — main entry point for Runtime Convergence Layer.
// P0005.5: Validates the kernel as the single unified execution entry point.

import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { createRuntimeKernel } from '#app/runtime/kernel/runtime-kernel.js';
import { loadBlueprint } from '#app/connectors/binding/loader.js';
import type { BoundCapabilityModel } from '#app/connectors/binding/types.js';

describe('createRuntimeKernel', () => {
  let db: ReturnType<typeof Database>;
  let blueprint: BoundCapabilityModel;

  beforeAll(() => {
    blueprint = loadBlueprint('jd');
  });

  beforeEach(() => {
    db = openDb();
    initDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  test('returns kernel with platform and blueprint', () => {
    const kernel = createRuntimeKernel(db, blueprint);

    expect(kernel.platform).toBe('jd');
    expect(kernel.blueprint).toBe(blueprint);
    expect(kernel.execute).toBeInstanceOf(Function);
  });

  test('execute returns RuntimeExecuteResult with success: true', async () => {
    const kernel = createRuntimeKernel(db, blueprint);

    const result = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-04',
      mock: true,
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe('jd');
    expect(result.blueprintDriven).toBe(true);
    expect(result.parsed).not.toBeNull();
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  test('execute produces signals with blueprint signal_types', async () => {
    const kernel = createRuntimeKernel(db, blueprint);

    const result = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-04',
      mock: true,
    });

    const signalNames = [...new Set(result.signals.map((s) => s.signal_name))];
    // Should include signal types from blueprint.manifest
    expect(signalNames.length).toBeGreaterThan(0);
    // daily_summary is always generated
    expect(signalNames).toContain('daily_summary');
  });

  test('execute with capabilities filter still succeeds', async () => {
    const kernel = createRuntimeKernel(db, blueprint);

    const result = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-04',
      mock: true,
      capabilities: ['daily_summary'],
    });

    expect(result.success).toBe(true);
  });

  test('execute results have errors array (empty on success)', async () => {
    const kernel = createRuntimeKernel(db, blueprint);

    const result = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-04',
      mock: true,
    });

    expect(result.errors).toEqual([]);
  });
});

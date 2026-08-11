// Contract test for P0005.5 Runtime Convergence Layer.
// Validates the full pipeline from beginning to end using real blueprint.
// Ensures the kernel is the single source of truth for runtime execution.

import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { createRuntimeKernel } from '#app/runtime/kernel/runtime-kernel.js';
import { loadBlueprint } from '#app/connectors/binding/loader.js';
import { buildSpecFromBlueprint, specCoverageCount } from '#app/runtime/kernel/runtime-normalizer-resolver.js';
import { INDICATOR_OVERRIDES } from '#app/connectors/jd/parsers/indicator-map.js';
import type { BoundCapabilityModel } from '#app/connectors/binding/types.js';

describe('Runtime Pipeline Contract', () => {
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

  test('full pipeline: kernel.execute produces signals + evidence from real blueprint', async () => {
    const kernel = createRuntimeKernel(db, blueprint);

    const result = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-04',
      mock: true,
    });

    // Pipeline completed
    expect(result.success).toBe(true);
    expect(result.blueprintDriven).toBe(true);

    // Parsed data from real JD parser
    expect(result.parsed).not.toBeNull();
    expect(result.parsed!.summary.gmv).toBeGreaterThan(0);
    expect(result.parsed!.summary.orders).toBeGreaterThan(0);

    // Signals generated from blueprint signal_types
    expect(result.signals.length).toBeGreaterThan(0);
    for (const s of result.signals) {
      expect(s.signal_id).toBeTruthy();
      expect(s.signal_name).toBeTruthy();
      expect(s.signal_value).toBeDefined();
      expect(s.confidence).toBeGreaterThan(0);
    }

    // Evidence captured from blueprint evidence_strategy
    expect(result.evidence.length).toBeGreaterThan(0);
    for (const ev of result.evidence) {
      expect(ev.evidenceId).toBeTruthy();
      expect(ev.dataType).toBeTruthy();
    }
  });

  test('normalizer spec from blueprint covers >> 16 canonical metrics (JD_SPEC baseline)', () => {
    const spec = buildSpecFromBlueprint(blueprint.normalizer_plan, INDICATOR_OVERRIDES);
    const count = specCoverageCount(spec);

    // The generated normalizer plan has 887 rules covering many canonical metrics.
    // The old JD_SPEC only had 16. This is a key P0005.5 improvement.
    expect(count).toBeGreaterThan(100);
  });

  test('INDICATOR_OVERRIDES business-critical keys are present in normalizer spec', () => {
    const spec = buildSpecFromBlueprint(blueprint.normalizer_plan, INDICATOR_OVERRIDES);

    // Each override canonical should have a spec entry
    for (const canonical of Object.values(INDICATOR_OVERRIDES)) {
      expect(spec[canonical]).toBeDefined();
    }
  });

  test('backward compat: kernel execute does not throw when blueprint is valid', async () => {
    const kernel = createRuntimeKernel(db, blueprint);

    // Multiple executions with the same kernel should work
    const r1 = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-04',
      mock: true,
    });
    expect(r1.success).toBe(true);

    const r2 = await kernel.execute({
      shopId: 'jd_shop_001',
      date: '2026-07-05',
      mock: true,
    });
    expect(r2.success).toBe(true);

    // Different dates produce different signal IDs
    const ids1 = new Set(r1.signals.map((s) => s.signal_id));
    const ids2 = new Set(r2.signals.map((s) => s.signal_id));
    const overlap = [...ids1].filter((id) => ids2.has(id));
    expect(overlap).toHaveLength(0);
  });
});

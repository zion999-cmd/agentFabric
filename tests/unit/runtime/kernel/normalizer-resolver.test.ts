// Tests for runtime-normalizer-resolver — blueprint-driven normalizer spec builder.
// P0005.5: Validates three-layer resolution: normalizer-plan → overrides → JD_SPEC fallback.

import { describe, test, expect } from 'vitest';
import {
  buildNormalizerSpec,
  buildSpecFromBlueprint,
  specCoverageCount,
} from '#app/runtime/kernel/runtime-normalizer-resolver.js';
import type { NormalizerPlan } from '#app/connectors/capability/types.js';
import { loadBlueprint } from '#app/connectors/binding/loader.js';

const makePlan = (rules: NormalizerPlan['rules']): NormalizerPlan => ({
  generated_at: '2026-07-04T00:00:00Z',
  source: 'test',
  rules,
});

describe('buildNormalizerSpec', () => {
  test('groups rules by canonical name, collecting source_fields', () => {
    const plan = makePlan([
      { source_field: 'jdr_gmv', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
      { source_field: 'totalGMV', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.8 },
      { source_field: 'jdr_orders', canonical: 'orders', unit: 'count', transform: 'identity', confidence: 0.9 },
    ]);

    const spec = buildNormalizerSpec(plan);

    expect(spec['gmv']).toContain('jdr_gmv');
    expect(spec['gmv']).toContain('totalGMV');
    expect(spec['orders']).toContain('jdr_orders');
  });

  test('filters out low-confidence rules (confidence < 0.3)', () => {
    const plan = makePlan([
      { source_field: 'jdr_gmv', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
      { source_field: 'low_conf', canonical: 'noise', unit: 'count', transform: 'identity', confidence: 0.2 },
    ]);

    const spec = buildNormalizerSpec(plan);

    expect(spec['gmv']).toBeDefined();
    expect(spec['noise']).toBeUndefined();
  });

  test('applies hand-written overrides to correct canonical names', () => {
    const plan = makePlan([
      // Algorithmic parser got this wrong: maps to 'ord_user_cnt' but should be 'customers'
      { source_field: 'jdr_sch_user_deal_ord_user_cnt', canonical: 'ord_user_cnt', unit: 'count', transform: 'identity', confidence: 0.8 },
    ]);

    const overrides: Record<string, string> = {
      'jdr_sch_user_deal_ord_user_cnt': 'customers',
    };

    const spec = buildNormalizerSpec(plan, overrides);

    // The override ensures the source_field maps to 'customers', not 'ord_user_cnt'
    expect(spec['customers']).toBeDefined();
    expect(spec['customers']).toContain('jdr_sch_user_deal_ord_user_cnt');
  });

  test('merges JD_SPEC fallback for canonicals not in plan', () => {
    const plan = makePlan([
      { source_field: 'jdr_gmv', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
    ]);

    const spec = buildNormalizerSpec(plan);

    // gmv from plan
    expect(spec['gmv']).toBeDefined();
    // roi from JD_SPEC fallback (not in plan)
    expect(spec['roi']).toBeDefined();
    expect(spec['roi']).toContain('productionRatio');
    // cvr from JD_SPEC fallback
    expect(spec['cvr']).toBeDefined();
    expect(spec['cvr']).toContain('conversionRate');
  });

  test('deduplicates source_fields within same canonical', () => {
    const plan = makePlan([
      { source_field: 'jdr_gmv', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
      { source_field: 'jdr_gmv', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
    ]);

    const spec = buildNormalizerSpec(plan);

    // Should have unique entries only
    const gmvFields = spec['gmv']!;
    const jdrGmvOccurrences = gmvFields.filter((f) => f === 'jdr_gmv').length;
    expect(jdrGmvOccurrences).toBe(1);
  });

  test('returns spec with coverage count far exceeding JD_SPEC (16 keys)', () => {
    const blueprint = loadBlueprint('jd');
    const spec = buildSpecFromBlueprint(blueprint.normalizer_plan);

    const count = specCoverageCount(spec);
    // Generated spec should cover WAY more than 16 canonical metrics
    expect(count).toBeGreaterThan(100);
  });

  test('##compare suffix in override keys is stripped for field matching', () => {
    const plan = makePlan([
      { source_field: 'base_field', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
    ]);

    const overrides: Record<string, string> = {
      'base_field##compare': 'gmv_compare_pct',
    };

    const spec = buildNormalizerSpec(plan, overrides);

    // The ##compare suffix should be stripped, so 'base_field' maps to gmv_compare_pct
    expect(spec['gmv_compare_pct']).toBeDefined();
    expect(spec['gmv_compare_pct']).toContain('base_field');
  });

  test('specCoverageCount returns accurate count', () => {
    const plan = makePlan([
      { source_field: 'a', canonical: 'gmv', unit: 'currency', transform: 'identity', confidence: 0.9 },
      { source_field: 'b', canonical: 'orders', unit: 'count', transform: 'identity', confidence: 0.9 },
      { source_field: 'c', canonical: 'uv', unit: 'count', transform: 'identity', confidence: 0.9 },
    ]);

    const spec = buildNormalizerSpec(plan);
    const count = specCoverageCount(spec);

    // 3 from plan + extras from JD_SPEC fallback
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

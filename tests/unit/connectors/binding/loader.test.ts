// Unit tests for binding/loader.ts — loading and validating generated artifacts.

import { describe, expect, test } from 'vitest';
import {
  loadBlueprint,
  loadNormalizerPlan,
  loadIndicatorDict,
} from '#app/connectors/binding/index.js';

describe('loadBlueprint', () => {
  test('returns valid BoundCapabilityModel from generated/connector-blueprint.json', () => {
    const blueprint = loadBlueprint('jd');
    expect(blueprint.platform).toBe('jd');
    expect(blueprint.discovery_api_count).toBeGreaterThan(0);
    expect(blueprint.capabilities.length).toBeGreaterThanOrEqual(4);
    expect(blueprint.parser_plan.rules.length).toBeGreaterThan(0);
    expect(blueprint.normalizer_plan.rules.length).toBeGreaterThan(0);
    expect(blueprint.manifest.signal_types.length).toBeGreaterThan(0);
    expect(blueprint.manifest.business_context.length).toBeGreaterThan(0);
  });

  test('blueprint includes all 6 capabilities', () => {
    const blueprint = loadBlueprint('jd');
    const capNames = blueprint.capabilities.map((c) => c.capability);
    expect(capNames).toContain('Transaction');
    expect(capNames).toContain('Industry');
    expect(capNames).toContain('Customer');
    expect(capNames).toContain('Marketing');
    expect(capNames).toContain('SupplyChain');
    expect(capNames).toContain('Platform');
  });

  test('blueprint integrity — each capability has non-zero API count or features', () => {
    const blueprint = loadBlueprint('jd');
    for (const cap of blueprint.capabilities) {
      expect(cap.api_count).toBeGreaterThanOrEqual(0);
      expect(cap.supported_features.length).toBeGreaterThan(0);
    }
  });

  test('throws for non-existent platform (no generated files)', () => {
    expect(() => loadBlueprint('nonexistent')).toThrow();
  });
});

describe('loadNormalizerPlan', () => {
  test('returns valid NormalizerPlan with 800+ rules', () => {
    const plan = loadNormalizerPlan('jd');
    expect(plan.rules.length).toBeGreaterThan(800);
    expect(plan.source).toBeTruthy();
    // Every rule must have canonical and source_field
    for (const rule of plan.rules) {
      expect(rule.canonical.length).toBeGreaterThan(0);
      expect(rule.source_field.length).toBeGreaterThan(0);
      expect(rule.confidence).toBeGreaterThanOrEqual(0);
      expect(rule.confidence).toBeLessThanOrEqual(1);
    }
  });

  test('contains known JD indicator mappings', () => {
    const plan = loadNormalizerPlan('jd');
    const gmvRule = plan.rules.find((r) =>
      r.source_field === 'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot',
    );
    expect(gmvRule).toBeDefined();
    expect(gmvRule!.canonical).toBe('gmv');
    expect(gmvRule!.unit).toBe('currency');
    expect(gmvRule!.confidence).toBe(1);
  });
});

describe('loadIndicatorDict', () => {
  test('returns Record with O(1) lookup for known keys', () => {
    const dict = loadIndicatorDict('jd');
    expect(typeof dict).toBe('object');
    const keys = Object.keys(dict);
    expect(keys.length).toBeGreaterThan(25);

    const gmvEntry = dict['jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot'];
    expect(gmvEntry).toBeDefined();
    expect(gmvEntry!.canonical).toBe('gmv');
    expect(gmvEntry!.unit).toBe('currency');
    expect(gmvEntry!.confidence).toBe(1);
  });

  test('returns undefined for unknown key', () => {
    const dict = loadIndicatorDict('jd');
    expect(dict['nonexistent_key_xyz']).toBeUndefined();
  });

  test('all entries have required fields', () => {
    const dict = loadIndicatorDict('jd');
    for (const [key, entry] of Object.entries(dict)) {
      expect(entry.canonical, `Missing canonical for ${key}`).toBeTruthy();
      expect(entry.unit, `Missing unit for ${key}`).toBeTruthy();
      expect(typeof entry.confidence, `Missing confidence for ${key}`).toBe('number');
    }
  });
});

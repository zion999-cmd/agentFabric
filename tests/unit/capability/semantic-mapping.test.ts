// Unit tests for semantic-mapping.ts — Phase 3.

import { describe, expect, test } from 'vitest';
import {
  resolveUnit,
  resolveTransform,
  generateNormalizerPlan,
  generateIndicatorDictionary,
  summarizeNormalizerPlan,
} from '#app/connectors/capability/index.js';

describe('resolveUnit', () => {
  test('resolves known canonical units', () => {
    expect(resolveUnit('gmv')).toBe('currency');
    expect(resolveUnit('orders')).toBe('count');
    expect(resolveUnit('conversion_rate')).toBe('percentage');
    expect(resolveUnit('visitors')).toBe('count');
    expect(resolveUnit('roi')).toBe('ratio');
  });

  test('defaults to count for unknown metrics', () => {
    expect(resolveUnit('unknown_metric')).toBe('count');
  });
});

describe('resolveTransform', () => {
  test('identity transform for raw values', () => {
    expect(resolveTransform('gmv')).toBe('identity');
    expect(resolveTransform('orders')).toBe('identity');
    expect(resolveTransform('visitors')).toBe('identity');
  });

  test('multiply100 for percentage values', () => {
    expect(resolveTransform('conversion_rate')).toBe('multiply100');
    expect(resolveTransform('click_rate')).toBe('multiply100');
    expect(resolveTransform('ctr')).toBe('multiply100');
    expect(resolveTransform('cvr')).toBe('multiply100');
  });
});

describe('generateNormalizerPlan', () => {
  test('generates normalizer rules with correct structure', () => {
    const plan = generateNormalizerPlan();
    expect(plan.rules.length).toBeGreaterThan(0);
    expect(plan.generated_at).toBeDefined();
    expect(plan.source).toContain('discovery');
  });

  test('each rule has required fields', () => {
    const plan = generateNormalizerPlan();
    for (const rule of plan.rules.slice(0, 10)) {
      expect(rule.source_field).toBeDefined();
      expect(rule.canonical).toBeDefined();
      expect(rule.unit).toBeDefined();
      expect(rule.transform).toBeDefined();
      expect(rule.confidence).toBeGreaterThanOrEqual(0);
      expect(rule.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('generateIndicatorDictionary', () => {
  test('produces valid dictionary structure', () => {
    const dict = generateIndicatorDictionary();
    expect(Object.keys(dict).length).toBeGreaterThan(0);
    const firstEntry = Object.values(dict)[0]!;
    expect(firstEntry.canonical).toBeDefined();
    expect(firstEntry.unit).toBeDefined();
    expect(firstEntry.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('summarizeNormalizerPlan', () => {
  test('returns correct summary fields', () => {
    const plan = generateNormalizerPlan();
    const summary = summarizeNormalizerPlan(plan);
    expect(summary.total_rules).toBe(plan.rules.length);
    expect(summary.high_confidence).toBeGreaterThanOrEqual(0);
    expect(Object.keys(summary.units).length).toBeGreaterThan(0);
  });
});

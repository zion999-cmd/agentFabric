// Unit tests for evidence-analysis.ts — Phase 2.

import { describe, expect, test } from 'vitest';
import type { ApiEndpoint } from '#app/connectors/discovery/types.js';
import {
  classifyEndpointStrategy,
  analyzeEndpointSchema,
  generateParserPlan,
  summarizeStrategies,
} from '#app/connectors/capability/index.js';

const makeEndpoint = (overrides: Partial<ApiEndpoint> = {}): ApiEndpoint => ({
  name: 'test.ajax',
  fields: { gmv: { type: 'float' }, orders: { type: 'int' } },
  field_count: 2,
  files: ['test.json'],
  ...overrides,
});

describe('classifyEndpointStrategy', () => {
  test('classifies summary endpoints as aggregate', () => {
    const ep = makeEndpoint({ name: 'summary.ajax', fields: { gmv: { type: 'float' }, deal_rate: { type: 'float' } }, field_count: 2 });
    expect(classifyEndpointStrategy(ep)).toBe('aggregate');
  });

  test('classifies trend endpoints as time_series', () => {
    const ep = makeEndpoint({ name: 'trend.ajax', fields: { dt: { type: 'str' }, gmv: { type: 'float' } }, field_count: 2 });
    expect(classifyEndpointStrategy(ep)).toBe('time_series');
  });

  test('classifies productTop endpoints as ranking', () => {
    const ep = makeEndpoint({ name: 'productTop.ajax', fields: { sku_id: { type: 'str' }, ordAmtIndex: { type: 'float' } }, field_count: 2 });
    expect(classifyEndpointStrategy(ep)).toBe('ranking');
  });

  test('classifies unknown endpoints as raw', () => {
    const ep = makeEndpoint({ fields: { unknown_field: { type: 'str' } }, field_count: 1 });
    expect(classifyEndpointStrategy(ep)).toBe('raw');
  });
});

describe('analyzeEndpointSchema', () => {
  test('extracts parseable numeric fields', () => {
    const ep = makeEndpoint({ fields: { gmv: { type: 'float' }, orders: { type: 'int' }, name: { type: 'str' } }, field_count: 3 });
    const analysis = analyzeEndpointSchema(ep);
    expect(analysis.parseable_fields).toContain('gmv');
    expect(analysis.parseable_fields).toContain('orders');
    expect(analysis.parseable_fields).not.toContain('name');
  });

  test('detects time series strategy', () => {
    const ep = makeEndpoint({ name: 'hourly.ajax', fields: { dt: { type: 'str' }, gmv: { type: 'float' } }, field_count: 2 });
    const analysis = analyzeEndpointSchema(ep);
    expect(analysis.is_time_series).toBe(true);
  });
});

describe('generateParserPlan', () => {
  test('generates parser rules for all field-rich endpoints', () => {
    const endpoints = [
      makeEndpoint({ name: 'summary.ajax' }),
      makeEndpoint({ name: 'empty.ajax', fields: {}, field_count: 0 }),
    ];
    const plan = generateParserPlan(endpoints);
    expect(plan.rules.length).toBeGreaterThanOrEqual(1);
    expect(plan.rules[0]!.endpoint).toBe('summary.ajax');
    expect(plan.generated_at).toBeDefined();
    expect(plan.source).toContain('discovery');
  });

  test('summarizeStrategies counts strategy types', () => {
    const endpoints = [
      makeEndpoint({ name: 's1.ajax', fields: { gmv: { type: 'float' } }, field_count: 1 }),
      makeEndpoint({ name: 's2.ajax', fields: { dt: { type: 'str' }, gmv: { type: 'float' } }, field_count: 2 }),
    ];
    const plan = generateParserPlan(endpoints);
    const summary = summarizeStrategies(plan);
    expect(Object.keys(summary).length).toBeGreaterThanOrEqual(1);
  });
});

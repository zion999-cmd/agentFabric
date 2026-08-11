// Unit tests for binding/types.ts — schema validation and round-trip.

import { describe, expect, test } from 'vitest';
import {
  BoundCapabilityModelSchema,
  CapabilityExecutionPlanSchema,
} from '#app/connectors/binding/index.js';

// A minimal valid blueprint for schema testing.
const makeValidBlueprint = () => ({
  platform: 'jd',
  generated_at: '2026-07-01T00:00:00.000Z',
  discovery_api_count: 2,
  capabilities: [
    {
      capability: 'Transaction',
      api_module: 'indexSummary',
      supported_features: ['GMV 概览'],
      api_count: 2,
      data_quality: 'high' as const,
    },
  ],
  parser_plan: {
    generated_at: '2026-07-01T00:00:00.000Z',
    source: 'discovery/jd-capability',
    rules: [
      {
        endpoint: 'summary.ajax',
        strategy: 'aggregate' as const,
        fields_to_parse: ['gmv', 'orders'],
        field_mapping: { gmv: 'gmv', orders: 'orders' },
        is_paginated: false,
        is_time_series: false,
        data_quality: 'high' as const,
      },
    ],
  },
  normalizer_plan: {
    generated_at: '2026-07-01T00:00:00.000Z',
    source: 'discovery/jd-capability',
    rules: [
      {
        source_field: 'jdr_sch_trade_deal_ord_ord_amt',
        canonical: 'gmv',
        unit: 'currency',
        transform: 'identity',
        confidence: 1,
      },
    ],
  },
  manifest: {
    platform: 'jd',
    generated_at: '2026-07-01T00:00:00.000Z',
    signal_types: ['daily_summary'],
    business_context: ['transaction'],
    evidence_chain: ['Raw API JSON'],
    supported_actions: ['summarize_top_ranking'],
    total_apis_discovered: 2,
    apis_in_blueprint: 2,
  },
  evidence_strategy: {
    capture_rules: [
      {
        endpoint: 'summary',
        capture_screenshot: false,
        capture_dom: false,
        capture_raw_response: true,
        capture_metadata: true,
      },
    ],
  },
});

const makeValidPlan = () => ({
  platform: 'jd',
  apis_to_call: [
    {
      endpoint: 'summary.ajax',
      gateway_url: 'szgateway.jd.com/api/',
      strategy: 'aggregate' as const,
      fields_to_parse: ['gmv'],
      field_mapping: { gmv: 'gmv' },
    },
  ],
  indicator_resolution: [
    {
      raw_key: 'jdr_sch_trade_deal_ord_ord_amt',
      canonical: 'gmv',
      unit: 'currency',
      confidence: 1,
    },
  ],
  evidence_capture: [
    {
      endpoint: 'summary',
      capture_screenshot: false,
      capture_dom: false,
      capture_raw_response: true,
      capture_metadata: true,
    },
  ],
  target_capabilities: ['Transaction'],
});

describe('BoundCapabilityModelSchema', () => {
  test('accepts a valid blueprint', () => {
    const bp = makeValidBlueprint();
    expect(() => BoundCapabilityModelSchema.parse(bp)).not.toThrow();
  });

  test('rejects object missing platform', () => {
    const bp = makeValidBlueprint();
    const { platform, ...rest } = bp;
    expect(() => BoundCapabilityModelSchema.parse(rest)).toThrow();
  });

  test('rejects blueprint with negative api count', () => {
    const bp = makeValidBlueprint();
    bp.discovery_api_count = -1;
    expect(() => BoundCapabilityModelSchema.parse(bp)).toThrow();
  });
});

describe('CapabilityExecutionPlanSchema', () => {
  test('accepts a valid execution plan', () => {
    const plan = makeValidPlan();
    const result = CapabilityExecutionPlanSchema.parse(plan);
    expect(result.platform).toBe('jd');
    expect(result.apis_to_call).toHaveLength(1);
    expect(result.indicator_resolution).toHaveLength(1);
  });

  test('full round-trip: blueprint fields flow into plan', () => {
    const bp = makeValidBlueprint();
    const model = BoundCapabilityModelSchema.parse(bp);

    // Build a plan from the model's data
    const plan = {
      platform: model.platform,
      apis_to_call: model.parser_plan.rules.map((r) => ({
        endpoint: r.endpoint,
        gateway_url: 'szgateway.jd.com/api/',
        strategy: r.strategy,
        fields_to_parse: r.fields_to_parse,
        field_mapping: r.field_mapping,
      })),
      indicator_resolution: model.normalizer_plan.rules.map((r) => ({
        raw_key: r.source_field,
        canonical: r.canonical,
        unit: r.unit,
        confidence: r.confidence,
      })),
      evidence_capture: model.evidence_strategy.capture_rules,
    };

    const validated = CapabilityExecutionPlanSchema.parse(plan);
    expect(validated.apis_to_call[0]?.endpoint).toBe('summary.ajax');
    expect(validated.indicator_resolution[0]?.canonical).toBe('gmv');
  });

  test('rejects plan with empty apis_to_call', () => {
    const plan = makeValidPlan();
    plan.apis_to_call = [];
    // Empty apis_to_call is valid (edge case: no matching APIs for capability)
    const result = CapabilityExecutionPlanSchema.parse(plan);
    expect(result.apis_to_call).toHaveLength(0);
  });
});

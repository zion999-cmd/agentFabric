// Unit tests for blueprint-generator.ts — Phase 4.

import { describe, expect, test } from 'vitest';
import {
  generateManifest,
  generateConnectorBlueprint,
  ConnectorBlueprintSchema,
  GeneratedManifestSchema,
} from '#app/connectors/capability/index.js';

describe('generateManifest', () => {
  test('produces a manifest with all required fields', () => {
    const m = generateManifest('jd');
    const parsed = GeneratedManifestSchema.parse(m);
    expect(parsed.platform).toBe('jd');
    expect(parsed.signal_types.length).toBeGreaterThan(0);
    expect(parsed.business_context.length).toBeGreaterThan(0);
    expect(parsed.evidence_chain.length).toBeGreaterThan(0);
    expect(parsed.supported_actions.length).toBeGreaterThan(0);
    expect(parsed.total_apis_discovered).toBeGreaterThan(0);
  });

  test('business_context does not contain "Context" suffix', () => {
    const m = generateManifest('jd');
    for (const ctx of m.business_context) {
      expect(ctx).not.toMatch(/Context$/);
    }
  });

  test('signal_types are valid', () => {
    const m = generateManifest('jd');
    for (const st of m.signal_types) {
      expect(['daily_summary', 'hourly_sales', 'hourly_traffic', 'campaign_performance', 'anomaly_alert']).toContain(st);
    }
  });
});

describe('generateConnectorBlueprint', () => {
  test('produces a valid complete blueprint', () => {
    const bp = generateConnectorBlueprint('jd');
    const parsed = ConnectorBlueprintSchema.parse(bp);
    expect(parsed.platform).toBe('jd');
    expect(parsed.discovery_api_count).toBeGreaterThan(0);
    expect(parsed.capabilities.length).toBeGreaterThan(0);
    expect(parsed.parser_plan.rules.length).toBeGreaterThan(0);
    expect(parsed.normalizer_plan.rules.length).toBeGreaterThan(0);
    expect(parsed.manifest.business_context.length).toBeGreaterThan(0);
    expect(parsed.evidence_strategy.capture_rules.length).toBeGreaterThan(0);
  });

  test('blueprint is deterministic (same platform → same structure)', () => {
    const bp1 = generateConnectorBlueprint('jd');
    const bp2 = generateConnectorBlueprint('jd');
    expect(bp1.discovery_api_count).toBe(bp2.discovery_api_count);
    expect(bp1.capabilities.length).toBe(bp2.capabilities.length);
    expect(bp1.parser_plan.rules.length).toBe(bp2.parser_plan.rules.length);
  });
});

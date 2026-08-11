// P0005.2 Phase 4 tests — Business Context Generator
import { describe, expect, test } from 'vitest';
import {
  CONTEXT_DETECTION_RULES,
  analyzeFields,
  generateBusinessContexts,
  getContextForApi,
  generateManifestContexts,
  summarizeContexts,
  loadApiInventory,
  loadIndicatorDictionary,
  resolveAllIndicators,
  GeneratedBusinessContextSchema,
} from '#app/connectors/discovery/index.js';

// ---------------------------------------------------------------------------
// Field analysis with synthetic data (fast, no disk I/O)
// ---------------------------------------------------------------------------

describe('analyzeFields (synthetic)', () => {
  test('detects TransactionContext from deal/gmv/order fields', () => {
    const fields = ['gmv', 'orders', 'deal_amount', 'refund_total', 'pay_count', 'trade_volume'];
    const results = analyzeFields(fields);
    const tx = results.find((r) => r.context === 'TransactionContext');
    expect(tx).toBeDefined();
    expect(tx!.confidence).toBeGreaterThan(0);
    expect(tx!.matched_patterns).toContain('gmv');
    expect(tx!.matched_patterns).toContain('deal');
  });

  test('detects CustomerContext from user/member/fan fields', () => {
    const fields = ['new_customer', 'old_customer', 'member', 'fans', 'client_visits'];
    const results = analyzeFields(fields);
    const cx = results.find((r) => r.context === 'CustomerContext');
    expect(cx).toBeDefined();
    expect(cx!.confidence).toBeGreaterThan(0);
  });

  test('detects TrafficContext from visitor/channel fields', () => {
    const fields = ['visitor_count', 'traffic_source', 'browse_views', 'channel_name'];
    const results = analyzeFields(fields);
    const tx = results.find((r) => r.context === 'TrafficContext');
    expect(tx).toBeDefined();
    expect(tx!.confidence).toBeGreaterThan(0);
  });

  test('returns empty for insufficient matches', () => {
    const fields = ['gmv']; // only 1 match, Transaction needs 3
    const results = analyzeFields(fields);
    const tx = results.find((r) => r.context === 'TransactionContext');
    expect(tx).toBeUndefined();
  });

  test('all results parse as GeneratedBusinessContext', () => {
    const fields = ['gmv', 'orders', 'visitor', 'member', 'fan', 'keyword'];
    const results = analyzeFields(fields);
    for (const r of results) {
      expect(() => GeneratedBusinessContextSchema.parse(r)).not.toThrow();
    }
  });

  test('results are sorted by confidence descending', () => {
    const fields = ['gmv', 'orders', 'deal_amount', 'member', 'fan', 'keyword'];
    const results = analyzeFields(fields);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.confidence).toBeGreaterThanOrEqual(results[i]!.confidence);
    }
  });

  test('confidence is between 0 and 1 for all results', () => {
    const fields = ['gmv', 'orders', 'deal_amount', 'visitor', 'browse', 'channel'];
    const results = analyzeFields(fields);
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Batch generation on real D0002 data
// ---------------------------------------------------------------------------

describe('generateBusinessContexts (real data)', () => {
  test('produces contexts from real API inventory', () => {
    const endpoints = loadApiInventory();
    const dict = loadIndicatorDictionary();
    const mappings = resolveAllIndicators(dict);

    const contexts = generateBusinessContexts(endpoints, mappings, 0.3);
    // Should find at least Transaction context from the real data
    expect(contexts.length).toBeGreaterThan(0);
  });

  test('higher threshold returns fewer contexts', () => {
    const endpoints = loadApiInventory();
    const dict = loadIndicatorDictionary();
    const mappings = resolveAllIndicators(dict);

    const low = generateBusinessContexts(endpoints, mappings, 0.2);
    const high = generateBusinessContexts(endpoints, mappings, 0.6);
    expect(high.length).toBeLessThanOrEqual(low.length);
  });

  test('all generated contexts have source endpoints', () => {
    const endpoints = loadApiInventory();
    const contexts = generateBusinessContexts(endpoints, undefined, 0.3);
    for (const c of contexts) {
      expect(c.source_endpoints.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-API context lookup
// ---------------------------------------------------------------------------

describe('getContextForApi', () => {
  test('summary maps to CustomerContext (fields: old, member, fan, new)', () => {
    const endpoints = loadApiInventory();
    const contexts = getContextForApi('summary', endpoints);
    // The 'summary' endpoint in api_inventory is the customer growth summary
    // (fields: content.old.deal, content.member.deal, content.fans.deal, content.new.deal)
    const cx = contexts.find((c) => c.context === 'CustomerContext');
    expect(cx).toBeDefined();
  });

  test('unknown endpoint returns empty', () => {
    expect(getContextForApi('nonexistent', {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Manifest integration
// ---------------------------------------------------------------------------

describe('generateManifestContexts', () => {
  test('produces string array', () => {
    const endpoints = loadApiInventory();
    const result = generateManifestContexts(endpoints, undefined, 0.3);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(typeof entry).toBe('string');
      expect(entry).not.toContain('Context'); // suffix stripped
    }
  });

  test('result is deduplicated', () => {
    const endpoints = loadApiInventory();
    const result = generateManifestContexts(endpoints, undefined, 0.2);
    expect(new Set(result).size).toBe(result.length);
  });
});

// ---------------------------------------------------------------------------
// Summarization
// ---------------------------------------------------------------------------

describe('summarizeContexts', () => {
  test('aggregates across endpoints', () => {
    const endpoints = loadApiInventory();
    const contexts = generateBusinessContexts(endpoints, undefined, 0.3);
    const summary = summarizeContexts(contexts);
    expect(summary.length).toBeGreaterThan(0);
    for (const s of summary) {
      expect(s.endpoint_count).toBeGreaterThan(0);
      expect(s.field_count).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Detection rules integrity
// ---------------------------------------------------------------------------

describe('CONTEXT_DETECTION_RULES', () => {
  test('all rules have unique context names', () => {
    const names = CONTEXT_DETECTION_RULES.map((r) => r.context);
    expect(new Set(names).size).toBe(names.length);
  });

  test('all rules have minimum_matches >= 1', () => {
    for (const rule of CONTEXT_DETECTION_RULES) {
      expect(rule.minimum_matches).toBeGreaterThanOrEqual(1);
    }
  });

  test('all rules have non-empty field_patterns', () => {
    for (const rule of CONTEXT_DETECTION_RULES) {
      expect(rule.field_patterns.length).toBeGreaterThan(0);
    }
  });
});

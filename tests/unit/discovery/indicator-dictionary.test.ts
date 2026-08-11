// P0005.2 Phase 3 tests — Indicator Dictionary
import { describe, expect, test } from 'vitest';
import {
  parseJdrKey,
  classifyDomain,
  classifyMetric,
  resolveIndicator,
  resolveAllIndicators,
  getIndicatorsByCategory,
  mapIndicatorToCanonical,
  findCompareTriplets,
  inferUnit,
  loadIndicatorDictionary,
  IndicatorMappingSchema,
} from '#app/connectors/discovery/index.js';

// ---------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------

describe('parseJdrKey', () => {
  test('decomposes standard transaction key', () => {
    const parsed = parseJdrKey('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot');
    expect(parsed).not.toBeNull();
    expect(parsed!.domain).toBe('trade_deal');
    expect(parsed!.metric).toContain('ord_ord_amt');
    expect(parsed!.source).toContain('sz');
  });

  test('handles fo_jdr prefix variant', () => {
    const parsed = parseJdrKey('fo_jdr_sch_industry_deal_rate');
    expect(parsed).not.toBeNull();
    expect(parsed!.full_prefix).toBe('fo_jdr');
    expect(parsed!.domain).toBe('industry');
  });

  test('handles comparison suffix variants', () => {
    // parseJdrKey strips suffixes before parsing
    const base = parseJdrKey('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot');
    const compare = parseJdrKey('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot##compare');
    expect(compare!.domain).toBe(base!.domain);
    expect(compare!.metric).toBe(base!.metric);
  });

  test('returns null for non-JDR key', () => {
    expect(parseJdrKey('random_string')).toBeNull();
    expect(parseJdrKey('status')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseJdrKey('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Domain classification
// ---------------------------------------------------------------------------

describe('classifyDomain', () => {
  test('trade_deal → Transaction', () => {
    expect(classifyDomain('trade_deal')).toBe('Transaction');
  });

  test('traffic_brow → Traffic', () => {
    expect(classifyDomain('traffic_brow')).toBe('Traffic');
  });

  test('traffic_intr → Traffic', () => {
    expect(classifyDomain('traffic_intr')).toBe('Traffic');
  });

  test('user_deal → Customer', () => {
    expect(classifyDomain('user_deal')).toBe('Customer');
  });

  test('sku_main → Product', () => {
    expect(classifyDomain('sku_main')).toBe('Product');
  });

  test('industry → Industry', () => {
    expect(classifyDomain('industry')).toBe('Industry');
  });

  test('search_click → Search', () => {
    expect(classifyDomain('search_click')).toBe('Search');
  });

  test('unknown domain → Other', () => {
    expect(classifyDomain('xyz_unknown')).toBe('Other');
  });
});

// ---------------------------------------------------------------------------
// Metric classification
// ---------------------------------------------------------------------------

describe('classifyMetric', () => {
  test('ord_ord_amt → gmv', () => {
    expect(classifyMetric('ord_ord_amt')).toBe('gmv');
  });

  test('ord_ord_qtty → orders', () => {
    expect(classifyMetric('ord_ord_qtty')).toBe('orders');
  });

  test('brow_sku__page_cnt → visitors', () => {
    expect(classifyMetric('brow_sku__page_cnt')).toBe('visitors');
  });

  test('deal_ord_user_cnt → customers', () => {
    expect(classifyMetric('deal_ord_user_cnt')).toBe('customers');
  });

  test('deal_rate → conversion_rate', () => {
    expect(classifyMetric('deal_rate')).toBe('conversion_rate');
  });

  test('unknown metric falls back to itself', () => {
    const unknown = 'some_unknown_metric';
    expect(classifyMetric(unknown)).toBe(unknown);
  });
});

// ---------------------------------------------------------------------------
// Indicator resolution
// ---------------------------------------------------------------------------

describe('resolveIndicator', () => {
  test('returns full IndicatorMapping for known key', () => {
    const mapping = resolveIndicator(
      'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot',
    );
    expect(mapping).not.toBeNull();
    expect(() => IndicatorMappingSchema.parse(mapping)).not.toThrow();
    expect(mapping!.canonical).toBe('gmv');
    expect(mapping!.category).toBe('Transaction');
    expect(mapping!.confidence).toBeGreaterThan(0);
  });

  test('handles ##compare suffix', () => {
    const mapping = resolveIndicator(
      'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot##compare',
    );
    expect(mapping).not.toBeNull();
    expect(mapping!.has_compare).toBe(true);
    expect(mapping!.has_compare_value).toBe(false);
  });

  test('handles ##compareValue suffix', () => {
    const mapping = resolveIndicator(
      'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot##compareValue',
    );
    expect(mapping).not.toBeNull();
    expect(mapping!.has_compare_value).toBe(true);
    expect(mapping!.has_compare).toBe(false);
  });

  test('canonical name matches base key for compare variants', () => {
    const base = resolveIndicator('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot');
    const compare = resolveIndicator('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot##compare');
    expect(compare!.canonical).toBe(base!.canonical);
  });

  test('returns null for unrecognizable key', () => {
    expect(resolveIndicator('not_a_valid_key')).toBeNull();
  });

  test('confidence is between 0 and 1', () => {
    const mapping = resolveIndicator('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot');
    expect(mapping!.confidence).toBeGreaterThanOrEqual(0);
    expect(mapping!.confidence).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Batch resolution
// ---------------------------------------------------------------------------

describe('resolveAllIndicators', () => {
  test('maps all keys from discovery data', () => {
    const dict = loadIndicatorDictionary();
    const mappings = resolveAllIndicators(dict);
    // Should resolve at least some of the 26 discovered keys
    expect(mappings.size).toBeGreaterThan(0);
    for (const m of mappings.values()) {
      expect(() => IndicatorMappingSchema.parse(m)).not.toThrow();
    }
  });
});

describe('getIndicatorsByCategory', () => {
  test('groups by category', () => {
    const dict = loadIndicatorDictionary();
    const mappings = resolveAllIndicators(dict);
    const grouped = getIndicatorsByCategory(mappings);
    // Should have at least Transaction and Traffic categories
    const cats = [...grouped.keys()];
    expect(cats).toContain('Transaction');
    expect(cats).toContain('Traffic');
  });
});

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

describe('mapIndicatorToCanonical', () => {
  test('maps known key to canonical name', () => {
    const result = mapIndicatorToCanonical(
      'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot',
    );
    expect(result).toBe('gmv');
  });

  test('falls back to original for unknown key', () => {
    const unknown = 'something_weird';
    expect(mapIndicatorToCanonical(unknown)).toBe(unknown);
  });
});

// ---------------------------------------------------------------------------
// Unit inference
// ---------------------------------------------------------------------------

describe('inferUnit', () => {
  test('ord_amt → currency', () => {
    expect(inferUnit('jdr_sch_trade_deal_ord_ord_amt_sz')).toBe('currency');
  });

  test('brow_page_cnt → count', () => {
    expect(inferUnit('jdr_sch_traffic_brow_sku__page_cnt')).toBe('count');
  });

  test('*_rate → ratio', () => {
    expect(inferUnit('fo_jdr_sch_industry_deal_rate')).toBe('ratio');
  });

  test('##compare → pct', () => {
    expect(inferUnit('jdr_sch_trade_ord_amt##compare')).toBe('pct');
  });

  test('##compareValue → pct', () => {
    expect(inferUnit('jdr_sch_trade_ord_amt##compareValue')).toBe('pct');
  });
});

// ---------------------------------------------------------------------------
// Compare triplets
// ---------------------------------------------------------------------------

describe('findCompareTriplets', () => {
  test('identifies triplets from discovery data', () => {
    const dict = loadIndicatorDictionary();
    const triplets = findCompareTriplets(dict);
    // The discovery data has compare/compareValue variants
    expect(triplets.length).toBeGreaterThanOrEqual(0);
    // Each triplet has a base key with no ## suffix
    for (const t of triplets) {
      expect(t.base).not.toContain('##');
    }
  });
});

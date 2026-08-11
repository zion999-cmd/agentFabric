// Unit tests for JD parser — indicator mapping and payload parsing.
// Uses golden fixtures that match the JD 商智 API response format.

import { describe, expect, test } from 'vitest';
import { mapJdIndicator, mapJdDataRow } from '#app/connectors/jd/parsers/indicator-map.js';
import { parseJdSummary, parseJdTrend, parseJdProductTop, parseJdPayload } from '#app/connectors/jd/parsers/index.js';

// Golden fixture: a real JD summary API response (from agentCMS).
const SUMMARY_FIXTURE = [{
  header: { code: 0, desc: 'success' },
  body: {
    data: [{
      jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot: 12351.35,
      jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot: 70,
      jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg: 896,
      jdr_sch_user_deal_ord_user_cnt_sz_user_deal_snapshot: 70,
      fo_jdr_sch_industry_deal_rate: 0.078125,
      'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot##compare': -0.2297,
      'jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot##compare': -0.0909,
      'jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg##compare': 0.0079,
    }],
  },
}];

const TREND_FIXTURE = [{
  header: { code: 0, desc: 'success' },
  body: {
    data: [
      { dt: '2026-01-01 00:00:00', jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot: 1122.4 },
      { dt: '2026-01-01 10:00:00', jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot: 1591.25 },
      { dt: '2026-01-01 22:00:00', jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot: 128.5 },
    ],
  },
}];

const PRODUCT_TOP_FIXTURE = [{
  header: { code: 0, desc: 'success' },
  body: {
    data: [
      {
        sku_id: '10072457189341',
        'sku_id#name_cn': '祁门红茶特级',
        jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot: 1850,
        sku_id_item_url: 'https://item.jd.com/10072457189341.html',
      },
      {
        sku_id: '10072457189342',
        'sku_id#name_cn': '祁门红茶一级',
        jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot: 1240,
        sku_id_item_url: 'https://item.jd.com/10072457189342.html',
      },
    ],
  },
}];

describe('JD Indicator Map', () => {
  test('maps known JD indicator keys to canonical names', () => {
    expect(mapJdIndicator('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot')).toBe('gmv');
    expect(mapJdIndicator('jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot')).toBe('orders');
    expect(mapJdIndicator('jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg')).toBe('visitors');
    expect(mapJdIndicator('jdr_sch_user_deal_ord_user_cnt_sz_user_deal_snapshot')).toBe('customers');
    expect(mapJdIndicator('fo_jdr_sch_industry_deal_rate')).toBe('conversion_rate');
  });

  test('maps comparison indicators (##compare suffix)', () => {
    expect(mapJdIndicator('jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot##compare')).toBe('gmv_compare_pct');
    expect(mapJdIndicator('jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot##compare')).toBe('orders_compare_pct');
  });

  test('returns original key for unknown indicators', () => {
    expect(mapJdIndicator('unknown_indicator_key')).toBe('unknown_indicator_key');
  });

  test('mapJdDataRow transforms all keys in a row', () => {
    const row = {
      'jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot': 5000,
      'fo_jdr_sch_industry_deal_rate': 0.05,
    };
    const mapped = mapJdDataRow(row);
    expect(mapped['gmv']).toBe(5000);
    expect(mapped['conversion_rate']).toBe(0.05);
  });
});

describe('parseJdSummary', () => {
  test('parses a valid JD summary API response', () => {
    const result = parseJdSummary(SUMMARY_FIXTURE);
    expect(result.gmv).toBe(12351.35);
    expect(result.orders).toBe(70);
    expect(result.visitors).toBe(896);
    expect(result.customers).toBe(70);
    expect(result.conversion_rate).toBeCloseTo(0.078125);
  });

  test('parses comparison percentages', () => {
    const result = parseJdSummary(SUMMARY_FIXTURE);
    expect(result.gmv_compare_pct).toBeCloseTo(-0.2297);
    expect(result.orders_compare_pct).toBeCloseTo(-0.0909);
    expect(result.visitors_compare_pct).toBeCloseTo(0.0079);
  });

  test('returns empty summary for non-JD-API responses', () => {
    const result = parseJdSummary([{ some: 'other-data' }]);
    expect(result.gmv).toBe(0);
    expect(result.orders).toBe(0);
  });

  test('returns empty summary for empty array', () => {
    const result = parseJdSummary([]);
    expect(result.gmv).toBe(0);
  });
});

describe('parseJdTrend', () => {
  test('parses hourly GMV data', () => {
    const result = parseJdTrend(TREND_FIXTURE);
    expect(result).toHaveLength(3);
    expect(result[0]!.hour).toContain('2026-01-01 00:00');
    expect(result[0]!.gmv).toBe(1122.4);
    expect(result[1]!.gmv).toBe(1591.25);
  });

  test('returns empty array for non-JD-API responses', () => {
    const result = parseJdTrend([]);
    expect(result).toHaveLength(0);
  });
});

describe('parseJdProductTop', () => {
  test('parses product ranking data', () => {
    const result = parseJdProductTop(PRODUCT_TOP_FIXTURE);
    expect(result).toHaveLength(2);
    expect(result[0]!.sku_id).toBe('10072457189341');
    expect(result[0]!.name).toBe('祁门红茶特级');
    expect(result[0]!.gmv).toBe(1850);
    expect(result[0]!.item_url).toContain('item.jd.com');
  });

  test('returns empty array for non-JD-API responses', () => {
    const result = parseJdProductTop([]);
    expect(result).toHaveLength(0);
  });
});

describe('parseJdPayload', () => {
  test('parses a complete JD payload with all three data types', () => {
    const raw = {
      date: '2026-01-01',
      summary: SUMMARY_FIXTURE,
      trend: TREND_FIXTURE,
      productTop: PRODUCT_TOP_FIXTURE,
    };
    const result = parseJdPayload(raw);
    expect(result.date).toBe('2026-01-01');
    expect(result.summary.gmv).toBe(12351.35);
    expect(result.hourly_gmv).toHaveLength(3);
    expect(result.top_products).toHaveLength(2);
  });

  test('handles raw data without explicit date (falls back to today)', () => {
    const raw = {
      summary: SUMMARY_FIXTURE,
      trend: [],
      productTop: [],
    };
    const result = parseJdPayload(raw);
    expect(result.date).toBeDefined();
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

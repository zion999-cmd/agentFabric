// JD data parsers — convert raw JD API responses into structured, typed data.
// Ported from agentCMS process_historical_data.ts, adapted for P0005 pipeline.

import { mapJdDataRow, isJdApiResponse } from './indicator-map.js';
import type { JdApiResponse } from './indicator-map.js';

// ---- Parsed Types ----

export interface JdSummary {
  /** GMV (成交金额) */
  gmv: number;
  /** Order count */
  orders: number;
  /** Unique visitors */
  visitors: number;
  /** Unique customers */
  customers: number;
  /** Conversion rate (百分比) */
  conversion_rate: number;
  /** WoW GMV comparison percentage */
  gmv_compare_pct: number | null;
  /** WoW orders comparison percentage */
  orders_compare_pct: number | null;
  /** WoW visitors comparison percentage */
  visitors_compare_pct: number | null;
}

export interface JdHourlyPoint {
  /** Hour label (e.g. "2026-06-30 14:00:00") */
  hour: string;
  /** GMV for this hour */
  gmv: number;
}

export interface JdProductTopEntry {
  /** JD SKU ID */
  sku_id: string;
  /** Product name (Chinese) */
  name: string;
  /** GMV for this product */
  gmv: number;
  /** Product page URL on JD.com */
  item_url: string;
}

export interface ParsedJdData {
  date: string;
  summary: JdSummary;
  hourly_gmv: JdHourlyPoint[];
  top_products: JdProductTopEntry[];
}

// ---- Parsers ----

const emptySummary = (): JdSummary => ({
  gmv: 0,
  orders: 0,
  visitors: 0,
  customers: 0,
  conversion_rate: 0,
  gmv_compare_pct: null,
  orders_compare_pct: null,
  visitors_compare_pct: null,
});

/**
 * Parse a JD summary API response into structured metrics.
 * Handles both raw indicator keys and already-mapped canonical keys.
 */
export const parseJdSummary = (
  responses: unknown[],
): JdSummary => {
  for (const resp of responses) {
    if (!isJdApiResponse(resp)) continue;
    const data = (resp as JdApiResponse).body?.data;
    if (!Array.isArray(data) || data.length === 0) continue;

    const row = mapJdDataRow(data[0]!);
    return {
      gmv: asNum(row['gmv']),
      orders: asNum(row['orders']),
      visitors: asNum(row['visitors']),
      customers: asNum(row['customers']),
      conversion_rate: asNum(row['conversion_rate']),
      gmv_compare_pct: asNumOrNull(row['gmv_compare_pct']),
      orders_compare_pct: asNumOrNull(row['orders_compare_pct']),
      visitors_compare_pct: asNumOrNull(row['visitors_compare_pct']),
    };
  }
  return emptySummary();
};

/**
 * Parse a JD trend API response into hourly data points.
 */
export const parseJdTrend = (
  responses: unknown[],
): JdHourlyPoint[] => {
  for (const resp of responses) {
    if (!isJdApiResponse(resp)) continue;
    const data = (resp as JdApiResponse).body?.data;
    if (!Array.isArray(data)) continue;

    return data.map((h) => {
      const row = mapJdDataRow(h);
      return {
        hour: String(row['dt'] ?? row['hour'] ?? ''),
        gmv: asNum(row['gmv']),
      };
    });
  }
  return [];
};

/**
 * Parse a JD productTop API response into product rankings.
 */
export const parseJdProductTop = (
  responses: unknown[],
): JdProductTopEntry[] => {
  for (const resp of responses) {
    if (!isJdApiResponse(resp)) continue;
    const data = (resp as JdApiResponse).body?.data;
    if (!Array.isArray(data)) continue;

    return data.map((p) => {
      const row = mapJdDataRow(p);
      return {
        sku_id: String(row['sku_id'] ?? ''),
        name: String(row['sku_id#name_cn'] ?? row['name'] ?? ''),
        gmv: asNum(row['gmv']),
        item_url: String(row['sku_id_item_url'] ?? row['item_url'] ?? ''),
      };
    });
  }
  return [];
};

/**
 * Parse a complete JD payload (summary + trend + productTop).
 * Accepts either the raw API response arrays or a pre-grouped payload object.
 */
export const parseJdPayload = (
  raw: Record<string, unknown>,
): ParsedJdData => {
  const date = String(raw['date'] ?? new Date().toISOString().slice(0, 10));

  const summaryResponses = asArray(raw['summary']);
  const trendResponses = asArray(raw['trend']);
  const productTopResponses = asArray(raw['productTop']);

  return {
    date,
    summary: parseJdSummary(summaryResponses.length > 0 ? summaryResponses : [raw]),
    hourly_gmv: parseJdTrend(trendResponses.length > 0 ? trendResponses : [raw]),
    top_products: parseJdProductTop(productTopResponses.length > 0 ? productTopResponses : [raw]),
  };
};

// ---- Helpers ----

const asNum = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const asNumOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const asArray = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  return [];
};

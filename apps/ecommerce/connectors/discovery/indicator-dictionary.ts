// P0005.2 Phase 3 — Indicator Dictionary.
//
// Auto-mapping of JD indicator keys (jdr_xxx) to canonical business metric names.
// No hand-maintained indicator-map.ts — all mappings are derived from:
//   1. Structural parsing of the JDR key naming convention
//   2. The D0002 indicator_dictionary_full.json discovery data
//
// Key pattern:  {prefix}_{sch}_{domain}_{metric}_{source}
// Example:      jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot
//   prefix  = jdr
//   domain  = trade_deal
//   metric  = ord_ord_amt
//   source  = sz_trade_deal_snapshot

import { loadIndicatorDictionary } from './loader.js';
import { IndicatorMappingSchema } from './types.js';
import type { IndicatorEntry, IndicatorMapping } from './types.js';

// ---------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------

/** Result of structurally parsing a JDR indicator key. */
interface ParsedJdrKey {
  full_prefix: string; // 'jdr', 'fo_jdr', 'hb_fo_jdr', etc.
  domain: string;
  metric: string;
  source: string;
}

/**
 * Parse a JD indicator key into its structural components.
 *
 * Pattern: {prefix}_{sch}_{domain}_{metric}_{source}
 *
 * The prefix can be 'jdr', 'fo_jdr', or 'hb_fo_jdr'.
 * 'sch' is a constant literal segment.
 * Domain and metric are multi-segment, source captures the remainder.
 */
export const parseJdrKey = (jdKey: string): ParsedJdrKey | null => {
  // Strip comparison suffixes first
  const baseKey = jdKey.replace(/##compare(?:Value)?$/, '');

  // Detect multi-part prefix: 'hb_fo_jdr' > 'fo_jdr' > 'jdr'
  let prefix = 'jdr';
  let rest = baseKey;
  if (rest.startsWith('hb_fo_jdr_')) {
    prefix = 'hb_fo_jdr';
    rest = rest.slice('hb_fo_jdr_'.length);
  } else if (rest.startsWith('fo_jdr_')) {
    prefix = 'fo_jdr';
    rest = rest.slice('fo_jdr_'.length);
  } else if (rest.startsWith('jdr_')) {
    prefix = 'jdr';
    rest = rest.slice('jdr_'.length);
  } else {
    return null; // not a JDR key
  }

  // Next segment must be 'sch'
  if (!rest.startsWith('sch_')) return null;
  rest = rest.slice('sch_'.length);

  // Now we have: {domain}_{metric}_{source}
  const parts = rest.split('_');
  if (parts.length < 2) return null; // too short

  // Domain: detect known 2-segment domains
  let domainEnd = 2;
  const firstTwo = parts.slice(0, 2).join('_');
  if (['trade_deal', 'traffic_brow', 'traffic_intr', 'user_deal',
        'search_click', 'sku_main', 'traffic_cha'].includes(firstTwo)) {
    domainEnd = 2;
  } else if (parts[0] === 'industry') {
    domainEnd = 1; // single-segment domain
  } else {
    // Heuristic: domain is 1-2 segments
    domainEnd = parts.length >= 3 && !['sz'].includes(parts[2]!) ? 2 : 1;
  }

  // Source: from 'sz' marker, or last 3 segments
  const szIdx = parts.findIndex((p) => p === 'sz');
  const sourceStart = szIdx >= 0 ? szIdx : Math.max(domainEnd + 1, parts.length - 3);

  const domain = parts.slice(0, domainEnd).join('_');
  const metric = parts.slice(domainEnd, sourceStart).join('_');
  const source = parts.slice(sourceStart).join('_');

  return { full_prefix: prefix, domain, metric, source };
};

// ---------------------------------------------------------------------------
// Domain → category classification
// ---------------------------------------------------------------------------

const DOMAIN_CATEGORY: Record<string, string> = {
  trade_deal: 'Transaction',
  trade_cancel: 'Transaction',
  traffic_brow: 'Traffic',
  traffic_intr: 'Traffic',
  traffic_cha: 'Traffic',
  user_deal: 'Customer',
  user: 'Customer',
  sku_main: 'Product',
  sku: 'Product',
  industry: 'Industry',
  search_click: 'Search',
  search: 'Search',
};

/** Map a parsed domain to a business category. */
export const classifyDomain = (domain: string): string =>
  DOMAIN_CATEGORY[domain] ?? 'Other';

// ---------------------------------------------------------------------------
// Metric → canonical name
// ---------------------------------------------------------------------------

const METRIC_CANONICAL: Record<string, string> = {
  // Transaction metrics
  ord_ord_amt: 'gmv',
  ord_ord_qtty: 'orders',
  ord_sku_qtty: 'items_sold',
  deal_ord_user_cnt: 'customers',
  deal_rate: 'conversion_rate',

  // Traffic metrics
  brow_sku__page_cnt: 'visitors',
  brow_sku_cnt: 'sku_traffic',
  brow_sku_qtty: 'traffic_volume',
  cha_last_field_src: 'channel_source',

  // Conversion / derived metrics
  intr_ord_cvr_deal: 'attributed_conversion',
  intr_ord_ord_amt: 'attributed_gmv',
  intr_ord_ord_cnt: 'attributed_orders',
};

/** Map a parsed metric segment to a canonical metric name. */
export const classifyMetric = (metric: string): string =>
  METRIC_CANONICAL[metric] ?? metric.replace(/__/g, '_');

// ---------------------------------------------------------------------------
// Unit inference
// ---------------------------------------------------------------------------

/**
 * Infer the unit for an indicator based on its metric type and suffix.
 *  - Amount metrics → "currency" (元)
 *  - Count metrics → "count" (次/件/人)
 *  - Rate metrics → "ratio" (%)
 *  - Compare variants → "pct" (变化率)
 */
export const inferUnit = (jdKey: string): string | undefined => {
  if (jdKey.endsWith('##compare') || jdKey.endsWith('##compareValue')) return 'pct';
  const lower = jdKey.toLowerCase();
  if (lower.includes('_amt') || lower.includes('gmv')) return 'currency';
  if (lower.includes('_rate') || lower.includes('_cvr')) return 'ratio';
  if (lower.includes('_cnt') || lower.includes('_qtty') || lower.includes('_user')) return 'count';
  return undefined;
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Resolve a single JDR key to a canonical IndicatorMapping.
 *  Confidence is composed: domain recognized (0.5) + metric recognized (0.3) + source (0.2).
 *  Returns null if the key cannot be parsed as a JDR indicator. */
export const resolveIndicator = (jdKey: string): IndicatorMapping | null => {
  const parsed = parseJdrKey(jdKey);
  if (!parsed) return null;

  const category = classifyDomain(parsed.domain);
  const canonical = classifyMetric(parsed.metric);

  let confidence = 0.0;
  if (DOMAIN_CATEGORY[parsed.domain]) confidence += 0.5;
  if (METRIC_CANONICAL[parsed.metric]) confidence += 0.3;
  // Source recognition bonus — 'sz' prefix is a JD Shang marker
  if (parsed.source.startsWith('sz')) confidence += 0.2;
  confidence = Math.min(1.0, confidence);

  const hasCompare = jdKey.endsWith('##compare');
  const hasCompareValue = jdKey.endsWith('##compareValue');

  return IndicatorMappingSchema.parse({
    jd_key: jdKey,
    canonical,
    category,
    unit: inferUnit(jdKey),
    confidence: Math.round(confidence * 100) / 100,
    has_compare: hasCompare,
    has_compare_value: hasCompareValue,
  });
};

/** Resolve all JDR keys from the loaded indicator dictionary.
 *  Returns a Map<jdKey, IndicatorMapping>. */
export const resolveAllIndicators = (
  dictionary?: Record<string, IndicatorEntry>,
): Map<string, IndicatorMapping> => {
  const dict = dictionary ?? loadIndicatorDictionary();
  const result = new Map<string, IndicatorMapping>();
  for (const jdKey of Object.keys(dict)) {
    const mapping = resolveIndicator(jdKey);
    if (mapping) result.set(jdKey, mapping);
  }
  return result;
};

/** Group indicator mappings by category. */
export const getIndicatorsByCategory = (
  mappings: Map<string, IndicatorMapping>,
): Map<string, IndicatorMapping[]> => {
  const grouped = new Map<string, IndicatorMapping[]>();
  for (const mapping of mappings.values()) {
    const list = grouped.get(mapping.category) ?? [];
    list.push(mapping);
    grouped.set(mapping.category, list);
  }
  return grouped;
};

/** Convenience: map a JDR key to its canonical name, falling back to the original key. */
export const mapIndicatorToCanonical = (jdKey: string): string => {
  const resolved = resolveIndicator(jdKey);
  return resolved?.canonical ?? jdKey;
};

/**
 * Find comparison triplets in the indicator dictionary.
 * A triplet is:  { base, base##compare, base##compareValue }
 */
export const findCompareTriplets = (
  dictionary?: Record<string, IndicatorEntry>,
): Array<{ base: string; compare: string | null; compareValue: string | null }> => {
  const dict = dictionary ?? loadIndicatorDictionary();
  const keys = Object.keys(dict);
  const baseKeys = keys.filter((k) => !k.includes('##'));

  const triplets: Array<{ base: string; compare: string | null; compareValue: string | null }> = [];
  for (const base of baseKeys) {
    const compare = keys.find((k) => k === `${base}##compare`) ?? null;
    const compareValue = keys.find((k) => k === `${base}##compareValue`) ?? null;
    if (compare || compareValue) {
      triplets.push({ base, compare, compareValue });
    }
  }
  return triplets;
};

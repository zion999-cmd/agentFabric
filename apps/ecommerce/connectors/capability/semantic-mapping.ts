// Phase 3: Semantic Mapping
// Consumes P0005.2 Indicator Dictionary → produces NormalizerPlan.
// Maps raw JD keys → canonical metrics → business units → transform rules.

import type { NormalizerRule, NormalizerPlan } from './types.js';
import type { IndicatorMapping, ApiEndpoint } from '#app/connectors/discovery/types.js';
import { resolveAllIndicators, mapIndicatorToCanonical } from '#app/connectors/discovery/indicator-dictionary.js';
import { listApis } from '#app/connectors/discovery/api-inventory.js';

// ---- Unit Inference (extends discovery's inferUnit) ----

const CANONICAL_UNITS: Readonly<Record<string, string>> = {
  gmv: 'currency',
  orders: 'count',
  items_sold: 'count',
  customers: 'count',
  visitors: 'count',
  conversion_rate: 'percentage',
  roi: 'ratio',
  uv: 'count',
  impressions: 'count',
  clicks: 'count',
  cart_adds: 'count',
  click_rate: 'percentage',
  ctr: 'percentage',
  cvr: 'percentage',
  cpa: 'currency',
  cpc: 'currency',
  ad_spend: 'currency',
  ad_orders: 'count',
  refunds: 'count',
  sku_traffic: 'count',
  traffic_volume: 'count',
  channel_source: 'string',
};

const CANONICAL_TRANSFORMS: Readonly<Record<string, string>> = {
  conversion_rate: 'multiply100',
  click_rate: 'multiply100',
  ctr: 'multiply100',
  cvr: 'multiply100',
  gmv: 'identity',
  orders: 'identity',
  visitors: 'identity',
  roi: 'identity',
};

/** Resolve the canonical unit for a given canonical metric name. */
export const resolveUnit = (canonical: string): string =>
  CANONICAL_UNITS[canonical] ?? 'count';

/** Resolve the transform for a canonical metric. */
export const resolveTransform = (canonical: string): string =>
  CANONICAL_TRANSFORMS[canonical] ?? 'identity';

// ---- Normalizer Plan Generation ----

/**
 * Generate normalizer rules from indicator mappings.
 * Each rule: raw JD field → canonical metric → unit → transform.
 */
export const generateNormalizerRules = (
  indicatorMappings?: Map<string, IndicatorMapping>,
): NormalizerRule[] => {
  const mappings = indicatorMappings ?? resolveAllIndicators();

  return [...mappings.values()]
    .filter((m) => m.canonical !== 'unknown')
    .map((m) => ({
      source_field: m.jd_key,
      canonical: m.canonical,
      unit: m.unit ?? resolveUnit(m.canonical),
      transform: resolveTransform(m.canonical),
      confidence: m.confidence,
    }));
};

/**
 * Generate additional normalizer rules from endpoint field analysis.
 * Covers fields not in the indicator dictionary but present in API schemas.
 */
export const generateNormalizerRulesFromEndpoints = (
  endpoints?: ApiEndpoint[],
): NormalizerRule[] => {
  const apis = endpoints ?? listApis();
  const seen = new Set<string>();

  const rules: NormalizerRule[] = [];

  for (const ep of Object.values(apis)) {
    for (const fieldName of Object.keys(ep.fields)) {
      const cleaned = fieldName.replace(/\./g, '_').replace(/^content\./, '');
      if (seen.has(cleaned)) continue;
      seen.add(cleaned);

      const canonical = mapIndicatorToCanonical(fieldName);
      if (canonical !== null && canonical !== 'unknown') {
        rules.push({
          source_field: fieldName,
          canonical,
          unit: resolveUnit(canonical),
          transform: resolveTransform(canonical),
          confidence: 0.7,
        });
      }
    }
  }

  return rules;
};

/**
 * Generate a complete NormalizerPlan.
 * Merges indicator dictionary mappings with endpoint schema analysis.
 */
export const generateNormalizerPlan = (
  indicatorMappings?: Map<string, IndicatorMapping>,
  endpoints?: ApiEndpoint[],
): NormalizerPlan => {
  const dictRules = generateNormalizerRules(indicatorMappings);
  const endpointRules = generateNormalizerRulesFromEndpoints(endpoints);

  // Merge: dictionary rules take precedence (higher confidence)
  const dictKeys = new Set(dictRules.map((r) => r.source_field));
  const merged = [
    ...dictRules,
    ...endpointRules.filter((r) => !dictKeys.has(r.source_field)),
  ];

  return {
    generated_at: new Date().toISOString(),
    source: 'discovery/jd-capability indicator_dictionary + api_inventory',
    rules: merged,
  };
};

/**
 * Generate a serializable indicator dictionary for indicator.generated.json.
 */
export const generateIndicatorDictionary = (
  indicatorMappings?: Map<string, IndicatorMapping>,
): Record<string, { canonical: string; unit: string; confidence: number }> => {
  const mappings = indicatorMappings ?? resolveAllIndicators();
  const dict: Record<string, { canonical: string; unit: string; confidence: number }> = {};

  for (const m of mappings.values()) {
    if (m.canonical !== 'unknown') {
      dict[m.jd_key] = {
        canonical: m.canonical,
        unit: m.unit ?? resolveUnit(m.canonical),
        confidence: m.confidence,
      };
    }
  }

  return dict;
};

/**
 * Summary of the normalizer plan.
 */
export const summarizeNormalizerPlan = (plan: NormalizerPlan): {
  total_rules: number;
  high_confidence: number;
  units: Record<string, number>;
} => {
  const units: Record<string, number> = {};
  let highConf = 0;

  for (const r of plan.rules) {
    units[r.unit] = (units[r.unit] ?? 0) + 1;
    if (r.confidence >= 0.8) highConf++;
  }

  return {
    total_rules: plan.rules.length,
    high_confidence: highConf,
    units,
  };
};

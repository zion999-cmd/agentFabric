// Runtime Normalizer Resolver — converts generated NormalizerPlan into a runtime lookup table.
// P0005.5: Fixes G3 — normalizer-plan.json (887 rules) was never loaded at runtime.
// Builds a three-layer resolution chain:
//   1. INDICATOR_OVERRIDES (hand-written, business-critical — 9 keys)
//   2. NormalizerPlan.rules (generated from Discovery — 887 rules)
//   3. JD_SPEC fallback (hand-written safety net — 16 canonical → aliases)
//
// Output shape is Record<canonical, source_field[]> — same as JD_SPEC, consumable by mapBySpec().

import type { NormalizerPlan } from '#app/connectors/capability/types.js';

/** Minimum confidence threshold for generated normalizer rules. */
const MIN_CONFIDENCE = 0.3;

/**
 * Hand-written fallback spec — canonical metric names → platform field aliases.
 * These are the safety net for canonical metrics that the generated plan may not cover.
 * P0005.5: This stays as the authoritative fallback layer, NOT the primary source.
 */
const JD_SPEC_FALLBACK: Readonly<Record<string, readonly string[]>> = {
  gmv: ['gmv', 'totalGMV', 'turnover'],
  orders: ['orders', 'orderCount', 'totalOrders'],
  refunds: ['refunds', 'returnCount'],
  roi: ['roi', 'productionRatio'],
  uv: ['uv', 'uniqueVisitors'],
  click_rate: ['clickRate', 'ctr', 'click_rate'],
  cart_adds: ['cartAdds', 'cart_adds'],
  ad_spend: ['adSpend', 'ad_spend'],
  ad_orders: ['adOrders', 'ad_orders'],
  cpa: ['cpa'],
  cpc: ['cpc'],
  ctr: ['ctr'],
  cvr: ['cvr', 'conversionRate'],
  impressions: ['impressions', 'showCount'],
  clicks: ['clicks', 'clickCount'],
};

/**
 * Build a normalizer lookup spec from a NormalizerPlan + optional hand-written overrides.
 *
 * Resolution chain:
 *   1. NormalizerPlan rules (confidence >= MIN_CONFIDENCE) → grouped by canonical
 *   2. INDICATOR_OVERRIDES applied on top — for business-critical keys where
 *      the algorithmic parser got the canonical name wrong
 *   3. JD_SPEC_FALLBACK entries merged in for any canonical NOT covered by the plan
 *
 * Returns Record<canonical, source_field[]> — same shape as JD_SPEC, consumable
 * by the existing mapBySpec() function in normalizer.ts.
 */
export const buildNormalizerSpec = (
  normalizerPlan: NormalizerPlan,
  overrides?: Readonly<Record<string, string>>,
): Record<string, readonly string[]> => {
  // Step 1: Group normalizer rules by canonical name, collecting source_fields
  const spec: Record<string, Set<string>> = {};

  for (const rule of normalizerPlan.rules) {
    if (rule.confidence < MIN_CONFIDENCE) continue;

    const canonical = rule.canonical;
    if (!spec[canonical]) {
      spec[canonical] = new Set();
    }
    spec[canonical].add(rule.source_field);
  }

  // Step 2: Apply hand-written overrides — for each override, ensure the
  // source_field maps to the correct canonical (not the algorithmic one).
  // The override conceptually says "source_field X SHOULD map to canonical Y".
  // We add X as a source_field alias for canonical Y.
  if (overrides) {
    for (const [sourceField, correctCanonical] of Object.entries(overrides)) {
      // Remove ##compare / ##compareValue suffix for spec matching —
      // the raw field name in API responses doesn't have the suffix either.
      const baseField = sourceField.replace(/##compare(Value)?$/, '');
      if (!spec[correctCanonical]) {
        spec[correctCanonical] = new Set();
      }
      spec[correctCanonical].add(baseField);
    }
  }

  // Step 3: Merge JD_SPEC_FALLBACK entries for canonicals NOT covered by the plan
  for (const [canonical, aliases] of Object.entries(JD_SPEC_FALLBACK)) {
    if (!spec[canonical]) {
      spec[canonical] = new Set(aliases);
    } else {
      for (const alias of aliases) {
        spec[canonical].add(alias);
      }
    }
  }

  // Convert Sets to readonly arrays
  const result: Record<string, readonly string[]> = {};
  for (const [canonical, fields] of Object.entries(spec)) {
    result[canonical] = [...fields];
  }

  return result;
};

/**
 * Convenience: build a normalizer spec directly from a blueprint's normalizer_plan.
 * Uses INDICATOR_OVERRIDES from the JD connector as the authoritative correction layer.
 */
export const buildSpecFromBlueprint = (
  normalizerPlan: NormalizerPlan,
  overrides?: Readonly<Record<string, string>>,
): Record<string, readonly string[]> => {
  return buildNormalizerSpec(normalizerPlan, overrides);
};

/**
 * Count how many unique canonical metrics the spec covers.
 * Useful for verification: generated spec should have >> 16 (JD_SPEC size).
 */
export const specCoverageCount = (spec: Record<string, readonly string[]>): number => {
  return Object.keys(spec).length;
};

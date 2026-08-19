// Product-top signal generation — converts the JD productTop (per-SKU GMV) into
// product-level signals the existing RankingFacade can consume.
//
// Consolidation (Ranking Data Consolidation): the product-level ranking was fed by
// stale agentCMS migration data (growth = 0 for all products). This WIREs the fresh
// JD productTop — real, differentiated per-SKU GMV — into the ranking input.
//
// It does NOT change the ranking algorithm, does NOT add a ranking engine, and does
// NOT fabricate differences: the GMV differences are real CDP data.

import type { Signal } from '#shared/schemas/signal.js';
import type { JdProductTopEntry } from '#app/connectors/jd/parsers/index.js';
import { uuid } from '#shared/utils/crypto.js';
import { nowIso } from '#shared/utils/time.js';

/** Normalize an absolute GMV to a [-1, 1] growth-like score relative to peers. */
const normalizeToGrowth = (gmv: number, minGmv: number, maxGmv: number): number => {
  if (maxGmv === minGmv) return 0;
  return ((gmv - minGmv) / (maxGmv - minGmv)) * 2 - 1;
};

/**
 * Generate one `gmv_growth_1d` signal per top product. signal_value is the SKU's
 * GMV normalized to [-1, 1] relative to the day's top products, so the existing
 * growthToScore (clamp((mean+1)/2)) differentiates them. confidence reflects real
 * CDP provenance (vs 0 from the stale agentCMS data).
 */
export const generateProductTopSignals = (
  topProducts: readonly JdProductTopEntry[],
): Signal[] => {
  const valid = topProducts.filter((p) => Number.isFinite(p.gmv) && p.gmv > 0);
  if (valid.length === 0) return [];

  const gmvs = valid.map((p) => p.gmv);
  const minGmv = Math.min(...gmvs);
  const maxGmv = Math.max(...gmvs);
  const now = nowIso();

  return valid.map((p) => {
    const value = normalizeToGrowth(p.gmv, minGmv, maxGmv);
    return {
      signal_id: uuid(),
      entity_type: 'product' as const,
      entity_id: p.sku_id,
      signal_name: 'gmv_growth_1d',
      signal_value: value,
      signal_unit: 'ratio' as const,
      signal_direction: value >= 0 ? ('up' as const) : ('down' as const),
      weight: 0.88,
      confidence: 0.9, // real CDP data
      source: { platform: 'jd', dataset: 'productTop', ingested_at: now },
      window: '1d',
      observed_at: now,
      lifecycle: { version: 1, status: 'active' as const, expires_at: null },
      trace: { pipeline_run_id: uuid(), transform_hash: uuid() },
    };
  });
};

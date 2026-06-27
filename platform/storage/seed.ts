// Seed data constants: default signal weights + ranking profiles.
// These encode the prior business beliefs migrated from agentCMS.
//
// Naming convention: signal_name = `${base}_${windowDays}d` (e.g. sales_growth_7d).
// Weights are keyed by BASE metric name and apply across all windows.
// Ranking component mapping uses BASE prefixes; the engine matches by prefix.

import type { RankingProfile, RankingProfileName } from '#shared/schemas/ranking.js';
import type { RankingComponentName } from '#shared/schemas/ranking.js';

/** Default per-signal business weights (prior belief), keyed by base metric name. */
export const DEFAULT_SIGNAL_WEIGHTS: Readonly<Record<string, number>> = {
  sales_growth: 0.9,
  gmv_growth: 0.88,
  sku_growth: 0.72,
  video_growth: 0.66,
  ad_density: 0.62,
  creator_coverage: 0.58,
  price_competition_index: 0.57,
  stockout_risk: 0.85,
  return_risk_score: 0.75,
};

/** Signal base-name -> component mapping (load-bearing). Engine matches by prefix. */
export const SIGNAL_COMPONENT_MAPPING: Readonly<Record<RankingComponentName, readonly string[]>> = {
  growth: ['sales_growth', 'gmv_growth', 'sku_growth', 'video_growth'],
  competition: ['ad_density', 'creator_coverage', 'price_competition_index'],
  supply_stability: ['stockout_risk'],
  lifecycle: [],
  quality: ['return_risk_score'],
};

/** Mutable copy of the signal mapping (for storage in profile records). */
const mutableMapping = (): Record<RankingComponentName, string[]> =>
  Object.fromEntries(
    Object.entries(SIGNAL_COMPONENT_MAPPING).map(([k, v]) => [k, [...v]]),
  ) as Record<RankingComponentName, string[]>;

/** The three ranking profiles. */
export const RANKING_PROFILES: Readonly<Record<RankingProfileName, RankingProfile>> = {
  sales_leaderboard: {
    name: 'sales_leaderboard',
    label: '销量榜单',
    goal: '谁卖得最多',
    weights: { growth: 0.6, competition: 0.15, supply_stability: 0.1, lifecycle: 0.05, quality: 0.1 },
    signal_mapping: mutableMapping(),
    description: 'Aligns with platform sales rankings — rewards sheer volume.',
  },
  growth_discovery: {
    name: 'growth_discovery',
    label: '增长发现',
    goal: '谁正在爆发',
    weights: { growth: 0.55, competition: 0.15, supply_stability: 0.1, lifecycle: 0.1, quality: 0.1 },
    signal_mapping: mutableMapping(),
    description: 'Finds breakout products with the steepest growth curves.',
  },
  operator_mode: {
    name: 'operator_mode',
    label: '运营推荐',
    goal: '运营应该关注谁',
    weights: { growth: 0.35, competition: 0.25, supply_stability: 0.2, lifecycle: 0.1, quality: 0.1 },
    signal_mapping: mutableMapping(),
    description: 'Comprehensive operational recommendation balancing all components.',
  },
};

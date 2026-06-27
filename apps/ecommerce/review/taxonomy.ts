// Review taxonomy — the 10-value retail risk vocabulary (crown jewel of the review domain).

import type { RankingReviewReasonCategory } from '#shared/schemas/review.js';

export const REASON_CATEGORIES: readonly RankingReviewReasonCategory[] = [
  'inventory_concern',
  'promotion_ending',
  'creator_drop',
  'seasonal_fluctuation',
  'market_trend_shift',
  'pricing_issue',
  'data_quality_doubt',
  'growth_legitimate',
  'manual_override',
  'other',
];

export const REASON_CATEGORY_LABELS: Readonly<Record<RankingReviewReasonCategory, string>> = {
  inventory_concern: '库存担忧',
  promotion_ending: '促销末期',
  creator_drop: '达人带动力下降',
  seasonal_fluctuation: '季节性波动',
  market_trend_shift: '市场趋势转变',
  pricing_issue: '定价问题',
  data_quality_doubt: '数据质量存疑',
  growth_legitimate: '增长合理',
  manual_override: '人工覆盖',
  other: '其他',
};

/** Whether a reason category is extractable into a memory pattern. */
export const isExtractable = (category: RankingReviewReasonCategory): boolean =>
  category !== 'growth_legitimate' && category !== 'other';

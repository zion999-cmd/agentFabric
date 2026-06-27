// Competition / density calculators. Pure functions ported verbatim from agentCMS.

import { clamp, log1p, safeDivide } from '#shared/utils/math.js';

/**
 * Ad density / sell-through pressure (0-1) = units / (units + max(1, stock)).
 * High = strong sell-through relative to remaining inventory.
 */
export const adDensity = (units: number, stock: number): number => {
  return clamp(safeDivide(units, units + Math.max(1, stock), 0));
};

/**
 * Creator-driven demand proxy (0-1) = log1p(orderCount) / 3, clamped.
 */
export const creatorCoverage = (orderCount: number): number => {
  return clamp(safeDivide(log1p(orderCount), 3, 0));
};

/**
 * Price competition index (0-1) = 1 - |price - categoryMedian| / categoryMedian.
 * High = priced close to the category median.
 */
export const priceCompetitionIndex = (price: number, categoryMedianPrice: number): number => {
  if (categoryMedianPrice <= 0) return 0;
  return clamp(1 - Math.abs(price - categoryMedianPrice) / categoryMedianPrice);
};

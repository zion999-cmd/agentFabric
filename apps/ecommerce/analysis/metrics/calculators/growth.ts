// Growth calculators. Pure functions ported verbatim from agentCMS.
// Growth = (current - previous) / previous, with edge cases.

import { clamp } from '#shared/utils/math.js';

/**
 * Growth rate from a previous to a current value.
 * - previous <= 0: if current > 0 -> 1 (breakout), else 0.
 * - otherwise: (current - previous) / previous, clamped to [-1, 1] for score stability.
 */
export const growthRate = (current: number, previous: number): number => {
  if (previous <= 0) {
    return current > 0 ? 1 : 0;
  }
  const raw = (current - previous) / previous;
  return clamp(raw, -1, 1);
};

// Memory-adjustment arithmetic — pure functions ported verbatim from agentCMS.

import type { RankingMemoryAdjustment } from '#shared/schemas/ranking.js';
import { clamp } from '#shared/utils/math.js';

/**
 * Apply a single memory adjustment to a score.
 * - decrease_confidence: score *= (1 - magnitude)
 * - increase_confidence: score = min(1, score * (1 + magnitude))
 * - cap_score:           score = min(magnitude, score)
 * - boost_score:         score = min(1, score + magnitude)
 */
export const applyAdjustment = (score: number, adjustment: RankingMemoryAdjustment): number => {
  switch (adjustment.action) {
    case 'decrease_confidence':
      return score * (1 - adjustment.magnitude);
    case 'increase_confidence':
      return Math.min(1, score * (1 + adjustment.magnitude));
    case 'cap_score':
      return Math.min(adjustment.magnitude, score);
    case 'boost_score':
      return Math.min(1, score + adjustment.magnitude);
  }
};

/**
 * Does an adjustment's target signal match any used signal?
 * Matches exactly OR by base prefix (e.g. base `gmv_growth` matches `gmv_growth_7d`).
 */
export const signalMatches = (
  adjustmentSignal: string,
  signalsUsed: readonly string[],
): boolean =>
  signalsUsed.some(
    (used) => used === adjustmentSignal || used.startsWith(`${adjustmentSignal}_`),
  );

/**
 * Apply all matching memory adjustments to an overall score.
 * An adjustment applies only if the entity used the target signal (prefix match).
 */
export const applyMemoryAdjustments = (
  score: number,
  signalsUsed: readonly string[],
  adjustments: readonly RankingMemoryAdjustment[],
): { score: number; applied: RankingMemoryAdjustment[] } => {
  let current = score;
  const applied: RankingMemoryAdjustment[] = [];
  for (const adj of adjustments) {
    if (!signalMatches(adj.signal_name, signalsUsed)) continue;
    current = applyAdjustment(current, adj);
    applied.push(adj);
  }
  return { score: clamp(current), applied };
};

// Memory weight formula + exponential decay + tier classification. Ported verbatim.

import { clamp, freshnessDecay } from '#shared/utils/math.js';

export interface MemoryWeightInputs {
  confidence: number;
  supportRate: number;
  importance: number;
  freshness: number;
}

/** Coefficients for the final-score blend. */
export const WEIGHT_COEFFICIENTS = {
  confidence: 0.4,
  supportRate: 0.3,
  importance: 0.2,
  freshness: 0.1,
} as const;

/** final_score = 0.40*confidence + 0.30*support_rate + 0.20*importance + 0.10*freshness. */
export const computeFinalScore = (inputs: MemoryWeightInputs): number => {
  const { confidence, supportRate, importance, freshness } = inputs;
  return clamp(
    WEIGHT_COEFFICIENTS.confidence * confidence +
      WEIGHT_COEFFICIENTS.supportRate * supportRate +
      WEIGHT_COEFFICIENTS.importance * importance +
      WEIGHT_COEFFICIENTS.freshness * freshness,
  );
};

/** Confidence cap: min(0.9, support_rate). */
export const memoryConfidence = (supportRate: number): number => clamp(Math.min(0.9, supportRate));

/** Freshness from elapsed days since last_seen, given a half-life. */
export const memoryFreshness = (lastSeenAt: string, now: Date, halfLifeDays: number): number => {
  const elapsedMs = now.getTime() - new Date(lastSeenAt).getTime();
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
  return clamp(freshnessDecay(elapsedDays, halfLifeDays));
};

export type MemoryTier = 'strong' | 'weak' | 'rejected';

/** Tier: <0.5 rejected, 0.5-0.7 weak, >=0.7 strong. */
export const classifyTier = (finalScore: number): MemoryTier => {
  if (finalScore >= 0.7) return 'strong';
  if (finalScore >= 0.5) return 'weak';
  return 'rejected';
};

/** Default half-life for newly extracted memories. */
export const DEFAULT_HALF_LIFE_DAYS = 30;
/** Minimum reject events of the same reason category to extract a memory. */
export const MIN_SUPPORT = 5;
/** Minimum support rate to extract a memory. */
export const MIN_SUPPORT_RATE = 0.6;

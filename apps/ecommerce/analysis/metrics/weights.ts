// Signal weight resolution + (deferred) feedback-driven reweighting.

import { DEFAULT_SIGNAL_WEIGHTS } from '#platform/storage/seed.js';
import { clamp } from '#shared/utils/math.js';

/**
 * Resolve a signal weight by name. Accepts either the base name
 * (`sales_growth`) or a windowed name (`sales_growth_7d`); the trailing
 * `_<N>d` suffix is stripped before lookup.
 */
export const resolveSignalWeight = (
  signalName: string,
  overrides?: Readonly<Record<string, number>>,
): number | undefined => {
  const direct = overrides?.[signalName];
  if (direct !== undefined) return direct;
  const base = stripWindowSuffix(signalName);
  const baseOverride = overrides?.[base];
  if (baseOverride !== undefined) return baseOverride;
  return DEFAULT_SIGNAL_WEIGHTS[base];
};

/** Strip a trailing `_<N>d` window suffix from a signal name. */
export const stripWindowSuffix = (signalName: string): string => {
  const match = signalName.match(/_(\d+)d$/);
  return match ? signalName.slice(0, match.index) : signalName;
};

/** Default weight for a signal name (no overrides). */
export const defaultWeightFor = (signalName: string): number =>
  resolveSignalWeight(signalName) ?? 0.5;

// ---- Feedback-driven reweighting (ported verbatim) ----
// Used by the review/feedback loop once signal usefulness aggregates exist.

/**
 * Observed weight from a usefulness score (0..1): clamp(0.2 + usefulness * 0.8).
 * Floors at 0.2, ceilings at 1.0.
 */
export const observedWeight = (usefulnessScore: number): number =>
  clamp(0.2 + usefulnessScore * 0.8);

/**
 * Recommended weight blending current with observed via smoothing factor 0.6,
 * constrained to [0.2, 0.98].
 */
export const recommendedWeight = (
  currentWeight: number,
  usefulnessScore: number,
  smoothingFactor = 0.6,
): number => {
  const observed = observedWeight(usefulnessScore);
  const blended = currentWeight * (1 - smoothingFactor) + observed * smoothingFactor;
  return clamp(blended, 0.2, 0.98);
};

/**
 * Recommended weight action label: hold if |delta| < 0.02, else increase/decrease.
 */
export const weightAction = (
  currentWeight: number,
  recommended: number,
): 'increase' | 'decrease' | 'hold' => {
  const delta = recommended - currentWeight;
  if (Math.abs(delta) < 0.02) return 'hold';
  return delta > 0 ? 'increase' : 'decrease';
};

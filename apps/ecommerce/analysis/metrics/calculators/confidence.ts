// Confidence calculator. Pure function ported verbatim from agentCMS.

import { clamp, safeDivide } from '#shared/utils/math.js';

/**
 * Confidence from sample size: min(1, n/20). Saturates at 20 samples.
 */
export const confidenceBySample = (sampleCount: number): number => {
  return clamp(safeDivide(sampleCount, 20, 0));
};

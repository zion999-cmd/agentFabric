// Trust score — both branches ported verbatim from agentCMS.

import { clamp } from '#shared/utils/math.js';

export interface TrustInputs {
  isSupported: boolean;
  confidence: number;
  coverage: number;
  signalCount: number;
  contradictionCount: number;
}

/**
 * Trust score:
 * - supported:  confidence*0.5 + coverage*0.3 + min(signalCount/9, 1)*0.2
 * - unsupported: max(0, confidence*0.3 - contradictions*0.15)
 */
export const computeTrustScore = (inputs: TrustInputs): number => {
  const { isSupported, confidence, coverage, signalCount, contradictionCount } = inputs;
  if (isSupported) {
    const signalFactor = Math.min(signalCount / 9, 1);
    return clamp(confidence * 0.5 + coverage * 0.3 + signalFactor * 0.2);
  }
  return clamp(Math.max(0, confidence * 0.3 - contradictionCount * 0.15));
};

// Direction helpers. Pure functions ported verbatim from agentCMS.
// Classify a numeric signal value into up/down/flat.

import type { SignalDirection } from '#shared/schemas/signal.js';

/**
 * Direction for growth ratios (centered on 0, ±0.05 dead-zone).
 */
export const directionByDelta = (value: number): SignalDirection => {
  if (value > 0.05) return 'up';
  if (value < -0.05) return 'down';
  return 'flat';
};

/**
 * Direction for risk scores (high = risky -> up, <0.3 -> down).
 */
export const directionByRisk = (value: number): SignalDirection => {
  if (value > 0.6) return 'up';
  if (value < 0.3) return 'down';
  return 'flat';
};

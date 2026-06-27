// Scoring formulas — pure functions ported verbatim from agentCMS.

import type { RankingComponentName } from '#shared/schemas/ranking.js';
import type { Signal } from '#shared/schemas/signal.js';
import { clamp, mean, weightedAvg } from '#shared/utils/math.js';
import type { RankingWeights } from '#shared/schemas/ranking.js';
import type { ComponentScores } from '#shared/schemas/ranking.js';

/** Growth ratio [-1,1] -> score [0,1]: clamp((mean+1)/2). */
export const growthToScore = (values: readonly number[]): number =>
  clamp((mean(values) + 1) / 2);

/** Risk score [0,1] -> component score [0,1]: clamp(1 - mean(clamp(v))). High risk -> low score. */
export const riskToScore = (values: readonly number[]): number =>
  clamp(1 - mean(values.map((v) => clamp(v))));

/** Lifecycle status -> score: active=1, stale=0.4, deprecated=0.1. */
export const lifecycleStatusToScore = (status: Signal['lifecycle']['status']): number => {
  switch (status) {
    case 'active':
      return 1;
    case 'stale':
      return 0.4;
    case 'deprecated':
      return 0.1;
  }
};

/** Coverage = fraction of the 5 components that have at least one signal. */
export const computeCoverage = (
  componentSignals: Readonly<Record<RankingComponentName, Signal[]>>,
): number => {
  const components: RankingComponentName[] = [
    'growth',
    'competition',
    'supply_stability',
    'lifecycle',
    'quality',
  ];
  const covered = components.filter((c) => componentSignals[c].length > 0).length;
  return covered / components.length;
};

/** Mean confidence across a signal set. */
export const meanConfidence = (signals: readonly Signal[]): number =>
  signals.length === 0 ? 0 : mean(signals.map((s) => s.confidence));

/**
 * Overall score = clamp(weightedAvg * (0.7 + 0.3*confidence) * (0.8 + 0.2*coverage)).
 * Confidence and coverage shrink the score toward 0.
 */
export const computeOverall = (
  componentScores: ComponentScores,
  weights: RankingWeights,
  confidence: number,
  coverage: number,
): number => {
  const values = [
    componentScores.growth,
    componentScores.competition,
    componentScores.supply_stability,
    componentScores.lifecycle,
    componentScores.quality,
  ];
  const w = [
    weights.growth,
    weights.competition,
    weights.supply_stability,
    weights.lifecycle,
    weights.quality,
  ];
  const weighted = weightedAvg(values, w);
  const dampened = weighted * (0.7 + 0.3 * confidence) * (0.8 + 0.2 * coverage);
  return clamp(dampened);
};

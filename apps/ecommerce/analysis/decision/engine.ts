// Ranking engine — group signals by entity, score 5 components, adjust, sort.

import type { Signal } from '#shared/schemas/signal.js';
import type {
  RankingMemoryAdjustment,
  RankingProfile,
  RankingResult,
  ComponentScores,
} from '#shared/schemas/ranking.js';
import { nowIso } from '#shared/utils/time.js';
import { uuid } from '#shared/utils/crypto.js';
import { matchComponent } from './profiles.js';
import {
  computeCoverage,
  computeOverall,
  growthToScore,
  lifecycleStatusToScore,
  meanConfidence,
  riskToScore,
} from './scoring.js';
import { applyMemoryAdjustments } from './memory-adjustment.js';
import {
  buildDecisionTrace,
  buildStrengthsRisks,
  buildSummary,
} from './explainability.js';
import type { RankingComponentName } from '#shared/schemas/ranking.js';

export interface RankInput {
  signals: readonly Signal[];
  profile: RankingProfile;
  adjustments?: readonly RankingMemoryAdjustment[];
}

/**
 * Rank products: group signals by entity, score 5 components, apply memory
 * adjustments, sort by overall_score desc (entity_id asc tiebreaker).
 */
export const rankProducts = (input: RankInput): RankingResult[] => {
  const { signals, profile, adjustments = [] } = input;

  // Group by entity, dedupe by signal_name keeping most-recently-ingested.
  const byEntity = new Map<string, Map<string, Signal>>();
  for (const signal of signals) {
    const entity = byEntity.get(signal.entity_id) ?? new Map<string, Signal>();
    const existing = entity.get(signal.signal_name);
    if (!existing || signal.source.ingested_at > existing.source.ingested_at) {
      entity.set(signal.signal_name, signal);
    }
    byEntity.set(signal.entity_id, entity);
  }

  const results: RankingResult[] = [];

  for (const [entityId, signalMap] of byEntity) {
    const entitySignals = [...signalMap.values()];

    // Bucket signals into components by prefix.
    const componentSignals: Record<RankingComponentName, Signal[]> = {
      growth: [],
      competition: [],
      supply_stability: [],
      lifecycle: [],
      quality: [],
    };
    for (const s of entitySignals) {
      const component = matchComponent(s.signal_name, profile);
      if (component) {
        componentSignals[component].push(s);
      }
    }

    const componentScores = computeComponentScores(componentSignals, entitySignals);
    const confidence = meanConfidence(entitySignals);
    const coverage = computeCoverage(componentSignals);
    const signalsUsed = entitySignals.map((s) => s.signal_name);

    let overall = computeOverall(componentScores, profile.weights, confidence, coverage);
    const { score: adjusted, applied } = applyMemoryAdjustments(overall, signalsUsed, adjustments);
    overall = adjusted;

    const { strengths, risks } = buildStrengthsRisks(componentScores);
    const memorySuffix = applied.length > 0 ? ` [Memory调整: ${applied.length}条]` : '';
    const summary = buildSummary(strengths, risks, memorySuffix);
    const decisionTrace = buildDecisionTrace(
      componentScores,
      profile.weights,
      entitySignals,
      overall,
      confidence,
      coverage,
    );

    results.push({
      ranking_id: uuid(),
      entity_id: entityId,
      overall_score: overall,
      confidence,
      coverage,
      component_scores: componentScores,
      signals_used: signalsUsed,
      explainability: { strengths, risks, summary },
      decision_trace: decisionTrace,
      ranked_at: nowIso(),
    });
  }

  return results.sort((a, b) =>
    b.overall_score - a.overall_score !== 0
      ? b.overall_score - a.overall_score
      : a.entity_id.localeCompare(b.entity_id),
  );
};

/** Compute the 5 component scores from bucketed signals. */
const computeComponentScores = (
  componentSignals: Readonly<Record<RankingComponentName, Signal[]>>,
  allEntitySignals: readonly Signal[],
): ComponentScores => {
  const growth = componentSignals.growth;
  const competition = componentSignals.competition;
  const supply = componentSignals.supply_stability;
  const quality = componentSignals.quality;

  // Lifecycle has no named signals — derived from all entity signals' lifecycle status.
  const lifecycleScore =
    allEntitySignals.length === 0
      ? 0
      : lifecycleStatusToScoreMean(allEntitySignals);

  return {
    growth: growth.length === 0 ? 0 : growthToScore(growth.map((s) => s.signal_value)),
    competition:
      competition.length === 0 ? 0 : riskToScore(competition.map((s) => s.signal_value)),
    supply_stability: supply.length === 0 ? 0 : riskToScore(supply.map((s) => s.signal_value)),
    lifecycle: lifecycleScore,
    quality: quality.length === 0 ? 0 : riskToScore(quality.map((s) => s.signal_value)),
  };
};

const lifecycleStatusToScoreMean = (signals: readonly Signal[]): number => {
  if (signals.length === 0) return 0;
  const sum = signals.reduce((acc, s) => acc + lifecycleStatusToScore(s.lifecycle.status), 0);
  return sum / signals.length;
};

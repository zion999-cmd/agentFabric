// Explainability — strengths/risks + decision trace. Pure functions ported verbatim.

import type { Signal } from '#shared/schemas/signal.js';
import type {
  ComponentScores,
  DecisionTrace,
  DecisionTraceEvidence,
  DecisionTraceSignalImpact,
  RankingExplainability,
  RankingComponentName,
  RankingWeights,
} from '#shared/schemas/ranking.js';
import { clamp } from '#shared/utils/math.js';
import { uuid } from '#shared/utils/crypto.js';
import { isGrowthSignal } from './profiles.js';

const COMPONENT_LABELS: Record<RankingComponentName, string> = {
  growth: '增长',
  competition: '竞争',
  supply_stability: '供应稳定性',
  lifecycle: '生命周期',
  quality: '质量',
};

const STRENGTH_THRESHOLD = 0.65;
const RISK_THRESHOLD = 0.45;

/** Build strengths (components >= 0.65) and risks (components <= 0.45). */
export const buildStrengthsRisks = (
  componentScores: ComponentScores,
): Pick<RankingExplainability, 'strengths' | 'risks'> => {
  const entries = Object.entries(componentScores) as Array<[RankingComponentName, number]>;
  const strengths = entries
    .filter(([, score]) => score >= STRENGTH_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => `${COMPONENT_LABELS[c]}优势明显`);
  const risks = entries
    .filter(([, score]) => score <= RISK_THRESHOLD)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([c]) => `${COMPONENT_LABELS[c]}存在风险`);
  return { strengths, risks };
};

/** Signed impact of a single signal on the ranking. Growth positive, risk negative. */
export const signalImpact = (signal: Signal): number => {
  const value = clamp(signal.signal_value);
  return isGrowthSignal(signal.signal_name) ? value * signal.weight : -value * signal.weight;
};

/** Top 5 positive and top 5 negative signals by impact. */
export const buildTopAndRiskSignals = (
  signals: readonly Signal[],
): { top: DecisionTraceSignalImpact[]; risk: DecisionTraceSignalImpact[] } => {
  const withImpact = signals.map((s) => ({
    signal_name: s.signal_name,
    value: s.signal_value,
    impact: signalImpact(s),
  }));
  const top = [...withImpact].sort((a, b) => b.impact - a.impact).slice(0, 5);
  const risk = [...withImpact].sort((a, b) => a.impact - b.impact).slice(0, 5);
  return { top, risk };
};

/** Top 8 signals by confidence as evidence. */
export const buildEvidence = (signals: readonly Signal[]): DecisionTraceEvidence[] =>
  [...signals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((s) => ({
      signal_name: s.signal_name,
      signal_value: s.signal_value,
      confidence: s.confidence,
    }));

/** Per-component contribution: impact = score * weight. */
export const buildRankingContribution = (
  componentScores: ComponentScores,
  weights: RankingWeights,
): DecisionTrace['ranking_contribution'] => {
  const entries: Array<[RankingComponentName, number, number]> = [
    ['growth', componentScores.growth, weights.growth],
    ['competition', componentScores.competition, weights.competition],
    ['supply_stability', componentScores.supply_stability, weights.supply_stability],
    ['lifecycle', componentScores.lifecycle, weights.lifecycle],
    ['quality', componentScores.quality, weights.quality],
  ];
  return entries.map(([component, score, weight]) => ({
    component,
    score,
    weight,
    impact: score * weight,
  }));
};

/** Assemble the full decision trace. */
export const buildDecisionTrace = (
  componentScores: ComponentScores,
  weights: RankingWeights,
  signals: readonly Signal[],
  finalScore: number,
  confidence: number,
  coverage: number,
): DecisionTrace => {
  const { top, risk } = buildTopAndRiskSignals(signals);
  return {
    decision_id: uuid(),
    final_score: finalScore,
    top_signals: top,
    risk_signals: risk,
    ranking_contribution: buildRankingContribution(componentScores, weights),
    evidence: buildEvidence(signals),
    confidence: {
      model: 0.85,
      evidence_coverage: coverage,
      final: confidence,
    },
  };
};

/** Compose the human-readable explainability summary. */
export const buildSummary = (
  strengths: readonly string[],
  risks: readonly string[],
  memorySuffix = '',
): string => {
  const parts: string[] = [];
  if (strengths.length > 0) parts.push(`优势: ${strengths.join('、')}`);
  if (risks.length > 0) parts.push(`风险: ${risks.join('、')}`);
  if (parts.length === 0) parts.push('各项指标表现平稳');
  return parts.join('；') + memorySuffix;
};

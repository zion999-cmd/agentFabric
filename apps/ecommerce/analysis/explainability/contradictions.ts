// Contradiction rules — the 7 rules ported verbatim from agentCMS.

import type { Signal } from '#shared/schemas/signal.js';
import type { RankingResult, RankingMemoryAdjustment } from '#shared/schemas/ranking.js';

export interface ContradictionInputs {
  entityId: string;
  ranking: RankingResult | null;
  signals: readonly Signal[];
  memoryAdjustments: readonly RankingMemoryAdjustment[];
}

/** Detect contradictions between a business conclusion and system truth. */
export const detectContradictions = (inputs: ContradictionInputs): string[] => {
  const { entityId, ranking, signals, memoryAdjustments } = inputs;
  const contradictions: string[] = [];

  // Rule 1: entity not in ranking.
  if (!ranking) {
    contradictions.push('entity_not_in_ranking');
    return contradictions;
  }

  // Rule 7: zero product signals.
  if (signals.length === 0) {
    contradictions.push('no_signals');
  }

  // Rule 2: ranking has no top signals (decision lacks signal support).
  if (ranking.decision_trace.top_signals.length === 0) {
    contradictions.push('ranking_decision_missing_signal_support');
  }

  // Rule 3: any memory adjustment decreases confidence.
  if (memoryAdjustments.some((a) => a.action === 'decrease_confidence')) {
    contradictions.push('memory_decreased_confidence');
  }

  // Rule 4: confidence < 0.3.
  if (ranking.confidence < 0.3) {
    contradictions.push('low_confidence');
  }

  // Rule 5: coverage < 0.4.
  if (ranking.coverage < 0.4) {
    contradictions.push('low_coverage');
  }

  // Rule 6: >50% signals stale.
  if (signals.length > 0) {
    const staleCount = signals.filter(
      (s) => s.lifecycle.status === 'stale' || s.lifecycle.status === 'deprecated',
    ).length;
    if (staleCount / signals.length > 0.5) {
      contradictions.push('majority_stale_signals');
    }
  }

  // entityId sanity check (entity mismatch).
  if (ranking.entity_id !== entityId) {
    contradictions.push('entity_mismatch');
  }

  return contradictions;
};

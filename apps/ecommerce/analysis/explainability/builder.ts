// Trace builder — assembles a 4-layer BusinessConclusionTrace.

import type { Signal } from '#shared/schemas/signal.js';
import type {
  BusinessConclusion,
  BusinessConclusionTrace,
  Alignment,
  ReplayConsistency,
  SystemTruth,
  SignalTraceEntry,
  MemoryTraceEntry,
  RankingTraceEntry,
} from '#shared/schemas/trace.js';
import type { ContextMemory } from '#shared/schemas/memory.js';
import type { RankingResult, RankingMemoryAdjustment } from '#shared/schemas/ranking.js';
import { nowIso } from '#shared/utils/time.js';
import { uuid } from '#shared/utils/crypto.js';
import { clamp } from '#shared/utils/math.js';
import { computeTrustScore } from './trust.js';
import { detectContradictions } from './contradictions.js';
import { signalImpact } from '../decision/explainability.js';

export interface BuildTraceInput {
  conclusion: BusinessConclusion;
  ranking: RankingResult | null;
  signals: readonly Signal[];
  memories: readonly ContextMemory[];
  memoryAdjustments: readonly RankingMemoryAdjustment[];
  replayConsistency: ReplayConsistency;
  rank?: number; // position in the ranking list
}

/** Build the full 4-layer business conclusion trace. */
export const buildTrace = (input: BuildTraceInput): BusinessConclusionTrace => {
  const { conclusion, ranking, signals, memories, memoryAdjustments, replayConsistency, rank } =
    input;

  const contradictions = detectContradictions({
    entityId: conclusion.entity_id,
    ranking,
    signals,
    memoryAdjustments,
  });
  const isSupported = contradictions.length === 0;

  const confidence = ranking?.confidence ?? 0;
  const coverage = ranking?.coverage ?? 0;

  const trustScore = computeTrustScore({
    isSupported,
    confidence,
    coverage,
    signalCount: signals.length,
    contradictionCount: contradictions.length,
  });

  const alignment: Alignment = {
    is_supported: isSupported,
    evidence_count: signals.length,
    contradictions,
    trust_score: clamp(trustScore),
  };

  const systemTruth: SystemTruth = {
    ranking: ranking ? toRankingTraceEntry(ranking, rank) : null,
    signals: signals.map(toSignalTraceEntry),
    memories: memories.map(toMemoryTraceEntry),
    replay_consistency: replayConsistency,
  };

  return {
    trace_id: uuid(),
    conclusion,
    system_truth: systemTruth,
    alignment,
    created_at: nowIso(),
  };
};

const toRankingTraceEntry = (r: RankingResult, rank?: number): RankingTraceEntry => ({
  ranking_id: r.ranking_id,
  entity_id: r.entity_id,
  overall_score: r.overall_score,
  component_scores: r.component_scores,
  top_signals: r.decision_trace.top_signals.map((s) => ({
    signal_name: s.signal_name,
    impact: s.impact,
  })),
  rank: rank ?? 1,
  confidence: r.confidence,
});

const toSignalTraceEntry = (s: Signal): SignalTraceEntry => ({
  signal_id: s.signal_id,
  signal_name: s.signal_name,
  signal_value: s.signal_value,
  signal_direction: s.signal_direction,
  confidence: s.confidence,
  lifecycle_status: s.lifecycle.status,
  impact: signalImpact(s),
});

const toMemoryTraceEntry = (m: ContextMemory): MemoryTraceEntry => ({
  memory_id: m.memory_id,
  memory_type: m.memory_type,
  statement: m.statement,
  support_rate: m.evidence.support_rate,
  sample_size: m.evidence.sample_size,
  validation_state: m.validation.state,
  applied_count: 0,
  last_applied_at: undefined,
});

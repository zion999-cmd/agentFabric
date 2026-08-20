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
import type { RankingResult, RankingMemoryAdjustment, RankingProfileName } from '#shared/schemas/ranking.js';
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

export interface RankingTraceInput {
  ranking: RankingResult;
  /** The signals that fed this ranking (all signals for this entity). */
  entitySignals: readonly Signal[];
  profile: RankingProfileName;
  /** 1-based position in the ranking list. */
  rank: number;
  /** Human-readable entity name; falls back to entity_id. */
  entityName?: string | undefined;
}

/**
 * Assemble a trace for a single ranking result (productTop path). Trust is computed
 * by buildTrace from the ranking's real confidence/coverage. No DB access.
 */
export const buildRankingTrace = (input: RankingTraceInput): BusinessConclusionTrace => {
  const { ranking, entitySignals, profile, rank, entityName } = input;
  return buildTrace({
    conclusion: {
      entity_id: ranking.entity_id,
      entity_name: entityName ?? ranking.entity_id,
      statement: `该商品在 ${profile} 榜单中排名第 ${rank}`,
      profile,
      date: ranking.ranked_at,
    },
    ranking,
    signals: entitySignals,
    memories: [],
    memoryAdjustments: [],
    replayConsistency: { days_present: 0, avg_rank: 0, rank_volatility: 0, top1_count: 0 },
    rank,
  });
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

// P0007.3.2 Memory Matcher
// Given a current event (explanation), find the most relevant operator memories.
// Not vector similarity — category + signature matching with rule-based scoring.
//
// P0007.3.3 Context Builder
// Produces an operator_context object suitable for CBP → Hermes.
// agentFabric decides WHAT is relevant. CBP just transports it.

import type { OperatorMemory, MemoryMatch, OperatorContext } from './types.js';
import type { Explanation } from '#app/analysis/pattern/explanation.js';

// ---- Memory Matcher ----

export interface MatchOptions {
  /** Max matches to return */
  maxMatches?: number;
  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number;
}

/**
 * Match a current event against persisted operator memories.
 *
 * Scoring rules (non-ML, audit-able):
 *   1. Same category → +0.60 base
 *   2. Same primary_driver → +0.25
 *   3. Same direction (up/down) → +0.10
 *   4. Memory confidence bonus → ×memory_confidence (0.5-0.95)
 */
export const matchMemories = (
  explanation: Explanation,
  memories: OperatorMemory[],
  options: MatchOptions = {},
): MemoryMatch[] => {
  const { maxMatches = 5, minSimilarity = 0.3 } = options;

  const eventCategory = inferCategory(explanation);
  const eventDirection = explanation.event_type === 'gmv_drop' ? 'down' : 'up';

  const scored: MemoryMatch[] = [];

  for (const memory of memories) {
    let score = 0;
    const reasons: string[] = [];

    // Category match (strongest signal)
    if (memory.category === eventCategory) {
      score += 0.60;
      reasons.push('same category');
    }

    // Driver match
    if (memory.primary_driver === explanation.primary_driver) {
      score += 0.25;
      reasons.push('same driver');
    }

    // Direction match
    if (memory.trigger_signature.direction === eventDirection) {
      score += 0.10;
      reasons.push('same direction');
    }

    // Confidence scaling
    score *= memory.memory_confidence;

    if (score >= minSimilarity) {
      scored.push({
        memory,
        similarity_score: Math.round(score * 100) / 100,
        match_reason: reasons.join(', '),
      });
    }
  }

  // Sort by similarity desc
  scored.sort((a, b) => b.similarity_score - a.similarity_score);

  return scored.slice(0, maxMatches);
};

// ---- Context Builder ----

export interface ContextOptions {
  /** Max matched memories to include */
  maxMemories?: number;
}

/**
 * Build an operator_context payload for CBP → Hermes.
 *
 * This is the bridge: agentFabric intelligence → Hermes decision.
 * The context tells Hermes: "here's what happened, here's what history says,
 * now decide what to do."
 */
export const buildContext = (
  explanation: Explanation,
  matchedMemories: MemoryMatch[],
  options: ContextOptions = {},
): OperatorContext => {
  const { maxMemories = 5 } = options;

  const topMemories = matchedMemories.slice(0, maxMemories);

  // Build recommendation from top match
  let recommendation: string | undefined;
  if (topMemories.length > 0) {
    const top = topMemories[0]!;
    const mem = top.memory;
    if (mem.statistics.recovery_probability >= 0.7) {
      recommendation = `Based on ${mem.statistics.observations} similar events, ${(mem.statistics.recovery_probability * 100).toFixed(0)}% recovered within ${mem.statistics.avg_recovery_days} days. Monitor before intervening.`;
    } else if (mem.statistics.recovery_probability <= 0.3) {
      recommendation = `Only ${(mem.statistics.recovery_probability * 100).toFixed(0)}% of similar events recovered naturally. Consider active intervention. Primary driver: ${mem.primary_driver}.`;
    } else {
      recommendation = `${(mem.statistics.recovery_probability * 100).toFixed(0)}% recovery rate from ${mem.statistics.observations} similar events. Mixed outcome — review driver before deciding.`;
    }
  }

  return {
    type: 'operator_context',
    event: {
      date: explanation.event_date,
      pattern: explanation.event_type,
      severity: explanation.driver_confidence > 0.8 ? 'high' : explanation.driver_confidence > 0.6 ? 'medium' : 'low',
    },
    current_metrics: {
      gmv: explanation.evidence[0]?.current_value ?? 0,
      orders: explanation.evidence.find((e) => e.metric === 'orders')?.current_value,
      visitors: explanation.evidence.find((e) => e.metric === 'visitors')?.current_value,
      conversion_rate: explanation.evidence.find((e) => e.metric === 'conversion_rate')?.current_value,
    },
    matched_memories: topMemories,
    ...(recommendation ? { recommendation } : {}),
  };
};

// ---- Helpers ----

const inferCategory = (exp: Explanation): string => {
  const driver = exp.primary_driver;
  const eventType = exp.event_type;

  if (eventType.includes('drop')) {
    if (driver === 'visitors' || driver === 'hourly_traffic') return 'traffic_driven_drop';
    if (driver === 'conversion_rate') return 'conversion_driven_drop';
    return 'traffic_driven_drop';
  }
  if (eventType.includes('spike')) {
    return 'volume_driven_spike';
  }
  return 'seasonal_pattern';
};

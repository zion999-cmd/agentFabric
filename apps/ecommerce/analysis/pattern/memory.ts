// P0007.2 Operator Memory
// Accumulates operational experience from historical events + explanations.
//
// Each memory is a learned pattern: "when X happens, Y typically follows."
// Not LLM, not human input — derived from statistical recurrence.
//
// Memory lifecycle:
//   1. Event detected (Pattern Engine)
//   2. Event explained (Explanation Engine)
//   3. Similar events found → memory created/updated
//   4. Outcome tracked → confidence adjusted
//
// Over time: "This type of GMV drop is traffic-driven, 80% recover within 5 days."

import { uuid } from '#shared/utils/crypto.js';
import type { Explanation } from './explanation.js';
import type { OperatorMemory, MemoryCategory } from '#app/memory/types.js';

export type { OperatorMemory, MemoryCategory };

export interface BuildMemoriesOptions {
  /** Minimum observations to create a memory */
  minObservations?: number;
  /** Max memories to return */
  maxMemories?: number;
}

// ---- Category Inference ----

const inferCategory = (explanation: Explanation): MemoryCategory => {
  const driver = explanation.primary_driver;
  const eventType = explanation.event_type;

  if (eventType === 'gmv_drop') {
    if (driver === 'visitors' || driver === 'hourly_traffic') return 'traffic_driven_drop';
    if (driver === 'conversion_rate') return 'conversion_driven_drop';
    return 'traffic_driven_drop'; // default for drops
  }
  if (eventType === 'gmv_spike') {
    if (driver === 'orders') return 'volume_driven_spike';
    return 'volume_driven_spike';
  }
  return 'seasonal_pattern';
};

const buildSignature = (explanation: Explanation): string => {
  // Signature = primary driver + secondary contributors (top 2)
  const top2 = explanation.evidence.slice(0, 2);
  return top2.map((e) => `${e.metric}:${e.change_pct > 0 ? 'up' : 'down'}`).join('+');
};

// ---- Memory Builder ----

/**
 * Build operator memories from a set of explained events.
 *
 * Groups events by category + signature, computes aggregate statistics,
 * and produces memory records. More observations = higher confidence.
 */
export const buildMemories = (
  explanations: Explanation[],
  options: BuildMemoriesOptions = {},
): OperatorMemory[] => {
  const { minObservations = 2, maxMemories = 20 } = options;

  // Group by category + signature
  const groups = new Map<string, Explanation[]>();
  for (const exp of explanations) {
    const category = inferCategory(exp);
    const signature = buildSignature(exp);
    const key = `${category}:${signature}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(exp);
  }

  const memories: OperatorMemory[] = [];
  const now = new Date().toISOString();

  for (const [, events] of groups) {
    if (events.length < minObservations) continue;

    const first = events[0]!;
    const last = events[events.length - 1]!;

    // Compute aggregate stats
    const recoveryEvents = events.filter((e) => e.historical_recovery_rate > 0);
    const recoveryCount = recoveryEvents.length;
    const avgRecovery = recoveryEvents.length > 0
      ? recoveryEvents.reduce((s, e) => s + e.historical_recovery_rate, 0) / recoveryEvents.length
      : 0;

    // Primary driver (most common)
    const driverCounts = new Map<string, number>();
    for (const e of events) {
      driverCounts.set(e.primary_driver, (driverCounts.get(e.primary_driver) ?? 0) + 1);
    }
    let bestDriver = '';
    let bestCount = 0;
    for (const [d, c] of driverCounts) {
      if (c > bestCount) { bestDriver = d; bestCount = c; }
    }

    // Confidence grows with observations (logarithmic, maxes at 0.95)
    const memoryConfidence = Math.min(0.5 + Math.log2(events.length) * 0.15, 0.95);

    // Description
    const description = buildDescription(
      inferCategory(first),
      bestDriver,
      events.length,
      avgRecovery,
    );

    memories.push({
      memory_id: uuid(),
      category: inferCategory(first),
      trigger_signature: {
        primary_driver: bestDriver,
        direction: first.event_type === 'gmv_drop' ? 'down' as const : 'up' as const,
      },
      pattern_description: description,
      statistics: {
        observations: events.length,
        recovery_count: recoveryCount,
        recovery_probability: Math.round(avgRecovery * 100) / 100,
        avg_recovery_days: Math.round(avgRecovery * 7),
      },
      primary_driver: bestDriver,
      driver_confidence: Math.round((bestCount / events.length) * 100) / 100,
      last_observed_at: last.event_date,
      created_at: now,
      memory_confidence: Math.round(memoryConfidence * 100) / 100,
    });
  }

  // Sort by observations desc, then confidence desc
  memories.sort((a, b) =>
    b.statistics.observations - a.statistics.observations ||
    b.memory_confidence - a.memory_confidence,
  );

  return memories.slice(0, maxMemories);
};

// ---- Description Builder ----

const buildDescription = (
  category: MemoryCategory,
  driver: string,
  count: number,
  recoveryRate: number,
): string => {
  const driverLabel: Record<string, string> = {
    'orders': '订单量',
    'visitors': '访客数',
    'hourly_traffic': '小时流量',
    'conversion_rate': '转化率',
  };

  const d = driverLabel[driver] ?? driver;

  switch (category) {
    case 'traffic_driven_drop':
      return `${d}下降导致GMV下滑。${count}次类似事件，${(recoveryRate*100).toFixed(0)}%自行恢复。`;
    case 'conversion_driven_drop':
      return `转化率下降导致GMV下滑。${count}次类似事件，${(recoveryRate*100).toFixed(0)}%自行恢复。`;
    case 'volume_driven_spike':
      return `订单量激增推动GMV上涨。${count}次类似事件。`;
    default:
      return `${d}驱动的运营变化。已观察${count}次。`;
  }
};

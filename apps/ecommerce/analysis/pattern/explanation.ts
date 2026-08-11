// P0007.1.2 Pattern Explanation Engine
// Answers "why did this happen?" for detected pattern events.
//
// Three analysis dimensions:
//   1. Attribution: which metrics drove the deviation? (traffic vs conversion vs volume)
//   2. Similarity: what historical events look like this one?
//   3. Recovery: based on similar past events, what's the recovery probability?
//
// Rule-based, not LLM. Every explanation traces to specific metric changes.
// This is the "operational fact layer" — Hermes learns on top of this later.

import type { BaselineSnapshot, DailyMetric } from './baseline.js';
import { computeBaseline } from './baseline.js';

// ---- Types ----

export interface MetricEvidence {
  metric: string;
  current_value: number;
  expected_value: number;
  change_pct: number;
  contribution: number; // relative contribution to the overall deviation (0-1)
}

export interface SimilarEvent {
  date: string;
  residual: number;
  similarity_score: number; // 0-1, how similar to current event
  recovered: boolean; // did GMV recover within 7 days?
  recovery_days: number | null; // days to recover, or null if didn't
}

export interface Explanation {
  event_date: string;
  event_type: string;
  primary_driver: string;
  driver_confidence: number;
  evidence: MetricEvidence[];
  similar_events: SimilarEvent[];
  historical_recovery_rate: number;
  recovery_confidence: number;
}

export interface ExplainOptions {
  /** Max similar events to return */
  maxSimilarEvents?: number;
  /** Min similarity threshold (0-1) */
  similarityThreshold?: number;
  /** Recovery window in days */
  recoveryWindow?: number;
}

// ---- Public API ----

/**
 * Explain a pattern event detected on a specific date.
 *
 * @param date - The event date (YYYY-MM-DD)
 * @param eventType - Type of pattern event
 * @param daily - Full daily metric history (sorted by date)
 * @param options - Configuration
 */
export const explainEvent = (
  date: string,
  eventType: string,
  daily: DailyMetric[],
  options: ExplainOptions = {},
): Explanation | null => {
  const {
    maxSimilarEvents = 10,
    similarityThreshold = 0.5,
    recoveryWindow = 7,
  } = options;

  // Find the event day
  const eventIndex = daily.findIndex((d) => d.date === date);
  if (eventIndex < 0) return null;

  const eventDay = daily[eventIndex]!;
  if (eventDay.gmv <= 0) return null;

  // Compute baseline for context
  const baseline = computeBaseline(daily);
  const baselineDay = baseline.snapshots.find((s) => s.date === date);
  if (!baselineDay) return null;

  // 1. Attribution: which metrics moved?
  const evidence = computeAttribution(daily, eventIndex, eventDay);

  // Determine primary driver
  const primaryEvidence = evidence.length > 0 ? evidence[0]! : null;

  // 2. Similar historical events
  const similarEvents = findSimilarEvents(
    daily,
    baseline.snapshots,
    eventIndex,
    eventDay,
    recoveryWindow,
    maxSimilarEvents,
    similarityThreshold,
  );

  // 3. Recovery analysis
  const recoveredCount = similarEvents.filter((e) => e.recovered).length;
  const recoveryRate = similarEvents.length > 0 ? recoveredCount / similarEvents.length : 0;

  // Confidence: driven by data density and attribution clarity
  const attributionClarity = primaryEvidence ? primaryEvidence.contribution : 0;
  const driverConfidence = 0.5 + attributionClarity * 0.4; // 0.5-0.9 range

  return {
    event_date: date,
    event_type: eventType,
    primary_driver: primaryEvidence?.metric ?? 'unknown',
    driver_confidence: Math.round(driverConfidence * 100) / 100,
    evidence,
    similar_events: similarEvents,
    historical_recovery_rate: Math.round(recoveryRate * 100) / 100,
    recovery_confidence: Math.round((recoveryRate * 0.7 + (similarEvents.length > 3 ? 0.2 : 0.1)) * 100) / 100,
  };
};

// ---- Attribution Analysis ----

/**
 * Compute which metrics contributed most to the observed deviation.
 * Compares each metric against its 7-day baseline to isolate drivers.
 */
const computeAttribution = (
  daily: DailyMetric[],
  eventIndex: number,
  eventDay: DailyMetric,
): MetricEvidence[] => {
  const evidence: MetricEvidence[] = [];

  // 7-day baseline for each metric
  const window = daily.slice(Math.max(0, eventIndex - 7), eventIndex);
  if (window.length === 0) return evidence;

  const avgWindow = (getter: (d: DailyMetric) => number) =>
    window.filter((d) => getter(d) > 0).reduce((s, d) => s + getter(d), 0) /
    Math.max(1, window.filter((d) => getter(d) > 0).length);

  const avgVisitors = avgWindow((d) => d.visitors);
  const avgOrders = avgWindow((d) => d.orders);
  const avgConv = avgWindow((d) => d.conversion_rate);
  const avgTraffic = avgWindow((d) => d.hourly_traffic_count);

  // Visitors
  if (avgVisitors > 0) {
    const change = (eventDay.visitors - avgVisitors) / avgVisitors;
    evidence.push({
      metric: 'visitors',
      current_value: eventDay.visitors,
      expected_value: avgVisitors,
      change_pct: Math.round(change * 10000) / 100,
      contribution: Math.abs(change),
    });
  }

  // Orders
  if (avgOrders > 0) {
    const change = (eventDay.orders - avgOrders) / avgOrders;
    evidence.push({
      metric: 'orders',
      current_value: eventDay.orders,
      expected_value: avgOrders,
      change_pct: Math.round(change * 10000) / 100,
      contribution: Math.abs(change),
    });
  }

  // Conversion rate
  if (avgConv > 0) {
    const change = (eventDay.conversion_rate - avgConv) / avgConv;
    evidence.push({
      metric: 'conversion_rate',
      current_value: eventDay.conversion_rate,
      expected_value: avgConv,
      change_pct: Math.round(change * 10000) / 100,
      contribution: Math.abs(change),
    });
  }

  // Hourly traffic
  if (avgTraffic > 0) {
    const change = (eventDay.hourly_traffic_count - avgTraffic) / avgTraffic;
    evidence.push({
      metric: 'hourly_traffic',
      current_value: eventDay.hourly_traffic_count,
      expected_value: avgTraffic,
      change_pct: Math.round(change * 10000) / 100,
      contribution: Math.abs(change),
    });
  }

  // Normalize contributions to sum to 1.0
  const totalContribution = evidence.reduce((s, e) => s + e.contribution, 0);
  if (totalContribution > 0) {
    for (const e of evidence) {
      e.contribution = Math.round((e.contribution / totalContribution) * 100) / 100;
    }
  }

  // Sort by contribution descending
  evidence.sort((a, b) => b.contribution - a.contribution);

  return evidence;
};

// ---- Similar Event Search ----

/**
 * Find past days with similar residual patterns.
 * Similarity = 1 - normalized distance in (residual, visitor_change, cvr_change) space.
 */
const findSimilarEvents = (
  daily: DailyMetric[],
  baselineSnapshots: BaselineSnapshot[],
  eventIndex: number,
  eventDay: DailyMetric,
  recoveryWindow: number,
  maxEvents: number,
  minSimilarity: number,
): SimilarEvent[] => {
  const candidateIndices: number[] = [];
  // Collect candidate days: past days with significant residuals
  for (let i = 30; i < eventIndex; i++) {
    const snap = baselineSnapshots.find((s) => s.date === daily[i]!.date);
    if (snap && Math.abs(snap.residual) > 0.15) {
      candidateIndices.push(i);
    }
  }

  // Compute similarity scores
  const scored: SimilarEvent[] = [];
  for (const idx of candidateIndices) {
    const candidate = daily[idx]!;
    const candidateSnap = baselineSnapshots.find((s) => s.date === candidate.date);
    if (!candidateSnap) continue;

    // Similarity based on: residual direction, magnitude, and metric changes
    const eventResidual = baselineSnapshots.find((s) => s.date === eventDay.date)?.residual ?? 0;
    const residualDiff = Math.abs(eventResidual - candidateSnap.residual);
    const residualSim = 1 - Math.min(residualDiff / 1.5, 1); // 0-1 scale

    // Visitor change similarity
    const eventVisitors = eventDay.visitors;
    const candVisitors = candidate.visitors;
    const visitorSim = eventVisitors > 0 && candVisitors > 0
      ? 1 - Math.min(Math.abs(eventVisitors - candVisitors) / Math.max(eventVisitors, candVisitors), 1)
      : 0.5;

    // CVR change similarity
    const eventCvr = eventDay.conversion_rate;
    const candCvr = candidate.conversion_rate;
    const cvrSim = eventCvr > 0 && candCvr > 0
      ? 1 - Math.min(Math.abs(eventCvr - candCvr) / Math.max(eventCvr, candCvr), 1)
      : 0.5;

    const similarity = residualSim * 0.5 + visitorSim * 0.25 + cvrSim * 0.25;

    if (similarity < minSimilarity) continue;

    // Check if recovered
    let recovered = false;
    let recoveryDays: number | null = null;
    const preEventGmv = candidate.gmv;
    for (let r = 1; r <= recoveryWindow; r++) {
      const recoveryIdx = idx + r;
      if (recoveryIdx >= daily.length) break;
      const recoveryDay = daily[recoveryIdx]!;
      if (recoveryDay.gmv >= preEventGmv * 0.9) {
        recovered = true;
        recoveryDays = r;
        break;
      }
    }

    scored.push({
      date: candidate.date,
      residual: candidateSnap.residual,
      similarity_score: Math.round(similarity * 100) / 100,
      recovered,
      recovery_days: recoveryDays,
    });
  }

  // Sort by similarity descending, return top N
  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  return scored.slice(0, maxEvents);
};

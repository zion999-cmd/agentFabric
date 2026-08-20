// P0007.1.1 Signal Pattern Engine (Baseline-first)
// Orchestrates: load signals → build daily metrics → compute baseline → detect patterns.
// Baseline answers "what's normal?" — pattern detection answers "what changed?"

import type { Database as Db } from 'better-sqlite3';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { computeBaseline } from './baseline.js';
import type { DailyMetric, BaselineResult } from './baseline.js';
import { explainEvent } from './explanation.js';
import type { Explanation } from './explanation.js';

import type { PatternEvent } from './types.js';

export type { BaselineSnapshot, BaselineResult } from './baseline.js';
export type { Explanation, MetricEvidence, SimilarEvent } from './explanation.js';

/** Explain detected patterns — why did this happen? (P0007.1.2) */
export const explainPatterns = (
  db: Db,
  options: { entityId?: string; entityType?: string; date?: string; limit?: number } = {},
): Explanation[] => {
  const { entityId = 'jd_shop_001', entityType = 'product', date, limit = 10 } = options;
  const daily = buildDailyMetrics(db, entityType, entityId);
  const baseline = computeBaseline(daily);
  const results: Explanation[] = [];

  // If specific date requested, explain that day only
  if (date) {
    const snap = baseline.snapshots.find((s) => s.date === date);
    if (!snap || Math.abs(snap.residual) < 0.15) return [];
    const eventType = snap.residual < 0 ? 'gmv_drop' : 'gmv_spike';
    const explanation = explainEvent(date, eventType, daily);
    if (explanation) results.push(explanation);
    return results;
  }

  // Otherwise explain top anomalies
  const significantSnaps = baseline.snapshots
    .filter((s) => Math.abs(s.residual) > 0.25)
    .sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual))
    .slice(0, limit);

  for (const snap of significantSnaps) {
    const eventType = snap.residual < 0 ? 'gmv_drop' : 'gmv_spike';
    const explanation = explainEvent(snap.date, eventType, daily);
    if (explanation) results.push(explanation);
    if (results.length >= limit) break;
  }

  return results;
};

// ---- Public API ----

export interface AnalyzeBaselineOptions {
  entityId?: string;
  entityType?: string;
}

/**
 * Compute the operational baseline for an entity.
 * Returns daily snapshots with expected vs actual, season model, and summary.
 */
export const analyzeBaseline = (
  db: Db,
  options: AnalyzeBaselineOptions = {},
): BaselineResult => {
  const { entityId = 'jd_shop_001', entityType = 'product' } = options;
  const daily = buildDailyMetrics(db, entityType, entityId);
  return computeBaseline(daily);
};

/**
 * Detect pattern events on top of a computed baseline.
 * Only fires when residual exceeds thresholds — season-adjusted.
 */
export const analyzePatterns = (
  db: Db,
  options: { entityId?: string; entityType?: string; limit?: number } = {},
): { baseline: BaselineResult; events: PatternEvent[] } => {
  const { entityId = 'jd_shop_001', entityType = 'product', limit = 20 } = options;
  const baseline = analyzeBaseline(db, { entityId, entityType });

  // Simple event detection on residuals (baseline-aware)
  const events: PatternEvent[] = [];
  for (const snap of baseline.snapshots) {
    const absResidual = Math.abs(snap.residual);
    if (absResidual < 0.25) continue; // Below threshold

    const isDrop = snap.residual < 0;
    events.push({
      event_id: `${snap.date}-${isDrop ? 'drop' : 'spike'}`,
      event_type: isDrop ? 'gmv_drop' : 'gmv_spike',
      severity: absResidual > 0.6 ? 'critical' : absResidual > 0.4 ? 'high' : 'medium',
      observed_at: snap.date,
      description: isDrop
        ? `GMV ¥${snap.actual_value.toFixed(0)} vs expected ¥${snap.expected_value.toFixed(0)} (${(snap.residual * 100).toFixed(0)}%)`
        : `GMV spike ¥${snap.actual_value.toFixed(0)} vs expected ¥${snap.expected_value.toFixed(0)} (+${(snap.residual * 100).toFixed(0)}%)`,
      metrics_snapshot: { gmv: snap.actual_value },
      signals_involved: ['daily_summary'],
      baseline: {
        gmv_7d_avg: snap.trend_30d,
        gmv_30d_avg: snap.expected_value / snap.season_factor,
        deviation_pct: snap.residual,
      },
      possible_causes: [],
      confidence: snap.confidence,
    });
  }

  // Sort by severity, limit
  const severityRank = (s: string) => s === 'critical' ? 4 : s === 'high' ? 3 : s === 'medium' ? 2 : 1;
  events.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.observed_at.localeCompare(a.observed_at));

  return { baseline, events: events.slice(0, limit) };
};

// ---- Internal: build daily metrics from signals ----

const buildDailyMetrics = (db: Db, entityType: string, entityId: string): DailyMetric[] => {
  const allSignals = SignalFacade.list(db, entityType, entityId);

  const dailyMap = new Map<string, {
    gmv: number;
    orders: number;
    visitors: number;
    conversion_rate: number;
    hourly_traffic_count: number;
  }>();

  for (const s of allSignals) {
    const date = s.observed_at?.slice(0, 10);
    if (!date) continue;

    let entry = dailyMap.get(date);
    if (!entry) {
      entry = { gmv: 0, orders: 0, visitors: 0, conversion_rate: 0, hourly_traffic_count: 0 };
      dailyMap.set(date, entry);
    }

    if (s.signal_name === 'daily_summary') {
      entry.gmv = s.signal_value;
      // P0007.1.3: extract metrics sub-fields for multi-factor attribution
      const m = (s as Record<string, unknown>).metrics as Record<string, number> | undefined;
      if (m) {
        if (m.orders !== undefined) entry.orders = m.orders;
        if (m.uv !== undefined) entry.visitors = m.uv;
        if (m.cvr !== undefined) entry.conversion_rate = m.cvr;
      }
    } else if (s.signal_name === 'hourly_traffic') {
      entry.hourly_traffic_count++;
    }
  }

  return [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, metrics]) => ({ date, ...metrics }));
};

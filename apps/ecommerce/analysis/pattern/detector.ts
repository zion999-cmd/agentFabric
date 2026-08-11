// P0007.1 Signal Pattern Detector
// Analyzes signal time-series for operational patterns:
//   - GMV drops/spikes vs 7d/30d baseline
//   - Traffic anomalies (hourly_traffic volume)
//   - Conversion shifts
//   - Seasonal peaks/troughs (monthly comparison)
//   - WoW volatility breaks
//
// Statistical approach: deviation from rolling averages, not ML.
// Business-first: every detection traces to specific signal + date.

import { uuid } from '#shared/utils/crypto.js';
import type {
  PatternEvent,
  PatternEventType,
  PatternSeverity,
  PatternDetectionConfig,
  CauseCandidate,
} from './types.js';

// ---- Internal Types ----

interface DailyMetrics {
  date: string;
  gmv: number;
  orders: number;
  visitors: number;
  conversion_rate: number;
  hourly_traffic_count: number;
}

// ---- Default Config ----

const defaultConfig = (): Required<PatternDetectionConfig> => ({
  gmv_drop_threshold: 0.3,
  gmv_spike_threshold: 0.5,
  min_baseline_days: 7,
  baseline_window: 30,
  max_events: 20,
});

// ---- Detector ----

/**
 * Detect operational patterns from daily metrics + hourly traffic signals.
 *
 * @param dailyMetrics - Array of daily_summary metrics, sorted by date ascending
 * @param config - Detection thresholds
 * @returns Detected pattern events, sorted by severity
 */
export const detectPatterns = (
  dailyMetrics: DailyMetrics[],
  config?: PatternDetectionConfig,
): PatternEvent[] => {
  const cfg = { ...defaultConfig(), ...(config ?? {}) };
  const events: PatternEvent[] = [];

  if (dailyMetrics.length < cfg.min_baseline_days) return events;

  // Scan each day (after baseline window) for patterns
  for (let i = cfg.baseline_window; i < dailyMetrics.length; i++) {
    const current = dailyMetrics[i]!;

    // Compute rolling baselines
    const window7d = dailyMetrics.slice(Math.max(0, i - 7), i);
    const window30d = dailyMetrics.slice(Math.max(0, i - 30), i);

    const avg7d = average(window7d.map((d) => d.gmv));
    const avg30d = average(window30d.map((d) => d.gmv));

    if (avg30d <= 0) continue;

    const deviation = (current.gmv - avg30d) / avg30d;

    // GMV Drop detection
    if (deviation < -cfg.gmv_drop_threshold) {
      const causes = analyzeCauses(current, window7d, window30d, 'drop');
      events.push(buildEvent('gmv_drop', current, avg7d, avg30d, deviation, causes));
    }

    // GMV Spike detection
    if (deviation > cfg.gmv_spike_threshold) {
      const causes = analyzeCauses(current, window7d, window30d, 'spike');
      events.push(buildEvent('gmv_spike', current, avg7d, avg30d, deviation, causes));
    }

    // Traffic anomaly (hourly_traffic count vs 7d avg)
    const traffic7dAvg = average(window7d.map((d) => d.hourly_traffic_count));
    if (traffic7dAvg > 0) {
      const trafficDeviation = (current.hourly_traffic_count - traffic7dAvg) / traffic7dAvg;
      if (trafficDeviation < -0.3) {
        events.push(
          buildEvent('traffic_decline', current, avg7d, avg30d, trafficDeviation, [
            { reason: 'traffic_source_loss', confidence: 0.7, evidence: [`hourly_traffic: ${current.hourly_traffic_count} vs 7d avg: ${traffic7dAvg.toFixed(0)}`] },
          ]),
        );
      }
      if (trafficDeviation > 0.5) {
        events.push(
          buildEvent('traffic_surge', current, avg7d, avg30d, trafficDeviation, [
            { reason: 'traffic_acquisition_anomaly', confidence: 0.6, evidence: [`hourly_traffic spike: +${(trafficDeviation * 100).toFixed(0)}%`] },
          ]),
        );
      }
    }

    // Conversion shift
    const conv7dAvg = average(window7d.map((d) => d.conversion_rate));
    if (conv7dAvg > 0) {
      const convChange = (current.conversion_rate - conv7dAvg) / conv7dAvg;
      if (Math.abs(convChange) > 0.3) {
        events.push(
          buildEvent('conversion_shift', current, avg7d, avg30d, convChange, [
            { reason: convChange < 0 ? 'conversion_drop' : 'conversion_improvement',
              confidence: 0.65,
              evidence: [`conversion_rate: ${(current.conversion_rate * 100).toFixed(1)}% vs 7d avg: ${(conv7dAvg * 100).toFixed(1)}%`] },
          ]),
        );
      }
    }
  }

  // Seasonal patterns (month-over-month comparison)
  detectSeasonalPatterns(dailyMetrics, events);

  // Deduplicate by type+date, keep highest severity
  const deduped = deduplicateEvents(events);

  // Sort by severity then by date desc
  deduped.sort(compareSeverity);

  return deduped.slice(0, cfg.max_events);
};

// ---- Cause Analysis ----

const analyzeCauses = (
  current: DailyMetrics,
  window7d: DailyMetrics[],
  _window30d: DailyMetrics[],
  direction: 'drop' | 'spike',
): CauseCandidate[] => {
  const causes: CauseCandidate[] = [];

  const avg7dVisitors = average(window7d.map((d) => d.visitors));
  const avg7dOrders = average(window7d.map((d) => d.orders));
  const avg7dConv = average(window7d.map((d) => d.conversion_rate));

  // Traffic-driven?
  const visitorChange = avg7dVisitors > 0 ? (current.visitors - avg7dVisitors) / avg7dVisitors : 0;
  if (direction === 'drop' && visitorChange < -0.15) {
    causes.push({ reason: 'traffic_loss', confidence: 0.8, evidence: [`visitors: ${current.visitors} vs 7d avg: ${avg7dVisitors.toFixed(0)} (${(visitorChange*100).toFixed(0)}%)`] });
  }
  if (direction === 'spike' && visitorChange > 0.15) {
    causes.push({ reason: 'traffic_surge', confidence: 0.8, evidence: [`visitors: ${current.visitors} vs 7d avg: ${avg7dVisitors.toFixed(0)} (+${(visitorChange*100).toFixed(0)}%)`] });
  }

  // Conversion-driven?
  const convChange = avg7dConv > 0 ? (current.conversion_rate - avg7dConv) / avg7dConv : 0;
  if (direction === 'drop' && convChange < -0.1) {
    causes.push({ reason: 'conversion_decline', confidence: 0.75, evidence: [`cvr: ${(current.conversion_rate*100).toFixed(1)}% vs 7d avg: ${(avg7dConv*100).toFixed(1)}%`] });
  }
  if (direction === 'spike' && convChange > 0.1) {
    causes.push({ reason: 'conversion_improvement', confidence: 0.7, evidence: [`cvr improved +${(convChange*100).toFixed(0)}%`] });
  }

  // Volume-driven (orders change)
  const orderChange = avg7dOrders > 0 ? (current.orders - avg7dOrders) / avg7dOrders : 0;
  if (Math.abs(orderChange) > 0.2) {
    causes.push({
      reason: direction === 'drop' ? 'order_volume_drop' : 'order_volume_surge',
      confidence: 0.7,
      evidence: [`orders: ${current.orders} vs 7d avg: ${avg7dOrders.toFixed(0)} (${(orderChange*100).toFixed(0)}%)`],
    });
  }

  // Default fallback
  if (causes.length === 0) {
    causes.push({ reason: 'multi_factor_change', confidence: 0.5, evidence: ['no single factor explains >threshold deviation'] });
  }

  return causes;
};

// ---- Seasonal Detection ----

const detectSeasonalPatterns = (
  dailyMetrics: DailyMetrics[],
  events: PatternEvent[],
): void => {
  if (dailyMetrics.length < 60) return; // Need at least 2 months

  // Group by month
  const byMonth = new Map<string, number[]>();
  for (const d of dailyMetrics) {
    const month = d.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(d.gmv);
  }

  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (months.length < 2) return;

  // Compare each month to previous
  for (let i = 1; i < months.length; i++) {
    const [, prevVals] = months[i - 1]!;
    const [currMonth, currVals] = months[i]!;

    const prevAvg = average(prevVals);
    const currAvg = average(currVals);

    if (prevAvg <= 0) continue;

    const change = (currAvg - prevAvg) / prevAvg;

    const firstDayOfMonth = dailyMetrics.find((d) => d.date.startsWith(currMonth));
    if (!firstDayOfMonth) continue;

    if (change < -0.3) {
      events.push({
        event_id: uuid(),
        event_type: 'seasonal_trough',
        severity: 'medium',
        observed_at: firstDayOfMonth.date,
        description: `Monthly GMV declined ${Math.abs(change * 100).toFixed(0)}% vs previous month (¥${prevAvg.toFixed(0)} → ¥${currAvg.toFixed(0)})`,
        metrics_snapshot: { gmv: currAvg },
        signals_involved: ['daily_summary'],
        baseline: { gmv_7d_avg: currAvg, gmv_30d_avg: prevAvg, deviation_pct: change },
        possible_causes: [
          { reason: 'seasonal_demand_shift', confidence: 0.6, evidence: [`MoM decline: ${(change*100).toFixed(0)}%`, `prev month avg: ¥${prevAvg.toFixed(0)}`] },
        ],
        confidence: 0.6,
      });
    }

    if (change > 0.3) {
      events.push({
        event_id: uuid(),
        event_type: 'seasonal_peak',
        severity: 'low',
        observed_at: firstDayOfMonth.date,
        description: `Monthly GMV increased ${(change * 100).toFixed(0)}% vs previous month`,
        metrics_snapshot: { gmv: currAvg },
        signals_involved: ['daily_summary'],
        baseline: { gmv_7d_avg: currAvg, gmv_30d_avg: prevAvg, deviation_pct: change },
        possible_causes: [
          { reason: 'seasonal_demand_peak', confidence: 0.5, evidence: [`MoM growth: +${(change*100).toFixed(0)}%`] },
        ],
        confidence: 0.5,
      });
    }
  }
};

// ---- Helpers ----

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const buildEvent = (
  type: PatternEventType,
  current: DailyMetrics,
  avg7d: number,
  avg30d: number,
  deviation: number,
  causes: CauseCandidate[],
): PatternEvent => ({
  event_id: uuid(),
  event_type: type,
  severity: severityFromDeviation(deviation),
  observed_at: current.date,
  description: formatDescription(type, current, avg30d, deviation),
  metrics_snapshot: {
    gmv: current.gmv,
    orders: current.orders,
    visitors: current.visitors,
    conversion_rate: current.conversion_rate,
  },
  signals_involved: deriveSignals(type),
  baseline: {
    gmv_7d_avg: avg7d,
    gmv_30d_avg: avg30d,
    deviation_pct: deviation,
  },
  possible_causes: causes,
  confidence: aggregateConfidence(causes),
});

const severityFromDeviation = (d: number): PatternSeverity => {
  const abs = Math.abs(d);
  if (abs > 0.6) return 'critical';
  if (abs > 0.4) return 'high';
  if (abs > 0.2) return 'medium';
  return 'low';
};

const formatDescription = (
  type: PatternEventType,
  current: DailyMetrics,
  avg30d: number,
  deviation: number,
): string => {
  const pct = (Math.abs(deviation) * 100).toFixed(0);
  const dir = deviation < 0 ? '↓' : '↑';
  switch (type) {
    case 'gmv_drop': return `GMV dropped ${pct}% ${dir} vs 30d avg (¥${avg30d.toFixed(0)} → ¥${current.gmv.toFixed(0)})`;
    case 'gmv_spike': return `GMV spiked ${pct}% ${dir} vs 30d avg (¥${avg30d.toFixed(0)} → ¥${current.gmv.toFixed(0)})`;
    case 'traffic_decline': return `Traffic declined ${pct}% — hourly signals dropped to ${current.hourly_traffic_count}`;
    case 'traffic_surge': return `Traffic surged ${pct}% — ${current.hourly_traffic_count} hourly signals`;
    case 'conversion_shift': return `Conversion rate shifted ${pct}% ${dir}`;
    default: return `${type}: ${pct}% deviation`;
  }
};

const deriveSignals = (type: PatternEventType): string[] => {
  switch (type) {
    case 'gmv_drop':
    case 'gmv_spike': return ['daily_summary', 'hourly_traffic'];
    case 'traffic_decline':
    case 'traffic_surge': return ['hourly_traffic'];
    case 'conversion_shift': return ['daily_summary'];
    default: return ['daily_summary'];
  }
};

const aggregateConfidence = (causes: CauseCandidate[]): number => {
  if (causes.length === 0) return 0.5;
  // Weighted: top cause has more weight
  const topConf = causes[0]!.confidence;
  const avgRest = causes.length > 1 ? average(causes.slice(1).map((c) => c.confidence)) : topConf;
  return topConf * 0.7 + avgRest * 0.3;
};

const deduplicateEvents = (events: PatternEvent[]): PatternEvent[] => {
  const seen = new Map<string, PatternEvent>();
  for (const e of events) {
    const key = `${e.event_type}:${e.observed_at}`;
    const existing = seen.get(key);
    if (!existing || severityRank(e.severity) > severityRank(existing.severity)) {
      seen.set(key, e);
    }
  }
  return [...seen.values()];
};

const severityRank = (s: PatternSeverity): number => {
  switch (s) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
  }
};

const compareSeverity = (a: PatternEvent, b: PatternEvent): number => {
  const rankDiff = severityRank(b.severity) - severityRank(a.severity);
  if (rankDiff !== 0) return rankDiff;
  return b.observed_at.localeCompare(a.observed_at);
};

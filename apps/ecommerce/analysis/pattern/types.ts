// P0007.1 Signal Pattern Engine — Types
// Detects operational patterns in signal time-series:
//   GMV drops/spikes, traffic anomalies, conversion shifts, seasonal patterns.
// Output: events with severity, involved signals, possible causes, confidence.

import { z } from 'zod';

// ---- Event Types ----

export const PatternEventTypeSchema = z.enum([
  'gmv_drop',
  'gmv_spike',
  'traffic_decline',
  'traffic_surge',
  'conversion_shift',
  'seasonal_peak',
  'seasonal_trough',
  'volatility_break',
]);
export type PatternEventType = z.infer<typeof PatternEventTypeSchema>;

export const PatternSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type PatternSeverity = z.infer<typeof PatternSeveritySchema>;

// ---- Cause Candidate ----

export const CauseCandidateSchema = z.object({
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
});
export type CauseCandidate = z.infer<typeof CauseCandidateSchema>;

// ---- Pattern Event ----

export const PatternEventSchema = z.object({
  event_id: z.string(),
  event_type: PatternEventTypeSchema,
  severity: PatternSeveritySchema,
  observed_at: z.string(), // date of the event
  description: z.string(),
  metrics_snapshot: z.object({
    gmv: z.number(),
    orders: z.number().optional(),
    visitors: z.number().optional(),
    conversion_rate: z.number().optional(),
  }),
  signals_involved: z.array(z.string()), // signal_names
  baseline: z.object({
    gmv_7d_avg: z.number(),
    gmv_30d_avg: z.number(),
    deviation_pct: z.number(),
  }),
  possible_causes: z.array(CauseCandidateSchema),
  confidence: z.number().min(0).max(1),
});
export type PatternEvent = z.infer<typeof PatternEventSchema>;

// ---- Detection Config ----

export const PatternDetectionConfigSchema = z.object({
  /** Threshold for GMV drop detection (fraction of 30d average) */
  gmv_drop_threshold: z.number().min(0).max(1).default(0.3),
  /** Threshold for GMV spike detection */
  gmv_spike_threshold: z.number().min(0).default(0.5),
  /** Minimum data points for baseline calculation */
  min_baseline_days: z.number().int().min(1).default(7),
  /** Lookback window for baseline (days) */
  baseline_window: z.number().int().min(7).default(30),
  /** Max events to return */
  max_events: z.number().int().min(1).default(20),
});
export type PatternDetectionConfig = z.infer<typeof PatternDetectionConfigSchema>;

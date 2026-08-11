// Signal domain schemas — the atomic unit of business intelligence.
// A Signal wraps any business metric into an explainable, lifecycle-managed record.

import { z } from 'zod';
import { IsoDateString, SignalLifecycleSchema, SignalSourceSchema, SignalTraceSchema } from './common.js';

export const SignalEntityTypeSchema = z.enum(['product', 'category', 'keyword', 'market']);
export type SignalEntityType = z.infer<typeof SignalEntityTypeSchema>;

export const SignalDirectionSchema = z.enum(['up', 'down', 'flat']);
export type SignalDirection = z.infer<typeof SignalDirectionSchema>;

export const SignalUnitSchema = z.enum(['ratio', 'score', 'currency', 'count', 'boolean']);
export type SignalUnit = z.infer<typeof SignalUnitSchema>;

/** The canonical product-level computed signal. */
export const SignalSchema = z.object({
  signal_id: z.string().min(1),
  entity_type: SignalEntityTypeSchema,
  entity_id: z.string().min(1),
  signal_name: z.string().min(1),
  signal_value: z.number(),
  signal_unit: SignalUnitSchema,
  signal_direction: SignalDirectionSchema,
  weight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  source: SignalSourceSchema,
  window: z.string().min(1), // '3d' | '7d' | '14d' | '1h' | '24h' | 'campaign_duration' | 'event'
  /** Business observation time — the moment this measurement was taken. P0006.1.1 */
  observed_at: IsoDateString,
  lifecycle: SignalLifecycleSchema,
  trace: SignalTraceSchema,
});

export type Signal = z.infer<typeof SignalSchema>;

// ---- Enterprise (platform-collected) signal layer ----

export const SignalSourcePlatformSchema = z.enum(['jd', 'tmall', 'shopify', 'douyin', 'pdd']);
export type SignalSourcePlatform = z.infer<typeof SignalSourcePlatformSchema>;

export const EnterpriseSignalTypeSchema = z.enum([
  'hourly_sales',
  'hourly_traffic',
  'daily_summary',
  'campaign_performance',
  'anomaly_alert',
]);
export type EnterpriseSignalType = z.infer<typeof EnterpriseSignalTypeSchema>;

/** Canonical metric bundle shared across all platforms. */
export const EnterpriseSignalPayloadSchema = z
  .object({
    gmv: z.number().optional(),
    orders: z.number().optional(),
    refunds: z.number().optional(),
    roi: z.number().optional(),
    uv: z.number().optional(),
    click_rate: z.number().optional(),
    cart_adds: z.number().optional(),
    ad_spend: z.number().optional(),
    ad_orders: z.number().optional(),
    cpa: z.number().optional(),
    cpc: z.number().optional(),
    ctr: z.number().optional(),
    cvr: z.number().optional(),
    impressions: z.number().optional(),
    clicks: z.number().optional(),
  })
  .catchall(z.number());

export type EnterpriseSignalPayload = z.infer<typeof EnterpriseSignalPayloadSchema>;

/** The collector output contract — emitted to stdout by every platform adapter. */
export const SignalCollectorInputSchema = z.object({
  signal_id: z.string().min(1),
  source: SignalSourcePlatformSchema,
  shop_id: z.string().min(1),
  shop_name: z.string().optional(),
  signal_type: EnterpriseSignalTypeSchema,
  priority: z.number().min(0).max(1).default(0.5),
  timestamp: IsoDateString,
  metrics: EnterpriseSignalPayloadSchema,
  raw_payload: z.record(z.string(), z.unknown()).optional(),
  trace_id: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
});

export type SignalCollectorInput = z.infer<typeof SignalCollectorInputSchema>;

/** An enterprise signal is a Signal extended with the full metric bundle. */
export const EnterpriseSignalSchema = SignalSchema.extend({
  metrics: EnterpriseSignalPayloadSchema,
  raw_payload: z.record(z.string(), z.unknown()).optional(),
  collector_trace_id: z.string().optional(),
});

export type EnterpriseSignal = z.infer<typeof EnterpriseSignalSchema>;

/** Hourly time-bucket snapshot (trend substrate). */
export const HourlySnapshotSchema = z.object({
  snapshot_id: z.string().min(1),
  source: z.string().min(1),
  shop_id: z.string().min(1),
  hour: IsoDateString,
  signal_count: z.number().int().nonnegative(),
  signals: z.array(EnterpriseSignalSchema),
  created_at: IsoDateString,
});

export type HourlySnapshot = z.infer<typeof HourlySnapshotSchema>;

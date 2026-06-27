// Trace domain schemas — 4-layer business explainability.

import { z } from 'zod';
import { IsoDateString } from './common.js';
import { ComponentScoresSchema } from './ranking.js';

export const SignalTraceEntrySchema = z.object({
  signal_id: z.string(),
  signal_name: z.string(),
  signal_value: z.number(),
  signal_direction: z.enum(['up', 'down', 'flat']),
  confidence: z.number(),
  lifecycle_status: z.enum(['active', 'stale', 'deprecated']),
  impact: z.number(), // signed contribution to ranking
});
export type SignalTraceEntry = z.infer<typeof SignalTraceEntrySchema>;

export const RankingTraceEntrySchema = z.object({
  ranking_id: z.string(),
  entity_id: z.string(),
  overall_score: z.number(),
  component_scores: ComponentScoresSchema,
  top_signals: z.array(z.object({ signal_name: z.string(), impact: z.number() })),
  rank: z.number().int().positive(),
  confidence: z.number(),
});
export type RankingTraceEntry = z.infer<typeof RankingTraceEntrySchema>;

export const MemoryTraceEntrySchema = z.object({
  memory_id: z.string(),
  memory_type: z.string(),
  statement: z.string(),
  support_rate: z.number(),
  sample_size: z.number(),
  validation_state: z.enum(['pending', 'validated', 'rejected']),
  applied_count: z.number().int().nonnegative(),
  last_applied_at: IsoDateString.optional(),
});
export type MemoryTraceEntry = z.infer<typeof MemoryTraceEntrySchema>;

export const ReplayConsistencySchema = z.object({
  days_present: z.number().int().nonnegative(),
  avg_rank: z.number(),
  rank_volatility: z.number(),
  top1_count: z.number().int().nonnegative(),
});
export type ReplayConsistency = z.infer<typeof ReplayConsistencySchema>;

export const SystemTruthSchema = z.object({
  ranking: RankingTraceEntrySchema.nullable(),
  signals: z.array(SignalTraceEntrySchema),
  memories: z.array(MemoryTraceEntrySchema),
  replay_consistency: ReplayConsistencySchema,
});
export type SystemTruth = z.infer<typeof SystemTruthSchema>;

export const AlignmentSchema = z.object({
  is_supported: z.boolean(),
  evidence_count: z.number().int().nonnegative(),
  contradictions: z.array(z.string()),
  trust_score: z.number().min(0).max(1),
});
export type Alignment = z.infer<typeof AlignmentSchema>;

export const BusinessConclusionSchema = z.object({
  entity_id: z.string(),
  entity_name: z.string(),
  statement: z.string(),
  profile: z.string(),
  date: IsoDateString,
});
export type BusinessConclusion = z.infer<typeof BusinessConclusionSchema>;

export const BusinessConclusionTraceSchema = z.object({
  trace_id: z.string(),
  conclusion: BusinessConclusionSchema,
  system_truth: SystemTruthSchema,
  alignment: AlignmentSchema,
  created_at: IsoDateString,
});
export type BusinessConclusionTrace = z.infer<typeof BusinessConclusionTraceSchema>;

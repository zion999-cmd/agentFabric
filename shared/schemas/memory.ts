// Business memory schemas — validated-only enterprise memory (NOT runtime memory).

import { z } from 'zod';
import { IsoDateString } from './common.js';
import { RankingMemoryAdjustmentSchema } from './ranking.js';

export const ContextMemoryTypeSchema = z.enum([
  'signal_reliability',
  'ranking_override_pattern',
  'product_risk_pattern',
  'reviewer_preference_pattern',
]);
export type ContextMemoryType = z.infer<typeof ContextMemoryTypeSchema>;

export const ContextMemoryStatusSchema = z.enum(['active', 'stale', 'deprecated']);
export type ContextMemoryStatus = z.infer<typeof ContextMemoryStatusSchema>;

export const ContextMemoryValidationStateSchema = z.enum(['pending', 'validated', 'rejected']);
export type ContextMemoryValidationState = z.infer<typeof ContextMemoryValidationStateSchema>;

export const MemoryScopeSchema = z.object({
  entity_type: z.enum(['product', 'category', 'signal', 'ranking_rule', 'workflow']),
  entity_ids: z.array(z.string()),
  task_type: z.enum(['agent_run', 'workflow_run']).optional(),
  agent_id: z.string().optional(),
});
export type MemoryScope = z.infer<typeof MemoryScopeSchema>;

export const MemoryEvidenceSchema = z.object({
  sample_size: z.number().int().nonnegative(),
  support_rate: z.number().min(0).max(1),
  counter_rate: z.number().min(0).max(1),
  sources: z.array(z.string()),
});
export type MemoryEvidence = z.infer<typeof MemoryEvidenceSchema>;

export const MemoryWeightSchema = z.object({
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
  final_score: z.number().min(0).max(1),
});
export type MemoryWeight = z.infer<typeof MemoryWeightSchema>;

export const MemoryTemporalSchema = z.object({
  first_seen_at: IsoDateString,
  last_seen_at: IsoDateString,
  half_life_days: z.number().positive(),
  expires_at: IsoDateString,
});
export type MemoryTemporal = z.infer<typeof MemoryTemporalSchema>;

export const MemoryValidationSchema = z.object({
  state: ContextMemoryValidationStateSchema,
  validator: z.enum(['human', 'rule']).optional(),
  validated_at: IsoDateString.optional(),
  notes: z.string().optional(),
});
export type MemoryValidation = z.infer<typeof MemoryValidationSchema>;

export const MemoryOverrideSchema = z.object({
  is_overridden: z.boolean(),
  override_reason: z.string().optional(),
  overridden_by: z.string().optional(),
  overridden_at: IsoDateString.optional(),
});
export type MemoryOverride = z.infer<typeof MemoryOverrideSchema>;

export const MemoryTraceSchema = z.object({
  source_review_ids: z.array(z.string()),
  extraction_run_id: z.string(),
});
export type MemoryTrace = z.infer<typeof MemoryTraceSchema>;

export const ContextMemorySchema = z.object({
  memory_id: z.string(),
  memory_type: ContextMemoryTypeSchema,
  scope: MemoryScopeSchema,
  statement: z.string(),
  evidence: MemoryEvidenceSchema,
  weight: MemoryWeightSchema,
  temporal: MemoryTemporalSchema,
  status: ContextMemoryStatusSchema,
  validation: MemoryValidationSchema,
  override: MemoryOverrideSchema,
  trace: MemoryTraceSchema,
  /** The structured ranking adjustment this memory implies (stored, not re-parsed). */
  adjustment: RankingMemoryAdjustmentSchema.optional(),
  created_at: IsoDateString,
});
export type ContextMemory = z.infer<typeof ContextMemorySchema>;

/** A pattern extracted from reviews: condition -> lesson -> adjustment. */
export const MemoryPatternSchema = z.object({
  condition: z.object({
    signal_name: z.string(),
    threshold: z.number(),
    direction: z.enum(['above', 'below']),
  }),
  correlated_condition: z
    .object({
      signal_name: z.string(),
      threshold: z.number(),
      direction: z.enum(['above', 'below']),
    })
    .optional(),
  lesson: z.string(),
  adjustment: z.object({
    target_signal: z.string(),
    action: z.enum([
      'decrease_confidence',
      'increase_confidence',
      'cap_score',
      'boost_score',
    ]),
    magnitude: z.number().min(0).max(1),
  }),
  support_count: z.number().int().nonnegative(),
  total_related: z.number().int().nonnegative(),
});
export type MemoryPattern = z.infer<typeof MemoryPatternSchema>;

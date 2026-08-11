// P0007.3.0 Memory Contract
// Frozen interface for OperatorMemory — the bridge between
// agentFabric's pattern analysis and Hermes' decision execution.
//
// Boundaries:
//   agentFabric: creates, stores, matches, retrieves memories
//   CBP: transports context (agnostic to content)
//   Hermes: receives operator_context, decides action
//
// Not a generic memory system. Not vector DB. Not embedding.
// Purpose-built for: "given this event, what does the shop's history tell us?"

import { z } from 'zod';

// ---- Memory Category ----

export const MemoryCategorySchema = z.enum([
  'traffic_driven_drop',
  'conversion_driven_drop',
  'volume_driven_spike',
  'seasonal_pattern',
  'recovery_pattern',
]);
export type MemoryCategory = z.infer<typeof MemoryCategorySchema>;

// ---- Trigger Signature ----

export const TriggerSignatureSchema = z.object({
  primary_driver: z.string(),
  direction: z.enum(['up', 'down']),
  season: z.string().optional(),
});
export type TriggerSignature = z.infer<typeof TriggerSignatureSchema>;

// ---- Operator Memory ----

export const OperatorMemorySchema = z.object({
  memory_id: z.string().min(1),
  category: MemoryCategorySchema,
  trigger_signature: TriggerSignatureSchema,
  pattern_description: z.string(),
  statistics: z.object({
    observations: z.number().int().positive(),
    recovery_count: z.number().int().nonnegative(),
    recovery_probability: z.number().min(0).max(1),
    avg_recovery_days: z.number().nonnegative(),
  }),
  primary_driver: z.string(),
  driver_confidence: z.number().min(0).max(1),
  memory_confidence: z.number().min(0).max(1),
  last_observed_at: z.string(),
  created_at: z.string(),
});
export type OperatorMemory = z.infer<typeof OperatorMemorySchema>;

// ---- Memory Match Result ----

export const MemoryMatchSchema = z.object({
  memory: OperatorMemorySchema,
  similarity_score: z.number().min(0).max(1),
  match_reason: z.string(),
});
export type MemoryMatch = z.infer<typeof MemoryMatchSchema>;

// ---- Operator Context (for Hermes) ----

export const OperatorContextSchema = z.object({
  type: z.literal('operator_context'),
  event: z.object({
    date: z.string(),
    pattern: z.string(),
    severity: z.string(),
  }),
  current_metrics: z.object({
    gmv: z.number(),
    orders: z.number().optional(),
    visitors: z.number().optional(),
    conversion_rate: z.number().optional(),
  }),
  matched_memories: z.array(MemoryMatchSchema),
  recommendation: z.string().optional(),
});
export type OperatorContext = z.infer<typeof OperatorContextSchema>;

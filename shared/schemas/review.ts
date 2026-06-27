// Review domain schemas — human review, feedback, knowledge.

import { z } from 'zod';
import { IsoDateString } from './common.js';
import { RankingProfileNameSchema } from './ranking.js';

export const ReviewDomainSchema = z.enum(['ranking', 'signal', 'skill', 'memory']);
export type ReviewDomain = z.infer<typeof ReviewDomainSchema>;

export const ReviewActionSchema = z.enum(['approve', 'reject', 'modify']);
export type ReviewAction = z.infer<typeof ReviewActionSchema>;

export const ReviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'modified']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

/** The 10-value retail risk vocabulary — the crown jewel of the review domain. */
export const RankingReviewReasonCategorySchema = z.enum([
  'inventory_concern',
  'promotion_ending',
  'creator_drop',
  'seasonal_fluctuation',
  'market_trend_shift',
  'pricing_issue',
  'data_quality_doubt',
  'growth_legitimate',
  'manual_override',
  'other',
]);
export type RankingReviewReasonCategory = z.infer<typeof RankingReviewReasonCategorySchema>;

export const ReviewEventSchema = z.object({
  review_id: z.string(),
  domain: ReviewDomainSchema,
  agent_id: z.string().optional(),
  profile: RankingProfileNameSchema.optional(),
  entity_id: z.string(),
  agent_rank: z.number().int().nonnegative().optional(),
  ground_truth_rank: z.number().int().nonnegative().optional(),
  action: ReviewActionSchema,
  reason: z.string(),
  reason_category: RankingReviewReasonCategorySchema.optional(),
  reviewer: z.string(),
  signal_snapshot: z.record(z.string(), z.number()).optional(),
  explainability_ref: z.string().optional(),
  status: ReviewStatusSchema.default('pending'),
  final_decision: z.record(z.string(), z.unknown()).optional(),
  created_at: IsoDateString,
  reviewed_at: IsoDateString.optional(),
});
export type ReviewEvent = z.infer<typeof ReviewEventSchema>;

export const FeedbackAttributionWindowSchema = z.enum(['3d', '7d', '14d']);
export type FeedbackAttributionWindow = z.infer<typeof FeedbackAttributionWindowSchema>;

export const SignalUsefulnessLabelSchema = z.enum(['useful', 'mixed', 'not_useful']);
export type SignalUsefulnessLabel = z.infer<typeof SignalUsefulnessLabelSchema>;

export const FeedbackSchema = z.object({
  feedback_id: z.string(),
  review_id: z.string().optional(),
  task_id: z.string().optional(),
  execution_id: z.string().optional(),
  agent_output: z.record(z.string(), z.unknown()),
  human_action: z.object({
    type: ReviewActionSchema,
    modified_output: z.record(z.string(), z.unknown()),
  }),
  business_result: z.object({
    metric_delta: z.record(z.string(), z.number()),
    attribution_window: FeedbackAttributionWindowSchema.optional(),
    baseline: z.record(z.string(), z.number()).optional(),
    post_value: z.record(z.string(), z.number()).optional(),
    signal_usefulness: z.record(z.string(), SignalUsefulnessLabelSchema).optional(),
  }),
  timestamp: IsoDateString,
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const KnowledgeTypeSchema = z.enum(['sop', 'case', 'rule']);
export type KnowledgeType = z.infer<typeof KnowledgeTypeSchema>;

export const KnowledgeDomainSchema = z.enum(['ads', 'biz', 'supply', 'cs']);
export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;

export const KnowledgeSourceSchema = z.enum(['manual', 'feedback', 'system']);
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;

export const KnowledgeSchema = z.object({
  knowledge_id: z.string(),
  type: KnowledgeTypeSchema,
  domain: KnowledgeDomainSchema,
  content: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()).default([]),
  source: KnowledgeSourceSchema,
  fingerprint: z.string().optional(),
  promoted_at: IsoDateString.optional(),
  created_at: IsoDateString,
});
export type Knowledge = z.infer<typeof KnowledgeSchema>;

// Ranking domain schemas — product ranking by weighted 5-component scores.

import { z } from 'zod';
import { IsoDateString } from './common.js';

export const RankingProfileNameSchema = z.enum([
  'sales_leaderboard',
  'growth_discovery',
  'operator_mode',
]);
export type RankingProfileName = z.infer<typeof RankingProfileNameSchema>;

export const RankingComponentNameSchema = z.enum([
  'growth',
  'competition',
  'supply_stability',
  'lifecycle',
  'quality',
]);
export type RankingComponentName = z.infer<typeof RankingComponentNameSchema>;

export const RankingWeightsSchema = z.object({
  growth: z.number(),
  competition: z.number(),
  supply_stability: z.number(),
  lifecycle: z.number(),
  quality: z.number(),
});
export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

export const ComponentScoresSchema = z.object({
  growth: z.number(),
  competition: z.number(),
  supply_stability: z.number(),
  lifecycle: z.number(),
  quality: z.number(),
});
export type ComponentScores = z.infer<typeof ComponentScoresSchema>;

export const DecisionTraceSignalImpactSchema = z.object({
  signal_name: z.string(),
  value: z.number(),
  impact: z.number(), // signed contribution
});
export type DecisionTraceSignalImpact = z.infer<typeof DecisionTraceSignalImpactSchema>;

export const DecisionTraceEvidenceSchema = z.object({
  signal_name: z.string(),
  signal_value: z.number(),
  confidence: z.number(),
});
export type DecisionTraceEvidence = z.infer<typeof DecisionTraceEvidenceSchema>;

export const DecisionTraceSchema = z.object({
  decision_id: z.string(),
  final_score: z.number(),
  top_signals: z.array(DecisionTraceSignalImpactSchema), // top 5 positive
  risk_signals: z.array(DecisionTraceSignalImpactSchema), // top 5 negative
  ranking_contribution: z.array(
    z.object({
      component: RankingComponentNameSchema,
      score: z.number(),
      weight: z.number(),
      impact: z.number(),
    }),
  ),
  evidence: z.array(DecisionTraceEvidenceSchema), // top 8 by confidence
  confidence: z.object({
    model: z.number(),
    evidence_coverage: z.number(),
    final: z.number(),
  }),
});
export type DecisionTrace = z.infer<typeof DecisionTraceSchema>;

export const RankingExplainabilitySchema = z.object({
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  summary: z.string(),
});
export type RankingExplainability = z.infer<typeof RankingExplainabilitySchema>;

export const RankingResultSchema = z.object({
  ranking_id: z.string(),
  entity_id: z.string(),
  overall_score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),
  component_scores: ComponentScoresSchema,
  signals_used: z.array(z.string()),
  explainability: RankingExplainabilitySchema,
  decision_trace: DecisionTraceSchema,
  ranked_at: IsoDateString,
});
export type RankingResult = z.infer<typeof RankingResultSchema>;

export const RankingMemoryAdjustmentSchema = z.object({
  signal_name: z.string(),
  action: z.enum([
    'decrease_confidence',
    'increase_confidence',
    'cap_score',
    'boost_score',
  ]),
  magnitude: z.number().min(0).max(1),
  reason: z.string(),
  memory_id: z.string(),
});
export type RankingMemoryAdjustment = z.infer<typeof RankingMemoryAdjustmentSchema>;

export const RankingProfileSchema = z.object({
  name: RankingProfileNameSchema,
  label: z.string(),
  goal: z.string(),
  weights: RankingWeightsSchema,
  signal_mapping: z.record(RankingComponentNameSchema, z.array(z.string())),
  description: z.string(),
});
export type RankingProfile = z.infer<typeof RankingProfileSchema>;

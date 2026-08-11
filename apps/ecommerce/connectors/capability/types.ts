// Capability Generator types — the structured output of Discovery → Blueprint conversion.
// These schemas define what a Connector Blueprint looks like.
// P0005.3: Generator produces these; P0005.4: Connector consumes them.

import { z } from 'zod';

// ---- Parser Plan ----

export const ParserRuleSchema = z.object({
  /** API endpoint name (e.g. "summary.ajax") */
  endpoint: z.string().min(1),
  /** Parsing strategy: aggregate | time_series | ranking | raw */
  strategy: z.enum(['aggregate', 'time_series', 'ranking', 'raw']),
  /** Fields that should be extracted from the API response */
  fields_to_parse: z.array(z.string()),
  /** Field name → canonical metric name mapping */
  field_mapping: z.record(z.string(), z.string()),
  /** Whether this endpoint returns paginated data */
  is_paginated: z.boolean().default(false),
  /** Whether this endpoint returns time-series data */
  is_time_series: z.boolean().default(false),
  /** Data quality assessment */
  data_quality: z.enum(['high', 'medium', 'low', 'unknown']).default('unknown'),
});
export type ParserRule = z.infer<typeof ParserRuleSchema>;

export const ParserPlanSchema = z.object({
  generated_at: z.string(),
  source: z.string(), // e.g. "discovery/jd-capability"
  rules: z.array(ParserRuleSchema),
});
export type ParserPlan = z.infer<typeof ParserPlanSchema>;

// ---- Normalizer Plan ----

export const NormalizerRuleSchema = z.object({
  /** Source field name (raw JD key or parsed field) */
  source_field: z.string().min(1),
  /** Target canonical name */
  canonical: z.string().min(1),
  /** Business unit (currency, count, percentage, ratio, index) */
  unit: z.string().default('count'),
  /** Transformation to apply (identity, divide100, log, none) */
  transform: z.string().default('identity'),
  /** Mapping confidence (0-1) */
  confidence: z.number().min(0).max(1).default(0.9),
});
export type NormalizerRule = z.infer<typeof NormalizerRuleSchema>;

export const NormalizerPlanSchema = z.object({
  generated_at: z.string(),
  source: z.string(),
  rules: z.array(NormalizerRuleSchema),
});
export type NormalizerPlan = z.infer<typeof NormalizerPlanSchema>;

// ---- Generated Manifest ----

export const GeneratedManifestSchema = z.object({
  platform: z.string().min(1),
  generated_at: z.string(),
  signal_types: z.array(z.string()),
  business_context: z.array(z.string()),
  evidence_chain: z.array(z.string()),
  supported_actions: z.array(z.string()),
  /** Total APIs discovered */
  total_apis_discovered: z.number().int().nonnegative(),
  /** APIs included in this blueprint */
  apis_in_blueprint: z.number().int().nonnegative(),
});
export type GeneratedManifest = z.infer<typeof GeneratedManifestSchema>;

// ---- Evidence Strategy ----

export const EvidenceStrategySchema = z.object({
  /** Per-endpoint: what evidence to capture */
  capture_rules: z.array(z.object({
    endpoint: z.string(),
    capture_screenshot: z.boolean().default(false),
    capture_dom: z.boolean().default(false),
    capture_raw_response: z.boolean().default(true),
    capture_metadata: z.boolean().default(true),
  })),
});
export type EvidenceStrategy = z.infer<typeof EvidenceStrategySchema>;

// ---- Platform Capability (Phase 1 output) ----

export const PlatformCapabilitySchema = z.object({
  capability: z.string().min(1),
  api_module: z.string().min(1),
  supported_features: z.array(z.string()),
  api_count: z.number().int().nonnegative(),
  data_quality: z.enum(['high', 'medium', 'low', 'unknown']),
});
export type PlatformCapability = z.infer<typeof PlatformCapabilitySchema>;

// ---- Connector Blueprint (top-level) ----

export const ConnectorBlueprintSchema = z.object({
  platform: z.string().min(1),
  generated_at: z.string(),
  /** Total APIs found in Discovery */
  discovery_api_count: z.number().int().nonnegative(),
  capabilities: z.array(PlatformCapabilitySchema),
  parser_plan: ParserPlanSchema,
  normalizer_plan: NormalizerPlanSchema,
  manifest: GeneratedManifestSchema,
  evidence_strategy: EvidenceStrategySchema,
});
export type ConnectorBlueprint = z.infer<typeof ConnectorBlueprintSchema>;

// ---- Coverage Report ----

export const CoverageReportSchema = z.object({
  platform: z.string().min(1),
  generated_at: z.string(),
  /** Discovery baseline */
  discovery: z.object({
    total_apis: z.number().int(),
    total_indicators: z.number().int(),
    total_contexts: z.number().int(),
  }),
  /** Current connector coverage */
  connector: z.object({
    total_apis: z.number().int(),
    total_indicators: z.number().int(),
    total_contexts: z.number().int(),
  }),
  /** Coverage percentages */
  coverage: z.object({
    api_pct: z.number(),
    indicator_pct: z.number(),
    context_pct: z.number(),
  }),
  /** Gaps */
  missing_apis: z.array(z.string()),
  missing_indicators: z.array(z.string()),
  missing_contexts: z.array(z.string()),
});
export type CoverageReport = z.infer<typeof CoverageReportSchema>;

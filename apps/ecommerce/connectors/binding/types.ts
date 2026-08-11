// Binding layer types — the runtime bridge between generated artifacts and connector execution.
// P0005.4: These schemas define what the executor consumes at runtime.
// Generated artifacts (P0005.3) → BoundCapabilityModel → CapabilityExecutionPlan → Executor.

import { z } from 'zod';
import { ConnectorBlueprintSchema } from '#app/connectors/capability/types.js';

// ---- Bound Capability Model ----

/** The loaded + validated blueprint — the runtime model the binding layer operates on. */
export const BoundCapabilityModelSchema = ConnectorBlueprintSchema;
export type BoundCapabilityModel = z.infer<typeof BoundCapabilityModelSchema>;

// ---- Capability Execution Plan ----

/** One API to call during execution. Derived from parser_plan rules. */
export const ApiCallSchema = z.object({
  /** API endpoint name (e.g. "summary.ajax") */
  endpoint: z.string().min(1),
  /** Gateway base URL (e.g. "szgateway.jd.com/api/lowcode/indexSummary/") */
  gateway_url: z.string(),
  /** Parsing strategy: how to interpret the response */
  strategy: z.enum(['aggregate', 'time_series', 'ranking', 'raw']),
  /** Fields to extract from the API response */
  fields_to_parse: z.array(z.string()),
  /** Field name → canonical metric name mapping */
  field_mapping: z.record(z.string(), z.string()),
});
export type ApiCall = z.infer<typeof ApiCallSchema>;

/** One indicator resolution rule — maps a raw key to its canonical name. */
export const IndicatorResolutionSchema = z.object({
  raw_key: z.string().min(1),
  canonical: z.string().min(1),
  unit: z.string(),
  confidence: z.number().min(0).max(1),
});
export type IndicatorResolution = z.infer<typeof IndicatorResolutionSchema>;

/** One evidence capture rule — what to record for an endpoint. */
export const EvidenceCaptureSchema = z.object({
  endpoint: z.string(),
  capture_screenshot: z.boolean(),
  capture_dom: z.boolean(),
  capture_raw_response: z.boolean(),
  capture_metadata: z.boolean(),
});
export type EvidenceCapture = z.infer<typeof EvidenceCaptureSchema>;

/** The execution plan — what the connector executes at runtime. */
export const CapabilityExecutionPlanSchema = z.object({
  platform: z.string().min(1),
  /** APIs to call (derived from parser_plan rules filtered by capability) */
  apis_to_call: z.array(ApiCallSchema),
  /** Indicator resolution rules (derived from normalizer_plan rules) */
  indicator_resolution: z.array(IndicatorResolutionSchema),
  /** Evidence capture configuration (derived from evidence_strategy) */
  evidence_capture: z.array(EvidenceCaptureSchema),
  /** Which capabilities were requested (empty = all) */
  target_capabilities: z.array(z.string()).optional(),
});
export type CapabilityExecutionPlan = z.infer<typeof CapabilityExecutionPlanSchema>;

// ---- Plan Options ----

/** Options for buildExecutionPlan — filters which APIs and indicators to include. */
export interface PlanOptions {
  /** Filter to specific capabilities (e.g. ['daily_summary', 'campaign_performance']) */
  capabilities?: string[];
  /** Override the gateway base URL (defaults to JD szgateway) */
  gateway_base?: string;
}

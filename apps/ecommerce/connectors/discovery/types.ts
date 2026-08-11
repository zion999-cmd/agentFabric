// P0005.2 — Discovery-Driven Connector Architecture: core types.
//
// Every Zod schema here is derived from the actual shape of D0002 discovery data
// in discovery/jd-capability/*.json.  No type was invented — each one mirrors a
// real data file.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Phase 1 — API Inventory
// ---------------------------------------------------------------------------

/** A single field in an API response, from api_inventory.json. */
export const ApiFieldInfoSchema = z.object({
  type: z.string().min(1), // 'int' | 'float' | 'str' | 'object' | 'array'
  example: z.string().optional(),
});
export type ApiFieldInfo = z.infer<typeof ApiFieldInfoSchema>;

/** One API endpoint with its flattened field schema. */
export const ApiEndpointSchema = z.object({
  name: z.string().min(1),
  fields: z.record(z.string(), ApiFieldInfoSchema),
  field_count: z.number().nonnegative(),
  files: z.array(z.string()),
});
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;

/** A group of APIs sharing a common module prefix. */
export const ApiModuleSchema = z.object({
  name: z.string().min(1),
  prefix: z.string().min(1),
  endpoints: z.array(z.string()),
  description: z.string().optional(),
});
export type ApiModule = z.infer<typeof ApiModuleSchema>;

/** One API call observed on a page (from page_inventory.json). */
export const PageApiCallSchema = z.object({
  url: z.string().min(1),
  status: z.number().int(),
  size: z.number().nonnegative(),
  timestamp: z.string().min(1),
  body_hash: z.string().optional().default(''),
  body_preview: z.string().optional().default(''),
});
export type PageApiCall = z.infer<typeof PageApiCallSchema>;

/** A captured page with its API calls. */
export const PageCaptureSchema = z.object({
  page: z.string().min(1),
  url: z.string().min(1),
  status: z.string().min(1),
  apis: z.array(PageApiCallSchema),
});
export type PageCapture = z.infer<typeof PageCaptureSchema>;

// ---------------------------------------------------------------------------
// Phase 2 — Schema Evolution
// ---------------------------------------------------------------------------

/** A versioned snapshot of one endpoint's schema. */
export const SchemaVersionSchema = z.object({
  hash: z.string().min(1),
  version: z.number().int().positive(),
  recorded_at: z.string().min(1),
  field_names: z.array(z.string()),
  field_types: z.record(z.string(), z.string()),
});
export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;

/** Describes a single detected change between two schema versions. */
export const SchemaChangeSchema = z.object({
  endpoint: z.string().min(1),
  change_type: z.enum(['field_added', 'field_removed', 'field_type_changed']),
  field: z.string().min(1),
  previous: z.string().optional(),
  current: z.string().optional(),
});
export type SchemaChange = z.infer<typeof SchemaChangeSchema>;

// ---------------------------------------------------------------------------
// Phase 3 — Indicator Dictionary
// ---------------------------------------------------------------------------

/**
 * Source entry from indicator_dictionary_full.json.
 *
 * Each entry maps a raw JD indicator key (jdr_xxx) to its category,
 * example value, occurrence count, and the files where it was observed.
 */
export const IndicatorEntrySchema = z.object({
  jd_key: z.string().min(1),
  category: z.string().min(1),
  example_value: z.string(),
  occurrence_count: z.number().nonnegative(),
  source_files: z.array(z.string()),
});
export type IndicatorEntry = z.infer<typeof IndicatorEntrySchema>;

/** A fully-resolved indicator mapping: JD key → canonical business metric. */
export const IndicatorMappingSchema = z.object({
  jd_key: z.string().min(1),
  canonical: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().optional(),
  confidence: z.number().min(0).max(1),
  has_compare: z.boolean(),
  has_compare_value: z.boolean(),
});
export type IndicatorMapping = z.infer<typeof IndicatorMappingSchema>;

// ---------------------------------------------------------------------------
// Phase 4 — Business Context Generation
// ---------------------------------------------------------------------------

/** A rule that maps field name patterns to a business context. */
export const ContextDetectionRuleSchema = z.object({
  context: z.string().min(1),
  field_patterns: z.array(z.string()),
  category_match: z.array(z.string()),
  minimum_matches: z.number().int().positive().default(3),
});
export type ContextDetectionRule = z.infer<typeof ContextDetectionRuleSchema>;

/** A single generated business context with full traceability. */
export const GeneratedBusinessContextSchema = z.object({
  context: z.string().min(1),
  confidence: z.number().min(0).max(1),
  based_on_fields: z.array(z.string()),
  matched_patterns: z.array(z.string()),
  source_category: z.string().optional(),
  source_endpoints: z.array(z.string()),
});
export type GeneratedBusinessContext = z.infer<typeof GeneratedBusinessContextSchema>;

/** The full generated capability manifest for one platform. */
export const GeneratedManifestBusinessContextSchema = z.object({
  platform: z.string().min(1),
  generated_at: z.string().min(1),
  contexts: z.array(GeneratedBusinessContextSchema),
});
export type GeneratedManifestBusinessContext = z.infer<typeof GeneratedManifestBusinessContextSchema>;

// Capability Contract — the machine-readable interface between agentFabric and any Agent Runtime.
// P0006.5.3: When Hermes (or any agent) asks "what data can you get me?", the Contract answers.
//
// Unlike the ConnectorBlueprint (which is about *how* to execute acquisition),
// the CapabilityContract is about *what* business questions can be answered.
//
// Key design constraint: the Contract MUST NOT expose implementation details.
// No URLs, no API endpoint names, no POST parameters. Those belong to the Connector,
// not the Contract. The Contract describes *capability*, the Connector implements it.
//
// An agent asks "analyze traffic decline" → the Registry returns traffic.overview.
// The agent never sees "szgateway.jd.com" or "getFlowDetail.ajax".

import { z } from 'zod';

// ---- Provider ----

/**
 * High-level provider descriptor — tells the agent *who* provides this capability
 * and *how* data is acquired, without exposing implementation details.
 *
 * The Connector layer resolves this into actual CDP/API calls.
 */
export const ProviderSchema = z.object({
  /** Platform identifier (jd, tmall, amazon, shopify, ...) */
  platform: z.string().min(1),
  /** Acquisition method — the class of connector, not the implementation */
  acquisition: z.enum(['cdp', 'api_direct', 'csv_export', 'manual']),
});
export type Provider = z.infer<typeof ProviderSchema>;

// ---- Capability Metric ----

/** Detailed metadata about a metric this capability produces. */
export const CapabilityMetricSchema = z.object({
  /** Canonical metric name (e.g. "gmv", "visitors") */
  canonical: z.string().min(1),
  /** Human-readable label */
  label: z.string().min(1),
  /** Business unit */
  unit: z.enum(['currency', 'count', 'percentage', 'ratio', 'index', 'score', 'text']),
  /** Mapping confidence: 0=guessed, 1=hand-verified */
  confidence: z.number().min(0).max(1),
  /** Whether this metric is verified against page display */
  verified: z.boolean().default(false),
});
export type CapabilityMetric = z.infer<typeof CapabilityMetricSchema>;

// ---- Validation ----

export const ValidationStatusSchema = z.object({
  /** Current validation state */
  status: z.enum([
    'verified',          // CDP data matched page display
    'captured',          // API data captured, not yet verified against display
    'content_only',      // Page content captured, no live API data
    'pending',           // Page discovered, not yet explored
    'premium_required',  // Requires paid subscription
    'popup_blocked',     // Opens as popup/modal, not navigable
  ]),
  /** ISO date of last page-display verification */
  last_verified: z.string().optional(),
  /** Which metrics passed page-display verification */
  verified_metrics: z.array(z.string()),
});
export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

// ---- Constraints ----

export const CapabilityConstraintsSchema = z.object({
  /** Whether a premium subscription is required */
  requires_premium: z.boolean().default(false),
  /** Premium tier description (e.g. "¥8,856/年 数据尊享包") */
  premium_tier: z.string().optional(),
  /** Whether an ad account is required */
  requires_ad_account: z.boolean().default(false),
  /** Whether the page opens as a popup/modal */
  is_popup: z.boolean().default(false),
  /** Known limitations */
  notes: z.string().optional(),
});
export type CapabilityConstraints = z.infer<typeof CapabilityConstraintsSchema>;

// ---- Capability Contract Entry ----

/**
 * A single Capability Contract entry — the atom of the contract.
 *
 * One entry = one business question domain that can be answered with data.
 * An agent runtime queries these entries by domain, metric, or intent.
 *
 * CRITICAL: this describes WHAT, not HOW.
 *   - `provider.acquisition: "cdp"` tells the agent "this needs a browser"
 *   - It does NOT tell the agent which URL to visit or which API to intercept
 *   - That resolution happens in the Connector layer, not the Contract
 */
export const CapabilityContractEntrySchema = z.object({
  /** Unique capability identifier (e.g. "traffic.overview") */
  capability: z.string().min(1),

  /** Business domain (trade, traffic, product, customer, marketing, supply_chain, service) */
  domain: z.string().min(1),

  /** Human-readable name */
  name: z.string().min(1),

  /** What business problem this capability addresses */
  description: z.string().min(1),

  /**
   * Business intents — what an agent might want to do that this capability serves.
   * These are the query surface: an agent asks "分析流量下降原因" → matches traffic.overview.
   */
  intent: z.array(z.string()),

  /**
   * Input parameters the capability accepts.
   * Only describe what the agent needs to provide, not how it's formatted.
   */
  inputs: z.object({
    date_range: z.boolean().default(true),
    entity_id: z.boolean().default(false),
    dimensions: z.array(z.string()).default([]),
  }),

  /**
   * Outputs — the canonical metric names this capability produces.
   * This is the primary list for agent scanning. For detailed metadata (unit, confidence),
   * use the `metrics` field below.
   */
  outputs: z.array(z.string()),

  /** Detailed metric metadata (maps canonical name → unit, confidence, verification) */
  metrics: z.array(CapabilityMetricSchema),

  /** Available dimensions for slicing results */
  dimensions: z.array(z.string()),

  /** Who provides this capability */
  provider: ProviderSchema,

  /** Validation status */
  validation: ValidationStatusSchema,

  /** Constraints and limitations */
  constraints: CapabilityConstraintsSchema,
});
export type CapabilityContractEntry = z.infer<typeof CapabilityContractEntrySchema>;

// ---- Top-Level Contract ----

/**
 * The full Capability Contract for a platform.
 *
 * This is the artifact that agent runtimes consume. It describes all known
 * data capabilities, organized by business domain for efficient querying.
 *
 * The Contract is platform-scoped: one contract per external platform (JD, Tmall, etc.).
 * The Registry aggregates multiple contracts for cross-platform queries.
 */
export const CapabilityContractSchema = z.object({
  /** Contract version */
  version: z.string().default('1.0.0'),
  /** Platform identifier */
  platform: z.string().min(1),
  /** Platform display name */
  platform_name: z.string().min(1),
  /** When this contract was generated */
  generated_at: z.string().min(1),
  /** Source data used to generate the contract */
  sources: z.array(z.string()),

  /** All capability entries */
  capabilities: z.array(CapabilityContractEntrySchema),

  /** Summary statistics */
  summary: z.object({
    total_capabilities: z.number().int().nonnegative(),
    total_metrics: z.number().int().nonnegative(),
    verified_capabilities: z.number().int().nonnegative(),
    captured_capabilities: z.number().int().nonnegative(),
    pending_capabilities: z.number().int().nonnegative(),
    blocked_capabilities: z.number().int().nonnegative(),
    domains: z.array(z.string()),
  }),
});
export type CapabilityContract = z.infer<typeof CapabilityContractSchema>;

// ---- Query Types (for Registry) ----

/** Filter criteria for querying the capability contract. */
export interface ContractQuery {
  /** Filter by business domain */
  domain?: string;
  /** Filter by metric canonical name (must appear in outputs) */
  metric?: string;
  /** Free-text search against intent, name, and description */
  search?: string;
  /** Filter by validation status */
  validationStatus?: ValidationStatus['status'][];
  /** Include capabilities that are blocked/premium? */
  includeBlocked?: boolean;
}

/** A ranked search result from intent-based query. */
export interface ContractMatch {
  entry: CapabilityContractEntry;
  /** Relevance score — how well this capability matches the query */
  score: number;
  /** Why this capability matched */
  matchReason: string;
}

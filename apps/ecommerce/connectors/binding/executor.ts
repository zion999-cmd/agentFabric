// Phase 4: Generic Executor — executes a CapabilityExecutionPlan against a platform connector.
// P0005.4: The executor is platform-agnostic. It takes a plan + an acquire function and runs the pipeline.
// acquire → parse → normalize → evidence.

import { loadBlueprint } from './loader.js';
import { buildExecutionPlan } from './planner.js';
import type {
  BoundCapabilityModel,
  CapabilityExecutionPlan,
} from './types.js';

// ---- Acquire Function Type ----

/**
 * Platform-specific acquire function — fetches raw data for a set of endpoints.
 * Each platform connector provides this. It handles auth, CDP, mock mode, etc.
 */
export type AcquireFunction = (
  shopId: string,
  endpoints: string[],
  options?: { date?: string; mock?: boolean; cdpPort?: number },
) => Promise<Record<string, unknown>>;

/**
 * Optional parse function — converts acquired raw data into platform-specific parsed form.
 * When provided, executePlan calls this after acquisition to populate the parsed field.
 * When absent, parsed mirrors acquired (backward compat).
 */
export type ParseFunction = (
  acquired: Record<string, unknown>,
  options?: { date?: string },
) => Record<string, unknown> | null;

// ---- Execute Options & Result ----

export interface ExecuteOptions {
  shopId: string;
  date?: string;
  mock?: boolean;
}

export interface ExecuteResult {
  success: boolean;
  platform: string;
  shopId: string;
  date: string;
  /** Raw acquired data keyed by endpoint */
  acquired: Record<string, unknown>;
  /** Parsed metrics keyed by endpoint */
  parsed: Record<string, unknown>;
  /** Errors encountered during execution */
  errors: string[];
}

// ---- Platform Executor ----

export interface PlatformExecutor {
  platform: string;
  blueprint: BoundCapabilityModel;
  execute: (options: ExecuteOptions) => Promise<ExecuteResult>;
}

// ---- Execute Plan ----

/**
 * Execute a CapabilityExecutionPlan against a platform acquire function.
 * Generic pipeline: iterate APIs → acquire → (parse) → collect results.
 *
 * When `parseFn` is provided, it's called on the raw acquired data to populate
 * the `parsed` field with platform-specific structured data. When absent,
 * `parsed` mirrors `acquired` (backward compatible).
 */
export const executePlan = async (
  plan: CapabilityExecutionPlan,
  acquireFn: AcquireFunction,
  options: ExecuteOptions,
  parseFn?: ParseFunction,
): Promise<ExecuteResult> => {
  const { shopId, date, mock } = options;
  const executionDate = date ?? new Date().toISOString().slice(0, 10);
  const errors: string[] = [];
  const acquired: Record<string, unknown> = {};
  let parsed: Record<string, unknown> = {};

  try {
    // Collect all endpoint names from the plan
    const endpointNames = plan.apis_to_call.map((api) => api.endpoint);

    if (endpointNames.length === 0) {
      return {
        success: false,
        platform: plan.platform,
        shopId,
        date: executionDate,
        acquired: {},
        parsed: {},
        errors: ['No APIs to call in execution plan'],
      };
    }

    // Call the acquire function with all endpoints
    const acquireOpts: { date?: string; mock?: boolean; cdpPort?: number } = { date: executionDate };
    if (mock !== undefined) acquireOpts.mock = mock;
    const rawData = await acquireFn(shopId, endpointNames, acquireOpts);

    // Index results by endpoint
    for (const api of plan.apis_to_call) {
      if (rawData[api.endpoint] !== undefined) {
        acquired[api.endpoint] = rawData[api.endpoint];
      }
    }

    // Apply parse function if provided — converts raw acquired → structured parsed
    if (parseFn) {
      const parseResult = parseFn(acquired, { date: executionDate });
      parsed = (parseResult as Record<string, unknown>) ?? {};
    } else {
      // Backward compat: parsed mirrors acquired
      parsed = { ...acquired };
    }

    return {
      // Honest completion: an execution with no acquired data is not a success
      // (Consolidation Pass 1 — "loop ran" ≠ "data acquired").
      success: errors.length === 0 && Object.keys(acquired).length > 0,
      platform: plan.platform,
      shopId,
      date: executionDate,
      acquired,
      parsed,
      errors,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Unknown execution error');
    return {
      success: false,
      platform: plan.platform,
      shopId,
      date: executionDate,
      acquired,
      parsed,
      errors,
    };
  }
};

/**
 * Create a platform executor — loads the blueprint, builds the plan, and returns
 * a bound executor that can be called with just shopId/date options.
 */
export const createPlatformExecutor = async (
  platform: string,
  acquireFn: AcquireFunction,
  outputDir?: string,
): Promise<PlatformExecutor> => {
  const blueprint = loadBlueprint(platform, outputDir);
  return {
    platform,
    blueprint,
    execute: async (options: ExecuteOptions) => {
      const plan = buildExecutionPlan(blueprint);
      return executePlan(plan, acquireFn, options);
    },
  };
};

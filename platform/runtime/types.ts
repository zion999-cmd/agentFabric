// Runtime Control Plane types — the execution contract between AgentFabric and Runtime.
// These are platform infrastructure types, NOT business domain schemas.
// Business schemas live in shared/schemas/. Runtime contract types live here.

import { z } from 'zod';

// ---- Tool Call ----

export const ToolCallSchema = z.object({
  tool_name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()),
  result: z.unknown().optional(),
  duration_ms: z.number().nonnegative().optional(),
  error: z.string().optional(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

// ---- Plan Step ----

export const PlanStepSchema = z.object({
  step_id: z.string().min(1),
  action: z.string().min(1),
  prompt_template: z.string().min(1),
  context_bindings: z.array(z.string()).default([]),
  tools_allowed: z.array(z.string()).default([]),
  expected_output: z.string().default(''),
  constraints: z.array(z.string()).default([]),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

// ---- Execution Plan ----

export const ExecutionPlanSchema = z.object({
  plan_id: z.string().min(1),
  skill: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
  policy_constraints: z.array(z.string()).default([]),
  steps: z.array(PlanStepSchema).min(1),
  runtime_preference: z.string().optional(),
  created_at: z.string().min(1),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

// ---- Step Result ----

export const StepResultSchema = z.object({
  step_id: z.string().min(1),
  output: z.string(),
  tool_calls: z.array(ToolCallSchema).default([]),
  confidence: z.number().min(0).max(1).default(0),
  trace: z.record(z.string(), z.unknown()).default({}),
  logs: z.array(z.string()).default([]),
});
export type StepResult = z.infer<typeof StepResultSchema>;

// ---- Execution Result ----

export const ExecutionResultSchema = z.object({
  plan_id: z.string().min(1),
  step_results: z.array(StepResultSchema),
  aggregate_confidence: z.number().min(0).max(1),
  duration_ms: z.number().nonnegative(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

// ---- Runtime Capability (registry entry) ----

export const RuntimeCapabilitySchema = z.object({
  runtime_id: z.string().min(1),
  display_name: z.string().min(1),
  version: z.string().optional(),
  supported_actions: z.array(z.string()).default([]),
  max_tokens: z.number().positive().optional(),
  available: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type RuntimeCapability = z.infer<typeof RuntimeCapabilitySchema>;

// ---- Runtime Adapter (the replaceability boundary) ----

/** The contract every Runtime must implement. */
export interface RuntimeAdapter {
  /** Execute an execution plan on this runtime. */
  execute(plan: ExecutionPlan): Promise<ExecutionResult>;

  /** Whether this runtime is currently reachable. */
  isAvailable(): boolean;

  /** Static capability descriptor for registry discovery. */
  readonly capability: RuntimeCapability;
}

// ---- Runtime Registry (tracks available runtimes) ----

/** Registry of available runtimes. The single source of truth for runtime discovery. */
export interface RuntimeRegistry {
  register(runtime: RuntimeCapability): void;
  unregister(runtimeId: string): void;
  get(runtimeId: string): RuntimeCapability | undefined;
  list(): RuntimeCapability[];
  /** Find available runtimes that support a given action. */
  resolve(action: string): RuntimeCapability[];
}

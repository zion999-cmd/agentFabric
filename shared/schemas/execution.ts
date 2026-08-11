// Execution Contract — the stable protocol between Agent Runtime and Runtime Kernel.
// Phase 3.1: Defines the ExecutionRequest (what an Agent asks the Kernel to do)
// and the ExecutionEvent (what the Kernel emits back as observable state).
//
// This is a CONTRACT, not an implementation. It defines WHAT, not HOW.
//   - Agent Runtime sends: ExecutionRequest
//   - Runtime Kernel emits: ExecutionEvent[]
//
// Design principles:
//   1. capability must reference a valid CapabilityContractEntry.capability
//   2. Events describe EXECUTION STATE, not model thinking
//   3. No reasoning/thinking/chain-of-thought in the event model
//   4. Agent-agnostic: any Agent Runtime (Hermes, Claude, future) uses this contract

import { z } from 'zod';
import { IsoDateString } from './common.js';

// ---- Execution Status ----

export const ExecutionStatusSchema = z.enum([
  'pending',      // Request received, not yet started
  'planning',     // Agent is determining capability + parameters
  'executing',    // Runtime Kernel is executing acquisition
  'completed',    // Execution finished successfully
  'failed',       // Execution failed (error)
  'rejected',     // Request rejected (invalid capability, etc.)
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

// ---- Execution Request ----

/**
 * What an Agent Runtime sends to the Runtime Kernel.
 *
 * The Agent says: "I need capability X with these parameters."
 * The Kernel decides HOW to execute (which connector, CDP vs mock, etc.).
 */
export const ExecutionRequestSchema = z.object({
  /** Client-generated unique task ID */
  taskId: z.string().min(1).describe('Client-generated unique task identifier'),

  /** Capability ID from CapabilityContractEntry.capability (e.g. "traffic.overview") */
  capability: z.string().min(1).describe('Capability ID from the Capability Contract'),

  /** Parameters the capability needs */
  inputs: z.object({
    /** Date range for data acquisition */
    dateRange: z.object({
      from: IsoDateString,
      to: IsoDateString,
    }).optional(),

    /** Shop/entity identifier (overrides default) */
    shopId: z.string().optional(),

    /** Capability-specific dimensions */
    dimensions: z.array(z.string()).optional(),
  }).describe('Capability parameters — what data to acquire'),

  /** Session context (metadata only, not used for execution logic) */
  context: z.object({
    /** Client session ID for correlation */
    sessionId: z.string().optional(),
    /** Original user prompt (for audit trail) */
    userPrompt: z.string().optional(),
    /** Platform hint (overrides default from provider) */
    platform: z.string().optional(),
  }).optional().describe('Session metadata — not used for execution decisions'),
});
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

// ---- Execution Event Types ----

/**
 * Observable events emitted by the Runtime Kernel during execution.
 * These describe WHAT the system is doing — not HOW or WHY.
 *
 * Events are emitted in this order:
 *   1. execution.started    — Kernel accepted the task
 *   2. acquisition.started   — CDP/API acquisition begins
 *   3. acquisition.progress  — (optional) incremental progress
 *   4. evidence.created      — one evidence file written
 *   5. acquisition.completed — all data captured
 *   6. execution.completed   — task done, result available
 *
 * Events that terminate the flow:
 *   execution.failed         — unrecoverable error
 */

/** Event type discriminator */
export const ExecutionEventTypeSchema = z.enum([
  'execution.started',
  'acquisition.started',
  'acquisition.progress',
  'acquisition.completed',
  'evidence.created',
  'execution.completed',
  'execution.failed',
]);
export type ExecutionEventType = z.infer<typeof ExecutionEventTypeSchema>;

// ---- Individual Event Schemas ----

export const ExecutionStartedEventSchema = z.object({
  type: z.literal('execution.started'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    capability: z.string().min(1),
    provider: z.record(z.string(), z.string()).optional(),
  }),
});
export type ExecutionStartedEvent = z.infer<typeof ExecutionStartedEventSchema>;

export const AcquisitionStartedEventSchema = z.object({
  type: z.literal('acquisition.started'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    method: z.enum(['cdp', 'api_direct', 'mock', 'csv_export', 'manual']),
    page: z.string().optional(),
    platform: z.string(),
  }),
});
export type AcquisitionStartedEvent = z.infer<typeof AcquisitionStartedEventSchema>;

export const AcquisitionProgressEventSchema = z.object({
  type: z.literal('acquisition.progress'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    completed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
  }),
});
export type AcquisitionProgressEvent = z.infer<typeof AcquisitionProgressEventSchema>;

export const AcquisitionCompletedEventSchema = z.object({
  type: z.literal('acquisition.completed'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    endpointsCaptured: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  }),
});
export type AcquisitionCompletedEvent = z.infer<typeof AcquisitionCompletedEventSchema>;

export const EvidenceCreatedEventSchema = z.object({
  type: z.literal('evidence.created'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    evidenceId: z.string().min(1),
    dataType: z.string(),
    metricsCount: z.number().int().nonnegative(),
    filePath: z.string().optional(),
  }),
});
export type EvidenceCreatedEvent = z.infer<typeof EvidenceCreatedEventSchema>;

export const ExecutionCompletedEventSchema = z.object({
  type: z.literal('execution.completed'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    totalEvidence: z.number().int().nonnegative(),
    totalMetrics: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    evidenceRefs: z.array(z.string()).optional(),
  }),
});
export type ExecutionCompletedEvent = z.infer<typeof ExecutionCompletedEventSchema>;

export const ExecutionFailedEventSchema = z.object({
  type: z.literal('execution.failed'),
  taskId: z.string().min(1),
  timestamp: IsoDateString,
  data: z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean().default(false),
  }),
});
export type ExecutionFailedEvent = z.infer<typeof ExecutionFailedEventSchema>;

// ---- Discriminated Union ----

/**
 * All possible execution events.
 * Use `event.type` to discriminate — TypeScript narrows automatically.
 */
export const ExecutionEventSchema = z.discriminatedUnion('type', [
  ExecutionStartedEventSchema,
  AcquisitionStartedEventSchema,
  AcquisitionProgressEventSchema,
  AcquisitionCompletedEventSchema,
  EvidenceCreatedEventSchema,
  ExecutionCompletedEventSchema,
  ExecutionFailedEventSchema,
]);
export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;

// ---- Event Stream ----

/** An ordered sequence of execution events for one task. */
export const ExecutionEventStreamSchema = z.object({
  taskId: z.string().min(1),
  events: z.array(ExecutionEventSchema),
});
export type ExecutionEventStream = z.infer<typeof ExecutionEventStreamSchema>;

// ---- Explicitly EXCLUDED event types ----
// These categories are intentionally absent:
//
// ❌ agent.thinking.*       — internal reasoning
// ❌ model.chain_of_thought  — model internals
// ❌ reasoning.step.*        — inference steps
// ❌ capability.inferred     — agent's internal selection logic
// ❌ plan.generated          — agent's internal plan
//
// The event model describes EXECUTION STATE visible to external observers.
// Internal cognition belongs to the Agent Runtime, not the Execution Contract.

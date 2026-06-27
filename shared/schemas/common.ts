// Common shared schemas and primitives.
// Zero external dependencies except Zod. Used across all domains.

import { z } from 'zod';

/** ISO 8601 date string. */
export const IsoDateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Expected an ISO 8601 date string',
});

export type IsoDateString = z.infer<typeof IsoDateString>;

/** Entity identifier (non-empty string). */
export const EntityId = z.string().min(1);

export type EntityId = z.infer<typeof EntityId>;

/** A discriminated result wrapper for fallible operations at system boundaries. */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Signal source provenance. */
export const SignalSourceSchema = z.object({
  platform: z.string().min(1),
  dataset: z.string().min(1).default('internal'),
  ingested_at: IsoDateString,
});

export type SignalSource = z.infer<typeof SignalSourceSchema>;

/** Signal lifecycle (TTL-based). */
export const SignalLifecycleSchema = z.object({
  version: z.number().int().nonnegative().default(1),
  status: z.enum(['active', 'stale', 'deprecated']),
  expires_at: IsoDateString.nullable(),
});

export type SignalLifecycle = z.infer<typeof SignalLifecycleSchema>;

/** Audit trace for a signal (provenance fingerprint). */
export const SignalTraceSchema = z.object({
  pipeline_run_id: z.string().min(1),
  transform_hash: z.string().min(1),
});

export type SignalTrace = z.infer<typeof SignalTraceSchema>;

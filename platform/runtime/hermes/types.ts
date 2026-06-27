// Hermes client seam — the replaceability boundary between agentFabric and the Runtime.
// Business logic only ever sees the HermesClient interface, never Hermes internals.

import { z } from 'zod';

export const HermesOneShotRequestSchema = z.object({
  prompt: z.string().min(1),
  toolsets: z.string().optional(),
  skills: z.string().optional(),
  safeMode: z.boolean().default(false),
  model: z.string().optional(),
  provider: z.string().optional(),
  ignoreUserConfig: z.boolean().default(false),
});
export type HermesOneShotRequest = z.infer<typeof HermesOneShotRequestSchema>;

export const HermesOneShotResultSchema = z.object({
  stdout: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative(),
});
export type HermesOneShotResult = z.infer<typeof HermesOneShotResultSchema>;

export interface HermesClient {
  /** Run a one-shot agent turn. Throws on non-zero exit or missing binary. */
  oneShot(req: HermesOneShotRequest): Promise<HermesOneShotResult>;
  /** Whether the runtime binary is available (dev-time health check). */
  isAvailable(): boolean;
}

export class HermesUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HermesUnavailableError';
  }
}

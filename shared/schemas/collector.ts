// Collector domain schemas — platform data ingestion registry + auth.

import { z } from 'zod';
import { IsoDateString } from './common.js';
import { EnterpriseSignalTypeSchema, SignalSourcePlatformSchema } from './signal.js';

export const CollectorRegistryEntrySchema = z.object({
  source: SignalSourcePlatformSchema,
  shop_id: z.string().min(1),
  shop_name: z.string().optional(),
  signal_types: z.array(EnterpriseSignalTypeSchema),
  collector_script: z.string().min(1),
  enabled: z.boolean().default(false),
  last_run_at: IsoDateString.optional(),
  last_status: z.enum(['ok', 'error']).optional(),
});
export type CollectorRegistryEntry = z.infer<typeof CollectorRegistryEntrySchema>;

export const CollectOptionsSchema = z.object({
  shopId: z.string().min(1),
  signalTypes: z.array(EnterpriseSignalTypeSchema).optional(),
  cookiesFile: z.string().optional(),
  timeoutMs: z.number().int().positive().default(60000),
  mock: z.boolean().default(false),
});
export type CollectOptions = z.infer<typeof CollectOptionsSchema>;

export const CollectResultSchema = z.object({
  source: SignalSourcePlatformSchema,
  shop_id: z.string(),
  collected_at: IsoDateString,
  signal_count: z.number().int().nonnegative(),
  signals: z.array(z.unknown()), // SignalCollectorInput[] — validated separately
  errors: z.array(z.string()),
});
export type CollectResult = z.infer<typeof CollectResultSchema>;

/** Auth profile harvested from a logged-in browser via CDP. */
export const AuthProfileSchema = z.object({
  platform: z.string(),
  extracted_at: IsoDateString,
  cookies: z.record(z.string(), z.string()),
  cookieHeader: z.string(),
});
export type AuthProfile = z.infer<typeof AuthProfileSchema>;

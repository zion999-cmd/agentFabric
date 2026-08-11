// P0005.2 — File loader for D0002 discovery data.
//
// Each loader reads a specific JSON file from discovery/{platformDir}/,
// validates it against the corresponding Zod schema, and returns typed data.
// All functions accept an optional platformDir for future multi-platform support.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  ApiEndpointSchema,
  ApiFieldInfoSchema,
  IndicatorEntrySchema,
  PageCaptureSchema,
} from './types.js';
import type { ApiEndpoint, IndicatorEntry, PageCapture } from './types.js';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const CWD = process.cwd();

/** Root directory for all discovery data. */
export const DISCOVERY_ROOT = 'discovery';

/** Resolve the absolute path to a platform's discovery directory. */
export const discoveryRoot = (platform = 'jd-capability'): string =>
  resolve(CWD, DISCOVERY_ROOT, platform);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const readJson = (filePath: string): unknown => {
  if (!existsSync(filePath)) {
    throw new Error(`Discovery file not found: ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
};

const loadAndValidate = <T>(
  platformDir: string,
  fileName: string,
  schema: z.ZodType<T>,
): T => {
  const filePath = resolve(discoveryRoot(platformDir), fileName);
  const raw = readJson(filePath);
  return schema.parse(raw);
};

// ---------------------------------------------------------------------------
// Public loaders
// ---------------------------------------------------------------------------

/**
 * Schema for api_inventory.json top-level: Record<endpointName, fields-only object>.
 *
 * The on-disk format has NO `name` field — the key IS the name.
 * This schema accepts the raw file shape, then loadApiInventory injects the name.
 */
const ApiInventoryRawSchema = z.record(
  z.string(),
  z.object({
    fields: z.record(z.string(), ApiFieldInfoSchema),
    field_count: z.number().nonnegative(),
    files: z.array(z.string()),
  }),
);

/** Load and validate api_inventory.json, injecting the endpoint name from the key. */
export const loadApiInventory = (
  platformDir = 'jd-capability',
): Record<string, ApiEndpoint> => {
  const raw = loadAndValidate(platformDir, 'api_inventory.json', ApiInventoryRawSchema);
  const result: Record<string, ApiEndpoint> = {};
  for (const [name, entry] of Object.entries(raw)) {
    result[name] = ApiEndpointSchema.parse({ ...entry, name });
  }
  return result;
};

/** Schema for indicator_dictionary_full.json top-level: { keys: Record<string, IndicatorEntry> }. */
const IndicatorDictionaryFileSchema = z.object({
  keys: z.record(z.string(), IndicatorEntrySchema),
});

/** Load and validate indicator_dictionary_full.json.
 *  Returns the inner `keys` map (jd_key → IndicatorEntry). */
export const loadIndicatorDictionary = (
  platformDir = 'jd-capability',
): Record<string, IndicatorEntry> => {
  const file = loadAndValidate(platformDir, 'indicator_dictionary_full.json', IndicatorDictionaryFileSchema);
  return file.keys;
};

/** Load and validate page_inventory.json (array of page captures). */
export const loadPageInventory = (
  platformDir = 'jd-capability',
): PageCapture[] => {
  const raw = loadAndValidate(platformDir, 'page_inventory.json', z.array(z.record(z.string(), z.unknown())));
  return z.array(PageCaptureSchema).parse(
    raw.map((r) => ({
      ...r,
      apis: ((r['apis'] as unknown[]) ?? []).map((a) => {
        const api = a as Record<string, unknown>;
        return {
          ...api,
          body_hash: api['body_hash'] ?? '',
          body_preview: api['body_preview'] ?? '',
        };
      }),
    })),
  );
};

/** Load business_context_candidates.json (raw — structure varies by platform). */
export const loadBusinessContextCandidates = (
  platformDir = 'jd-capability',
): Record<string, unknown> => {
  const filePath = resolve(discoveryRoot(platformDir), 'business_context_candidates.json');
  return readJson(filePath) as Record<string, unknown>;
};

/** Load capability_matrix.json (raw — structure varies by platform). */
export const loadCapabilityMatrix = (
  platformDir = 'jd-capability',
): Record<string, unknown> => {
  const filePath = resolve(discoveryRoot(platformDir), 'capability_matrix.json');
  return readJson(filePath) as Record<string, unknown>;
};

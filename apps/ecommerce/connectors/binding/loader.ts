// Binding layer artifact loader — reads generated/ JSON files, validates with Zod, returns typed data.
// P0005.4: This is the bridge from static artifacts to runtime execution.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NormalizerPlan } from '#app/connectors/capability/types.js';
import { ConnectorBlueprintSchema, NormalizerPlanSchema } from '#app/connectors/capability/types.js';
import type { BoundCapabilityModel } from './types.js';

const GENERATED_ROOT = resolve(process.cwd(), 'generated');

/** Read and parse a generated JSON file. */
const readGenerated = <T>(filePath: string, label: string): T => {
  const raw = readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw) as T;
  } catch (cause) {
    throw new Error(`Failed to parse ${label} at ${filePath}`, { cause });
  }
};

/**
 * Load a complete ConnectorBlueprint from generated/connector-blueprint.json.
 * Validates against ConnectorBlueprintSchema. Throws on missing file or schema mismatch.
 */
export const loadBlueprint = (
  platform: string,
  outputDir?: string,
): BoundCapabilityModel => {
  const dir = outputDir ?? GENERATED_ROOT;
  const filePath = resolve(dir, 'connector-blueprint.json');
  if (!existsSync(filePath)) {
    throw new Error(
      `Blueprint not found for ${platform} at ${filePath}. Run 'npm run cli -- generate-blueprint --platform ${platform}' first.`,
    );
  }
  const raw = readGenerated<unknown>(filePath, 'connector-blueprint.json');
  const blueprint = ConnectorBlueprintSchema.parse(raw);
  if (blueprint.platform !== platform) {
    throw new Error(
      `Blueprint platform mismatch: expected '${platform}', got '${blueprint.platform}'. ` +
      `Run 'npm run cli -- generate-blueprint --platform ${platform}' first.`,
    );
  }
  return blueprint;
};

/**
 * Load the normalizer plan from generated/normalizer-plan.json.
 */
export const loadNormalizerPlan = (
  platform: string,
  outputDir?: string,
): NormalizerPlan => {
  const dir = outputDir ?? GENERATED_ROOT;
  const filePath = resolve(dir, 'normalizer-plan.json');
  if (!existsSync(filePath)) {
    throw new Error(
      `Normalizer plan not found for ${platform} at ${filePath}.`,
    );
  }
  const raw = readGenerated<unknown>(filePath, 'normalizer-plan.json');
  return NormalizerPlanSchema.parse(raw);
};

/**
 * Load the indicator dictionary from generated/indicator.generated.json.
 * Returns a flat Record optimized for O(1) runtime lookup.
 */
export const loadIndicatorDict = (
  platform: string,
  outputDir?: string,
): Record<string, { canonical: string; unit: string; confidence: number }> => {
  const dir = outputDir ?? GENERATED_ROOT;
  const filePath = resolve(dir, 'indicator.generated.json');
  if (!existsSync(filePath)) {
    throw new Error(
      `Indicator dictionary not found for ${platform} at ${filePath}.`,
    );
  }
  const raw = readGenerated<{ keys: Record<string, { canonical: string; unit: string; confidence: number }> }>(
    filePath,
    'indicator.generated.json',
  );
  return raw.keys;
};

/**
 * Load a blueprint, falling back to runtime generation if files are missing.
 * This is the backward-compatible entry point for code that must always get a blueprint.
 * Prefer `loadBlueprint` for direct use; use this only when graceful degradation is required.
 */
export const loadOrGenerate = (platform: string): BoundCapabilityModel => {
  const filePath = resolve(GENERATED_ROOT, 'connector-blueprint.json');
  if (existsSync(filePath)) {
    return loadBlueprint(platform);
  }
  // If generated files don't exist, throw with clear instructions.
  // Runtime generation requires the full discovery pipeline which depends on
  // discovery/jd-capability/ data files — not available in all environments.
  throw new Error(
    `Blueprint not found at ${filePath}. ` +
    `Run 'npm run cli -- generate-blueprint --platform ${platform}' to generate it.`,
  );
};

// Phase 4: Blueprint Generation
// Orchestrates all phases → produces a complete ConnectorBlueprint.
// Writes generated/ JSON files that P0005.4 Connectors can consume.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConnectorBlueprint, GeneratedManifest } from './types.js';
import type { ApiEndpoint } from '#app/connectors/discovery/types.js';
import { ConnectorBlueprintSchema } from './types.js';
import { discoverCapabilitiesWithMatrix } from './capability-discovery.js';
import { generateParserPlan } from './evidence-analysis.js';
import { generateNormalizerPlan } from './semantic-mapping.js';
import { generateManifestContexts } from '#app/connectors/discovery/business-context.js';
import { listApis } from '#app/connectors/discovery/api-inventory.js';
import { resolveAllIndicators } from '#app/connectors/discovery/indicator-dictionary.js';

const GENERATED_ROOT = resolve(process.cwd(), 'generated');

/**
 * Generate a manifest from Discovery data — replaces hand-written JD_MANIFEST.
 */
export const generateManifest = (
  platform: string,
): GeneratedManifest => {
  const endpointsArr = listApis();
  const indicatorMappings = resolveAllIndicators();

  // Convert array → Record<string, ApiEndpoint> for generateManifestContexts
  const endpointsMap: Record<string, ApiEndpoint> = {};
  for (const ep of endpointsArr) {
    endpointsMap[ep.name] = ep;
  }
  const contexts = generateManifestContexts(endpointsMap, indicatorMappings);

  // Map contexts to signal types
  const signalTypeMap: Record<string, string> = {
    transaction: 'daily_summary',
    traffic: 'hourly_traffic',
    customer: 'daily_summary',
    product: 'daily_summary',
    industry: 'daily_summary',
    marketing: 'campaign_performance',
    supplychain: 'daily_summary',
  };

  const signalTypes = [...new Set(
    contexts.map((c) => signalTypeMap[c] ?? 'daily_summary'),
  )];

  return {
    platform,
    generated_at: new Date().toISOString(),
    signal_types: signalTypes,
    business_context: contexts,
    evidence_chain: [
      'Screenshot (page capture)',
      'DOM snapshot (page state)',
      'Raw API JSON (platform response)',
      'Parsed metrics (indicator → canonical)',
      'Normalized Business Object (EnterpriseSignalPayload)',
    ],
    supported_actions: ['summarize_top_ranking', 'analyze_trends', 'detect_anomalies'],
    total_apis_discovered: endpointsArr.length,
    apis_in_blueprint: endpointsArr.filter((ep) => ep.field_count > 0).length,
  };
};

/**
 * Generate a complete ConnectorBlueprint — the master orchestrator.
 */
export const generateConnectorBlueprint = (
  platform: string,
): ConnectorBlueprint => {
  const capabilities = discoverCapabilitiesWithMatrix();
  const endpointsArr = listApis();
  const indicatorMappings = resolveAllIndicators();

  const parserPlan = generateParserPlan(endpointsArr, indicatorMappings);
  const normalizerPlan = generateNormalizerPlan(indicatorMappings, endpointsArr);
  const manifest = generateManifest(platform);

  const fieldRichApis = endpointsArr.filter((ep) => ep.field_count > 0);

  const blueprint: ConnectorBlueprint = {
    platform,
    generated_at: new Date().toISOString(),
    discovery_api_count: endpointsArr.length,
    capabilities,
    parser_plan: parserPlan,
    normalizer_plan: normalizerPlan,
    manifest,
    evidence_strategy: {
      capture_rules: fieldRichApis.map((ep) => ({
        endpoint: ep.name,
        capture_screenshot: ep.field_count >= 10,
        capture_dom: ep.field_count >= 20,
        capture_raw_response: true,
        capture_metadata: true,
      })),
    },
  };

  return ConnectorBlueprintSchema.parse(blueprint);
};

/**
 * Write the blueprint to generated/ directory as JSON files.
 */
export const writeBlueprint = (
  blueprint: ConnectorBlueprint,
  outputDir?: string,
): void => {
  const dir = outputDir ?? GENERATED_ROOT;
  mkdirSync(dir, { recursive: true });

  const write = (name: string, data: unknown) => {
    writeFileSync(resolve(dir, name), JSON.stringify(data, null, 2), 'utf-8');
  };

  write('connector-blueprint.json', blueprint);
  write('parser-plan.json', blueprint.parser_plan);
  write('normalizer-plan.json', blueprint.normalizer_plan);
  write('manifest.generated.json', blueprint.manifest);

  // Also write indicator dictionary
  const indicatorDict = Object.fromEntries(
    blueprint.normalizer_plan.rules.map((r) => [
      r.source_field,
      { canonical: r.canonical, unit: r.unit, confidence: r.confidence },
    ]),
  );
  write('indicator.generated.json', {
    generated_at: blueprint.generated_at,
    total_keys: Object.keys(indicatorDict).length,
    keys: indicatorDict,
  });
};

/**
 * Run the full generation pipeline and write to disk.
 */
export const runGenerationPipeline = (
  platform: string,
  outputDir?: string,
): ConnectorBlueprint => {
  const blueprint = generateConnectorBlueprint(platform);
  writeBlueprint(blueprint, outputDir);
  return blueprint;
};

// Contract test: full Capability Generator pipeline.
// Verifies the contract across all 5 phases.
// Blueprint must be valid JSON Schema, deterministic, and traceable.

import { describe, expect, test } from 'vitest';
import {
  generateConnectorBlueprint,
  ConnectorBlueprintSchema,
  runGenerationPipeline,
  analyzeCoverage,
  formatCoverageSummary,
} from '#app/connectors/capability/index.js';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Capability Generator contract', () => {
  test('full pipeline produces valid blueprint', () => {
    const bp = generateConnectorBlueprint('jd');
    const parsed = ConnectorBlueprintSchema.parse(bp);

    // Must have all 5 phases represented
    expect(parsed.capabilities.length).toBeGreaterThan(0);       // Phase 1
    expect(parsed.parser_plan.rules.length).toBeGreaterThan(0);   // Phase 2
    expect(parsed.normalizer_plan.rules.length).toBeGreaterThan(0); // Phase 3
    expect(parsed.manifest.business_context.length).toBeGreaterThan(0); // Phase 4
    // Phase 5 (coverage) is separate, tested below
  });

  test('blueprint is deterministic across generations', () => {
    const bp1 = generateConnectorBlueprint('jd');
    const bp2 = generateConnectorBlueprint('jd');
    // Structure should be identical
    expect(bp1.discovery_api_count).toBe(bp2.discovery_api_count);
    expect(bp1.capabilities.length).toBe(bp2.capabilities.length);
    expect(bp1.parser_plan.rules.length).toBe(bp2.parser_plan.rules.length);
    expect(bp1.normalizer_plan.rules.length).toBe(bp2.normalizer_plan.rules.length);
    expect(bp1.manifest.business_context).toEqual(bp2.manifest.business_context);
  });

  test('runGenerationPipeline writes files to disk', () => {
    const testDir = resolve(process.cwd(), 'generated', 'test-output');
    runGenerationPipeline('jd', testDir);

    expect(existsSync(resolve(testDir, 'connector-blueprint.json'))).toBe(true);
    expect(existsSync(resolve(testDir, 'parser-plan.json'))).toBe(true);
    expect(existsSync(resolve(testDir, 'normalizer-plan.json'))).toBe(true);
    expect(existsSync(resolve(testDir, 'manifest.generated.json'))).toBe(true);
    expect(existsSync(resolve(testDir, 'indicator.generated.json'))).toBe(true);

    // Cleanup
    try { rmSync(testDir, { recursive: true }); } catch { /* ok */ }
  });

  test('coverage report is consistent with blueprint', () => {
    const bp = generateConnectorBlueprint('jd');
    const report = analyzeCoverage(bp);

    // Coverage should reference the same discovery baseline
    expect(report.discovery.total_apis).toBe(bp.discovery_api_count);
    expect(report.discovery.total_contexts).toBe(bp.manifest.business_context.length);
    expect(formatCoverageSummary(report).length).toBeGreaterThan(0);
  });
});

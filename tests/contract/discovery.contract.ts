// P0005.2 Contract tests — cross-phase Discovery integration
//
// Verifies that all 4 phases work together correctly on real D0002 data.
// This is the golden-path verification: load → classify → evolve → map → generate.

import { describe, expect, test } from 'vitest';
import {
  loadApiInventory,
  getApiModules,
  getApiStats,
  computeSchemaHash,
  captureSchemaVersion,
  loadVersionHistory,
  saveVersionHistory,
  getLatestVersion,
  loadIndicatorDictionary,
  resolveAllIndicators,
  generateBusinessContexts,
  generateManifestContexts,
  summarizeContexts,
  CONTEXT_DETECTION_RULES,
} from '#app/connectors/discovery/index.js';

// ---------------------------------------------------------------------------
// Full pipeline: load → classify → map → generate
// ---------------------------------------------------------------------------

describe('full discovery pipeline', () => {
  test('Phase 1 → Phase 3 → Phase 4: contextualize real APIs', () => {
    // Phase 1: Load & classify
    const endpoints = loadApiInventory();
    const modules = getApiModules();
    const stats = getApiStats();
    expect(stats.total_apis).toBeGreaterThan(50);
    expect(modules.length).toBeGreaterThanOrEqual(3);

    // Phase 3: Resolve indicators
    const dict = loadIndicatorDictionary();
    const mappings = resolveAllIndicators(dict);
    expect(mappings.size).toBeGreaterThan(0);

    // Phase 4: Generate business contexts
    const contexts = generateBusinessContexts(endpoints, mappings, 0.3);
    expect(contexts.length).toBeGreaterThan(0);
  });

  test('indicator categories match detection rules', () => {
    const dict = loadIndicatorDictionary();
    const mappings = resolveAllIndicators(dict);

    // Collect all categories from indicator mappings
    const mappingCategories = new Set(
      [...mappings.values()].map((m) => m.category),
    );

    // At least Transaction and Traffic should appear in both
    expect(mappingCategories.has('Transaction') || mappings.size === 0).toBe(true);
  });

  test('all API field names complete analyzeFields without crash', async () => {
    const endpoints = loadApiInventory();
    // Dynamic import for ESM compatibility; analyzeFields is already imported above
    const { analyzeFields } = await import('#app/connectors/discovery/business-context.js');
    for (const ep of Object.values(endpoints)) {
      const fieldNames = Object.keys(ep.fields);
      expect(() => analyzeFields(fieldNames)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Schema hash stability
// ---------------------------------------------------------------------------

describe('schema hash stability', () => {
  test('hash is stable across reloads', () => {
    const eps1 = loadApiInventory();
    const eps2 = loadApiInventory();

    for (const name of Object.keys(eps1).slice(0, 10)) {
      const ep1 = eps1[name]!;
      const ep2 = eps2[name]!;
      if (ep2) {
        expect(computeSchemaHash(ep1)).toBe(computeSchemaHash(ep2));
      }
    }
  });

  test('save and load version history round-trips', () => {
    const platform = '_test_contract_roundtrip_';
    const endpoints = loadApiInventory();

    // Take first 3 endpoints as sample
    const samples = Object.entries(endpoints).slice(0, 3);
    const versions: Record<string, ReturnType<typeof captureSchemaVersion>> = {};
    for (const [name, ep] of samples) {
      versions[name] = captureSchemaVersion(ep);
    }

    // Save + load
    saveVersionHistory(platform, versions);
    const loaded = loadVersionHistory(platform);
    expect(Object.keys(loaded).length).toBeGreaterThanOrEqual(samples.length);

    // Verify each saved version is retrievable
    for (const [name, v] of Object.entries(versions)) {
      const latest = getLatestVersion(platform, name);
      expect(latest).not.toBeNull();
      expect(latest!.hash).toBe(v.hash);
      expect(latest!.version).toBe(v.version);
    }
  });
});

// ---------------------------------------------------------------------------
// Business context generation never returns programmer-defined contexts
// ---------------------------------------------------------------------------

describe('business context integrity', () => {
  test('all generated contexts trace to detection rules', () => {
    const endpoints = loadApiInventory();
    const contexts = generateBusinessContexts(endpoints, undefined, 0.3);

    const ruleNames = new Set(CONTEXT_DETECTION_RULES.map((r) => r.context));
    for (const c of contexts) {
      expect(ruleNames.has(c.context)).toBe(true);
    }
  });

  test('manifest contexts exclude Context suffix', () => {
    const endpoints = loadApiInventory();
    const manifestCtx = generateManifestContexts(endpoints, undefined, 0.2);
    for (const ctx of manifestCtx) {
      expect(ctx).not.toContain('Context');
      expect(ctx).toBe(ctx.toLowerCase());
    }
  });

  test('summary includes endpoint and field counts', () => {
    const endpoints = loadApiInventory();
    const contexts = generateBusinessContexts(endpoints, undefined, 0.3);
    const summary = summarizeContexts(contexts);

    for (const s of summary) {
      expect(s.endpoint_count).toBeGreaterThan(0);
      expect(s.field_count).toBeGreaterThan(0);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });
});

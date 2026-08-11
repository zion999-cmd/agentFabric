// Unit tests for capability-discovery.ts — Phase 1.

import { describe, expect, test } from 'vitest';
import {
  discoverCapabilities,
  summarizeCapabilities,
  getApisByCapability,
} from '#app/connectors/capability/index.js';

describe('discoverCapabilities', () => {
  test('returns capabilities for all 6 API modules', () => {
    const caps = discoverCapabilities();
    expect(caps.length).toBeGreaterThanOrEqual(6);
    const names = caps.map((c) => c.capability);
    expect(names).toContain('Transaction');
    expect(names).toContain('Industry');
    expect(names).toContain('Customer');
    expect(names).toContain('Marketing');
    expect(names).toContain('SupplyChain');
    expect(names).toContain('Platform');
  });

  test('each capability has non-empty features', () => {
    const caps = discoverCapabilities();
    for (const cap of caps) {
      expect(cap.supported_features.length).toBeGreaterThan(0);
      expect(cap.api_count).toBeGreaterThanOrEqual(0);
    }
  });

  test('capabilities include data quality assessment', () => {
    const caps = discoverCapabilities();
    for (const cap of caps) {
      expect(['high', 'medium', 'low', 'unknown']).toContain(cap.data_quality);
    }
  });

  test('summarizeCapabilities returns correct totals', () => {
    const caps = discoverCapabilities();
    const summary = summarizeCapabilities(caps);
    expect(summary.total_capabilities).toBe(caps.length);
    expect(summary.total_apis).toBeGreaterThan(0);
    expect(summary.capabilities_list.length).toBe(caps.length);
  });

  test('getApisByCapability returns endpoints for known capability', () => {
    const apis = getApisByCapability('Transaction');
    expect(apis.length).toBeGreaterThan(0);
    // Transaction module = indexSummary, should contain API endpoints
    expect(apis.every((a) => typeof a === 'string')).toBe(true);
  });

  test('getApisByCapability returns empty for unknown capability', () => {
    const apis = getApisByCapability('UnknownCapability');
    expect(apis).toHaveLength(0);
  });
});

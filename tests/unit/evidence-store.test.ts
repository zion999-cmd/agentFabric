// Unit tests for Evidence Store — save, load, list round-trips.

import { describe, expect, test, afterAll } from 'vitest';
import { saveEvidence, loadEvidence, listEvidence } from '#app/connectors/evidence/store.js';
import { EvidenceMetadataSchema, EvidenceRecordSchema } from '#app/connectors/evidence/types.js';
import { rmSync } from 'node:fs';

const TEST_PLATFORM = 'test-platform';
const TEST_DATE = '2026-06-30';
const TEST_SHOP = 'test-shop';

describe('Evidence Store', () => {
  afterAll(() => {
    // Clean up test evidence
    try { rmSync('data/evidence/test-platform', { recursive: true }); } catch { /* ok */ }
  });

  test('saveEvidence returns a valid EvidenceRecord', () => {
    const payload = { gmv: 1234, orders: 42 };
    const record = saveEvidence(TEST_PLATFORM, TEST_SHOP, TEST_DATE, 'summary', payload, {
      method: 'mock',
      operator: 'test',
    });

    const parsed = EvidenceRecordSchema.parse(record);
    expect(parsed.evidence_id).toBeDefined();
    expect(parsed.metadata.source).toBe(TEST_PLATFORM);
    expect(parsed.metadata.shop_id).toBe(TEST_SHOP);
    expect(parsed.metadata.data_type).toBe('summary');
    expect(parsed.metadata.method).toBe('mock');
    expect(parsed.metadata.operator).toBe('test');
    expect(parsed.metadata.content_hash).toBeDefined();
    expect(parsed.file_path).toContain('30_summary.json');
    expect(parsed.file_size).toBeGreaterThan(0);
  });

  test('saveEvidence creates both .json and .meta.json files', () => {
    const payload = { visitors: 500 };
    const record = saveEvidence(TEST_PLATFORM, TEST_SHOP, TEST_DATE, 'traffic', payload);

    const loaded = loadEvidence(TEST_PLATFORM, TEST_DATE, 'traffic');
    expect(loaded).not.toBeNull();
    expect(loaded!.data).toEqual(payload);
    expect(loaded!.record.metadata.content_hash).toBe(record.metadata.content_hash);
  });

  test('loadEvidence returns null for non-existent evidence', () => {
    const result = loadEvidence('nonexistent', '2020-01-01', 'summary');
    expect(result).toBeNull();
  });

  test('listEvidence filters by source', () => {
    saveEvidence(TEST_PLATFORM, TEST_SHOP, '2026-06-28', 'summary', { x: 1 });
    saveEvidence(TEST_PLATFORM, TEST_SHOP, '2026-06-29', 'summary', { x: 2 });

    const results = listEvidence({ source: TEST_PLATFORM, limit: 50 });
    expect(results.length).toBeGreaterThanOrEqual(2);
    // All results should be from the test platform
    for (const r of results) {
      expect(r.metadata.source).toBe(TEST_PLATFORM);
    }
  });

  test('listEvidence filters by dataType', () => {
    saveEvidence(TEST_PLATFORM, TEST_SHOP, '2026-06-27', 'trend', { hourly: [] });
    saveEvidence(TEST_PLATFORM, TEST_SHOP, '2026-06-27', 'summary', { gmv: 100 });

    const summaries = listEvidence({ source: TEST_PLATFORM, dataType: 'summary', limit: 50 });
    for (const r of summaries) {
      expect(r.metadata.data_type).toBe('summary');
    }
  });

  test('EvidenceMetadata schema validates correctly', () => {
    const meta = EvidenceMetadataSchema.parse({
      source: 'jd',
      shop_id: 'jd_001',
      data_type: 'summary',
      acquired_at: new Date().toISOString(),
      method: 'cdp',
      version: '1.0.0',
      operator: 'system',
      runtime: 'playwright',
      connector: 'jd',
      content_hash: 'abc123',
      mime_type: 'application/json',
    });
    expect(meta.source).toBe('jd');
  });
});

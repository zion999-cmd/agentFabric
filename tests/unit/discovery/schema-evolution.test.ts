// P0005.2 Phase 2 tests — Schema Evolution
import { describe, expect, test } from 'vitest';
import {
  computeSchemaHash,
  captureSchemaVersion,
  detectChanges,
  detectAllChanges,
  getLatestVersion,
  SchemaVersionSchema,
  SchemaChangeSchema,
} from '#app/connectors/discovery/index.js';
import type { ApiEndpoint } from '#app/connectors/discovery/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEndpoint = (
  name: string,
  fields: Record<string, string>,
  files: string[] = ['test.json'],
): ApiEndpoint => ({
  name,
  fields: Object.fromEntries(
    Object.entries(fields).map(([k, type]) => [k, { type, example: 'x' }]),
  ),
  field_count: Object.keys(fields).length,
  files,
});

const epV1 = makeEndpoint('test.ajax', { status: 'str', message: 'str', content: 'object' });
const epV2 = makeEndpoint('test.ajax', { status: 'str', message: 'str', content: 'object', new_field: 'int' });
const epV3 = makeEndpoint('test.ajax', { status: 'str', message: 'str', content: 'int' }); // type change
const epV4 = makeEndpoint('test.ajax', { status: 'str', message: 'str' }); // field removed

// ---------------------------------------------------------------------------
// Schema hash
// ---------------------------------------------------------------------------

describe('computeSchemaHash', () => {
  test('is deterministic', () => {
    const h1 = computeSchemaHash(epV1);
    const h2 = computeSchemaHash(epV1);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  test('changes on field addition', () => {
    expect(computeSchemaHash(epV2)).not.toBe(computeSchemaHash(epV1));
  });

  test('changes on field removal', () => {
    expect(computeSchemaHash(epV4)).not.toBe(computeSchemaHash(epV1));
  });

  test('changes on field type change', () => {
    expect(computeSchemaHash(epV3)).not.toBe(computeSchemaHash(epV1));
  });

  test('is order-invariant', () => {
    const reversed = makeEndpoint('test.ajax', { content: 'object', message: 'str', status: 'str' });
    expect(computeSchemaHash(reversed)).toBe(computeSchemaHash(epV1));
  });
});

// ---------------------------------------------------------------------------
// Schema version capture
// ---------------------------------------------------------------------------

describe('captureSchemaVersion', () => {
  test('produces valid SchemaVersion', () => {
    const v = captureSchemaVersion(epV1);
    expect(() => SchemaVersionSchema.parse(v)).not.toThrow();
    expect(v.version).toBe(1);
    expect(v.field_names).toEqual(['content', 'message', 'status']);
  });

  test('increments version from previous', () => {
    const v = captureSchemaVersion(epV1, 3);
    expect(v.version).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------

describe('detectChanges', () => {
  const prev = captureSchemaVersion(epV1);
  const curr = captureSchemaVersion(epV2);

  test('returns empty for identical schemas', () => {
    expect(detectChanges(prev, prev)).toEqual([]);
  });

  test('detects field_added', () => {
    const changes = detectChanges(prev, curr);
    expect(changes).toContainEqual(
      expect.objectContaining({ change_type: 'field_added', field: 'new_field' }),
    );
  });

  test('detects field_removed', () => {
    const pFull = captureSchemaVersion(epV1);
    const cReduced = captureSchemaVersion(epV4);
    const changes = detectChanges(pFull, cReduced);
    expect(changes).toContainEqual(
      expect.objectContaining({ change_type: 'field_removed', field: 'content' }),
    );
  });

  test('detects field_type_changed', () => {
    const pOrig = captureSchemaVersion(epV1);
    const cChanged = captureSchemaVersion(epV3);
    const changes = detectChanges(pOrig, cChanged);
    expect(changes).toContainEqual(
      expect.objectContaining({
        change_type: 'field_type_changed',
        field: 'content',
        previous: 'object',
        current: 'int',
      }),
    );
  });

  test('all detected changes parse as SchemaChange', () => {
    const changes = detectChanges(prev, curr);
    for (const c of changes) {
      expect(() => SchemaChangeSchema.parse(c)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// History persistence
// ---------------------------------------------------------------------------

describe('schema version history', () => {
  test('getLatestVersion returns null for unknown endpoint in new platform', () => {
    // Use a platform name that doesn't exist on disk
    expect(getLatestVersion('_test_nonexistent_platform_', 'summary.ajax')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Batch change detection (against empty history → no changes)
// ---------------------------------------------------------------------------

describe('detectAllChanges', () => {
  test('returns empty when no stored history exists', () => {
    // Against a platform with no stored versions, no changes can be detected
    // because there's no baseline to compare against
    const changes = detectAllChanges('_test_empty_platform_');
    expect(changes).toEqual([]);
  });
});

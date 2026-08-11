// P0005.2 Phase 1 tests — API Inventory
import { describe, expect, test } from 'vitest';
import {
  listApis,
  getApiSchema,
  getApiModules,
  getApisByModule,
  getApisByPage,
  getPageApiMap,
  getModuleBasePath,
  getApiStats,
  ApiEndpointSchema,
  ApiModuleSchema,
} from '#app/connectors/discovery/index.js';

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('API Inventory — data integrity', () => {
  test('loads all API endpoints with valid schemas', () => {
    const apis = listApis();
    expect(apis.length).toBeGreaterThan(50); // 70 in D0002

    for (const api of apis) {
      // Every endpoint must parse as ApiEndpoint
      expect(() => ApiEndpointSchema.parse(api)).not.toThrow();
      expect(api.field_count).toBe(Object.keys(api.fields).length);
    }
  });

  test('all modules parse as ApiModule', () => {
    for (const mod of getApiModules()) {
      expect(() => ApiModuleSchema.parse(mod)).not.toThrow();
      expect(mod.endpoints.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

describe('getApiSchema', () => {
  test('returns endpoint for known API', () => {
    const ep = getApiSchema('summary');
    expect(ep).not.toBeNull();
    expect(ep!.field_count).toBeGreaterThan(0);
    expect(ep!.fields).toHaveProperty('status');
  });

  test('returns null for unknown endpoint', () => {
    expect(getApiSchema('nonexistent')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Module classification
// ---------------------------------------------------------------------------

describe('getApiModules', () => {
  test('returns core modules', () => {
    const names = getApiModules().map((m) => m.name);
    expect(names).toContain('indexSummary');
    expect(names).toContain('industryMarket');
    expect(names).toContain('common');
  });

  test('each module has a base path', () => {
    for (const mod of getApiModules()) {
      if (mod.name !== 'other') {
        const path = getModuleBasePath(mod.name);
        expect(path).toBeTruthy();
      }
    }
  });
});

describe('getApisByModule', () => {
  test('indexSummary module includes trend and productTop', () => {
    const apis = getApisByModule('indexSummary');
    const names = apis.map((a) => a.name);
    // summary in api_inventory is the customer growth summary, not indexSummary
    expect(names).toContain('trend');
    expect(names).toContain('productTop');
  });

  test('unknown module returns empty array', () => {
    expect(getApisByModule('nonexistent')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Page-API mapping
// ---------------------------------------------------------------------------

describe('getApisByPage', () => {
  test('首页 maps to non-empty API list', () => {
    const apis = getApisByPage('首页');
    expect(apis.length).toBeGreaterThan(0);
  });

  test('unknown page returns empty array', () => {
    expect(getApisByPage('不存在的页面')).toEqual([]);
  });
});

describe('getPageApiMap', () => {
  test('returns record with all pages', () => {
    const map = getPageApiMap();
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(10); // 15 in D0002
    expect(map['首页']).toBeTruthy();
    const homeApis = map['首页']!;
    expect(homeApis.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

describe('getApiStats', () => {
  test('returns coherent statistics', () => {
    const stats = getApiStats();
    expect(stats.total_apis).toBeGreaterThanOrEqual(50);
    expect(stats.total_fields).toBeGreaterThan(0);
    expect(stats.modules).toBeGreaterThanOrEqual(3);
    expect(stats.module_counts['indexSummary']).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// List filtering
// ---------------------------------------------------------------------------

describe('listApis', () => {
  test('without filter returns all', () => {
    expect(listApis().length).toBeGreaterThanOrEqual(50);
  });

  test('filtered by indexSummary returns subset', () => {
    const filtered = listApis({ module: 'indexSummary' });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(listApis().length);
  });

  test('filtered by unknown module returns empty', () => {
    expect(listApis({ module: 'nonexistent' })).toEqual([]);
  });
});

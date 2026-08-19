// Historical Acquire — reads previously collected evidence from the file store.
// P0006.2: Replay is NOT a special mode. It just swaps the data source
// from Live Connector → Historical Connector. Same return shape.
//
// Strategy: try evidence store first → fall back to mock data.
// This ensures replay always produces signals, even for dates without
// previously collected evidence.

import { loadEvidence } from '#app/connectors/evidence/store.js';
import { mockJdPayload, type MockJdPayload } from '#app/connectors/jd/acquisition/mock.js';
import { acquireJdData, type AcquireResult } from '#app/connectors/jd/acquisition/index.js';
import type { AcquireFunction } from '#app/connectors/binding/executor.js';

/** Map endpoint names to evidence data types. */
const endpointToDataType = (endpoint: string): string => {
  const base = endpoint.replace(/\.(ajax|json|html?)$/, '');
  if (base.includes('summary')) return 'summary';
  if (base.includes('trend') || base.includes('hourly')) return 'trend';
  if (base.includes('product') || base.includes('top')) return 'productTop';
  return base;
};

/**
 * Create a historical acquire function that reads from evidence store
 * with mock fallback for dates without collected evidence.
 *
 * Priority:
 *   1. Evidence store (real collected data)
 *   2. Mock generator (synthetic data for any date)
 *
 * Returns the same shape as the live JD acquire → Record<endpoint, payload>.
 */
export const createHistoricalAcquire = (): AcquireFunction => {
  return async (_shopId, endpoints, options) => {
    const date = options?.date ?? new Date().toISOString().slice(0, 10);
    const data: Record<string, unknown> = {};

    for (const endpoint of endpoints) {
      const dataType = endpointToDataType(endpoint);
      // Try evidence store first
      const loaded = loadEvidence('jd', date, dataType);
      if (loaded) {
        data[endpoint] = loaded.data;
      }
    }

    // If no evidence was found for any endpoint, fall back to mock
    if (Object.keys(data).length === 0) {
      const mock = mockJdPayload(date);
      for (const endpoint of endpoints) {
        const dataType = endpointToDataType(endpoint);
        const key = dataType as keyof MockJdPayload;
        if (key in mock && mock[key] !== undefined) {
          data[endpoint] = mock[key] as unknown;
        }
      }
    }

    return data;
  };
};

/**
 * Create a local-first → live-on-miss acquire function.
 * P0009 correction: operational capability execution consumes already-collected
 * local Evidence first; it only triggers real JD CDP acquisition for endpoints
 * whose local evidence is missing for the target date.
 *
 * Priority per endpoint:
 *   1. Evidence store (real collected data)
 *   2. Live CDP acquisition (single-date, only for the missing endpoints)
 *
 * Same return shape as the live JD acquire → Record<endpoint, payload>.
 * `liveAcquire` is injectable for tests (defaults to the real acquireJdData).
 */
export const createLocalFirstLiveAcquire = (
  liveAcquire: (opts: Parameters<typeof acquireJdData>[0]) => Promise<AcquireResult> = acquireJdData,
): AcquireFunction => {
  return async (shopId, endpoints, options) => {
    const date = options?.date ?? new Date().toISOString().slice(0, 10);
    const data: Record<string, unknown> = {};
    const missing: string[] = [];

    // Pass 1 — local evidence store (real collected data).
    for (const endpoint of endpoints) {
      const dataType = endpointToDataType(endpoint);
      // The JD connector persists only its core data types (summary/trend/productTop).
      // Endpoints that map to any other data type are never resolvable from the
      // store — skip them so they don't re-trigger live CDP on every call.
      if (dataType !== 'summary' && dataType !== 'trend' && dataType !== 'productTop' &&
          dataType !== 'getProductAnalysisData') {
        continue;
      }
      const loaded = loadEvidence('jd', date, dataType);
      if (loaded) {
        data[endpoint] = loaded.data;
      } else {
        missing.push(endpoint);
      }
    }

    // Pass 2 — live CDP only for missing endpoints (single-date acquisition).
    // Fail loudly on CDP failure: an evidence miss must not be silently counted
    // as a completed acquisition (Consolidation Pass 1 — honest completion).
    if (missing.length > 0) {
      const live = await liveAcquire({ shopId, mock: false, fromDate: date, toDate: date });
      if (live.success && live.rawPayload) {
        const raw = live.rawPayload as Record<string, unknown>;
        for (const endpoint of missing) {
          const dataType = endpointToDataType(endpoint);
          if (dataType in raw) {
            data[endpoint] = raw[dataType];
          }
        }
      } else {
        throw new Error(live.error ?? `JD CDP acquisition failed for ${date}`);
      }
    }

    return data;
  };
};

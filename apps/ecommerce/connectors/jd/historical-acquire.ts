// Historical Acquire — reads previously collected evidence from the file store.
// P0006.2: Replay is NOT a special mode. It just swaps the data source
// from Live Connector → Historical Connector. Same return shape.
//
// Strategy: try evidence store first → fall back to mock data.
// This ensures replay always produces signals, even for dates without
// previously collected evidence.

import { loadEvidence } from '#app/connectors/evidence/store.js';
import { mockJdPayload, type MockJdPayload } from '#app/connectors/jd/acquisition/mock.js';
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

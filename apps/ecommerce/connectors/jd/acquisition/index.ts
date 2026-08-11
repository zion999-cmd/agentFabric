// JD acquisition facade — the single entry point for acquiring JD 商智 data.
// Dispatches to mock or CDP mode based on options.
//
// P0005.4: Optional blueprint parameter enables capability-driven acquisition.
// When blueprint is provided, endpoint selection delegates to the binding layer.
// Without blueprint, existing hardcoded behavior is preserved (backward compat).

import { mockJdPayload, mockJdData } from './mock.js';
import { acquireJdViaCDP, isCdpAvailable } from './cdp-client.js';
import type { CdpAcquireResult } from './cdp-client.js';
import type { ParsedJdData } from '../parsers/index.js';
import { parseJdPayload } from '../parsers/index.js';
import type { BoundCapabilityModel } from '#app/connectors/binding/index.js';

export interface AcquireOptions {
  /** Shop ID (default: jd_shop_001) */
  shopId?: string;
  /** Target date for single-day mock (ISO, default: today) */
  date?: string;
  /** Use mock data (default: true) — set false for live CDP */
  mock?: boolean;
  /** CDP port (default: 9222) */
  cdpPort?: number;
  /** Start date for CDP multi-day capture (ISO, default: 30 days ago) */
  fromDate?: string;
  /** End date for CDP multi-day capture (ISO, default: yesterday) */
  toDate?: string;
  /** Optional blueprint — when provided, endpoint selection comes from the blueprint */
  blueprint?: BoundCapabilityModel;
  /** Optional capability filter (e.g. ['daily_summary']) — only meaningful with blueprint */
  capabilities?: string[];
}

export interface AcquireResult {
  success: boolean;
  /** Parsed data — single day for mock, first day for CDP multi-day */
  data?: ParsedJdData;
  /** All parsed days (CDP multi-day capture) */
  allData?: ParsedJdData[];
  /** Raw payload for evidence */
  rawPayload?: Record<string, unknown>;
  /** All raw payloads (CDP multi-day) */
  allRawPayloads?: Record<string, unknown>[];
  error?: string;
  method: 'mock' | 'cdp';
  cdpAvailable?: boolean;
  /** True if the acquisition used a blueprint-driven plan */
  blueprintDriven?: boolean;
}

/**
 * Acquire JD 商智 data.
 * - Mock mode: generates random sample data (dev/test/CI)
 * - CDP mode: captures real data from Chrome with logged-in 商智 session
 *
 * When `blueprint` is provided, the blueprint's endpoint list is used to determine
 * which APIs to call (capability-driven). Without blueprint, existing hardcoded
 * behavior is preserved.
 */
export const acquireJdData = async (
  options: AcquireOptions = {},
): Promise<AcquireResult> => {
  const { date, mock = true, cdpPort = 9222, fromDate, toDate, blueprint } = options;

  // Determine endpoint filter from blueprint if provided
  const endpointFilter = blueprint
    ? blueprint.parser_plan.rules
        .filter((r) => r.fields_to_parse.length > 0)
        .map((r) => r.endpoint)
    : undefined;

  if (mock) {
    const payload = mockJdPayload(date);
    const parsed = parseJdPayload(payload as unknown as Record<string, unknown>);
    return {
      success: true,
      data: parsed,
      rawPayload: payload as unknown as Record<string, unknown>,
      method: 'mock',
      ...(blueprint ? { blueprintDriven: true } : {}),
    };
  }

  // ── Live CDP mode ──
  const available = await isCdpAvailable(cdpPort);
  if (!available) {
    return {
      success: false,
      error: `Chrome CDP not available on port ${cdpPort}. Start Chrome with --remote-debugging-port=${cdpPort}`,
      method: 'cdp',
      cdpAvailable: false,
    };
  }

  const cdpOpts: { cdpPort: number; fromDate?: string; toDate?: string; endpointFilter?: string[] } = { cdpPort };
  if (fromDate) cdpOpts.fromDate = fromDate;
  if (toDate) cdpOpts.toDate = toDate;
  if (endpointFilter) cdpOpts.endpointFilter = endpointFilter;
  const result: CdpAcquireResult = await acquireJdViaCDP(cdpOpts);

  if (!result.success || !result.payloads || result.payloads.length === 0) {
    return {
      success: false,
      error: result.errors?.[0] ?? 'CDP acquisition returned no data',
      method: 'cdp',
      cdpAvailable: result.cdpAvailable,
    };
  }

  // Parse all payloads
  const allData = result.payloads.map((p) =>
    parseJdPayload(p as unknown as Record<string, unknown>),
  );
  const allRawPayloads = result.payloads.map((p) => p as unknown as Record<string, unknown>);

  const acquireResult: AcquireResult = {
    success: true,
    allData,
    allRawPayloads,
    method: 'cdp',
    cdpAvailable: true,
    ...(blueprint ? { blueprintDriven: true } : {}),
  };
  const firstData = allData[0];
  const firstRaw = allRawPayloads[0];
  if (firstData && firstRaw) {
    acquireResult.data = firstData;
    acquireResult.rawPayload = firstRaw;
  }
  return acquireResult;
};

// Re-export
export { mockJdPayload, mockJdData, acquireJdViaCDP, isCdpAvailable };

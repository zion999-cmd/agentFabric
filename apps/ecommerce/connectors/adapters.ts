// Platform collector adapters. Each adapter fetches platform metrics and emits
// SignalCollectorInput records (validated + normalized downstream).
//
// For the reboot, adapters start from a cached/raw platform payload (the agentCMS
// daily_records.json pattern). Full CDP cookie-harvesting onboarding is documented
// in ./README.md as a follow-up; the business concept (extract shop/overview/
// trends/top_products/channel_analysis/competitors) is preserved here.

import type {
  EnterpriseSignalType,
  SignalCollectorInput,
  SignalSourcePlatform,
} from '#shared/schemas/signal.js';
import { uuid } from '#shared/utils/crypto.js';
import { nowIso } from '#shared/utils/time.js';
import type { CollectOptions } from '#shared/schemas/collector.js';

export interface CollectorAdapter {
  readonly source: SignalSourcePlatform;
  readonly supportedSignalTypes: readonly EnterpriseSignalType[];
  collect(options: CollectOptions): Promise<SignalCollectorInput[]>;
}

/** Build a single collector input from a raw metrics blob. */
const buildInput = (
  source: SignalSourcePlatform,
  shopId: string,
  shopName: string | undefined,
  signalType: EnterpriseSignalType,
  metrics: Record<string, unknown>,
  rawPayload?: Record<string, unknown>,
): SignalCollectorInput => ({
  signal_id: uuid(),
  source,
  shop_id: shopId,
  ...(shopName ? { shop_name: shopName } : {}),
  signal_type: signalType,
  priority: 0.5,
  timestamp: nowIso(),
  metrics: metrics as SignalCollectorInput['metrics'],
  ...(rawPayload ? { raw_payload: rawPayload } : {}),
  trace_id: uuid(),
  confidence: 0.9,
});

/**
 * JD adapter. In production this would call JD's merchant SPA API
 * (szgateway.jd.com) via a harvested cookie header. Here it accepts a
 * pre-fetched raw payload and emits hourly_sales + hourly_traffic signals.
 */
export const createJdAdapter = (
  fetchPayload: (shopId: string, mock: boolean) => Promise<Record<string, unknown>>,
): CollectorAdapter => ({
  source: 'jd',
  supportedSignalTypes: ['hourly_sales', 'hourly_traffic', 'daily_summary'],
  collect: async (options: CollectOptions): Promise<SignalCollectorInput[]> => {
    const raw = await fetchPayload(options.shopId, options.mock);
    const shopName = typeof raw['shopName'] === 'string' ? raw['shopName'] : undefined;
    const inputs: SignalCollectorInput[] = [];
    if (raw['hourly_sales'] !== undefined) {
      inputs.push(
        buildInput('jd', options.shopId, shopName, 'hourly_sales', raw['hourly_sales'] as Record<string, unknown>, raw),
      );
    }
    if (raw['hourly_traffic'] !== undefined) {
      inputs.push(
        buildInput('jd', options.shopId, shopName, 'hourly_traffic', raw['hourly_traffic'] as Record<string, unknown>, raw),
      );
    }
    return inputs;
  },
});

/** Tmall adapter (same shape, different source + alias mapping downstream). */
export const createTmallAdapter = (
  fetchPayload: (shopId: string, mock: boolean) => Promise<Record<string, unknown>>,
): CollectorAdapter => ({
  source: 'tmall',
  supportedSignalTypes: ['hourly_sales', 'hourly_traffic', 'daily_summary'],
  collect: async (options: CollectOptions): Promise<SignalCollectorInput[]> => {
    const raw = await fetchPayload(options.shopId, options.mock);
    const shopName = typeof raw['shopName'] === 'string' ? raw['shopName'] : undefined;
    const inputs: SignalCollectorInput[] = [];
    if (raw['hourly_sales'] !== undefined) {
      inputs.push(
        buildInput('tmall', options.shopId, shopName, 'hourly_sales', raw['hourly_sales'] as Record<string, unknown>, raw),
      );
    }
    return inputs;
  },
});

/** Mock payload provider for tests/dev (no network). */
export const mockPayload = async (): Promise<Record<string, unknown>> => ({
  shopName: 'mock-shop',
  hourly_sales: { totalGMV: 1234.5, orderCount: 30 },
  hourly_traffic: { uniqueVisitors: 800, showCount: 5000 },
});

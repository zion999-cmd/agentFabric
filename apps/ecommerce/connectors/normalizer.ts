// Cross-platform signal normalizer. Ports the JD/Tmall alias maps verbatim.
// Maps platform-specific raw field names into the canonical EnterpriseSignalPayload.

import type {
  EnterpriseSignal,
  EnterpriseSignalPayload,
  EnterpriseSignalType,
  SignalCollectorInput,
  SignalDirection,
  SignalUnit,
} from '#shared/schemas/signal.js';
import { fingerprint, uuid } from '#shared/utils/crypto.js';
import { nowIso } from '#shared/utils/time.js';

const asNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const pick = (raw: Record<string, unknown>, keys: readonly string[]): number | undefined => {
  for (const k of keys) {
    if (k in raw) {
      const n = asNumber(raw[k]);
      if (n !== undefined) return n;
    }
  }
  return undefined;
};

/** Map a raw payload into canonical metrics using a field-alias spec. */
const mapBySpec = (
  raw: Record<string, unknown>,
  spec: Readonly<Record<string, readonly string[]>>,
): EnterpriseSignalPayload => {
  const out: Record<string, number> = {};
  for (const [canonical, aliases] of Object.entries(spec)) {
    const v = pick(raw, aliases);
    if (v !== undefined) out[canonical] = v;
  }
  return out as unknown as EnterpriseSignalPayload;
};

// P0005.4: JD_SPEC / TMALL_SPEC remain as authoritative fallbacks.
// When the binding layer is initialized, it can override via loadNormalizerPlan.
// These hand-written specs guarantee correctness for business-critical metrics.

const JD_SPEC: Readonly<Record<string, readonly string[]>> = {
  gmv: ['gmv', 'totalGMV', 'turnover'],
  orders: ['orders', 'orderCount', 'totalOrders'],
  refunds: ['refunds', 'returnCount'],
  roi: ['roi', 'productionRatio'],
  uv: ['uv', 'uniqueVisitors'],
  click_rate: ['clickRate', 'ctr', 'click_rate'],
  cart_adds: ['cartAdds', 'cart_adds'],
  ad_spend: ['adSpend', 'ad_spend'],
  ad_orders: ['adOrders', 'ad_orders'],
  cpa: ['cpa'],
  cpc: ['cpc'],
  ctr: ['ctr'],
  cvr: ['cvr', 'conversionRate'],
  impressions: ['impressions', 'showCount'],
  clicks: ['clicks', 'clickCount'],
};

const TMALL_SPEC: Readonly<Record<string, readonly string[]>> = {
  gmv: ['gmv', 'tradeAmt', 'payAmt'],
  orders: ['orders', 'payOrdCnt'],
  refunds: ['refunds', 'refundOrdCnt'],
  roi: ['roi', 'rol'],
  uv: ['uv', 'uvCnt'],
  click_rate: ['clickRate', 'ctr', 'click_rate'],
  cart_adds: ['cartAdds', 'cart_adds'],
  ad_spend: ['adSpend', 'ad_spend'],
};

/** Map JD native field names to canonical metrics. */
export const normalizeJdMetrics = (raw: Record<string, unknown>): EnterpriseSignalPayload =>
  mapBySpec(raw, JD_SPEC);

/** Map Tmall native field names to canonical metrics. */
export const normalizeTmallMetrics = (raw: Record<string, unknown>): EnterpriseSignalPayload =>
  mapBySpec(raw, TMALL_SPEC);

/** Pick the platform-specific normalizer. */
export const normalizeMetrics = (
  source: string,
  raw: Record<string, unknown>,
): EnterpriseSignalPayload => {
  if (source === 'jd') return normalizeJdMetrics(raw);
  if (source === 'tmall') return normalizeTmallMetrics(raw);
  // Fallback: assume canonical names already.
  return raw as EnterpriseSignalPayload;
};

const extractPrimaryValue = (
  signalType: EnterpriseSignalType,
  metrics: EnterpriseSignalPayload,
): number => {
  switch (signalType) {
    case 'hourly_sales':
    case 'daily_summary':
      return metrics.gmv ?? metrics.orders ?? 0;
    case 'hourly_traffic':
      return metrics.uv ?? metrics.impressions ?? 0;
    case 'campaign_performance':
      return metrics.roi ?? metrics.ad_spend ?? 0;
    case 'anomaly_alert':
      return 1;
  }
};

const inferUnit = (signalType: EnterpriseSignalType): SignalUnit => {
  switch (signalType) {
    case 'hourly_sales':
    case 'daily_summary':
      return 'currency';
    case 'hourly_traffic':
      return 'count';
    case 'campaign_performance':
      return 'ratio';
    case 'anomaly_alert':
      return 'boolean';
  }
};

const inferEntityType = (
  signalType: EnterpriseSignalType,
): EnterpriseSignal['entity_type'] => {
  if (signalType === 'campaign_performance') return 'market';
  if (signalType === 'anomaly_alert') return 'market';
  return 'product';
};

const inferWindow = (signalType: EnterpriseSignalType): string => {
  switch (signalType) {
    case 'hourly_sales':
    case 'hourly_traffic':
      return '1h';
    case 'daily_summary':
      return '24h';
    case 'campaign_performance':
      return 'campaign_duration';
    case 'anomaly_alert':
      return 'event';
  }
};

const inferDirection = (signalType: EnterpriseSignalType): SignalDirection =>
  signalType === 'anomaly_alert' ? 'up' : 'flat';

/** Normalize a collector input into a persisted EnterpriseSignal. */
export const normalizeSignal = (input: SignalCollectorInput): EnterpriseSignal => {
  const metrics = normalizeMetrics(input.source, input.metrics as Record<string, unknown>);
  const signalType = input.signal_type;
  const transformHash = fingerprint({
    version: 'signal-collector-v1',
    source: input.source,
    shop_id: input.shop_id,
    signal_type: signalType,
    timestamp: input.timestamp,
  });
  const ingestedAt = nowIso();
  const signal: EnterpriseSignal = {
    signal_id: input.signal_id,
    entity_type: inferEntityType(signalType),
    entity_id: input.shop_id,
    signal_name: signalType,
    signal_value: extractPrimaryValue(signalType, metrics),
    signal_unit: inferUnit(signalType),
    signal_direction: inferDirection(signalType),
    weight: input.priority ?? 0.5,
    confidence: input.confidence ?? 0.9,
    source: {
      platform: input.source,
      dataset: 'enterprise',
      ingested_at: ingestedAt,
    },
    window: inferWindow(signalType),
    observed_at: input.timestamp,  // P0006.1.1: business observation time
    lifecycle: {
      version: 1,
      status: 'active',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    trace: { pipeline_run_id: uuid(), transform_hash: transformHash },
    metrics,
  };
  if (input.raw_payload !== undefined) { signal.raw_payload = input.raw_payload; }
  if (input.trace_id !== undefined) { signal.collector_trace_id = input.trace_id; }
  return signal;
};

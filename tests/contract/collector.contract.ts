import { describe, expect, test } from 'vitest';
import {
  normalizeJdMetrics,
  normalizeTmallMetrics,
  normalizeSignal,
} from '#app/connectors/normalizer.js';
import type { SignalCollectorInput } from '#shared/schemas/signal.js';
import { uuid } from '#shared/utils/crypto.js';

const baseInput = (overrides: Partial<SignalCollectorInput>): SignalCollectorInput => ({
  signal_id: uuid(),
  source: 'jd',
  shop_id: 'jd_shop_001',
  signal_type: 'hourly_sales',
  priority: 0.5,
  timestamp: '2026-06-14T13:00:00.000Z',
  metrics: {},
  trace_id: uuid(),
  confidence: 0.9,
  ...overrides,
});

describe('JD metric normalization (golden vector)', () => {
  test('maps totalGMV/turnover -> gmv', () => {
    const m = normalizeJdMetrics({ totalGMV: 1000, turnover: 999 });
    expect(m.gmv).toBe(1000);
  });

  test('maps orderCount -> orders', () => {
    const m = normalizeJdMetrics({ orderCount: 42 });
    expect(m.orders).toBe(42);
  });

  test('maps uniqueVisitors -> uv', () => {
    const m = normalizeJdMetrics({ uniqueVisitors: 800 });
    expect(m.uv).toBe(800);
  });

  test('coerces numeric strings', () => {
    const m = normalizeJdMetrics({ totalGMV: '1234.5' });
    expect(m.gmv).toBe(1234.5);
  });
});

describe('Tmall metric normalization (golden vector)', () => {
  test('maps tradeAmt/payAmt -> gmv', () => {
    const m = normalizeTmallMetrics({ tradeAmt: 500, payAmt: 450 });
    expect(m.gmv).toBe(500);
  });

  test('maps payOrdCnt -> orders', () => {
    const m = normalizeTmallMetrics({ payOrdCnt: 12 });
    expect(m.orders).toBe(12);
  });
});

describe('normalizeSignal (golden vector)', () => {
  test('hourly_sales -> currency unit, primary value = gmv', () => {
    const sig = normalizeSignal(
      baseInput({ signal_type: 'hourly_sales', metrics: { gmv: 1234.5, orders: 30 } }),
    );
    expect(sig.signal_unit).toBe('currency');
    expect(sig.signal_value).toBe(1234.5);
    expect(sig.window).toBe('1h');
    expect(sig.lifecycle.status).toBe('active');
  });

  test('hourly_traffic -> count unit, primary value = uv', () => {
    const sig = normalizeSignal(
      baseInput({ signal_type: 'hourly_traffic', metrics: { uv: 800, impressions: 5000 } }),
    );
    expect(sig.signal_unit).toBe('count');
    expect(sig.signal_value).toBe(800);
  });

  test('anomaly_alert -> boolean unit, direction up', () => {
    const sig = normalizeSignal(baseInput({ signal_type: 'anomaly_alert', metrics: {} }));
    expect(sig.signal_unit).toBe('boolean');
    expect(sig.signal_value).toBe(1);
    expect(sig.signal_direction).toBe('up');
  });

  test('daily_summary -> 24h window', () => {
    const sig = normalizeSignal(baseInput({ signal_type: 'daily_summary', metrics: { gmv: 100 } }));
    expect(sig.window).toBe('24h');
  });

  test('JD alias flows through normalizeSignal', () => {
    const sig = normalizeSignal(
      baseInput({ metrics: { totalGMV: 2000, orderCount: 5 } }),
    );
    expect(sig.metrics.gmv).toBe(2000);
    expect(sig.metrics.orders).toBe(5);
  });
});

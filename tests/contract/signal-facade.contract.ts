import { describe, expect, test } from 'vitest';
import { computeSignals } from '#app/analysis/metrics/pipeline.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { canonicalNow, canonicalOrders, canonicalProducts } from '../fixtures/canonical-product.js';

describe('signal-facade contract (golden vector)', () => {
  const { signals } = computeSignals(
    { products: canonicalProducts, orders: canonicalOrders },
    { now: canonicalNow(), windowDays: [7] },
  );

  test('emits 9 base signals per product per window', () => {
    expect(signals).toHaveLength(canonicalProducts.length * 9);
  });

  test('signal names follow base_window convention', () => {
    const names = new Set(signals.map((s) => s.signal_name));
    expect(names.has('sales_growth_7d')).toBe(true);
    expect(names.has('stockout_risk_7d')).toBe(true);
    expect(names.has('return_risk_score_7d')).toBe(true);
  });

  test('P_A has strong positive sales growth', () => {
    const sales = signals.find((s) => s.entity_id === 'P_A' && s.signal_name === 'sales_growth_7d');
    expect(sales).toBeDefined();
    expect(sales?.signal_value).toBeGreaterThan(0.5);
    expect(sales?.signal_direction).toBe('up');
  });

  test('P_C is out of stock -> stockout_risk 1', () => {
    const risk = signals.find((s) => s.entity_id === 'P_C' && s.signal_name === 'stockout_risk_7d');
    expect(risk?.signal_value).toBe(1);
    expect(risk?.signal_direction).toBe('up');
  });

  test('P_C has return risk > 0 (cancelled orders)', () => {
    const ret = signals.find((s) => s.entity_id === 'P_C' && s.signal_name === 'return_risk_score_7d');
    expect(ret?.signal_value).toBeGreaterThan(0);
  });

  test('all signals are active with future expiry', () => {
    for (const s of signals) {
      expect(s.lifecycle.status).toBe('active');
      expect(s.lifecycle.expires_at).not.toBeNull();
    }
  });

  test('weights resolve from defaults', () => {
    const sales = signals.find((s) => s.signal_name === 'sales_growth_7d');
    expect(sales?.weight).toBe(0.9);
    const risk = signals.find((s) => s.signal_name === 'stockout_risk_7d');
    expect(risk?.weight).toBe(0.85);
  });

  test('façade compute returns the same signals', () => {
    const { signals: facadeSignals } = SignalFacade.compute(
      { products: canonicalProducts, orders: canonicalOrders },
      { now: canonicalNow(), windowDays: [7] },
    );
    expect(facadeSignals).toHaveLength(signals.length);
  });
});

describe('signal-facade multi-window', () => {
  test('produces signals for each window', () => {
    const { signals } = computeSignals(
      { products: canonicalProducts, orders: canonicalOrders },
      { now: canonicalNow(), windowDays: [3, 7, 14] },
    );
    const paWindows = new Set(
      signals.filter((s) => s.entity_id === 'P_A' && s.signal_name.startsWith('sales_growth')).map((s) => s.window),
    );
    expect(paWindows.size).toBe(3);
  });
});

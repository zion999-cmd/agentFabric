import { describe, expect, test } from 'vitest';
import { rankProducts } from '#app/analysis/decision/engine.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { getProfile } from '#app/analysis/decision/profiles.js';
import { computeSignals } from '#app/analysis/metrics/pipeline.js';
import { canonicalNow, canonicalOrders, canonicalProducts } from '../fixtures/canonical-product.js';

const signals = computeSignals(
  { products: canonicalProducts, orders: canonicalOrders },
  { now: canonicalNow(), windowDays: [7] },
).signals;

describe('ranking-facade contract (golden vector)', () => {
  test('ranks all products', () => {
    const results = rankProducts({ signals, profile: getProfile('operator_mode') });
    expect(results).toHaveLength(canonicalProducts.length);
  });

  test('P_A outranks P_B and P_C in growth_discovery', () => {
    const results = rankProducts({ signals, profile: getProfile('growth_discovery') });
    const rankOf = (id: string) => results.findIndex((r) => r.entity_id === id);
    expect(rankOf('P_A')).toBeLessThan(rankOf('P_B'));
    expect(rankOf('P_A')).toBeLessThan(rankOf('P_C'));
  });

  test('P_C (out of stock) ranks last in operator_mode', () => {
    const results = rankProducts({ signals, profile: getProfile('operator_mode') });
    expect(results[results.length - 1]?.entity_id).toBe('P_C');
  });

  test('every result has explainability + decision trace', () => {
    const results = rankProducts({ signals, profile: getProfile('sales_leaderboard') });
    for (const r of results) {
      expect(r.explainability.summary.length).toBeGreaterThan(0);
      expect(r.decision_trace.top_signals.length).toBeLessThanOrEqual(5);
      expect(r.decision_trace.risk_signals.length).toBeLessThanOrEqual(5);
      expect(r.decision_trace.evidence.length).toBeLessThanOrEqual(8);
      expect(r.decision_trace.ranking_contribution).toHaveLength(5);
    }
  });

  test('overall score is in [0,1]', () => {
    const results = rankProducts({ signals, profile: getProfile('operator_mode') });
    for (const r of results) {
      expect(r.overall_score).toBeGreaterThanOrEqual(0);
      expect(r.overall_score).toBeLessThanOrEqual(1);
    }
  });

  test('façade rankByProfile matches engine', () => {
    const facadeResults = RankingFacade.rankByProfile(signals, 'operator_mode');
    const engineResults = rankProducts({ signals, profile: getProfile('operator_mode') });
    expect(facadeResults.map((r) => r.entity_id)).toEqual(engineResults.map((r) => r.entity_id));
  });
});

describe('ranking memory adjustments', () => {
  test('no-op when no adjustments', () => {
    const base = rankProducts({ signals, profile: getProfile('operator_mode') });
    const none = rankProducts({ signals, profile: getProfile('operator_mode'), adjustments: [] });
    expect(none.map((r) => r.overall_score)).toEqual(base.map((r) => r.overall_score));
  });

  test('cap_score on stockout_risk lowers P_C further', () => {
    const base = rankProducts({ signals, profile: getProfile('operator_mode') });
    const capped = rankProducts({
      signals,
      profile: getProfile('operator_mode'),
      adjustments: [
        { signal_name: 'stockout_risk_7d', action: 'cap_score', magnitude: 0.1, reason: 'test', memory_id: 'm1' },
      ],
    });
    const baseC = base.find((r) => r.entity_id === 'P_C')?.overall_score ?? 0;
    const cappedC = capped.find((r) => r.entity_id === 'P_C')?.overall_score ?? 0;
    expect(cappedC).toBeLessThanOrEqual(baseC);
  });
});

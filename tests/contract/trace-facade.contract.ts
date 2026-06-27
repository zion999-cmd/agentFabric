import { describe, expect, test } from 'vitest';
import { buildTrace } from '#app/analysis/explainability/builder.js';
import { computeTrustScore } from '#app/analysis/explainability/trust.js';
import { detectContradictions } from '#app/analysis/explainability/contradictions.js';
import { computeSignals } from '#app/analysis/metrics/pipeline.js';
import { rankProducts } from '#app/analysis/decision/engine.js';
import { getProfile } from '#app/analysis/decision/profiles.js';
import { canonicalNow, canonicalOrders, canonicalProducts } from '../fixtures/canonical-product.js';
import type { BusinessConclusion, ReplayConsistency } from '#shared/schemas/trace.js';

const signals = computeSignals(
  { products: canonicalProducts, orders: canonicalOrders },
  { now: canonicalNow(), windowDays: [7] },
).signals;
const ranked = rankProducts({ signals, profile: getProfile('operator_mode') });
const topRanking = ranked[0]!;
const topSignals = signals.filter((s) => s.entity_id === topRanking.entity_id);

const emptyReplay: ReplayConsistency = {
  days_present: 0,
  avg_rank: 0,
  rank_volatility: 0,
  top1_count: 0,
};

const supportedConclusion: BusinessConclusion = {
  entity_id: topRanking.entity_id,
  entity_name: 'top product',
  statement: '该商品是运营推荐榜首',
  profile: 'operator_mode',
  date: '2026-06-14T00:00:00.000Z',
};

describe('trust score (golden vector)', () => {
  test('supported branch formula', () => {
    const trust = computeTrustScore({
      isSupported: true,
      confidence: 0.8,
      coverage: 0.8,
      signalCount: 9,
      contradictionCount: 0,
    });
    // 0.8*0.5 + 0.8*0.3 + 1*0.2 = 0.4 + 0.24 + 0.2 = 0.84
    expect(trust).toBeCloseTo(0.84, 5);
  });

  test('unsupported branch formula', () => {
    const trust = computeTrustScore({
      isSupported: false,
      confidence: 0.8,
      coverage: 0.8,
      signalCount: 9,
      contradictionCount: 2,
    });
    // max(0, 0.8*0.3 - 2*0.15) = max(0, 0.24 - 0.3) = 0
    expect(trust).toBe(0);
  });

  test('unsupported with few contradictions > 0', () => {
    const trust = computeTrustScore({
      isSupported: false,
      confidence: 0.9,
      coverage: 0.9,
      signalCount: 9,
      contradictionCount: 1,
    });
    // max(0, 0.27 - 0.15) = 0.12
    expect(trust).toBeCloseTo(0.12, 5);
  });
});

describe('contradictions', () => {
  test('no contradictions when ranking is healthy', () => {
    const cs = detectContradictions({
      entityId: topRanking.entity_id,
      ranking: topRanking,
      signals: topSignals,
      memoryAdjustments: [],
    });
    expect(cs).toHaveLength(0);
  });

  test('entity not in ranking -> contradiction', () => {
    const cs = detectContradictions({
      entityId: 'MISSING',
      ranking: null,
      signals: [],
      memoryAdjustments: [],
    });
    expect(cs).toContain('entity_not_in_ranking');
  });

  test('low confidence -> contradiction', () => {
    const cs = detectContradictions({
      entityId: topRanking.entity_id,
      ranking: { ...topRanking, confidence: 0.1 },
      signals: topSignals,
      memoryAdjustments: [],
    });
    expect(cs).toContain('low_confidence');
  });

  test('low coverage -> contradiction', () => {
    const cs = detectContradictions({
      entityId: topRanking.entity_id,
      ranking: { ...topRanking, coverage: 0.2 },
      signals: topSignals,
      memoryAdjustments: [],
    });
    expect(cs).toContain('low_coverage');
  });
});

describe('buildTrace (golden vector)', () => {
  test('supported conclusion has high trust', () => {
    const trace = buildTrace({
      conclusion: supportedConclusion,
      ranking: topRanking,
      signals: topSignals,
      memories: [],
      memoryAdjustments: [],
      replayConsistency: emptyReplay,
      rank: 1,
    });
    expect(trace.alignment.is_supported).toBe(true);
    expect(trace.alignment.trust_score).toBeGreaterThan(0.5);
    expect(trace.system_truth.ranking).not.toBeNull();
    expect(trace.system_truth.signals.length).toBe(topSignals.length);
  });

  test('unsupported conclusion has lower trust', () => {
    const trace = buildTrace({
      conclusion: { ...supportedConclusion, entity_id: 'MISSING' },
      ranking: null,
      signals: [],
      memories: [],
      memoryAdjustments: [],
      replayConsistency: emptyReplay,
    });
    expect(trace.alignment.is_supported).toBe(false);
    expect(trace.alignment.contradictions.length).toBeGreaterThan(0);
    expect(trace.alignment.trust_score).toBeLessThan(0.5);
  });
});

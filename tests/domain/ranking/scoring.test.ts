import { describe, expect, test } from 'vitest';
import {
  computeCoverage,
  computeOverall,
  growthToScore,
  lifecycleStatusToScore,
  meanConfidence,
  riskToScore,
} from '#app/analysis/decision/scoring.js';
import type { ComponentScores, RankingWeights } from '#shared/schemas/ranking.js';

describe('growthToScore', () => {
  test('maps [-1,1] -> [0,1]', () => {
    expect(growthToScore([-1])).toBe(0);
    expect(growthToScore([0])).toBe(0.5);
    expect(growthToScore([1])).toBe(1);
  });

  test('averages multiple values', () => {
    expect(growthToScore([-1, 1])).toBe(0.5);
  });
});

describe('riskToScore', () => {
  test('high risk -> low score', () => {
    expect(riskToScore([1])).toBe(0);
    expect(riskToScore([0])).toBe(1);
  });

  test('clamps values first', () => {
    expect(riskToScore([2])).toBe(0); // clamp(2)=1 -> 1-1=0
  });
});

describe('lifecycleStatusToScore', () => {
  test('active=1, stale=0.4, deprecated=0.1', () => {
    expect(lifecycleStatusToScore('active')).toBe(1);
    expect(lifecycleStatusToScore('stale')).toBe(0.4);
    expect(lifecycleStatusToScore('deprecated')).toBe(0.1);
  });
});

describe('computeCoverage', () => {
  test('no signals -> 0', () => {
    expect(
      computeCoverage({
        growth: [],
        competition: [],
        supply_stability: [],
        lifecycle: [],
        quality: [],
      }),
    ).toBe(0);
  });

  test('all components covered -> 1', () => {
    const sig = [{ signal_name: 'x' }] as never;
    expect(
      computeCoverage({
        growth: sig,
        competition: sig,
        supply_stability: sig,
        lifecycle: sig,
        quality: sig,
      }),
    ).toBe(1);
  });
});

describe('computeOverall', () => {
  const scores: ComponentScores = {
    growth: 0.8,
    competition: 0.6,
    supply_stability: 0.7,
    lifecycle: 0.9,
    quality: 0.6,
  };
  const weights: RankingWeights = {
    growth: 0.6,
    competition: 0.15,
    supply_stability: 0.1,
    lifecycle: 0.05,
    quality: 0.1,
  };

  test('dampened by confidence and coverage', () => {
    const fullConfidence = computeOverall(scores, weights, 1, 1);
    const lowConfidence = computeOverall(scores, weights, 0, 0);
    expect(fullConfidence).toBeGreaterThan(lowConfidence);
  });

  test('clamped to [0,1]', () => {
    const overall = computeOverall(scores, weights, 1, 1);
    expect(overall).toBeGreaterThanOrEqual(0);
    expect(overall).toBeLessThanOrEqual(1);
  });
});

describe('meanConfidence', () => {
  test('empty -> 0', () => {
    expect(meanConfidence([])).toBe(0);
  });
});

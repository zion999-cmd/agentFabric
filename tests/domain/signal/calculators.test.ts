import { describe, expect, test } from 'vitest';
import {
  adDensity,
  confidenceBySample,
  creatorCoverage,
  directionByDelta,
  directionByRisk,
  growthRate,
  priceCompetitionIndex,
  returnRiskScore,
  stockoutRiskScore,
} from '#app/analysis/metrics/calculators/index.js';

describe('growthRate', () => {
  test('normal growth', () => {
    expect(growthRate(150, 100)).toBe(0.5);
  });

  test('decline', () => {
    expect(growthRate(50, 100)).toBe(-0.5);
  });

  test('previous <= 0 with current > 0 -> 1 (breakout)', () => {
    expect(growthRate(10, 0)).toBe(1);
  });

  test('previous <= 0 with current 0 -> 0', () => {
    expect(growthRate(0, 0)).toBe(0);
  });

  test('clamped to [-1, 1]', () => {
    expect(growthRate(1000, 1)).toBe(1);
    expect(growthRate(0, 1000)).toBe(-1);
  });
});

describe('stockoutRiskScore', () => {
  test('out of stock -> 1', () => {
    expect(stockoutRiskScore(0, 100)).toBe(1);
  });

  test('negative stock -> 1', () => {
    expect(stockoutRiskScore(-5, 100)).toBe(1);
  });

  test('<= 7 days coverage -> 0.9', () => {
    // 7 units/week = 1/day; stock 5 -> 5 days
    expect(stockoutRiskScore(5, 7)).toBe(0.9);
  });

  test('<= 14 days coverage -> 0.6', () => {
    // 7 units/week = 1/day; stock 10 -> 10 days
    expect(stockoutRiskScore(10, 7)).toBe(0.6);
  });

  test('> 14 days coverage -> 0.25', () => {
    expect(stockoutRiskScore(100, 7)).toBe(0.25);
  });

  test('no burn (units 0) -> 0.25', () => {
    expect(stockoutRiskScore(50, 0)).toBe(0.25);
  });
});

describe('returnRiskScore', () => {
  test('no orders -> 0', () => {
    expect(returnRiskScore(5, 0)).toBe(0);
  });

  test('proportional, clamped', () => {
    expect(returnRiskScore(2, 10)).toBeCloseTo(0.2);
  });

  test('full cancellation -> 1', () => {
    expect(returnRiskScore(10, 10)).toBe(1);
  });
});

describe('adDensity', () => {
  test('units 0 -> 0', () => {
    expect(adDensity(0, 100)).toBe(0);
  });

  test('sells through relative to stock', () => {
    expect(adDensity(10, 40)).toBeCloseTo(10 / 50);
  });

  test('high stock dampens density', () => {
    expect(adDensity(10, 500)).toBeLessThan(0.05);
  });
});

describe('creatorCoverage', () => {
  test('0 orders -> 0', () => {
    expect(creatorCoverage(0)).toBe(0);
  });

  test('saturates at high order count', () => {
    expect(creatorCoverage(1000)).toBeCloseTo(1, 1);
  });

  test('monotonic increasing', () => {
    expect(creatorCoverage(10)).toBeGreaterThan(creatorCoverage(5));
  });
});

describe('priceCompetitionIndex', () => {
  test('at median -> 1', () => {
    expect(priceCompetitionIndex(100, 100)).toBe(1);
  });

  test('far from median -> lower', () => {
    expect(priceCompetitionIndex(200, 100)).toBe(0);
  });

  test('zero median -> 0', () => {
    expect(priceCompetitionIndex(100, 0)).toBe(0);
  });
});

describe('directionByDelta', () => {
  test('up', () => {
    expect(directionByDelta(0.5)).toBe('up');
  });
  test('down', () => {
    expect(directionByDelta(-0.5)).toBe('down');
  });
  test('flat in dead-zone', () => {
    expect(directionByDelta(0.01)).toBe('flat');
  });
});

describe('directionByRisk', () => {
  test('high -> up', () => {
    expect(directionByRisk(0.9)).toBe('up');
  });
  test('low -> down', () => {
    expect(directionByRisk(0.1)).toBe('down');
  });
  test('mid -> flat', () => {
    expect(directionByRisk(0.5)).toBe('flat');
  });
});

describe('confidenceBySample', () => {
  test('0 samples -> 0', () => {
    expect(confidenceBySample(0)).toBe(0);
  });
  test('saturates at 20', () => {
    expect(confidenceBySample(20)).toBe(1);
    expect(confidenceBySample(100)).toBe(1);
  });
  test('mid', () => {
    expect(confidenceBySample(10)).toBe(0.5);
  });
});

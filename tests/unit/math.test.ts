import { describe, expect, test } from 'vitest';
import { clamp, freshnessDecay, log1p, mean, median, safeDivide, weightedAvg } from '#shared/utils/math.js';

describe('clamp', () => {
  test('clamps into [0,1] by default', () => {
    expect(clamp(-5)).toBe(0);
    expect(clamp(0.5)).toBe(0.5);
    expect(clamp(12)).toBe(1);
  });

  test('clamps into custom range', () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(2, 1, 3)).toBe(2);
  });

  test('returns min for NaN', () => {
    expect(clamp(Number.NaN)).toBe(0);
  });
});

describe('mean', () => {
  test('empty -> 0', () => {
    expect(mean([])).toBe(0);
  });

  test('averages values', () => {
    expect(mean([1, 2, 3])).toBe(2);
  });
});

describe('weightedAvg', () => {
  test('empty -> 0', () => {
    expect(weightedAvg([], [])).toBe(0);
  });

  test('weighted sum / total weight', () => {
    expect(weightedAvg([1, 2], [3, 1])).toBe(1.25);
  });

  test('zero total weight -> 0', () => {
    expect(weightedAvg([1, 2], [0, 0])).toBe(0);
  });
});

describe('log1p', () => {
  test('matches Math.log1p', () => {
    expect(log1p(0)).toBe(0);
    expect(log1p(1)).toBeCloseTo(Math.log(2));
  });
});

describe('median', () => {
  test('odd count', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  test('even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  test('empty -> 0', () => {
    expect(median([])).toBe(0);
  });
});

describe('freshnessDecay', () => {
  test('1.0 at t=0', () => {
    expect(freshnessDecay(0, 30)).toBeCloseTo(1);
  });

  test('0.5 at one half-life', () => {
    expect(freshnessDecay(30, 30)).toBeCloseTo(0.5, 5);
  });

  test('1.0 when half-life is 0', () => {
    expect(freshnessDecay(10, 0)).toBe(1);
  });
});

describe('safeDivide', () => {
  test('normal division', () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  test('zero denominator -> fallback', () => {
    expect(safeDivide(10, 0)).toBe(0);
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });
});

// Pure math helpers. Zero dependencies.

/** Clamp a number into [min, max]. */
export const clamp = (value: number, min = 0, max = 1): number => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

/** Arithmetic mean of a numeric array. Empty -> 0. */
export const mean = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
};

/** Weighted average given parallel value/weight arrays. */
export const weightedAvg = (values: readonly number[], weights: readonly number[]): number => {
  if (values.length === 0) return 0;
  let totalWeight = 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    const w = weights[i] ?? 0;
    total += v * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return total / totalWeight;
};

/** Natural log of (1+x), defined for x >= -1. */
export const log1p = (x: number): number => Math.log1p(x);

/** Median of a numeric array. Empty -> 0. */
export const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
};

/** Exponential freshness decay: e^(-lambda * t) where lambda = ln(2)/halfLifeDays. */
export const freshnessDecay = (elapsedDays: number, halfLifeDays: number): number => {
  if (halfLifeDays <= 0) return 1;
  const lambda = Math.log(2) / halfLifeDays;
  return Math.exp(-lambda * Math.max(0, elapsedDays));
};

/** Safe division returning fallback when divisor is 0/NaN. */
export const safeDivide = (numerator: number, denominator: number, fallback = 0): number => {
  if (denominator === 0 || Number.isNaN(denominator)) return fallback;
  return numerator / denominator;
};

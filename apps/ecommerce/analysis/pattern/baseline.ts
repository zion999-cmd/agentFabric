// P0007.1.1 Baseline Engine
// Models "what should normal look like" before detecting anomalies.
//
// Three-layer decomposition:
//   1. Trend: 30-day rolling average (captures long-term shifts)
//   2. Season: monthly factor (Jan peak → Apr trough)
//   3. Cycle: day-of-week adjustment (Tue high → Sat low)
//
// For each day: expected = trend * season_factor * dow_factor
//                residual = (actual - expected) / expected
//
// Output powers the Pattern Detector layer — without baseline,
// threshold-based detection false-positives on seasonal variation.

// ---- Types ----

export interface BaselineSnapshot {
  date: string;
  metric: string;
  actual_value: number;
  expected_value: number;
  residual: number; // (actual - expected) / expected
  trend_30d: number;
  season_factor: number;
  dow_factor: number;
  confidence: number; // 0-1 based on data density
}

export interface SeasonModel {
  /** Monthly factors relative to overall mean (1.0 = average month) */
  monthly_factors: Record<string, number>;
  /** Day-of-week factors (1.0 = average day) */
  dow_factors: Record<number, number>;
  /** Overall mean GMV */
  overall_mean: number;
  /** Number of months used to compute seasonal model */
  months_trained: number;
}

export interface DailyMetric {
  date: string;
  gmv: number;
  orders: number;
  visitors: number;
  conversion_rate: number;
  hourly_traffic_count: number;
}

export interface BaselineResult {
  /** Daily baseline snapshots */
  snapshots: BaselineSnapshot[];
  /** The seasonal model used */
  season_model: SeasonModel;
  /** Summary */
  summary: {
    total_days: number;
    baseline_days: number; // days with computed baseline (need 30d history)
    mean_residual: number;
    residual_stddev: number;
    extreme_days: number; // |residual| > 0.3
  };
}

// ---- Season Model Builder ----

/**
 * Build a seasonal model from historical daily metrics.
 * Requires at least 2 months of data.
 * Uses leave-one-out: for each month, factor = month_avg / overall_avg_of_other_months.
 */
const buildSeasonModel = (daily: DailyMetric[]): SeasonModel | null => {
  if (daily.length < 30) return null;

  // Group by month
  const byMonth = new Map<string, number[]>();
  for (const d of daily) {
    if (d.gmv <= 0) continue;
    const month = d.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(d.gmv);
  }

  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (months.length < 2) return null;

  // Overall mean
  const allValues = daily.filter((d) => d.gmv > 0).map((d) => d.gmv);
  const overallMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
  if (overallMean <= 0) return null;

  // Monthly factors: each month compared to overall mean
  const monthlyFactors: Record<string, number> = {};
  for (const [month, vals] of months) {
    const monthAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    monthlyFactors[month] = monthAvg / overallMean;
  }

  // Day-of-week factors
  const byDow = new Map<number, number[]>();
  for (const d of daily) {
    if (d.gmv <= 0) continue;
    const dow = new Date(d.date + 'T00:00:00').getDay();
    if (!byDow.has(dow)) byDow.set(dow, []);
    byDow.get(dow)!.push(d.gmv / (monthlyFactors[d.date.slice(0, 7)] ?? 1));
  }

  const dowFactors: Record<number, number> = {};
  for (const [dow, vals] of byDow.entries()) {
    const dowAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    // Normalize: factor relative to a day with factor=1
    const dowMean = dowAvg / overallMean;
    dowFactors[dow] = dowMean > 0 ? dowMean : 1;
  }

  // Fill missing DOW with 1.0
  for (let i = 0; i < 7; i++) {
    if (!(i in dowFactors)) dowFactors[i] = 1.0;
  }

  return {
    monthly_factors: monthlyFactors,
    dow_factors: dowFactors,
    overall_mean: overallMean,
    months_trained: months.length,
  };
};

// ---- Baseline Computation ----

/**
 * Compute baseline snapshots for each day in the series.
 *
 * For each day (after 30-day warmup):
 *   1. Compute 30-day rolling average (trend)
 *   2. Apply season factor for the current month
 *   3. Apply day-of-week factor
 *   4. expected = trend * season * dow
 *   5. residual = (actual - expected) / expected
 */
export const computeBaseline = (daily: DailyMetric[]): BaselineResult => {
  const seasonModel = buildSeasonModel(daily);
  const snapshots: BaselineSnapshot[] = [];

  if (!seasonModel) {
    return {
      snapshots: [],
      season_model: { monthly_factors: {}, dow_factors: {}, overall_mean: 0, months_trained: 0 },
      summary: { total_days: daily.length, baseline_days: 0, mean_residual: 0, residual_stddev: 0, extreme_days: 0 },
    };
  }

  for (let i = 0; i < daily.length; i++) {
    const current = daily[i]!;
    if (current.gmv <= 0) continue;

    // Need at least 7 days of history for baseline
    if (i < 7) continue;

    // 30-day rolling trend (or fewer if not enough history)
    const windowSize = Math.min(30, i);
    const window = daily.slice(i - windowSize, i);
    const trend30d = window
      .filter((d) => d.gmv > 0)
      .reduce((a, d) => a + d.gmv, 0) / Math.max(1, window.filter((d) => d.gmv > 0).length);

    if (trend30d <= 0) continue;

    // Season factor
    const month = current.date.slice(0, 7);
    const seasonFactor = seasonModel.monthly_factors[month] ?? 1.0;
    // If no monthly factor yet, use 1.0 (neutral)
    const effectiveSeason = seasonFactor > 0 ? seasonFactor : 1.0;

    // Day-of-week factor
    const dow = new Date(current.date + 'T00:00:00').getDay();
    const dowFactor = seasonModel.dow_factors[dow] ?? 1.0;

    // Expected value
    const expected = trend30d * effectiveSeason * dowFactor;

    // Residual: (actual - expected) / expected
    const residual = expected > 0 ? (current.gmv - expected) / expected : 0;

    // Confidence: based on data density in the rolling window
    const dataDensity = window.filter((d) => d.gmv > 0).length / windowSize;
    const seasonConfidence = seasonModel.months_trained >= 3 ? 0.9 : seasonModel.months_trained >= 2 ? 0.7 : 0.5;
    const confidence = dataDensity * 0.6 + seasonConfidence * 0.4;

    snapshots.push({
      date: current.date,
      metric: 'gmv',
      actual_value: current.gmv,
      expected_value: expected,
      residual,
      trend_30d: trend30d,
      season_factor: effectiveSeason,
      dow_factor: dowFactor,
      confidence,
    });
  }

  // Summary
  const residuals = snapshots.map((s) => s.residual);
  const meanResidual = residuals.length > 0 ? residuals.reduce((a, b) => a + b, 0) / residuals.length : 0;
  const residualStddev = residuals.length > 1 ? Math.sqrt(residuals.reduce((s, r) => s + (r - meanResidual) ** 2, 0) / (residuals.length - 1)) : 0;
  const extremeDays = residuals.filter((r) => Math.abs(r) > 0.3).length;

  return {
    snapshots,
    season_model: seasonModel,
    summary: {
      total_days: daily.length,
      baseline_days: snapshots.length,
      mean_residual: meanResidual,
      residual_stddev: residualStddev,
      extreme_days: extremeDays,
    },
  };
};

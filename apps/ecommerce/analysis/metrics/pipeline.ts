// Signal pipeline: orchestrates aggregation + calculators into Signal records.
// Multi-window [3,7,14] by default; 9 base signals per product per window.

import type { Signal, SignalUnit } from '#shared/schemas/signal.js';
import type { SignalDirection } from '#shared/schemas/signal.js';
import { nowIso, hourBucket } from '#shared/utils/time.js';
import { fingerprint, uuid } from '#shared/utils/crypto.js';
import { clamp } from '#shared/utils/math.js';
import { aggregateProductMetrics } from './aggregation.js';
import { confidenceBySample, directionByDelta, directionByRisk } from './calculators/index.js';
import {
  adDensity,
  creatorCoverage,
  growthRate,
  priceCompetitionIndex,
  returnRiskScore,
  stockoutRiskScore,
} from './calculators/index.js';
import { resolveSignalWeight } from './weights.js';
import type { ProductRawMetrics, SignalPipelineInput, SignalPipelineOptions } from './types.js';

const DEFAULT_WINDOWS: readonly number[] = [3, 7, 14];
const DEFAULT_TTL_HOURS = 24;
const MS_PER_HOUR = 60 * 60 * 1000;

export interface ComputeSignalsResult {
  signals: Signal[];
  pipelineRunId: string;
}

/**
 * Run the full signal-generation pass over products + orders.
 * Produces 9 base signals per product per window.
 */
export const computeSignals = (
  input: SignalPipelineInput,
  options: SignalPipelineOptions = {},
  weightOverrides?: Readonly<Record<string, number>>,
): ComputeSignalsResult => {
  const now = options.now ?? new Date();
  const windows = options.windowDays ?? DEFAULT_WINDOWS;
  const ttlHours = options.lifecycleTtlHours ?? DEFAULT_TTL_HOURS;
  const pipelineRunId = uuid();
  const ingestedAt = nowIso();

  const signals: Signal[] = [];

  for (const windowDays of windows) {
    const previousWindowDays = options.previousWindowDays ?? windowDays;
    const metricsMap = aggregateProductMetrics(
      input.products,
      input.orders,
      now,
      windowDays,
      previousWindowDays,
    );

    for (const m of metricsMap.values()) {
      const sampleSize = m.orderCountRecent + m.orderCountPrevious;
      const confidence = confidenceBySample(sampleSize);
      const transformHash = buildTransformHash(m.productId, windowDays, pipelineRunId);
      const lifecycle = {
        version: 1,
        status: 'active' as const,
        expires_at: new Date(now.getTime() + ttlHours * MS_PER_HOUR).toISOString(),
      };
      const source = {
        platform: options.sourcePlatform ?? 'internal',
        dataset: options.sourceDataset ?? 'ecommerce',
        ingested_at: ingestedAt,
      };
      const trace = { pipeline_run_id: pipelineRunId, transform_hash: transformHash };

      const builders: Array<() => Signal> = [
        () => buildSignal('sales_growth', growthRate(m.unitsRecent, m.unitsPrevious), 'ratio', directionByDelta, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('gmv_growth', growthRate(m.gmvRecent, m.gmvPrevious), 'ratio', directionByDelta, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('sku_growth', growthRate(m.orderCountRecent, m.orderCountPrevious), 'ratio', directionByDelta, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('video_growth', growthRate(m.orderCountRecent + m.unitsRecent, m.orderCountPrevious + m.unitsPrevious), 'ratio', directionByDelta, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('ad_density', adDensity(m.unitsRecent, m.stock), 'score', directionByRisk, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('creator_coverage', creatorCoverage(m.orderCountRecent), 'score', directionByRisk, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('price_competition_index', priceCompetitionIndex(m.price, m.categoryMedianPrice), 'score', directionByRisk, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('stockout_risk', stockoutRiskScore(m.stock, m.unitsRecent), 'score', directionByRisk, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
        () => buildSignal('return_risk_score', returnRiskScore(m.cancelledOrders, m.totalProductOrders), 'score', directionByRisk, m, windowDays, confidence, source, lifecycle, trace, weightOverrides),
      ];

      for (const build of builders) signals.push(build());
    }
  }

  return { signals, pipelineRunId };
};

type DirectionFn = (value: number) => SignalDirection;

const buildSignal = (
  baseName: string,
  value: number,
  unit: SignalUnit,
  directionFn: DirectionFn,
  m: ProductRawMetrics,
  windowDays: number,
  confidence: number,
  source: Signal['source'],
  lifecycle: Signal['lifecycle'],
  trace: Signal['trace'],
  weightOverrides?: Readonly<Record<string, number>>,
): Signal => {
  const signalName = `${baseName}_${windowDays}d`;
  const weight = resolveSignalWeight(signalName, weightOverrides) ?? 0.5;
  return {
    signal_id: uuid(),
    entity_type: 'product',
    entity_id: m.productId,
    signal_name: signalName,
    signal_value: clamp(value),
    signal_unit: unit,
    signal_direction: directionFn(value),
    weight,
    confidence,
    source,
    window: `${windowDays}d`,
    lifecycle,
    trace,
  };
};

const buildTransformHash = (productId: string, windowDays: number, runId: string): string =>
  fingerprint({ version: 'signal-pipeline-v1', productId, windowDays, runId });

// Re-export hourBucket for the repository's snapshot bucketing.
export { hourBucket };

export { SignalFacade } from './facade.js';
export { computeSignals } from './pipeline.js';
export type { ComputeSignalsResult } from './pipeline.js';
export * from './calculators/index.js';
export { resolveSignalWeight, defaultWeightFor, recommendedWeight, weightAction, observedWeight } from './weights.js';
export { aggregateProductMetrics } from './aggregation.js';
export type {
  ProductRawMetrics,
  SignalPipelineInput,
  SignalPipelineOptions,
  SignalWeightResolver,
} from './types.js';

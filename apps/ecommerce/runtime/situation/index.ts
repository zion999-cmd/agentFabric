// Situation Producer — barrel export.
// P0009.1: detect → construct → persist Situations from Signals/Rankings.

export { runSituationProducer } from './producer.js';
export type { SituationProducerOptions, SituationRunResult } from './producer.js';
export { detectSituations } from './rules.js';
export type {
  ChangeDirection,
  DetectionKind,
  DetectSituationsInput,
  ShopRef,
  StoreDailyObservation,
} from './rules.js';

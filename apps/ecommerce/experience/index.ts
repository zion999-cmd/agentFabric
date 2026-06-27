export { MemoryFacade } from './facade.js';
export { extractMemories, MEMORY_PATTERN_RULES } from './extraction.js';
export type { ExtractMemoriesInput } from './extraction.js';
export {
  computeFinalScore,
  memoryConfidence,
  memoryFreshness,
  classifyTier,
  DEFAULT_HALF_LIFE_DAYS,
  MIN_SUPPORT,
  MIN_SUPPORT_RATE,
  WEIGHT_COEFFICIENTS,
} from './weights.js';
export type { MemoryWeightInputs, MemoryTier } from './weights.js';

export { RankingFacade } from './facade.js';
export { rankProducts } from './engine.js';
export type { RankInput } from './engine.js';
export { getProfile, listProfiles, matchComponent, isGrowthSignal, RANKING_PROFILES } from './profiles.js';
export {
  growthToScore,
  riskToScore,
  lifecycleStatusToScore,
  computeCoverage,
  computeOverall,
  meanConfidence,
} from './scoring.js';
export { applyAdjustment, applyMemoryAdjustments } from './memory-adjustment.js';
export {
  buildStrengthsRisks,
  buildDecisionTrace,
  buildSummary,
  signalImpact,
} from './explainability.js';

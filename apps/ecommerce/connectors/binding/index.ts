// Binding layer barrel — P0005.4
// The bridge between generated artifacts (P0005.3) and connector execution.

export * from './types.js';
export { loadBlueprint, loadNormalizerPlan, loadIndicatorDict, loadOrGenerate } from './loader.js';
export { buildExecutionPlan } from './planner.js';
export { executePlan, createPlatformExecutor } from './executor.js';
export type { AcquireFunction, ExecuteOptions, ExecuteResult, PlatformExecutor } from './executor.js';

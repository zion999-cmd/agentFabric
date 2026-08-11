// Runtime Kernel — barrel export.
// P0005.5: Single entry point for the Runtime Convergence Layer.
// P0005.6.1: Added executeLiveCDP + executeImport pipeline exports.

export { createRuntimeKernel } from './runtime-kernel.js';
export type {
  RuntimeKernel,
  RuntimeExecuteOptions,
  RuntimeExecuteResult,
  RuntimeLiveCDPOptions,
  RuntimeLiveCDPResult,
  RuntimeImportOptions,
  RuntimeImportResult,
} from './runtime-kernel.js';

export {
  executeRuntimePipeline,
  executeLiveCDPPipeline,
  executeImportPipeline,
  createEmptyBlueprint,
} from './runtime-executor.js';
export type {
  RuntimeLiveCDPDayResult,
} from './runtime-executor.js';

export { generateSignals } from './runtime-signal-engine.js';
export type { SignalGenerationResult, SignalEngineOptions } from './runtime-signal-engine.js';

export { captureEvidence } from './runtime-evidence-orchestrator.js';
export type { EvidenceCaptureResult } from './runtime-evidence-orchestrator.js';

export { buildNormalizerSpec, buildSpecFromBlueprint, specCoverageCount } from './runtime-normalizer-resolver.js';

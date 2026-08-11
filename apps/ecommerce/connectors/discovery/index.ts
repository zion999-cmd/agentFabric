// P0005.2 — Discovery module barrel.
// Re-exports all types, schemas, loader functions, and phase implementations.

// Loader
export {
  loadApiInventory,
  loadIndicatorDictionary,
  loadPageInventory,
  loadBusinessContextCandidates,
  loadCapabilityMatrix,
  discoveryRoot,
  DISCOVERY_ROOT,
} from './loader.js';

// Types
export type {
  ApiEndpoint,
  ApiFieldInfo,
  ApiModule,
  PageApiCall,
  PageCapture,
  SchemaVersion,
  SchemaChange,
  IndicatorEntry,
  IndicatorMapping,
  ContextDetectionRule,
  GeneratedBusinessContext,
  GeneratedManifestBusinessContext,
} from './types.js';

export {
  ApiEndpointSchema,
  ApiFieldInfoSchema,
  ApiModuleSchema,
  PageApiCallSchema,
  PageCaptureSchema,
  SchemaVersionSchema,
  SchemaChangeSchema,
  IndicatorEntrySchema,
  IndicatorMappingSchema,
  ContextDetectionRuleSchema,
  GeneratedBusinessContextSchema,
  GeneratedManifestBusinessContextSchema,
} from './types.js';

// Phase 1: API Inventory
export {
  listApis,
  getApiSchema,
  getApiModules,
  getApisByModule,
  getApisByPage,
  getPageApiMap,
  getModuleBasePath,
  getApiStats,
} from './api-inventory.js';

// Phase 2: Schema Evolution
export {
  computeSchemaHash,
  captureSchemaVersion,
  detectChanges,
  loadVersionHistory,
  saveVersionHistory,
  detectAllChanges,
  getLatestVersion,
} from './schema-evolution.js';

// Phase 3: Indicator Dictionary
export {
  parseJdrKey,
  classifyDomain,
  classifyMetric,
  resolveIndicator,
  resolveAllIndicators,
  getIndicatorsByCategory,
  mapIndicatorToCanonical,
  findCompareTriplets,
  inferUnit,
} from './indicator-dictionary.js';

// Phase 4: Business Context (generated, never hand-declared)
export {
  CONTEXT_DETECTION_RULES,
  analyzeFields,
  generateBusinessContexts,
  getContextForApi,
  generateManifestContexts,
  summarizeContexts,
} from './business-context.js';

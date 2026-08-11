export { normalizeJdMetrics, normalizeTmallMetrics, normalizeMetrics, normalizeSignal } from './normalizer.js';
export { upsertCollector, listCollectors, recordCollectorRun } from './registry.js';
export { loadAuthProfile, cookieHeader, authProfilePath, authDir } from './auth.js';
export { createJdAdapter, createTmallAdapter, mockPayload } from './adapters.js';
export type { CollectorAdapter } from './adapters.js';

// P0005.2 Discovery module — platform capability
export * from './discovery/index.js';

// P0005.3 Capability Generator — Discovery → Blueprint
export * from './capability/index.js';

// P0005.4 Binding Layer — generated artifacts → connector execution
export * from './binding/index.js';

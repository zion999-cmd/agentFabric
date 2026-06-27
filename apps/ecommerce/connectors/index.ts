export { normalizeJdMetrics, normalizeTmallMetrics, normalizeMetrics, normalizeSignal } from './normalizer.js';
export { upsertCollector, listCollectors, recordCollectorRun } from './registry.js';
export { loadAuthProfile, cookieHeader, authProfilePath, authDir } from './auth.js';
export { createJdAdapter, createTmallAdapter, mockPayload } from './adapters.js';
export type { CollectorAdapter } from './adapters.js';

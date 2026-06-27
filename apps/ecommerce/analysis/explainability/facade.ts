// Trace façade — the only cross-domain import surface for explainability.

import type { Database as Db } from 'better-sqlite3';
import type { BusinessConclusionTrace } from '#shared/schemas/trace.js';
import type { BusinessConclusion } from '#shared/schemas/trace.js';
import { buildTrace, type BuildTraceInput } from './builder.js';
import { storeTrace, loadTrace } from './repository.js';

export interface TraceFacade {
  explain(input: BuildTraceInput): BusinessConclusionTrace;
  /** Convenience: explain a single conclusion given pre-resolved evidence. */
  explainConclusion(
    conclusion: BusinessConclusion,
    evidence: Omit<BuildTraceInput, 'conclusion'>,
  ): BusinessConclusionTrace;
  store(db: Db, trace: BusinessConclusionTrace): string;
  load(db: Db, traceId: string): BusinessConclusionTrace | null;
}

export const TraceFacade: TraceFacade = {
  explain: (input) => buildTrace(input),
  explainConclusion: (conclusion, evidence) => buildTrace({ conclusion, ...evidence }),
  store: (db, trace) => storeTrace(db, trace),
  load: (db, traceId) => loadTrace(db, traceId),
};

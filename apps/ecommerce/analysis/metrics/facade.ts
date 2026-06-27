// Signal façade — the only cross-domain import surface for the signal domain.
// Pure compute methods + persistence via an injected Db.

import type { Database as Db } from 'better-sqlite3';
import type { Signal } from '#shared/schemas/signal.js';
import { computeSignals, type ComputeSignalsResult } from './pipeline.js';
import { listAllSignals, listSignals, recordHourlySnapshot, storeSignals } from './repository.js';
import type { SignalPipelineInput, SignalPipelineOptions } from './types.js';

export interface SignalFacade {
  /** Compute signals from products + orders (pure, no persistence). */
  compute(input: SignalPipelineInput, options?: SignalPipelineOptions): ComputeSignalsResult;
  /** Persist computed signals (upsert). Returns count stored. */
  store(db: Db, signals: readonly Signal[]): number;
  /** List signals for one entity. */
  list(db: Db, entityType: string, entityId: string): Signal[];
  /** List all signals for an entity type (for ranking). */
  listAll(db: Db, entityType: string): Signal[];
  /** Record an hourly snapshot for platform-collected signals. */
  snapshot(db: Db, source: string, shopId: string, signals: readonly Signal[]): string;
}

export const SignalFacade: SignalFacade = {
  compute: (input, options) => computeSignals(input, options ?? {}),
  store: (db, signals) => storeSignals(db, signals),
  list: (db, entityType, entityId) => listSignals(db, entityType, entityId),
  listAll: (db, entityType) => listAllSignals(db, entityType),
  snapshot: (db, source, shopId, signals) => recordHourlySnapshot(db, source, shopId, signals),
};

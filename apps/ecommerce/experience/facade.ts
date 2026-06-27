// Memory façade — the only cross-domain import surface for business memory.

import type { Database as Db } from 'better-sqlite3';
import type { ContextMemory } from '#shared/schemas/memory.js';
import type { RankingMemoryAdjustment } from '#shared/schemas/ranking.js';
import { extractMemories, type ExtractMemoriesInput } from './extraction.js';
import {
  memoryAdjustmentsFor,
  queryActiveMemories,
  storeMemories,
} from './repository.js';

export interface MemoryFacade {
  /** Extract validated memories from reject reviews (pure). */
  extract(input: ExtractMemoriesInput): ContextMemory[];
  /** Persist memories (upsert). */
  store(db: Db, memories: readonly ContextMemory[]): number;
  /** Query active validated memories for an agent. */
  queryActive(db: Db, agentId?: string): ContextMemory[];
  /** Derive ranking adjustments from active memories (un-stubs the ranking hook). */
  adjustmentsFor(db: Db, agentId?: string): RankingMemoryAdjustment[];
}

export const MemoryFacade: MemoryFacade = {
  extract: (input) => extractMemories(input),
  store: (db, memories) => storeMemories(db, memories),
  queryActive: (db, agentId) => queryActiveMemories(db, agentId),
  adjustmentsFor: (db, agentId) => memoryAdjustmentsFor(db, agentId),
};

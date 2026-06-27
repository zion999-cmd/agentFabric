// Ranking façade — the only cross-domain import surface for ranking.

import type { Database as Db } from 'better-sqlite3';
import type {
  RankingMemoryAdjustment,
  RankingProfile,
  RankingProfileName,
  RankingResult,
} from '#shared/schemas/ranking.js';
import { rankProducts, type RankInput } from './engine.js';
import { getProfile, listProfiles } from './profiles.js';
import { loadRankingResults, storeRankingResults } from './repository.js';
import type { Signal } from '#shared/schemas/signal.js';

export interface RankingFacade {
  rank(input: RankInput): RankingResult[];
  rankByProfile(
    signals: readonly Signal[],
    profileName: RankingProfileName,
    adjustments?: readonly RankingMemoryAdjustment[],
  ): RankingResult[];
  store(db: Db, profileName: RankingProfileName, results: readonly RankingResult[]): number;
  load(db: Db, profileName: RankingProfileName): RankingResult[];
  getProfile(name: RankingProfileName): RankingProfile;
  listProfiles(): RankingProfile[];
}

export const RankingFacade: RankingFacade = {
  rank: (input) => rankProducts(input),
  rankByProfile: (signals, profileName, adjustments) =>
    rankProducts({
      signals,
      profile: getProfile(profileName),
      ...(adjustments ? { adjustments } : {}),
    }),
  store: (db, profileName, results) => storeRankingResults(db, profileName, results),
  load: (db, profileName) => loadRankingResults(db, profileName),
  getProfile,
  listProfiles,
};

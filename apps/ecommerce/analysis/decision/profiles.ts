// Ranking profiles — the three business perspectives + signal-to-component mapping.

import { RANKING_PROFILES } from '#platform/storage/seed.js';
import type {
  RankingComponentName,
  RankingProfile,
  RankingProfileName,
} from '#shared/schemas/ranking.js';

export const getProfile = (name: RankingProfileName): RankingProfile => RANKING_PROFILES[name];

export const listProfiles = (): RankingProfile[] => Object.values(RANKING_PROFILES);

/** Match a signal name to a component by prefix. */
export const matchComponent = (
  signalName: string,
  profile: RankingProfile,
): RankingComponentName | undefined => {
  for (const [component, prefixes] of Object.entries(profile.signal_mapping) as Array<
    [RankingComponentName, string[]]
  >) {
    if (prefixes.some((p) => signalName.startsWith(p))) {
      return component;
    }
  }
  return undefined;
};

export const isGrowthSignal = (signalName: string): boolean =>
  signalName.startsWith('sales_growth') ||
  signalName.startsWith('gmv_growth') ||
  signalName.startsWith('sku_growth') ||
  signalName.startsWith('video_growth');

/** Re-export the seed profiles for tests. */
export { RANKING_PROFILES };

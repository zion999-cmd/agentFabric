// Auth profile loader — reads .collector-auth/{platform}.json cookie profiles.
// Pattern: CDP-harvested cookies reused via the Cookie header.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuthProfile } from '#shared/schemas/collector.js';

const DEFAULT_AUTH_DIR = '.collector-auth';

/** Resolve the auth directory (env override or cwd default). */
export const authDir = (): string => process.env.COLLECTOR_AUTH_DIR ?? resolve(process.cwd(), DEFAULT_AUTH_DIR);

/** Path to a platform's auth profile. */
export const authProfilePath = (platform: string): string => resolve(authDir(), `${platform}.json`);

/** Load a platform auth profile. Returns null if absent. */
export const loadAuthProfile = async (platform: string): Promise<AuthProfile | null> => {
  const path = authProfilePath(platform);
  if (!existsSync(path)) return null;
  const text = await readFile(path, 'utf8');
  const parsed = JSON.parse(text) as AuthProfile;
  return parsed;
};

/** Build a Cookie header from an auth profile (null if no profile). */
export const cookieHeader = async (platform: string): Promise<string | null> => {
  const profile = await loadAuthProfile(platform);
  return profile?.cookieHeader ?? null;
};

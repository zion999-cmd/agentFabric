// Database initialization: open + apply schema + seed defaults.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Database as Db } from 'better-sqlite3';
import { applySchema } from './schema.js';
import { DEFAULT_SIGNAL_WEIGHTS, RANKING_PROFILES } from './seed.js';
import { nowIso } from '#shared/utils/time.js';
import { openDb } from './connection.js';

/** Seed default signal weights (upsert). */
const seedSignalWeights = (db: Db): void => {
  const stmt = db.prepare(
    `INSERT INTO signal_weights (signal_name, weight, source, updated_at)
     VALUES (?, ?, 'default', ?)
     ON CONFLICT(signal_name) DO UPDATE SET weight = excluded.weight, updated_at = excluded.updated_at`,
  );
  for (const [name, weight] of Object.entries(DEFAULT_SIGNAL_WEIGHTS)) {
    stmt.run(name, weight, nowIso());
  }
};

/** Seed the three ranking profiles (upsert). */
const seedRankingProfiles = (db: Db): void => {
  const stmt = db.prepare(
    `INSERT INTO ranking_profiles (name, weights, signal_mapping, goal, description)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       weights = excluded.weights,
       signal_mapping = excluded.signal_mapping,
       goal = excluded.goal,
       description = excluded.description`,
  );
  for (const profile of Object.values(RANKING_PROFILES)) {
    stmt.run(
      profile.name,
      JSON.stringify(profile.weights),
      JSON.stringify(profile.signal_mapping),
      profile.goal,
      profile.description,
    );
  }
};

/**
 * Initialize a database: ensure dir, open, apply schema, seed.
 * Returns the open handle (caller is responsible for closing).
 */
export const initDatabase = (db: Db): void => {
  applySchema(db);
  const seedWeights = db.prepare('SELECT 1 FROM signal_weights LIMIT 1').get();
  if (!seedWeights) seedSignalWeights(db);
  const seedProfiles = db.prepare('SELECT 1 FROM ranking_profiles LIMIT 1').get();
  if (!seedProfiles) seedRankingProfiles(db);
};

// CLI entry: `npm run db:init`
const main = (): void => {
  const path = process.env.DB_PATH ?? './data/agentfabric.db';
  mkdirSync(dirname(path), { recursive: true });
  const db = openDb(path);
  initDatabase(db);
  // eslint-disable-next-line no-console
  console.log(`[agentFabric] database initialized at ${path}`);
  db.close();
};

// ES module guard: run main only when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

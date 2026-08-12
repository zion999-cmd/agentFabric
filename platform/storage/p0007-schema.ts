// P0007 Schema — tables for Situations, Learning Contexts, and Human Interventions.
// Applied idempotently alongside the main schema.ts.

import type Database from 'better-sqlite3';

const STATEMENTS = [
  // ── Situations ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS situations (
    situation_id   TEXT PRIMARY KEY,
    domain         TEXT NOT NULL,
    type           TEXT NOT NULL,
    entity_id      TEXT NOT NULL,
    entity_type    TEXT NOT NULL,
    entity_name    TEXT,
    entity_platform TEXT,
    observed_at    TEXT NOT NULL,
    window_start   TEXT,
    window_end     TEXT,
    description    TEXT NOT NULL,
    tags           TEXT DEFAULT '[]',
    lifecycle      TEXT NOT NULL DEFAULT 'open',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  )`,

  // ── Learning Contexts (document store — JSON body) ──────
  `CREATE TABLE IF NOT EXISTS learning_contexts (
    context_id    TEXT PRIMARY KEY,
    situation_id  TEXT NOT NULL UNIQUE,
    lifecycle     TEXT NOT NULL DEFAULT 'open',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    body          TEXT NOT NULL,
    FOREIGN KEY (situation_id) REFERENCES situations(situation_id)
  )`,

  // ── Human Interventions ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS human_interventions (
    intervention_id         TEXT PRIMARY KEY,
    situation_id            TEXT NOT NULL,
    actor_id                TEXT NOT NULL,
    actor_role              TEXT NOT NULL,
    type                    TEXT NOT NULL,
    content                 TEXT NOT NULL DEFAULT '{}',
    summary                 TEXT NOT NULL,
    responds_to_activity_ids TEXT DEFAULT '[]',
    review_id               TEXT,
    action_id               TEXT,
    legacy_source           TEXT NOT NULL DEFAULT 'none',
    created_at              TEXT NOT NULL,
    FOREIGN KEY (situation_id) REFERENCES situations(situation_id)
  )`,

  // ── Indexes ─────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_situations_domain ON situations(domain)`,
  `CREATE INDEX IF NOT EXISTS idx_situations_lifecycle ON situations(lifecycle)`,
  `CREATE INDEX IF NOT EXISTS idx_situations_observed ON situations(observed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_interventions_situation ON human_interventions(situation_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interventions_type ON human_interventions(type)`,
  `CREATE INDEX IF NOT EXISTS idx_interventions_actor ON human_interventions(actor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contexts_situation ON learning_contexts(situation_id)`,
];

/** Apply P0007 schema tables. Safe to call multiple times (IF NOT EXISTS). */
export const applyP0007Schema = (db: Database.Database): void => {
  db.exec(STATEMENTS.join(';\n'));
};

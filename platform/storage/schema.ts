// Database schema. Idempotent CREATE TABLE IF NOT EXISTS for all tables.
// Migration bookkeeping via schema_version.

import type { Database as Db } from 'better-sqlite3';
import { nowIso } from '#shared/utils/time.js';

export const SCHEMA_VERSION = 2;

const STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    product_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    attributes TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    user_id TEXT,
    status TEXT NOT NULL,
    total_amount REAL NOT NULL,
    items TEXT NOT NULL,
    channel TEXT,
    ordered_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_time ON orders(ordered_at)`,

  `CREATE TABLE IF NOT EXISTS signals (
    signal_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    signal_name TEXT NOT NULL,
    signal_value REAL NOT NULL,
    signal_unit TEXT NOT NULL,
    signal_direction TEXT NOT NULL,
    weight REAL NOT NULL,
    confidence REAL NOT NULL,
    source_platform TEXT,
    source_dataset TEXT,
    window TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL,
    lifecycle_expires_at TEXT,
    transform_hash TEXT,
    metrics TEXT,
    raw_payload TEXT,
    collector_trace_id TEXT,
    ingested_at TEXT NOT NULL,
    UNIQUE (entity_type, entity_id, signal_name, window)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_signals_entity ON signals(entity_type, entity_id)`,

  `CREATE TABLE IF NOT EXISTS hourly_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    hour TEXT NOT NULL,
    signal_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hourly_snapshot_signals (
    snapshot_id TEXT NOT NULL REFERENCES hourly_snapshots(snapshot_id),
    signal_id TEXT NOT NULL REFERENCES signals(signal_id),
    PRIMARY KEY (snapshot_id, signal_id)
  )`,

  `CREATE TABLE IF NOT EXISTS ranking_profiles (
    name TEXT PRIMARY KEY,
    weights TEXT NOT NULL,
    signal_mapping TEXT NOT NULL,
    goal TEXT,
    description TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS ranking_results (
    ranking_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    profile TEXT NOT NULL,
    overall_score REAL NOT NULL,
    component_scores TEXT NOT NULL,
    confidence REAL NOT NULL,
    coverage REAL NOT NULL,
    strengths TEXT NOT NULL,
    risks TEXT NOT NULL,
    decision_trace TEXT NOT NULL,
    signals_used TEXT NOT NULL,
    memory_adjustments TEXT NOT NULL,
    ranked_at TEXT NOT NULL,
    UNIQUE (entity_type, entity_id, profile)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ranking_profile ON ranking_results(profile, overall_score DESC)`,

  `CREATE TABLE IF NOT EXISTS reviews (
    review_id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    agent_id TEXT,
    profile TEXT,
    entity_id TEXT NOT NULL,
    agent_rank INTEGER,
    ground_truth_rank INTEGER,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    reason_category TEXT,
    reviewer TEXT NOT NULL,
    signal_snapshot TEXT,
    explainability_ref TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    final_decision TEXT,
    created_at TEXT NOT NULL,
    reviewed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_entity ON reviews(domain, entity_id)`,

  `CREATE TABLE IF NOT EXISTS feedback (
    feedback_id TEXT PRIMARY KEY,
    review_id TEXT REFERENCES reviews(review_id),
    task_id TEXT,
    execution_id TEXT,
    agent_output TEXT,
    human_action TEXT,
    metric_delta TEXT,
    attribution_window TEXT,
    baseline TEXT,
    post_value TEXT,
    signal_usefulness TEXT,
    timestamp TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS knowledge (
    knowledge_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    domain TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    source TEXT NOT NULL,
    fingerprint TEXT UNIQUE,
    promoted_at TEXT,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS context_memories (
    memory_id TEXT PRIMARY KEY,
    memory_type TEXT NOT NULL,
    scope_entity_type TEXT,
    scope_entity_ids TEXT,
    statement TEXT NOT NULL,
    evidence TEXT NOT NULL,
    weight TEXT NOT NULL,
    temporal TEXT NOT NULL,
    status TEXT NOT NULL,
    validation_state TEXT NOT NULL,
    validator TEXT,
    validated_at TEXT,
    override TEXT NOT NULL DEFAULT '{"is_overridden":false}',
    trace TEXT NOT NULL,
    adjustment TEXT,
    agent_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_memory_status ON context_memories(status, validation_state)`,

  `CREATE TABLE IF NOT EXISTS business_traces (
    trace_id TEXT PRIMARY KEY,
    ranking_id TEXT,
    conclusion TEXT NOT NULL,
    system_truth TEXT NOT NULL,
    alignment TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS collector_registry (
    source TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    shop_name TEXT,
    signal_types TEXT NOT NULL,
    collector_script TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    last_run_at TEXT,
    last_status TEXT,
    PRIMARY KEY (source, shop_id)
  )`,

  `CREATE TABLE IF NOT EXISTS signal_weights (
    signal_name TEXT PRIMARY KEY,
    weight REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'default',
    rationale TEXT,
    sample_count INTEGER,
    usefulness_score REAL,
    updated_at TEXT NOT NULL
  )`,
];

/** Apply the full schema idempotently and record the schema version. */
export const applySchema = (db: Db): void => {
  db.exec(STATEMENTS.join(';\n'));
  const recorded = db
    .prepare('SELECT 1 FROM schema_version WHERE version = ?')
    .get(SCHEMA_VERSION);
  if (!recorded) {
    db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
      SCHEMA_VERSION,
      nowIso(),
    );
  }
};

// JD Shangzhi — raw business data persistence schema.
// Stores actual business data (rankings, keyword lists, brand compositions, etc.)
// discovered by the Explorer Fabric, alongside the signal layer.
//
// Tables:
//   jd_raw_data          — per-row business data (e.g. one product in a ranking)
//   jd_collection_runs   — collection run tracking (full / incremental / hourly)
//   jd_dataset_metadata  — dataset definitions populated from blueprint.yaml
//   jd_metric_timeseries — aggregated metric values for trend analysis

import type { Database as Db } from 'better-sqlite3';

const STATEMENTS = [
  // ── Raw business data ──────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS jd_raw_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    dataset_name TEXT NOT NULL,
    source_page TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    fields TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    data_date TEXT NOT NULL,
    UNIQUE(dataset_id, source_page, row_index, data_date)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_jd_raw_dataset ON jd_raw_data(dataset_id, data_date)`,
  `CREATE INDEX IF NOT EXISTS idx_jd_raw_collected ON jd_raw_data(collected_at)`,

  // ── Collection run tracking ────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS jd_collection_runs (
    run_id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'jd_smart',
    shop_id TEXT NOT NULL,
    run_type TEXT NOT NULL CHECK(run_type IN ('full', 'incremental', 'hourly')),
    date_range_start TEXT NOT NULL,
    date_range_end TEXT NOT NULL,
    datasets_collected TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'partial', 'failed')),
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL
  )`,

  // ── Dataset metadata (from blueprint) ──────────────────────────

  `CREATE TABLE IF NOT EXISTS jd_dataset_metadata (
    dataset_id TEXT PRIMARY KEY,
    dataset_name TEXT NOT NULL,
    source_page TEXT NOT NULL,
    grain TEXT NOT NULL,
    columns TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    parent_class TEXT,
    table_class TEXT,
    update_frequency TEXT DEFAULT 'daily',
    last_collected_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Metric timeseries ──────────────────────────────────────────

  `CREATE TABLE IF NOT EXISTS jd_metric_timeseries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    data_date TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    UNIQUE(dataset_id, entity_id, metric_name, data_date)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_jd_metric_date ON jd_metric_timeseries(data_date)`,
  `CREATE INDEX IF NOT EXISTS idx_jd_metric_entity ON jd_metric_timeseries(entity_id, metric_name)`,
];

export const applyJdSchema = (db: Db): void => {
  db.exec(STATEMENTS.join(';\n'));
};

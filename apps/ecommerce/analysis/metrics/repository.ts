// Signal persistence: read/write Signal records + hourly snapshots to SQLite.

import type { Database as Db } from 'better-sqlite3';
import type { Signal } from '#shared/schemas/signal.js';
import { nowIso, hourBucket } from '#shared/utils/time.js';
import { uuid } from '#shared/utils/crypto.js';

interface SignalRow {
  signal_id: string;
  entity_type: string;
  entity_id: string;
  signal_name: string;
  signal_value: number;
  signal_unit: string;
  signal_direction: string;
  weight: number;
  confidence: number;
  source_platform: string;
  source_dataset: string;
  window: string;
  lifecycle_status: string;
  lifecycle_expires_at: string | null;
  transform_hash: string;
  ingested_at: string;
  observed_at: string;
  metrics: string | null;
}

const toRow = (s: Signal): SignalRow => ({
  signal_id: s.signal_id,
  entity_type: s.entity_type,
  entity_id: s.entity_id,
  signal_name: s.signal_name,
  signal_value: s.signal_value,
  signal_unit: s.signal_unit,
  signal_direction: s.signal_direction,
  weight: s.weight,
  confidence: s.confidence,
  source_platform: s.source.platform,
  source_dataset: s.source.dataset,
  window: s.window,
  lifecycle_status: s.lifecycle.status,
  lifecycle_expires_at: s.lifecycle.expires_at,
  transform_hash: s.trace.transform_hash,
  ingested_at: s.source.ingested_at,
  observed_at: s.observed_at,
  metrics: (s as unknown as { metrics?: Record<string, number> }).metrics
    ? JSON.stringify((s as unknown as { metrics?: Record<string, number> }).metrics)
    : null,
});

/** Upsert signals (replace existing on UNIQUE(entity, name, window)). */
export const storeSignals = (db: Db, signals: readonly Signal[]): number => {
  const stmt = db.prepare(
    `INSERT INTO signals (
       signal_id, entity_type, entity_id, signal_name, signal_value, signal_unit,
       signal_direction, weight, confidence, source_platform, source_dataset, window,
       lifecycle_status, lifecycle_expires_at, transform_hash, ingested_at, observed_at, metrics
     ) VALUES (
       @signal_id, @entity_type, @entity_id, @signal_name, @signal_value, @signal_unit,
       @signal_direction, @weight, @confidence, @source_platform, @source_dataset, @window,
       @lifecycle_status, @lifecycle_expires_at, @transform_hash, @ingested_at, @observed_at, @metrics
     )
     ON CONFLICT(entity_type, entity_id, signal_name, window, observed_at) DO UPDATE SET
       signal_value = excluded.signal_value,
       signal_direction = excluded.signal_direction,
       weight = excluded.weight,
       confidence = excluded.confidence,
       metrics = excluded.metrics,
       lifecycle_status = excluded.lifecycle_status,
       lifecycle_expires_at = excluded.lifecycle_expires_at,
       transform_hash = excluded.transform_hash,
       ingested_at = excluded.ingested_at`,
  );
  let count = 0;
  const tx = db.transaction((rows: readonly SignalRow[]) => {
    for (const row of rows) {
      stmt.run(row);
      count += 1;
    }
  });
  tx(signals.map(toRow));
  return count;
};

/** List all signals for an entity (most recent per name deduped by caller). */
export const listSignals = (db: Db, entityType: string, entityId: string): Signal[] => {
  const rows = db
    .prepare(
      'SELECT * FROM signals WHERE entity_type = ? AND entity_id = ? ORDER BY observed_at DESC',
    )
    .all(entityType, entityId) as SignalRow[];
  return rows.map(fromRow);
};

/** List signals for many entities at once (e.g. all products for ranking). */
export const listAllSignals = (db: Db, entityType: string): Signal[] => {
  const rows = db
    .prepare('SELECT * FROM signals WHERE entity_type = ? ORDER BY entity_id, observed_at DESC')
    .all(entityType) as SignalRow[];
  return rows.map(fromRow);
};

const fromRow = (r: SignalRow): Signal => ({
  signal_id: r.signal_id,
  entity_type: r.entity_type as Signal['entity_type'],
  entity_id: r.entity_id,
  signal_name: r.signal_name,
  signal_value: r.signal_value,
  signal_unit: r.signal_unit as Signal['signal_unit'],
  signal_direction: r.signal_direction as Signal['signal_direction'],
  weight: r.weight,
  confidence: r.confidence,
  source: {
    platform: r.source_platform,
    dataset: r.source_dataset,
    ingested_at: r.ingested_at,
  },
  window: r.window,
  observed_at: r.observed_at,
  lifecycle: {
    version: 1,
    status: r.lifecycle_status as Signal['lifecycle']['status'],
    expires_at: r.lifecycle_expires_at,
  },
  trace: { pipeline_run_id: '', transform_hash: r.transform_hash },
  metrics: r.metrics ? (JSON.parse(r.metrics) as Record<string, number>) : undefined,
} as Signal & { metrics?: Record<string, number> });

/** Record an hourly snapshot for a batch of (platform-collected) signals. */
export const recordHourlySnapshot = (
  db: Db,
  source: string,
  shopId: string,
  signals: readonly Signal[],
): string => {
  const snapshotId = uuid();
  const hour = hourBucket(nowIso());
  const created = nowIso();
  db.prepare(
    `INSERT INTO hourly_snapshots (snapshot_id, source, shop_id, hour, signal_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(snapshotId, source, shopId, hour, signals.length, created);
  const linkStmt = db.prepare(
    'INSERT OR IGNORE INTO hourly_snapshot_signals (snapshot_id, signal_id) VALUES (?, ?)',
  );
  const linkTx = db.transaction((rows: readonly { sid: string; sigid: string }[]) => {
    for (const r of rows) linkStmt.run(r.sid, r.sigid);
  });
  linkTx(signals.map((s) => ({ sid: snapshotId, sigid: s.signal_id })));
  return snapshotId;
};

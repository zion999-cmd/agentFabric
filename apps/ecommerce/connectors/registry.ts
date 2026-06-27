// Collector registry — CRUD for platform collector configurations in SQLite.

import type { Database as Db } from 'better-sqlite3';
import type {
  EnterpriseSignalType,
  SignalSourcePlatform,
} from '#shared/schemas/signal.js';
import type { CollectorRegistryEntry } from '#shared/schemas/collector.js';
import { nowIso } from '#shared/utils/time.js';

interface RegistryRow {
  source: string;
  shop_id: string;
  shop_name: string | null;
  signal_types: string;
  collector_script: string;
  enabled: number;
  last_run_at: string | null;
  last_status: string | null;
}

export const upsertCollector = (db: Db, entry: CollectorRegistryEntry): void => {
  db.prepare(
    `INSERT INTO collector_registry (
       source, shop_id, shop_name, signal_types, collector_script, enabled, last_run_at, last_status
     ) VALUES (
       @source, @shop_id, @shop_name, @signal_types, @collector_script, @enabled, @last_run_at, @last_status
     )
     ON CONFLICT(source, shop_id) DO UPDATE SET
       shop_name = excluded.shop_name, signal_types = excluded.signal_types,
       collector_script = excluded.collector_script, enabled = excluded.enabled`,
  ).run({
    source: entry.source,
    shop_id: entry.shop_id,
    shop_name: entry.shop_name ?? null,
    signal_types: JSON.stringify(entry.signal_types),
    collector_script: entry.collector_script,
    enabled: entry.enabled ? 1 : 0,
    last_run_at: entry.last_run_at ?? null,
    last_status: entry.last_status ?? null,
  });
};

export const listCollectors = (db: Db): CollectorRegistryEntry[] => {
  const rows = db.prepare('SELECT * FROM collector_registry').all() as RegistryRow[];
  return rows.map((r) => ({
    source: r.source as SignalSourcePlatform,
    shop_id: r.shop_id,
    ...(r.shop_name ? { shop_name: r.shop_name } : {}),
    signal_types: JSON.parse(r.signal_types) as EnterpriseSignalType[],
    collector_script: r.collector_script,
    enabled: r.enabled === 1,
    ...(r.last_run_at ? { last_run_at: r.last_run_at } : {}),
    ...(r.last_status ? { last_status: r.last_status as 'ok' | 'error' } : {}),
  }));
};

export const recordCollectorRun = (
  db: Db,
  source: string,
  shopId: string,
  status: 'ok' | 'error',
): void => {
  db.prepare(
    `UPDATE collector_registry SET last_run_at = ?, last_status = ? WHERE source = ? AND shop_id = ?`,
  ).run(nowIso(), status, source, shopId);
};

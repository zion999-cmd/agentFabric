// JD Shangzhi — persist acquired data to SQLite.
// Bridges the CDP acquisition layer (cdp-client.ts) with the persistence layer
// (jd-schema.ts). Transforms raw API responses into structured tables and timeseries.

import type { Database as Db } from 'better-sqlite3';
import type { AcquireResult } from '#app/connectors/jd/acquisition/index.js';
import { applyJdSchema } from './jd-schema.js';

export { applyJdSchema };

// ── Types ──────────────────────────────────────────────────────────

/** Flattened row from a JD Shangzhi table. */
export interface JdRawRow {
  datasetId: string;
  datasetName: string;
  sourcePage: string;
  rowIndex: number;
  fields: Record<string, unknown>;
  dataDate: string;
}

/** Flattened metric for timeseries storage. */
export interface JdMetricPoint {
  datasetId: string;
  entityId: string;
  entityName: string;
  metricName: string;
  metricValue: number;
  dataDate: string;
}

// ── Row extraction helpers ─────────────────────────────────────────

/**
 * Extract rows from a JD API response body.
 * Handles different response shapes: array of objects, nested data objects, etc.
 */
const extractRowsFromPayload = (
  apiName: string,
  payload: unknown,
  date: string,
): JdRawRow[] => {
  if (!payload || typeof payload !== 'object') return [];

  const rows: JdRawRow[] = [];
  const body = (payload as Record<string, unknown>).body;
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>).data : payload;

  // Normalize to array
  const items: unknown[] = Array.isArray(data) ? data : data ? [data] : [];

  const datasetNames: Record<string, string> = {
    productTop: '热销商品排行榜',
    summary: '交易概况',
    trend: '趋势数据',
    flowAnalysis: '流量分析',
    productAnalysis: '商品分析',
    shopStars: '店铺星级',
    shopValueProposition: '店铺价值主张',
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    const fields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'number') {
        fields[key] = value;
      } else if (typeof value === 'string') {
        // Clean currency symbols and commas
        const cleaned = value.replace(/[￥¥,]/g, '').trim();
        const num = parseFloat(cleaned);
        fields[key] = isNaN(num) ? value : num;
      } else {
        fields[key] = value;
      }
    }

    rows.push({
      datasetId: apiName,
      datasetName: datasetNames[apiName] || apiName,
      sourcePage: 'API',
      rowIndex: i,
      fields,
      dataDate: date,
    });
  }

  return rows;
};

// ── Metric extraction ──────────────────────────────────────────────

/**
 * Extract numeric metrics from raw rows for timeseries storage.
 * Skips string fields (names, descriptions) and focuses on measurable values.
 */
const extractMetricsFromRows = (rows: JdRawRow[]): JdMetricPoint[] => {
  const metrics: JdMetricPoint[] = [];

  for (const row of rows) {
    // Determine entity identifier based on dataset
    let entityId = String(row.fields['排名'] ?? row.fields['排名'] ?? row.rowIndex);
    let entityName = String(
      row.fields['商品信息'] ??
      row.fields['品牌'] ??
      row.fields['渠道名称'] ??
      row.fields['排名'] ??
      '',
    );

    // For product/channels, use the actual name as entity
    if (row.fields['商品信息']) entityId = String(row.fields['商品信息']);
    if (row.fields['品牌']) entityId = String(row.fields['品牌']);
    if (row.fields['渠道名称']) entityId = String(row.fields['渠道名称']);
    if (row.fields['sku_id']) entityId = String(row.fields['sku_id']);
    if (row.fields['sku_info']) entityId = String(row.fields['sku_info']);

    for (const [key, value] of Object.entries(row.fields)) {
      if (typeof value === 'number' && !['rowIndex', '排名'].includes(key)) {
        metrics.push({
          datasetId: row.datasetId,
          entityId,
          entityName,
          metricName: key,
          metricValue: value,
          dataDate: row.dataDate,
        });
      }
    }
  }

  return metrics;
};

// ── Persistence ────────────────────────────────────────────────────

/**
 * Persist acquired JD data into SQLite.
 *
 * Expected flow:
 *   1. acquireJdViaCDP() captures API responses grouped by date
 *   2. Each date's payload is parsed and flattened into rows
 *   3. Rows are upserted into jd_raw_data
 *   4. Numeric metrics are extracted into jd_metric_timeseries
 *   5. Collection run is recorded in jd_collection_runs
 */
export const persistJdData = (
  db: Db,
  acquireResult: AcquireResult,
  _shopId: string,
  runId: string,
): { rowsInserted: number; metricsInserted: number; errors: string[] } => {
  const errors: string[] = [];
  let rowsInserted = 0;
  let metricsInserted = 0;

  const now = new Date().toISOString();

  // Insert collection run record
  const runStmt = db.prepare(`
    INSERT OR REPLACE INTO jd_collection_runs (
      run_id, shop_id, run_type, date_range_start, date_range_end,
      datasets_collected, total_rows, status, started_at, completed_at, created_at
    ) VALUES (?, 'jd_smart', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Prepare upsert statements
  const rawUpsert = db.prepare(`
    INSERT INTO jd_raw_data (dataset_id, dataset_name, source_page, row_index, fields, collected_at, data_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(dataset_id, source_page, row_index, data_date) DO UPDATE SET
      fields = excluded.fields,
      collected_at = excluded.collected_at
  `);

  const metricUpsert = db.prepare(`
    INSERT INTO jd_metric_timeseries (dataset_id, entity_id, entity_name, metric_name, metric_value, data_date, collected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(dataset_id, entity_id, metric_name, data_date) DO UPDATE SET
      metric_value = excluded.metric_value,
      collected_at = excluded.collected_at
  `);

  const allData = acquireResult.allData ?? (acquireResult.data ? [acquireResult.data] : []);
  const allRaw = acquireResult.allRawPayloads ?? (acquireResult.rawPayload ? [acquireResult.rawPayload] : []);

  if (allData.length === 0) {
    return { rowsInserted: 0, metricsInserted: 0, errors: ['No data to persist'] };
  }

  // Determine date range
  const dates = allData.map((_, i) => {
    // Try to extract date from the raw payload or use index
    const raw = allRaw[i];
    if (raw && typeof raw === 'object' && 'date' in raw) {
      return String(raw.date);
    }
    return `day_${i}`;
  });

  const runType = dates.length === 1 ? 'incremental' : 'full';
  const datasets: string[] = [];

  // Process each day's data
  for (let dayIdx = 0; dayIdx < allData.length; dayIdx++) {
    const raw = allRaw[dayIdx];
    const date = dates[dayIdx] ?? `day_${dayIdx}`;

    // Extract rows from each API response type
    const apiFields = ['summary', 'trend', 'productTop', 'flowAnalysis', 'productAnalysis', 'shopStars', 'shopValueProposition'];

    for (const field of apiFields) {
      if (!(field in (raw ?? {}))) continue;
      const payload = (raw as Record<string, unknown>)[field];
      const apiName = field;

      const rows = extractRowsFromPayload(apiName, payload, date);
      for (const row of rows) {
        if (!datasets.includes(row.datasetId)) datasets.push(row.datasetId);
        rawUpsert.run(
          row.datasetId,
          row.datasetName,
          row.sourcePage,
          row.rowIndex,
          JSON.stringify(row.fields),
          now,
          row.dataDate,
        );
        rowsInserted++;

        // Extract metrics
        const rowMetrics = extractMetricsFromRows([row]);
        for (const m of rowMetrics) {
          metricUpsert.run(
            m.datasetId,
            m.entityId,
            m.entityName,
            m.metricName,
            m.metricValue,
            m.dataDate,
            now,
          );
          metricsInserted++;
        }
      }
    }
  }

  // Record run completion
  runStmt.run(
    runId,
    runType,
    dates[0] ?? '',
    dates[dates.length - 1] ?? '',
    JSON.stringify([...datasets]),
    rowsInserted,
    'completed',
    now,
    now,
    now,
  );

  return { rowsInserted, metricsInserted, errors };
};

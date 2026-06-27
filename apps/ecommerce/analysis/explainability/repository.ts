// Trace persistence: store business conclusion traces to SQLite.

import type { Database as Db } from 'better-sqlite3';
import type { BusinessConclusionTrace } from '#shared/schemas/trace.js';

/** Store a trace (insert). Returns the trace_id. */
export const storeTrace = (db: Db, trace: BusinessConclusionTrace): string => {
  db.prepare(
    `INSERT INTO business_traces (trace_id, ranking_id, conclusion, system_truth, alignment, created_at)
     VALUES (@trace_id, @ranking_id, @conclusion, @system_truth, @alignment, @created_at)`,
  ).run({
    trace_id: trace.trace_id,
    ranking_id: trace.system_truth.ranking?.ranking_id ?? null,
    conclusion: JSON.stringify(trace.conclusion),
    system_truth: JSON.stringify(trace.system_truth),
    alignment: JSON.stringify(trace.alignment),
    created_at: trace.created_at,
  });
  return trace.trace_id;
};

/** Load a trace by id. */
export const loadTrace = (db: Db, traceId: string): BusinessConclusionTrace | null => {
  const row = db
    .prepare('SELECT * FROM business_traces WHERE trace_id = ?')
    .get(traceId) as
    | {
        trace_id: string;
        conclusion: string;
        system_truth: string;
        alignment: string;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    trace_id: row.trace_id,
    conclusion: JSON.parse(row.conclusion),
    system_truth: JSON.parse(row.system_truth),
    alignment: JSON.parse(row.alignment),
    created_at: row.created_at,
  };
};

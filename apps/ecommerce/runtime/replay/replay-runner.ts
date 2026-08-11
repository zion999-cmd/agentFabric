// Replay Runner — date loop over kernel.execute().
// P0006.2: Replay is NOT a new mode. It does one thing: loops over dates
// and calls kernel.execute() for each. Signal, Evidence, Ranking, Memory
// all remain unchanged. Kernel never knows data came from replay.
//
// The only difference: acquire function swapped from Live → Historical.

import type { Database as Db } from 'better-sqlite3';
import type { BoundCapabilityModel } from '#app/connectors/binding/types.js';
import { createRuntimeKernel } from '#app/runtime/kernel/index.js';
import { createHistoricalAcquire } from '#app/connectors/jd/historical-acquire.js';

// ---- Types ----

export interface ReplayOptions {
  shopId: string;
  from: string;  // YYYY-MM-DD
  to: string;    // YYYY-MM-DD
}

export interface ReplayDayResult {
  date: string;
  signals: number;
  evidence: number;
  success: boolean;
  error?: string;
}

export interface ReplayResult {
  success: boolean;
  days: number;
  completed: number;
  failed: number;
  signals: number;
  evidence: number;
  executions: number;
  results: ReplayDayResult[];
  errors: string[];
}

// ---- Runner ----

/**
 * Run replay over a date range.
 *
 * Creates a kernel with historical acquire, then calls kernel.execute()
 * for each day in the range. All business logic (signal engine, evidence
 * orchestrator, normalizer) runs exactly as it would for live data.
 */
export const runReplay = async (
  db: Db,
  blueprint: BoundCapabilityModel,
  options: ReplayOptions,
): Promise<ReplayResult> => {
  const { shopId, from, to } = options;

  // Create kernel with historical acquire — same kernel, different data source
  const historicalAcquire = createHistoricalAcquire();
  const kernel = createRuntimeKernel(db, blueprint, historicalAcquire);

  // Build date range
  const dates = dateRange(from, to);
  const results: ReplayDayResult[] = [];
  const errors: string[] = [];
  let totalSignals = 0;
  let totalEvidence = 0;
  let completed = 0;
  let failed = 0;

  for (const date of dates) {
    try {
      const result = await kernel.execute({ shopId, date, mock: false, acquisitionMethod: 'cdp', processingMethod: 'replay' });
      if (result.success) {
        completed++;
        totalSignals += result.signals.length;
        totalEvidence += result.evidence.length;
        results.push({
          date,
          signals: result.signals.length,
          evidence: result.evidence.length,
          success: true,
        });
      } else {
        failed++;
        const errMsg = result.errors.join('; ') || 'Unknown error';
        errors.push(`${date}: ${errMsg}`);
        results.push({
          date,
          signals: 0,
          evidence: 0,
          success: false,
          error: errMsg,
        });
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${date}: ${msg}`);
      results.push({
        date,
        signals: 0,
        evidence: 0,
        success: false,
        error: msg,
      });
    }
  }

  return {
    success: failed === 0,
    days: dates.length,
    completed,
    failed,
    signals: totalSignals,
    evidence: totalEvidence,
    executions: completed,
    results,
    errors,
  };
};

/** Generate an array of dates (YYYY-MM-DD) between from and to (inclusive). */
const dateRange = (from: string, to: string): string[] => {
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

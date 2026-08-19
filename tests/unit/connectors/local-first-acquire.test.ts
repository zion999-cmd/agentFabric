// P0009 correction — local-first → live-on-miss acquire tests.
// Verifies: local evidence hit → no live CDP; local miss → live CDP invoked.

import { describe, it, expect, vi, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLocalFirstLiveAcquire } from '#app/connectors/jd/historical-acquire.js';
import { saveEvidence } from '#app/connectors/evidence/store.js';
import type { AcquireResult } from '#app/connectors/jd/acquisition/index.js';

const DATE_LOCAL = '2099-01-01';
const DATE_MISS = '2099-01-02';
const DATE_MIXED = '2099-01-03';
const EVIDENCE_JD_DIR = resolve(process.cwd(), 'data', 'evidence', 'jd');

/** Injected live acquire stub — records calls, returns a canned CDP payload. */
const makeLive = (payload: Record<string, unknown>) =>
  vi.fn(async (): Promise<AcquireResult> => ({
    success: true,
    method: 'cdp',
    rawPayload: payload,
  }));

describe('createLocalFirstLiveAcquire', () => {
  afterAll(() => {
    // Remove only this suite's own month (2099-01-*), not the whole 2099 year —
    // the local-first-reuse suite shares the same year (2099-03-*) on disk.
    rmSync(resolve(EVIDENCE_JD_DIR, '2099', '01'), { recursive: true, force: true });
  });

  it('uses local evidence and does NOT trigger live CDP when evidence exists', async () => {
    saveEvidence('jd', 'jd_shop_001', DATE_LOCAL, 'summary', { gmv: 123 });
    const live = makeLive({ summary: { gmv: 999 } });
    const acquire = createLocalFirstLiveAcquire(live);

    const data = await acquire('jd_shop_001', ['summary.ajax'], { date: DATE_LOCAL });

    expect(live).not.toHaveBeenCalled();
    expect(data['summary.ajax']).toEqual({ gmv: 123 });
  });

  it('triggers live CDP for endpoints whose local evidence is missing', async () => {
    const live = makeLive({ summary: { gmv: 999 } });
    const acquire = createLocalFirstLiveAcquire(live);

    const data = await acquire('jd_shop_001', ['summary.ajax'], { date: DATE_MISS });

    expect(live).toHaveBeenCalledTimes(1);
    // Live acquire is single-date scoped to the missing date.
    expect(live).toHaveBeenCalledWith(expect.objectContaining({ mock: false }));
    expect(data['summary.ajax']).toEqual({ gmv: 999 });
  });

  it('fills only the missing endpoints from live, keeps local for the rest', async () => {
    saveEvidence('jd', 'jd_shop_001', DATE_MIXED, 'trend', { hourly: [1, 2] });
    const live = makeLive({ summary: { gmv: 999 }, trend: { hourly: [9] } });
    const acquire = createLocalFirstLiveAcquire(live);

    const data = await acquire(
      'jd_shop_001',
      ['trend.ajax', 'summary.ajax'], // trend local, summary missing
      { date: DATE_MIXED },
    );

    expect(live).toHaveBeenCalledTimes(1);
    expect(data['trend.ajax']).toEqual({ hourly: [1, 2] }); // local
    expect(data['summary.ajax']).toEqual({ gmv: 999 }); // live
  });

  it('throws when live CDP fails for missing evidence (honest completion)', async () => {
    const live = vi.fn(async (): Promise<AcquireResult> => ({
      success: false,
      method: 'cdp',
      error: 'No 京东商智 page found in Chrome',
    }));
    const acquire = createLocalFirstLiveAcquire(live);

    await expect(
      acquire('jd_shop_001', ['summary.ajax'], { date: DATE_MISS }),
    ).rejects.toThrow('No 京东商智 page found in Chrome');
  });
});

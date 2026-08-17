// P0009 Evidence Reuse regression test.
// miss → live → persist → immediate second acquire → local hit → liveAcquire stays 1.

import { describe, it, expect, vi, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLocalFirstLiveAcquire } from '#app/connectors/jd/historical-acquire.js';
import { saveEvidence, loadEvidence } from '#app/connectors/evidence/store.js';
import type { AcquireResult } from '#app/connectors/jd/acquisition/index.js';

const DATE_ROUNDTRIP = '2099-03-01';
const DATE_REUSE = '2099-03-02';
const DATE_SKIP = '2099-03-03';
const EVIDENCE_JD_DIR = resolve(process.cwd(), 'data', 'evidence', 'jd');

const makeLive = (payload: Record<string, unknown>) =>
  vi.fn(async (): Promise<AcquireResult> => ({
    success: true,
    method: 'cdp',
    rawPayload: payload,
  }));

describe('local-first evidence reuse', () => {
  afterAll(() => {
    for (const d of [DATE_ROUNDTRIP, DATE_REUSE, DATE_SKIP]) {
      const [y, m, dd] = d.split('-');
      for (const t of ['summary', 'trend']) {
        rmSync(resolve(EVIDENCE_JD_DIR, y!, m!, `${dd}_${t}.json`), { force: true });
        rmSync(resolve(EVIDENCE_JD_DIR, y!, m!, `${dd}_${t}.meta.json`), { force: true });
      }
    }
  });

  it('save/load round-trip', () => {
    saveEvidence('jd', 'jd_shop_001', DATE_ROUNDTRIP, 'summary', { gmv: 123 });
    const loaded = loadEvidence('jd', DATE_ROUNDTRIP, 'summary');
    expect(loaded).not.toBeNull();
    expect((loaded!.data as { gmv: number }).gmv).toBe(123);
  });

  it('miss → live → persist → second acquire hits local (liveAcquire stays 1)', async () => {
    const live = makeLive({ summary: { gmv: 999 }, trend: { hourly: [9] } });
    const acquire = createLocalFirstLiveAcquire(live);

    // First acquire: miss → live.
    const data1 = await acquire('jd_shop_001', ['summary', 'trend'], { date: DATE_REUSE });
    expect(live).toHaveBeenCalledTimes(1);
    expect(data1['summary']).toEqual({ gmv: 999 });

    // Persist (what the pipeline's captureEvidence does).
    saveEvidence('jd', 'jd_shop_001', DATE_REUSE, 'summary', data1['summary']);
    saveEvidence('jd', 'jd_shop_001', DATE_REUSE, 'trend', data1['trend']);

    // Second acquire: should hit local, no re-trigger.
    const data2 = await acquire('jd_shop_001', ['summary', 'trend'], { date: DATE_REUSE });
    expect(live).toHaveBeenCalledTimes(1);
    expect(data2['summary']).toEqual({ gmv: 999 });
  });

  it('skips non-persistable endpoints (no re-trigger from getFlowAnalysisData)', async () => {
    const live = makeLive({ summary: { gmv: 999 }, trend: { hourly: [9] } });
    const acquire = createLocalFirstLiveAcquire(live);

    // First acquire: summary/trend missing → live; getFlowAnalysisData skipped.
    const data1 = await acquire('jd_shop_001', ['summary', 'trend', 'getFlowAnalysisData'], { date: DATE_SKIP });
    expect(live).toHaveBeenCalledTimes(1);
    expect(data1['summary']).toEqual({ gmv: 999 });
    expect(data1['getFlowAnalysisData']).toBeUndefined();

    saveEvidence('jd', 'jd_shop_001', DATE_SKIP, 'summary', data1['summary']);
    saveEvidence('jd', 'jd_shop_001', DATE_SKIP, 'trend', data1['trend']);

    // Second acquire: summary/trend hit, getFlowAnalysisData skipped → no re-trigger.
    const data2 = await acquire('jd_shop_001', ['summary', 'trend', 'getFlowAnalysisData'], { date: DATE_SKIP });
    expect(live).toHaveBeenCalledTimes(1);
    expect(data2['summary']).toEqual({ gmv: 999 });
  });
});

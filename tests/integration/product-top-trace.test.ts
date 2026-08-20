import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { TraceFacade } from '#app/analysis/explainability/facade.js';
import { generateProductTopSignals } from '#app/analysis/metrics/product-top-signals.js';
import type { JdProductTopEntry } from '#app/connectors/jd/parsers/index.js';

const TEMP_DB = './data/test-product-top-trace.db';

// Five real SKUs with distinct GMV, matching the JD productTop shape.
const topProducts: JdProductTopEntry[] = [
  { sku_id: '10072459153406', name: '祁门红茶特级', gmv: 1850, item_url: 'https://item.jd.com/10072459153406.html' },
  { sku_id: '10128447475894', name: '祁门红茶一级', gmv: 1240, item_url: 'https://item.jd.com/10128447475894.html' },
  { sku_id: '10072459317818', name: '祁门红茶礼盒装', gmv: 890, item_url: 'https://item.jd.com/10072459317818.html' },
  { sku_id: '10114242621660', name: '祁门红茶散装', gmv: 520, item_url: 'https://item.jd.com/10114242621660.html' },
  { sku_id: '10120900397847', name: '祁门红茶小罐装', gmv: 340, item_url: 'https://item.jd.com/10120900397847.html' },
];

/** Mirror the backfill wiring: productTop signals → rankings → names. */
const rankProductTop = () => {
  const signals = generateProductTopSignals(topProducts);
  const rankings = RankingFacade.rankByProfile(signals, 'operator_mode', []);
  const namesByEntity = new Map(topProducts.map((p) => [p.sku_id, p.name]));
  return { signals, rankings, namesByEntity };
};

describe('productTop → ranking → business_traces wiring (integration)', () => {
  let db: ReturnType<typeof openDb>;

  beforeAll(() => {
    rmSync(TEMP_DB, { force: true });
    db = openDb(TEMP_DB);
    initDatabase(db);
  });

  afterAll(() => {
    db.close();
    rmSync(TEMP_DB, { force: true });
    rmSync(`${TEMP_DB}-wal`, { force: true });
    rmSync(`${TEMP_DB}-shm`, { force: true });
  });

  test('5 differentiated rankings → 5 traces, trust > 0, one-to-one', () => {
    const { signals, rankings, namesByEntity } = rankProductTop();

    expect(rankings).toHaveLength(5);
    // Differentiated overall scores (real per-SKU GMV differences).
    expect(rankings[0]!.overall_score).toBeGreaterThan(rankings[4]!.overall_score);

    const traces = rankings.map((ranking, index) =>
      TraceFacade.explainRanking({
        ranking,
        entitySignals: signals.filter((s) => s.entity_id === ranking.entity_id),
        profile: 'operator_mode',
        rank: index + 1,
        entityName: namesByEntity.get(ranking.entity_id),
      }),
    );

    expect(traces).toHaveLength(5);
    traces.forEach((trace, index) => {
      const ranking = rankings[index]!;
      // trace_id ↔ ranking_id ↔ SKU one-to-one.
      expect(trace.system_truth.ranking?.ranking_id).toBe(ranking.ranking_id);
      expect(trace.system_truth.ranking?.entity_id).toBe(ranking.entity_id);
      expect(trace.conclusion.entity_id).toBe(ranking.entity_id);
      // trust > 0: confidence 0.9, coverage 0.2 → unsupported (low_coverage) → 0.12.
      expect(trace.alignment.trust_score).toBeGreaterThan(0);
      expect(trace.alignment.contradictions).toContain('low_coverage');
    });
  });

  test('store + load round-trips (trace → ranking → SKU one-to-one)', () => {
    const { signals, rankings, namesByEntity } = rankProductTop();
    RankingFacade.store(db, 'operator_mode', rankings);

    const traceIds = rankings.map((ranking, index) =>
      TraceFacade.store(
        db,
        TraceFacade.explainRanking({
          ranking,
          entitySignals: signals.filter((s) => s.entity_id === ranking.entity_id),
          profile: 'operator_mode',
          rank: index + 1,
          entityName: namesByEntity.get(ranking.entity_id),
        }),
      ),
    );

    expect(traceIds).toHaveLength(5);
    traceIds.forEach((traceId, index) => {
      const reloaded = TraceFacade.load(db, traceId);
      expect(reloaded).not.toBeNull();
      expect(reloaded?.system_truth.ranking?.ranking_id).toBe(rankings[index]!.ranking_id);
      expect(reloaded?.conclusion.entity_id).toBe(rankings[index]!.entity_id);
      expect(reloaded?.alignment.trust_score).toBeGreaterThan(0);
    });
  });
});

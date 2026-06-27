import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { listProducts, listOrders, upsertOrders, upsertProducts } from '#platform/storage/product-repository.js';
import { rankProductsComposition, persistComposition } from '#app/orchestrator.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { TraceFacade } from '#app/analysis/explainability/facade.js';
import { canonicalNow, canonicalOrders, canonicalProducts } from '../fixtures/canonical-product.js';

const TEMP_DB = './data/test-composition.db';

describe('composition vertical (integration)', () => {
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

  test('compute signals -> rank -> trace end-to-end', async () => {
    const result = await rankProductsComposition({
      products: canonicalProducts,
      orders: canonicalOrders,
      profile: 'operator_mode',
      now: canonicalNow(),
    });

    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.rankings).toHaveLength(canonicalProducts.length);
    expect(result.topTrace.alignment.is_supported).toBe(true);
    expect(result.topTrace.system_truth.ranking).not.toBeNull();
    expect(result.aiSummary.length).toBeGreaterThan(0);
  });

  test('persist + reload round-trips through the DB', async () => {
    const result = await rankProductsComposition({
      products: canonicalProducts,
      orders: canonicalOrders,
      profile: 'sales_leaderboard',
      now: canonicalNow(),
    });
    persistComposition(db, 'sales_leaderboard', result);

    const reloadedSignals = SignalFacade.listAll(db, 'product');
    expect(reloadedSignals.length).toBeGreaterThan(0);

    const reloadedRankings = RankingFacade.load(db, 'sales_leaderboard');
    expect(reloadedRankings).toHaveLength(canonicalProducts.length);
    expect(reloadedRankings[0]?.entity_id).toBe(result.rankings[0]?.entity_id);

    const reloadedTrace = TraceFacade.load(db, result.topTrace.trace_id);
    expect(reloadedTrace).not.toBeNull();
    expect(reloadedTrace?.alignment.trust_score).toBe(
      result.topTrace.alignment.trust_score,
    );
  });

  test('product + order repository round-trips', () => {
    upsertProducts(db, canonicalProducts);
    upsertOrders(db, canonicalOrders);

    const products = listProducts(db);
    expect(products.length).toBe(canonicalProducts.length);
    expect(products[0]?.product_id).toBe(canonicalProducts[0]!.product_id);

    const orders = listOrders(db);
    expect(orders.length).toBe(canonicalOrders.length);
    expect(orders[0]?.items[0]?.productId).toBeDefined();
  });
});

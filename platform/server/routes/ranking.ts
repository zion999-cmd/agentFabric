// Ranking route — runs the composition vertical and returns ranked results + trace + AI summary.

import { Router } from 'express';
import { z } from 'zod';
import type { Database as Db } from 'better-sqlite3';
import { fail, ok } from '../envelope.js';
import { listOrders, listProducts } from '#platform/storage/product-repository.js';
import { rankProductsComposition, persistComposition } from '#app/orchestrator.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { analyzeBaseline, analyzePatterns, explainPatterns, buildOperatorMemories } from '#app/analysis/pattern/engine.js';
import { upsertMemories, listMemories, matchMemories, buildContext } from '#app/memory/index.js';
import { InMemoryRuntimeRegistry } from '#platform/runtime/registry.js';
import { DefaultRouter } from '#platform/runtime/router.js';
import { HermesRuntimeAdapter } from '#platform/runtime/hermes/adapter.js';
import { createHermesClient } from '#platform/runtime/hermes/index.js';

const RankRequestSchema = z.object({
  profile: z.enum(['sales_leaderboard', 'growth_discovery', 'operator_mode']).default('operator_mode'),
  persist: z.boolean().default(true),
  now: z.string().optional(), // ISO timestamp anchor (for replay/testing)
});

export const rankingRouter = (db: Db): Router => {
  const router = Router();

  // Construct the Runtime Control Plane (P0004): Registry → Adapter → Router.
  const runtimeRegistry = new InMemoryRuntimeRegistry();
  const hermesClient = createHermesClient();
  const hermesAdapter = new HermesRuntimeAdapter(hermesClient);
  runtimeRegistry.register(hermesAdapter.capability);
  // Store adapter reference in metadata so the Router can resolve it.
  const hermesEntry = runtimeRegistry.get('hermes')!;
  hermesEntry.metadata['adapter'] = hermesAdapter;
  const controlRouter = new DefaultRouter(runtimeRegistry);

  // POST /api/ranking — compute a fresh ranking from all products + orders in the DB.
  router.post('/ranking', async (req, res) => {
    const parsed = RankRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, `Invalid request: ${parsed.error.message}`);
      return;
    }
    try {
      const products = listProducts(db);
      const orders = listOrders(db);
      if (products.length === 0) {
        fail(res, 404, 'No products found. Run `npm run migrate:agentcms` to load sample data.');
        return;
      }
      const result = await rankProductsComposition({
        products,
        orders,
        profile: parsed.data.profile,
        db,
        router: controlRouter,
        ...(parsed.data.now ? { now: new Date(parsed.data.now) } : {}),
      });
      if (parsed.data.persist) persistComposition(db, parsed.data.profile, result);
      ok(res, {
        profile: parsed.data.profile,
        rankings: result.rankings,
        top_trace: result.topTrace,
        ai_summary: result.aiSummary,
      });
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Ranking failed');
    }
  });

  // GET /api/ranking/:profile — load persisted rankings.
  router.get('/ranking/:profile', (req, res) => {
    const profile = req.params['profile'];
    if (profile !== 'sales_leaderboard' && profile !== 'growth_discovery' && profile !== 'operator_mode') {
      fail(res, 400, `Unknown profile: ${profile}`);
      return;
    }
    const rankings = RankingFacade.load(db, profile);
    ok(res, rankings, { total: rankings.length, page: 1, limit: rankings.length });
  });

  // GET /api/signals — list all signals (optionally filtered by entity).
  router.get('/signals', (req, res) => {
    const entityType = (req.query['entity_type'] as string | undefined) ?? 'product';
    const entityId = req.query['entity_id'] as string | undefined;
    const signals = entityId
      ? SignalFacade.list(db, entityType, entityId)
      : SignalFacade.listAll(db, entityType);
    ok(res, signals, { total: signals.length, page: 1, limit: signals.length });
  });

  // GET /api/products — list all products (for name resolution).
  router.get('/products', (_req, res) => {
    const products = listProducts(db).map((p) => ({
      product_id: p.product_id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      status: p.status,
    }));
    ok(res, products, { total: products.length, page: 1, limit: products.length });
  });

  // GET /api/baseline — compute operational baseline (P0007.1.1).
  router.get('/baseline', (_req, res) => {
    try {
      const result = analyzeBaseline(db);
      ok(res, {
        snapshots: result.snapshots.slice(-30),
        season_model: result.season_model,
        summary: result.summary,
      }, {
        total: result.snapshots.length,
        page: 1,
        limit: 30,
      });
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Baseline analysis failed');
    }
  });

  // GET /api/patterns — detect patterns on baseline (P0007.1).
  router.get('/patterns', (_req, res) => {
    try {
      const result = analyzePatterns(db, { limit: 20 });
      ok(res, {
        events: result.events,
        baseline_summary: result.baseline.summary,
      }, {
        total: result.events.length,
        page: 1,
        limit: 20,
      });
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Pattern analysis failed');
    }
  });

  // GET /api/explain — explain pattern events (P0007.1.2).
  router.get('/explain', (req, res) => {
    try {
      const date = req.query['date'] as string | undefined;
      const limit = Math.min(Number(req.query['limit']) || 10, 30);
      const opts: { date?: string; limit: number } = { limit };
      if (date) opts.date = date;
      const result = explainPatterns(db, opts);
      ok(res, result, { total: result.length, page: 1, limit });
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Explanation failed');
    }
  });

  // POST /api/memories/sync — persist generated memories (P0007.3.1).
  router.post('/memories/sync', (_req, res) => {
    try {
      const memories = buildOperatorMemories(db, { minObservations: 2, maxMemories: 30 });
      const stored = upsertMemories(db, memories);
      ok(res, { stored, total: memories.length });
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Memory sync failed');
    }
  });

  // GET /api/memories — list persisted memories (P0007.3.1).
  router.get('/memories', (_req, res) => {
    try {
      const memories = listMemories(db);
      ok(res, memories, { total: memories.length, page: 1, limit: memories.length });
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Memory retrieval failed');
    }
  });

  // GET /api/context — build operator context for Hermes (P0007.3.3).
  router.get('/context', (req, res) => {
    try {
      const date = req.query['date'] as string | undefined;
      const opts: { date?: string; limit: number } = { limit: 1 };
      if (date) opts.date = date;
      const explanations = explainPatterns(db, opts);
      if (!explanations.length) {
        fail(res, 404, `No pattern event found${date ? ' for ' + date : ''}. Try a date with significant deviation.`);
        return;
      }
      const explanation = explanations[0]!;
      const memories = listMemories(db);
      const matches = matchMemories(explanation, memories);
      const context = buildContext(explanation, matches);
      ok(res, context);
    } catch (err) {
      fail(res, 500, err instanceof Error ? err.message : 'Context build failed');
    }
  });

  return router;
};

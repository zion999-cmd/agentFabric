// Ranking route — runs the composition vertical and returns ranked results + trace + AI summary.

import { Router } from 'express';
import { z } from 'zod';
import type { Database as Db } from 'better-sqlite3';
import { fail, ok } from '../envelope.js';
import { listOrders, listProducts } from '#platform/storage/product-repository.js';
import { rankProductsComposition, persistComposition } from '#app/orchestrator.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';

const RankRequestSchema = z.object({
  profile: z.enum(['sales_leaderboard', 'growth_discovery', 'operator_mode']).default('operator_mode'),
  persist: z.boolean().default(true),
  now: z.string().optional(), // ISO timestamp anchor (for replay/testing)
});

export const rankingRouter = (db: Db): Router => {
  const router = Router();

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

  return router;
};

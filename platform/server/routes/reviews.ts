// Review + memory + trace routes.

import { Router } from 'express';
import { z } from 'zod';
import type { Database as Db } from 'better-sqlite3';
import { fail, ok } from '../envelope.js';
import { ReviewFacade } from '#app/review/facade.js';
import { MemoryFacade } from '#app/experience/facade.js';
import { TraceFacade } from '#app/analysis/explainability/facade.js';
import { RankingReviewReasonCategorySchema } from '#shared/schemas/review.js';

const SubmitReviewSchema = z.object({
  domain: z.enum(['ranking', 'signal', 'skill', 'memory']),
  agent_id: z.string().optional(),
  profile: z.enum(['sales_leaderboard', 'growth_discovery', 'operator_mode']).optional(),
  entity_id: z.string(),
  agent_rank: z.number().int().nonnegative().optional(),
  ground_truth_rank: z.number().int().nonnegative().optional(),
  action: z.enum(['approve', 'reject', 'modify']),
  reason: z.string(),
  reason_category: RankingReviewReasonCategorySchema.optional(),
  reviewer: z.string(),
});

export const reviewsRouter = (db: Db): Router => {
  const router = Router();

  // POST /api/reviews — submit a human review event.
  router.post('/reviews', (req, res) => {
    const parsed = SubmitReviewSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, `Invalid review: ${parsed.error.message}`);
      return;
    }
    const review = {
      review_id: crypto.randomUUID(),
      ...parsed.data,
      ...(parsed.data.reason_category
        ? { reason_category: parsed.data.reason_category }
        : {}),
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };
    ReviewFacade.submit(db, review);
    ok(res, review);
  });

  // GET /api/reviews/:domain — list reviews for a domain.
  router.get('/reviews/:domain', (req, res) => {
    const domain = req.params['domain'];
    const reviews = ReviewFacade.listByDomain(db, domain);
    ok(res, reviews, { total: reviews.length, page: 1, limit: reviews.length });
  });

  return router;
};

export const memoryRouter = (db: Db): Router => {
  const router = Router();
  // GET /api/memory — list active validated memories.
  router.get('/memory', (req, res) => {
    const agentId = req.query['agent_id'] as string | undefined;
    const memories = MemoryFacade.queryActive(db, agentId);
    ok(res, memories, { total: memories.length, page: 1, limit: memories.length });
  });
  return router;
};

export const traceRouter = (db: Db): Router => {
  const router = Router();
  // GET /api/trace/:traceId — load a business conclusion trace.
  router.get('/trace/:traceId', (req, res) => {
    const trace = TraceFacade.load(db, req.params['traceId'] ?? '');
    if (!trace) {
      fail(res, 404, `Trace not found: ${req.params['traceId']}`);
      return;
    }
    ok(res, trace);
  });
  return router;
};

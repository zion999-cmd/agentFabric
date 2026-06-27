// Workspace route — aggregated findings for the workspace Discover feed.

import { Router } from 'express';
import type { Database as Db } from 'better-sqlite3';
import { ok } from '../envelope.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { MemoryFacade } from '#app/experience/facade.js';
import { ReviewFacade } from '#app/review/facade.js';

export interface Finding {
  discovery_type: 'opportunity' | 'risk' | 'review' | 'memory';
  entity_id: string;
  title: string;
  score: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

const priorityFor = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
};

export const workspaceRouter = (db: Db): Router => {
  const router = Router();

  // GET /api/workspace/findings — unified discoveries feed for the workspace.
  router.get('/workspace/findings', (req, res) => {
    const profile = (req.query['profile'] as string | undefined) ?? 'operator_mode';
    const validProfile =
      profile === 'sales_leaderboard' || profile === 'growth_discovery' || profile === 'operator_mode'
        ? profile
        : 'operator_mode';

    const rankings = RankingFacade.load(db, validProfile);
    const memories = MemoryFacade.queryActive(db);
    const reviews = ReviewFacade.listByDomain(db, 'ranking');

    const findings: Finding[] = [];

    for (const r of rankings) {
      const isRisk = r.explainability.risks.length > r.explainability.strengths.length;
      findings.push({
        discovery_type: isRisk ? 'risk' : 'opportunity',
        entity_id: r.entity_id,
        title: r.explainability.summary,
        score: r.overall_score,
        confidence: r.confidence,
        priority: priorityFor(r.overall_score),
      });
    }

    for (const m of memories) {
      findings.push({
        discovery_type: 'memory',
        entity_id: m.memory_id,
        title: m.statement,
        score: m.weight.final_score,
        confidence: m.weight.confidence,
        priority: priorityFor(m.weight.final_score),
      });
    }

    const pendingReviews = reviews.filter((r) => r.status === 'pending');
    for (const rv of pendingReviews) {
      findings.push({
        discovery_type: 'review',
        entity_id: rv.entity_id,
        title: rv.reason,
        score: 0.5,
        confidence: 0.5,
        priority: 'medium',
      });
    }

    findings.sort((a, b) => b.score - a.score);
    ok(res, findings, { total: findings.length, page: 1, limit: findings.length });
  });

  return router;
};

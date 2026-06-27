import { describe, expect, test } from 'vitest';
import { inferKnowledgeType, promoteKnowledge, autoPromote } from '#app/review/knowledge.js';
import { buildFeedback } from '#app/review/feedback.js';
import { isStale, buildQueue } from '#app/review/queue.js';
import { REASON_CATEGORIES, isExtractable } from '#app/review/taxonomy.js';
import type { Feedback } from '#shared/schemas/review.js';

describe('review taxonomy (golden vector)', () => {
  test('has exactly 10 reason categories', () => {
    expect(REASON_CATEGORIES).toHaveLength(10);
  });

  test('growth_legitimate and other are not extractable', () => {
    expect(isExtractable('growth_legitimate')).toBe(false);
    expect(isExtractable('other')).toBe(false);
    expect(isExtractable('inventory_concern')).toBe(true);
  });
});

describe('knowledge type inference (golden vector)', () => {
  test('approve -> case', () => {
    expect(inferKnowledgeType('approve')).toBe('case');
  });
  test('modify -> rule', () => {
    expect(inferKnowledgeType('modify')).toBe('rule');
  });
  test('reject -> rule', () => {
    expect(inferKnowledgeType('reject')).toBe('rule');
  });
});

describe('knowledge promotion', () => {
  const feedback: Feedback = buildFeedback({
    taskId: 'task-1',
    executionId: 'exec-1',
    agentOutput: { recommendation: 'boost' },
    humanActionType: 'approve',
    metricDelta: { roi: 0.12 },
  });

  test('promoteKnowledge produces a feedback-sourced case', () => {
    const k = promoteKnowledge({ feedback, domain: 'biz' });
    expect(k.type).toBe('case');
    expect(k.source).toBe('feedback');
    expect(k.fingerprint).toBeDefined();
    expect(k.content.summary).toContain('可复用案例');
  });

  test('autoPromote requires minimum approvals', () => {
    const one = [feedback];
    const promoted = autoPromote(one, 'biz', { minimumApproveCount: 2 }, new Set());
    expect(promoted).toHaveLength(0);
  });

  test('autoPromote with enough approvals + metric threshold', () => {
    const feedbacks = [
      buildFeedback({ taskId: 'task-1', executionId: 'exec-1', agentOutput: { a: 1 }, humanActionType: 'approve', metricDelta: { roi: 0.15 } }),
      buildFeedback({ taskId: 'task-1', executionId: 'exec-2', agentOutput: { a: 1 }, humanActionType: 'approve', metricDelta: { roi: 0.15 } }),
    ];
    const promoted = autoPromote(feedbacks, 'biz', { minimumApproveCount: 2, minimumMetricDeltas: { roi: 0.1 } }, new Set());
    expect(promoted).toHaveLength(1);
    expect(promoted[0]!.type).toBe('case');
  });

  test('autoPromote dedupes by fingerprint', () => {
    const fp = promoteKnowledge({ feedback, domain: 'biz' }).fingerprint!;
    // Same task/action/output/metrics as `feedback` -> identical fingerprint -> deduped.
    const feedbacks = [
      buildFeedback({ taskId: 'task-1', executionId: 'exec-1', agentOutput: { recommendation: 'boost' }, humanActionType: 'approve', metricDelta: { roi: 0.12 } }),
      buildFeedback({ taskId: 'task-1', executionId: 'exec-2', agentOutput: { recommendation: 'boost' }, humanActionType: 'approve', metricDelta: { roi: 0.12 } }),
    ];
    const promoted = autoPromote(feedbacks, 'biz', { minimumApproveCount: 2 }, new Set([fp]));
    expect(promoted).toHaveLength(0);
  });
});

describe('review queue 24h rule', () => {
  const now = new Date('2026-06-14T00:00:00.000Z');

  test('fresh review not stale', () => {
    expect(isStale('2026-06-13T12:00:00.000Z', now)).toBe(false);
  });

  test('review older than 24h is stale', () => {
    expect(isStale('2026-06-12T00:00:00.000Z', now)).toBe(true);
  });

  test('entity with no review is pending', () => {
    const queue = buildQueue([], ['P_A'], now);
    expect(queue[0]?.pending).toBe(true);
    expect(queue[0]?.lastReview).toBeNull();
  });

  test('entity with fresh review is not pending', () => {
    const review = {
      review_id: 'r1',
      domain: 'ranking' as const,
      entity_id: 'P_A',
      action: 'approve' as const,
      reason: 'ok',
      reviewer: 'op',
      status: 'approved' as const,
      created_at: '2026-06-13T12:00:00.000Z',
    };
    const queue = buildQueue([review], ['P_A'], now);
    expect(queue[0]?.pending).toBe(false);
  });
});

import { describe, expect, test } from 'vitest';
import { extractMemories } from '#app/experience/extraction.js';
import { computeFinalScore, memoryConfidence, classifyTier } from '#app/experience/weights.js';
import type { ReviewEvent } from '#shared/schemas/review.js';

const makeReject = (
  i: number,
  category: string,
  createdAt: string,
): ReviewEvent => ({
  review_id: `rev-${i}`,
  domain: 'ranking',
  agent_id: 'agent-1',
  profile: 'operator_mode',
  entity_id: `P_${i}`,
  action: 'reject',
  reason: `rejected: ${category}`,
  reason_category: category as ReviewEvent['reason_category'],
  reviewer: 'operator',
  status: 'rejected',
  created_at: createdAt,
});

describe('memory weight formula (golden vector)', () => {
  test('final_score = 0.4*conf + 0.3*support + 0.2*importance + 0.1*freshness', () => {
    const score = computeFinalScore({
      confidence: 0.8,
      supportRate: 0.7,
      importance: 0.8,
      freshness: 1.0,
    });
    // 0.32 + 0.21 + 0.16 + 0.1 = 0.79
    expect(score).toBeCloseTo(0.79, 5);
  });

  test('confidence cap at 0.9', () => {
    expect(memoryConfidence(1.0)).toBe(0.9);
    expect(memoryConfidence(0.5)).toBe(0.5);
  });

  test('tier classification', () => {
    expect(classifyTier(0.8)).toBe('strong');
    expect(classifyTier(0.6)).toBe('weak');
    expect(classifyTier(0.4)).toBe('rejected');
  });
});

describe('extractMemories (golden vector)', () => {
  test('no rejects -> no memories', () => {
    const memories = extractMemories({ reviews: [], agentId: 'a1' });
    expect(memories).toHaveLength(0);
  });

  test('fewer than MIN_SUPPORT rejects -> no memory', () => {
    const reviews = [makeReject(0, 'inventory_concern', '2026-06-01T00:00:00.000Z')];
    const memories = extractMemories({ reviews, agentId: 'a1' });
    expect(memories).toHaveLength(0);
  });

  test('>= 5 rejects same category with high support -> memory extracted', () => {
    const rejects = Array.from({ length: 6 }, (_, i) =>
      makeReject(i, 'inventory_concern', '2026-06-01T00:00:00.000Z'),
    );
    const memories = extractMemories({ reviews: rejects, agentId: 'a1' });
    expect(memories).toHaveLength(1);
    const m = memories[0]!;
    expect(m.memory_type).toBe('signal_reliability');
    expect(m.validation.state).toBe('validated');
    expect(m.status).toBe('active');
    expect(m.evidence.sample_size).toBe(6);
    expect(m.evidence.support_rate).toBe(1);
    expect(m.adjustment?.signal_name).toBe('gmv_growth');
    expect(m.adjustment?.action).toBe('decrease_confidence');
    expect(m.adjustment?.memory_id).toBe(m.memory_id);
  });

  test('low support rate (< 0.6) -> no memory', () => {
    // 5 rejects out of 10 total -> support 0.5
    const rejects = Array.from({ length: 5 }, (_, i) =>
      makeReject(i, 'inventory_concern', '2026-06-01T00:00:00.000Z'),
    );
    const approves = Array.from({ length: 5 }, (_, i) => ({
      ...makeReject(i + 100, 'inventory_concern', '2026-06-01T00:00:00.000Z'),
      action: 'approve' as const,
      status: 'approved' as const,
    }));
    const memories = extractMemories({ reviews: [...rejects, ...approves], agentId: 'a1' });
    expect(memories).toHaveLength(0);
  });

  test('override blocks the adjustment at query time', () => {
    const rejects = Array.from({ length: 6 }, (_, i) =>
      makeReject(i, 'manual_override', '2026-06-01T00:00:00.000Z'),
    );
    const memories = extractMemories({ reviews: rejects, agentId: 'a1' });
    expect(memories).toHaveLength(1);
    expect(memories[0]!.memory_type).toBe('ranking_override_pattern');
  });
});

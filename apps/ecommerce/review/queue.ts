// Review queue — the 24h stale rule. A review older than 24h is re-queued.

import type { ReviewEvent } from '#shared/schemas/review.js';
import { parseIso } from '#shared/utils/time.js';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** True if a review timestamp is older than 24h relative to now. */
export const isStale = (reviewedAt: string, now: Date): boolean => {
  const d = parseIso(reviewedAt);
  if (!d) return true;
  return now.getTime() - d.getTime() > STALE_THRESHOLD_MS;
};

/**
 * Build the pending review queue for a domain.
 * An entity is pending if it has no review yet, or its last review is stale (>24h).
 */
export const buildQueue = (
  reviews: readonly ReviewEvent[],
  entityIds: readonly string[],
  now: Date,
): { entityId: string; lastReview: ReviewEvent | null; pending: boolean }[] => {
  const lastByEntity = new Map<string, ReviewEvent>();
  for (const r of reviews) {
    const existing = lastByEntity.get(r.entity_id);
    if (!existing || r.created_at > existing.created_at) {
      lastByEntity.set(r.entity_id, r);
    }
  }
  return entityIds.map((entityId) => {
    const last = lastByEntity.get(entityId) ?? null;
    const pending = last === null || isStale(last.created_at, now);
    return { entityId, lastReview: last, pending };
  });
};

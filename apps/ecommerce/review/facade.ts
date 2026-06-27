// Review façade — the only cross-domain import surface for human review + feedback + knowledge.

import type { Database as Db } from 'better-sqlite3';
import type { Feedback, Knowledge, ReviewEvent } from '#shared/schemas/review.js';
import { buildFeedback, type RecordFeedbackInput } from './feedback.js';
import {
  autoPromote,
  promoteKnowledge,
  type AutoPromoteOptions,
  type PromoteKnowledgeInput,
} from './knowledge.js';
import { inferKnowledgeType } from './knowledge.js';
import {
  listKnowledge,
  listKnowledgeFingerprints,
  listReviewsByAgent,
  listReviewsByDomain,
  storeFeedback,
  storeKnowledge,
  storeReview,
} from './repository.js';
import { buildQueue } from './queue.js';

export interface ReviewFacade {
  submit(db: Db, review: ReviewEvent): void;
  listByDomain(db: Db, domain: string): ReviewEvent[];
  listByAgent(db: Db, agentId: string): ReviewEvent[];
  queue(reviews: readonly ReviewEvent[], entityIds: readonly string[], now: Date): ReturnType<typeof buildQueue>;
  recordFeedback(db: Db, input: RecordFeedbackInput): Feedback;
  promote(db: Db, input: PromoteKnowledgeInput): Knowledge;
  autoPromote(db: Db, feedbacks: readonly Feedback[], domain: Knowledge['domain'], options?: AutoPromoteOptions): Knowledge[];
  listKnowledge(db: Db): Knowledge[];
  inferType(action: ReviewEvent['action']): Knowledge['type'];
}

export const ReviewFacade: ReviewFacade = {
  submit: (db, review) => storeReview(db, review),
  listByDomain: (db, domain) => listReviewsByDomain(db, domain),
  listByAgent: (db, agentId) => listReviewsByAgent(db, agentId),
  queue: (reviews, entityIds, now) => buildQueue(reviews, entityIds, now),
  recordFeedback: (db, input) => {
    const feedback = buildFeedback(input);
    storeFeedback(db, feedback);
    return feedback;
  },
  promote: (db, input) => {
    const knowledge = promoteKnowledge(input);
    storeKnowledge(db, knowledge);
    return knowledge;
  },
  autoPromote: (db, feedbacks, domain, options) => {
    const existing = listKnowledgeFingerprints(db);
    const promoted = autoPromote(feedbacks, domain, options ?? {}, existing);
    for (const k of promoted) storeKnowledge(db, k);
    return promoted;
  },
  listKnowledge: (db) => listKnowledge(db),
  inferType: (action) => inferKnowledgeType(action),
};

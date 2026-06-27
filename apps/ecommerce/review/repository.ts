// Review persistence: reviews + feedback + knowledge to SQLite.

import type { Database as Db } from 'better-sqlite3';
import type { Feedback, Knowledge, ReviewEvent } from '#shared/schemas/review.js';

// ---- Reviews ----

interface ReviewRow {
  review_id: string;
  domain: string;
  agent_id: string | null;
  profile: string | null;
  entity_id: string;
  agent_rank: number | null;
  ground_truth_rank: number | null;
  action: string;
  reason: string;
  reason_category: string | null;
  reviewer: string;
  signal_snapshot: string | null;
  explainability_ref: string | null;
  status: string;
  final_decision: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const reviewToRow = (r: ReviewEvent): ReviewRow => ({
  review_id: r.review_id,
  domain: r.domain,
  agent_id: r.agent_id ?? null,
  profile: r.profile ?? null,
  entity_id: r.entity_id,
  agent_rank: r.agent_rank ?? null,
  ground_truth_rank: r.ground_truth_rank ?? null,
  action: r.action,
  reason: r.reason,
  reason_category: r.reason_category ?? null,
  reviewer: r.reviewer,
  signal_snapshot: r.signal_snapshot ? JSON.stringify(r.signal_snapshot) : null,
  explainability_ref: r.explainability_ref ?? null,
  status: r.status,
  final_decision: r.final_decision ? JSON.stringify(r.final_decision) : null,
  created_at: r.created_at,
  reviewed_at: r.reviewed_at ?? null,
});

export const storeReview = (db: Db, review: ReviewEvent): void => {
  const stmt = db.prepare(
    `INSERT INTO reviews (
       review_id, domain, agent_id, profile, entity_id, agent_rank, ground_truth_rank,
       action, reason, reason_category, reviewer, signal_snapshot, explainability_ref,
       status, final_decision, created_at, reviewed_at
     ) VALUES (
       @review_id, @domain, @agent_id, @profile, @entity_id, @agent_rank, @ground_truth_rank,
       @action, @reason, @reason_category, @reviewer, @signal_snapshot, @explainability_ref,
       @status, @final_decision, @created_at, @reviewed_at
     )
     ON CONFLICT(review_id) DO UPDATE SET
       action = excluded.action, reason = excluded.reason, reason_category = excluded.reason_category,
       status = excluded.status, final_decision = excluded.final_decision, reviewed_at = excluded.reviewed_at`,
  );
  stmt.run(reviewToRow(review));
};

export const listReviewsByDomain = (db: Db, domain: string): ReviewEvent[] => {
  const rows = db
    .prepare('SELECT * FROM reviews WHERE domain = ? ORDER BY created_at DESC')
    .all(domain) as ReviewRow[];
  return rows.map(reviewFromRow);
};

export const listReviewsByAgent = (db: Db, agentId: string): ReviewEvent[] => {
  const rows = db
    .prepare('SELECT * FROM reviews WHERE agent_id = ? ORDER BY created_at DESC')
    .all(agentId) as ReviewRow[];
  return rows.map(reviewFromRow);
};

const reviewFromRow = (r: ReviewRow): ReviewEvent => ({
  review_id: r.review_id,
  domain: r.domain as ReviewEvent['domain'],
  ...(r.agent_id ? { agent_id: r.agent_id } : {}),
  ...(r.profile ? { profile: r.profile as ReviewEvent['profile'] } : {}),
  entity_id: r.entity_id,
  ...(r.agent_rank !== null ? { agent_rank: r.agent_rank } : {}),
  ...(r.ground_truth_rank !== null ? { ground_truth_rank: r.ground_truth_rank } : {}),
  action: r.action as ReviewEvent['action'],
  reason: r.reason,
  ...(r.reason_category ? { reason_category: r.reason_category as ReviewEvent['reason_category'] } : {}),
  reviewer: r.reviewer,
  ...(r.signal_snapshot ? { signal_snapshot: JSON.parse(r.signal_snapshot) } : {}),
  ...(r.explainability_ref ? { explainability_ref: r.explainability_ref } : {}),
  status: r.status as ReviewEvent['status'],
  ...(r.final_decision ? { final_decision: JSON.parse(r.final_decision) } : {}),
  created_at: r.created_at,
  ...(r.reviewed_at ? { reviewed_at: r.reviewed_at } : {}),
});

// ---- Feedback ----

export const storeFeedback = (db: Db, feedback: Feedback): void => {
  db.prepare(
    `INSERT INTO feedback (
       feedback_id, review_id, task_id, execution_id, agent_output, human_action,
       metric_delta, attribution_window, baseline, post_value, signal_usefulness, timestamp
     ) VALUES (
       @feedback_id, @review_id, @task_id, @execution_id, @agent_output, @human_action,
       @metric_delta, @attribution_window, @baseline, @post_value, @signal_usefulness, @timestamp
     )
     ON CONFLICT(feedback_id) DO NOTHING`,
  ).run({
    feedback_id: feedback.feedback_id,
    review_id: feedback.review_id ?? null,
    task_id: feedback.task_id ?? null,
    execution_id: feedback.execution_id ?? null,
    agent_output: JSON.stringify(feedback.agent_output),
    human_action: JSON.stringify(feedback.human_action),
    metric_delta: JSON.stringify(feedback.business_result.metric_delta),
    attribution_window: feedback.business_result.attribution_window ?? null,
    baseline: feedback.business_result.baseline ? JSON.stringify(feedback.business_result.baseline) : null,
    post_value: feedback.business_result.post_value ? JSON.stringify(feedback.business_result.post_value) : null,
    signal_usefulness: feedback.business_result.signal_usefulness
      ? JSON.stringify(feedback.business_result.signal_usefulness)
      : null,
    timestamp: feedback.timestamp,
  });
};

// ---- Knowledge ----

interface KnowledgeRow {
  knowledge_id: string;
  type: string;
  domain: string;
  content: string;
  tags: string | null;
  source: string;
  fingerprint: string | null;
  promoted_at: string | null;
  created_at: string;
}

export const storeKnowledge = (db: Db, knowledge: Knowledge): void => {
  db.prepare(
    `INSERT INTO knowledge (
       knowledge_id, type, domain, content, tags, source, fingerprint, promoted_at, created_at
     ) VALUES (
       @knowledge_id, @type, @domain, @content, @tags, @source, @fingerprint, @promoted_at, @created_at
     )
     ON CONFLICT(knowledge_id) DO UPDATE SET
       content = excluded.content, tags = excluded.tags, promoted_at = excluded.promoted_at`,
  ).run({
    knowledge_id: knowledge.knowledge_id,
    type: knowledge.type,
    domain: knowledge.domain,
    content: JSON.stringify(knowledge.content),
    tags: knowledge.tags.length > 0 ? JSON.stringify(knowledge.tags) : null,
    source: knowledge.source,
    fingerprint: knowledge.fingerprint ?? null,
    promoted_at: knowledge.promoted_at ?? null,
    created_at: knowledge.created_at,
  });
};

export const listKnowledge = (db: Db): Knowledge[] => {
  const rows = db.prepare('SELECT * FROM knowledge ORDER BY created_at DESC').all() as KnowledgeRow[];
  return rows.map((r) => ({
    knowledge_id: r.knowledge_id,
    type: r.type as Knowledge['type'],
    domain: r.domain as Knowledge['domain'],
    content: JSON.parse(r.content),
    tags: r.tags ? JSON.parse(r.tags) : [],
    source: r.source as Knowledge['source'],
    ...(r.fingerprint ? { fingerprint: r.fingerprint } : {}),
    ...(r.promoted_at ? { promoted_at: r.promoted_at } : {}),
    created_at: r.created_at,
  }));
};

export const listKnowledgeFingerprints = (db: Db): Set<string> => {
  const rows = db
    .prepare('SELECT fingerprint FROM knowledge WHERE fingerprint IS NOT NULL')
    .all() as Array<{ fingerprint: string }>;
  return new Set(rows.map((r) => r.fingerprint));
};

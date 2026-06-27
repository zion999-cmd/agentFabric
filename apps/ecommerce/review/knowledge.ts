// Knowledge promotion — feedback -> reusable knowledge.
// Type inference: approve -> case, modify -> rule, reject -> rule.

import type { Feedback, Knowledge, KnowledgeType } from '#shared/schemas/review.js';
import type { ReviewAction } from '#shared/schemas/review.js';
import { nowIso } from '#shared/utils/time.js';
import { uuid, fingerprint } from '#shared/utils/crypto.js';

/** Infer knowledge type from the human action (the semantic bridge). */
export const inferKnowledgeType = (action: ReviewAction): KnowledgeType => {
  switch (action) {
    case 'approve':
      return 'case';
    case 'modify':
      return 'rule';
    case 'reject':
      return 'rule';
  }
};

/** Summary string for a promoted knowledge entry. */
const summaryFor = (action: ReviewAction): string => {
  switch (action) {
    case 'approve':
      return '保留 agent 输出，沉淀为可复用案例';
    case 'modify':
      return '基于人工修改结果，沉淀 agent 的修正规则';
    case 'reject':
      return '基于人工拒绝结果，沉淀 agent 的负向规则';
  }
};

export interface PromoteKnowledgeInput {
  feedback: Feedback;
  domain: Knowledge['domain'];
  agentName?: string;
}

/** Promote a single feedback into a knowledge entry (manual promotion). Pure. */
export const promoteKnowledge = (input: PromoteKnowledgeInput): Knowledge => {
  const { feedback, domain, agentName } = input;
  const type = inferKnowledgeType(feedback.human_action.type);
  const now = nowIso();
  const content = {
    summary: summaryFor(feedback.human_action.type),
    feedback_id: feedback.feedback_id,
    task_id: feedback.task_id ?? null,
    execution_id: feedback.execution_id ?? null,
    agent_name: agentName ?? null,
    human_action: feedback.human_action,
    agent_output: feedback.agent_output,
    business_result: feedback.business_result,
    promoted_at: now,
  };
  const fp = fingerprint({
    task_id: feedback.task_id ?? '',
    human_action_type: feedback.human_action.type,
    agent_output: feedback.agent_output,
    metric_delta: feedback.business_result.metric_delta,
  });
  return {
    knowledge_id: uuid(),
    type,
    domain,
    content,
    tags: ['auto-promote'],
    source: 'feedback',
    fingerprint: fp,
    promoted_at: now,
    created_at: now,
  };
};

export interface AutoPromoteOptions {
  minimumApproveCount?: number; // default 2
  minimumDistinctExecutionCount?: number; // default 1
  minimumMetricDeltas?: Record<string, number>; // each metric must be >= threshold
}

/** Auto-promote eligibility for a set of feedbacks belonging to one task. Pure. */
export const autoPromote = (
  feedbacks: readonly Feedback[],
  domain: Knowledge['domain'],
  options: AutoPromoteOptions = {},
  existingFingerprints: ReadonlySet<string> = new Set(),
): Knowledge[] => {
  const minApprove = options.minimumApproveCount ?? 2;
  const minDistinctExec = options.minimumDistinctExecutionCount ?? 1;
  const metricThresholds = options.minimumMetricDeltas ?? {};

  // Group approve feedbacks by task_id.
  const byTask = new Map<string, Feedback[]>();
  for (const f of feedbacks) {
    if (f.human_action.type !== 'approve') continue;
    const taskId = f.task_id ?? '';
    const list = byTask.get(taskId) ?? [];
    list.push(f);
    byTask.set(taskId, list);
  }

  const promoted: Knowledge[] = [];
  for (const [, taskFeedbacks] of byTask) {
    const approveCount = taskFeedbacks.length;
    if (approveCount < minApprove) continue;
    const distinctExecs = new Set(taskFeedbacks.map((f) => f.execution_id ?? '')).size;
    if (distinctExecs < minDistinctExec) continue;

    // Pick the most recent approved feedback as the promotion source.
    const source = [...taskFeedbacks].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]!;

    // Metric thresholds: every specified metric must be >= threshold.
    const meetsMetrics = Object.entries(metricThresholds).every(([metric, threshold]) => {
      const actual = source.business_result.metric_delta[metric];
      return actual !== undefined && actual >= threshold;
    });
    if (!meetsMetrics) continue;

    const knowledge = promoteKnowledge({ feedback: source, domain });
    if (knowledge.fingerprint && existingFingerprints.has(knowledge.fingerprint)) continue;
    promoted.push(knowledge);
  }
  return promoted;
};

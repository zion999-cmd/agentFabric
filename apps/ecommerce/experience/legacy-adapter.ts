// Legacy Adapter — converts old agentCMS Review/Feedback records
// into new HumanIntervention format (P0007.2 Grammar).
//
// ONE-WAY only: Legacy → New. Never new → legacy.
// This adapter is transitional. It validates the Grammar against real
// historical data. It is NOT the production intervention recording path.
//
// Design: each legacy record type maps to one or more intervention types.
// The adapter makes explicit what behavior each legacy record encoded.

import type { HumanIntervention } from '#shared/schemas/learning-context.js';
import type { ReviewEvent, Feedback } from '#shared/schemas/review.js';
import { uuid } from '#shared/utils/crypto.js';

// ---- Adapter: ReviewEvent → HumanIntervention ----

interface AdaptReviewOptions {
  review: ReviewEvent;
  situationId: string;
}

/**
 * Convert a legacy ReviewEvent to one or more HumanInterventions.
 * A single review may encode multiple intervention types (e.g., reject+correction).
 */
export const adaptReview = (opts: AdaptReviewOptions): HumanIntervention[] => {
  const { review, situationId } = opts;
  const interventions: HumanIntervention[] = [];
  const now = review.created_at;

  switch (review.action) {
    case 'approve':
      // "I agree" → Decision (accept)
      interventions.push({
        interventionId: uuid(),
        situationId,
        actor: { id: review.reviewer, role: 'operator' },
        type: 'decision',
        content: {
          type: 'decision',
          decision: 'accept',
          appliesTo: { agentActivityId: review.agent_id },
          rationale: review.reason,
        },
        timestamp: now,
        summary: `Approved: ${review.reason}`,
        reviewId: review.review_id,
        respondsToActivityIds: review.agent_id ? [review.agent_id] : [],
        _legacySource: 'legacy_review',
      });
      break;

    case 'reject':
      // "I disagree because X" → Decision (reject) + Response
      if (review.reason_category && review.reason_category !== 'other') {
        // If there's a reason_category (1-9), the rejection carries substantive correction
        interventions.push({
          interventionId: uuid(),
          situationId,
          actor: { id: review.reviewer, role: 'operator' },
          type: 'correction',
          content: {
            type: 'correction',
            corrects: { signalId: review.entity_id },
            correction: `${review.reason_category}: ${review.reason}`,
          },
          timestamp: now,
          summary: `Correction (${review.reason_category}): ${review.reason}`,
          reviewId: review.review_id,
          respondsToActivityIds: review.agent_id ? [review.agent_id] : [],
          _legacySource: 'legacy_review',
        });
      }
      // Always add the decision
      interventions.push({
        interventionId: uuid(),
        situationId,
        actor: { id: review.reviewer, role: 'operator' },
        type: 'decision',
        content: {
          type: 'decision',
          decision: 'reject',
          appliesTo: { agentActivityId: review.agent_id },
          rationale: review.reason,
        },
        timestamp: now,
        summary: `Rejected: ${review.reason}`,
        reviewId: review.review_id,
        respondsToActivityIds: review.agent_id ? [review.agent_id] : [],
        _legacySource: 'legacy_review',
      });
      break;

    case 'modify':
      // "I changed X to Y" → Could be Correction, Context Supplement, or Decision
      // We map based on reason_category semantics (from fossil analysis)
      const isCorrection = review.reason_category &&
        ['inventory_concern', 'promotion_ending', 'creator_drop', 'seasonal_fluctuation',
         'market_trend_shift', 'pricing_issue', 'data_quality_doubt'].includes(review.reason_category);

      if (isCorrection) {
        interventions.push({
          interventionId: uuid(),
          situationId,
          actor: { id: review.reviewer, role: 'operator' },
          type: 'correction',
          content: {
            type: 'correction',
            corrects: { signalId: review.entity_id },
            correction: review.reason,
            correctedValue: review.signal_snapshot,
          },
          timestamp: now,
          summary: `Corrected (${review.reason_category}): ${review.reason}`,
          reviewId: review.review_id,
          respondsToActivityIds: review.agent_id ? [review.agent_id] : [],
          _legacySource: 'legacy_review',
        });
      } else {
        // manual_override or other → Decision
        interventions.push({
          interventionId: uuid(),
          situationId,
          actor: { id: review.reviewer, role: 'operator' },
          type: 'decision',
          content: {
            type: 'decision',
            decision: 'override',
            appliesTo: { agentActivityId: review.agent_id },
            rationale: review.reason,
          },
          timestamp: now,
          summary: `Manual override: ${review.reason}`,
          reviewId: review.review_id,
          respondsToActivityIds: review.agent_id ? [review.agent_id] : [],
          _legacySource: 'legacy_review',
        });
      }
      break;
  }

  return interventions;
};

// ---- Adapter: Feedback → HumanIntervention ----

interface AdaptFeedbackOptions {
  feedback: Feedback;
  situationId: string;
}

/**
 * Convert a legacy Feedback record to HumanInterventions.
 * Feedback is the richest legacy fossil — it contains human_action,
 * business_result, and signal_usefulness evaluations.
 */
export const adaptFeedback = (opts: AdaptFeedbackOptions): HumanIntervention[] => {
  const { feedback, situationId } = opts;
  const interventions: HumanIntervention[] = [];

  // 1. Human action → Decision or Correction
  if (feedback.human_action.type === 'modify') {
    interventions.push({
      interventionId: uuid(),
      situationId,
      actor: { id: 'legacy_feedback', role: 'operator' },
      type: 'correction',
      content: {
        type: 'correction',
        corrects: {},
        correction: 'Modified agent output',
        correctedValue: feedback.human_action.modified_output,
      },
      timestamp: feedback.timestamp,
      summary: 'Modified agent output based on feedback',
      reviewId: feedback.review_id,
      respondsToActivityIds: feedback.task_id ? [feedback.task_id] : [],
      _legacySource: 'legacy_feedback',
    });
  } else {
    interventions.push({
      interventionId: uuid(),
      situationId,
      actor: { id: 'legacy_feedback', role: 'operator' },
      type: 'decision',
      content: {
        type: 'decision',
        decision: feedback.human_action.type as 'accept' | 'reject',
        appliesTo: {},
        rationale: feedback.human_action.type === 'approve' ? 'Approved via feedback' : 'Rejected via feedback',
      },
      timestamp: feedback.timestamp,
      summary: `${feedback.human_action.type}d via feedback`,
      reviewId: feedback.review_id,
      respondsToActivityIds: feedback.task_id ? [feedback.task_id] : [],
      _legacySource: 'legacy_feedback',
    });
  }

  // 2. Signal usefulness evaluations → Response
  if (feedback.business_result.signal_usefulness && Object.keys(feedback.business_result.signal_usefulness).length > 0) {
    const evaluations = Object.entries(feedback.business_result.signal_usefulness)
      .map(([signal, label]) => `${signal}: ${label}`).join(', ');
    interventions.push({
      interventionId: uuid(),
      situationId,
      actor: { id: 'legacy_feedback', role: 'operator' },
      type: 'response',
      content: {
        type: 'response',
        respondsTo: { signalIds: Object.keys(feedback.business_result.signal_usefulness) },
        evaluation: 'partial',
        rationale: `Signal evaluations: ${evaluations}`,
      },
      timestamp: feedback.timestamp,
      summary: `Evaluated signal usefulness: ${evaluations}`,
      reviewId: feedback.review_id,
      respondsToActivityIds: feedback.execution_id ? [feedback.execution_id] : [],
      _legacySource: 'legacy_feedback',
    });
  }

  return interventions;
};

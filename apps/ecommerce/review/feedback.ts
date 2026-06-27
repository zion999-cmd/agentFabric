// Feedback capture — record human action + business result for a review.

import type { Feedback, ReviewAction } from '#shared/schemas/review.js';
import type { FeedbackAttributionWindow, SignalUsefulnessLabel } from '#shared/schemas/review.js';
import { nowIso } from '#shared/utils/time.js';
import { uuid } from '#shared/utils/crypto.js';

export interface RecordFeedbackInput {
  reviewId?: string;
  taskId?: string;
  executionId?: string;
  agentOutput: Record<string, unknown>;
  humanActionType: ReviewAction;
  modifiedOutput?: Record<string, unknown>;
  metricDelta?: Record<string, number>;
  attributionWindow?: FeedbackAttributionWindow;
  baseline?: Record<string, number>;
  postValue?: Record<string, number>;
  signalUsefulness?: Record<string, SignalUsefulnessLabel>;
  timestamp?: string;
}

/** Build a Feedback record from human input (pure). */
export const buildFeedback = (input: RecordFeedbackInput): Feedback => ({
  feedback_id: uuid(),
  ...(input.reviewId ? { review_id: input.reviewId } : {}),
  ...(input.taskId ? { task_id: input.taskId } : {}),
  ...(input.executionId ? { execution_id: input.executionId } : {}),
  agent_output: input.agentOutput,
  human_action: {
    type: input.humanActionType,
    modified_output: input.modifiedOutput ?? {},
  },
  business_result: {
    metric_delta: input.metricDelta ?? {},
    ...(input.attributionWindow ? { attribution_window: input.attributionWindow } : {}),
    ...(input.baseline ? { baseline: input.baseline } : {}),
    ...(input.postValue ? { post_value: input.postValue } : {}),
    ...(input.signalUsefulness ? { signal_usefulness: input.signalUsefulness } : {}),
  },
  timestamp: input.timestamp ?? nowIso(),
});

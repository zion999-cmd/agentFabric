// Phase 3.1 — Execution Contract validation tests.
// Validates that ExecutionRequest and ExecutionEvent schemas enforce the contract.

import { describe, it, expect } from 'vitest';
import {
  ExecutionRequestSchema,
  ExecutionEventSchema,
  ExecutionEventTypeSchema,
  ExecutionStatusSchema,
} from '#shared/schemas/execution.js';

// ---- ExecutionRequest Tests ----

describe('ExecutionRequest', () => {
  const validRequest = {
    taskId: 'task_a1b2c3d4',
    capability: 'traffic.overview',
    inputs: {
      dateRange: { from: '2026-08-04', to: '2026-08-11' },
      shopId: 'jd_shop_001',
    },
    context: {
      sessionId: 'session_123',
      userPrompt: '分析流量下降原因',
    },
  };

  it('accepts a valid execution request', () => {
    const result = ExecutionRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('accepts minimal request (capability + taskId only)', () => {
    const minimal = { taskId: 'task_001', capability: 'trade.overview', inputs: {} };
    const result = ExecutionRequestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects request missing taskId', () => {
    const invalid = { capability: 'traffic.overview', inputs: {} };
    const result = ExecutionRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects request missing capability', () => {
    const invalid = { taskId: 'task_001', inputs: {} };
    const result = ExecutionRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects request with empty capability', () => {
    const invalid = { taskId: 'task_001', capability: '', inputs: {} };
    const result = ExecutionRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts request without context', () => {
    const noContext = { taskId: 'task_001', capability: 'traffic.overview', inputs: {} };
    const result = ExecutionRequestSchema.safeParse(noContext);
    expect(result.success).toBe(true);
  });

  it('validates dateRange format', () => {
    const badDate = {
      taskId: 'task_001',
      capability: 'traffic.overview',
      inputs: { dateRange: { from: 'not-a-date', to: '2026-08-11' } },
    };
    const result = ExecutionRequestSchema.safeParse(badDate);
    expect(result.success).toBe(false);
  });
});

// ---- ExecutionEvent Tests ----

describe('ExecutionEvent', () => {
  it('validates execution.started event', () => {
    const event = {
      type: 'execution.started',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:00Z',
      data: { capability: 'traffic.overview' },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.type).toBe('execution.started');
  });

  it('validates acquisition.started event', () => {
    const event = {
      type: 'acquisition.started',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:01Z',
      data: { method: 'cdp', platform: 'jd', page: 'flow-summary' },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.type).toBe('acquisition.started');
    expect(result.data.method).toBe('cdp');
  });

  it('validates acquisition.progress event', () => {
    const event = {
      type: 'acquisition.progress',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:05Z',
      data: { completed: 3, total: 7 },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.data.completed).toBe(3);
  });

  it('validates acquisition.completed event', () => {
    const event = {
      type: 'acquisition.completed',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:15Z',
      data: { endpointsCaptured: 7, durationMs: 14200 },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.data.endpointsCaptured).toBe(7);
  });

  it('validates evidence.created event', () => {
    const event = {
      type: 'evidence.created',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:12Z',
      data: { evidenceId: 'ev_001', dataType: 'traffic', metricsCount: 17 },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.data.metricsCount).toBe(17);
  });

  it('validates execution.completed event', () => {
    const event = {
      type: 'execution.completed',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:20Z',
      data: { totalEvidence: 7, totalMetrics: 17, durationMs: 20000 },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.data.totalEvidence).toBe(7);
  });

  it('validates execution.failed event', () => {
    const event = {
      type: 'execution.failed',
      taskId: 'task_001',
      timestamp: '2026-08-11T10:00:05Z',
      data: { code: 'CDP_CONNECTION_FAILED', message: 'Cannot connect to Chrome on port 9222', recoverable: true },
    };
    const result = ExecutionEventSchema.parse(event);
    expect(result.type).toBe('execution.failed');
    expect(result.data.recoverable).toBe(true);
  });

  it('rejects unknown event type', () => {
    const event = { type: 'agent.thinking', taskId: 'task_001', timestamp: '2026-08-11T10:00:00Z', data: {} };
    const result = ExecutionEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it('rejects event missing type field', () => {
    const event = { taskId: 'task_001', timestamp: '2026-08-11T10:00:00Z', data: {} };
    const result = ExecutionEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it('rejects event missing taskId', () => {
    const event = { type: 'execution.started', timestamp: '2026-08-11T10:00:00Z', data: { capability: 'traffic.overview' } };
    const result = ExecutionEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

// ---- ExecutionEventType completeness ----

describe('ExecutionEventType', () => {
  it('covers all 7 event types defined in Phase 3 Proposal', () => {
    const requiredTypes = [
      'execution.started',
      'acquisition.started',
      'acquisition.progress',
      'acquisition.completed',
      'evidence.created',
      'execution.completed',
      'execution.failed',
    ];
    const validTypes = ExecutionEventTypeSchema.options;
    requiredTypes.forEach((t) => {
      expect(validTypes).toContain(t);
    });
  });

  it('does NOT include thinking/reasoning types', () => {
    const validTypes = ExecutionEventTypeSchema.options;
    const forbidden = ['agent.thinking', 'model.chain-of-thought', 'reasoning.step', 'plan.generated'];
    forbidden.forEach((f) => {
      expect(validTypes).not.toContain(f);
    });
  });
});

// ---- ExecutionStatus tests ----

describe('ExecutionStatus', () => {
  it('covers the full task lifecycle', () => {
    const statuses = ExecutionStatusSchema.options;
    expect(statuses).toContain('pending');
    expect(statuses).toContain('planning');
    expect(statuses).toContain('executing');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('rejected');
  });
});

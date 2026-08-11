// Unit tests for binding/executor.ts — generic execution pipeline.

import { describe, expect, test, vi } from 'vitest';
import { executePlan } from '#app/connectors/binding/index.js';
import type { CapabilityExecutionPlan, AcquireFunction } from '#app/connectors/binding/index.js';

const makePlan = (): CapabilityExecutionPlan => ({
  platform: 'jd',
  apis_to_call: [
    {
      endpoint: 'summary.ajax',
      gateway_url: 'szgateway.jd.com/api/',
      strategy: 'aggregate' as const,
      fields_to_parse: ['gmv'],
      field_mapping: { gmv: 'gmv' },
    },
    {
      endpoint: 'trend.ajax',
      gateway_url: 'szgateway.jd.com/api/',
      strategy: 'time_series' as const,
      fields_to_parse: ['dt', 'gmv'],
      field_mapping: { dt: 'dt', gmv: 'gmv' },
    },
  ],
  indicator_resolution: [
    { raw_key: 'gmv', canonical: 'gmv', unit: 'currency', confidence: 1 },
  ],
  evidence_capture: [
    { endpoint: 'summary', capture_screenshot: false, capture_dom: false, capture_raw_response: true, capture_metadata: true },
  ],
  target_capabilities: ['Transaction'],
});

const makeMockAcquire = (data?: Record<string, unknown>): AcquireFunction => {
  return vi.fn().mockResolvedValue(data ?? {
    'summary.ajax': { gmv: 5000 },
    'trend.ajax': { dt: '2026-07-01', gmv: 5000 },
  });
};

describe('executePlan', () => {
  test('produces ExecuteResult with success: true for valid plan', async () => {
    const plan = makePlan();
    const acquireFn = makeMockAcquire();
    const result = await executePlan(plan, acquireFn, {
      shopId: 'jd_shop_001',
      date: '2026-07-01',
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe('jd');
    expect(result.shopId).toBe('jd_shop_001');
    expect(result.errors).toHaveLength(0);
  });

  test('passes acquired data through to result', async () => {
    const plan = makePlan();
    const acquireFn = makeMockAcquire();
    const result = await executePlan(plan, acquireFn, {
      shopId: 'jd_shop_001',
    });

    expect(result.acquired['summary.ajax']).toBeDefined();
    expect(result.acquired['trend.ajax']).toBeDefined();
  });

  test('returns success: true with warning when no APIs to call', async () => {
    const plan: CapabilityExecutionPlan = {
      ...makePlan(),
      apis_to_call: [],
    };
    const acquireFn = makeMockAcquire({});
    const result = await executePlan(plan, acquireFn, {
      shopId: 'jd_shop_001',
    });

    expect(result.success).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('No APIs');
  });

  test('calls acquire function with correct endpoint names', async () => {
    const plan = makePlan();
    const acquireFn = vi.fn().mockResolvedValue({
      'summary.ajax': { gmv: 5000 },
    });
    await executePlan(plan, acquireFn as AcquireFunction, {
      shopId: 'jd_shop_001',
    });

    expect(acquireFn).toHaveBeenCalledWith(
      'jd_shop_001',
      ['summary.ajax', 'trend.ajax'],
      expect.objectContaining({ date: expect.any(String) }),
    );
  });

  test('returns success: false when acquire function throws', async () => {
    const plan = makePlan();
    const acquireFn = vi.fn().mockRejectedValue(new Error('CDP connection failed'));
    const result = await executePlan(plan, acquireFn as unknown as AcquireFunction, {
      shopId: 'jd_shop_001',
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('CDP connection failed');
  });

  test('uses today date when date option is omitted', async () => {
    const plan = makePlan();
    const acquireFn = vi.fn().mockResolvedValue({});
    await executePlan(plan, acquireFn as AcquireFunction, {
      shopId: 'jd_shop_001',
    });

    const callArgs = acquireFn.mock.calls[0]?.[2];
    expect(callArgs?.date).toBeDefined();
    // Should be a valid ISO date string (YYYY-MM-DD)
    expect(callArgs?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

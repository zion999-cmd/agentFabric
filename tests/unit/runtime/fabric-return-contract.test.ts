// P0009 correction — Fabric Execution Return Contract test.
// Proves the agent-facing projection preserves the real business metrics
// (EnterpriseSignal.metrics), not just a signal count.

import { describe, it, expect } from 'vitest';
import { projectAgentSignals } from '#platform/server/routes/runtime.js';
import type { EnterpriseSignal } from '#shared/schemas/signal.js';

describe('projectAgentSignals (Fabric Execution Return Contract)', () => {
  it('preserves signal value + metric bundle (not just a count)', () => {
    // Minimal EnterpriseSignal — only the fields projectAgentSignals reads.
    const signal = {
      signal_name: '店铺流量',
      signal_value: 1234,
      signal_unit: 'count',
      signal_direction: 'up',
      metrics: { uv: 1000, pv: 5000, cvr: 0.03, gmv: 4626 },
      observed_at: '2026-08-15T00:00:00Z',
    } as unknown as EnterpriseSignal;

    const projected = projectAgentSignals([signal]);

    expect(projected).toHaveLength(1);
    expect(projected[0]!.name).toBe('店铺流量');
    expect(projected[0]!.value).toBe(1234);
    expect(projected[0]!.direction).toBe('up');
    // The real metric values survive — this is the contract gap fix.
    expect(projected[0]!.metrics.uv).toBe(1000);
    expect(projected[0]!.metrics.pv).toBe(5000);
    expect(projected[0]!.metrics.cvr).toBe(0.03);
    expect(projected[0]!.metrics.gmv).toBe(4626);
    expect(projected[0]!.observedAt).toBe('2026-08-15T00:00:00Z');
  });

  it('drops internal fields (raw_payload / trace / lifecycle) from the agent contract', () => {
    const signal = {
      signal_name: 'x',
      signal_value: 1,
      signal_unit: 'count',
      signal_direction: 'flat',
      metrics: { uv: 1 },
      observed_at: '2026-08-15T00:00:00Z',
      raw_payload: { huge: 'internal' },
      trace: [{ internal: true }],
      lifecycle: 'active',
    } as unknown as EnterpriseSignal;

    const projected = projectAgentSignals([signal]);
    const out = projected[0]! as unknown as Record<string, unknown>;

    expect(out['raw_payload']).toBeUndefined();
    expect(out['trace']).toBeUndefined();
    expect(out['lifecycle']).toBeUndefined();
    expect(out['metrics']).toEqual({ uv: 1 });
  });
});

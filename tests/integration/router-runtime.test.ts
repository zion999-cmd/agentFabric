// Integration test: Router → Registry → Adapter → Stub Runtime full cycle.
// Verifies the complete Control Plane flow without a real subprocess.

import { describe, expect, test } from 'vitest';
import { InMemoryRuntimeRegistry } from '#platform/runtime/registry.js';
import { DefaultRouter } from '#platform/runtime/router.js';
import { HermesRuntimeAdapter } from '#platform/runtime/hermes/adapter.js';
import { StubHermesClient } from '#platform/runtime/hermes/stub-client.js';
import { ExecutionResultSchema } from '#platform/runtime/types.js';

describe('Router → Runtime (integration)', () => {
  const registry = new InMemoryRuntimeRegistry();
  const client = new StubHermesClient();
  const adapter = new HermesRuntimeAdapter(client);
  registry.register(adapter.capability);
  registry.get('hermes')!.metadata['adapter'] = adapter;
  const router = new DefaultRouter(registry);

  test('full dispatch cycle produces valid ExecutionResult', async () => {
    const result = await router.dispatch({
      action: 'summarize_top_ranking',
      context: {
        product_name: 'Product A',
        summary: 'Growth leader',
        overall_score: 0.95,
        confidence: 0.9,
        coverage: 0.8,
        trust_score: 0.88,
        strengths: 'High growth, High demand',
        risks: 'Low stock',
      },
      policyIds: ['operator_mode_policy'],
      runtimePreference: 'hermes',
    });

    const parsed = ExecutionResultSchema.parse(result);
    expect(parsed.plan_id).toBeDefined();
    expect(parsed.step_results).toHaveLength(1);
    expect(parsed.step_results[0]!.confidence).toBeGreaterThanOrEqual(0);
    expect(parsed.step_results[0]!.confidence).toBeLessThanOrEqual(1);
    expect(parsed.aggregate_confidence).toBeGreaterThanOrEqual(0);
    expect(parsed.duration_ms).toBeGreaterThanOrEqual(0);
  });

  test('multiple dispatches produce unique plan IDs', async () => {
    const result1 = await router.dispatch({
      action: 'summarize_top_ranking',
      context: { product_name: 'P1' },
    });
    const result2 = await router.dispatch({
      action: 'summarize_top_ranking',
      context: { product_name: 'P2' },
    });

    expect(result1.plan_id).not.toBe(result2.plan_id);
  });
});

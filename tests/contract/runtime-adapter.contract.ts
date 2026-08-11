// Contract test for the RuntimeAdapter interface.
// Uses HermesRuntimeAdapter + StubHermesClient — no subprocess needed.
// All adapters must pass this contract.

import { describe, expect, test } from 'vitest';
import { StubHermesClient } from '#platform/runtime/hermes/stub-client.js';
import { HermesRuntimeAdapter } from '#platform/runtime/hermes/adapter.js';
import { ExecutionPlanSchema, ExecutionResultSchema } from '#platform/runtime/types.js';

describe('RuntimeAdapter contract (via HermesRuntimeAdapter + stub)', () => {
  const client = new StubHermesClient();
  const adapter = new HermesRuntimeAdapter(client);

  test('isAvailable returns true for stub', () => {
    expect(adapter.isAvailable()).toBe(true);
  });

  test('capability reports hermes as available with correct actions', () => {
    expect(adapter.capability.runtime_id).toBe('hermes');
    expect(adapter.capability.available).toBe(true);
    expect(adapter.capability.supported_actions).toContain('summarize_top_ranking');
  });

  test('execute returns a valid ExecutionResult', async () => {
    const plan = ExecutionPlanSchema.parse({
      plan_id: 'test-plan-1',
      skill: 'summarize_top_ranking',
      context: { product_name: 'Test Product' },
      steps: [
        {
          step_id: 'step-1',
          action: 'summarize_top_ranking',
          prompt_template: 'Summarize: {{product_name}}',
          context_bindings: ['product_name'],
        },
      ],
      created_at: new Date().toISOString(),
    });

    const result = await adapter.execute(plan);
    const parsed = ExecutionResultSchema.parse(result);
    expect(parsed.plan_id).toBe('test-plan-1');
    expect(parsed.step_results).toHaveLength(1);
    expect(parsed.step_results[0]!.output.length).toBeGreaterThan(0);
    expect(parsed.aggregate_confidence).toBeGreaterThanOrEqual(0);
    expect(parsed.aggregate_confidence).toBeLessThanOrEqual(1);
    expect(parsed.duration_ms).toBeGreaterThanOrEqual(0);
  });

  test('context binding replaces {{key}} placeholders', async () => {
    const plan = ExecutionPlanSchema.parse({
      plan_id: 'test-plan-2',
      skill: 'summarize_top_ranking',
      context: { product_name: 'TestProduct', score: 0.95 },
      steps: [
        {
          step_id: 'step-1',
          action: 'summarize_top_ranking',
          prompt_template: 'Product: {{product_name}}, Score: {{score}}',
          context_bindings: ['product_name', 'score'],
        },
      ],
      created_at: new Date().toISOString(),
    });

    const result = await adapter.execute(plan);
    // The stub echoes the prompt — verify bindings were injected.
    expect(result.step_results[0]!.output).toContain('TestProduct');
    expect(result.step_results[0]!.output).toContain('0.95');
  });

  test('execute handles missing context keys gracefully', async () => {
    const plan = ExecutionPlanSchema.parse({
      plan_id: 'test-plan-3',
      skill: 'summarize_top_ranking',
      context: {},
      steps: [
        {
          step_id: 'step-1',
          action: 'summarize_top_ranking',
          prompt_template: 'Product: {{missing_key}}',
          context_bindings: ['missing_key'],
        },
      ],
      created_at: new Date().toISOString(),
    });

    const result = await adapter.execute(plan);
    // Placeholder should remain as-is when context key is missing.
    expect(result.step_results[0]!.output).toContain('{{missing_key}}');
  });
});

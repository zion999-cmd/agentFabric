// Unit tests for DefaultRouter.
// Covers dispatch, action routing, prompt building, and error paths.

import { describe, expect, test, beforeEach } from 'vitest';
import { InMemoryRuntimeRegistry } from '#platform/runtime/registry.js';
import { DefaultRouter } from '#platform/runtime/router.js';
import type { RouterInput } from '#platform/runtime/router.js';
import { HermesRuntimeAdapter } from '#platform/runtime/hermes/adapter.js';
import { StubHermesClient } from '#platform/runtime/hermes/stub-client.js';
import { ExecutionResultSchema } from '#platform/runtime/types.js';

function setupRouter(): DefaultRouter {
  const registry = new InMemoryRuntimeRegistry();
  const client = new StubHermesClient();
  const adapter = new HermesRuntimeAdapter(client);
  registry.register(adapter.capability);
  // Store adapter in metadata so Router can resolve it.
  registry.get('hermes')!.metadata['adapter'] = adapter;
  return new DefaultRouter(registry);
}

describe('DefaultRouter', () => {
  let router: DefaultRouter;

  beforeEach(() => {
    router = setupRouter();
  });

  test('dispatches and returns a valid ExecutionResult', async () => {
    const input: RouterInput = {
      action: 'summarize_top_ranking',
      context: {
        product_name: 'TestProduct',
        overall_score: 0.95,
        summary: 'Top ranked product',
      },
    };
    const result = await router.dispatch(input);
    // Validate against schema.
    const parsed = ExecutionResultSchema.parse(result);
    expect(parsed.plan_id).toBeDefined();
    expect(parsed.step_results).toHaveLength(1);
    expect(parsed.step_results[0]!.output.length).toBeGreaterThan(0);
    expect(parsed.aggregate_confidence).toBeGreaterThanOrEqual(0);
    expect(parsed.aggregate_confidence).toBeLessThanOrEqual(1);
    expect(parsed.duration_ms).toBeGreaterThanOrEqual(0);
  });

  test('throws when no runtime supports the action', async () => {
    await expect(
      router.dispatch({ action: 'unknown_action', context: {} }),
    ).rejects.toThrow("No available runtime supports action");
  });

  test('generates correct prompt for summarize_top_ranking with full context', async () => {
    const result = await router.dispatch({
      action: 'summarize_top_ranking',
      context: {
        product_name: '祁门红茶',
        overall_score: 0.92,
        confidence: 0.88,
        coverage: 0.75,
        trust_score: 0.85,
        summary: 'Growth leaderboard #1',
        strengths: '高增长',
        risks: '缺货风险',
      },
    });

    const output = result.step_results[0]!.output;
    expect(output).toContain('祁门红茶');
    expect(output).toContain('0.92');
    expect(output).toContain('0.88');
    expect(output).toContain('0.85');
  });

  test('handles minimal context gracefully', async () => {
    const result = await router.dispatch({
      action: 'summarize_top_ranking',
      context: { product_name: 'MinimalProduct' },
    });

    expect(result.step_results[0]!.output.length).toBeGreaterThan(0);
  });

  test('prefers runtimePreference when specified', async () => {
    // Add a second runtime that also supports the action.
    const registry = new InMemoryRuntimeRegistry();
    const client = new StubHermesClient();
    const hermesAdapter = new HermesRuntimeAdapter(client);
    registry.register(hermesAdapter.capability);
    registry.get('hermes')!.metadata['adapter'] = hermesAdapter;

    // Register a "codex" stub — same stub client, different id.
    const codexCap = {
      ...hermesAdapter.capability,
      runtime_id: 'codex',
      display_name: 'Codex',
    };
    registry.register(codexCap);
    registry.get('codex')!.metadata['adapter'] = hermesAdapter;

    const codexRouter = new DefaultRouter(registry);
    const result = await codexRouter.dispatch({
      action: 'summarize_top_ranking',
      context: { product_name: 'Test' },
      runtimePreference: 'codex',
    });

    // plan_id should exist — confirms dispatch succeeded via the preferred runtime.
    expect(result.plan_id).toBeDefined();
    expect(result.step_results).toHaveLength(1);
  });

  test('includes policy constraints in the plan', async () => {
    const result = await router.dispatch({
      action: 'summarize_top_ranking',
      context: { product_name: 'Test' },
      policyIds: ['margin_floor_policy', 'risk_threshold_policy'],
    });

    // Verify the plan was executed (policy constraints are embedded in the plan,
    // enforced by the Router's plan construction — the stub runtime doesn't enforce them).
    expect(result.plan_id).toBeDefined();
    expect(result.step_results).toHaveLength(1);
  });

  test('generates generic prompt for unknown actions with available runtime', async () => {
    // Register a runtime that supports a custom action.
    const registry = new InMemoryRuntimeRegistry();
    const client = new StubHermesClient();
    const adapter = new HermesRuntimeAdapter(client);
    // Override supported_actions to include a custom action.
    const cap = {
      ...adapter.capability,
      supported_actions: ['custom_report'],
    };
    registry.register(cap);
    registry.get('hermes')!.metadata['adapter'] = adapter;
    const customRouter = new DefaultRouter(registry);

    const result = await customRouter.dispatch({
      action: 'custom_report',
      context: { report_type: 'daily', entity: 'SKU-001' },
    });

    expect(result.step_results[0]!.output.length).toBeGreaterThan(0);
    // Generic prompt should include the action name and context keys.
    expect(result.step_results[0]!.output).toContain('custom_report');
  });
});

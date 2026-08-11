// HermesRuntimeAdapter — wraps HermesClient behind the RuntimeAdapter contract.
// Zero changes to HermesClient itself. This is the adapter pattern in action.

import type { RuntimeAdapter, RuntimeCapability, ExecutionPlan, ExecutionResult, PlanStep, StepResult } from '../types.js';
import type { HermesClient } from './types.js';
import { HermesOneShotRequestSchema } from './types.js';

const HERMES_CAPABILITY: Omit<RuntimeCapability, 'available'> = {
  runtime_id: 'hermes',
  display_name: 'Hermes Agent Runtime',
  supported_actions: ['summarize_top_ranking'],
  metadata: {},
};

export class HermesRuntimeAdapter implements RuntimeAdapter {
  readonly capability: RuntimeCapability;

  constructor(private readonly client: HermesClient) {
    this.capability = {
      ...HERMES_CAPABILITY,
      available: client.isAvailable(),
    };
  }

  isAvailable(): boolean {
    return this.client.isAvailable();
  }

  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    const start = Date.now();
    const stepResults = await Promise.all(
      plan.steps.map((step) => this.executeStep(step, plan.context)),
    );
    const durationMs = Date.now() - start;

    const totalConfidence = stepResults.reduce((sum, s) => sum + s.confidence, 0);
    const aggregateConfidence = stepResults.length > 0
      ? Math.round((totalConfidence / stepResults.length) * 100) / 100
      : 0;

    return {
      plan_id: plan.plan_id,
      step_results: stepResults,
      aggregate_confidence: aggregateConfidence,
      duration_ms: durationMs,
    };
  }

  private async executeStep(
    step: PlanStep,
    context: Record<string, unknown>,
  ): Promise<StepResult> {
    const boundPrompt = this.bindContext(step.prompt_template, context);

    const req = HermesOneShotRequestSchema.parse({
      prompt: boundPrompt,
      toolsets: step.tools_allowed.length > 0 ? step.tools_allowed.join(',') : undefined,
      safeMode: step.constraints.includes('safe_mode'),
    });

    try {
      const result = await this.client.oneShot(req);
      return {
        step_id: step.step_id,
        output: result.stdout,
        tool_calls: [],
        confidence: 0.9,
        trace: { exit_code: result.exitCode, duration_ms: result.durationMs },
        logs: [],
      };
    } catch (err) {
      return {
        step_id: step.step_id,
        output: '',
        tool_calls: [],
        confidence: 0,
        trace: {},
        logs: [err instanceof Error ? err.message : 'Unknown Hermes error'],
      };
    }
  }

  /** Replace {{key}} placeholders with context values. */
  private bindContext(
    template: string,
    context: Record<string, unknown>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const val = context[key];
      return val != null ? String(val) : `{{${key}}}`;
    });
  }
}

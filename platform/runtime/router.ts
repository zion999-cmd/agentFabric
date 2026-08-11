// Router — the Control Plane entry point.
// Resolves action → selects runtime → builds ExecutionPlan → dispatches → validates result.
// Only the Router communicates with Runtime. Business logic never talks to Runtime directly.

import type {
  RuntimeAdapter,
  RuntimeRegistry,
  ExecutionResult,
} from './types.js';
import { ExecutionPlanSchema } from './types.js';
import { uuid } from '#shared/utils/crypto.js';

// ---- Router Input ----

export interface RouterInput {
  /** The business action to perform (e.g. "summarize_top_ranking"). */
  action: string;
  /** Structured business context injected into the plan. */
  context: Record<string, unknown>;
  /** Policy constraint IDs applied to this execution. */
  policyIds?: string[];
  /** Preferred runtime ID (optional — auto-resolved if omitted). */
  runtimePreference?: string;
}

// ---- Router Interface ----

export interface Router {
  /** Route a business action through to a runtime and return the result. */
  dispatch(input: RouterInput): Promise<ExecutionResult>;
}

// ---- Default Router ----

export class DefaultRouter implements Router {
  constructor(private readonly registry: RuntimeRegistry) {}

  async dispatch(input: RouterInput): Promise<ExecutionResult> {
    const { action, context, policyIds, runtimePreference } = input;

    // 1. Resolve which runtime(s) support this action.
    const candidates = this.registry.resolve(action);
    if (candidates.length === 0) {
      throw new Error(
        `No available runtime supports action '${action}'`,
      );
    }

    // 2. Select runtime: explicit preference first, then first available.
    const selected = runtimePreference
      ? this.registry.get(runtimePreference)
      : undefined;
    const runtime = selected?.available ? selected : candidates[0]!;

    // 3. Build the execution plan.
    const plan = ExecutionPlanSchema.parse({
      plan_id: uuid(),
      skill: action,
      context,
      policy_constraints: policyIds ?? [],
      steps: [
        {
          step_id: `${action}-step-1`,
          action,
          prompt_template: buildPromptForAction(action, context),
          context_bindings: Object.keys(context),
          tools_allowed: [],
          expected_output: 'structured summary',
          constraints: [
            'no_policy_modification',
            'no_plan_modification',
            'no_skill_selection',
          ],
        },
      ],
      runtime_preference: runtime.runtime_id,
      created_at: new Date().toISOString(),
    });

    // 4. Resolve the adapter and dispatch.
    const adapter = resolveAdapter(this.registry, runtime.runtime_id);
    const result = await adapter.execute(plan);

    // 5. Return the executed plan (wrapped with the result).
    return result;
  }
}

// ---- Adapter Resolution ----

/** Resolve a RuntimeAdapter from the registry's capability metadata. */
const resolveAdapter = (
  registry: RuntimeRegistry,
  runtimeId: string,
): RuntimeAdapter => {
  const cap = registry.get(runtimeId);
  if (!cap) {
    throw new Error(`Runtime '${runtimeId}' not found in registry`);
  }
  const adapter = cap.metadata['adapter'] as RuntimeAdapter | undefined;
  if (!adapter) {
    throw new Error(`No adapter registered for runtime '${runtimeId}'`);
  }
  return adapter;
};

// ---- Prompt Building ----

/**
 * Build a structured-context prompt template for the given action.
 * Future: loaded from skill definitions rather than a hardcoded mapping.
 */
const buildPromptForAction = (
  action: string,
  context: Record<string, unknown>,
): string => {
  if (action === 'summarize_top_ranking') {
    const productName = context['product_name'] ?? 'Unknown';
    const summary = context['summary'] ?? '';
    const score = context['overall_score'] ?? '';
    const confidence = context['confidence'] ?? '';
    const coverage = context['coverage'] ?? '';
    const trustScore = context['trust_score'] ?? '';
    const strengths = context['strengths'] ?? '';
    const risks = context['risks'] ?? '';

    return [
      '你是电商运营助手。基于以下结构化业务上下文，用一段话向运营人员解释为何该商品排名第一，并给出一条可执行建议。',
      '',
      `商品: ${productName}`,
      `榜单: ${summary}`,
      `综合得分: ${typeof score === 'number' ? score.toFixed(3) : score}`,
      `置信度: ${typeof confidence === 'number' ? confidence.toFixed(2) : confidence}`,
      `覆盖度: ${typeof coverage === 'number' ? coverage.toFixed(2) : coverage}`,
      `信任分: ${typeof trustScore === 'number' ? trustScore.toFixed(2) : trustScore}`,
      `优势: ${strengths || '无'}`,
      `风险: ${risks || '无'}`,
    ].join('\n');
  }

  // Generic fallback: pass context as structured text.
  const contextText = Object.entries(context)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n');
  return `执行以下业务操作: ${action}\n\n上下文:\n${contextText}`;
};

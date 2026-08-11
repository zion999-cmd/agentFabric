// Chat Route — the agent loop entry point for natural language interaction.
// P0006: Orchestrates HermesAgent (language) + Skill Registry (intent dispatch) +
// Runtime Kernel / Orchestrator (execution) into a complete end-to-end flow.
//
// Flow: User message → Intent classification → Handler dispatch → Response generation
//
// This is the first time agentFabric becomes a real interactive AI agent system.

import { Router } from 'express';
import { z } from 'zod';
import type { Database as Db } from 'better-sqlite3';
import { fail, ok } from '../envelope.js';
import { createHermesClient } from '#platform/runtime/hermes/index.js';
import { matchIntent, generateResponse } from '#app/skills/registry.js';
import type { SkillDefinition } from '#app/skills/definitions.js';
import { SKILL_CATALOG } from '#app/skills/definitions.js';
import { createRuntimeKernel, createEmptyBlueprint } from '#app/runtime/kernel/index.js';
import { createCapabilityBridge } from '#platform/runtime/hermes/index.js';
import { loadBlueprint } from '#app/connectors/binding/loader.js';
import { rankProductsComposition } from '#app/orchestrator.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { MemoryFacade } from '#app/experience/facade.js';
import { listProducts, listOrders } from '#platform/storage/product-repository.js';

// ---- Types ----

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  context: z.object({
    platform: z.string().optional(),
    shopId: z.string().optional(),
    shopName: z.string().optional(),
    date: z.string().optional(),
    profile: z.enum(['sales_leaderboard', 'growth_discovery', 'operator_mode']).optional(),
  }).optional(),
});

interface ChatResponse {
  reply: string;
  intent: string;
  confidence: number;
  method: 'pattern' | 'hermes';
  execution?: {
    success: boolean;
    skillName: string;
    data: Record<string, unknown>;
  };
}

// ---- Handler Dispatch ----

interface HandlerContext {
  platform: string;
  shopId: string;
  shopName: string;
  date: string;
  profile: string;
}

/**
 * Dispatch a skill handler and return structured execution results.
 *
 * Each handler type maps to an existing subsystem:
 *   - kernel → RuntimeKernel methods
 *   - orchestrator → rankProductsComposition
 *   - facade → SignalFacade / MemoryFacade / ProductRepository
 */
const dispatchHandler = async (
  skill: SkillDefinition,
  db: Db,
  context: Partial<HandlerContext>,
): Promise<{ success: boolean; data: Record<string, unknown>; error?: string }> => {
  const ctx: HandlerContext = {
    platform: context.platform ?? 'jd',
    shopId: context.shopId ?? 'jd_shop_001',
    shopName: context.shopName ?? '京东店铺',
    date: context.date ?? new Date().toISOString().slice(0, 10),
    profile: context.profile ?? 'operator_mode',
  };

  try {
    switch (skill.handler) {
      // ---- Kernel Handlers ----
      case 'kernel.execute': {
        let blueprint;
        try {
          blueprint = loadBlueprint('jd');
        } catch {
          blueprint = createEmptyBlueprint('jd');
        }
        const kernel = createRuntimeKernel(db, blueprint);
        const result = await kernel.execute({
          shopId: ctx.shopId,
          date: ctx.date,
          mock: true, // Chat always uses mock mode for safety
          shopName: ctx.shopName,
        });
        return {
          success: result.success,
          data: {
            platform: result.platform,
            shopId: result.shopId,
            date: result.date,
            success: result.success ? '成功' : '失败',
            signalCount: String(result.signals.length),
            evidenceCount: String(result.evidence.length),
            signalTypes: result.signals.map((s) => s.signal_name).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '无',
            signals: JSON.stringify(result.signals.slice(0, 5)),
            errors: result.errors.join('; ') || '无',
          },
        };
      }

      case 'kernel.executeLiveCDP': {
        return {
          success: false,
          data: {},
          error: 'Live CDP 采集仅支持 CLI 模式（需要 Chrome 浏览器）。请使用 CLI 命令: npm run cli -- collect jd <shopId> --mode live',
        };
      }

      case 'kernel.executeImport': {
        return {
          success: false,
          data: {},
          error: '数据导入仅支持 CLI 模式。请使用 CLI 命令: npm run cli -- import-jd --source <path>',
        };
      }

      // ---- Orchestrator Handlers ----
      case 'orchestrator.rank': {
        const products = listProducts(db);
        const orders = listOrders(db);
        if (products.length === 0) {
          return {
            success: false,
            data: {},
            error: '数据库中没有商品数据。请先执行数据采集或导入。',
          };
        }
        const result = await rankProductsComposition({
          products,
          orders,
          profile: (ctx.profile as 'sales_leaderboard' | 'growth_discovery' | 'operator_mode') || 'operator_mode',
          db,
        });
        const top = result.rankings[0];
        return {
          success: true,
          data: {
            profile: ctx.profile,
            rankedCount: String(result.rankings.length),
            topProduct: top ? (products.find((p) => p.product_id === top.entity_id)?.name ?? top.entity_id) : '无',
            topScore: top?.overall_score.toFixed(3) ?? '0',
            topSummary: top?.explainability.summary ?? '无',
            avgConfidence: (result.rankings.reduce((s, r) => s + r.confidence, 0) / (result.rankings.length || 1)).toFixed(2),
            rankings: JSON.stringify(result.rankings.slice(0, 5)),
          },
        };
      }

      // ---- Facade Handlers ----
      case 'facade.signals': {
        const signals = SignalFacade.listAll(db, 'product');
        const recentSignals = signals.slice(0, 20);
        const byType = new Map<string, number>();
        for (const s of signals) byType.set(s.signal_name, (byType.get(s.signal_name) ?? 0) + 1);
        return {
          success: true,
          data: {
            totalSignals: String(signals.length),
            signalSummary: [...byType.entries()].map(([k, v]) => `${k}: ${v}条`).join(', ') || '无信号数据',
            recentSignals: JSON.stringify(recentSignals.slice(0, 5)),
          },
        };
      }

      case 'facade.evidence': {
        const signals = SignalFacade.listAll(db, 'product');
        const dates = [...new Set(
          signals
            .map((s) => s.observed_at?.slice(0, 10))
            .filter((d): d is string => d !== undefined),
        )].sort().reverse();
        return {
          success: true,
          data: {
            evidenceSummary: dates.length > 0
              ? `共有 ${dates.length} 天的数据记录 (${dates.slice(0, 3).join(', ')}${dates.length > 3 ? '...' : ''})`
              : '暂无采集记录',
            datesWithData: JSON.stringify(dates.slice(0, 10)),
            totalDays: String(dates.length),
          },
        };
      }

      case 'facade.memory': {
        const memories = MemoryFacade.queryActive(db);
        return {
          success: true,
          data: {
            memoryCount: String(memories.length),
            memories: JSON.stringify(memories.slice(0, 5).map((m) => ({
              statement: m.statement,
              type: m.memory_type,
              score: m.weight.final_score,
            }))),
            summary: memories.length > 0
              ? `系统有 ${memories.length} 条活跃业务经验`
              : '暂无已验证的业务经验',
          },
        };
      }

      case 'facade.products': {
        const products = listProducts(db);
        return {
          success: true,
          data: {
            productCount: String(products.length),
            products: JSON.stringify(products.slice(0, 10).map((p) => ({
              id: p.product_id,
              name: p.name,
              price: p.price,
            }))),
          },
        };
      }

      // ---- Bridge Handlers (Phase 3.2) ----
      case 'bridge.discover': {
        const bridge = createCapabilityBridge();
        const result = bridge.searchByIntent(ctx.date ? `分析流量 ${ctx.date}` : '分析流量');
        if (!result.bestMatch) {
          return { success: false, data: {}, error: 'No matching capability found for this intent.' };
        }
        const cap = result.bestMatch.entry;
        return {
          success: true,
          data: {
            summary: `最佳匹配: ${cap.name} (${cap.capability}). ${cap.description}`,
            capability: cap.capability,
            capabilityName: cap.name,
            domain: cap.domain,
            provider: `${cap.provider.platform} (${cap.provider.acquisition})`,
            validation: cap.validation.status,
            outputs: cap.outputs.join(', '),
            metricsCount: String(cap.outputs.length),
            candidates: JSON.stringify(result.candidates.slice(0, 3).map((c) => ({ capability: c.entry.capability, name: c.entry.name, score: c.score }))),
          },
        };
      }

      default:
        return {
          success: false,
          data: {},
          error: `未知的处理器: ${skill.handler}`,
        };
    }
  } catch (err) {
    return {
      success: false,
      data: {},
      error: err instanceof Error ? err.message : '处理执行失败',
    };
  }
};

// ---- Router ----

export const chatRouter = (db: Db): Router => {
  const router = Router();

  // POST /api/chat — natural language interaction endpoint.
  router.post('/chat', async (req, res) => {
    const parsed = ChatRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      fail(res, 400, `Invalid request: ${parsed.error.message}`);
      return;
    }

    const { message, context } = parsed.data;
    const hermes = createHermesClient();

    try {
      // Step 1: Intent classification
      const match = await matchIntent(message, hermes);

      // Step 2: Handler dispatch
      const handlerCtx: Partial<HandlerContext> = {};
      if (context?.platform !== undefined) handlerCtx.platform = context.platform;
      if (context?.shopId !== undefined) handlerCtx.shopId = context.shopId;
      if (context?.shopName !== undefined) handlerCtx.shopName = context.shopName;
      if (context?.date !== undefined) handlerCtx.date = context.date;
      if (context?.profile !== undefined) handlerCtx.profile = context.profile;
      const dispatchResult = await dispatchHandler(match.skill, db, handlerCtx);

      // Step 2.5: If capability discovered, execute it (Phase 3.4 E2E chain)
      let executionResult: Record<string, unknown> | null = null;
      if (match.skill.name === 'discover_capability' && dispatchResult.success && dispatchResult.data['capability']) {
        const discoveredCapability = dispatchResult.data['capability'] as string;
        try {
          let blueprint;
          try { blueprint = loadBlueprint('jd'); } catch { blueprint = createEmptyBlueprint('jd'); }
          const kernel = createRuntimeKernel(db, blueprint);
          const execResult = await kernel.execute({
            shopId: handlerCtx.shopId ?? 'jd_shop_001',
            date: handlerCtx.date ?? new Date().toISOString().slice(0, 10),
            mock: true, // Chat mock mode; live CDP requires CLI
            shopName: handlerCtx.shopName ?? '京东店铺',
          });
          executionResult = {
            capability: discoveredCapability,
            success: execResult.success,
            signalCount: execResult.signals.length,
            evidenceCount: execResult.evidence.length,
            signalTypes: execResult.signals.map((s) => s.signal_name).filter((v, i, a) => a.indexOf(v) === i).join(', '),
            errors: execResult.errors.join('; '),
          };
        } catch (e) {
          executionResult = { capability: discoveredCapability, success: false, error: e instanceof Error ? e.message : 'Execution failed' };
        }
      }

      // Step 3: Response generation
      const skillResult = { skill: match.skill, ...dispatchResult, executionResult };
      const reply = await generateResponse(
        match.skill,
        skillResult,
        message,
        hermes,
      );

      // Step 4: Build response
      const chatResponse: ChatResponse = {
        reply,
        intent: match.skill.name,
        confidence: match.confidence,
        method: match.method,
        execution: {
          success: dispatchResult.success,
          skillName: match.skill.name,
          data: { ...dispatchResult.data, ...(executionResult ? { execution: executionResult } : {}) },
        },
      };

      ok(res, chatResponse);
    } catch (err) {
      // Degrade gracefully — return a plain error response
      const errorMessage = err instanceof Error ? err.message : 'Chat processing failed';
      ok(res, {
        reply: `抱歉，处理您的请求时遇到了问题：${errorMessage}。请稍后重试或检查系统状态。`,
        intent: 'general_question',
        confidence: 0,
        method: 'pattern' as const,
        execution: {
          success: false,
          skillName: 'general_question',
          data: { error: errorMessage },
        },
      });
    }
  });

  // GET /api/chat/skills — list available skills (for UI discovery).
  router.get('/chat/skills', (_req, res) => {
    const skills = SKILL_CATALOG.map((s) => ({
      name: s.name,
      displayName: s.displayName,
      description: s.description,
      handler: s.handler,
      handlerType: s.handlerType,
    }));
    ok(res, skills, { total: skills.length, page: 1, limit: skills.length });
  });

  return router;
};

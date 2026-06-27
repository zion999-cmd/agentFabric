// Composition layer — orchestration ONLY (no business logic).
// Wires signal → ranking → trace façades. Business formulas live in domains.

import type { Database as Db } from 'better-sqlite3';
import type { Signal } from '#shared/schemas/signal.js';
import type {
  BusinessConclusionTrace,
  ReplayConsistency,
} from '#shared/schemas/trace.js';
import type { RankingMemoryAdjustment } from '#shared/schemas/ranking.js';
import type { RankingProfileName } from '#shared/schemas/ranking.js';
import type { ContextMemory } from '#shared/schemas/memory.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { TraceFacade } from '#app/analysis/explainability/facade.js';
import { MemoryFacade } from '#app/experience/facade.js';
import { createHermesClient } from '#platform/runtime/hermes/index.js';
import { HermesOneShotRequestSchema } from '#platform/runtime/hermes/types.js';
import type { HermesClient } from '#platform/runtime/hermes/types.js';
import type { Product, Order } from '#shared/schemas/ecommerce.js';

export interface RankCompositionInput {
  products: readonly Product[];
  orders: readonly Order[];
  profile: RankingProfileName;
  memoryAdjustments?: readonly RankingMemoryAdjustment[];
  memories?: readonly ContextMemory[];
  replayConsistency?: ReplayConsistency;
  now?: Date;
  /** If provided, ranking adjustments are loaded from the memory store. */
  db?: Db;
  agentId?: string;
  /** Injected Hermes client for the AI summary (defaults to the factory). */
  hermes?: HermesClient;
}

export interface RankCompositionResult {
  signals: Signal[];
  /** Rankings ordered by overall_score desc. */
  rankings: ReturnType<typeof RankingFacade.rank>;
  /** Trace for the top-ranked product. */
  topTrace: BusinessConclusionTrace;
  /** AI-generated business summary of the top result (Hermes one-shot). */
  aiSummary: string;
}

/**
 * Orchestrate the full vertical: compute signals → rank → explain the top result.
 * Pure orchestration — delegates every formula to the domain façades.
 */
export const rankProductsComposition = async (
  input: RankCompositionInput,
): Promise<RankCompositionResult> => {
  const { products, orders, profile, memoryAdjustments, memories, replayConsistency, now, db, agentId, hermes } = input;

  const { signals } = SignalFacade.compute(
    { products, orders },
    { ...(now ? { now } : {}), windowDays: [3, 7, 14] },
  );

  // Load memory adjustments from the store unless explicitly provided.
  const adjustments = memoryAdjustments ?? (db ? MemoryFacade.adjustmentsFor(db, agentId) : []);

  const rankings = RankingFacade.rankByProfile(
    signals,
    profile,
    adjustments,
  );

  const top = rankings[0];
  if (!top) {
    throw new Error('rankProductsComposition: no ranking results produced (no signals)');
  }

  const topSignals = signals.filter((s) => s.entity_id === top.entity_id);
  const topTrace = TraceFacade.explain({
    conclusion: {
      entity_id: top.entity_id,
      entity_name: products.find((p) => p.product_id === top.entity_id)?.name ?? top.entity_id,
      statement: `该商品在 ${profile} 榜单中排名第一`,
      profile,
      date: top.ranked_at,
    },
    ranking: top,
    signals: topSignals,
    memories: memories ?? [],
    memoryAdjustments: adjustments,
    replayConsistency: replayConsistency ?? {
      days_present: 0,
      avg_rank: 0,
      rank_volatility: 0,
      top1_count: 0,
    },
    rank: 1,
  });

  // AI summary via Hermes one-shot — structured business context, not a longer prompt.
  const client = hermes ?? createHermesClient();
  const aiSummary = await summarizeTopResult(client, top, topTrace, products);

  return { signals, rankings, topTrace, aiSummary };
};

/** Build a structured-context prompt and call Hermes for a business summary. */
const summarizeTopResult = async (
  client: HermesClient,
  top: ReturnType<typeof RankingFacade.rank>[number],
  trace: BusinessConclusionTrace,
  products: readonly Product[],
): Promise<string> => {
  const productName = products.find((p) => p.product_id === top.entity_id)?.name ?? top.entity_id;
  const context = [
    `商品: ${productName}`,
    `榜单: ${top.explainability.summary}`,
    `综合得分: ${top.overall_score.toFixed(3)}`,
    `置信度: ${top.confidence.toFixed(2)}`,
    `覆盖度: ${top.coverage.toFixed(2)}`,
    `信任分: ${trace.alignment.trust_score.toFixed(2)}`,
    `优势: ${top.explainability.strengths.join('、') || '无'}`,
    `风险: ${top.explainability.risks.join('、') || '无'}`,
  ].join('\n');
  const prompt = `你是电商运营助手。基于以下结构化业务上下文，用一段话向运营人员解释为何该商品排名第一，并给出一条可执行建议。\n\n${context}`;
  try {
    const result = await client.oneShot(HermesOneShotRequestSchema.parse({ prompt }));
    return result.stdout;
  } catch {
    return top.explainability.summary;
  }
};

/**
 * Persist a composition run: store signals, rankings, and the top trace.
 */
export const persistComposition = (
  db: Db,
  profile: RankingProfileName,
  result: RankCompositionResult,
): void => {
  SignalFacade.store(db, result.signals);
  RankingFacade.store(db, profile, result.rankings);
  TraceFacade.store(db, result.topTrace);
};

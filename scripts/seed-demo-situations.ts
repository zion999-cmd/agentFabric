// P0010.1 Workspace Productization Baseline — Demo 3 Situation Seed.
//
// Inserts 3 idempotent fixture situations into the database so a human
// reviewer can open Workspace and see, in one place, the three states
// the Presentation Contract is supposed to handle honestly:
//
//   1. sit_observe_demo       — completed investigation, stopReason='observe'
//                                (no human intervention, no failed marker)
//   2. sit_human_demo         — completed investigation, stopReason='judgment'
//                                + 3 human interventions (correction +
//                                context_supplement + decision/reject)
//   3. sit_failed_recover_demo — a failed marker on top of a prior
//                                completed judgment (REPAIR: prior valid
//                                cognition is preserved, banner shows on
//                                the Hero block)
//
// Why we hand-write SQL and don't reuse the SituationSchema /
// InvestigationSchema parsers: the seed must be a stable, hand-curated
// fixture. Parsing through Zod would force every demo field to comply
// with the production schema's tightening (e.g. a Recommendation must
// have a `recommendation` string). We want the *fixture* to mirror
// what a real completed investigation looks like, including the parts
// that an LLM would emit (recommendation, rationale, etc.) — so we
// only validate the parts that are user-facing through the Schema and
// keep the rest as deterministic strings.
//
// Boundary (baseline §17 — NOT INCLUDED):
//   - does NOT add knowledge_id / business_trace / event_bus
//   - does NOT modify InvestigationSchema or Knowledge schema
//   - does NOT call any LLM to generate text
//   - does NOT touch Hermes session architecture
//   - does NOT create a second Product Catalog
//   - is idempotent: re-running is a no-op (existing rows are kept)

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { nowIso } from '#shared/utils/time.js';

const SHOP_ID = 'jd_shop_001';
const SHOP_NAME = '祁门红茶旗舰店';
const PLATFORM = 'jd';
const ACTOR_ID = 'operator_1';

const SIT_OBSERVE = {
  situationId: 'sit_observe_demo',
  domain: 'ecommerce',
  type: 'meaningful_change',
  entity: { id: SHOP_ID, type: 'shop', name: SHOP_NAME, platform: PLATFORM },
  temporal: { observedAt: '2026-08-22T08:00:00.000Z', windowStart: '2026-08-21', windowEnd: '2026-08-22' },
  description: '祁门红茶旗舰店 成交金额 较昨日下降 67.9%，从 ¥3384.26 变为 ¥1087.13。',
  tags: ['meaningful_change', 'gmv', 'down'],
};

const SIT_HUMAN = {
  situationId: 'sit_human_demo',
  domain: 'ecommerce',
  type: 'anomaly_investigation',
  entity: { id: SHOP_ID, type: 'shop', name: SHOP_NAME, platform: PLATFORM },
  temporal: { observedAt: '2026-08-22T10:00:00.000Z', windowStart: '2026-08-21', windowEnd: '2026-08-22' },
  description: '祁门红茶旗舰店 订单量 较昨日下降 42.0%，从 88 变为 51。',
  tags: ['meaningful_change', 'orders', 'down'],
};

const SIT_FAILED = {
  situationId: 'sit_failed_recover_demo',
  domain: 'ecommerce',
  type: 'ranking_attention',
  entity: { id: '10122145469026', type: 'product', name: '祁门红茶 · 经典 250g 礼盒', platform: PLATFORM },
  temporal: { observedAt: '2026-08-22T11:00:00.000Z' },
  description: '祁门红茶 · 经典 250g 礼盒 近期经营表现相对突出，进入持续观察名单 — 待 Agent 调查后给出判断。',
  tags: ['ranking_attention', 'product', 'leader'],
};

// ------------------------------------------------------------------
// SQL builders
// ------------------------------------------------------------------

const upsertSituation = (s: typeof SIT_OBSERVE | typeof SIT_FAILED, now: string): void => {
  const existing = globalDb.prepare('SELECT situation_id FROM situations WHERE situation_id = ?').get(s.situationId);
  if (existing) {
    // Idempotent: do not overwrite an already-existing demo row.
    return;
  }
  globalDb.prepare(
    `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
       observed_at, window_start, window_end, description, tags, lifecycle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    s.situationId, s.domain, s.type,
    s.entity.id, s.entity.type, s.entity.name, s.entity.platform,
    s.temporal.observedAt,
    (s.temporal as { windowStart?: string }).windowStart ?? null,
    (s.temporal as { windowEnd?: string }).windowEnd ?? null,
    s.description, JSON.stringify(s.tags), 'open',
    now, now,
  );
};

// Investigation payloads (mirror real Hermes outputs).

const OBSERVE_INVESTIGATION = {
  situationId: SIT_OBSERVE.situationId,
  currentUnderstanding: '8月15日大促结束后订单自然回落。',
  knownEvidence: ['GMV -67.9% (¥3384.26 → ¥1087.13)', 'UV 同步下降 58%', 'CVR 微升 1.2pp'],
  hypotheses: [
    { statement: '大促后自然回落（预期内）', status: 'supported' as const },
    { statement: '主图或价格异常', status: 'rejected' as const },
  ],
  judgment: '当前属于正常波动（8月15日大促结束后的自然回落），建议继续观察 24-48 小时，不调整广告、主图或价格。',
  stopReason: 'observe' as const,
  capabilityUsed: 'product.overview',
  evidenceAcquired: ['trade.overview 2026-08-21→2026-08-22'],
  recommendation: {
    recommendation: '继续观察 24-48 小时，不调整广告、主图或价格。',
    rationale: '对比 8月10日（同样为非大促日）数据，GMV/UV 处于历史正常区间。',
    risks: ['若真为问题，延迟观察可能错过窗口期。'],
    humanNeeded: ['运营确认 8月15日大促结束时间。'],
  },
  status: 'completed' as const,
  updatedAt: '2026-08-22T08:30:00.000Z',
};

const HUMAN_INVESTIGATION = {
  situationId: SIT_HUMAN.situationId,
  currentUnderstanding: '订单下降需重点关注：8月15日之后大促流量已经结束，但订单异常持续超过 7 天。',
  knownEvidence: ['Orders -42% (88 → 51)', 'UV 下降 18%', 'CVR 下降 3.1pp'],
  hypotheses: [
    { statement: '主推 SKU 库存不足', status: 'supported' as const },
    { statement: '客服响应延迟导致转化下降', status: 'proposed' as const },
  ],
  judgment: '订单下降需重点关注；建议先排查主推 SKU 库存与客服 24h 响应率。',
  stopReason: 'judgment' as const,
  capabilityUsed: 'product.overview',
  evidenceAcquired: ['orders.overview 2026-08-21→2026-08-22'],
  recommendation: {
    recommendation: '先排查主推 SKU 库存与客服 24h 响应率再判断是否干预。',
    rationale: '人工反馈与自动证据一致指向库存 / 客服链路。',
    risks: ['若过度解读人工反馈，可能错失自然回落窗口。'],
    humanNeeded: ['运营确认主推 SKU 是否有断货。'],
  },
  status: 'completed' as const,
  updatedAt: '2026-08-22T10:45:00.000Z',
};

const FAILED_PRIOR_INVESTIGATION = {
  situationId: SIT_FAILED.situationId,
  currentUnderstanding: '该商品近期表现值得关注；新品冷启动后需要确认转化率是否健康。',
  knownEvidence: ['GMV ¥3886.9', 'UV 356', 'CVR 6.46%'],
  hypotheses: [
    { statement: '真实业务机会（新品冷启动期）', status: 'proposed' as const },
    { statement: '统计噪声（UV<500）', status: 'rejected' as const },
  ],
  judgment: '值得持续观察 — UV<500 不能单独判噪声，需要看后续趋势。',
  stopReason: 'observe' as const,
  capabilityUsed: 'product.overview',
  evidenceAcquired: ['trade.overview 2026-08-21'],
  recommendation: {
    recommendation: '继续观察 1-2 天再判断。',
    rationale: '小样本需更多数据。',
    risks: ['若真为机会，延迟观察可能损失窗口期。'],
    humanNeeded: ['运营确认是否新品冷启动。'],
  },
  status: 'completed' as const,
  updatedAt: '2026-08-22T11:30:00.000Z',
};

// ------------------------------------------------------------------
// Learning-context helpers (mirror the production producer, hand-written
// because we don't want the seed to depend on Hermes / LLM round-trips).
// ------------------------------------------------------------------

// The Situation shape we accept: every demo fixture matches the SituationSchema
// (windowStart/windowEnd optional) but we declare a structural supertype here so
// we can pass ranking_attention fixtures (no window) into the same helpers.
type DemoSituation = {
  situationId: string;
  domain: string;
  type: string;
  entity: { id: string; type: string; name: string; platform: string };
  temporal: { observedAt: string; windowStart?: string; windowEnd?: string };
  description: string;
  tags: string[];
};

const buildLearningContext = (
  situation: DemoSituation,
  investigation: Record<string, unknown> | null,
  humanInterventions: Array<Record<string, unknown>>,
  now: string,
): Record<string, unknown> => ({
  contextId: 'ctx_' + situation.situationId,
  situation,
  lifecycle: humanInterventions.length > 0 ? 'partial' : 'open',
  createdAt: now,
  updatedAt: now,
  observations: [],
  evidenceIds: [],
  signalIds: [],
  agentActivities: [],
  humanInterventions,
  actions: [],
  outcomes: [],
  summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [ACTOR_ID], totalEvidence: 0, totalSignals: 0 },
  investigation,
});

const upsertLearningContext = (
  situation: DemoSituation,
  investigation: Record<string, unknown> | null,
  interventions: Array<Record<string, unknown>>,
  now: string,
): void => {
  const ctx = buildLearningContext(situation, investigation, interventions, now);
  const existing = globalDb.prepare('SELECT context_id FROM learning_contexts WHERE situation_id = ?').get(situation.situationId);
  if (existing) {
    globalDb.prepare(
      'UPDATE learning_contexts SET body = ?, updated_at = ? WHERE situation_id = ?',
    ).run(JSON.stringify(ctx), now, situation.situationId);
    return;
  }
  globalDb.prepare(
    `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    ctx.contextId as string, situation.situationId, ctx.lifecycle as string,
    now, now, JSON.stringify(ctx),
  );
};

const insertIntervention = (
  situationId: string,
  interventionId: string,
  type: 'response' | 'correction' | 'context_supplement' | 'decision',
  content: Record<string, unknown>,
  summary: string,
  now: string,
): void => {
  const existing = globalDb.prepare('SELECT intervention_id FROM human_interventions WHERE intervention_id = ?').get(interventionId);
  if (existing) return;
  globalDb.prepare(
    `INSERT INTO human_interventions (intervention_id, situation_id, actor_id, actor_role,
       type, content, summary, responds_to_activity_ids, review_id, action_id, legacy_source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    interventionId, situationId, ACTOR_ID, 'operator',
    type, JSON.stringify({ type, ...content }), summary,
    '[]', null, null, 'none', now,
  );
};

// ------------------------------------------------------------------
// Top-level seed
// ------------------------------------------------------------------

let globalDb: ReturnType<typeof openDb>;

const main = (): void => {
  const path = process.env.DB_PATH ?? './data/agentfabric.db';
  mkdirSync(dirname(path), { recursive: true });
  globalDb = openDb(path);
  initDatabase(globalDb);
  const now = nowIso();

  // 1) sit_observe_demo — completed, observe, no human intervention.
  upsertSituation(SIT_OBSERVE, now);
  upsertLearningContext(SIT_OBSERVE, OBSERVE_INVESTIGATION, [], now);

  // 2) sit_human_demo — completed, judgment, 3 human interventions.
  upsertSituation(SIT_HUMAN, now);
  const humanInterventions = [
    {
      interventionId: 'int_h1',
      situationId: SIT_HUMAN.situationId,
      actor: { id: ACTOR_ID, role: 'operator' },
      type: 'correction',
      content: { type: 'correction', corrects: {}, correction: '实际是 8月15日大促结束导致订单回落，订单异常已经持续 7 天' },
      timestamp: '2026-08-22T10:15:00.000Z',
      summary: '纠正: 实际是 8月15日大促结束导致订单回落，订单异常已经持续 7 天',
    },
    {
      interventionId: 'int_h2',
      situationId: SIT_HUMAN.situationId,
      actor: { id: ACTOR_ID, role: 'operator' },
      type: 'context_supplement',
      content: { type: 'context_supplement', supplements: { situationAspect: '库存' }, information: '主推 SKU 缺货已 3 天' },
      timestamp: '2026-08-22T10:20:00.000Z',
      summary: '补充: 主推 SKU 缺货已 3 天',
    },
    {
      interventionId: 'int_h3',
      situationId: SIT_HUMAN.situationId,
      actor: { id: ACTOR_ID, role: 'operator' },
      type: 'decision',
      content: { type: 'decision', decision: 'reject', appliesTo: { kind: 'recommendation' }, rationale: '当前不下架，继续监控 24h' },
      timestamp: '2026-08-22T10:25:00.000Z',
      summary: '不采用: 当前不下架，继续监控 24h',
    },
  ];
  for (const i of humanInterventions) {
    insertIntervention(SIT_HUMAN.situationId, i.interventionId as string, i.type as 'correction', {}, i.summary as string, now);
  }
  upsertLearningContext(SIT_HUMAN, HUMAN_INVESTIGATION, humanInterventions, now);

  // 3) sit_failed_recover_demo — failed marker on top of prior completed cognition.
  //    Persist the prior valid investigation first, then stamp a failed marker
  //    on top (this is what markInvestigation does in production; we replicate
  //    the merge here so the demo shows the exact REPAIR state).
  upsertSituation(SIT_FAILED, now);
  upsertLearningContext(SIT_FAILED, FAILED_PRIOR_INVESTIGATION, [], now);
  const failedMarker = {
    ...FAILED_PRIOR_INVESTIGATION,
    status: 'failed' as const,
    error: 'Turn timed out',
    updatedAt: '2026-08-22T12:00:00.000Z',
  };
  upsertLearningContext(SIT_FAILED, failedMarker, [], '2026-08-22T12:00:00.000Z');

  // eslint-disable-next-line no-console
  console.log(`[seed:demo-situations] seeded 3 demo situations into ${path}:`);
  // eslint-disable-next-line no-console
  console.log(`  - ${SIT_OBSERVE.situationId}  (completed · observe · 0 human interventions)`);
  // eslint-disable-next-line no-console
  console.log(`  - ${SIT_HUMAN.situationId}  (completed · judgment · 3 human interventions)`);
  // eslint-disable-next-line no-console
  console.log(`  - ${SIT_FAILED.situationId}  (failed marker · prior valid cognition preserved)`);
  globalDb.close();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

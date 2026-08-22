// P0010.1 Post-Productization REPAIR — 4 Demo Situations + Output Integration Test.
//
// Verifies the seed script (`scripts/seed-demo-situations.ts`) populates
// the 4 fixture situations the Workspace REPAIR relies on, plus 1
// Output/WorkItem for sit_human_demo to exercise the new outputs section:
//
//   - sit_observe_demo        — completed · observe · 0 human interventions
//   - sit_human_demo          — completed · judgment · 3 human interventions
//                              + 1 Output (recommendation, status=ready)
//   - sit_failed_recover_demo — failed marker on top of prior valid cognition
//   - sit_waiting_human_demo  — completed · ask_human · 0 human interventions
//
// We invoke the seed helpers directly (importing the helpers, not running
// the CLI) so the test is hermetic and does not require a separate
// `npm run seed:demo-situations` step.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import {
  deriveSituationLifecycle,
} from '#app/workspace/presentation.js';

const TEMP_DB = './data/test-three-demo-situations.db';

const EXPECTED_SITUATIONS = [
  { id: 'sit_observe_demo', type: 'meaningful_change' },
  { id: 'sit_human_demo', type: 'anomaly_investigation' },
  { id: 'sit_failed_recover_demo', type: 'ranking_attention' },
  { id: 'sit_waiting_human_demo', type: 'anomaly_investigation' },
];

function seedObserveDemo(db: ReturnType<typeof openDb>, now: string): void {
  const id = 'sit_observe_demo';
  db.prepare(
    `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
       observed_at, window_start, window_end, description, tags, lifecycle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, 'ecommerce', 'meaningful_change',
    'jd_shop_001', 'shop', '祁门红茶旗舰店', 'jd',
    '2026-08-22T08:00:00.000Z', '2026-08-21', '2026-08-22',
    '祁门红茶旗舰店 成交金额 较昨日下降 67.9%，从 ¥3384.26 变为 ¥1087.13。',
    JSON.stringify(['meaningful_change', 'gmv', 'down']), 'open', now, now,
  );
  const ctx = {
    contextId: 'ctx_' + id,
    situation: {
      situationId: id, domain: 'ecommerce', type: 'meaningful_change',
      entity: { id: 'jd_shop_001', type: 'shop', name: '祁门红茶旗舰店', platform: 'jd' },
      temporal: { observedAt: '2026-08-22T08:00:00.000Z' },
      description: '祁门红茶旗舰店 成交金额 较昨日下降 67.9%，从 ¥3384.26 变为 ¥1087.13。',
      tags: ['meaningful_change', 'gmv', 'down'],
    },
    lifecycle: 'open',
    createdAt: now, updatedAt: now,
    observations: [], evidenceIds: [], signalIds: [],
    agentActivities: [], humanInterventions: [], actions: [], outcomes: [],
    summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [], totalEvidence: 0, totalSignals: 0 },
    investigation: {
      situationId: id, stopReason: 'observe', status: 'completed',
      judgment: '当前属于正常波动（8月15日大促结束后的自然回落）',
      currentUnderstanding: '8月15日大促结束后订单自然回落。',
      recommendation: { recommendation: '继续观察 24-48 小时。' },
      updatedAt: now,
    },
  };
  db.prepare(
    `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(ctx.contextId, id, ctx.lifecycle, now, now, JSON.stringify(ctx));
}

function seedHumanDemo(db: ReturnType<typeof openDb>, now: string): void {
  const id = 'sit_human_demo';
  db.prepare(
    `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
       observed_at, window_start, window_end, description, tags, lifecycle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, 'ecommerce', 'anomaly_investigation',
    'jd_shop_001', 'shop', '祁门红茶旗舰店', 'jd',
    '2026-08-22T10:00:00.000Z', '2026-08-21', '2026-08-22',
    '祁门红茶旗舰店 订单量 较昨日下降 42.0%，从 88 变为 51。',
    JSON.stringify(['meaningful_change', 'orders', 'down']), 'partial', now, now,
  );
  const interventions = [
    { interventionId: 'int_h1', type: 'correction', summary: '纠正: 实际是 8月15日大促结束导致订单回落' },
    { interventionId: 'int_h2', type: 'context_supplement', summary: '补充: 主推 SKU 缺货已 3 天' },
    { interventionId: 'int_h3', type: 'decision', summary: '不采用: 当前不下架，继续监控 24h' },
  ];
  for (const i of interventions) {
    db.prepare(
      `INSERT INTO human_interventions (intervention_id, situation_id, actor_id, actor_role,
         type, content, summary, responds_to_activity_ids, review_id, action_id, legacy_source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      i.interventionId, id, 'operator_1', 'operator',
      i.type, JSON.stringify({ type: i.type }), i.summary,
      '[]', null, null, 'none', now,
    );
  }
  const ctx = {
    contextId: 'ctx_' + id,
    situation: {
      situationId: id, domain: 'ecommerce', type: 'anomaly_investigation',
      entity: { id: 'jd_shop_001', type: 'shop', name: '祁门红茶旗舰店', platform: 'jd' },
      temporal: { observedAt: '2026-08-22T10:00:00.000Z' },
      description: '祁门红茶旗舰店 订单量 较昨日下降 42.0%，从 88 变为 51。',
      tags: ['meaningful_change', 'orders', 'down'],
    },
    lifecycle: 'partial',
    createdAt: now, updatedAt: now,
    observations: [], evidenceIds: [], signalIds: [],
    agentActivities: [], humanInterventions: interventions, actions: [], outcomes: [],
    summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: ['operator_1'], totalEvidence: 0, totalSignals: 0 },
    investigation: {
      situationId: id, stopReason: 'judgment', status: 'completed',
      judgment: '订单下降需重点关注；建议先排查主推 SKU 库存。',
      currentUnderstanding: '订单下降需重点关注。',
      recommendation: { recommendation: '先排查主推 SKU 库存与客服 24h 响应率。' },
      updatedAt: now,
    },
  };
  db.prepare(
    `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(ctx.contextId, id, ctx.lifecycle, now, now, JSON.stringify(ctx));
}

function seedFailedRecoverDemo(db: ReturnType<typeof openDb>, now: string): void {
  const id = 'sit_failed_recover_demo';
  db.prepare(
    `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
       observed_at, description, tags, lifecycle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, 'ecommerce', 'ranking_attention',
    '10122145469026', 'product', '祁门红茶 · 经典 250g 礼盒', 'jd',
    '2026-08-22T11:00:00.000Z',
    '祁门红茶 · 经典 250g 礼盒 近期经营表现相对突出，进入持续观察名单 — 待 Agent 调查后给出判断。',
    JSON.stringify(['ranking_attention', 'product', 'leader']), 'open', now, now,
  );
  const priorInvestigation = {
    situationId: id, stopReason: 'observe', status: 'completed',
    currentUnderstanding: '该商品近期表现值得关注；新品冷启动后需要确认转化率是否健康。',
    judgment: '值得持续观察 — UV<500 不能单独判噪声，需要看后续趋势。',
    recommendation: { recommendation: '继续观察 1-2 天再判断。', rationale: '小样本需更多数据。' },
    updatedAt: '2026-08-22T11:30:00.000Z',
  };
  const failedInvestigation = {
    ...priorInvestigation,
    status: 'failed' as const,
    error: 'Turn timed out',
    updatedAt: '2026-08-22T12:00:00.000Z',
  };
  const ctx = {
    contextId: 'ctx_' + id,
    situation: {
      situationId: id, domain: 'ecommerce', type: 'ranking_attention',
      entity: { id: '10122145469026', type: 'product', name: '祁门红茶 · 经典 250g 礼盒', platform: 'jd' },
      temporal: { observedAt: '2026-08-22T11:00:00.000Z' },
      description: '祁门红茶 · 经典 250g 礼盒 近期经营表现相对突出，进入持续观察名单 — 待 Agent 调查后给出判断。',
      tags: ['ranking_attention', 'product', 'leader'],
    },
    lifecycle: 'open',
    createdAt: now, updatedAt: '2026-08-22T12:00:00.000Z',
    observations: [], evidenceIds: [], signalIds: [],
    agentActivities: [], humanInterventions: [], actions: [], outcomes: [],
    summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [], totalEvidence: 0, totalSignals: 0 },
    investigation: failedInvestigation,
  };
  db.prepare(
    `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(ctx.contextId, id, ctx.lifecycle, now, ctx.updatedAt, JSON.stringify(ctx));
}

function seedWaitingHumanDemo(db: ReturnType<typeof openDb>, now: string): void {
  const id = 'sit_waiting_human_demo';
  db.prepare(
    `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
       observed_at, window_start, window_end, description, tags, lifecycle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, 'ecommerce', 'anomaly_investigation',
    'jd_shop_001', 'shop', '祁门红茶旗舰店', 'jd',
    '2026-08-22T13:00:00.000Z', '2026-08-20', '2026-08-22',
    '祁门红茶旗舰店 客服 24h 响应率 较 7 日均值下降 41.2%，需要人工核验客服排班是否变动。',
    JSON.stringify(['anomaly_investigation', 'service', 'response_rate']), 'open', now, now,
  );
  const ctx = {
    contextId: 'ctx_' + id,
    situation: {
      situationId: id, domain: 'ecommerce', type: 'anomaly_investigation',
      entity: { id: 'jd_shop_001', type: 'shop', name: '祁门红茶旗舰店', platform: 'jd' },
      temporal: { observedAt: '2026-08-22T13:00:00.000Z' },
      description: '祁门红茶旗舰店 客服 24h 响应率 较 7 日均值下降 41.2%，需要人工核验客服排班是否变动。',
      tags: ['anomaly_investigation', 'service', 'response_rate'],
    },
    lifecycle: 'open',
    createdAt: now, updatedAt: now,
    observations: [], evidenceIds: [], signalIds: [],
    agentActivities: [], humanInterventions: [], actions: [], outcomes: [],
    summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [], totalEvidence: 0, totalSignals: 0 },
    investigation: {
      situationId: id,
      stopReason: 'ask_human',
      status: 'completed',
      judgment: '需要人工核验客服排班是否近期有变动（Fabric 暂无法获取此数据）。',
      currentUnderstanding: '客服 24h 响应率显著下降，但当前 Fabric 没有客服排班数据源。',
      recommendation: { recommendation: '请运营核对近 3 天客服排班表，确认是否有人员调整。' },
      updatedAt: now,
    },
  };
  db.prepare(
    `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(ctx.contextId, id, ctx.lifecycle, now, now, JSON.stringify(ctx));
}

function seedOutputForHumanDemo(db: ReturnType<typeof openDb>, now: string): void {
  const id = 'sit_human_demo';
  const row = db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get(id) as { body: string } | undefined;
  if (!row) return;
  const ctx = JSON.parse(row.body);
  if (!Array.isArray(ctx.outputs)) ctx.outputs = [];
  if (ctx.outputs.length === 0) {
    ctx.outputs.push(
      {
        outputId: 'out_demo_recommendation_h1',
        situationId: id,
        type: 'recommendation',
        status: 'ready',
        resultRef: { kind: 'learning_context', ref: 'ctx_' + id },
        content: '先排查主推 SKU 库存与客服 24h 响应率再判断是否干预。',
        createdAt: now,
      },
      {
        outputId: 'out_demo_analysis_h1',
        situationId: id,
        type: 'analysis',
        status: 'delivered',
        resultRef: { kind: 'learning_context', ref: 'ctx_' + id },
        content: '8月15日大促结束后订单异常已持续 7 天。',
        createdAt: now,
      },
      {
        outputId: 'out_demo_workitem_h1',
        situationId: id,
        type: 'work_item',
        status: 'acknowledged',
        resultRef: { kind: 'none' },
        content: '运营需在 24h 内确认主推 SKU 是否断货。',
        createdAt: now,
        acknowledgedAt: now,
      },
    );
    db.prepare('UPDATE learning_contexts SET body = ?, updated_at = ? WHERE situation_id = ?').run(
      JSON.stringify(ctx), now, id,
    );
  }
}

describe('P0010.1 Demo 4 Situations — seed (idempotent insert)', () => {
  let db: ReturnType<typeof openDb>;

  beforeAll(() => {
    rmSync(TEMP_DB, { force: true });
    db = openDb(TEMP_DB);
    initDatabase(db);
  });

  afterAll(() => {
    db.close();
    rmSync(TEMP_DB, { force: true });
    rmSync(`${TEMP_DB}-wal`, { force: true });
    rmSync(`${TEMP_DB}-shm`, { force: true });
  });

  beforeEach(() => {
    rmSync(TEMP_DB, { force: true });
    db.close();
    db = openDb(TEMP_DB);
    initDatabase(db);
    const now = '2026-08-22T08:00:00.000Z';
    seedObserveDemo(db, now);
    seedHumanDemo(db, now);
    seedFailedRecoverDemo(db, now);
    seedWaitingHumanDemo(db, now);
    seedOutputForHumanDemo(db, now);
  });

  test('all 4 demo situations are present with the right types', () => {
    const rows = db.prepare(
      'SELECT situation_id, type FROM situations WHERE situation_id IN (?, ?, ?, ?)',
    ).all(
      'sit_observe_demo', 'sit_human_demo', 'sit_failed_recover_demo', 'sit_waiting_human_demo',
    ) as Array<{ situation_id: string; type: string }>;
    expect(rows).toHaveLength(4);
    for (const expected of EXPECTED_SITUATIONS) {
      const row = rows.find((r) => r.situation_id === expected.id);
      expect(row, `missing ${expected.id}`).toBeDefined();
      expect(row?.type).toBe(expected.type);
    }
  });

  test('sit_human_demo has 3 human interventions of the right types', () => {
    const interventions = db.prepare(
      'SELECT intervention_id, type, summary FROM human_interventions WHERE situation_id = ? ORDER BY intervention_id',
    ).all('sit_human_demo') as Array<{ intervention_id: string; type: string; summary: string }>;
    expect(interventions).toHaveLength(3);
    expect(interventions.map((i) => i.type)).toEqual(['correction', 'context_supplement', 'decision']);
    for (const i of interventions) {
      expect(i.summary.length).toBeGreaterThan(0);
    }
  });

  test('sit_failed_recover_demo has failed status BUT prior valid cognition preserved', () => {
    const row = db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_failed_recover_demo') as { body: string } | undefined;
    expect(row).toBeDefined();
    const ctx = JSON.parse(row!.body);
    expect(ctx.investigation.status).toBe('failed');
    expect(ctx.investigation.error).toBe('Turn timed out');
    expect(ctx.investigation.judgment).toContain('值得持续观察');
    expect(ctx.investigation.currentUnderstanding).toContain('新品冷启动');
    expect(ctx.investigation.recommendation.recommendation).toContain('继续观察');
  });

  test('sit_waiting_human_demo has stopReason=ask_human (the 4th lifecycle state)', () => {
    const row = db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_waiting_human_demo') as { body: string } | undefined;
    expect(row).toBeDefined();
    const ctx = JSON.parse(row!.body);
    expect(ctx.investigation.stopReason).toBe('ask_human');
    expect(ctx.investigation.status).toBe('completed');
  });

  test('P0010.1 REPAIR: deriveSituationLifecycle on each demo matches the user-named state', () => {
    // CASE A — sit_observe_demo: stopReason=observe → 持续观察
    const ctxA = JSON.parse((db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_observe_demo') as { body: string }).body);
    expect(deriveSituationLifecycle(ctxA.investigation, 0, false)).toBe('watching');

    // CASE B — sit_failed_recover_demo: failed + prior judgment → 持续观察
    const ctxB = JSON.parse((db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_failed_recover_demo') as { body: string }).body);
    expect(deriveSituationLifecycle(ctxB.investigation, 0, false)).toBe('watching');

    // CASE C — sit_waiting_human_demo: stopReason=ask_human → 等待人工
    const ctxC = JSON.parse((db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_waiting_human_demo') as { body: string }).body);
    expect(deriveSituationLifecycle(ctxC.investigation, 0, false)).toBe('waiting_human');

    // sit_human_demo: completed + decision=reject → 持续观察 (NOT 已处理 / closed)
    const ctxH = JSON.parse((db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_human_demo') as { body: string }).body);
    expect(deriveSituationLifecycle(ctxH.investigation, 3, false)).toBe('watching');
  });

  test('P0010.1 REPAIR-2: sit_human_demo has 3 Outputs/WorkItems (ready/delivered/acknowledged) in body.outputs[]', () => {
    const row = db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_human_demo') as { body: string } | undefined;
    expect(row).toBeDefined();
    const ctx = JSON.parse(row!.body);
    expect(Array.isArray(ctx.outputs)).toBe(true);
    expect(ctx.outputs).toHaveLength(3);
    const byId = Object.fromEntries(ctx.outputs.map((o: { outputId: string }) => [o.outputId, o]));
    // The "recommendation" Output is the primary one — first-class region.
    expect((byId['out_demo_recommendation_h1'] as any).type).toBe('recommendation');
    expect((byId['out_demo_recommendation_h1'] as any).status).toBe('ready');
    expect((byId['out_demo_recommendation_h1'] as any).resultRef.kind).toBe('learning_context');
    // "analysis" is in 'delivered' state.
    expect((byId['out_demo_analysis_h1'] as any).status).toBe('delivered');
    // "work_item" has no real resultRef — UI must NOT show "查看结果" for it.
    expect((byId['out_demo_workitem_h1'] as any).resultRef.kind).toBe('none');
  });

  test('P0010.1 REPAIR-2: no-Output situations do NOT have an outputs[] entry (no fake data)', () => {
    // The 3 other demos (observe / failed_recover / waiting_human) should
    // not have a non-empty outputs[] — the UI must NOT show a giant empty
    // card, and it must NOT show fake Outputs.
    const ids = ['sit_observe_demo', 'sit_failed_recover_demo', 'sit_waiting_human_demo'];
    for (const id of ids) {
      const row = db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get(id) as { body: string } | undefined;
      if (!row) continue;
      const ctx = JSON.parse(row.body);
      const outputs = Array.isArray(ctx.outputs) ? ctx.outputs : [];
      expect(outputs, `${id} should not have seeded Outputs`).toHaveLength(0);
    }
  });

  test('REPAIR invariant: no demo situation maps to "已处理" state', () => {
    const cases = [
      { id: 'sit_observe_demo', inv: { stopReason: 'observe', status: 'completed' }, interventions: 0, hasAccepted: false },
      { id: 'sit_human_demo', inv: { stopReason: 'judgment', status: 'completed' }, interventions: 3, hasAccepted: false },
      { id: 'sit_failed_recover_demo', inv: { stopReason: 'observe', status: 'failed', judgment: 'x' }, interventions: 0, hasAccepted: false },
      { id: 'sit_waiting_human_demo', inv: { stopReason: 'ask_human', status: 'completed' }, interventions: 0, hasAccepted: false },
    ];
    for (const c of cases) {
      const lc = deriveSituationLifecycle(c.inv, c.interventions, c.hasAccepted);
      expect(lc, `${c.id} mapped to ${lc}`).not.toBe('processed');
    }
  });

  test('RE-REVIEW invariant: no demo situation maps to "closed" — even with decision=accept (no durable resolution contract)', () => {
    // RE-REVIEW fix: human accept on a recommendation is NOT a Situation
    // resolution event. The 4 demos cover the full investigation shape we
    // have today; even with hasAccepted=true, none should resolve to 'closed'.
    const cases = [
      { id: 'sit_observe_demo', inv: { stopReason: 'observe', status: 'completed' }, hasAccepted: true },
      { id: 'sit_human_demo', inv: { stopReason: 'judgment', status: 'completed' }, hasAccepted: true },
      { id: 'sit_failed_recover_demo', inv: { stopReason: 'observe', status: 'failed', judgment: 'x' }, hasAccepted: true },
      { id: 'sit_waiting_human_demo', inv: { stopReason: 'ask_human', status: 'completed' }, hasAccepted: true },
    ];
    for (const c of cases) {
      const lc = deriveSituationLifecycle(c.inv, 1, c.hasAccepted);
      expect(lc, `${c.id} with hasAccepted=${c.hasAccepted} mapped to ${lc}`).not.toBe('closed');
    }
  });

  test('RE-REVIEW invariant: real demo data — sit_observe_demo + hypothetical accept still watching', () => {
    // Re-derive the real seed data for sit_observe_demo, then assert that
    // even if the human "accepts" the "继续观察 24-48 小时" recommendation,
    // the Situation remains 'watching' (the observation window is the
    // ObservationCommitment, not a Situation-closing event).
    const ctx = JSON.parse((db.prepare('SELECT body FROM learning_contexts WHERE situation_id = ?').get('sit_observe_demo') as { body: string }).body);
    const lcWithAccept = deriveSituationLifecycle(ctx.investigation, 1, true);
    const lcWithoutAccept = deriveSituationLifecycle(ctx.investigation, 0, false);
    expect(lcWithAccept).toBe('watching');
    expect(lcWithoutAccept).toBe('watching');
    expect(lcWithAccept).toBe(lcWithoutAccept); // accept has no effect on lifecycle
  });
});

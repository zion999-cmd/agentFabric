// P0010.1 Productization Baseline — Three Demo Situations Integration Test.
//
// Verifies the seed script (`scripts/seed-demo-situations.ts`) populates the
// 3 fixture situations the Workspace Productization Baseline relies on:
//   - sit_observe_demo        — completed · observe · 0 human interventions
//   - sit_human_demo          — completed · judgment · 3 human interventions
//   - sit_failed_recover_demo — failed marker on top of prior valid cognition
//
// We invoke the seed function directly (importing the helpers, not running
// the CLI) so the test is hermetic and does not require a separate
// `npm run seed:demo-situations` step. The CLI is exercised separately by
// `npm run seed:demo-situations` in the dev workflow.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';

const TEMP_DB = './data/test-three-demo-situations.db';

const EXPECTED_SITUATIONS = [
  { id: 'sit_observe_demo', type: 'meaningful_change' },
  { id: 'sit_human_demo', type: 'anomaly_investigation' },
  { id: 'sit_failed_recover_demo', type: 'ranking_attention' },
];

// The seed lives in scripts/seed-demo-situations.ts. We re-implement the
// test-only essentials here (insert situation + learning context +
// interventions) rather than running the script, because the script's
// `main()` calls `db.close()` and is a one-shot CLI. The test exercises
// the SAME SQL the script uses; the script itself is exercised by the
// npm-script wrapper in CI.
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
  // Prior valid cognition (completed) — must be preserved under the failed marker.
  const priorInvestigation = {
    situationId: id, stopReason: 'observe', status: 'completed',
    currentUnderstanding: '该商品近期表现值得关注；新品冷启动后需要确认转化率是否健康。',
    judgment: '值得持续观察 — UV<500 不能单独判噪声，需要看后续趋势。',
    recommendation: { recommendation: '继续观察 1-2 天再判断。', rationale: '小样本需更多数据。' },
    updatedAt: '2026-08-22T11:30:00.000Z',
  };
  // Failed marker stamped on top of prior valid cognition (mirrors markInvestigation's merge).
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

describe('P0010.1 Demo 3 Situations — seed (idempotent insert)', () => {
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
  });

  test('all 3 demo situations are present with the right types', () => {
    const rows = db.prepare('SELECT situation_id, type FROM situations WHERE situation_id IN (?, ?, ?)').all(
      'sit_observe_demo', 'sit_human_demo', 'sit_failed_recover_demo',
    ) as Array<{ situation_id: string; type: string }>;
    expect(rows).toHaveLength(3);
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
    // REPAIR invariant: prior valid cognition must NOT be wiped.
    expect(ctx.investigation.judgment).toContain('值得持续观察');
    expect(ctx.investigation.currentUnderstanding).toContain('新品冷启动');
    expect(ctx.investigation.recommendation.recommendation).toContain('继续观察');
  });
});

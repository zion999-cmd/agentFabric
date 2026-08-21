// P0010.1 REPAIR — Investigation lifecycle: a failed or in-flight marker
// must NOT erase a previously completed understanding / judgment /
// recommendation. The marker represents the latest attempt's state, not the
// situation's current valid cognition. We do NOT build an attempt history —
// the persisted investigation keeps ONE valid set of fields, and the latest
// lifecycle marker is stamped on top.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { rmSync } from 'node:fs';
import { openDb } from '#platform/storage/connection.js';
import { initDatabase } from '#platform/storage/init.js';
import { markInvestigation } from '#platform/server/routes/situation-chat.js';
import {
  loadInvestigationFromLearningContext,
  storeInvestigationInLearningContext,
} from '#app/experience/learning-context-producer.js';
import { InvestigationSchema } from '#shared/schemas/investigation.js';
import type { Situation } from '#shared/schemas/learning-context.js';

const TEMP_DB = './data/test-investigation-lifecycle.db';

const baseSituation: Situation = {
  situationId: 'sit_lifecycle',
  domain: 'ecommerce',
  type: 'anomaly_investigation',
  entity: { id: 'jd_shop_001', type: 'product', name: '祁门红茶旗舰店', platform: 'jd' },
  temporal: { observedAt: '2026-08-22T00:00:00.000Z' },
  description: 'lifecycle regression test fixture',
  tags: ['gmv'],
};

const completedInvestigation = (): ReturnType<typeof InvestigationSchema.parse> =>
  InvestigationSchema.parse({
    situationId: baseSituation.situationId,
    currentUnderstanding: '产品 10122145469026 被标记进入关注集合。',
    knownEvidence: ['GMV=3886.9', 'UV=356', 'CVR=6.46%'],
    hypotheses: [
      { statement: '真实业务机会', status: 'proposed' },
      { statement: '统计噪声', status: 'rejected' },
    ],
    judgment: '值得持续观察 — UV<500 不能单独判噪声，需要看后续趋势。',
    stopReason: 'observe',
    capabilityUsed: 'product.overview',
    evidenceAcquired: ['trade.overview 2026-08-21'],
    recommendation: {
      recommendation: '继续观察 1-2 天再判断。',
      rationale: '小样本需更多数据。',
      risks: '若真为机会，延迟观察可能损失窗口期。',
      humanNeeded: '运营确认是否新品冷启动。',
    },
    status: 'completed',
    updatedAt: '2026-08-22T01:00:00.000Z',
  });

describe('markInvestigation — lifecycle REPAIR (P0010.1)', () => {
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
    // Insert a real situation row (FK from learning_contexts.situation_id).
    db.prepare(
      `INSERT INTO situations (situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
         observed_at, window_start, window_end, description, tags, lifecycle, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      baseSituation.situationId, baseSituation.domain, baseSituation.type,
      baseSituation.entity.id, baseSituation.entity.type, baseSituation.entity.name, baseSituation.entity.platform,
      baseSituation.temporal.observedAt, null, null,
      baseSituation.description, JSON.stringify(baseSituation.tags ?? []), 'open',
      '2026-08-22T00:00:00.000Z', '2026-08-22T00:00:00.000Z',
    );
  });

  test('failed marker preserves prior completed currentUnderstanding / judgment / recommendation', () => {
    // Arrange — store a completed investigation.
    const completed = completedInvestigation();
    storeInvestigationInLearningContext(db, baseSituation, completed);
    const before = loadInvestigationFromLearningContext(db, baseSituation.situationId);
    expect(before?.status).toBe('completed');
    expect(before?.judgment).toContain('UV<500 不能单独判噪声');
    expect(before?.recommendation?.recommendation).toContain('继续观察');

    // Act — the latest attempt times out / fails to parse.
    markInvestigation(db, baseSituation, { status: 'failed', error: 'Turn timed out' });
    const after = loadInvestigationFromLearningContext(db, baseSituation.situationId);

    // Assert — the prior valid cognition is preserved verbatim.
    expect(after?.status).toBe('failed');
    expect(after?.error).toBe('Turn timed out');
    expect(after?.currentUnderstanding).toBe(completed.currentUnderstanding);
    expect(after?.judgment).toBe(completed.judgment);
    expect(after?.stopReason).toBe(completed.stopReason);
    expect(after?.capabilityUsed).toBe(completed.capabilityUsed);
    expect(after?.evidenceAcquired).toEqual(completed.evidenceAcquired);
    expect(after?.hypotheses).toEqual(completed.hypotheses);
    expect(after?.recommendation).toEqual(completed.recommendation);
  });

  test('investigating marker preserves prior completed judgment (in-flight turn)', () => {
    const completed = completedInvestigation();
    storeInvestigationInLearningContext(db, baseSituation, completed);

    markInvestigation(db, baseSituation, { status: 'investigating' });
    const after = loadInvestigationFromLearningContext(db, baseSituation.situationId);

    expect(after?.status).toBe('investigating');
    expect(after?.currentUnderstanding).toBe(completed.currentUnderstanding);
    expect(after?.judgment).toBe(completed.judgment);
    expect(after?.recommendation?.recommendation).toContain('继续观察');
  });

  test('failed marker after a prior failed marker does NOT preserve (no valid cognition to keep)', () => {
    // First failure: nothing to preserve (no prior valid cognition).
    markInvestigation(db, baseSituation, { status: 'failed', error: 'first failure' });
    const first = loadInvestigationFromLearningContext(db, baseSituation.situationId);
    expect(first?.status).toBe('failed');
    expect(first?.judgment).toBe(''); // defaults — no prior content

    // Second failure: still no valid cognition to preserve.
    markInvestigation(db, baseSituation, { status: 'failed', error: 'second failure' });
    const second = loadInvestigationFromLearningContext(db, baseSituation.situationId);
    expect(second?.status).toBe('failed');
    expect(second?.error).toBe('second failure');
    expect(second?.judgment).toBe('');
  });

  test('a new completed investigation DOES replace the prior one (full-replace is still allowed)', () => {
    // Arrange — completed v1.
    const v1 = completedInvestigation();
    storeInvestigationInLearningContext(db, baseSituation, v1);

    // Act — completed v2 (the "completed" branch goes through
    // storeInvestigationInLearningContext, NOT markInvestigation, but we
    // verify the full-replace is the right behavior here).
    const v2 = InvestigationSchema.parse({
      ...v1,
      currentUnderstanding: 'v2 — Operator-supplied context overrides the noise framing.',
      judgment: 'v2 — New product cold-start; do not treat UV<500 as noise.',
      recommendation: {
        recommendation: 'Acquire 2026-08-15 → 2026-08-21 product-level metrics.',
        rationale: 'Operator guidance: new product on 2026-08-15.',
        risks: '',
        humanNeeded: '',
      },
      status: 'completed',
    });
    storeInvestigationInLearningContext(db, baseSituation, v2);

    const after = loadInvestigationFromLearningContext(db, baseSituation.situationId);
    expect(after?.status).toBe('completed');
    expect(after?.currentUnderstanding).toBe(v2.currentUnderstanding);
    expect(after?.judgment).toBe(v2.judgment);
    expect(after?.recommendation?.recommendation).toBe(v2.recommendation?.recommendation);
  });
});

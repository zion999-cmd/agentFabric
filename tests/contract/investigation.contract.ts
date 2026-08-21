// P0010 — Investigation Contract tests: schema, parser, prompt.
// Verifies the business artifacts are validatable and that the prompt carries
// situation DATA (not rules) and drives evidence acquisition.

import { describe, expect, test } from 'vitest';
import { InvestigationSchema, RecommendationSchema } from '#shared/schemas/investigation.js';
import type { Investigation } from '#shared/schemas/investigation.js';
import { LearningContextSchema } from '#shared/schemas/learning-context.js';
import type { Situation } from '#shared/schemas/learning-context.js';
import { buildInvestigationPrompt } from '#app/runtime/investigation/prompt.js';
import { parseInvestigation, extractJsonObject } from '#app/runtime/investigation/parse.js';

const validInvestigation = (): Investigation => ({
  situationId: 'sit_abc',
  currentUnderstanding: 'GMV decline confirmed.',
  knownEvidence: ['GMV -24%', 'UV -27%'],
  hypotheses: [{ statement: 'Traffic-side anomaly drives GMV decline', status: 'proposed' }],
  unknowns: ['Which channel caused the UV drop?'],
  nextQuestion: 'Which traffic channel caused the UV drop?',
  requiredEvidence: ['traffic source breakdown'],
  investigationRequest: 'Acquire traffic.overview',
  findings: [
    {
      question: 'Which channel?',
      evidenceRefs: ['ev_1'],
      answer: 'Natural search -38%',
      impactOnHypothesis: 'H1 supported',
    },
  ],
  judgment: 'Decline concentrated in natural search.',
  stopReason: 'judgment',
  capabilityUsed: 'traffic.overview',
  evidenceAcquired: ['ev_1'],
});

describe('InvestigationSchema', () => {
  test('accepts a complete investigation', () => {
    expect(InvestigationSchema.safeParse(validInvestigation()).success).toBe(true);
  });

  test('hypothesis status enum', () => {
    for (const s of ['proposed', 'supported', 'weakened', 'rejected'] as const) {
      expect(InvestigationSchema.safeParse({ ...validInvestigation(), hypotheses: [{ statement: 'x', status: s }] }).success).toBe(true);
    }
    expect(InvestigationSchema.safeParse({ ...validInvestigation(), hypotheses: [{ statement: 'x', status: 'bogus' }] }).success).toBe(false);
  });

  test('stop reason enum', () => {
    for (const s of ['judgment', 'observe', 'missing_capability', 'ask_human'] as const) {
      expect(InvestigationSchema.safeParse({ ...validInvestigation(), stopReason: s }).success).toBe(true);
    }
    expect(InvestigationSchema.safeParse({ ...validInvestigation(), stopReason: 'investigate' }).success).toBe(false);
  });

  test('requires situationId', () => {
    expect(InvestigationSchema.safeParse({ ...validInvestigation(), situationId: '' }).success).toBe(false);
  });

  test('defaults optional fields', () => {
    const minimal = InvestigationSchema.parse({ situationId: 'sit_x' });
    expect(minimal.knownEvidence).toEqual([]);
    expect(minimal.hypotheses).toEqual([]);
    expect(minimal.findings).toEqual([]);
  });

  test('RecommendationSchema normalizes string-or-list risk/human fields', () => {
    const rec = RecommendationSchema.parse({
      recommendation: '先人工核验，不干预',
      rationale: 'judgment 依据',
      risks: ['风险A', '风险B'], // model may emit a list
      humanNeeded: '财务确认优惠券到期', // or a single string
    });
    expect(rec.risks).toEqual(['风险A', '风险B']);
    expect(rec.humanNeeded).toEqual(['财务确认优惠券到期']);
    expect(rec.prerequisites).toEqual([]);
  });

  test('RecommendationSchema rejects missing recommendation', () => {
    expect(RecommendationSchema.safeParse({ rationale: 'x' }).success).toBe(false);
  });

  test('LearningContextSchema carries an optional investigation additively', () => {
    const ctx = {
      contextId: 'c1',
      situation: {
        situationId: 'sit_abc',
        domain: 'ecommerce',
        type: 'anomaly_investigation',
        entity: { id: 'shop', type: 'product' },
        temporal: { observedAt: '2026-08-16T00:00:00.000Z' },
        description: 'GMV down',
        tags: [],
      },
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
      investigation: validInvestigation(),
    };
    const parsed = LearningContextSchema.parse(ctx);
    expect(parsed.investigation?.nextQuestion).toBe('Which traffic channel caused the UV drop?');
  });
});

describe('parseInvestigation', () => {
  test('extracts the JSON object from prose-wrapped text', () => {
    const reply = `I investigated. Here is the contract:\n${JSON.stringify(validInvestigation(), null, 2)}\nHope this helps.`;
    const result = parseInvestigation(reply, 'sit_abc');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.investigation.nextQuestion).toBe('Which traffic channel caused the UV drop?');
      expect(result.investigation.stopReason).toBe('judgment');
    }
  });

  test('forces the situationId from the caller (untrusted reply)', () => {
    const reply = JSON.stringify({ ...validInvestigation(), situationId: 'evil_id' });
    const result = parseInvestigation(reply, 'sit_abc');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.investigation.situationId).toBe('sit_abc');
  });

  test('fails when no JSON object present', () => {
    const result = parseInvestigation('no structured output', 'sit_abc');
    expect(result.ok).toBe(false);
  });

  test('fails on invalid shape', () => {
    const result = parseInvestigation(JSON.stringify({ situationId: 'sit_abc', hypotheses: [{ statement: 5 }] }), 'sit_abc');
    expect(result.ok).toBe(false);
  });

  test('extractJsonObject handles nested braces', () => {
    const text = 'prefix ' + JSON.stringify({ a: { b: [1, 2] } }) + ' suffix';
    const obj = extractJsonObject(text);
    expect(obj).not.toBeNull();
    expect(JSON.parse(obj!)).toEqual({ a: { b: [1, 2] } });
  });
});

describe('buildInvestigationPrompt', () => {
  const situation: Situation = {
    situationId: 'sit_abc',
    domain: 'ecommerce',
    type: 'anomaly_investigation',
    entity: { id: 'jd_shop_001', type: 'product', name: '祁门红茶旗舰店', platform: 'jd' },
    temporal: { observedAt: '2026-08-16T00:00:00.000Z' },
    description: '成交金额 较昨日下降 67.9%，从 ¥3384.26 变为 ¥1087.13。',
    tags: ['gmv', 'down'],
  };

  test('carries the situation as data', () => {
    const prompt = buildInvestigationPrompt(situation, null);
    expect(prompt).toContain('sit_abc');
    expect(prompt).toContain('成交金额 较昨日下降 67.9%');
    expect(prompt).toContain('祁门红茶旗舰店');
  });

  test('directs the Agent to read knowledge/INDEX.md + pages (no SOP copy)', () => {
    const prompt = buildInvestigationPrompt(situation, null);
    expect(prompt).toContain('knowledge/INDEX.md');
    // No business rules are embedded — the prompt must not contain the GMV->UV->traffic mapping.
    expect(prompt.toLowerCase()).not.toMatch(/gmv.*→.*uv/i);
  });

  test('instructs evidence acquisition via fabric_execute_capability and honest stop', () => {
    const prompt = buildInvestigationPrompt(situation, null);
    expect(prompt).toContain('fabric_execute_capability');
    expect(prompt).toContain('fabric_list_capabilities');
    expect(prompt).toContain('missing_capability');
    expect(prompt.toLowerCase()).toContain('must actually call fabric_execute_capability');
  });

  test('no hardcoded investigation tree / if-else business logic', () => {
    const prompt = buildInvestigationPrompt(situation, null);
    expect(prompt).not.toContain('if (');
    expect(prompt).not.toContain('GMV down →');
  });
});

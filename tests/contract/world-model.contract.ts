// P0008.2 — World Model Contract tests.
// Stress-test the contract against the 8 scenarios from Contract Review.
// Uses a minimal JD fixture built from REAL discovery facts (not fabricated).

import { describe, it, expect } from 'vitest';
import {
  WorldObjectSchema,
  WorldAssertionSchema,
  CapabilityBindingSchema,
  WorldModelSchema,
  EPISTEMIC_ORDER,
  upgradeAssertion,
  supersedeAssertion,
  isVerified,
  isLearnableKnowledge,
  isActiveKnowledge,
} from '#shared/schemas/world-model.js';
import type { WorldModel, WorldObject, WorldAssertion } from '#shared/schemas/world-model.js';

// ---- Minimal JD fixture (real facts from discovery/ + WorldExplorationTask/) ----

const jdObjects: WorldObject[] = [
  { id: 'jd_shangzhi', type: 'system', name: '京东商智' },
  { id: 'jd_surface_trade_summary', type: 'surface', name: '交易概况', attributes: { url: '/szweb/view/tradeAnalysis/tradeSummary.html' } },
  { id: 'jd_surface_flow_summary', type: 'surface', name: '流量', attributes: { url: '/szweb/view/flow/flow-summary.html' } },
  { id: 'jd_metric_gmv', type: 'metric', name: '成交金额', attributes: { unit: '元' } },
  { id: 'jd_metric_orders', type: 'metric', name: '成交单量', attributes: { unit: '笔' } },
  { id: 'jd_metric_aov', type: 'metric', name: '客单价', attributes: { formula: '成交金额/成交客户数' } },
  { id: 'jd_dimension_time', type: 'dimension', name: '时间', attributes: { values: ['实时', '昨天', '近7天', '近30天', '天', '周', '月'] } },
  { id: 'jd_feature_realtime_ranking', type: 'feature', name: '实时榜单' },
  { id: 'jd_constraint_data_freshness', type: 'constraint', name: '数据新鲜度', attributes: { description: '实时数据延迟约1分钟，日报14:00前更新' } },
];

const jdAssertions: WorldAssertion[] = [
  // System → Surface (verified — three asset groups cross-validate)
  { id: 'a1', subjectId: 'jd_shangzhi', predicate: 'has_surface', objectRef: 'jd_surface_trade_summary', objectIsRef: true, epistemicStatus: 'verified', evidenceRefs: ['ev_page_trade_summary'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-guided-discovery' },
  // Surface → Metric (verified)
  { id: 'a2', subjectId: 'jd_surface_trade_summary', predicate: 'exposes_metric', objectRef: 'jd_metric_gmv', objectIsRef: true, epistemicStatus: 'verified', evidenceRefs: ['ev_page_trade_summary'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-guided-discovery' },
  // REAL gateway (verified — from actual CDP capture)
  { id: 'a3', subjectId: 'jd_metric_gmv', predicate: 'observable_by', objectRef: 'szgateway.jd.com/api/lowcode/indexSummary/summary.ajax', objectIsRef: false, epistemicStatus: 'verified', evidenceRefs: ['ev_summary_response'], discoveredAt: '2026-08-13T00:00:00Z', source: 'cdp-capture' },
  // Hermes's WRONG guess (suspected — Hermes guessed /szweb/api/*, actually szgateway.jd.com)
  { id: 'a4', subjectId: 'jd_metric_gmv', predicate: 'observable_by', objectRef: '/szweb/api/trade/summary', objectIsRef: false, epistemicStatus: 'suspected', evidenceRefs: [], discoveredAt: '2026-08-13T00:00:00Z', source: 'hermes-zero-shot' },
  // Metric → Dimension (verified)
  { id: 'a5', subjectId: 'jd_metric_gmv', predicate: 'supports_dimension', objectRef: 'jd_dimension_time', objectIsRef: true, epistemicStatus: 'verified', evidenceRefs: ['ev_page_trade_summary'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-guided-discovery' },
  // Surface → Feature (observed)
  { id: 'a6', subjectId: 'jd_surface_trade_summary', predicate: 'accessible_via', objectRef: 'jd_feature_realtime_ranking', objectIsRef: true, epistemicStatus: 'observed', evidenceRefs: ['ev_feature_catalog'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-features' },
].map((a) => WorldAssertionSchema.parse(a));

const jdBindings = [
  { id: 'b1', worldObjectId: 'jd_metric_gmv', capabilityId: 'trade.overview', relationship: 'observable_by' as const, epistemicStatus: 'observed' as const },
];

const buildJdModel = (): WorldModel => ({
  systemId: 'jd_shangzhi',
  objects: jdObjects,
  assertions: jdAssertions,
  bindings: jdBindings,
});

// ---- Tests ----

describe('WorldObject', () => {
  it('accepts all 6 object types', () => {
    for (const obj of jdObjects) {
      expect(() => WorldObjectSchema.parse(obj)).not.toThrow();
    }
  });

  it('rejects unknown object type', () => {
    const bad = { id: 'x', type: 'entity', name: 'Product' }; // Entity is deliberately NOT a primitive
    expect(() => WorldObjectSchema.parse(bad)).toThrow();
  });
});

describe('Scenario A — assertion lifecycle suspected → observed → verified', () => {
  it('upgrades monotonically', () => {
    const suspected = jdAssertions.find((a) => a.id === 'a4')!; // Hermes's wrong guess
    expect(suspected.epistemicStatus).toBe('suspected');

    const observed = upgradeAssertion(suspected, 'observed', ['ev_network_capture']);
    expect(observed.epistemicStatus).toBe('observed');
    expect(observed.evidenceRefs).toContain('ev_network_capture');

    const verified = upgradeAssertion(observed, 'verified', ['ev_api_schema']);
    expect(verified.epistemicStatus).toBe('verified');
  });

  it('rejects backward downgrade', () => {
    const verified = jdAssertions.find((a) => a.id === 'a1')!;
    expect(() => upgradeAssertion(verified, 'suspected')).toThrow(/Cannot downgrade/);
  });

  it('is immutable — original assertion unchanged', () => {
    const original = jdAssertions.find((a) => a.id === 'a4')!;
    const upgraded = upgradeAssertion(original, 'observed');
    expect(original.epistemicStatus).toBe('suspected'); // original untouched
    expect(upgraded.epistemicStatus).toBe('observed');
  });
});

describe('Scenario B — Hermes wrong API guess (suspected ≠ verified knowledge)', () => {
  it('suspected assertion exists', () => {
    const wrong = jdAssertions.find((a) => a.id === 'a4')!;
    expect(wrong.objectRef).toBe('/szweb/api/trade/summary'); // Hermes's wrong path
    expect(wrong.epistemicStatus).toBe('suspected');
  });

  it('suspected assertion is NOT learnable knowledge', () => {
    const wrong = jdAssertions.find((a) => a.id === 'a4')!;
    expect(isLearnableKnowledge(wrong)).toBe(false);
    expect(isVerified(wrong)).toBe(false);
  });

  it('the REAL gateway assertion IS verified knowledge', () => {
    const real = jdAssertions.find((a) => a.id === 'a3')!;
    expect(real.objectRef).toContain('szgateway.jd.com'); // real path
    expect(isVerified(real)).toBe(true);
  });

  it('query filtering would exclude suspected but include verified', () => {
    // This is the contract-level guarantee: only learnable (observed/verified) returned as knowledge.
    const learnable = jdAssertions.filter(isLearnableKnowledge);
    const verified = jdAssertions.filter(isVerified);
    expect(learnable).toHaveLength(5); // a1, a2, a3, a5, a6 (not a4)
    expect(verified).toHaveLength(4);   // a1, a2, a3, a5 (not a6 observed, not a4 suspected)
  });
});

describe('Scenario C — Surface → Metric assertion traces to Evidence', () => {
  it('exposes_metric assertion carries evidenceRefs', () => {
    const a2 = jdAssertions.find((a) => a.id === 'a2')!;
    expect(a2.predicate).toBe('exposes_metric');
    expect(a2.evidenceRefs.length).toBeGreaterThan(0);
    expect(a2.evidenceRefs[0]).toBe('ev_page_trade_summary');
  });
});

describe('Scenario D — same World Object in different epistemic statuses', () => {
  it('jd_metric_gmv appears in both verified and suspected assertions', () => {
    const gmvAssertions = jdAssertions.filter((a) => a.subjectId === 'jd_metric_gmv');
    const statuses = gmvAssertions.map((a) => a.epistemicStatus);
    expect(statuses).toContain('verified');    // observable_by real gateway
    expect(statuses).toContain('suspected');   // observable_by wrong guess
  });
});

describe('Scenario E — Unknown ≠ Absent', () => {
  it('absence of assertion does not imply non-existence', () => {
    // No assertion says anything about a "coupon" metric. That means UNDISCOVERED, not ABSENT.
    const couponAssertions = jdAssertions.filter(
      (a) => a.objectRef.includes('coupon') || a.subjectId.includes('coupon'),
    );
    expect(couponAssertions).toHaveLength(0); // no assertion = unknown, not "does_not_exist"
    // The contract has NO "does_not_exist" status — you can only express unknown by absence.
  });
});

describe('Scenario F — Metric object does not store real-time values', () => {
  it('Metric has no top-level value field', () => {
    const gmv = jdObjects.find((o) => o.id === 'jd_metric_gmv')!;
    // The schema has id/type/name/attributes — NO value/currentValue/observedValue field.
    expect('value' in gmv).toBe(false);
    expect('currentValue' in gmv).toBe(false);
    // Intrinsic attributes carry unit/definition, not time-series values.
    expect(gmv.attributes).toEqual({ unit: '元' });
  });

  it('World Model does not carry GMV=¥7,983.16 as a fact', () => {
    const model = buildJdModel();
    const serialized = JSON.stringify(model);
    // The real-time value ¥7,983.16 is Observation/Evidence (P0007), NOT a World Fact.
    expect(serialized).not.toContain('7983');
    expect(serialized).not.toContain('7,983');
  });
});

describe('Scenario G — Surface → CapabilityBinding → CapabilityRegistry', () => {
  it('binding is a REFERENCE, not a copy of Capability Contract', () => {
    const binding = jdBindings[0]!;
    // Binding has only: worldObjectId + capabilityId + relationship + epistemicStatus.
    // It does NOT copy capability's metrics/dimensions/provider.
    expect(binding).not.toHaveProperty('metrics');
    expect(binding).not.toHaveProperty('provider');
    expect(binding).not.toHaveProperty('outputs');
    expect(binding.capabilityId).toBe('trade.overview'); // reference only
  });

  it('binding has explicit relationship semantics (not a bare ID association)', () => {
    const binding = jdBindings[0]!;
    expect(binding.relationship).toBe('observable_by');
    // A Metric could be observable_by one capability, exportable_by another, comparable_by a third.
    // The relationship field expresses WHY the two IDs are bound.
    const otherBinding = { id: 'b2', worldObjectId: 'jd_metric_gmv', capabilityId: 'trade.reports', relationship: 'exportable_by' as const, epistemicStatus: 'observed' as const };
    expect(() => CapabilityBindingSchema.parse(otherBinding)).not.toThrow();
  });

  it('rejects binding without a relationship (no bare association)', () => {
    const bare = { id: 'b3', worldObjectId: 'jd_metric_gmv', capabilityId: 'trade.overview' };
    const result = CapabilityBindingSchema.safeParse(bare);
    expect(result.success).toBe(false);
  });

  it('binding schema validates', () => {
    expect(() => CapabilityBindingSchema.parse(jdBindings[0])).not.toThrow();
  });
});

describe('Scenario I — temporal lifecycle ≠ epistemic lifecycle', () => {
  it('superseding keeps epistemic status, changes temporal status', () => {
    const verified = jdAssertions.find((a) => a.id === 'a2')!; // Surface exposes_metric GMV, verified
    const superseded = supersedeAssertion(verified, 'a2_v2');
    // Epistemic confidence did NOT decrease — it WAS verified at the time.
    expect(superseded.epistemicStatus).toBe('verified');
    // Temporal validity changed — no longer the current truth.
    expect(superseded.temporalStatus).toBe('superseded');
    expect(superseded.supersededBy).toBe('a2_v2');
  });

  it('superseded assertion is NOT active knowledge even though verified', () => {
    const verified = jdAssertions.find((a) => a.id === 'a2')!;
    const superseded = supersedeAssertion(verified, 'a2_v2');
    expect(isVerified(superseded)).toBe(true);       // still verified (confidence)
    expect(isActiveKnowledge(superseded)).toBe(false); // but not active (world changed)
  });

  it('rejects superseding an already superseded/retired assertion', () => {
    const verified = jdAssertions.find((a) => a.id === 'a2')!;
    const once = supersedeAssertion(verified, 'v1');
    expect(() => supersedeAssertion(once, 'v2')).toThrow(/already/);
  });

  it('default temporalStatus is active', () => {
    const a1 = jdAssertions.find((a) => a.id === 'a1')!;
    expect(a1.temporalStatus ?? 'active').toBe('active');
  });
});

describe('Scenario J — evidenceRefs is a reference interface (not full provenance)', () => {
  it('assertion carries evidenceRefs (reference IDs)', () => {
    const a2 = jdAssertions.find((a) => a.id === 'a2')!;
    expect(a2.evidenceRefs.length).toBeGreaterThan(0);
  });

  it('evidenceRefs are plain IDs — World Evidence semantics NOT yet implemented', () => {
    // evidenceRefs point to Evidence IDs, but the Evidence contract (evidence/types.ts)
    // is designed for business-data acquisition (shop_id/summary/trend), NOT World
    // Discovery evidence (screenshot/DOM/network/documentation). This is a known gap.
    // The contract supports the REFERENCE, but full World Evidence semantics are pending.
    const a2 = jdAssertions.find((a) => a.id === 'a2')!;
    expect(typeof a2.evidenceRefs[0]).toBe('string'); // just an ID reference
    // No evidence-type field here — the assertion does NOT model what kind of evidence.
    expect('evidenceType' in a2).toBe(false);
  });
});

describe('Scenario H — Feature/Affordance ≠ agentFabric Capability', () => {
  it('feature is a distinct object type from capability', () => {
    const feature = jdObjects.find((o) => o.id === 'jd_feature_realtime_ranking')!;
    expect(feature.type).toBe('feature'); // NOT 'capability'
    // There is no 'capability' in WorldObjectTypeSchema — Capability lives in agentFabric's CapabilityRegistry.
    expect(feature.type).not.toBe('capability');
  });

  it('feature is described by World Assertion, capability by CapabilityRegistry', () => {
    // Feature "实时榜单" is a Surface's affordance (accessible_via assertion).
    const a6 = jdAssertions.find((a) => a.id === 'a6')!;
    expect(a6.predicate).toBe('accessible_via');
    expect(a6.objectRef).toBe('jd_feature_realtime_ranking');
    // Capability "trade.overview" is referenced only via CapabilityBinding, never as a World Object.
    expect(jdObjects.some((o) => o.id === 'trade.overview')).toBe(false);
  });
});

describe('WorldModel — top-level container', () => {
  it('validates a minimal JD model', () => {
    const model = buildJdModel();
    expect(() => WorldModelSchema.parse(model)).not.toThrow();
  });

  it('preserves the three-layer separation', () => {
    const model = WorldModelSchema.parse(buildJdModel());
    expect(model.objects.length).toBe(9);
    expect(model.assertions.length).toBe(6);
    expect(model.bindings.length).toBe(1);
  });
});

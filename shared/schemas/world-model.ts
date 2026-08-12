// P0008.2 — World Model Contract.
// The runtime-neutral model of "what a business system IS" — distinct from
// "what happened" (P0007 Learning Context) and "how to observe" (Capability).
//
// Three strictly-separated layers:
//
//   World Objects        "世界里有什么"           System/Surface/Feature/Metric/Dimension/Constraint
//   World Assertions     "它们之间是什么关系，多确定，证据是什么"
//   Capability Binding   "Agent 怎样实际观察这个世界"
//
// Design principles (from P0008.1 Gap Map + Contract Review):
//   1. Epistemic status (suspected/observed/verified) lives on ASSERTIONS, not objects.
//      The same object can participate in assertions of different statuses.
//   2. World Objects are identity + intrinsic attributes only. No VALUES.
//      "Metric at T = ¥7,983.16" is Observation (P0007), NOT a World Fact.
//   3. Relationships are Assertions (subject → predicate → object), not object fields.
//   4. Unknown ≠ Absent. No assertion about X means "undiscovered", never "does_not_exist".
//   5. Feature/Affordance (system provides) ≠ Capability (agentFabric observes).
//   6. Capability Binding is a REFERENCE to CapabilityRegistry, never a copy of it.

import { z } from 'zod';

// ---- World Object Types ----

export const WorldObjectTypeSchema = z.enum([
  'system',       // 被探索系统（京东商智）
  'surface',      // 页面/模块
  'feature',      // 系统自己提供的功能（Feature/Affordance）—— 不是 agentFabric Capability
  'metric',       // 指标
  'dimension',    // 时间/渠道/对比等维度
  'constraint',   // 数据新鲜度/导出格式/付费墙等约束
]);
export type WorldObjectType = z.infer<typeof WorldObjectTypeSchema>;

/**
 * A World Object — a node in the world. Identity + intrinsic attributes only.
 * NO relationships (those are Assertions). NO values (those are Observations).
 */
export const WorldObjectSchema = z.object({
  /** Stable identity (e.g. "jd_shangzhi", "jd_surface_trade_summary", "jd_metric_gmv") */
  id: z.string().min(1),
  /** Which of the 6 object types */
  type: WorldObjectTypeSchema,
  /** Human-readable name (中文/英文均可) */
  name: z.string().min(1),
  /**
   * Intrinsic attributes (NOT relationships, NOT values).
   * e.g. Metric: { unit: "元", definition: "..." }; Constraint: { description: "..." }.
   * These define WHAT the object IS, not HOW it relates or WHAT happened.
   */
  attributes: z.record(z.string(), z.unknown()).default({}),
});
export type WorldObject = z.infer<typeof WorldObjectSchema>;

// ---- Epistemic Status ----

/**
 * How certain we are about a World Assertion.
 *
 *   suspected — guessed/inferred from URL, name, code, pattern. NOT verified.
 *   observed  — actually saw the page, field, API response, or other evidence.
 *   verified  — enough evidence to publish as a stable World Fact.
 *
 * Monotonic lifecycle: suspected → observed → verified (never backward).
 */
export const EpistemicStatusSchema = z.enum(['suspected', 'observed', 'verified']);
export type EpistemicStatus = z.infer<typeof EpistemicStatusSchema>;

/** Ordering for monotonic lifecycle validation. */
export const EPISTEMIC_ORDER: Readonly<Record<EpistemicStatus, number>> = {
  suspected: 0,
  observed: 1,
  verified: 2,
};

// ---- Assertion Predicates ----

/**
 * The relationships a World Assertion can express.
 * Small, core set. Extensible — but each new predicate must be justified by real evidence.
 */
export const AssertionPredicateSchema = z.enum([
  'has_surface',         // System → Surface
  'has_metric',          // System/Surface → Metric
  'exposes_metric',      // Surface → Metric
  'supports_dimension',  // Metric → Dimension
  'observable_by',       // Metric/Surface → endpoint path (free-form literal)
  'accessible_via',      // Surface → Feature
  'has_constraint',      // System/Surface → Constraint
  'belongs_to',          // object → System
]);
export type AssertionPredicate = z.infer<typeof AssertionPredicateSchema>;

// ---- World Assertion ----

/**
 * A World Assertion — an edge in the world graph WITH epistemic status and evidence.
 *
 * This is the core of the World Model. A fact like:
 *   "JD Shangzhi has_surface Realtime Overview [verified]"
 * is an Assertion, not a property of the System or Surface object.
 *
 * The SAME object can appear in many assertions of DIFFERENT epistemic statuses:
 *   Metric "成交金额" — exists [verified]
 *   Metric "成交金额" — observable_by /szgateway/xxx [suspected]   (Hermes guessed wrong)
 */
export const WorldAssertionSchema = z.object({
  /** Stable assertion identity */
  id: z.string().min(1),
  /** Subject — a WorldObject.id */
  subjectId: z.string().min(1),
  /** The relationship being asserted */
  predicate: AssertionPredicateSchema,
  /**
   * Object/reference.
   * If `objectIsRef` is true → a WorldObject.id.
   * If false → a free-form literal (endpoint path, formula, unit, etc.).
   */
  objectRef: z.string().min(1),
  /** Whether objectRef points to a WorldObject.id (true) or is a literal (false) */
  objectIsRef: z.boolean(),
  /** How certain we are about this assertion */
  epistemicStatus: EpistemicStatusSchema,
  /** Evidence IDs backing this assertion (screenshot/DOM/network/documentation) */
  evidenceRefs: z.array(z.string()).default([]),
  /** When this assertion was first made */
  discoveredAt: z.string().min(1),
  /** Where this came from — explorer session ID, "manual", etc. */
  source: z.string().min(1),
});
export type WorldAssertion = z.infer<typeof WorldAssertionSchema>;

// ---- Capability Binding ----

/**
 * Links a World Object (Surface/Metric) to an agentFabric Capability.
 *
 * This is a REFERENCE (capabilityId → CapabilityRegistry), NEVER a copy.
 * The Capability Contract owns capability definitions; the Binding only says
 * "this World Surface/Metric can be observed via this Capability".
 */
export const CapabilityBindingSchema = z.object({
  /** Stable binding identity */
  id: z.string().min(1),
  /** The WorldObject.id being bound (a Surface or Metric) */
  worldObjectId: z.string().min(1),
  /** The CapabilityContractEntry.capability identifier (e.g. "trade.overview") */
  capabilityId: z.string().min(1),
  /** What this binding means */
  bindingType: z.enum(['observes', 'exposes']),
  /** Epistemic status of the binding itself */
  epistemicStatus: EpistemicStatusSchema.default('observed'),
});
export type CapabilityBinding = z.infer<typeof CapabilityBindingSchema>;

// ---- World Model (top-level container) ----

/**
 * A World Model = a set of World Objects + Assertions + Bindings for one system.
 *
 * This is a flat, queryable structure. It can grow by ADDING assertions,
 * without changing object schemas.
 */
export const WorldModelSchema = z.object({
  /** System identifier this model describes (e.g. "jd_shangzhi") */
  systemId: z.string().min(1),
  /** All World Objects (the nodes) */
  objects: z.array(WorldObjectSchema),
  /** All World Assertions (the edges with epistemic status) */
  assertions: z.array(WorldAssertionSchema),
  /** All Capability Bindings (World → CapabilityRegistry) */
  bindings: z.array(CapabilityBindingSchema),
});
export type WorldModel = z.infer<typeof WorldModelSchema>;

// ---- Validation Helpers ----

/**
 * Upgrade an assertion's epistemic status (immutable).
 * Enforces monotonic lifecycle: suspected → observed → verified.
 * Returns a NEW assertion (never mutates). Throws on backward transition.
 */
export const upgradeAssertion = (
  assertion: WorldAssertion,
  newStatus: EpistemicStatus,
  additionalEvidence: string[] = [],
): WorldAssertion => {
  const current = EPISTEMIC_ORDER[assertion.epistemicStatus];
  const next = EPISTEMIC_ORDER[newStatus];
  if (next < current) {
    throw new Error(
      `Cannot downgrade assertion ${assertion.id} from ${assertion.epistemicStatus} to ${newStatus}`,
    );
  }
  return {
    ...assertion,
    epistemicStatus: newStatus,
    evidenceRefs: [...new Set([...assertion.evidenceRefs, ...additionalEvidence])],
  };
};

/** Whether an assertion is verified (can be treated as a stable World Fact). */
export const isVerified = (assertion: WorldAssertion): boolean =>
  assertion.epistemicStatus === 'verified';

/**
 * Whether an assertion is "learnable" knowledge — observed or verified.
 * Suspected assertions exist but must NOT be returned as verified knowledge.
 */
export const isLearnableKnowledge = (assertion: WorldAssertion): boolean =>
  assertion.epistemicStatus === 'observed' || assertion.epistemicStatus === 'verified';

/**
 * Resolve whether a WorldObject.id reference is valid against a set of objects.
 * Used by consumers to validate reference integrity. NOT a builder — just a check.
 */
export const resolveObjectRef = (
  objects: readonly WorldObject[],
  id: string,
): WorldObject | undefined => objects.find((o) => o.id === id);

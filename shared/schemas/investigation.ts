// Investigation Contract — the business-level artifacts of a Knowledge-Guided
// Investigation (P0010). These are domain-auditable objects (Known Evidence /
// Hypotheses / Unknowns / Next Question / Findings / Judgment), NOT model
// Chain-of-Thought. The Runtime (Hermes) produces them; Fabric persists and
// surfaces them to the Workspace.
//
// Anti-goals: no reasoning tokens, no hidden reasoning, no investigation DSL.

import { z } from 'zod';

/** How a hypothesis fares after new evidence. */
export const HypothesisStatusSchema = z.enum(['proposed', 'supported', 'weakened', 'rejected']);
export type HypothesisStatus = z.infer<typeof HypothesisStatusSchema>;

/** A single business hypothesis under investigation. */
export const HypothesisSchema = z.object({
  statement: z.string().min(1),
  status: HypothesisStatusSchema.default('proposed'),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

/** A question the Agent chose to answer next, with the evidence it needs. */
export const InvestigationQuestionSchema = z.object({
  question: z.string().min(1),
  purpose: z.string().default(''),
  requiredEvidence: z.array(z.string()).default([]),
});
export type InvestigationQuestion = z.infer<typeof InvestigationQuestionSchema>;

/** A finding: one question was answered by evidence. */
export const FindingSchema = z.object({
  question: z.string().default(''),
  evidenceRefs: z.array(z.string()).default([]),
  answer: z.string().default(''),
  impactOnHypothesis: z.string().default(''),
});
export type Finding = z.infer<typeof FindingSchema>;

/** Why the investigation stopped. */
export const StopReasonSchema = z.enum(['judgment', 'observe', 'missing_capability', 'ask_human']);
export type StopReason = z.infer<typeof StopReasonSchema>;

/**
 * The full Investigation Contract for one situation.
 * Fabric stores this (additively in the situation's Learning Context) and the
 * Workspace renders it so a professional can judge whether the Agent asked the
 * right question.
 */
export const InvestigationSchema = z.object({
  /** The situation this investigation explains. */
  situationId: z.string().min(1),
  /** What the Agent currently understands (prose). */
  currentUnderstanding: z.string().default(''),
  /** Evidence the Agent already holds (short labels; refs live in findings). */
  knownEvidence: z.array(z.string()).default([]),
  hypotheses: z.array(HypothesisSchema).default([]),
  /** What the Agent does not yet know. */
  unknowns: z.array(z.string()).default([]),
  /** The single next question the Agent chose. */
  nextQuestion: z.string().default(''),
  /** Evidence the next question needs. */
  requiredEvidence: z.array(z.string()).default([]),
  /** How the Agent plans to acquire the required evidence (Fabric capability, existing evidence, …). */
  investigationRequest: z.string().default(''),
  findings: z.array(FindingSchema).default([]),
  judgment: z.string().default(''),
  stopReason: StopReasonSchema.optional(),
  /** Which Fabric capability was actually executed during this investigation. */
  capabilityUsed: z.string().optional(),
  /** Evidence entries acquired during this investigation (evidence ids / labels). */
  evidenceAcquired: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Investigation = z.infer<typeof InvestigationSchema>;

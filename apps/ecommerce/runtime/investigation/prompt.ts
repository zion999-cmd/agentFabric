// P0010 — Investigation prompt (Fabric-owned).
//
// This is the ONLY prompt that launches a Knowledge-Guided Investigation. It
// carries the situation + current evidence as DATA, and instructs the Runtime
// (Hermes) HOW to investigate. It does NOT contain business rules, hardcoded
// questions, or an investigation tree — the Agent decides what to ask based on
// the professional Knowledge it reads from knowledge/.

import type { LearningContext, Situation } from '#shared/schemas/learning-context.js';

/** Flatten the situation's current evidence into compact, data-only lines. */
export const formatSituationEvidence = (ctx: LearningContext | null): string => {
  if (!ctx) return '(no learning context yet)';
  const lines: string[] = [];
  for (const obs of ctx.observations ?? []) {
    const metrics = obs.metricsSnapshot ? JSON.stringify(obs.metricsSnapshot) : '';
    lines.push(
      `- ${obs.summary}${metrics ? ` (metrics: ${metrics})` : ''}` +
        `${obs.evidenceIds?.length ? ` [evidence: ${obs.evidenceIds.length} refs]` : ''}` +
        `${obs.signalIds?.length ? ` [signals: ${obs.signalIds.length} refs]` : ''}` +
        ` acquired via ${obs.provider.platform}/${obs.provider.acquisition}`,
    );
  }
  if (lines.length === 0) return '(no observation records)';
  return lines.join('\n');
};

/**
 * P0010.1 Prior Human Guidance — flatten the situation's persisted
 * humanInterventions into a section the Agent MUST consult. The human's
 * corrections and supplements override agent guesses; the human's decision
 * feedback tells the Agent whether its prior recommendation was accepted.
 *
 * Type-specific payload shape (per InterventionContentSchema):
 *   response           — evaluation: agree | disagree | partial | uncertain
 *   correction         — what is wrong + correctedValue
 *   context_supplement — information the system cannot observe
 *   decision           — accept | reject | defer | override | no_action
 *   action_intent      — skipped here: outbound action is NOT a current slice
 *
 * Returns a single string starting with a "(no prior human guidance)" sentinel
 * when there are no interventions, so the section is always present and the
 * Agent never silently ignores the input.
 */
export const formatPriorHumanGuidance = (ctx: LearningContext | null): string => {
  const interventions = ctx?.humanInterventions ?? [];
  if (interventions.length === 0) {
    return '(no prior human guidance — this is the first investigation turn)';
  }

  const lines: string[] = [];
  for (const i of interventions) {
    const content = (i.content ?? {}) as Record<string, unknown>;
    const when = (i.timestamp || '').slice(0, 16);
    switch (i.type) {
      case 'response': {
        const eval_ = (content['evaluation'] as string) || 'unspecified';
        const rationale = content['rationale'] as string | undefined;
        lines.push(
          `- [${when}] 用户对 Agent ${eval_}` +
            (rationale ? ` — 理由: ${rationale}` : ''),
        );
        break;
      }
      case 'correction': {
        const correction = (content['correction'] as string) || '(no correction text)';
        const correctedValue = content['correctedValue'];
        lines.push(
          `- [${when}] 用户纠正: ${correction}` +
            (correctedValue !== undefined ? ` (正确值: ${JSON.stringify(correctedValue)})` : ''),
        );
        break;
      }
      case 'context_supplement': {
        const information = (content['information'] as string) || '(no information text)';
        const aspect = (content['supplements'] as Record<string, unknown> | undefined)?.['situationAspect'] as string | undefined;
        lines.push(
          `- [${when}] 用户补充${aspect ? ` (${aspect})` : ''}: ${information}`,
        );
        break;
      }
      case 'decision': {
        const decision = (content['decision'] as string) || 'unspecified';
        const rationale = content['rationale'] as string | undefined;
        lines.push(
          `- [${when}] 用户已决定: ${decision}` +
            (rationale ? ` — 理由: ${rationale}` : ''),
        );
        break;
      }
      case 'action_intent':
        // Outbound action — explicitly out of scope of P0010.1 inbound feedback.
        lines.push(`- [${when}] 用户曾表达行动意图 (outbound action — not a current guidance input)`);
        break;
      default:
        lines.push(`- [${when}] 用户输入 (${i.type}): ${i.summary || ''}`);
    }
  }
  return lines.join('\n');
};

/**
 * Build the investigation instruction for one situation.
 *
 * Rules (hard lines, enforced by prompt structure — not by Fabric code):
 *  - the Agent reads professional Knowledge from knowledge/INDEX.md + pages;
 *    no SOP is copied into this prompt;
 *  - Next Question is chosen by the Agent from Situation + Knowledge + Evidence;
 *  - if existing evidence cannot answer it, the Agent checks Fabric capabilities
 *    (fabric_list_capabilities) and acquires evidence via fabric_execute_capability;
 *  - if no capability exists for the needed evidence, it MUST stop with
 *    stop_reason = "missing_capability" (never guess, never invent capability);
 *  - the final answer is a JSON Investigation Contract.
 */
export const buildInvestigationPrompt = (
  situation: Situation,
  ctx: LearningContext | null,
): string => {
  const entity = situation.entity?.name ?? situation.entity?.id ?? 'unknown';
  return [
    `You are investigating ONE business situation in a Fabric Agent Workspace.`,
    ``,
    `## Situation`,
    `- id: ${situation.situationId}`,
    `- entity: ${entity} (${situation.entity?.platform ?? 'jd'})`,
    `- observed: ${situation.temporal?.observedAt ?? ''}`,
    `- type: ${situation.type}`,
    `- description: ${situation.description}`,
    ``,
    `## Prior Human Guidance (MUST consult — overrides the Agent's own guesses)`,
    // P0010.1: the human's corrections and supplements are authoritative
    // within the current Learning Context. The Agent MUST treat them as
    // constraints when forming currentUnderstanding / hypotheses / judgment.
    formatPriorHumanGuidance(ctx),
    ``,
    `## Current evidence (already observed, do NOT re-acquire unless stale)`,
    formatSituationEvidence(ctx),
    ``,
    `## What to do — a Knowledge-Guided Investigation`,
    ``,
    `1. Read professional Knowledge: open knowledge/INDEX.md, then read the knowledge pages relevant to this kind of situation. Base your judgment on that Knowledge, not on generic guessing.`,
    ``,
    `2. Form your Current Understanding. Honour the Prior Human Guidance above: if a user correction said the prior judgment was wrong, your new judgment must be consistent with that correction. If a user supplement provided information the system cannot observe, treat it as a known constraint.`,
    `   - known_evidence: what you already know (from the evidence above, the situation, AND the prior human guidance)`,
    `   - hypotheses: plausible explanations with status "proposed"`,
    `   - unknowns: what is genuinely still unknown`,
    ``,
    `3. Choose the NEXT QUESTION — the single question that, if answered, reduces this situation's uncertainty the most. State its required_evidence (the concrete data you would need). If the Prior Human Guidance already answered it, do NOT ask the same question again — incorporate the answer.`,
    ``,
    `4. Check whether existing evidence already answers it. If yes, answer directly from existing evidence.`,
    ``,
    `5. If existing evidence is insufficient, use the Fabric MCP tools to acquire it:`,
    `   - call fabric_list_capabilities to see what live JD data Fabric can provide,`,
    `   - pick the capability whose data matches required_evidence,`,
    `   - call fabric_execute_capability with that capability (and the situation's date if relevant),`,
    `   - the tool returns real evidence — read it.`,
    ``,
    `6. Answer your question from the newly acquired evidence. Update each hypothesis's status (supported / weakened / rejected) and record a finding with evidence_refs.`,
    ``,
    `7. Decide: continue (choose the next question) or stop. Stop only for one of:`,
    `   - stop_reason "judgment" — evidence suffices for a business judgment`,
    `   - stop_reason "observe" — the change is within normal variation; no intervention`,
    `   - stop_reason "missing_capability" — you know what evidence you need but Fabric has no capability for it (do NOT invent a capability, do NOT guess)`,
    `   - stop_reason "ask_human" — the needed fact is not machine-observable`,
    ``,
    `8. IMPORTANT: you MUST actually call fabric_execute_capability at least once when existing evidence cannot answer your next question and a matching capability exists. A plausible analysis without evidence acquisition is a failure.`,
    ``,
    `9. Finally, output ONLY a JSON object with this exact shape (no markdown fences, no prose around it):`,
    `{`,
    `  "situationId": "${situation.situationId}",`,
    `  "currentUnderstanding": "...",`,
    `  "knownEvidence": ["..."],`,
    `  "hypotheses": [{"statement": "...", "status": "proposed|supported|weakened|rejected"}],`,
    `  "unknowns": ["..."],`,
    `  "nextQuestion": "...",`,
    `  "requiredEvidence": ["..."],`,
    `  "investigationRequest": "...",`,
    `  "findings": [{"question": "...", "evidenceRefs": ["..."], "answer": "...", "impactOnHypothesis": "..."}],`,
    `  "judgment": "...",`,
    `  "stopReason": "judgment|observe|missing_capability|ask_human",`,
    `  "capabilityUsed": "...",`,
    `  "evidenceAcquired": ["..."],`,
    `  "recommendation": {"recommendation": "...", "rationale": "...", "expectedOutcome": "...", "risks": "...", "prerequisites": ["..."], "humanNeeded": ["..."]}`,
    `}`,
    ``,
    `The "recommendation" MUST follow ONLY from your judgment and findings above — never from a single Signal or metric threshold. If your judgment is "observe" (pseudo-anomaly / insufficient evidence), the recommendation should reflect NOT acting (e.g. continue observing, do not intervene). If human verification is required, list the needed facts under "humanNeeded". Do not write an Action — recommendation is what to consider, not an execution order.`,
    ``,
    `Do not write any Action. You are investigating (read / question / acquire evidence / understand), not executing a business operation.`,
  ].join('\n');
};

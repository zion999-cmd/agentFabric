// Type declarations for apps/ecommerce/workspace/presentation.js.
// This module is a pure ES module of presentation-layer helpers used by
// app.js (browser) and tests/contract/investigation.contract.ts (vitest).
// The .d.ts is intentionally loose: every function accepts "any object"
// because the helpers are defensive (null-safe, unknown-safe) and the
// tests pin the BEHAVIOR. Tight types here would force every call site
// to thread the full Situation/Investigation types, which the vanilla
// JS app.js path does not have.

export function businessDescribeSituation(
  situation: { type?: string; description?: string } | null | undefined,
  investigation: { stopReason?: string; status?: string; judgment?: string; currentUnderstanding?: string } | null | undefined,
): string;

export function businessDescribeSituationShort(
  situation: { type?: string; description?: string } | null | undefined,
  investigation: { stopReason?: string; status?: string; judgment?: string; currentUnderstanding?: string } | null | undefined,
): string;

export function sourceTagLabel(kind: string, refId?: number | string | null): string;
export function sourceTagTooltip(kind: string): string;

export const ERROR_HUMANIZE: ReadonlyArray<{ match: string; text: string }>;

export function humanizeError(raw: string | null | undefined, panelMode: 'business' | 'developer' | string): string;

export function descClean(text: string | null | undefined): string;

export function hasPriorValidCognition(
  investigation: { status?: string; error?: string; judgment?: string; currentUnderstanding?: string } | null | undefined,
): boolean;

// ---- P0010.1 Post-Productization REPAIR additions ----

export type SituationLifecycle = 'pending' | 'investigating' | 'watching' | 'waiting_human' | 'closed';

export function deriveSituationLifecycle(
  investigation: any,
  interventionCount: number,
  hasAcceptedDecision: boolean,
): SituationLifecycle;

export const SITUATION_LIFECYCLE_LABEL: Readonly<Record<SituationLifecycle, string>>;
export const INVESTIGATION_STATUS_LABEL: Readonly<Record<string, string>>;

export interface ObservationCommitment {
  type: 'observe';
  startedAt: string;
  reviewAt: string | null;
  /** Human-readable labels of what an operator should look for before
   *  re-evaluating. NOT auto-wake conditions: there is no scheduler. */
  checkpoints: string[];
  note: string;
}

export function deriveObservationCommitment(investigation: any): ObservationCommitment | null;

export interface SourcePopoverField {
  label: string;
  value: string;
  devOnly?: boolean;
}

export interface SourcePopover {
  title: string;
  fields: SourcePopoverField[];
  unavailable?: { reason: string; detail: string };
}

export function popoverContentForEvidence(evidenceString: string | null | undefined): SourcePopover | null;
export function popoverContentForKnowledge(knownEvidenceText: string | null | undefined): SourcePopover | null;
export function popoverContentForHuman(intervention: any): SourcePopover | null;
export function popoverContentForMemory(): SourcePopover;

export function getSourcePopoverData(
  kind: 'evidence' | 'knowledge' | 'human' | 'memory',
  refId: number | string | null,
  context: { evidenceStrings?: string[]; knownEvidence?: string[]; interventions?: unknown[] },
): SourcePopover | null;

export function renderSourcePopoverHtml(data: SourcePopover | null): string;

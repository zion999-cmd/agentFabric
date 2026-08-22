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

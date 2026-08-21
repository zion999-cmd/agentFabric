// P0010 — Investigation Contract parser.
// Extracts the structured Investigation Contract from a Runtime reply. The Agent
// is asked to output ONLY the JSON object; this parser is defensive (finds the
// last balanced {...} block) and validates against the schema.

import { InvestigationSchema } from '#shared/schemas/investigation.js';
import type { Investigation } from '#shared/schemas/investigation.js';

export type ParseInvestigationResult =
  | { ok: true; investigation: Investigation }
  | { ok: false; error: string };

/** Find the last complete {...} object in arbitrary text (outermost, balanced). */
export const extractJsonObject = (text: string): string | null => {
  const end = text.lastIndexOf('}');
  if (end === -1) return null;
  let depth = 0;
  for (let i = end; i >= 0; i--) {
    if (text[i] === '}') depth++;
    else if (text[i] === '{') {
      depth--;
      if (depth === 0) return text.slice(i, end + 1);
    }
  }
  return null; // unbalanced — no complete outer object
};

/** Parse + validate an Investigation Contract from a Runtime reply. */
export const parseInvestigation = (reply: string, situationId: string): ParseInvestigationResult => {
  const candidate = extractJsonObject(reply);
  if (!candidate) {
    return { ok: false, error: 'No JSON Investigation Contract found in the reply.' };
  }
  try {
    const raw = JSON.parse(candidate) as unknown;
    // Coerce the situationId so a slightly-off id still validates; the reply
    // is Agent-produced, so we treat it as untrusted input.
    const withId = typeof raw === 'object' && raw !== null
      ? { ...(raw as Record<string, unknown>), situationId: situationId }
      : raw;
    const parsed = InvestigationSchema.safeParse(withId);
    if (!parsed.success) {
      return { ok: false, error: `Invalid Investigation Contract: ${parsed.error.message}` };
    }
    return { ok: true, investigation: parsed.data };
  } catch (err) {
    return {
      ok: false,
      error: `Investigation JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};

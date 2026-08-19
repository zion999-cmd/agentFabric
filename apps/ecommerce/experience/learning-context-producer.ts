// Learning Context producer — completes the P0007 half-written main line.
//
// Fabric's job ends here: convert a Human Intervention into the situation's
// Learning Context (the "experience delivery layer"). Memory / Growth stays
// with Hermes.
//
// Boundary (decided in Consolidation Pass 2):
//   - NO Intervention → context_memories producer
//   - NO legacy Review → Feedback → context_memories chain
//   Fabric does NOT produce its own Memory.

import type { Database as Db } from 'better-sqlite3';
import type { HumanIntervention, LearningContext, Situation } from '#shared/schemas/learning-context.js';
import { LearningContextSchema } from '#shared/schemas/learning-context.js';
import { uuid } from '#shared/utils/crypto.js';
import { nowIso } from '#shared/utils/time.js';

/** Map a `situations` table row to the canonical Situation shape. */
const rowToSituation = (row: Record<string, unknown>): Situation => ({
  situationId: String(row.situation_id ?? ''),
  domain: String(row.domain ?? ''),
  type: String(row.type ?? 'other') as Situation['type'],
  entity: {
    id: String(row.entity_id ?? ''),
    type: String(row.entity_type ?? ''),
    ...(row.entity_name ? { name: String(row.entity_name) } : {}),
    ...(row.entity_platform ? { platform: String(row.entity_platform) } : {}),
  },
  temporal: {
    observedAt: String(row.observed_at ?? ''),
    ...(row.window_start ? { windowStart: String(row.window_start) } : {}),
    ...(row.window_end ? { windowEnd: String(row.window_end) } : {}),
  },
  description: String(row.description ?? ''),
  tags: (() => { try { return JSON.parse(String(row.tags ?? '[]')) as string[]; } catch { return []; } })(),
});

/** Load a situation row and map it to the canonical Situation shape. */
export const loadSituation = (db: Db, situationId: string): Situation | null => {
  const row = db.prepare('SELECT * FROM situations WHERE situation_id = ?').get(situationId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToSituation(row);
};

/** Build a fresh LearningContext body from a situation + its interventions. */
const buildLearningContext = (situation: Situation, interventions: HumanIntervention[]): LearningContext => {
  const now = nowIso();
  return {
    contextId: uuid(),
    situation,
    lifecycle: 'partial',
    createdAt: now,
    updatedAt: now,
    observations: [],
    evidenceIds: [],
    signalIds: [],
    agentActivities: [],
    humanInterventions: interventions,
    actions: [],
    outcomes: [],
    summary: { capabilitiesUsed: [], agentRuntimes: [], humanActors: [], totalEvidence: 0, totalSignals: 0 },
  };
};

/** Record an intervention into the situation's Learning Context (INSERT or UPDATE). */
export const recordInterventionInLearningContext = (
  db: Db,
  situation: Situation,
  intervention: HumanIntervention,
): void => {
  const now = nowIso();
  const existing = db.prepare('SELECT * FROM learning_contexts WHERE situation_id = ?').get(situation.situationId) as Record<string, unknown> | undefined;

  if (existing) {
    // Append the intervention to the existing context body.
    const body = JSON.parse(String(existing.body ?? '{}')) as LearningContext;
    const next: LearningContext = {
      ...body,
      humanInterventions: [...(body.humanInterventions ?? []), intervention],
      lifecycle: 'partial',
      updatedAt: now,
    };
    db.prepare('UPDATE learning_contexts SET body = ?, lifecycle = ?, updated_at = ? WHERE situation_id = ?')
      .run(JSON.stringify(next), 'partial', now, situation.situationId);
  } else {
    // First intervention — create the Learning Context for this situation.
    const ctx = buildLearningContext(situation, [intervention]);
    const validated = LearningContextSchema.parse(ctx);
    db.prepare(
      `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(validated.contextId, situation.situationId, validated.lifecycle, validated.createdAt, validated.updatedAt, JSON.stringify(validated));
  }
};

/** Load a situation's Learning Context (null when not yet created). */
export const loadLearningContext = (db: Db, situationId: string): LearningContext | null => {
  const row = db.prepare('SELECT * FROM learning_contexts WHERE situation_id = ?').get(situationId) as Record<string, unknown> | undefined;
  if (!row) return null;
  try {
    return JSON.parse(String(row.body ?? '{}')) as LearningContext;
  } catch {
    return null;
  }
};

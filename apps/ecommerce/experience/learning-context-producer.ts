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
import type { HumanIntervention, LearningContext, ObservationRef, Situation } from '#shared/schemas/learning-context.js';
import { LearningContextSchema } from '#shared/schemas/learning-context.js';
import { uuid } from '#shared/utils/crypto.js';
import { nowIso } from '#shared/utils/time.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { listEvidence } from '#app/connectors/evidence/store.js';

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

/** Map the evidence store's acquisition method to the ObservationRef acquisition enum. */
const deriveAcquisition = (methods: string[]): ObservationRef['provider']['acquisition'] => {
  if (methods.includes('cdp')) return 'cdp';
  if (methods.includes('import-agentcms')) return 'csv_export';
  return 'manual'; // mock / unknown → manual (synthetic or unknown provenance)
};

/**
 * Build the situation's observations — the verifiable evidence/signals it is based on.
 * Does NOT recompute analysis: it only references existing signals + evidence.
 */
const buildObservations = (db: Db, situation: Situation): ObservationRef[] => {
  const date = situation.temporal.observedAt.slice(0, 10);

  // Enterprise signals are stored with entity_type 'product' (entity_id = the shop id).
  const signals = SignalFacade.list(db, 'product', situation.entity.id)
    .filter((s) => s.observed_at.slice(0, 10) === date);
  const evidence = listEvidence({ source: situation.entity.platform ?? 'jd', fromDate: date, toDate: date, limit: 100 });

  if (signals.length === 0 && evidence.length === 0) return [];

  const dailySummary = signals.find((s) => s.signal_name === 'daily_summary');
  const metricsSnapshot = (dailySummary as unknown as { metrics?: Record<string, number> })?.metrics ?? {};

  return [{
    observationId: uuid(),
    capability: 'daily_summary',
    provider: {
      platform: situation.entity.platform ?? 'jd',
      acquisition: deriveAcquisition(evidence.map((e) => e.metadata.acquisition_method)),
    },
    observedAt: situation.temporal.observedAt,
    summary: situation.description,
    evidenceIds: evidence.map((e) => e.metadata.content_hash),
    signalIds: signals.map((s) => s.signal_id),
    metricsSnapshot,
  }];
};

/** Build a fresh LearningContext body from a situation + its observations + interventions. */
const buildLearningContext = (
  situation: Situation,
  observations: ObservationRef[],
  interventions: HumanIntervention[],
): LearningContext => {
  const now = nowIso();
  return {
    contextId: uuid(),
    situation,
    lifecycle: 'partial',
    createdAt: now,
    updatedAt: now,
    observations,
    evidenceIds: [...new Set(observations.flatMap((o) => o.evidenceIds))],
    signalIds: [...new Set(observations.flatMap((o) => o.signalIds))],
    agentActivities: [],
    humanInterventions: interventions,
    actions: [],
    outcomes: [],
    summary: {
      capabilitiesUsed: [...new Set(observations.map((o) => o.capability))],
      agentRuntimes: [],
      humanActors: [...new Set(interventions.map((i) => i.actor.id))],
      totalEvidence: new Set(observations.flatMap((o) => o.evidenceIds)).size,
      totalSignals: new Set(observations.flatMap((o) => o.signalIds)).size,
    },
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
    // First intervention — create the Learning Context for this situation,
    // including its observations (the verifiable evidence/signals it is based on).
    const observations = buildObservations(db, situation);
    const ctx = buildLearningContext(situation, observations, [intervention]);
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

/** Load a situation's P0010 Investigation (null when none stored). */
export const loadInvestigationFromLearningContext = (db: Db, situationId: string): LearningContext['investigation'] | null => {
  return loadLearningContext(db, situationId)?.investigation ?? null;
};

/**
 * Store a P0010 Knowledge-Guided Investigation into the situation's Learning
 * Context (INSERT or UPDATE, same row — no new table). The investigation is an
 * optional additive field; existing observations/interventions are preserved.
 */
export const storeInvestigationInLearningContext = (
  db: Db,
  situation: Situation,
  investigation: LearningContext['investigation'],
): void => {
  if (!investigation) return;
  const now = nowIso();
  const stamped: LearningContext['investigation'] = { ...investigation, updatedAt: now };
  const existing = loadLearningContext(db, situation.situationId);

  let next: LearningContext;
  if (existing) {
    next = { ...existing, investigation: stamped, lifecycle: 'partial', updatedAt: now };
  } else {
    const observations = buildObservations(db, situation);
    next = { ...buildLearningContext(situation, observations, []), investigation: stamped, lifecycle: 'partial', updatedAt: now };
  }
  const validated = LearningContextSchema.parse(next);

  if (existing) {
    db.prepare('UPDATE learning_contexts SET body = ?, lifecycle = ?, updated_at = ? WHERE situation_id = ?')
      .run(JSON.stringify(validated), validated.lifecycle, now, situation.situationId);
  } else {
    db.prepare(
      `INSERT INTO learning_contexts (context_id, situation_id, lifecycle, created_at, updated_at, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(validated.contextId, situation.situationId, validated.lifecycle, validated.createdAt, validated.updatedAt, JSON.stringify(validated));
  }
};

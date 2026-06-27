// Ranking persistence: store ranking results to SQLite.

import type { Database as Db } from 'better-sqlite3';
import type { RankingResult } from '#shared/schemas/ranking.js';

interface RankingRow {
  ranking_id: string;
  entity_type: string;
  entity_id: string;
  profile: string;
  overall_score: number;
  component_scores: string;
  confidence: number;
  coverage: number;
  strengths: string;
  risks: string;
  decision_trace: string;
  signals_used: string;
  memory_adjustments: string;
  ranked_at: string;
}

const toRow = (r: RankingResult, profile: string): RankingRow => ({
  ranking_id: r.ranking_id,
  entity_type: 'product',
  entity_id: r.entity_id,
  profile,
  overall_score: r.overall_score,
  component_scores: JSON.stringify(r.component_scores),
  confidence: r.confidence,
  coverage: r.coverage,
  strengths: JSON.stringify(r.explainability.strengths),
  risks: JSON.stringify(r.explainability.risks),
  decision_trace: JSON.stringify(r.decision_trace),
  signals_used: JSON.stringify(r.signals_used),
  memory_adjustments: '[]',
  ranked_at: r.ranked_at,
});

/** Upsert a batch of ranking results for a profile. */
export const storeRankingResults = (
  db: Db,
  profile: string,
  results: readonly RankingResult[],
): number => {
  const stmt = db.prepare(
    `INSERT INTO ranking_results (
       ranking_id, entity_type, entity_id, profile, overall_score, component_scores,
       confidence, coverage, strengths, risks, decision_trace, signals_used,
       memory_adjustments, ranked_at
     ) VALUES (
       @ranking_id, @entity_type, @entity_id, @profile, @overall_score, @component_scores,
       @confidence, @coverage, @strengths, @risks, @decision_trace, @signals_used,
       @memory_adjustments, @ranked_at
     )
     ON CONFLICT(entity_type, entity_id, profile) DO UPDATE SET
       ranking_id = excluded.ranking_id,
       overall_score = excluded.overall_score,
       component_scores = excluded.component_scores,
       confidence = excluded.confidence,
       coverage = excluded.coverage,
       strengths = excluded.strengths,
       risks = excluded.risks,
       decision_trace = excluded.decision_trace,
       signals_used = excluded.signals_used,
       ranked_at = excluded.ranked_at`,
  );
  let count = 0;
  const tx = db.transaction((rows: readonly RankingRow[]) => {
    for (const row of rows) {
      stmt.run(row);
      count += 1;
    }
  });
  tx(results.map((r) => toRow(r, profile)));
  return count;
};

/** Load a profile's ranking results ordered by overall_score desc. */
export const loadRankingResults = (db: Db, profile: string): RankingResult[] => {
  const rows = db
    .prepare(
      'SELECT * FROM ranking_results WHERE profile = ? ORDER BY overall_score DESC, entity_id ASC',
    )
    .all(profile) as RankingRow[];
  return rows.map(fromRow);
};

const fromRow = (r: RankingRow): RankingResult => ({
  ranking_id: r.ranking_id,
  entity_id: r.entity_id,
  overall_score: r.overall_score,
  confidence: r.confidence,
  coverage: r.coverage,
  component_scores: JSON.parse(r.component_scores),
  signals_used: JSON.parse(r.signals_used),
  explainability: {
    strengths: JSON.parse(r.strengths),
    risks: JSON.parse(r.risks),
    summary: '',
  },
  decision_trace: JSON.parse(r.decision_trace),
  ranked_at: r.ranked_at,
});

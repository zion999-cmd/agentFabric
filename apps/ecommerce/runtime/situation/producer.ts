// P0009.1 — Situation Producer.
// Bridges existing runtime outputs (Signals / Rankings) into Situations.
//
// Responsibilities (strictly one-way):
//   detect → construct → persist
//
// The producer consumes already-persisted Signals and Rankings via their facades.
// It NEVER triggers acquisition (no CDP), and NEVER calls a model (no LLM/Hermes).
// Lifecycle stays P0007: persisted as 'open'; human interaction / outcomes advance it.

import type { Database as Db } from 'better-sqlite3';
import type { Situation } from '#shared/schemas/learning-context.js';
import { SituationSchema } from '#shared/schemas/learning-context.js';
import type { RankingProfileName } from '#shared/schemas/ranking.js';
import type { Signal } from '#shared/schemas/signal.js';
import { SignalFacade } from '#app/analysis/metrics/facade.js';
import { RankingFacade } from '#app/analysis/decision/facade.js';
import { listProducts } from '#platform/storage/product-repository.js';
import { nowIso } from '#shared/utils/time.js';
import { detectSituations } from './rules.js';
import type { StoreDailyObservation } from './rules.js';

export interface SituationProducerOptions {
  /** Store entity id (matches the shop_id used by the runtime pipeline). */
  shopId: string;
  /** Store display name (business language). */
  shopName?: string;
  /** Platform (default 'jd'). */
  platform?: string;
  /** Business domain (default 'ecommerce'). */
  domain?: string;
  /** Ranking profile to consume for ranking attention. */
  rankingProfile?: RankingProfileName;
}

export interface SituationRunResult {
  created: number;
  skipped: number;
  /** situationIds actually inserted this run (for P0010.1 automatic investigation). */
  createdIds: string[];
  situations: Situation[];
}

const DEFAULT_SHOP_NAME = '京东店铺';
const DEFAULT_PLATFORM = 'jd';
const DEFAULT_DOMAIN = 'ecommerce';
const DEFAULT_RANKING_PROFILE = 'operator_mode';

/** Extract a store-level daily_summary observation from a persisted Signal row. */
const toDailyObservation = (s: Signal): StoreDailyObservation | null => {
  if (s.signal_name !== 'daily_summary') return null;
  const metrics = (s as unknown as { metrics?: unknown }).metrics;
  if (metrics === null || typeof metrics !== 'object') return null;
  const record = metrics as Record<string, number>;
  if (Object.keys(record).length === 0) return null;
  return { date: s.observed_at.slice(0, 10), metrics: record };
};

/**
 * Run the Situation Producer against persisted data. Idempotent — re-running
 * within the same observation window dedupes via deterministic situation ids.
 */
export const runSituationProducer = (db: Db, options: SituationProducerOptions): SituationRunResult => {
  const shopId = options.shopId;
  const shopName = options.shopName ?? DEFAULT_SHOP_NAME;
  const platform = options.platform ?? DEFAULT_PLATFORM;
  const domain = options.domain ?? DEFAULT_DOMAIN;
  const rankingProfile = options.rankingProfile ?? DEFAULT_RANKING_PROFILE;

  // 1. Load store daily_summary signals (entity_type 'product', entity_id = shop).
  const storeDaily = SignalFacade.list(db, 'product', shopId)
    .map(toDailyObservation)
    .filter((o): o is StoreDailyObservation => o !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. Load rankings + product names (for ranking-attention detection).
  const rankings = RankingFacade.load(db, rankingProfile);
  const productNames: Record<string, string> = {};
  for (const p of listProducts(db)) productNames[p.product_id] = p.name || p.product_id;

  // 3. Detect (pure, deterministic).
  const situations = detectSituations({
    shop: { id: shopId, name: shopName, platform, domain },
    storeDaily,
    rankings,
    productNames,
  });

  // 4. Persist (dedup via deterministic situationId + INSERT OR IGNORE).
  const insert = db.prepare(
    `INSERT OR IGNORE INTO situations (
       situation_id, domain, type, entity_id, entity_type, entity_name, entity_platform,
       observed_at, window_start, window_end, description, tags, lifecycle, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
  );

  let created = 0;
  let skipped = 0;
  const createdIds: string[] = [];
  const now = nowIso();
  const persist = db.transaction((rows: readonly Situation[]) => {
    for (const s of rows) {
      const parsed = SituationSchema.safeParse(s);
      if (!parsed.success) continue; // defensive — builders always produce valid Situations
      const info = insert.run(
        s.situationId,
        s.domain,
        s.type,
        s.entity.id,
        s.entity.type,
        s.entity.name ?? null,
        s.entity.platform ?? null,
        s.temporal.observedAt,
        s.temporal.windowStart ?? null,
        s.temporal.windowEnd ?? null,
        s.description,
        JSON.stringify(s.tags ?? []),
        now,
        now,
      );
      if (info.changes > 0) { created++; createdIds.push(s.situationId); } else skipped++;
    }
  });
  persist(situations);

  return { created, skipped, createdIds, situations };
};

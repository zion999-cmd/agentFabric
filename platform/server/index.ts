// Express HTTP server. Mounts API routes + serves the workspace SPA.

import express from 'express';
import type { Express } from 'express';
import type { Database as Db } from 'better-sqlite3';
import { resolve } from 'node:path';
import { healthRouter } from './routes/health.js';
import { rankingRouter } from './routes/ranking.js';
import { memoryRouter, reviewsRouter, traceRouter } from './routes/reviews.js';
import { workspaceRouter } from './routes/workspace.js';
import { chatRouter } from './routes/chat.js';
import { runtimeRouter } from './routes/runtime.js';
import { p0007Router } from './routes/p0007.js';
import { situationChatRouter } from './routes/situation-chat.js';
import { openDb } from '#platform/storage/connection.js';

export interface ServerOptions {
  db: Db;
  workspaceDir?: string;
}

/** Create the Express app with all routes mounted. */
export const createServer = (options: ServerOptions): Express => {
  const { db, workspaceDir } = options;
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // API routes.
  app.use('/api', healthRouter());
  app.use('/api', rankingRouter(db));
  app.use('/api', reviewsRouter(db));
  app.use('/api', memoryRouter(db));
  app.use('/api', traceRouter(db));
  app.use('/api', workspaceRouter(db));
  app.use('/api', chatRouter(db));
  app.use('/api', runtimeRouter(db));
  app.use('/api', p0007Router(db));
  // P0008.3 — Situation Chat Bridge (Hermes session integration).
  // Lazy: only connects to Hermes serve on first chat. Session mapping held server-side.
  app.use(
    '/api',
    situationChatRouter({
      workspaceDir: resolve(process.cwd(), 'data', 'fabric-workspace'),
      profile: 'default',
      db,
    }),
  );

  // Dashboard SPA (vanilla JS). Served as static files.
  const dashDir = workspaceDir ?? resolve(process.cwd(), 'apps/ecommerce/workspace');
  app.use(express.static(dashDir));

  return app;
};

/** Start the server on a port. Returns the http.Server. */
export const startServer = (options: ServerOptions, port: number = Number(process.env.PORT ?? 3000)) => {
  const app = createServer(options);
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[agentFabric] workspace running at http://localhost:${port}`);
  });
};

// P0009: supplement missing recent data on startup. Traverses the last N days and
// runs the runtime pipeline with a local-first (live-on-miss) acquire, so the
// "今日工作" / "经营观察" views have up-to-date signals/rankings with timestamps.
// Runs in the background — never blocks the HTTP server.
const backfillRecentData = async (db: Db, days = 7): Promise<void> => {
  try {
    const { createRuntimeKernel } = await import('#app/runtime/kernel/index.js');
    const { loadBlueprint } = await import('#app/connectors/binding/loader.js');
    const { createLocalFirstLiveAcquire } = await import('#app/connectors/jd/historical-acquire.js');

    const blueprint = loadBlueprint('jd');
    const kernel = createRuntimeKernel(db, blueprint, createLocalFirstLiveAcquire());

    // Prepare the JD browser session (Chrome + 商智 page) — the acquisition
    // dependency. Idempotent; login itself stays a human boundary (Pass 1.1).
    const { ensureJdSession } = await import('#app/connectors/jd/acquisition/session-lifecycle.js');
    const session = await ensureJdSession();
    // eslint-disable-next-line no-console
    console.log(
      `[backfill] jd session: chrome=${session.chrome} page=${session.jdPage}` +
        (session.ready ? '' : ' (acquisition will fail honestly if not logged in)'),
    );

    const to = new Date(Date.now() - 86400_000); // yesterday (today is not final yet)
    const from = new Date(to.getTime() - (days - 1) * 86400_000);
    const dates: string[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }

    let completed = 0;
    let latestTopProducts: import('#app/connectors/jd/parsers/index.js').JdProductTopEntry[] = [];
    const missed: string[] = [];
    for (const date of dates) {
      const result = await kernel.execute({ shopId: 'jd_shop_001', mock: false, date });
      if (result.success) {
        completed++;
        if (result.parsed?.top_products && result.parsed.top_products.length > 0) {
          latestTopProducts = result.parsed.top_products;
        }
      } else {
        missed.push(`${date}${result.errors.length > 0 ? ` (${result.errors[0]})` : ''}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[backfill] ${completed}/${dates.length} days completed (${dates[0]} ~ ${dates[dates.length - 1]})` +
        (missed.length > 0 ? ` · ${missed.length} missed: ${missed.join('; ')}` : ''),
    );

    // Regenerate rankings from the JD productTop (real per-SKU GMV).
    // Ranking Data Consolidation: the stale agentCMS migration data is REMOVED from
    // the canonical ranking input — productTop is now the only source. No JD data
    // means no ranking (honest empty, no fabricated differences).
    const { RankingFacade } = await import('#app/analysis/decision/facade.js');
    const { generateProductTopSignals } = await import('#app/analysis/metrics/product-top-signals.js');
    const productTopSignals = generateProductTopSignals(latestTopProducts);
    if (productTopSignals.length > 0) {
      const rankings = RankingFacade.rankByProfile(productTopSignals, 'operator_mode', []);
      RankingFacade.store(db, 'operator_mode', rankings);
      // eslint-disable-next-line no-console
      console.log(`[backfill] rankings regenerated from JD productTop (${rankings.length} ranked / ${productTopSignals.length} signals)`);
    }

    // P0009.1: generate Situations from the completed Signals/Rankings.
    // Idempotent — deterministic ids dedupe across restarts. No acquisition, no LLM.
    const { runSituationProducer } = await import('#app/runtime/situation/index.js');
    const situationResult = runSituationProducer(db, {
      shopId: 'jd_shop_001',
      shopName: '祁门红茶旗舰店',
    });
    // eslint-disable-next-line no-console
    console.log(`[backfill] situations: ${situationResult.created} created / ${situationResult.skipped} deduped`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[backfill] failed:', err instanceof Error ? err.message : String(err));
  }
};

// CLI entry: `npm run dev` / `npm start`
const main = (): void => {
  const db = openDb();
  startServer({ db });
  // Supplement missing data in the background (non-blocking).
  void backfillRecentData(db);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

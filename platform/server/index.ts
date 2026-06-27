// Express HTTP server. Mounts API routes + serves the workspace SPA.

import express from 'express';
import type { Express } from 'express';
import type { Database as Db } from 'better-sqlite3';
import { resolve } from 'node:path';
import { healthRouter } from './routes/health.js';
import { rankingRouter } from './routes/ranking.js';
import { memoryRouter, reviewsRouter, traceRouter } from './routes/reviews.js';
import { workspaceRouter } from './routes/workspace.js';
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

// CLI entry: `npm run dev` / `npm start`
const main = (): void => {
  const db = openDb();
  startServer({ db });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

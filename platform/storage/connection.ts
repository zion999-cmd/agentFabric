// SQLite connection management. better-sqlite3, WAL mode, foreign keys ON.

import Database from 'better-sqlite3';
import type { Database as Db } from 'better-sqlite3';

export const DEFAULT_DB_PATH = process.env.DB_PATH ?? './data/agentfabric.db';

/**
 * Open a SQLite database with WAL mode and safe pragmas.
 * Creates parent directories if needed.
 */
export const openDb = (path: string = DEFAULT_DB_PATH): Db => {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
};

/** Close a database handle, ignoring errors if already closed. */
export const closeDb = (db: Db): void => {
  try {
    db.close();
  } catch {
    // already closed
  }
};

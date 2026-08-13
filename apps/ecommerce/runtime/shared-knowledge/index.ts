// P0008.4 — Agent Shared Knowledge Layer initializer.
// Creates the knowledge-sources/ (immutable raw) + knowledge/ (Read Model)
// directory structure and seeds it with the governance contract + minimal fixtures.
//
// This is NOT a Wiki Engine. It is a thin structure initializer. The "Agent
// Compilation" (raw → knowledge) is done by the Runtime, guided by KNOWLEDGE.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KNOWLEDGE_GOVERNANCE, KNOWLEDGE_INDEX } from './governance.js';
import { AGENTS_CONTRACT } from './contract.js';
import {
  RAW_PLATFORM_PROMOTION,
  RAW_MARKETING_CASE,
  SEED_PLATFORM_PAGE,
  SEED_INDEX,
  SEED_LOG,
} from './fixtures.js';

export * from './governance.js';
export * from './contract.js';
export * from './fixtures.js';

export interface SharedKnowledgeInitResult {
  /** Files created (relative paths) */
  files: string[];
}

/**
 * Initialize the Shared Knowledge Layer under a workspace root.
 *
 *   <root>/knowledge-sources/raw/   — immutable provenance sources
 *   <root>/knowledge/               — Agent-consumable Read Model
 *     KNOWLEDGE.md / INDEX.md / log.md / platform/
 *
 * Idempotent for seed files (overwrites with deterministic content);
 * does NOT delete any existing Agent-maintained knowledge pages.
 */
export const initSharedKnowledgeLayer = (workspaceRoot: string): SharedKnowledgeInitResult => {
  const files: string[] = [];

  const write = (relPath: string, content: string): void => {
    const abs = resolve(workspaceRoot, relPath);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf-8');
    files.push(relPath);
  };

  // Workspace-root AGENTS.md contract (Hermes natively loads from cwd).
  write('AGENTS.md', AGENTS_CONTRACT);

  // Immutable raw sources (provenance).
  write('knowledge-sources/raw/platform-promotion.md', RAW_PLATFORM_PROMOTION);
  write('knowledge-sources/raw/marketing-case.md', RAW_MARKETING_CASE);

  // Governance + navigation + log.
  write('knowledge/KNOWLEDGE.md', KNOWLEDGE_GOVERNANCE);
  write('knowledge/INDEX.md', SEED_INDEX);
  write('knowledge/log.md', SEED_LOG);

  // Seed compiled knowledge page.
  write('knowledge/platform/京东内容化推广.md', SEED_PLATFORM_PAGE);

  return { files };
};

/** Default governance/index content (re-export for projection convenience). */
export { KNOWLEDGE_GOVERNANCE, KNOWLEDGE_INDEX };

// FabricAgentWorkspace — exports the deterministic projector + filesystem writer.
// P0008.3 / P0008.6.
//
// P0008.6 persistence fix: writeProjection clears ONLY the directories it owns
// (systems/, capabilities/) and overwrites README.md. It does NOT rmSync the
// workspace root — that would destroy the PERSISTENT directories (knowledge/,
// knowledge-sources/raw/) that the Agent maintains.

export * from './projector.js';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProjectionInput, ProjectionResult } from './projector.js';
import { projectWorkspace } from './projector.js';

/** Top-level directories that are REGENERABLE and owned by the projector. */
const PROJECTED_DIRS = ['systems', 'capabilities'] as const;

/**
 * Write a projection to disk.
 * REBUILDABLE — clears the projected directories first (removing drift inside
 * them), then writes deterministically. ONE-WAY — only writes; never reads
 * workspace files back into authoritative state. PRESERVES persistent
 * directories (knowledge/, knowledge-sources/raw/) untouched.
 */
export const writeProjection = (
  input: ProjectionInput,
  targetDir: string,
): ProjectionResult => {
  const result = projectWorkspace(input);

  // Clear only the regenerable subdirectories, NOT the workspace root.
  for (const dir of PROJECTED_DIRS) {
    rmSync(resolve(targetDir, dir), { recursive: true, force: true });
  }

  for (const file of result.files) {
    const absPath = resolve(targetDir, file.path);
    mkdirSync(resolve(absPath, '..'), { recursive: true });
    writeFileSync(absPath, file.content, 'utf-8');
  }

  return result;
};

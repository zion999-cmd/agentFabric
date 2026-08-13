// FabricAgentWorkspace — exports the deterministic projector + filesystem writer.
// P0008.3.

export * from './projector.js';

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProjectionInput, ProjectionResult } from './projector.js';
import { projectWorkspace } from './projector.js';

/**
 * Write a projection to disk (REBUILDABLE — clears target first, then writes).
 * ONE-WAY — only writes; never reads workspace files back into authoritative state.
 */
export const writeProjection = (
  input: ProjectionInput,
  targetDir: string,
): ProjectionResult => {
  const result = projectWorkspace(input);

  // Rebuildable: clear target, then recreate deterministically.
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  for (const file of result.files) {
    const absPath = resolve(targetDir, file.path);
    mkdirSync(resolve(absPath, '..'), { recursive: true });
    writeFileSync(absPath, file.content, 'utf-8');
  }

  return result;
};

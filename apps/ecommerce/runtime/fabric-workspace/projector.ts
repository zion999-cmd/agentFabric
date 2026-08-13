// FabricAgentWorkspace Projector — projects authoritative state into a clean
// runtime-facing workspace directory that Hermes uses as its cwd.
//
// P0008.3. Design invariants:
//   1. DETERMINISTIC — same input → byte-identical output. Collections sorted,
//      stable formatting, no wall-clock in content.
//   2. ONE-WAY — the projector WRITES the workspace; it never reads files back
//      into authoritative state. Workspace edits by Hermes never mutate the
//      World Model / Capability / Situation source.
//   3. REBUILDABLE — re-running the projector regenerates the workspace from
//      authoritative state, discarding any drift.
//
// This is NOT a full Markdown Projector. It projects only the minimal JD fixture
// (World Model objects/assertions + Capability bindings).

import { createHash } from 'node:crypto';
import type { WorldModel, WorldObject, CapabilityBinding } from '#shared/schemas/world-model.js';

// ---- Projection Input ----

/** Authoritative state the projector consumes (read-only). */
export interface ProjectionInput {
  /** World Model (from P0008.2 contract) */
  worldModel: WorldModel;
  /** Capability bindings (World Object → CapabilityRegistry) */
  bindings: CapabilityBinding[];
  /** Optional current situation summary (P0007) */
  situation?: { situationId: string; description: string };
}

/** A projected file: relative path → content. */
export interface ProjectedFile {
  /** Path relative to workspace root, forward slashes */
  path: string;
  /** Deterministic content */
  content: string;
}

/** Result of a projection. */
export interface ProjectionResult {
  /** All projected files, sorted by path */
  files: ProjectedFile[];
  /** Deterministic content hash (sha256 of all files in order) */
  contentHash: string;
  /** Number of files */
  fileCount: number;
}

// ---- Helpers ----

const sortById = <T extends { id: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.id.localeCompare(b.id));

const mdHeading = (level: number, text: string): string =>
  `${'#'.repeat(level)} ${text}\n`;

/** Group objects by type, return a stable {type → objects} map with sorted values. */
const groupObjectsByType = (model: WorldModel): Map<string, WorldObject[]> => {
  const map = new Map<string, WorldObject[]>();
  for (const obj of sortById(model.objects)) {
    const list = map.get(obj.type) ?? [];
    list.push(obj);
    map.set(obj.type, list);
  }
  return map;
};

// ---- Section Renderers ----

const renderSystem = (model: WorldModel): string => {
  const system = model.objects.find((o) => o.type === 'system');
  let md = mdHeading(2, 'System');
  md += `\n${system?.name ?? model.systemId} (${model.systemId})\n`;
  if (system?.attributes && Object.keys(system.attributes).length > 0) {
    md += `\n${Object.entries(system.attributes).map(([k, v]) => `- ${k}: ${String(v)}`).join('\n')}\n`;
  }
  return md;
};

const renderObjects = (title: string, objects: WorldObject[]): string => {
  let md = mdHeading(2, title);
  if (objects.length === 0) {
    md += '\n(none)\n';
    return md;
  }
  for (const obj of objects) {
    md += `\n### ${obj.name} (\`${obj.id}\`)\n`;
    if (obj.attributes && Object.keys(obj.attributes).length > 0) {
      md += Object.entries(obj.attributes)
        .map(([k, v]) => `- ${k}: ${String(v)}`)
        .join('\n') + '\n';
    }
  }
  return md;
};

const renderAssertions = (model: WorldModel): string => {
  let md = mdHeading(2, 'Assertions');
  const sorted = sortById(model.assertions);
  if (sorted.length === 0) {
    md += '\n(none)\n';
    return md;
  }
  for (const a of sorted) {
    const status = `[${a.epistemicStatus}${a.temporalStatus !== 'active' ? `/${a.temporalStatus}` : ''}]`;
    md += `\n- ${a.subjectId} \`${a.predicate}\` ${a.objectRef} ${status}`;
    if (a.evidenceRefs.length > 0) md += ` (evidence: ${a.evidenceRefs.join(', ')})`;
    md += '\n';
  }
  return md;
};

const renderBindings = (bindings: CapabilityBinding[]): string => {
  let md = mdHeading(2, 'Capability Bindings');
  const sorted = sortById(bindings);
  if (sorted.length === 0) {
    md += '\n(none)\n';
    return md;
  }
  for (const b of sorted) {
    md += `\n- ${b.worldObjectId} \`${b.relationship}\` ${b.capabilityId} [${b.epistemicStatus}]\n`;
  }
  return md;
};

// ---- Projector ----

/**
 * Project authoritative state into a deterministic set of workspace files.
 * Pure function: no filesystem I/O, no wall-clock. The caller writes files.
 */
export const projectWorkspace = (input: ProjectionInput): ProjectionResult => {
  const { worldModel: model, bindings, situation } = input;
  const files: ProjectedFile[] = [];
  const byType = groupObjectsByType(model);

  // README.md — workspace orientation
  let readme = mdHeading(1, `Fabric Agent Workspace — ${model.systemId}`);
  readme += `\nThis workspace exposes a clean, read-only projection of the business world.\n`;
  readme += `It is generated deterministically from agentFabric authoritative state.\n`;
  readme += `Edits here are NOT written back to the World Model.\n`;
  files.push({ path: 'README.md', content: readme });

  // world/<systemId>/ — per-primitive files
  const worldBase = `world/${model.systemId}`;
  files.push({ path: `${worldBase}/system.md`, content: renderSystem(model) });
  files.push({
    path: `${worldBase}/surfaces.md`,
    content: renderObjects('Surfaces', byType.get('surface') ?? []),
  });
  files.push({
    path: `${worldBase}/features.md`,
    content: renderObjects('Features (Affordances)', byType.get('feature') ?? []),
  });
  files.push({
    path: `${worldBase}/metrics.md`,
    content: renderObjects('Metrics', byType.get('metric') ?? []),
  });
  files.push({
    path: `${worldBase}/dimensions.md`,
    content: renderObjects('Dimensions', byType.get('dimension') ?? []),
  });
  files.push({
    path: `${worldBase}/constraints.md`,
    content: renderObjects('Constraints', byType.get('constraint') ?? []),
  });
  files.push({ path: `${worldBase}/assertions.md`, content: renderAssertions(model) });

  // capability/bindings.md
  files.push({ path: 'capability/bindings.md', content: renderBindings(bindings) });

  // situation/current.md (optional)
  if (situation) {
    files.push({
      path: 'situation/current.md',
      content: mdHeading(2, 'Current Situation') + `\n${situation.situationId}: ${situation.description}\n`,
    });
  }

  // Deterministic ordering + hash
  const sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path));
  const contentHash = hashFiles(sortedFiles);

  return { files: sortedFiles, contentHash, fileCount: sortedFiles.length };
};

// ---- Deterministic hash ----

const hashFiles = (files: ProjectedFile[]): string => {
  // SHA-256 of concatenated "path\ncontent\n" — deterministic, stable ordering.
  const h = createHash('sha256');
  for (const f of files) {
    h.update(`${f.path}\n${f.content}\n`);
  }
  return h.digest('hex');
};

// FabricAgentWorkspace Projector — projects authoritative state into a clean
// runtime-facing workspace directory that Hermes uses as its cwd.
//
// P0008.3 / P0008.6. Design invariants:
//   1. DETERMINISTIC — same input → byte-identical output. Collections sorted,
//      stable formatting, no wall-clock in content.
//   2. ONE-WAY — the projector WRITES the workspace; it never reads files back
//      into authoritative state. Workspace edits by Hermes never mutate the
//      World Model / Capability source.
//   3. REBUILDABLE — re-running the projector regenerates the PROJECTED
//      directories (systems/, capabilities/) from authoritative state. It does
//      NOT clear persistent directories (knowledge/, knowledge-sources/raw/).
//
// P0008.6 topology: systems/ (was world/) + capabilities/ (was capability/).
// systems/INDEX.md and capabilities/INDEX.md are NAVIGATION MAPS only —
// they carry no instruction and no answers.

import { createHash } from 'node:crypto';
import type { WorldModel, WorldObject, CapabilityBinding } from '#shared/schemas/world-model.js';
import type { CapabilityContractEntry } from '#app/connectors/capability/contract-types.js';

// ---- Projection Input ----

/** Authoritative state the projector consumes (read-only). */
export interface ProjectionInput {
  /** World Model (from P0008.2 contract) */
  worldModel: WorldModel;
  /** Capability bindings (World Object → CapabilityRegistry) — P0008.2 contract */
  bindings: CapabilityBinding[];
  /** Capability contract entries (from the authoritative CapabilityRegistry) */
  capabilities?: CapabilityContractEntry[];
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

const sortByCapability = (items: readonly CapabilityContractEntry[]): CapabilityContractEntry[] =>
  [...items].sort((a, b) => a.capability.localeCompare(b.capability));

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

/** Navigation map for systems/ — no instruction, no answers, only "where to look". */
const renderSystemsIndex = (model: WorldModel): string => {
  const system = model.objects.find((o) => o.type === 'system');
  const name = system?.name ?? model.systemId;
  let md = mdHeading(1, 'Systems Index');
  md += '\nThis workspace models the following external systems:\n\n';
  md += `## ${model.systemId} (${name})\n\n`;
  md += `Primitives live under \`systems/${model.systemId}/\`:\n\n`;
  md += '- `system.md` — what the system IS (identity, shop, rating, navigation modules)\n';
  md += '- `surfaces.md` — the pages/surfaces of the system\n';
  md += '- `features.md` — features / affordances\n';
  md += '- `metrics.md` — metrics and their definitions\n';
  md += '- `dimensions.md` — dimensions (time, comparison benchmarks, …)\n';
  md += '- `constraints.md` — constraints (data freshness, paywalls)\n';
  md += '- `assertions.md` — assertions (subject → predicate → object, with epistemic + temporal status)\n';
  md += '\n## Navigation\n\n';
  md += '- "what is this system / which shop / its rating" → `system.md`\n';
  md += '- "what metrics exist" → `metrics.md`\n';
  md += '- "what dimensions / comparison benchmarks" → `dimensions.md`\n';
  md += '- "what constraints / freshness / paywalls" → `constraints.md`\n';
  md += '- "what surfaces / pages" → `surfaces.md`\n';
  md += '- "what features / affordances" → `features.md`\n';
  md += '- "what is asserted (and its status)" → `assertions.md`\n';
  return md;
};

/** Navigation map for capabilities/ — list by domain, no answers. */
const renderCapabilitiesIndex = (capabilities: readonly CapabilityContractEntry[]): string => {
  let md = mdHeading(1, 'Capability Index');
  md += '\nFabric can observe or answer the following business questions (from the authoritative CapabilityRegistry).\n';
  if (capabilities.length === 0) {
    md += '\n(none)\n';
    return md;
  }
  const byDomain = new Map<string, CapabilityContractEntry[]>();
  for (const cap of capabilities) {
    const list = byDomain.get(cap.domain) ?? [];
    list.push(cap);
    byDomain.set(cap.domain, list);
  }
  for (const domain of [...byDomain.keys()].sort()) {
    md += `\n## ${domain}\n`;
    for (const cap of sortByCapability(byDomain.get(domain) ?? [])) {
      const icon =
        cap.validation.status === 'verified' ? '✅' :
        cap.validation.status === 'captured' ? '⚠️' :
        cap.validation.status === 'premium_required' ? '💰' : '⬜';
      md += `- ${icon} ${cap.capability} — ${cap.name} (\`capabilities/${cap.capability}.md\`)\n`;
    }
  }
  return md;
};

/** Per-capability card — a projection of one CapabilityContractEntry (not a redefinition). */
const renderCapabilityCard = (cap: CapabilityContractEntry): string => {
  let md = mdHeading(1, `${cap.capability} — ${cap.name}`);
  md += `\n- **Domain**: ${cap.domain}\n`;
  md += `- **Provider**: ${cap.provider.platform} (${cap.provider.acquisition})\n`;
  md += `- **Validation**: ${cap.validation.status}\n`;
  md += `- **Outputs**: ${cap.outputs.join(', ')}\n`;
  md += `\n${cap.description}\n`;
  if (cap.intent.length > 0) {
    md += '\n## Intents\n\n';
    for (const intent of cap.intent) md += `- ${intent}\n`;
  }
  if (cap.metrics.length > 0) {
    md += '\n## Metrics\n\n';
    for (const m of cap.metrics) {
      md += `- ${m.canonical} (${m.label}, ${m.unit}${m.verified ? ', verified' : ''})\n`;
    }
  }
  if (cap.dimensions.length > 0) {
    md += '\n## Dimensions\n\n';
    for (const d of cap.dimensions) md += `- ${d}\n`;
  }
  if (cap.constraints.notes) {
    md += `\n## Constraints\n\n${cap.constraints.notes}\n`;
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
  const capabilities = sortByCapability(input.capabilities ?? []);
  const files: ProjectedFile[] = [];
  const byType = groupObjectsByType(model);

  // README.md — human-facing orientation
  let readme = mdHeading(1, `Fabric Agent Workspace — ${model.systemId}`);
  readme += `\nThis workspace exposes a clean, read-only projection of the business world.\n`;
  readme += `It is generated deterministically from agentFabric authoritative state.\n`;
  readme += `Edits here are NOT written back to the World Model.\n`;
  files.push({ path: 'README.md', content: readme });

  // systems/<systemId>/ — navigation map + per-primitive files
  const systemsBase = `systems/${model.systemId}`;
  files.push({ path: 'systems/INDEX.md', content: renderSystemsIndex(model) });
  files.push({ path: `${systemsBase}/system.md`, content: renderSystem(model) });
  files.push({
    path: `${systemsBase}/surfaces.md`,
    content: renderObjects('Surfaces', byType.get('surface') ?? []),
  });
  files.push({
    path: `${systemsBase}/features.md`,
    content: renderObjects('Features (Affordances)', byType.get('feature') ?? []),
  });
  files.push({
    path: `${systemsBase}/metrics.md`,
    content: renderObjects('Metrics', byType.get('metric') ?? []),
  });
  files.push({
    path: `${systemsBase}/dimensions.md`,
    content: renderObjects('Dimensions', byType.get('dimension') ?? []),
  });
  files.push({
    path: `${systemsBase}/constraints.md`,
    content: renderObjects('Constraints', byType.get('constraint') ?? []),
  });
  files.push({ path: `${systemsBase}/assertions.md`, content: renderAssertions(model) });

  // capabilities/ — navigation map + P0008.2 bindings + per-capability cards
  files.push({ path: 'capabilities/INDEX.md', content: renderCapabilitiesIndex(capabilities) });
  files.push({ path: 'capabilities/bindings.md', content: renderBindings(bindings) });
  for (const cap of capabilities) {
    files.push({ path: `capabilities/${cap.capability}.md`, content: renderCapabilityCard(cap) });
  }

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

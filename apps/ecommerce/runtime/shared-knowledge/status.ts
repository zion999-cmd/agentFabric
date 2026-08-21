// Knowledge Ingest Status — pure Fabric-side inspection of the Shared Knowledge layer.
// P0008.4 §10 defines the Ingest flow (executed by the Agent). This module is the
// Fabric CONTROLSIDE of that flow: it enumerates raw sources and marks whether each
// has been referenced by a knowledge page's provenance (`sources:` frontmatter).
//
// It does NOT read/summarize raw content, generate knowledge pages, or run any
// LLM. That is the Agent's job (KNOWLEDGE.md Operations → Ingest).

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative, basename } from 'node:path';

/** A single raw source under knowledge-sources/raw/. */
export interface RawSourceStatus {
  /** Workspace-root-relative path, e.g. knowledge-sources/raw/platform-promotion.md */
  path: string;
  /** File basename */
  file: string;
  /** Size in bytes */
  size: number;
  /** Whether any knowledge page's `sources:` frontmatter references this raw source. */
  referenced: boolean;
  /** Knowledge pages (workspace-relative) whose provenance references this source. */
  referencedBy: string[];
}

/** Snapshot of the knowledge layer's ingest state. */
export interface KnowledgeStatus {
  workspaceDir: string;
  sources: RawSourceStatus[];
  total: number;
  referencedCount: number;
  pendingCount: number;
}

/** Recursively list files under a directory (empty when dir missing). */
const listFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out.sort();
};

/** Extract the `sources:` value from a knowledge page's YAML frontmatter. */
export const parseFrontmatterSources = (content: string): string[] => {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  const fm = m[1] as string;
  const lines = fm.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^sources:[ \t]*(.*)$/.test(l));
  if (idx === -1) return [];

  const first = (lines[idx] as string).match(/^sources:[ \t]*(.*)$/)![1]!.trim();
  const items: string[] = [];

  // Array form — single-line (sources: [a, b]) or multi-line (sources: [\n  a,\n  b\n])
  if (first.startsWith('[')) {
    let joined = first;
    let j = idx;
    while (!joined.includes(']') && j + 1 < lines.length) {
      j++;
      joined += '\n' + (lines[j] as string);
    }
    const inner = joined.slice(joined.indexOf('[') + 1, joined.lastIndexOf(']'));
    for (const part of inner.split(/[,\n]/)) {
      const v = part.trim().replace(/^['"]|['"]$/g, '');
      if (v) items.push(v);
    }
    return items;
  }

  // List form: sources:\n  - knowledge-sources/raw/a.md
  if (first === '' || first === 'null') {
    for (let j = idx + 1; j < lines.length; j++) {
      const line = lines[j] as string;
      if (!/^\s*-\s*\S/.test(line)) break; // end of list (next frontmatter key)
      const v = line.replace(/^\s*-\s*/, '').trim().replace(/^['"]|['"]$/g, '');
      if (v) items.push(v);
    }
  }
  return items;
};

/**
 * Collect every raw path referenced by any knowledge page's `sources:` frontmatter.
 * Returns a map: normalized raw path → workspace-relative page paths that cite it.
 */
export const collectReferencedSources = (workspaceRoot: string): Map<string, string[]> => {
  const referenced = new Map<string, string[]>();
  const knowledgeDir = resolve(workspaceRoot, 'knowledge');
  for (const abs of listFiles(knowledgeDir)) {
    if (!abs.endsWith('.md')) continue;
    let content = '';
    try {
      content = readFileSync(abs, 'utf-8');
    } catch {
      continue;
    }
    const pageRel = relative(workspaceRoot, abs);
    for (const ref of parseFrontmatterSources(content)) {
      if (!ref) continue;
      const norm = ref.replace(/^\.\//, '');
      const pages = referenced.get(norm) ?? [];
      if (!pages.includes(pageRel)) pages.push(pageRel);
      referenced.set(norm, pages);
    }
  }
  return referenced;
};

/** Enumerate raw sources and mark provenance-referenced state (pure, no LLM). */
export const buildKnowledgeStatus = (workspaceRoot: string): KnowledgeStatus => {
  const rawDir = resolve(workspaceRoot, 'knowledge-sources', 'raw');
  const referenced = collectReferencedSources(workspaceRoot);

  const sources: RawSourceStatus[] = listFiles(rawDir).map((abs) => {
    const path = relative(workspaceRoot, abs);
    const file = basename(abs);
    let size = 0;
    try {
      size = statSync(abs).size;
    } catch {
      size = 0;
    }

    // Exact workspace-relative match first; fall back to basename match so a
    // slightly-differently-written source path still surfaces as referenced.
    const byPath = referenced.get(path) ?? [];
    let referencedBy = byPath;
    if (referencedBy.length === 0) {
      const base = file;
      for (const [refPath, pages] of referenced) {
        if (refPath.split('/').pop() === base) {
          referencedBy = pages;
          break;
        }
      }
    }

    return { path, file, size, referenced: referencedBy.length > 0, referencedBy: [...referencedBy] };
  });

  return {
    workspaceDir: workspaceRoot,
    sources,
    total: sources.length,
    referencedCount: sources.filter((s) => s.referenced).length,
    pendingCount: sources.filter((s) => !s.referenced).length,
  };
};

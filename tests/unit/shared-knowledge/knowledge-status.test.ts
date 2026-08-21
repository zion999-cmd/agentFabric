// Unit tests for the Knowledge Ingest status (pure Fabric-side inspection).
// Verifies: raw enumeration, provenance (sources:) marking across both YAML
// frontmatter forms, and pending/referenced counts.

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import {
  buildKnowledgeStatus,
  collectReferencedSources,
  parseFrontmatterSources,
} from '#app/runtime/shared-knowledge/status.js';

let root: string;

beforeEach(() => {
  root = resolve(tmpdir(), `kstatus-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
  mkdirSync(resolve(root, 'knowledge-sources', 'raw'), { recursive: true });
  mkdirSync(resolve(root, 'knowledge', 'platform'), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const write = (relPath: string, content: string): void => {
  const abs = resolve(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf-8');
};

describe('parseFrontmatterSources', () => {
  test('parses inline array form', () => {
    const md = '---\ntitle: X\nsources: [knowledge-sources/raw/a.md, "knowledge-sources/raw/b.md"]\n---\nbody';
    expect(parseFrontmatterSources(md)).toEqual(['knowledge-sources/raw/a.md', 'knowledge-sources/raw/b.md']);
  });

  test('parses list form', () => {
    const md = '---\ntitle: X\nsources:\n  - knowledge-sources/raw/a.md\n  - knowledge-sources/raw/b.md\n---\nbody';
    expect(parseFrontmatterSources(md)).toEqual(['knowledge-sources/raw/a.md', 'knowledge-sources/raw/b.md']);
  });

  test('parses multi-line array form (as Hermes emits it)', () => {
    const md = '---\ntitle: X\nsources: [\n  knowledge-sources/raw/a.md,\n  knowledge-sources/raw/b.md\n]\n---\nbody';
    expect(parseFrontmatterSources(md)).toEqual(['knowledge-sources/raw/a.md', 'knowledge-sources/raw/b.md']);
  });

  test('returns [] when no frontmatter or no sources key', () => {
    expect(parseFrontmatterSources('no frontmatter')).toEqual([]);
    expect(parseFrontmatterSources('---\ntitle: X\n---\nbody')).toEqual([]);
  });
});

describe('buildKnowledgeStatus', () => {
  test('marks referenced vs pending by provenance', () => {
    write('knowledge-sources/raw/platform-promotion.md', '# raw a');
    write('knowledge-sources/raw/marketing-case.md', '# raw b');
    write('knowledge/platform/京东内容化推广.md', [
      '---',
      'title: 京东内容化推广',
      'sources: [knowledge-sources/raw/platform-promotion.md]',
      '---',
      '# compiled',
    ].join('\n'));

    const status = buildKnowledgeStatus(root);

    expect(status.total).toBe(2);
    expect(status.referencedCount).toBe(1);
    expect(status.pendingCount).toBe(1);

    const a = status.sources.find((s) => s.file === 'platform-promotion.md')!;
    const b = status.sources.find((s) => s.file === 'marketing-case.md')!;
    expect(a.referenced).toBe(true);
    expect(a.referencedBy).toContain('knowledge/platform/京东内容化推广.md');
    expect(b.referenced).toBe(false);
    expect(b.referencedBy).toEqual([]);
  });

  test('empty raw dir yields empty status', () => {
    const status = buildKnowledgeStatus(root);
    expect(status.total).toBe(0);
    expect(status.sources).toEqual([]);
  });

  test('list-form provenance marks referenced too', () => {
    write('knowledge-sources/raw/a.md', '# a');
    write('knowledge/pages/one.md', [
      '---',
      'title: one',
      'sources:',
      '  - knowledge-sources/raw/a.md',
      '---',
      '# body',
    ].join('\n'));

    const status = buildKnowledgeStatus(root);
    expect(status.sources[0]!.referenced).toBe(true);
  });

  test('collectReferencedSources keys by normalized path', () => {
    write('knowledge/pages/one.md', [
      '---',
      'title: one',
      'sources: [./knowledge-sources/raw/a.md]',
      '---',
      '# body',
    ].join('\n'));
    const refs = collectReferencedSources(root);
    expect(refs.get('knowledge-sources/raw/a.md')).toContain('knowledge/pages/one.md');
  });
});

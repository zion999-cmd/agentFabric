// P0008.4 — Agent Shared Knowledge Layer tests.
// Verifies: governance contract, directory structure, immutable raw, provenance.

import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { initSharedKnowledgeLayer } from '#app/runtime/shared-knowledge/index.js';
import { KNOWLEDGE_GOVERNANCE, KNOWLEDGE_INDEX, AGENTS_CONTRACT } from '#app/runtime/shared-knowledge/index.js';

const TEST_ROOT = resolve(tmpdir(), 'shared-knowledge-test');

describe('KNOWLEDGE.md governance contract', () => {
  it('specifies raw is immutable', () => {
    expect(KNOWLEDGE_GOVERNANCE).toContain('immutable');
    expect(KNOWLEDGE_GOVERNANCE).toContain('NEVER modify');
  });

  it('specifies one source may update multiple pages', () => {
    expect(KNOWLEDGE_GOVERNANCE).toContain('One source may update multiple pages');
  });

  it('specifies contradiction preservation (no silent overwrite)', () => {
    expect(KNOWLEDGE_GOVERNANCE).toContain('PRESERVE');
    expect(KNOWLEDGE_GOVERNANCE).toContain('Never silently overwrite');
  });

  it('specifies provenance (sources in frontmatter)', () => {
    expect(KNOWLEDGE_GOVERNANCE).toContain('sources');
    expect(KNOWLEDGE_GOVERNANCE).toContain('provenance');
  });

  it('is governance, NOT business knowledge', () => {
    // Governance should not contain domain-specific business guidance.
    expect(KNOWLEDGE_GOVERNANCE).not.toContain('流量下降先看访客数');
  });

  it('INDEX is a navigation map, not a page dump', () => {
    expect(KNOWLEDGE_INDEX).toContain('Knowledge Index');
    expect(KNOWLEDGE_INDEX).toContain('Platform');
    expect(KNOWLEDGE_INDEX).toContain('Cases');
  });
});

describe('AGENTS.md — Fabric Agent Workspace Contract', () => {
  it('describes workspace topology (world/knowledge/raw)', () => {
    expect(AGENTS_CONTRACT).toContain('world/');
    expect(AGENTS_CONTRACT).toContain('knowledge/');
    expect(AGENTS_CONTRACT).toContain('knowledge-sources/raw/');
  });

  it('specifies read/write boundaries (world + raw read-only, knowledge writable)', () => {
    expect(AGENTS_CONTRACT).toContain('READ-ONLY');
    expect(AGENTS_CONTRACT).toContain('never modify');
    expect(AGENTS_CONTRACT).toContain('maintain Shared Knowledge here');
  });

  it('points to KNOWLEDGE.md, does NOT copy its content', () => {
    expect(AGENTS_CONTRACT).toContain('knowledge/KNOWLEDGE.md');
    // AGENTS.md is a contract/pointer, not a duplicate of KNOWLEDGE.md governance rules.
    expect(AGENTS_CONTRACT).not.toContain('One source may update multiple pages');
  });

  it('declares Runtime Self ownership (Memory/Skill/Soul NOT in workspace)', () => {
    expect(AGENTS_CONTRACT).toContain('Memory');
    expect(AGENTS_CONTRACT).toContain('Runtime profile');
    expect(AGENTS_CONTRACT).toContain('NOT this workspace');
  });

  it('is written to workspace ROOT (cwd), where Hermes natively loads', () => {
    const result = initSharedKnowledgeLayer(TEST_ROOT);
    expect(result.files).toContain('AGENTS.md');
    expect(existsSync(resolve(TEST_ROOT, 'AGENTS.md'))).toBe(true);
  });
});

describe('initSharedKnowledgeLayer', () => {
  afterAll(() => {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('creates the correct directory structure', () => {
    const result = initSharedKnowledgeLayer(TEST_ROOT);
    expect(result.files).toContain('knowledge-sources/raw/platform-promotion.md');
    expect(result.files).toContain('knowledge-sources/raw/marketing-case.md');
    expect(result.files).toContain('knowledge/KNOWLEDGE.md');
    expect(result.files).toContain('knowledge/INDEX.md');
    expect(result.files).toContain('knowledge/log.md');
    expect(result.files).toContain('knowledge/platform/京东内容化推广.md');
  });

  it('writes immutable raw sources to disk', () => {
    const raw = readFileSync(resolve(TEST_ROOT, 'knowledge-sources/raw/platform-promotion.md'), 'utf-8');
    expect(raw).toContain('内容化推广');
    expect(raw).toContain('CPM');
  });

  it('writes compiled knowledge page with provenance (sources frontmatter)', () => {
    const page = readFileSync(resolve(TEST_ROOT, 'knowledge/platform/京东内容化推广.md'), 'utf-8');
    expect(page).toContain('sources:');
    expect(page).toContain('knowledge-sources/raw/platform-promotion.md');
  });

  it('is idempotent — re-init does not delete or error', () => {
    const r1 = initSharedKnowledgeLayer(TEST_ROOT);
    const r2 = initSharedKnowledgeLayer(TEST_ROOT);
    expect(r1.files.length).toBe(r2.files.length);
    expect(existsSync(resolve(TEST_ROOT, 'knowledge/KNOWLEDGE.md'))).toBe(true);
  });
});

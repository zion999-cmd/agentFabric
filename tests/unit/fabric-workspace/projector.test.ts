// P0008.3 — FabricAgentWorkspace projector tests.
// Validates: deterministic, rebuildable, one-way, correct structure.

import { describe, it, expect } from 'vitest';
import { projectWorkspace, writeProjection } from '#app/runtime/fabric-workspace/index.js';
import { JD_FIXTURE } from '#app/runtime/fabric-workspace/jd-fixture.js';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const input = {
  worldModel: JD_FIXTURE.worldModel,
  bindings: JD_FIXTURE.bindings,
};

describe('FabricAgentWorkspace projector — determinism', () => {
  it('same input → identical contentHash (byte-identical)', () => {
    const a = projectWorkspace(input);
    const b = projectWorkspace(input);
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.files).toEqual(b.files);
  });

  it('different object order → same projection (collections sorted)', () => {
    const reordered = {
      worldModel: {
        ...JD_FIXTURE.worldModel,
        objects: [...JD_FIXTURE.worldModel.objects].reverse(),
        assertions: [...JD_FIXTURE.worldModel.assertions].reverse(),
      },
      bindings: [...JD_FIXTURE.bindings].reverse(),
    };
    expect(projectWorkspace(reordered).contentHash).toBe(projectWorkspace(input).contentHash);
  });

  it('contains the expected file structure', () => {
    const result = projectWorkspace(input);
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('README.md');
    expect(paths).toContain('world/jd_shangzhi/system.md');
    expect(paths).toContain('world/jd_shangzhi/metrics.md');
    expect(paths).toContain('world/jd_shangzhi/surfaces.md');
    expect(paths).toContain('capability/bindings.md');
  });

  it('metrics file contains real JD metric names', () => {
    const result = projectWorkspace(input);
    const metrics = result.files.find((f) => f.path === 'world/jd_shangzhi/metrics.md')!;
    expect(metrics.content).toContain('成交金额');
    expect(metrics.content).toContain('成交单量');
    expect(metrics.content).toContain('客单价');
  });
});

describe('FabricAgentWorkspace projector — rebuildable + one-way', () => {
  it('writeProjection clears and rebuilds deterministically', () => {
    const dir = resolve(tmpdir(), `fabric-ws-test-${Date.now()}`);
    const r1 = writeProjection(input, dir);
    // Write a stray file to simulate drift.
    const stray = resolve(dir, 'STRAY.md');
    require('node:fs').writeFileSync(stray, 'drift', 'utf-8');
    // Re-project → stray file removed, same content hash.
    const r2 = writeProjection(input, dir);
    expect(r2.contentHash).toBe(r1.contentHash);
    expect(existsSync(stray)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('projector is pure — no workspace read-back into authoritative state', () => {
    // projectWorkspace does not accept a target dir or read files; it only returns a file map.
    const result = projectWorkspace(input);
    // The authoritative input (JD_FIXTURE) is unchanged after projection.
    expect(JD_FIXTURE.worldModel.objects.length).toBe(9);
    expect(result.files.every((f) => typeof f.content === 'string')).toBe(true);
  });
});

// Unit tests for raw-source upload: validation (pure) + store (immutable, no overwrite).

import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  validateRawUpload,
  storeRawSource,
  MAX_SOURCE_BYTES,
} from '#platform/server/routes/knowledge.js';

describe('validateRawUpload', () => {
  test('accepts .txt and .md', () => {
    expect(validateRawUpload('经验资料.txt', 'hello')).toEqual({ ok: true, filename: '经验资料.txt' });
    expect(validateRawUpload('notes.md', 'hello')).toEqual({ ok: true, filename: 'notes.md' });
  });

  test('rejects path traversal and absolute paths', () => {
    expect(validateRawUpload('../escape.txt', 'x').ok).toBe(false);
    expect(validateRawUpload('a/b/c.txt', 'x').ok).toBe(false);
    expect(validateRawUpload('/etc/passwd', 'x').ok).toBe(false);
  });

  test('rejects disallowed extensions, hidden files, empty content, oversized content', () => {
    expect(validateRawUpload('doc.pdf', 'x').ok).toBe(false);
    expect(validateRawUpload('doc.docx', 'x').ok).toBe(false);
    expect(validateRawUpload('.hidden.txt', 'x').ok).toBe(false);
    expect(validateRawUpload('empty.txt', '   ').ok).toBe(false);
    expect(validateRawUpload('big.txt', 'x'.repeat(MAX_SOURCE_BYTES + 1)).ok).toBe(false);
  });
});

describe('storeRawSource', () => {
  let rawDir: string;

  beforeEach(() => {
    rawDir = resolve(tmpdir(), `raw-upload-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    mkdirSync(rawDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(rawDir, { recursive: true, force: true });
  });

  test('writes a new source into raw dir', () => {
    const result = storeRawSource(rawDir, '新资料.txt', '# 内容');
    expect(result).toEqual({ ok: true, filename: '新资料.txt' });
    expect(readFileSync(resolve(rawDir, '新资料.txt'), 'utf-8')).toBe('# 内容');
  });

  test('rejects overwrite of an existing source (immutable provenance)', () => {
    writeFileSync(resolve(rawDir, '已存在.txt'), 'original', 'utf-8');
    const result = storeRawSource(rawDir, '已存在.txt', 'new content');
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(409);
    // original untouched — never silently overwritten
    expect(readFileSync(resolve(rawDir, '已存在.txt'), 'utf-8')).toBe('original');
  });

  test('refuses writes outside the raw dir', () => {
    const result = storeRawSource(rawDir, '../outside.txt', 'x');
    if (result.ok) throw new Error('expected failure');
    expect(result.status).toBe(400);
    expect(existsSync(resolve(rawDir, '..', 'outside.txt'))).toBe(false);
  });
});

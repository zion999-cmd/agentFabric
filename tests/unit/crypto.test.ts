import { describe, expect, test } from 'vitest';
import { fingerprint, uuid } from '#shared/utils/crypto.js';

describe('fingerprint', () => {
  test('deterministic for identical values', () => {
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
  });

  test('differs for different values', () => {
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });

  test('order-independent for nested objects', () => {
    expect(fingerprint({ outer: { x: 1, y: 2 } })).toBe(fingerprint({ outer: { y: 2, x: 1 } }));
  });

  test('array order matters', () => {
    expect(fingerprint([1, 2])).not.toBe(fingerprint([2, 1]));
  });

  test('handles primitives and null', () => {
    expect(typeof fingerprint(null)).toBe('string');
    expect(typeof fingerprint(42)).toBe('string');
    expect(typeof fingerprint('hello')).toBe('string');
  });
});

describe('uuid', () => {
  test('produces a 36-char v4 string', () => {
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('unique across calls', () => {
    expect(uuid()).not.toBe(uuid());
  });
});

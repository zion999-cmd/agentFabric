// Crypto helpers: deterministic fingerprinting + UUID. Uses node:crypto.

import { createHash, randomUUID } from 'node:crypto';

/**
 * Deterministic SHA-256 fingerprint of a JSON-serializable value.
 * Keys are sorted canonically so object key order does not affect the hash.
 */
export const fingerprint = (value: unknown): string => {
  const canonical = canonicalJson(value);
  return createHash('sha256').update(canonical).digest('hex');
};

/** RFC 4122 v4 UUID. */
export const uuid = (): string => randomUUID();

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
};

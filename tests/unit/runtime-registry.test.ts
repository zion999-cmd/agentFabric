// Unit tests for InMemoryRuntimeRegistry.
// Covers register, get, list, unregister, and resolve filtering.

import { describe, expect, test, beforeEach } from 'vitest';
import { InMemoryRuntimeRegistry } from '#platform/runtime/registry.js';
import type { RuntimeCapability } from '#platform/runtime/types.js';

const makeCap = (
  overrides: Partial<RuntimeCapability> = {},
): RuntimeCapability => ({
  runtime_id: 'test-runtime',
  display_name: 'Test Runtime',
  supported_actions: [],
  available: true,
  metadata: {},
  ...overrides,
});

describe('InMemoryRuntimeRegistry', () => {
  let registry: InMemoryRuntimeRegistry;

  beforeEach(() => {
    registry = new InMemoryRuntimeRegistry();
  });

  test('register and retrieve a runtime', () => {
    const cap = makeCap({ runtime_id: 'hermes', display_name: 'Hermes' });
    registry.register(cap);
    expect(registry.get('hermes')).toEqual(cap);
  });

  test('get returns undefined for unknown runtime', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  test('list returns all registered runtimes', () => {
    registry.register(makeCap({ runtime_id: 'a', display_name: 'A' }));
    registry.register(makeCap({ runtime_id: 'b', display_name: 'B', available: false }));
    expect(registry.list()).toHaveLength(2);
  });

  test('list returns empty array when nothing registered', () => {
    expect(registry.list()).toHaveLength(0);
  });

  test('unregister removes a runtime', () => {
    registry.register(makeCap({ runtime_id: 'x' }));
    registry.unregister('x');
    expect(registry.get('x')).toBeUndefined();
    expect(registry.list()).toHaveLength(0);
  });

  test('unregister is idempotent', () => {
    registry.register(makeCap({ runtime_id: 'x' }));
    registry.unregister('x');
    registry.unregister('x'); // Should not throw.
    expect(registry.get('x')).toBeUndefined();
  });

  test('resolve filters by action and availability', () => {
    registry.register(makeCap({
      runtime_id: 'hermes',
      supported_actions: ['summarize_top_ranking'],
      available: true,
    }));
    registry.register(makeCap({
      runtime_id: 'codex',
      supported_actions: ['other_action'],
      available: true,
    }));
    registry.register(makeCap({
      runtime_id: 'offline',
      supported_actions: ['summarize_top_ranking'],
      available: false,
    }));

    const resolved = registry.resolve('summarize_top_ranking');
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.runtime_id).toBe('hermes');
  });

  test('resolve returns empty array when no runtime supports the action', () => {
    registry.register(makeCap({
      runtime_id: 'hermes',
      supported_actions: ['other_action'],
      available: true,
    }));

    expect(registry.resolve('unknown_action')).toHaveLength(0);
  });

  test('register overwrites existing runtime with same id', () => {
    registry.register(makeCap({ runtime_id: 'x', display_name: 'Old' }));
    registry.register(makeCap({ runtime_id: 'x', display_name: 'New' }));
    expect(registry.get('x')!.display_name).toBe('New');
    expect(registry.list()).toHaveLength(1);
  });

  test('register creates independent copies (no mutation)', () => {
    const cap = makeCap({ runtime_id: 'x', display_name: 'Original' });
    registry.register(cap);
    cap.display_name = 'Mutated';
    // The stored entry should be independent.
    expect(registry.get('x')!.display_name).toBe('Original');
  });
});

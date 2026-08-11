// In-memory RuntimeRegistry implementation. Tracks available runtimes and their capabilities.

import type { RuntimeCapability, RuntimeRegistry } from './types.js';

export class InMemoryRuntimeRegistry implements RuntimeRegistry {
  private readonly runtimes = new Map<string, RuntimeCapability>();

  register(runtime: RuntimeCapability): void {
    this.runtimes.set(runtime.runtime_id, { ...runtime });
  }

  unregister(runtimeId: string): void {
    this.runtimes.delete(runtimeId);
  }

  get(runtimeId: string): RuntimeCapability | undefined {
    return this.runtimes.get(runtimeId);
  }

  list(): RuntimeCapability[] {
    return [...this.runtimes.values()];
  }

  resolve(action: string): RuntimeCapability[] {
    return this.list().filter(
      (r) => r.available && r.supported_actions.includes(action),
    );
  }
}

// Stub Hermes client — returns a canned result. Used by tests and HERMES_CLIENT=stub dev mode.

import type { HermesClient } from './types.js';
import type { HermesOneShotRequest, HermesOneShotResult } from './types.js';

/**
 * A stub client that echoes a canned business summary. It never shells out,
 * so the project runs end-to-end without Python/Hermes installed.
 */
export class StubHermesClient implements HermesClient {
  isAvailable(): boolean {
    return true;
  }

  async oneShot(req: HermesOneShotRequest): Promise<HermesOneShotResult> {
    const canned = `[stub-hermes] no runtime called. prompt was:\n${req.prompt.slice(0, 200)}`;
    return {
      stdout: canned,
      exitCode: 0,
      durationMs: 1,
    };
  }
}

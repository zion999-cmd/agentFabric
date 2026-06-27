// Subprocess Hermes client — invokes `hermes -z "<prompt>" --source tool -Q ...` via child_process.
// Never imports Hermes internals. The Runtime is replaceable: swap this class to switch runtimes.

import { spawn, spawnSync } from 'node:child_process';
import { HermesUnavailableError, type HermesClient } from './types.js';
import type { HermesOneShotRequest, HermesOneShotResult } from './types.js';

const HERMES_BIN = process.env.HERMES_BIN ?? 'hermes';
const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Build the CLI argv for a top-level one-shot turn.
 * Contract: `hermes -z "<prompt>" [-m MODEL] [--provider P] [-t TOOLSETS]
 *   [--skills SKILLS] [--safe-mode] [--ignore-user-config]`.
 * (-z oneshot already prints only the final response to stdout; no banner.)
 */
const buildArgs = (req: HermesOneShotRequest): string[] => {
  const args = ['-z', req.prompt];
  if (req.model) args.push('-m', req.model);
  if (req.provider) args.push('--provider', req.provider);
  if (req.toolsets) args.push('-t', req.toolsets);
  if (req.skills) args.push('--skills', req.skills);
  if (req.safeMode) args.push('--safe-mode');
  if (req.ignoreUserConfig) args.push('--ignore-user-config');
  return args;
};

export class SubprocessHermesClient implements HermesClient {
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  isAvailable(): boolean {
    // Quick synchronous probe: `hermes --version` should exit 0.
    try {
      const res = spawnSync(HERMES_BIN, ['--version'], { timeout: 5000 });
      return res.status === 0;
    } catch {
      return false;
    }
  }

  async oneShot(req: HermesOneShotRequest): Promise<HermesOneShotResult> {
    const args = buildArgs(req);
    const start = Date.now();

    return new Promise<HermesOneShotResult>((resolve, reject) => {
      const child = spawn(HERMES_BIN, args, { timeout: this.timeoutMs });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', (err: Error) => {
        reject(
          new HermesUnavailableError(
            `Failed to spawn ${HERMES_BIN}: ${err.message}. Is Hermes installed and on PATH?`,
          ),
        );
      });
      child.on('close', (code: number | null) => {
        const durationMs = Date.now() - start;
        if (code !== 0) {
          reject(
            new HermesUnavailableError(
              `hermes exited with code ${code}. stderr: ${stderr.slice(0, 500)}`,
            ),
          );
          return;
        }
        resolve({
          stdout: stdout.trimEnd(),
          exitCode: code,
          durationMs,
        });
      });
    });
  }
}

import { describe, expect, test } from 'vitest';
import { StubHermesClient } from '#platform/runtime/hermes/stub-client.js';
import { HermesOneShotRequestSchema, HermesOneShotResultSchema } from '#platform/runtime/hermes/types.js';
import { createHermesClient } from '#platform/runtime/hermes/index.js';

describe('hermes client contract (stub round-trip)', () => {
  test('stub is available and returns a valid result', async () => {
    const client = new StubHermesClient();
    expect(client.isAvailable()).toBe(true);

    const req = HermesOneShotRequestSchema.parse({
      prompt: 'Summarize the top product ranking.',
    });
    const result = await client.oneShot(req);

    // Result must round-trip the Zod schema (pins the contract for subprocess swap).
    const parsed = HermesOneShotResultSchema.parse(result);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.stdout.length).toBeGreaterThan(0);
  });

  test('factory returns stub in test env', () => {
    const client = createHermesClient();
    expect(client.isAvailable()).toBe(true);
  });

  test('request schema defaults safeMode=false, ignoreUserConfig=false', () => {
    const req = HermesOneShotRequestSchema.parse({ prompt: 'hi' });
    expect(req.safeMode).toBe(false);
    expect(req.ignoreUserConfig).toBe(false);
  });
});

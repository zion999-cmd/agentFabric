// Capability loader — reads the authoritative CapabilityRegistry source
// (generated/capability-contract.json) and returns the capability entries for
// projection into workspace/capabilities/.
//
// P0008.6. This is a PROJECTION input loader, not a redefinition of capability.
// The CapabilityRegistry remains the single authoritative source; the projector
// only reads it and renders Markdown cards.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCapabilityRegistry } from '#app/connectors/capability/index.js';
import type { CapabilityContractEntry } from '#app/connectors/capability/contract-types.js';

const CONTRACT_PATH = resolve(process.cwd(), 'generated', 'capability-contract.json');

/**
 * Load all capability entries from the authoritative contract.
 * Returns [] if the contract is missing or invalid — the projector renders an
 * empty capabilities/INDEX.md rather than failing workspace generation.
 */
export const loadCapabilityEntries = (): CapabilityContractEntry[] => {
  if (!existsSync(CONTRACT_PATH)) {
    return [];
  }
  try {
    const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf-8'));
    const registry = createCapabilityRegistry();
    registry.loadContract(contract);
    return registry.listAll();
  } catch {
    return [];
  }
};

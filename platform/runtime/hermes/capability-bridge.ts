// Capability Bridge — connects HermesAgent to agentFabric's CapabilityRegistry.
// Phase 3.2: HermesAgent uses this bridge to discover what data capabilities exist.
//
// Design: this is a READ-ONLY bridge. It tells HermesAgent WHAT is available,
// not HOW to acquire data. Acquisition is owned by Runtime Kernel (Phase 3.3+).
//
// Usage pattern:
//   1. HermesAgent receives user prompt: "分析流量下降原因"
//   2. HermesAgent calls bridge.searchByIntent(prompt)
//   3. Bridge returns capability candidates with scores
//   4. HermesAgent selects best capability
//   5. HermesAgent constructs ExecutionRequest with capability ID
//   6. Runtime Kernel executes (Phase 3.3+)

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCapabilityRegistry } from '#app/connectors/capability/index.js';
import type { CapabilityRegistry, ContractMatch } from '#app/connectors/capability/index.js';

// ---- Bridge Interface ----

export interface CapabilityDiscoveryResult {
  /** The top-ranked capability match */
  bestMatch: ContractMatch | null;
  /** All candidate capabilities, ranked by relevance */
  candidates: ContractMatch[];
  /** Total capabilities available in the system */
  totalCapabilities: number;
  /** Available business domains */
  domains: string[];
}

export interface CapabilityBridge {
  /**
   * Discover capabilities matching a user intent.
   * Returns ranked candidates — HermesAgent selects the best one.
   */
  searchByIntent(intent: string): CapabilityDiscoveryResult;

  /**
   * Get a specific capability by ID.
   * Used when HermesAgent already knows which capability to use
   * (e.g., from context or previous session).
   */
  getById(capabilityId: string): ContractMatch['entry'] | null;

  /**
   * List capabilities available in a domain.
   * Used for browsing / user clarification.
   */
  findByDomain(domain: string): ContractMatch['entry'][];

  /**
   * Get a summary of available capabilities.
   * Lightweight — useful for prompt context.
   */
  getSummary(): { totalCapabilities: number; domains: string[]; platforms: string[] };
}

// ---- Implementation ----

const CONTRACT_PATH = resolve(process.cwd(), 'generated', 'capability-contract.json');

let _registry: CapabilityRegistry | null = null;

const getRegistry = (): CapabilityRegistry => {
  if (!_registry) {
    if (!existsSync(CONTRACT_PATH)) {
      throw new Error(
        'Capability Contract not found at ' + CONTRACT_PATH +
        '. Run "npm run cli -- generate-contract" first.',
      );
    }
    const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf-8'));
    _registry = createCapabilityRegistry();
    _registry.loadContract(contract);
  }
  return _registry;
};

/**
 * Create a CapabilityBridge connected to the generated contract.
 * The bridge is stateless — the contract is read-only.
 */
export const createCapabilityBridge = (): CapabilityBridge => {
  const registry = getRegistry();

  return {
    searchByIntent(intent: string): CapabilityDiscoveryResult {
      const matches = registry.searchByIntent(intent);
      const summary = registry.getSummary();
      return {
        bestMatch: matches.length > 0 ? matches[0]! : null,
        candidates: matches.slice(0, 5),
        totalCapabilities: summary.total_capabilities,
        domains: summary.domains,
      };
    },

    getById(capabilityId: string): ContractMatch['entry'] | null {
      return registry.getById(capabilityId);
    },

    findByDomain(domain: string): ContractMatch['entry'][] {
      return registry.findByDomain(domain);
    },

    getSummary() {
      const s = registry.getSummary();
      return {
        totalCapabilities: s.total_capabilities,
        domains: s.domains,
        platforms: s.platforms,
      };
    },
  };
};

/**
 * Reset cached registry. Used in tests to reload the contract.
 */
export const resetCapabilityBridge = (): void => {
  _registry = null;
};

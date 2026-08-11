// Capability Registry — the platform-agnostic query interface for capability contracts.
// P0006.5.3: This is the API that Hermes (or any agent runtime) calls to discover
// what data capabilities are available, organized by business intent, not technical endpoint.
//
// The Registry is platform-agnostic by design:
//   Hermes asks: "I need traffic.overview"
//   Registry resolves: JD connector provides this via CDP
//   Hermes never sees: "szgateway.jd.com" or "getFlowDetail.ajax"
//
// Multi-platform support: the Registry can hold multiple contracts (JD, Tmall, Amazon)
// and return capabilities from any platform that satisfies the query.
//
// Usage:
//   const registry = createCapabilityRegistry();
//   registry.loadContract(jdContract);
//   registry.loadContract(tmallContract);  // future
//   const capabilities = registry.findByDomain('traffic');
//   const matches = registry.searchByIntent('分析流量下降原因');

import type {
  CapabilityContract,
  CapabilityContractEntry,
  CapabilityMetric,
  ContractQuery,
  ContractMatch,
} from './contract-types.js';

// ---- Registry Interface ----

export interface CapabilityRegistry {
  /** Load a platform contract into the registry. Idempotent — replaces existing for same platform. */
  loadContract(contract: CapabilityContract): void;

  /** Get a specific platform contract. */
  getContract(platform: string): CapabilityContract | null;

  /** List all loaded platforms. */
  listPlatforms(): string[];

  /** Find all capabilities in a business domain (across all platforms). */
  findByDomain(domain: string): CapabilityContractEntry[];

  /** Find all capabilities that provide a given metric (across all platforms). */
  findByMetric(canonical: string): CapabilityContractEntry[];

  /** Get a single capability by ID (e.g. "traffic.overview"). */
  getById(capability: string): CapabilityContractEntry | null;

  /**
   * Search capabilities by business intent.
   * Matches against intent phrases, name, and description.
   * Returns ranked results — highest relevance first.
   */
  searchByIntent(query: string): ContractMatch[];

  /** Query with structured filters. */
  query(filters: ContractQuery): CapabilityContractEntry[];

  /** List all capabilities across all platforms. */
  listAll(): CapabilityContractEntry[];

  /** List all unique business domains across all platforms. */
  listDomains(): string[];

  /** List all verified metrics across all platforms. */
  listVerifiedMetrics(): CapabilityMetric[];

  /** Get aggregate summary across all platforms. */
  getSummary(): { total_capabilities: number; total_metrics: number; platforms: string[]; domains: string[] };

  /**
   * Describe a capability in human-readable form — suitable for LLM context injection.
   * Returns a compact text summary of what this capability provides.
   */
  describe(capability: string): string | null;
}

// ---- Implementation ----

export const createCapabilityRegistry = (): CapabilityRegistry => {
  // Platform → Contract
  const contracts = new Map<string, CapabilityContract>();

  // Pre-computed indexes
  let byDomain = new Map<string, CapabilityContractEntry[]>();
  let byMetric = new Map<string, CapabilityContractEntry[]>();
  let byCapability = new Map<string, CapabilityContractEntry>();

  const rebuildIndexes = (): void => {
    const newByDomain = new Map<string, CapabilityContractEntry[]>();
    const newByMetric = new Map<string, CapabilityContractEntry[]>();
    const newByCapability = new Map<string, CapabilityContractEntry>();

    for (const contract of contracts.values()) {
      for (const cap of contract.capabilities) {
        // Domain index
        const domain = cap.domain.toLowerCase();
        const domainList = newByDomain.get(domain) ?? [];
        domainList.push(cap);
        newByDomain.set(domain, domainList);

        // Metric index
        for (const m of cap.metrics) {
          const metricList = newByMetric.get(m.canonical) ?? [];
          metricList.push(cap);
          newByMetric.set(m.canonical, metricList);
        }

        // Capability ID index
        newByCapability.set(cap.capability, cap);
      }
    }

    byDomain = newByDomain;
    byMetric = newByMetric;
    byCapability = newByCapability;
  };

  return {
    loadContract(contract: CapabilityContract): void {
      contracts.set(contract.platform, contract);
      rebuildIndexes();
    },

    getContract(platform: string): CapabilityContract | null {
      return contracts.get(platform) ?? null;
    },

    listPlatforms(): string[] {
      return [...contracts.keys()];
    },

    findByDomain(domain: string): CapabilityContractEntry[] {
      return byDomain.get(domain.toLowerCase()) ?? [];
    },

    findByMetric(canonical: string): CapabilityContractEntry[] {
      return byMetric.get(canonical) ?? [];
    },

    getById(capability: string): CapabilityContractEntry | null {
      return byCapability.get(capability) ?? null;
    },

    searchByIntent(query: string): ContractMatch[] {
      return searchByIntent(contracts, query);
    },

    query(filters: ContractQuery): CapabilityContractEntry[] {
      return queryContracts(contracts, filters);
    },

    listAll(): CapabilityContractEntry[] {
      return [...byCapability.values()];
    },

    listDomains(): string[] {
      return [...new Set([...byDomain.keys()])].sort();
    },

    listVerifiedMetrics(): CapabilityMetric[] {
      const verified: CapabilityMetric[] = [];
      for (const cap of byCapability.values()) {
        for (const m of cap.metrics) {
          if (m.verified) verified.push(m);
        }
      }
      return verified;
    },

    getSummary() {
      const allCaps = [...byCapability.values()];
      const allMetrics = new Set<string>();
      for (const cap of allCaps) {
        for (const m of cap.metrics) allMetrics.add(m.canonical);
      }
      return {
        total_capabilities: allCaps.length,
        total_metrics: allMetrics.size,
        platforms: [...contracts.keys()],
        domains: [...new Set(allCaps.map((c) => c.domain))].sort(),
      };
    },

    describe(capability: string): string | null {
      const cap = byCapability.get(capability);
      if (!cap) return null;

      const validationIcon =
        cap.validation.status === 'verified' ? '✅' :
        cap.validation.status === 'captured' ? '⚠️' :
        cap.validation.status === 'premium_required' ? '💰' :
        cap.validation.status === 'popup_blocked' ? '🚧' : '⬜';

      const verifiedMetrics = cap.metrics
        .filter((m) => m.verified)
        .map((m) => m.canonical)
        .join(', ');

      const lines = [
        `${validationIcon} **${cap.capability}** — ${cap.name}`,
        `   Domain: ${cap.domain} | Provider: ${cap.provider.platform} (${cap.provider.acquisition})`,
        `   Description: ${cap.description}`,
        `   Outputs: ${cap.outputs.join(', ')}`,
      ];

      if (verifiedMetrics) {
        lines.push(`   Verified: ${verifiedMetrics}`);
      }
      if (cap.constraints.notes) {
        lines.push(`   ⚠️ ${cap.constraints.notes}`);
      }

      lines.push(`   Intents: ${cap.intent.slice(0, 5).join(' | ')}`);

      return lines.join('\n');
    },
  };
};

// ---- Search Engine ----

const tokenize = (query: string): string[] => {
  const cleaned = query
    .toLowerCase()
    .replace(/[.,?!，。？！、：:；;（）()【】\[\]'"]/g, ' ');

  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);

  // Generate bigrams for CJK-heavy tokens (improves Chinese substring matching)
  const expanded: string[] = [...tokens];
  for (const token of tokens) {
    // If token is mostly CJK characters, generate 2-char and 3-char substrings
    const cjkCount = (token.match(/[一-鿿]/g) || []).length;
    if (cjkCount >= 3 && cjkCount / token.length > 0.5) {
      for (let i = 0; i <= token.length - 2; i++) {
        expanded.push(token.slice(i, i + 2));
      }
      // 3-grams for longer tokens
      if (token.length >= 5) {
        for (let i = 0; i <= token.length - 3; i++) {
          expanded.push(token.slice(i, i + 3));
        }
      }
    }
  }

  return [...new Set(expanded)]; // deduplicate
};

const scoreEntry = (entry: CapabilityContractEntry, tokens: string[]): { score: number; reason: string } => {
  let score = 0;
  const reasons: string[] = [];

  const nameLower = entry.name.toLowerCase();
  const descLower = entry.description.toLowerCase();
  const domainLower = entry.domain.toLowerCase();
  const queryLower = tokens.join(' ');

  for (const token of tokens) {
    // Domain match — strongest signal
    if (domainLower.includes(token)) {
      score += 5;
      reasons.push(`domain:${entry.domain}`);
    }

    // Name match
    if (nameLower.includes(token)) {
      score += 4;
      reasons.push(`name:${entry.name}`);
    }

    // Description match
    if (descLower.includes(token)) {
      score += 3;
    }

    // Intent match — the primary search surface
    for (const intent of entry.intent) {
      const intentLower = intent.toLowerCase();
      // Exact token match or substring match (critical for Chinese)
      if (intentLower.includes(token) || token.includes(intentLower)) {
        score += 4;
        reasons.push(`intent:"${intent}"`);
        break;
      }
    }

    // Output match — what data the capability provides
    for (const output of entry.outputs) {
      if (output.includes(token)) {
        score += 3;
        reasons.push(`output:${output}`);
        break;
      }
    }

    // Dimension match
    for (const d of entry.dimensions) {
      if (d.includes(token)) {
        score += 2;
        reasons.push(`dimension:${d}`);
        break;
      }
    }
  }

  // Chinese substring matching: check if any part of the query appears in intent/description
  // This handles continuous Chinese text where words aren't space-separated
  for (const intent of entry.intent) {
    const intentLower = intent.toLowerCase();
    // Check if the intent is a substring of the full query
    if (queryLower.includes(intentLower)) {
      score += 5;
      reasons.push(`intent-substring:"${intent}"`);
    }
  }
  // Check if the query is a substring of any intent
  for (const intent of entry.intent) {
    if (intent.toLowerCase().includes(queryLower)) {
      score += 4;
      reasons.push(`query-in-intent:"${intent}"`);
      break;
    }
  }

  // Boost verified capabilities
  if (entry.validation.status === 'verified') {
    score *= 1.5;
  }

  // Penalize blocked capabilities
  if (
    entry.validation.status === 'premium_required' ||
    entry.validation.status === 'popup_blocked'
  ) {
    score *= 0.5;
  }

  return {
    score,
    reason: reasons.slice(0, 3).join('; ') || 'general match',
  };
};

const searchByIntent = (
  contracts: Map<string, CapabilityContract>,
  query: string,
): ContractMatch[] => {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const results: ContractMatch[] = [];
  for (const contract of contracts.values()) {
    for (const entry of contract.capabilities) {
      const { score, reason } = scoreEntry(entry, tokens);
      if (score > 0) {
        results.push({ entry, score, matchReason: reason });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
};

// ---- Structured Query ----

const queryContracts = (
  contracts: Map<string, CapabilityContract>,
  filters: ContractQuery,
): CapabilityContractEntry[] => {
  const all: CapabilityContractEntry[] = [];
  for (const contract of contracts.values()) {
    all.push(...contract.capabilities);
  }

  let results = all;

  // Filter by domain
  if (filters.domain) {
    const domain = filters.domain.toLowerCase();
    results = results.filter((e) => e.domain.toLowerCase() === domain);
  }

  // Filter by metric
  if (filters.metric) {
    results = results.filter((e) => e.metrics.some((m) => m.canonical === filters.metric));
  }

  // Filter by validation status
  if (filters.validationStatus && filters.validationStatus.length > 0) {
    results = results.filter((e) =>
      filters.validationStatus!.includes(e.validation.status),
    );
  }

  // Exclude blocked unless explicitly requested
  if (!filters.includeBlocked) {
    results = results.filter(
      (e) =>
        e.validation.status !== 'premium_required' &&
        e.validation.status !== 'popup_blocked',
    );
  }

  // Free-text search
  if (filters.search) {
    const tokens = tokenize(filters.search);
    const scored = results.map((entry) => ({
      entry,
      ...scoreEntry(entry, tokens),
    }));
    scored.sort((a, b) => b.score - a.score);
    results = scored.filter((s) => s.score > 0).map((s) => s.entry);
  }

  return results;
};

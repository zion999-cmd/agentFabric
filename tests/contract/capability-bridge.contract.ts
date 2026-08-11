// Phase 3.2 — CapabilityBridge contract tests.
// Validates that the bridge correctly connects HermesAgent to CapabilityRegistry.

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCapabilityBridge, resetCapabilityBridge } from '#platform/runtime/hermes/index.js';
import type { CapabilityBridge } from '#platform/runtime/hermes/index.js';

const CONTRACT_PATH = resolve(process.cwd(), 'generated', 'capability-contract.json');

describe('CapabilityBridge', () => {
  let bridge: CapabilityBridge;

  beforeAll(() => {
    resetCapabilityBridge();
    if (!existsSync(CONTRACT_PATH)) {
      // Generate the contract if it doesn't exist
      const { writeCapabilityContract } = require('#app/connectors/capability/index.js');
      writeCapabilityContract();
    }
    bridge = createCapabilityBridge();
  });

  describe('searchByIntent', () => {
    it('returns candidates for Chinese intent query', () => {
      const result = bridge.searchByIntent('分析流量下降原因');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch!.entry.capability).toBe('traffic.overview');
    });

    it('returns candidates for a business question', () => {
      const result = bridge.searchByIntent('今天卖了多少');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.bestMatch!.entry.capability).toBe('trade.overview');
    });

    it('returns ranked results (score descending)', () => {
      const result = bridge.searchByIntent('商品销售排行');
      expect(result.candidates.length).toBeGreaterThan(0);
      for (let i = 1; i < result.candidates.length; i++) {
        expect(result.candidates[i]!.score).toBeLessThanOrEqual(result.candidates[i - 1]!.score);
      }
    });

    it('includes summary metadata', () => {
      const result = bridge.searchByIntent('流量');
      expect(result.totalCapabilities).toBeGreaterThan(0);
      expect(result.domains.length).toBeGreaterThan(0);
      expect(result.domains).toContain('traffic');
    });

    it('limits candidates to top 5', () => {
      const result = bridge.searchByIntent('数据');
      expect(result.candidates.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getById', () => {
    it('returns a specific capability by ID', () => {
      const cap = bridge.getById('traffic.overview');
      expect(cap).not.toBeNull();
      expect(cap!.capability).toBe('traffic.overview');
      expect(cap!.domain).toBe('traffic');
      expect(cap!.outputs.length).toBeGreaterThan(0);
    });

    it('returns null for unknown capability', () => {
      const cap = bridge.getById('nonexistent.capability');
      expect(cap).toBeNull();
    });

    it('returns verified capability with correct status', () => {
      const cap = bridge.getById('trade.overview');
      expect(cap).not.toBeNull();
      expect(cap!.validation.status).toBe('verified');
    });
  });

  describe('findByDomain', () => {
    it('returns capabilities in a domain', () => {
      const caps = bridge.findByDomain('traffic');
      expect(caps.length).toBeGreaterThan(0);
      caps.forEach((c) => {
        expect(c.domain).toBe('traffic');
      });
    });

    it('returns empty array for unknown domain', () => {
      const caps = bridge.findByDomain('nonexistent');
      expect(caps.length).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('returns platform and domain summary', () => {
      const summary = bridge.getSummary();
      expect(summary.totalCapabilities).toBeGreaterThan(0);
      expect(summary.domains.length).toBeGreaterThan(0);
      expect(summary.platforms).toContain('jd');
    });
  });

  describe('contract integration', () => {
    it('each capability candidate has required fields for HermesAgent', () => {
      const result = bridge.searchByIntent('流量');
      result.candidates.forEach((match) => {
        const cap = match.entry;
        expect(cap.capability).toBeTruthy();
        expect(cap.name).toBeTruthy();
        expect(cap.description).toBeTruthy();
        expect(cap.intent.length).toBeGreaterThan(0);
        expect(cap.outputs.length).toBeGreaterThan(0);
        expect(cap.provider).toBeTruthy();
        expect(cap.provider.platform).toBeTruthy();
        expect(cap.validation).toBeTruthy();
      });
    });

    it('best match has a valid score', () => {
      const result = bridge.searchByIntent('分析流量下降原因');
      expect(result.bestMatch!.score).toBeGreaterThan(0);
    });
  });
});

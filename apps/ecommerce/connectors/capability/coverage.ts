// Phase 5: Coverage Analysis
// Compares Discovery (ground truth) vs current Connector implementation.
// Answers: what percentage of platform capability does our connector cover?

import type { CoverageReport } from './types.js';
import type { ConnectorBlueprint } from './types.js';
import type { ApiEndpoint } from '#app/connectors/discovery/types.js';
import { listApis } from '#app/connectors/discovery/api-inventory.js';
import { resolveAllIndicators } from '#app/connectors/discovery/indicator-dictionary.js';
import { generateManifestContexts } from '#app/connectors/discovery/business-context.js';
import { JD_INDICATOR_MAP } from '#app/connectors/jd/parsers/indicator-map.js';
import { JD_MANIFEST } from '#app/connectors/jd/manifest.js';

/** Information about the current connector implementation. */
export interface CurrentConnectorInfo {
  /** API endpoints currently handled by the connector */
  supported_apis: string[];
  /** Indicators currently mapped (keys from JD_INDICATOR_MAP) */
  supported_indicators: string[];
  /** Business contexts declared in manifest */
  declared_contexts: string[];
}

/**
 * Build a picture of the current connector's coverage.
 */
export const getCurrentConnectorInfo = (): CurrentConnectorInfo => {
  // APIs: the 3 endpoints the JD connector actually calls
  const supportedApis = ['summary.ajax', 'trend.ajax', 'productTop.ajax'];

  // Indicators: from the hand-written JD_INDICATOR_MAP
  const supportedIndicators = Object.keys(JD_INDICATOR_MAP);

  // Contexts: from the hand-written JD_MANIFEST
  const declaredContexts = JD_MANIFEST.business_context as readonly string[];

  return {
    supported_apis: supportedApis,
    supported_indicators: supportedIndicators,
    declared_contexts: [...declaredContexts],
  };
};

/**
 * Analyze coverage: Discovery (ground truth) vs. current Connector.
 */
export const analyzeCoverage = (
  blueprint?: ConnectorBlueprint,
): CoverageReport => {
  const discoveryEndpointsArr = listApis();
  const discoveryIndicators = resolveAllIndicators();
  const connectorInfo = getCurrentConnectorInfo();

  // Convert to record for generateManifestContexts
  const endpointsMap: Record<string, ApiEndpoint> = {};
  for (const ep of discoveryEndpointsArr) {
    endpointsMap[ep.name] = ep;
  }

  // Discovery baseline
  const allDiscoveryApis = discoveryEndpointsArr.map((ep) => ep.name);
  const allDiscoveryIndicators = [...discoveryIndicators.keys()].filter(
    (k) => {
      const v = discoveryIndicators.get(k);
      return v && v.canonical !== 'unknown';
    },
  );
  const discoveryContexts = blueprint?.manifest.business_context ??
    generateManifestContexts(endpointsMap, discoveryIndicators);

  // Connector coverage
  const connectorApis = connectorInfo.supported_apis;
  const connectorIndicators = connectorInfo.supported_indicators;
  const connectorContexts = connectorInfo.declared_contexts;

  // Calculate coverage
  const apiCoverage = allDiscoveryApis.length > 0
    ? Math.round((connectorApis.length / allDiscoveryApis.length) * 100)
    : 0;
  const indicatorCoverage = allDiscoveryIndicators.length > 0
    ? Math.round((connectorIndicators.length / allDiscoveryIndicators.length) * 100)
    : 0;
  const contextCoverage = discoveryContexts.length > 0
    ? Math.round((connectorContexts.length / discoveryContexts.length) * 100)
    : 0;

  // Find missing items
  const connectorApiSet = new Set(connectorApis);
  const connectorIndicatorSet = new Set(connectorIndicators);
  const connectorContextSet = new Set(connectorContexts.map((c) => c.toLowerCase()));

  const missingApis = allDiscoveryApis
    .filter((a) => !connectorApiSet.has(a))
    .slice(0, 20); // Top 20, avoid overwhelming

  const missingIndicators = allDiscoveryIndicators
    .filter((i) => !connectorIndicatorSet.has(i))
    .slice(0, 30);

  const missingContexts = discoveryContexts
    .filter((c) => !connectorContextSet.has(c.toLowerCase()));

  return {
    platform: 'jd',
    generated_at: new Date().toISOString(),
    discovery: {
      total_apis: allDiscoveryApis.length,
      total_indicators: allDiscoveryIndicators.length,
      total_contexts: discoveryContexts.length,
    },
    connector: {
      total_apis: connectorApis.length,
      total_indicators: connectorIndicators.length,
      total_contexts: connectorContexts.length,
    },
    coverage: {
      api_pct: apiCoverage,
      indicator_pct: indicatorCoverage,
      context_pct: contextCoverage,
    },
    missing_apis: missingApis,
    missing_indicators: missingIndicators,
    missing_contexts: missingContexts,
  };
};

/**
 * Generate a coverage report and optionally compare against a blueprint.
 */
export const generateCoverageReport = (
  blueprint?: ConnectorBlueprint,
): CoverageReport => analyzeCoverage(blueprint);

/**
 * Get only the missing APIs from a coverage report.
 */
export const getMissingApis = (report: CoverageReport): string[] =>
  report.missing_apis;

/**
 * Get only the missing indicators from a coverage report.
 */
export const getMissingIndicators = (report: CoverageReport): string[] =>
  report.missing_indicators;

/**
 * Coverage summary as human-readable text.
 */
export const formatCoverageSummary = (report: CoverageReport): string => {
  const { coverage, discovery, connector } = report;
  return [
    `Platform: ${report.platform}`,
    `API Coverage:      ${coverage.api_pct}% (${connector.total_apis}/${discovery.total_apis})`,
    `Indicator Coverage: ${coverage.indicator_pct}% (${connector.total_indicators}/${discovery.total_indicators})`,
    `Context Coverage:   ${coverage.context_pct}% (${connector.total_contexts}/${discovery.total_contexts})`,
    `Missing APIs: ${report.missing_apis.length}`,
    `Missing Indicators: ${report.missing_indicators.length}`,
    `Missing Contexts: ${report.missing_contexts.length}`,
  ].join('\n');
};

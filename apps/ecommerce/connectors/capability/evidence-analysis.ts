// Phase 2: Evidence Analysis
// Analyzes API response schemas to produce ParserPlan — which fields to parse,
// how to classify endpoints, and what strategy each endpoint needs.

import type { ParserRule, ParserPlan } from './types.js';
import type { ApiEndpoint, IndicatorMapping } from '#app/connectors/discovery/types.js';
import { listApis } from '#app/connectors/discovery/api-inventory.js';

// ---- Endpoint Strategy Classification ----

const TIME_SERIES_PATTERNS = ['dt', 'hour', 'day', 'date_', 'hourly', 'trend'];
const RANKING_PATTERNS = ['sku_id', 'rank', 'top', 'productTop', 'ordAmtIndex'];
const AGGREGATE_PATTERNS = ['gmv', 'amt', 'ord_qtty', 'deal_rate', 'summary'];

type Strategy = ParserRule['strategy'];

/**
 * Classify an endpoint's parsing strategy based on field name patterns.
 */
export const classifyEndpointStrategy = (endpoint: ApiEndpoint): Strategy => {
  const fieldNames = Object.keys(endpoint.fields);
  const allFields = fieldNames.join(' ');

  if (TIME_SERIES_PATTERNS.some((p) => allFields.includes(p))) return 'time_series';
  if (RANKING_PATTERNS.some((p) => allFields.includes(p))) return 'ranking';
  if (AGGREGATE_PATTERNS.some((p) => allFields.includes(p))) return 'aggregate';
  return 'raw';
};

/**
 * Analyze a single endpoint schema — identify parseable fields, types, and strategy.
 */
export const analyzeEndpointSchema = (
  endpoint: ApiEndpoint,
): {
  strategy: Strategy;
  parseable_fields: string[];
  field_types: Record<string, string>;
  is_paginated: boolean;
  is_time_series: boolean;
} => {
  const fields = endpoint.fields;
  const parseableFields: string[] = [];
  const fieldTypes: Record<string, string> = {};

  for (const [name, info] of Object.entries(fields)) {
    if (typeof info === 'object' && info !== null && 'type' in info) {
      const type = (info as { type: string }).type;
      fieldTypes[name] = type;
      // Include numeric fields and strings that look like metrics
      if (type === 'int' || type === 'float' || type === 'number') {
        parseableFields.push(name);
      }
    }
  }

  const strategy = classifyEndpointStrategy(endpoint);
  const hasPagination = parseableFields.some((f) => f.includes('pageIndex') || f.includes('pageSize') || f.includes('totalPage'));
  const hasTimeSeries = strategy === 'time_series';

  return {
    strategy,
    parseable_fields: parseableFields,
    field_types: fieldTypes,
    is_paginated: hasPagination,
    is_time_series: hasTimeSeries,
  };
};

/**
 * Generate parser rules for all endpoints.
 * Each rule maps which fields to extract and how to transform them.
 */
export const generateParserRules = (
  endpoints?: ApiEndpoint[],
  _indicatorMappings?: Map<string, IndicatorMapping>,
): ParserRule[] => {
  const apis = endpoints ?? listApis();

  return apis
    .filter((ep) => ep.field_count > 0)
    .map((ep) => {
      const analysis = analyzeEndpointSchema(ep);
      const fieldMapping: Record<string, string> = {};

      // Build field → canonical mapping from parseable fields
      for (const field of analysis.parseable_fields) {
        // Use the field name as the canonical name (normalizer handles renaming later)
        fieldMapping[field] = field.replace(/\./g, '_').replace(/^content\./, '');
      }

      return {
        endpoint: ep.name,
        strategy: analysis.strategy,
        fields_to_parse: analysis.parseable_fields,
        field_mapping: fieldMapping,
        is_paginated: analysis.is_paginated,
        is_time_series: analysis.is_time_series,
        data_quality: ep.field_count >= 10 ? 'high' : ep.field_count >= 3 ? 'medium' : 'low',
      };
    });
};

/**
 * Generate a complete ParserPlan from Discovery data.
 */
export const generateParserPlan = (
  endpoints?: ApiEndpoint[],
  indicatorMappings?: Map<string, IndicatorMapping>,
): ParserPlan => {
  const rules = generateParserRules(endpoints, indicatorMappings);

  return {
    generated_at: new Date().toISOString(),
    source: 'discovery/jd-capability',
    rules,
  };
};

/**
 * Get endpoint strategy summary — how many endpoints per strategy type.
 */
export const summarizeStrategies = (plan: ParserPlan): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const rule of plan.rules) {
    counts[rule.strategy] = (counts[rule.strategy] ?? 0) + 1;
  }
  return counts;
};

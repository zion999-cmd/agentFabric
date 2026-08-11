// P0005.2 Phase 4 — Business Context Generator.
//
// Business Context is NEVER defined by a programmer in a manifest.
// It is GENERATED from real API response field names.
//
// The CONTEXT_DETECTION_RULES constant is the single source of truth for
// field-pattern → context mapping.  Each rule connects concrete data fields
// (found in D0002 API responses) to a business context.
//
// All contexts were verified against actual JD 商智 API responses during D0002.

import { GeneratedBusinessContextSchema } from './types.js';
import type { ApiEndpoint, GeneratedBusinessContext, IndicatorMapping } from './types.js';

// ---------------------------------------------------------------------------
// Detection rules — the ONE place field→context knowledge lives
// ---------------------------------------------------------------------------

interface DetectionRule {
  context: string;
  field_patterns: readonly string[];
  category_match: readonly string[];
  minimum_matches: number;
}

/**
 * Business Context detection rules.
 *
 * Every rule is backed by real API fields observed during D0002 JD capability
 * discovery.  No rule was added based on page names or assumptions.
 *
 * VERIFIED SOURCES per context (from D0002 report):
 *
 *   TransactionContext  — summary.ajax fields (gmv, orders, customers, items_sold)
 *   TrafficContext      — getFlowHead.ajax, getChannelList.ajax fields
 *   CustomerContext     — growthSummary/summary.ajax (new/old/member/fan segments)
 *   ProductContext      — productTop.ajax, getProductList.ajax (sku_id, product gmv)
 *   IndustryContext     — getRealSummaryData.ajax (OrdAmtIndex, UVIndex, etc.)
 *   SupplyChainContext  — getAlarmOverview.ajax, getHealthOverview.ajax
 *   MarketingContext    — overview.ajax, getMarketingActivityList.ajax
 *   StoreContext        — shopLevel.ajax, getShopStars.ajax
 *   AdvertisingContext  — getIndustryTopTable.ajax, getOpenPromotionList.ajax
 *   SearchContext       — jdr_sch_search_click_page_qtty indicator key
 *   CompetitionContext  — NOT verified (requires premium subscription)
 */
export const CONTEXT_DETECTION_RULES: readonly Readonly<DetectionRule>[] = [
  {
    context: 'TransactionContext',
    field_patterns: [
      'gmv', 'deal', 'order', 'ord', 'trade', 'pay', 'refund', 'cancel',
      '成交', '金额', '下单', '订单', '付款',
    ],
    category_match: ['Transaction'],
    minimum_matches: 3,
  },
  {
    context: 'TrafficContext',
    field_patterns: [
      'visitor', 'traffic', 'brow', 'uv', 'pv', 'click', 'channel', 'source',
      '访客', '流量', '浏览', '渠道',
    ],
    category_match: ['Traffic'],
    minimum_matches: 3,
  },
  {
    context: 'CustomerContext',
    field_patterns: [
      'customer', 'cust', 'user', 'member', 'fan', 'new_customer',
      'old_customer', 'new', 'old', 'audience', 'client',
      '客户', '会员', '粉丝', '新客', '老客',
    ],
    category_match: ['Customer'],
    minimum_matches: 3,
  },
  {
    context: 'ProductContext',
    field_patterns: [
      'sku', 'spu', 'product', 'item', 'goods', 'category', 'brand',
      '商品', '品类', '品牌', 'sku',
    ],
    category_match: ['Product'],
    minimum_matches: 3,
  },
  {
    context: 'IndustryContext',
    field_patterns: [
      'industry', 'market', 'rank', 'index',
      '大盘', '行业', '排行', '榜单', 'index',
    ],
    category_match: ['Industry'],
    minimum_matches: 2,
  },
  {
    context: 'SupplyChainContext',
    field_patterns: [
      'stock', 'inventory', 'alarm', 'unsale', 'turnover', 'spot',
      'warehouse', 'supply', 'delivery', '配送', '库存', '仓储',
    ],
    category_match: [],
    minimum_matches: 2,
  },
  {
    context: 'MarketingContext',
    field_patterns: [
      'marketing', 'campaign', 'promotion', 'coupon', 'activity',
      '营销', '活动', '促销', '优惠', '券',
    ],
    category_match: [],
    minimum_matches: 2,
  },
  {
    context: 'StoreContext',
    field_patterns: [
      'shop', 'store', 'vender', 'biz', 'level', 'star', 'proposition',
      '店铺', '商家',
    ],
    category_match: [],
    minimum_matches: 2,
  },
  {
    context: 'AdvertisingContext',
    field_patterns: [
      'ad', 'advert', 'roi', 'cpa', 'cpc', 'ctr', 'cvr', 'impression',
      'campaign', 'creative', '广告', '推广',
    ],
    category_match: [],
    minimum_matches: 2,
  },
  {
    context: 'SearchContext',
    field_patterns: [
      'search', 'keyword', 'query', 'search_click',
      '搜索', '关键词',
    ],
    category_match: ['Search'],
    minimum_matches: 2,
  },
  {
    context: 'CompetitionContext',
    field_patterns: [
      'competitor', 'compete', 'rival', '竞品', '竞店', '竞争', '对比',
    ],
    category_match: [],
    minimum_matches: 2,
  },
];

// ---------------------------------------------------------------------------
// Field analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a set of API response field names against detection rules.
 *
 * Returns candidate contexts with confidence scores.
 * Confidence = field_match_score + category_bonus + density_bonus, capped at 1.0.
 */
export const analyzeFields = (
  fieldNames: string[],
  indicatorMappings?: Map<string, IndicatorMapping>,
): GeneratedBusinessContext[] => {
  const normalizedFields = fieldNames.map((f) => f.toLowerCase());
  const results: GeneratedBusinessContext[] = [];

  for (const rule of CONTEXT_DETECTION_RULES) {
    // Count matched patterns
    const matched: string[] = [];
    for (const pattern of rule.field_patterns) {
      const patternLower = pattern.toLowerCase();
      if (normalizedFields.some((f) => f.includes(patternLower))) {
        matched.push(pattern);
      }
    }

    if (matched.length < rule.minimum_matches) continue;

    // Base confidence from field matches
    let confidence = matched.length / Math.max(rule.minimum_matches, 1);

    // Category match bonus (+0.15 if any indicator category matches)
    if (indicatorMappings && rule.category_match.length > 0) {
      const hasCategoryMatch = [...indicatorMappings.values()].some(
        (m) => rule.category_match.includes(m.category),
      );
      if (hasCategoryMatch) confidence += 0.15;
    }

    // Density bonus (+0.1 if 5+ fields matched)
    if (matched.length >= 5) confidence += 0.1;

    // Source category from indicator mappings
    let sourceCategory: string | undefined;
    if (indicatorMappings) {
      for (const m of indicatorMappings.values()) {
        if (rule.category_match.includes(m.category)) {
          sourceCategory = m.category;
          break;
        }
      }
    }

    confidence = Math.min(1.0, Math.round(confidence * 100) / 100);

    results.push(
      GeneratedBusinessContextSchema.parse({
        context: rule.context,
        confidence,
        based_on_fields: fieldNames.filter((f) =>
          matched.some((p) => f.toLowerCase().includes(p.toLowerCase())),
        ).slice(0, 20),
        matched_patterns: matched,
        source_category: sourceCategory,
        source_endpoints: [], // filled by generateBusinessContexts
      }),
    );
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
};

// ---------------------------------------------------------------------------
// Batch generation
// ---------------------------------------------------------------------------

/**
 * Generate business contexts for all API endpoints in the inventory.
 *
 * Each endpoint's fields are analyzed, and contexts with confidence >= threshold
 * are included in the result.
 */
export const generateBusinessContexts = (
  endpoints: Record<string, ApiEndpoint>,
  indicatorMappings?: Map<string, IndicatorMapping>,
  threshold = 0.3,
): GeneratedBusinessContext[] => {
  // Build a merged set of all field names across endpoints
  const allFields = new Set<string>();
  for (const ep of Object.values(endpoints)) {
    for (const field of Object.keys(ep.fields)) {
      allFields.add(field);
    }
  }

  const contexts = analyzeFields([...allFields], indicatorMappings);

  // Enrich with source endpoints
  return contexts
    .filter((c) => c.confidence >= threshold)
    .map((c) => {
      const sourceEps: string[] = [];
      for (const [epName, ep] of Object.entries(endpoints)) {
        const epFields = Object.keys(ep.fields);
        const hasMatch = c.based_on_fields.some((f) => epFields.includes(f));
        if (hasMatch) sourceEps.push(epName);
      }
      return { ...c, source_endpoints: sourceEps };
    });
};

/**
 * Get the business contexts associated with a specific API endpoint.
 * Returns contexts sorted by confidence descending.
 */
export const getContextForApi = (
  endpointName: string,
  endpoints: Record<string, ApiEndpoint>,
  indicatorMappings?: Map<string, IndicatorMapping>,
): GeneratedBusinessContext[] => {
  const ep = endpoints[endpointName];
  if (!ep) return [];

  const fieldNames = Object.keys(ep.fields);
  const contexts = analyzeFields(fieldNames, indicatorMappings);
  return contexts.map((c) => ({
    ...c,
    source_endpoints: [endpointName],
  }));
};

// ---------------------------------------------------------------------------
// Manifest integration
// ---------------------------------------------------------------------------

/**
 * Generate a manifest-compatible business_context array.
 *
 * Output format: string[] of context names WITHOUT the "Context" suffix,
 * using lowercase_with_underscores.  This matches the format used in
 * JD_MANIFEST.business_context.
 */
export const generateManifestContexts = (
  endpoints: Record<string, ApiEndpoint>,
  indicatorMappings?: Map<string, IndicatorMapping>,
  threshold = 0.3,
): string[] => {
  const contexts = generateBusinessContexts(endpoints, indicatorMappings, threshold);
  return contexts
    .map((c) =>
      c.context
        .replace(/Context$/, '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, ''),
    )
    .filter((name, idx, arr) => arr.indexOf(name) === idx) // unique
    .sort();
};

/** Aggregate generated contexts into a platform-level summary. */
export const summarizeContexts = (
  contexts: GeneratedBusinessContext[],
): Array<{
  context: string;
  confidence: number;
  endpoint_count: number;
  field_count: number;
}> => {
  const byContext = new Map<string, GeneratedBusinessContext[]>();
  for (const c of contexts) {
    const list = byContext.get(c.context) ?? [];
    list.push(c);
    byContext.set(c.context, list);
  }

  return [...byContext.entries()]
    .map(([context, entries]) => ({
      context,
      confidence: Math.round(
        entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length * 100,
      ) / 100,
      endpoint_count: new Set(entries.flatMap((e) => e.source_endpoints)).size,
      field_count: new Set(entries.flatMap((e) => e.based_on_fields)).size,
    }))
    .sort((a, b) => b.confidence - a.confidence);
};

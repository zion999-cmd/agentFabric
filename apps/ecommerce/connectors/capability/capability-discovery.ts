// Phase 1: Capability Discovery
// Consumes P0005.2 API Inventory → produces structured PlatformCapability[].
// All capabilities come from Discovery data, never hand-written.

import type { PlatformCapability } from './types.js';
import { getApiModules } from '#app/connectors/discovery/api-inventory.js';
import { loadCapabilityMatrix } from '#app/connectors/discovery/loader.js';

const MODULE_TO_CAPABILITY: Readonly<Record<string, string>> = {
  indexSummary: 'Transaction',
  industryMarket: 'Industry',
  custGrowth: 'Customer',
  marketing: 'Marketing',
  stock: 'SupplyChain',
  common: 'Platform',
};

const MODULE_TO_FEATURES: Readonly<Record<string, string[]>> = {
  indexSummary: ['实时成交', 'GMV 概览', '订单趋势', '转化率分析', '客单价', '行业基准对比'],
  industryMarket: ['行业排名', '行业指数', '市场份额', '趋势对比'],
  custGrowth: ['客户分层', '新老客分析', '会员分析', '粉丝增长', '客户留存'],
  marketing: ['广告投放', 'ROI 分析', '渠道归因', '活动效果'],
  stock: ['库存健康', '缺货预警', '周转率', '滞销分析', '供应链效率'],
  common: ['店铺信息', '平台参数', '用户权限', '基础配置'],
};

/** Derive data quality from API count and capability matrix status. */
const deriveQuality = (apiCount: number, _moduleName: string): PlatformCapability['data_quality'] => {
  if (apiCount >= 10) return 'high';
  if (apiCount >= 3) return 'medium';
  return 'low';
};

/**
 * Discover platform capabilities from the API module classification.
 * Each API module maps to a business capability with features, API count, and data quality.
 */
export const discoverCapabilities = (): PlatformCapability[] => {
  const modules = getApiModules();

  return modules
    .filter((m) => m.name !== 'other')
    .map((m) => {
      const capability = MODULE_TO_CAPABILITY[m.name] ?? m.name;
      const features = MODULE_TO_FEATURES[m.name] ?? [];
      return {
        capability,
        api_module: m.name,
        supported_features: features,
        api_count: m.endpoints.length,
        data_quality: deriveQuality(m.endpoints.length, m.name),
      };
    });
};

/**
 * Discover capabilities enriched with capability matrix metadata.
 */
export const discoverCapabilitiesWithMatrix = (): PlatformCapability[] => {
  const capabilities = discoverCapabilities();
  const matrix = loadCapabilityMatrix();

  // Enrich with page status info from the capability matrix
  const pageStatus = (matrix['page_status'] as Record<string, string>) ?? {};

  return capabilities.map((cap) => {
    // Check if any pages with this module have live data
    const hasLiveData = Object.values(pageStatus).some(
      (s) => s === 'data_present',
    );
    return {
      ...cap,
      data_quality: hasLiveData ? cap.data_quality : 'unknown',
    };
  });
};

/**
 * Get a summary of discovered capabilities.
 */
export const summarizeCapabilities = (capabilities: PlatformCapability[]): {
  total_capabilities: number;
  total_apis: number;
  high_quality_count: number;
  capabilities_list: string[];
} => {
  return {
    total_capabilities: capabilities.length,
    total_apis: capabilities.reduce((sum, c) => sum + c.api_count, 0),
    high_quality_count: capabilities.filter((c) => c.data_quality === 'high').length,
    capabilities_list: capabilities.map((c) => c.capability),
  };
};

/**
 * Get APIs by capability — reverse lookup from capability name to endpoints.
 */
export const getApisByCapability = (capabilityName: string): string[] => {
  const modules = getApiModules();
  for (const mod of modules) {
    const capName = MODULE_TO_CAPABILITY[mod.name] ?? mod.name;
    if (capName === capabilityName) {
      return [...mod.endpoints];
    }
  }
  return [];
};

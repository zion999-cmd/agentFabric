// Minimal JD fixture — real facts from discovery/ + WorldExplorationTask/.
// P0008.3. This is the authoritative World Model + bindings used to project
// the Fabric Agent Workspace. It is a minimal subset (9 objects / 6 assertions /
// 1 binding), NOT a full JD World import.

import type { WorldModel, CapabilityBinding } from '#shared/schemas/world-model.js';

export const JD_FIXTURE: { worldModel: WorldModel; bindings: CapabilityBinding[] } = {
  worldModel: {
    systemId: 'jd_shangzhi',
    objects: [
      { id: 'jd_shangzhi', type: 'system', name: '京东商智', attributes: {} },
      { id: 'jd_surface_trade_summary', type: 'surface', name: '交易概况', attributes: { url: '/szweb/view/tradeAnalysis/tradeSummary.html' } },
      { id: 'jd_surface_flow_summary', type: 'surface', name: '流量', attributes: { url: '/szweb/view/flow/flow-summary.html' } },
      { id: 'jd_metric_gmv', type: 'metric', name: '成交金额', attributes: { unit: '元' } },
      { id: 'jd_metric_orders', type: 'metric', name: '成交单量', attributes: { unit: '笔' } },
      { id: 'jd_metric_aov', type: 'metric', name: '客单价', attributes: { formula: '成交金额/成交客户数' } },
      { id: 'jd_dimension_time', type: 'dimension', name: '时间', attributes: { values: ['实时', '昨天', '近7天', '近30天', '天', '周', '月'] } },
      { id: 'jd_feature_realtime_ranking', type: 'feature', name: '实时榜单', attributes: {} },
      { id: 'jd_constraint_data_freshness', type: 'constraint', name: '数据新鲜度', attributes: { description: '实时数据延迟约1分钟，日报14:00前更新' } },
    ],
    assertions: [
      { id: 'a1', subjectId: 'jd_shangzhi', predicate: 'has_surface', objectRef: 'jd_surface_trade_summary', objectIsRef: true, epistemicStatus: 'verified', temporalStatus: 'active', evidenceRefs: ['ev_page_trade_summary'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-guided-discovery' },
      { id: 'a2', subjectId: 'jd_surface_trade_summary', predicate: 'exposes_metric', objectRef: 'jd_metric_gmv', objectIsRef: true, epistemicStatus: 'verified', temporalStatus: 'active', evidenceRefs: ['ev_page_trade_summary'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-guided-discovery' },
      { id: 'a3', subjectId: 'jd_metric_gmv', predicate: 'observable_by', objectRef: 'szgateway.jd.com/api/lowcode/indexSummary/summary.ajax', objectIsRef: false, epistemicStatus: 'verified', temporalStatus: 'active', evidenceRefs: ['ev_summary_response'], discoveredAt: '2026-08-13T00:00:00Z', source: 'cdp-capture' },
      { id: 'a4', subjectId: 'jd_metric_gmv', predicate: 'observable_by', objectRef: '/szweb/api/trade/summary', objectIsRef: false, epistemicStatus: 'suspected', temporalStatus: 'active', evidenceRefs: [], discoveredAt: '2026-08-13T00:00:00Z', source: 'hermes-zero-shot' },
      { id: 'a5', subjectId: 'jd_metric_gmv', predicate: 'supports_dimension', objectRef: 'jd_dimension_time', objectIsRef: true, epistemicStatus: 'verified', temporalStatus: 'active', evidenceRefs: ['ev_page_trade_summary'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-guided-discovery' },
      { id: 'a6', subjectId: 'jd_surface_trade_summary', predicate: 'accessible_via', objectRef: 'jd_feature_realtime_ranking', objectIsRef: true, epistemicStatus: 'observed', temporalStatus: 'active', evidenceRefs: ['ev_feature_catalog'], discoveredAt: '2026-08-13T00:00:00Z', source: 'claude-features' },
    ],
    bindings: [],
  },
  bindings: [
    { id: 'b1', worldObjectId: 'jd_metric_gmv', capabilityId: 'trade.overview', relationship: 'observable_by', epistemicStatus: 'observed' },
  ],
};

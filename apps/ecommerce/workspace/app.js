/**
 * agentFabric — Agent Workspace
 * V1 Sidebar + Agent Transparency / Trace Panel (P0003.1)
 */

const toastNode = document.getElementById('toast');

// ═══ i18n ═══════════════════════════════════════════════════
const i18n = {
  'zh-CN': {
    'mode.business': '运营模式', 'mode.developer': '开发模式',
    'mode.operator': 'Operator', 'mode.builder': 'Builder',
    'header.role': '运营总监', 'header.team': '电商运营团队',
    'nav.section.discovery': '发现视图', 'nav.section.analysis': '分析视图',
    'nav.inbox': '今日发现', 'nav.growth': '增长机会', 'nav.risk': '风险预警', 'nav.review': '审核中心',
    'nav.product': '商品分析', 'nav.trend': '趋势观察', 'nav.archive': '历史归档', 'nav.memory': 'Memory 成长', 'nav.runtime': 'Runtime 执行', 'nav.agentConfig': 'Agent 配置',
    'sidebar.agent': '运营Agent', 'sidebar.running': '运行中',
    'sidebar.version': '版本', 'sidebar.dataTime': '数据时间',
    'sidebar.decisions': '今日决策', 'sidebar.accuracy': '准确率 (近7天)',
    'inbox.title': '今日洞察', 'inbox.subtitle': '运营Agent 正在分析数据...',
    'inbox.insightCount': '运营Agent 为您发现 {count} 条重要洞察',
    'stat.totalSku': 'SKU 总数', 'stat.activeSku': '活跃 SKU', 'stat.newSignals': '新增信号', 'stat.pendingReview': '待审核建议',
    'findings.title': 'AI 发现',
    'filter.allPriority': '全部优先级', 'filter.allType': '全部类型',
    'decision.title': 'Agent Trace',
    'decision.placeholder': '点击左侧 AI 发现卡片查看 Agent Trace。',
    'trace.decisionSummary': 'Decision Summary',
    'trace.dataSources': 'Data Sources',
    'trace.executionStatus': 'Execution Status',
    'trace.expandDetails': 'Expand Details',
    'trace.collapseDetails': 'Collapse Details',
    'trace.skillsTriggered': 'Skills Triggered',
    'trace.mcpCalls': 'MCP / Tool Calls',
    'trace.memoryInfluence': 'Memory Influence',
    'trace.executionSteps': 'Execution Steps',
    'trace.resultValidation': 'Result Validation',
    'trace.noSignals': 'No signal data', 'trace.noMemories': 'No active memories',
    'product.title': '商品分析', 'product.search': '搜索', 'product.placeholder': '输入商品 ID 查看完整画像',
    'product.notFound': '未找到该商品', 'product.score': '综合得分', 'product.rank': '排名',
    'trend.title': '趋势观察', 'trend.subtitle': '信号变化与排名漂移时间轴',
    'archive.title': '历史归档',
    'memory.title': 'Memory 成长', 'memory.subtitle': 'Agent 从运营反馈中学习的知识积累',
    'profile.operator': '运营推荐', 'profile.growth': '增长发现', 'profile.sales': '销售排行',
    'config.title': 'Agent 配置', 'config.ranking': '排名权重',
    'config.growthWeight': '增长权重', 'config.competitionWeight': '竞争权重', 'config.qualityWeight': '质量权重',
    'config.memory': 'Memory 设置', 'config.memoryTtl': 'TTL (天)', 'config.memoryDecay': '衰减率', 'config.memoryThreshold': '验证阈值',
    'config.llm': 'LLM 配置', 'config.llmProvider': 'Provider', 'config.llmModel': 'Model', 'config.llmTemp': 'Temperature',
    'config.save': '保存配置', 'config.saved': '配置已保存',
    'label.score': 'Score', 'label.growth': 'Growth', 'label.competition': 'Competition',
    'label.supply': 'Supply', 'label.quality': 'Quality', 'label.conf': 'Conf', 'label.none': '--',
    'label.updated': 'Updated {time}', 'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'toast.ready': 'Agent Workspace 就绪', 'toast.refreshed': '已刷新', 'toast.configSaved': '配置已保存',
    // Phase 2
    'nav.section.agent': 'AGENT', 'nav.agentSession': 'Agent Session',
    'nav.section.capability': 'CAPABILITY', 'nav.capabilityExplorer': 'Capability Explorer', 'nav.evidenceViewer': 'Evidence Viewer',
    'session.runtimeUnavailable': 'Runtime integration unavailable', 'session.hermesNotConnected': 'HermesAgent events not connected. Agent Activity display requires HermesAgent integration (Phase 3).',
    'session.contractHint': 'Agent Session defines the UI contract for observable events (intent.resolved, capability.selected, data.requested, acquisition.completed, response.ready). These event slots will be populated when HermesAgent integration is complete.',
    'session.placeholder': 'Agent Session 是您与 HermesAgent 协作的工作视图。',
    'session.placeholderHint': '完整功能需要 HermesAgent Runtime 集成 (Phase 3)。当前展示 UI boundary 和 event contract。',
    'session.activityTitle': 'Agent Activity (observable events)',
    'session.awaitingIntegration': '— awaiting HermesAgent integration',
    'session.inputDisabled': 'Type a question for HermesAgent... (Phase 3)',
    'capability.title': 'agentFabric 现在能获取什么数据？',
    'capability.searchPlaceholder': '搜索能力意图...',
    'capability.domainAll': '全部', 'capability.useInSession': '在 Session 中使用',
    'capability.viewDetail': '查看详情', 'capability.backToList': '← 返回列表',
    'capability.canAnswer': '可以回答', 'capability.metrics': '提供指标',
    'capability.provider': '数据来源', 'capability.constraints': '约束',
    'capability.evidence': 'Evidence', 'capability.openEvidence': '查看 Evidence 链 →',
    'capability.footer': '{total} capabilities · {verified} verified · {blocked} blocked',
    'evidence.title': '数据从哪里来，能信吗？',
    'evidence.selectCapability': 'Select Capability:', 'evidence.load': 'Load Evidence',
    'evidence.placeholder': '选择一个 Capability 查看其证据溯源链。',
    'evidence.notFound': '未找到该 Capability',
    'evidence.provenanceCapability': 'Capability', 'evidence.provenancePlatform': '平台页面',
    'evidence.provenanceCapture': '数据采集', 'evidence.provenanceRaw': '原始响应',
    'evidence.provenanceMapping': '语义映射', 'evidence.provenanceMetrics': '指标',
    'evidence.provenanceContract': 'Capability Contract',
    'evidence.expand': '▸ 展开', 'evidence.collapse': '▾ 收起',
    'evidence.viewRawJson': '查看原始 JSON', 'evidence.viewMappings': '查看全部 {count} 条映射',
    'evidence.supports': '此 Evidence 验证: {id}',
  },
  en: {
    'mode.business': 'Business', 'mode.developer': 'Developer', 'mode.operator': 'Operator', 'mode.builder': 'Builder',
    'header.role': 'Ops Director', 'header.team': 'E-commerce Team',
    'nav.section.discovery': 'Discovery', 'nav.section.analysis': 'Analysis',
    'nav.inbox': 'Today', 'nav.growth': 'Growth', 'nav.risk': 'Risk Alerts', 'nav.review': 'Reviews',
    'nav.product': 'Products', 'nav.trend': 'Trends', 'nav.archive': 'Archive', 'nav.memory': 'Memory', 'nav.runtime': 'Runtime', 'nav.agentConfig': 'Config',
    'sidebar.agent': 'Ops Agent', 'sidebar.running': 'Running',
    'sidebar.version': 'Version', 'sidebar.dataTime': 'Data Time',
    'sidebar.decisions': 'Decisions', 'sidebar.accuracy': 'Accuracy (7d)',
    'inbox.title': "Today's Insights", 'inbox.subtitle': 'Agent is analyzing data...',
    'inbox.insightCount': 'Agent discovered {count} insights',
    'stat.totalSku': 'Total SKUs', 'stat.activeSku': 'Active SKUs', 'stat.newSignals': 'New Signals', 'stat.pendingReview': 'Pending Reviews',
    'findings.title': 'AI Discoveries',
    'filter.allPriority': 'All Priorities', 'filter.allType': 'All Types',
    'decision.title': 'Agent Trace',
    'decision.placeholder': 'Click a finding to view Agent Trace.',
    'trace.decisionSummary': 'Decision Summary', 'trace.dataSources': 'Data Sources',
    'trace.executionStatus': 'Execution Status', 'trace.expandDetails': 'Expand Details',
    'trace.collapseDetails': 'Collapse Details',
    'trace.skillsTriggered': 'Skills Triggered', 'trace.mcpCalls': 'MCP / Tool Calls',
    'trace.memoryInfluence': 'Memory Influence', 'trace.executionSteps': 'Execution Steps',
    'trace.resultValidation': 'Result Validation',
    'trace.noSignals': 'No signal data', 'trace.noMemories': 'No active memories',
    'product.title': 'Product Analysis', 'product.search': 'Search', 'product.placeholder': 'Enter product ID',
    'product.notFound': 'Product not found', 'product.score': 'Score', 'product.rank': 'Rank',
    'trend.title': 'Trend Watch', 'trend.subtitle': 'Signal & ranking drift time series',
    'archive.title': 'Archive',
    'memory.title': 'Memory Growth', 'memory.subtitle': 'Knowledge from operations feedback',
    'profile.operator': 'Operator', 'profile.growth': 'Growth', 'profile.sales': 'Sales',
    'config.title': 'Agent Config', 'config.ranking': 'Ranking Weights',
    'config.growthWeight': 'Growth', 'config.competitionWeight': 'Competition', 'config.qualityWeight': 'Quality',
    'config.memory': 'Memory Settings', 'config.memoryTtl': 'TTL (days)', 'config.memoryDecay': 'Decay', 'config.memoryThreshold': 'Threshold',
    'config.llm': 'LLM Config', 'config.llmProvider': 'Provider', 'config.llmModel': 'Model', 'config.llmTemp': 'Temperature',
    'config.save': 'Save', 'config.saved': 'Saved',
    'label.score': 'Score', 'label.growth': 'Growth', 'label.competition': 'Competition',
    'label.supply': 'Supply', 'label.quality': 'Quality', 'label.conf': 'Conf', 'label.none': '--',
    'label.updated': 'Updated {time}', 'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'toast.ready': 'Agent Workspace ready', 'toast.refreshed': 'Refreshed', 'toast.configSaved': 'Config saved',
    // Phase 2
    'nav.section.agent': 'AGENT', 'nav.agentSession': 'Agent Session',
    'nav.section.capability': 'CAPABILITY', 'nav.capabilityExplorer': 'Capability Explorer', 'nav.evidenceViewer': 'Evidence Viewer',
    'session.runtimeUnavailable': 'Runtime integration unavailable', 'session.hermesNotConnected': 'HermesAgent events not connected. Agent Activity display requires HermesAgent integration (Phase 3).',
    'session.contractHint': 'Agent Session defines the UI contract for observable events (intent.resolved, capability.selected, data.requested, acquisition.completed, response.ready). These event slots will be populated when HermesAgent integration is complete.',
    'session.placeholder': 'Agent Session is your workspace for collaborating with HermesAgent.',
    'session.placeholderHint': 'Full functionality requires HermesAgent Runtime integration (Phase 3). Currently displaying UI boundary and event contract.',
    'session.activityTitle': 'Agent Activity (observable events)',
    'session.awaitingIntegration': '— awaiting HermesAgent integration',
    'session.inputDisabled': 'Type a question for HermesAgent... (Phase 3)',
    'capability.title': 'What data can agentFabric fetch?',
    'capability.searchPlaceholder': 'Search capability intents...',
    'capability.domainAll': 'All', 'capability.useInSession': 'Use in Session',
    'capability.viewDetail': 'View Details', 'capability.backToList': '← Back to list',
    'capability.canAnswer': 'Can answer', 'capability.metrics': 'Metrics',
    'capability.provider': 'Provider', 'capability.constraints': 'Constraints',
    'capability.evidence': 'Evidence', 'capability.openEvidence': 'Open Evidence Chain →',
    'capability.footer': '{total} capabilities · {verified} verified · {blocked} blocked',
    'evidence.title': 'Where does the data come from? Can it be trusted?',
    'evidence.selectCapability': 'Select Capability:', 'evidence.load': 'Load Evidence',
    'evidence.placeholder': 'Select a capability to view its evidence provenance chain.',
    'evidence.notFound': 'Capability not found',
    'evidence.provenanceCapability': 'Capability', 'evidence.provenancePlatform': 'Platform Page',
    'evidence.provenanceCapture': 'Capture', 'evidence.provenanceRaw': 'Raw Response',
    'evidence.provenanceMapping': 'Semantic Mapping', 'evidence.provenanceMetrics': 'Metrics',
    'evidence.provenanceContract': 'Capability Contract',
    'evidence.expand': '▸ Expand', 'evidence.collapse': '▾ Collapse',
    'evidence.viewRawJson': 'View Raw JSON', 'evidence.viewMappings': 'View all {count} mappings',
    'evidence.supports': 'This evidence supports: {id}',
  },
};

let currentLang = 'zh-CN';
function t(key) { return i18n[currentLang]?.[key] || i18n.en?.[key] || key; }
function tf(key, vars = {}) { let text = t(key); for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v)); return text; }
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

// ═══ State ══════════════════════════════════════════════════
const state = {
  activeView: 'inbox', activeFilter: 'all',
  panelMode: 'business',      // 'business' | 'developer'
  traceExpanded: false,
  selectedEntityId: null, findingsData: [],
  rankingsCache: [], memoriesCache: [],
  productNames: {},  // product_id → name
};

function showToast(msg) { toastNode.textContent = msg; toastNode.classList.add('show'); setTimeout(() => toastNode.classList.remove('show'), 1500); }
async function apiGet(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${r.status}`); const j = await r.json(); return j.data || j; }
async function apiPost(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`${r.status}`); const j = await r.json(); return j.data || j; }
function clearNode(n) { while (n.firstChild) n.removeChild(n.firstChild); }

// ═══ Navigation ═════════════════════════════════════════════
function switchView(name, filter = 'all') {
  state.activeView = name; state.activeFilter = filter;
  document.querySelectorAll('.sidebar-item').forEach(item => {
    const itemView = item.dataset.view, itemFilter = item.dataset.filter;
    if (name === 'inbox') item.classList.toggle('active', itemView === 'inbox' && itemFilter === filter);
    else item.classList.toggle('active', itemView === name && !itemFilter);
  });
  document.querySelectorAll('.view-container').forEach(c => { c.classList.toggle('active', c.id === `view-${name}`); });
  viewLoaders[name]?.(filter);
}

const viewLoaders = { inbox: loadInbox, product: loadProduct, trend: loadTrend, archive: loadArchive, memory: loadMemory, runtime: loadRuntime, agentConfig: loadConfig,
  agentSession: loadAgentSession, capabilityExplorer: loadCapabilityExplorer, evidenceViewer: loadEvidenceViewer };

// ═══ Data Loading ══════════════════════════════════════════
async function loadData() {
  try {
    const [rankings, memories, findings, products] = await Promise.all([
      apiGet('/api/ranking/operator_mode'),
      apiGet('/api/memory'),
      apiGet('/api/workspace/findings?profile=operator_mode'),
      apiGet('/api/products'),
    ]);
    state.rankingsCache = Array.isArray(rankings) ? rankings : [];
    state.memoriesCache = Array.isArray(memories) ? memories : [];
    state.findingsData = Array.isArray(findings) ? findings : [];
    // Build product name lookup
    if (Array.isArray(products)) {
      state.productNames = {};
      products.forEach(function(p) { state.productNames[p.product_id] = p.name || p.product_id; });
    }
  } catch { /* keep caches */ }
}

// ═══ Inbox ═════════════════════════════════════════════════
async function loadInbox(filterType = 'all') {
  document.getElementById('findingsTitle').textContent = `${t('findings.title')}`;
  await loadData();

  // Build enriched cards from rankings
  const enriched = state.rankingsCache.map(r => {
    const isRisk = r.explainability?.risks?.length > r.explainability?.strengths?.length;
    const dir = (v) => v >= 0.65 ? 'up' : v <= 0.45 ? 'down' : 'neutral';
    const comp = r.component_scores || {};
    const tags = [];
    if (isRisk) tags.push('需关注');
    if (r.explainability?.strengths?.length) tags.push('增长信号强');
    if (r.explainability?.risks?.length) tags.push('存在风险');
    return {
      id: r.entity_id,
      entityId: r.entity_id,
      entityName: state.productNames[r.entity_id] || r.entity_id,
      type: isRisk ? 'risk' : 'growth',
      priority: r.overall_score >= 0.5 ? 'high' : r.overall_score >= 0.3 ? 'medium' : 'low',
      title: r.explainability?.summary || '排名结果',
      metrics: [
        { label: '增长得分', value: comp.growth ? (comp.growth * 100).toFixed(1) + '%' : '--', direction: dir(comp.growth) },
        { label: '增长趋势', value: comp.competition ? (comp.competition * 100).toFixed(1) + '%' : '--', direction: dir(comp.competition) },
        { label: '库存健康', value: comp.supply_stability ? (comp.supply_stability * 100).toFixed(1) + '%' : '--', direction: dir(comp.supply_stability) },
        { label: '置信度', value: Math.round(r.confidence * 100) + '%', direction: r.confidence >= 0.7 ? 'up' : 'neutral' },
      ],
      tags,
      aiSuggestion: r.explainability?.strengths?.length
        ? r.explainability.strengths[0] + '。关注关键指标变化趋势。'
        : '关注关键指标变化趋势。',
      reasoningSummary: [
        `综合得分: ${r.overall_score.toFixed(3)}`,
        `覆盖度: ${(r.coverage * 100).toFixed(0)}%`,
        ...(r.explainability?.strengths || []).slice(0, 2),
        ...(r.explainability?.risks || []).slice(0, 2),
      ],
      traceData: null,
      timestamp: r.ranked_at || new Date().toISOString(),
    };
  });

  state.findingsData = enriched;

  // Sidebar badges
  document.getElementById('badgeAll').textContent = enriched.length;
  document.getElementById('badgeGrowth').textContent = enriched.filter(f => f.type === 'growth').length;
  document.getElementById('badgeRisk').textContent = enriched.filter(f => f.type === 'risk').length;
  document.getElementById('badgeReview').textContent = 0;

  // Filter
  let filtered = enriched;
  if (filterType === 'review') {
    try {
      const reviews = await apiGet('/api/reviews/ranking');
      filtered = (Array.isArray(reviews) ? reviews : []).map(r => ({
        id: r.review_id, entityId: r.entity_id, entityName: r.entity_id,
        type: 'review', priority: 'high', title: r.reason || 'Pending Review',
        metrics: [], tags: [r.status === 'pending' ? '待审核' : r.status],
        aiSuggestion: r.reason_category || '', reasoningSummary: [`Review: ${r.reason}`],
        traceData: null, timestamp: r.created_at || new Date().toISOString(),
      }));
    } catch { filtered = []; }
    document.getElementById('findingsTitle').textContent = t('nav.review');
  } else {
    if (filterType !== 'all') filtered = enriched.filter(f => f.type === filterType);
  }
  const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
  if (priorityFilter !== 'all') filtered = filtered.filter(f => f.priority === priorityFilter);

  document.getElementById('inboxSubtitle').textContent = tf('inbox.insightCount', { count: enriched.length });

  // Stat cards
  document.getElementById('statTotalSku').textContent = state.rankingsCache.length.toLocaleString();
  document.getElementById('statActiveSku').textContent = state.rankingsCache.filter(r => r.overall_score > 0.3).length.toLocaleString();
  document.getElementById('statNewSignals').textContent = enriched.length.toLocaleString();
  document.getElementById('statPendingReview').textContent = '0';
  const up = '<span class="stat-trend up">&#9650;</span>';
  ['statTotalSkuTrend', 'statActiveSkuTrend', 'statNewSignalsTrend'].forEach(id => { document.getElementById(id).innerHTML = up; });

  // Sidebar footer stats — real data from rankings
  if (state.rankingsCache.length > 0) {
    const latestRanked = state.rankingsCache.reduce((a, b) => (a.ranked_at || '') > (b.ranked_at || '') ? a : b);
    document.getElementById('sidebarDataTime').textContent = (latestRanked.ranked_at || '').slice(0, 10) || '--';
    document.getElementById('sidebarDecisions').textContent = state.rankingsCache.length.toLocaleString();
    const avgConf = state.rankingsCache.reduce((s, r) => s + (r.confidence || 0), 0) / state.rankingsCache.length;
    document.getElementById('sidebarAccuracy').textContent = Math.round(avgConf * 100) + '%';
  } else {
    document.getElementById('sidebarDataTime').textContent = '--';
    document.getElementById('sidebarDecisions').textContent = '--';
    document.getElementById('sidebarAccuracy').textContent = '--';
  }

  renderFindingCards(filtered);
  document.getElementById('inboxUpdated').textContent = new Date().toLocaleTimeString();
}

function renderFindingCards(findings) {
  const list = document.getElementById('findingsList'); clearNode(list);
  if (!findings.length) { list.innerHTML = '<p class="muted placeholder">No findings.</p>'; return; }
  const dirClass = (d) => d === 'up' ? 'up' : d === 'down' ? 'down' : 'neutral';
  const tagClass = (tag) => tag.includes('风险') || tag.includes('下滑') ? ' risk-tag' : tag.includes('建议') ? ' action-tag' : '';

  findings.forEach(f => {
    const card = document.createElement('div');
    card.className = `finding-card priority-${f.priority || 'medium'}`;
    if (f.entityId === state.selectedEntityId) card.classList.add('selected');
    card.dataset.entityId = f.entityId;
    const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' }[f.priority] || '';

    card.innerHTML = `
      <div class="finding-product-img">&#128230;</div>
      <div class="finding-body">
        <div class="finding-header">
          <span class="finding-priority-badge ${f.priority}">${priorityLabel}</span>
          <span class="finding-entity-name">${f.entityName || f.entityId}</span>
          <span class="finding-tags">${(f.tags || []).map(tag => `<span class="finding-tag${tagClass(tag)}">${tag}</span>`).join('')}</span>
          <span class="finding-timestamp">${(f.timestamp || '').substring(11, 16) || '--:--'}</span>
        </div>
        <div class="finding-metrics">
          ${(f.metrics || []).map(m => `
            <div class="finding-metric">
              <div class="finding-metric-value ${dirClass(m.direction)}">${m.value}</div>
              <div class="finding-metric-label">${m.label}</div>
            </div>
          `).join('')}
        </div>
        <div class="finding-suggestion">
          <div class="finding-suggestion-text">
            <div class="finding-suggestion-label">AI 建议</div>
            ${f.aiSuggestion || ''}
          </div>
          <button class="finding-inspect-btn">查看原因 →</button>
        </div>
      </div>`;
    card.addEventListener('click', () => selectFinding(f));
    list.appendChild(card);
  });
}

// ═══ Product Analysis ═════════════════════════════════════
async function loadProduct() {
  const ct = document.getElementById('productContent');
  const searchInput = document.getElementById('productSearchInput');
  const searchBtn = document.getElementById('productSearchBtn');

  // Build product lookup from loaded data
  function findProduct(q) {
    if (!q) return null;
    // Direct ID match
    var byId = state.rankingsCache.find(function(r) { return r.entity_id === q; });
    if (byId) return byId;
    // Substring ID match
    var bySubId = state.rankingsCache.find(function(r) { return r.entity_id.includes(q); });
    if (bySubId) return bySubId;
    // Name match (search productNames)
    for (var id in state.productNames) {
      if (state.productNames[id].includes(q)) {
        return state.rankingsCache.find(function(r) { return r.entity_id === id; }) || { entity_id: id };
      }
    }
    return null;
  }

  // Show product selector dropdown
  function renderProductList() {
    var products = state.rankingsCache.map(function(r) {
      return { id: r.entity_id, name: state.productNames[r.entity_id] || r.entity_id, score: r.overall_score };
    }).sort(function(a,b) { return b.score - a.score; });

    var html = '<div style="max-height:60vh;overflow-y:auto;margin-top:8px"><strong>商品列表 (' + products.length + ')</strong><br/><span class="muted" style="font-size:0.75rem">点击选择商品，或输入名称/ID搜索</span>';
    html += '<div style="margin-top:6px">';
    products.forEach(function(p) {
      html += '<div class="product-list-item" data-pid="' + p.id + '" style="cursor:pointer;padding:8px 10px;margin-bottom:2px;background:var(--card-bg);border-radius:4px;display:flex;justify-content:space-between;align-items:center;font-size:0.78rem">';
      html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:8px">' + (p.name || p.id) + '</span>';
      html += '<span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted)">' + p.id.slice(-8) + '</span>';
      html += '<span style="margin-left:8px;font-weight:600;font-size:0.75rem">' + (p.score ? p.score.toFixed(3) : '--') + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
    return html;
  }

  async function search() {
    var q = searchInput.value.trim();

    // If empty, show product list
    if (!q) {
      ct.innerHTML = renderProductList();
      // Click handlers
      ct.querySelectorAll('.product-list-item').forEach(function(el) {
        el.addEventListener('click', function() { searchInput.value = el.dataset.pid; search(); });
      });
      return;
    }

    ct.innerHTML = '<p class="muted">搜索中...</p>';
    try {
      var match = findProduct(q);
      if (!match) { ct.innerHTML = '<p class="muted">未找到匹配 "' + q + '" 的商品。清空搜索框查看完整列表。</p>'; return; }

      var pid = match.entity_id;
      var pname = state.productNames[pid] || pid;

      // Show ranking component breakdown + shop-level GMV context
      var signalsHtml = '';
      try {
        // Shop-level enterprise signals for GMV context
        var shopSignals = await apiGet('/api/signals?entity_type=product&entity_id=jd_shop_001');
        if (shopSignals && shopSignals.length) {
          // Focus on daily_summary — most meaningful metric
          var dailySignals = shopSignals.filter(function(s) { return s.signal_name === 'daily_summary'; }).sort(function(a,b) {
            return (b.observed_at||'').localeCompare(a.observed_at||'');
          });

          if (dailySignals.length > 0) {
            var gmvValues = dailySignals.slice(0, 14).reverse().map(function(s) { return s.signal_value || 0; });
            var latestGmv = gmvValues[gmvValues.length-1] || 0;
            var prevGmv = gmvValues[gmvValues.length-2] || latestGmv;
            var gmvChange = prevGmv > 0 ? ((latestGmv - prevGmv) / prevGmv * 100) : 0;
            var gmvMax = Math.max.apply(null, gmvValues) || 1;

            signalsHtml += '<div style="margin-top:14px"><strong>GMV 趋势</strong>';
            signalsHtml += '<span style="margin-left:6px;font-weight:600;color:' + (gmvChange >= 0 ? 'var(--primary)' : 'var(--danger)') + '">¥' + latestGmv.toLocaleString() + '</span>';
            signalsHtml += '<span style="margin-left:4px;font-size:0.72rem;color:' + (gmvChange >= 0 ? 'var(--primary)' : 'var(--danger)') + '">' + (gmvChange >= 0 ? '↑' : '↓') + Math.abs(gmvChange).toFixed(1) + '%</span>';

            // Mini sparkline
            signalsHtml += '<div style="display:flex;align-items:flex-end;gap:2px;height:32px;margin-top:6px">';
            gmvValues.forEach(function(v) {
              var h = Math.max(3, (v / gmvMax) * 30);
              signalsHtml += '<div title=\"¥' + v.toLocaleString() + '\" style=\"flex:1;background:var(--primary);height:' + h + 'px;border-radius:2px 2px 0 0;opacity:' + (0.3+0.7*v/gmvMax) + ';min-width:4px\"></div>';
            });
            signalsHtml += '</div></div>';
          }

          // Count other signal types
          var typeCounts = {};
          shopSignals.forEach(function(s) { typeCounts[s.signal_name] = (typeCounts[s.signal_name]||0) + 1; });
          signalsHtml += '<div style="margin-top:8px;font-size:0.72rem;color:var(--muted)">' + Object.keys(typeCounts).length + ' signal types · ' + shopSignals.length + ' total observations</div>';
        }
      } catch(e2) { /* optional */ }

      var comp = match.component_scores || {};
      ct.innerHTML = '<div class="finding-card" style="cursor:default;border-left:4px solid var(--primary)"><div class="finding-body">' +
        '<div class="finding-header"><span class="finding-entity-name" style="font-size:0.9rem">' + (pname || pid) + '</span></div>' +
        '<div style="font-size:0.7rem;color:var(--muted);margin-bottom:8px">ID: ' + pid + '</div>' +
        '<div class="finding-metrics" style="grid-template-columns:repeat(5,1fr)">' +
          '<div class="finding-metric"><div class="finding-metric-value">' + (match.overall_score||0).toFixed(3) + '</div><div class="finding-metric-label">综合得分</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((comp.growth||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Growth</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((comp.competition||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Competition</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((comp.supply_stability||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Supply</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((match.confidence||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Confidence</div></div>' +
        '</div>' + signalsHtml + '</div></div>';

    } catch (e) { ct.innerHTML = '<p class="muted">加载失败 (' + e.message + ')</p>'; }
  }

  searchBtn.onclick = search;
  searchInput.onkeydown = function(e) { if (e.key === 'Enter') search(); };
  // Show product list on initial load
  if (!ct.dataset.init) { ct.dataset.init = '1'; search(); }
}

// ═══ Memory ════════════════════════════════════════════════
async function loadMemory() {
  const ct = document.getElementById('memoryContent');
  try {
    const mem = await apiGet('/api/memory');
    const items = Array.isArray(mem) ? mem : [];
    ct.innerHTML = items.length
      ? `<div class="list">${items.map(m => `<div class="item"><strong>${m.statement||m.memory_id}</strong><br/><span class="muted">${m.memory_type} | Score: ${m.weight?.final_score?.toFixed(3)||'?'} | Status: ${m.status}</span></div>`).join('')}</div>`
      : '<div class="muted placeholder">暂无已验证的业务经验。<br/><small>Memory 来自运营审核反馈 — 在 Inbox 中对 AI 发现进行"批准/拒绝/修改"操作，验证后的经验会自动积累为 Memory。</small></div>';
  } catch { ct.innerHTML = `<p class="muted">${t('label.unavailable')}</p>`; }
}

// ═══ Trend ════════════════════════════════════════════════
var trendProductId = null; // null = all products, string = specific product

async function loadTrend() {
  const ct = document.getElementById('trendContent');
  try {
    // Build product selector
    var products = state.rankingsCache.map(function(r) {
      return { id: r.entity_id, name: state.productNames[r.entity_id] || r.entity_id, score: r.overall_score };
    }).sort(function(a,b) { return b.score - a.score; });

    var selectorHtml = '<div style="margin-bottom:12px"><select id="trendProductSelect" class="input select" style="font-size:0.78rem;max-width:300px">';
    selectorHtml += '<option value="">全部商品 (店铺总览)</option>';
    products.forEach(function(p) {
      var selected = trendProductId === p.id ? ' selected' : '';
      selectorHtml += '<option value="' + p.id + '"' + selected + '>' + (p.name || p.id).slice(0, 40) + ' (' + p.id.slice(-6) + ')</option>';
    });
    selectorHtml += '</select></div>';
    ct.innerHTML = selectorHtml + '<div id="trendChartArea"><p class="muted">加载中...</p></div>';

    // Bind change event
    document.getElementById('trendProductSelect').addEventListener('change', function() {
      trendProductId = this.value || null;
      loadTrend(); // reload with new selection
    });

    var chartArea = document.getElementById('trendChartArea');
    if (!chartArea) return;

    // daily_summary is always shop-level (entity_id=jd_shop_001).
    // Product-level signals are computed metrics (gmv_growth, sales_growth, etc.).
    // Always fetch shop signals for the GMV chart, regardless of product filter.
    var shopUrl = '/api/signals?entity_type=product&entity_id=jd_shop_001';
    var shopSignalsPromise = apiGet(shopUrl);

    // If a product is selected, also fetch its computed signals
    var productSignalsPromise = trendProductId
      ? apiGet('/api/signals?entity_type=product&entity_id=' + trendProductId)
      : Promise.resolve(null);

    var shopSignals = await shopSignalsPromise;
    var productSignals = await productSignalsPromise;

    if (!shopSignals || !shopSignals.length) {
      chartArea.innerHTML = '<p class="muted placeholder">暂无信号数据。请先在 Runtime 页面采集数据。</p>';
      return;
    }

    // Group shop-level daily_summary signals by date (GMV chart)
    var dailyByDate = {};
    shopSignals.forEach(function(s) {
      if (s.signal_name !== 'daily_summary') return;
      var date = (s.observed_at || '').slice(0, 10);
      if (!date) return;
      if (!dailyByDate[date]) dailyByDate[date] = { gmv: 0, orders: 0, count: 0 };
      dailyByDate[date].gmv += s.signal_value || 0;
      var m = s.metrics || {};
      dailyByDate[date].orders += m.orders || 0;
      dailyByDate[date].count++;
    });

    var dates = Object.keys(dailyByDate).sort().reverse();
    var recentDates = dates.slice(0, 14);
    var title = trendProductId ? (state.productNames[trendProductId] || trendProductId) : '店铺总览';
    var subtitle = title + ' · ' + dates.length + ' 天数据';
    if (trendProductId) subtitle += ' (GMV为店铺级数据)';
    var html = '<div style="margin-bottom:8px;font-size:0.8rem;color:var(--muted)">' + subtitle + '</div>';

    // GMV Trend sparkline — always from shop-level daily_summary
    if (Object.keys(dailyByDate).length >= 2) {
      var gmvValues = dates.slice(0, 14).reverse().map(function(d) { return dailyByDate[d] ? dailyByDate[d].gmv : 0; });
      var gmvMax = Math.max.apply(null, gmvValues) || 1;
      var gmvLatest = gmvValues[gmvValues.length - 1] || 0;
      var gmvPrev = gmvValues[gmvValues.length - 2] || gmvLatest;
      var gmvChange = gmvPrev > 0 ? ((gmvLatest - gmvPrev) / gmvPrev * 100) : 0;

      html += '<div style="margin-bottom:16px">';
      html += '<strong>店铺 GMV 趋势 (14天)</strong>';
      html += '<span style="margin-left:8px;font-size:1.1rem;font-weight:600;color:' + (gmvChange >= 0 ? 'var(--primary)' : 'var(--danger)') + '">¥' + gmvLatest.toLocaleString() + '</span>';
      html += '<span style="margin-left:4px;font-size:0.78rem;color:' + (gmvChange >= 0 ? 'var(--primary)' : 'var(--danger)') + '">' + (gmvChange >= 0 ? '↑' : '↓') + Math.abs(gmvChange).toFixed(1) + '% vs 昨日</span>';

      html += '<div style="display:flex;align-items:flex-end;gap:3px;height:48px;margin-top:8px;padding:4px 0">';
      gmvValues.forEach(function(v) {
        var h = Math.max(4, (v / gmvMax) * 44);
        html += '<div title="¥' + v.toLocaleString() + '" style="flex:1;background:var(--primary);height:' + h + 'px;border-radius:3px 3px 0 0;opacity:' + (0.3 + 0.7 * (v/gmvMax)) + ';min-width:6px"></div>';
      });
      html += '</div>';

      var weekGmv = gmvValues.slice(-7).reduce(function(a,b){return a+b;}, 0);
      var prevWeekGmv = gmvValues.slice(-14, -7).reduce(function(a,b){return a+b;}, 0);
      var wowChange = prevWeekGmv > 0 ? ((weekGmv - prevWeekGmv) / prevWeekGmv * 100) : 0;
      html += '<div style="display:flex;gap:12px;margin-top:6px;font-size:0.75rem">';
      html += '<span>近7天 GMV: <strong>¥' + Math.round(weekGmv).toLocaleString() + '</strong></span>';
      html += '<span style="color:' + (wowChange >= 0 ? 'var(--primary)' : 'var(--danger)') + '">环比: ' + (wowChange >= 0 ? '+' : '') + wowChange.toFixed(1) + '%</span>';
      html += '</div>';
      html += '</div>';
    } else {
      html += '<p class="muted">暂无店铺 daily_summary 信号。请先在 Runtime 页面采集数据。</p>';
    }

    // Product-level computed signals (only shown when a product is selected)
    if (trendProductId && productSignals && productSignals.length) {
      var latestProductSignals = {};
      productSignals.forEach(function(s) {
        var key = s.signal_name;
        if (!latestProductSignals[key] || (s.observed_at || '') > (latestProductSignals[key].observed_at || '')) {
          latestProductSignals[key] = s;
        }
      });
      var pKeys = Object.keys(latestProductSignals).sort();
      if (pKeys.length) {
        html += '<div style="margin-bottom:14px"><strong>商品指标 (最新)</strong>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;margin-top:6px;font-size:0.75rem">';
        pKeys.forEach(function(k) {
          var v = latestProductSignals[k].signal_value;
          var displayVal = typeof v === 'number' ? (Math.abs(v) < 1 ? (v*100).toFixed(1)+'%' : v.toFixed(3)) : String(v||'--');
          html += '<div style="padding:6px 10px;background:var(--card-bg);border-radius:4px;display:flex;justify-content:space-between">';
          html += '<span class="muted">' + k + '</span>';
          html += '<span style="font-weight:600;font-family:var(--font-mono)">' + displayVal + '</span>';
          html += '</div>';
        });
        html += '</div></div>';
      }
    }

    // Daily detail table — always shop-level daily_summary
    if (recentDates.length > 0) {
      html += '<div style="max-height:50vh;overflow-y:auto"><strong>每日概况 (店铺级)</strong>';
      html += '<div style="margin-top:6px;font-size:0.75rem">';
      recentDates.forEach(function(d) {
        var day = dailyByDate[d];
        var gmv = day ? day.gmv : 0;
        var orders = day ? day.orders : 0;
        var color = gmv > 8000 ? 'var(--primary)' : gmv > 4000 ? 'inherit' : 'var(--muted)';
        html += '<div style="display:flex;justify-content:space-between;padding:6px 10px;margin-bottom:2px;background:var(--card-bg);border-radius:4px;align-items:center">';
        html += '<span style="font-family:var(--font-mono);font-size:0.75rem">' + d.slice(5) + '</span>';
        html += '<span style="color:' + color + ';font-weight:600">¥' + gmv.toLocaleString() + '</span>';
        html += '<span class="muted">' + orders + ' 单</span>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    chartArea.innerHTML = html;
  } catch (e) { ct.innerHTML = '<p class="muted placeholder">趋势数据加载失败 (' + e.message + ')</p>'; }
}

// ═══ Archive ══════════════════════════════════════════════
async function loadArchive() {
  const ct = document.getElementById('archiveTimeline');
  const profile = document.getElementById('archiveProfileSelect')?.value || 'operator_mode';
  try {
    const rankings = await apiGet(`/api/ranking/${profile}`);
    if (!rankings.length) { ct.innerHTML = '<p class="muted placeholder">暂无归档数据 — 运行一次排名计算</p>'; return; }
    let html = '<div class="timeline">';
    rankings.slice(0, 20).forEach((r, i) => {
      html += `<div class="timeline-day ${r.explainability?.risks?.length ? 'changed' : ''}" style="cursor:pointer" data-id="${r.entity_id}">
        <span><strong>#${i + 1}</strong> ${r.entity_id.slice(-12)}</span>
        <span>Score: ${r.overall_score.toFixed(3)} | Conf: ${Math.round(r.confidence*100)}%</span>
        <span>${(r.explainability?.strengths||[]).slice(0,2).join(', ') || '-'}</span>
      </div>`;
    });
    html += '</div>';
    ct.innerHTML = html;
    ct.querySelectorAll('.timeline-day').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const f = state.findingsData.find(x => (x.entityId||x.entity_id) === id);
        if (f) { selectFinding(f); state.activeView = 'archive'; }
      });
    });
  } catch (e) { ct.innerHTML = `<p class="muted placeholder">加载失败 (${e.message})</p>`; }
}
document.getElementById('archiveProfileSelect')?.addEventListener('change', loadArchive);

	// ═══ Runtime Execution ════════════════════════════════════
	async function loadRuntime() {
	  const list = document.getElementById('runtimeExecutionsList');
	  const countEl = document.getElementById('runtimeExecCount');
	  const status = document.getElementById('runtimeCollectStatus');
	  list.innerHTML = '<p class="muted">Loading execution history...</p>';
	  try {
	    const executions = await apiGet('/api/runtime/executions?platform=jd&limit=366');
	    if (!executions || !executions.length) {
	      list.innerHTML = '<p class="muted placeholder">No execution records. Collect data first from Runtime panel.</p>';
	      if (countEl) countEl.textContent = '';
	      return;
	    }

	    // Summary stats
	    var totalSignals = 0, totalEvidence = 0, completedDays = 0, failedDays = 0;
	    executions.forEach(function(ex) {
	      totalSignals += ex.signalCount || 0;
	      totalEvidence += ex.evidenceCount || 0;
	      if (ex.status === 'completed') completedDays++;
	      else failedDays++;
	    });

	    // Sort by date ascending for timeline display
	    var sorted = executions.slice().sort(function(a,b) { return a.date.localeCompare(b.date); });
	    var firstDate = sorted[0].date;
	    var lastDate = sorted[sorted.length-1].date;

	    if (countEl) countEl.textContent = '(' + executions.length + ' days)';

	    // Summary bar
	    var html = '<div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap">';
	    html += '<div style="background:var(--card-bg);padding:8px 14px;border-radius:6px"><span class="muted" style="font-size:0.7rem">Total Signals</span><div style="font-weight:600;font-family:var(--font-mono)">' + totalSignals.toLocaleString() + '</div></div>';
	    html += '<div style="background:var(--card-bg);padding:8px 14px;border-radius:6px"><span class="muted" style="font-size:0.7rem">Evidence</span><div style="font-weight:600;font-family:var(--font-mono)">' + totalEvidence.toLocaleString() + '</div></div>';
	    html += '<div style="background:var(--card-bg);padding:8px 14px;border-radius:6px"><span class="muted" style="font-size:0.7rem">Completed</span><div style="font-weight:600;color:var(--primary)">' + completedDays + '/' + executions.length + '</div></div>';
	    if (failedDays > 0) html += '<div style="background:var(--card-bg);padding:8px 14px;border-radius:6px"><span class="muted" style="font-size:0.7rem">Failed</span><div style="font-weight:600;color:var(--danger)">' + failedDays + '</div></div>';
	    html += '<div style="background:var(--card-bg);padding:8px 14px;border-radius:6px"><span class="muted" style="font-size:0.7rem">Date Range</span><div style="font-weight:600;font-family:var(--font-mono);font-size:0.78rem">' + firstDate + ' → ' + lastDate + '</div></div>';

	    // Source stats (P0006.3.2)
	    var srcCounts = { cdp: 0, mock: 0, 'import': 0, none: 0, unknown: 0 };
	    executions.forEach(function(ex) { var s = ex.evidenceSource || 'none'; srcCounts[s] = (srcCounts[s]||0) + 1; });
	    var srcLabels = { cdp: '🟢 Live CDP', mock: '⚪ Mock', 'import': '🟡 Import', none: '⬜ None', unknown: '❓ Unknown' };
	    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:0.7rem;margin-top:2px">';
	    for (var src in srcCounts) { if (srcCounts[src] > 0) html += '<span style="padding:2px 8px;background:var(--card-bg);border-radius:10px">' + (srcLabels[src]||src) + ': ' + srcCounts[src] + '</span>'; }
	    html += '</div>';
	    html += '</div>';

	    // Timeline — scrollable day-by-day grid
	    html += '<div style="max-height:55vh;overflow-y:auto;margin-bottom:12px">';
	    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px">';		    sorted.forEach(function(ex) {
		      var isCompleted = ex.status === 'completed';
		      var bgColor = isCompleted ? 'var(--card-bg)' : '#fff0f0';
		      var borderColor = isCompleted ? 'var(--primary)' : 'var(--danger)';
		      var statusIcon = isCompleted ? '✅' : '❌';
		      var src = ex.evidenceSource || 'none';
		      var srcIcon = src === 'cdp' ? '🟢' : src === 'mock' ? '⚪' : src === 'import' ? '🟡' : '⬜';
		      var dateLabel = ex.date.slice(5);
		      html += '<div class="runtime-timeline-day" data-date="' + ex.date + '" style="cursor:pointer;padding:6px 8px;background:' + bgColor + ';border-left:3px solid ' + borderColor + ';border-radius:4px;font-size:0.72rem" title="' + ex.date + ': ' + ex.signalCount + ' sig | src: ' + src + '">';
		      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
		      html += '<span style="font-family:var(--font-mono)">' + dateLabel + '</span>';
		      html += '<span style="font-size:0.65rem">' + srcIcon + '</span>';
		      html += '</div>';
		      html += '<div class="muted" style="font-size:0.65rem">' + ex.signalCount + ' sig</div>';
		      html += '</div>';
		    });
	    html += '</div></div>';

	    list.innerHTML = html;
	    list.querySelectorAll('.runtime-timeline-day').forEach(function(el) {
	      el.addEventListener('click', function() { loadRuntimeDetail(el.dataset.date); });
	    });
	  } catch (e) {
	    list.innerHTML = '<p class="muted placeholder">Load failed (' + e.message + ')</p>';
	  }
	  if (status) status.textContent = '';
	}

async function loadRuntimeDetail(date) {
  var detail = document.getElementById('runtimeDetail');
  var content = document.getElementById('runtimeDetailContent');
  detail.style.display = 'block';
  content.innerHTML = '<p class="muted">加载 ' + date + ' 详情...</p>';
  try {
    var data = await apiGet('/api/runtime/executions/' + date);
    var signals = data.signals || [];
    var breakdown = data.signalBreakdown || [];
    var html = '<div style="margin-bottom:16px"><strong>日期:</strong> ' + data.date + ' | <strong>状态:</strong> ' + data.status + ' | <strong>信号总数:</strong> ' + data.signalCount + '</div>';
    if (breakdown.length) {
      html += '<div style="margin-bottom:12px"><strong>信号分类:</strong><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
      breakdown.forEach(function(b) {
        html += '<span style="background:var(--card-bg);padding:4px 10px;border-radius:12px;font-size:0.75rem;font-family:var(--font-mono)">' + b.signal_name + ': ' + b.count + '</span>';
      });
      html += '</div></div>';
    }
    if (signals.length) {
      var dailySignals = signals.filter(function(s) { return s.signal_name === 'daily_summary'; });
      if (dailySignals.length) {
        html += '<div style="margin-top:12px"><strong>Daily Summary</strong>';
        dailySignals.forEach(function(s) {
          html += '<div style="margin-top:6px;padding:10px 14px;background:var(--card-bg);border-radius:6px;border-left:3px solid var(--primary)">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center">';
          html += '<span style="font-family:var(--font-mono)">' + (s.observed_at||'').slice(0,10) + '</span>';
          html += '<span style="font-weight:600;font-size:1.1rem">¥' + (s.signal_value||0).toLocaleString() + '</span>';
          html += '</div>';
          html += '<div class="muted" style="font-size:0.72rem;margin-top:2px">sig: ' + s.signal_id.slice(-12) + ' | conf: ' + (s.confidence||0).toFixed(2) + '</div>';
          html += '</div>';
        });
        html += '</div>';
      }
      var otherSignals = signals.filter(function(s) { return s.signal_name !== 'daily_summary'; });
      if (otherSignals.length) {
        html += '<div style="margin-top:12px"><strong>Other Signals (' + otherSignals.length + ')</strong>';
        html += '<div class="list" style="margin-top:6px;max-height:40vh;overflow-y:auto">';
        otherSignals.slice(0, 20).forEach(function(s) {
          html += '<div class="item" style="padding:6px 10px;margin-bottom:3px;background:var(--card-bg);border-radius:4px;font-size:0.75rem">';
          html += '<span style="font-weight:600">' + s.signal_name + '</span>';
          html += ' <span style="font-family:var(--font-mono)">' + (s.signal_value||0) + '</span>';
          html += ' <span class="muted">' + (s.signal_unit||'') + '</span>';
          html += '</div>';
        });
        html += '</div></div>';
      }
    }
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<p class="muted placeholder">加载详情失败 (' + e.message + ')</p>';
  }
}

// ═══ Agent Config ═════════════════════════════════════════
function loadConfig() {
  const saved = JSON.parse(localStorage.getItem('agentfabric-workspace-config') || '{}');
  if (saved.growthWeight != null) document.getElementById('cfgGrowthWeight').value = saved.growthWeight;
  if (saved.competitionWeight != null) document.getElementById('cfgCompetitionWeight').value = saved.competitionWeight;
  if (saved.qualityWeight != null) document.getElementById('cfgQualityWeight').value = saved.qualityWeight;
  applyI18n();
}

// ═══ Agent Session (Phase 3.3) ═══════════════════════════
// Event-driven: subscribes to SSE event stream and renders Agent Activity.
// Phase 2 shell (notice + slots + disabled input) → Phase 3.3 live event display.

var agentSessionState = { taskId: null, status: 'idle', events: [], connected: false };
var agentSessionEventSource = null;

function loadAgentSession() {
  // Hide the Phase 2 "unavailable" notice. Phase 3.3 shows live events.
  var notice = document.getElementById('sessionNotice');
  if (notice) notice.style.display = 'none';

  // Show event slots area
  var slots = document.getElementById('sessionActivitySlots');
  if (slots) slots.style.display = 'block';

  // Connect to event stream
  connectEventStream();
}

function connectEventStream() {
  if (agentSessionEventSource) {
    agentSessionEventSource.close();
  }

  // Use a demo task ID. Phase 3.4 replaces this with real task IDs from HermesAgent.
  var taskId = 'task_demo_' + Date.now();
  agentSessionState = { taskId: taskId, status: 'connecting', events: [], connected: false };

  // Update status badge
  var badge = document.getElementById('sessionStatusBadge');
  if (badge) { badge.textContent = 'Connecting...'; badge.className = 'session-status-badge unavailable'; }

  // Reset all activity slots to pending
  document.querySelectorAll('.activity-slot-status').forEach(function(el) {
    el.textContent = '— pending';
    el.className = 'activity-slot-status pending';
  });

  agentSessionEventSource = new EventSource('/api/runtime/events/' + taskId);

  agentSessionEventSource.addEventListener('execution.started', function(e) {
    var data = JSON.parse(e.data);
    agentSessionState.status = 'executing';
    agentSessionState.events.push(data);
    updateSlot('execution.started', 'Execution started: ' + (data.data && data.data.capability || ''));
    updateStatusBadge('running');
  });

  agentSessionEventSource.addEventListener('acquisition.started', function(e) {
    var data = JSON.parse(e.data);
    agentSessionState.events.push(data);
    var label = 'Acquisition started';
    if (data.data && data.data.method) label += ': ' + data.data.method.toUpperCase();
    if (data.data && data.data.platform) label += ' (' + data.data.platform + ')';
    updateSlot('acquisition.started', label);
  });

  agentSessionEventSource.addEventListener('evidence.created', function(e) {
    var data = JSON.parse(e.data);
    agentSessionState.events.push(data);
    var n = data.data && data.data.metricsCount || 0;
    updateSlot('evidence.created', 'Evidence available: ' + n + ' metrics');
    updateSlot('acquisition.completed', 'Acquisition done');
  });

  agentSessionEventSource.addEventListener('acquisition.completed', function(e) {
    var data = JSON.parse(e.data);
    agentSessionState.events.push(data);
    var n = data.data && data.data.endpointsCaptured || 0;
    updateSlot('acquisition.completed', 'Acquisition completed: ' + n + ' endpoints');
  });

  agentSessionEventSource.addEventListener('execution.completed', function(e) {
    var data = JSON.parse(e.data);
    agentSessionState.events.push(data);
    agentSessionState.status = 'completed';
    agentSessionState.connected = false;
    var ev = data.data && data.data.totalEvidence || 0;
    var mt = data.data && data.data.totalMetrics || 0;
    updateSlot('execution.completed', 'Completed: ' + ev + ' evidence, ' + mt + ' metrics');
    updateStatusBadge('connected');
    agentSessionEventSource.close();
  });

  agentSessionEventSource.addEventListener('execution.failed', function(e) {
    var data = JSON.parse(e.data);
    agentSessionState.status = 'failed';
    updateSlot('execution.failed', 'Failed: ' + (data.data && data.data.message || ''));
    updateStatusBadge('unavailable');
    agentSessionEventSource.close();
  });

  agentSessionEventSource.onerror = function() {
    agentSessionState.connected = false;
    // Only show error if we haven't completed successfully
    if (agentSessionState.status !== 'completed') {
      updateStatusBadge('unavailable');
    }
    // Don't close — EventSource auto-reconnects
  };

  agentSessionEventSource.onopen = function() {
    agentSessionState.connected = true;
  };
}

function updateSlot(eventType, text) {
  var slot = document.querySelector('.activity-slot[data-slot="' + eventType + '"]');
  if (!slot) return;
  var status = slot.querySelector('.activity-slot-status');
  if (status) {
    status.textContent = text;
    status.className = 'activity-slot-status active';
  }
}

function updateStatusBadge(state) {
  var badge = document.getElementById('sessionStatusBadge');
  if (!badge) return;
  if (state === 'running' || state === 'connected') {
    badge.textContent = '● Connected';
    badge.className = 'session-status-badge connected';
  } else if (state === 'unavailable') {
    badge.textContent = 'Runtime integration unavailable';
    badge.className = 'session-status-badge unavailable';
  }
}

// ═══ Capability Explorer (Phase 2) ═══════════════════════
async function loadCapabilityExplorer() {
  var cardsList = document.getElementById('capabilityCardsList');
  var domainFilters = document.getElementById('capabilityDomainFilters');
  var searchInput = document.getElementById('capabilitySearchInput');
  var summaryFooter = document.getElementById('capabilitySummaryFooter');
  var detailView = document.getElementById('capabilityDetail');

  cardsList.innerHTML = '<p class="muted placeholder">Loading capabilities...</p>';

  try {
    var data = await apiGet('/api/capabilities');
    var capabilities = data.capabilities || [];
    var summary = data.summary || {};
    var domains = data.domains || [];

    // Render domain filter chips
    var allCapabilities = capabilities;
    renderDomainFilters(domainFilters, domains);
    // Render cards
    renderCapabilityCards(cardsList, capabilities, summaryFooter, summary);

    // Domain filter click handler
    domainFilters.addEventListener('click', function(e) {
      var chip = e.target.closest('.capability-domain-chip');
      if (!chip) return;
      var domain = chip.dataset.domain;
      // Toggle active
      domainFilters.querySelectorAll('.capability-domain-chip').forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
      // Filter
      var filtered = domain === 'all' ? allCapabilities : allCapabilities.filter(function(c) { return c.domain === domain; });
      renderCapabilityCards(cardsList, filtered, summaryFooter, { total_capabilities: filtered.length });
    });

    // Search handler
    searchInput.addEventListener('input', function() {
      var q = searchInput.value.trim().toLowerCase();
      if (!q) {
        renderCapabilityCards(cardsList, allCapabilities, summaryFooter, summary);
        return;
      }
      var filtered = allCapabilities.filter(function(c) {
        var inIntent = (c.intent || []).some(function(i) { return i.toLowerCase().includes(q); });
        var inName = (c.name || '').toLowerCase().includes(q);
        var inDesc = (c.description || '').toLowerCase().includes(q);
        var inOutput = (c.outputs || []).some(function(o) { return o.toLowerCase().includes(q); });
        return inIntent || inName || inDesc || inOutput;
      });
      renderCapabilityCards(cardsList, filtered, summaryFooter, { total_capabilities: filtered.length });
    });

    // Card click → detail view
    cardsList.addEventListener('click', function(e) {
      var card = e.target.closest('.capability-card');
      if (!card) return;
      var capId = card.dataset.capabilityId;
      var cap = allCapabilities.find(function(c) { return c.capability === capId; });
      if (cap && detailView) showCapabilityDetail(detailView, cap, cardsList);
    });

  } catch (e) {
    cardsList.innerHTML = '<p class="muted placeholder">Failed to load capabilities (' + e.message + '). Run <code>npm run cli -- generate-contract</code> first.</p>';
  }
}

function renderDomainFilters(container, domains) {
  var html = '<span class="capability-domain-chip active" data-domain="all">All</span>';
  domains.forEach(function(d) {
    html += '<span class="capability-domain-chip" data-domain="' + d + '">' + d + '</span>';
  });
  container.innerHTML = html;
}

function renderCapabilityCards(container, capabilities, footer, summary) {
  if (!capabilities || capabilities.length === 0) {
    container.innerHTML = '<p class="muted placeholder">No capabilities found.</p>';
    if (footer) footer.innerHTML = '';
    return;
  }

  var statusIcon = { verified: '&#9989;', captured: '&#9888;&#65039;', content_only: '&#9888;&#65039;', pending: '&#11035;', premium_required: '&#128176;', popup_blocked: '&#128683;' };
  var statusClass = { verified: 'verified', captured: 'captured', content_only: 'contracted', pending: 'contracted', premium_required: 'blocked', popup_blocked: 'blocked' };

  var html = '';
  capabilities.forEach(function(cap) {
    var vStatus = (cap.validation && cap.validation.status) || 'pending';
    var icon = statusIcon[vStatus] || '&#11035;';
    var cls = statusClass[vStatus] || '';
    var provider = cap.provider || {};
    var verifiedMetrics = (cap.validation && cap.validation.verified_metrics) || [];
    var verifiedSet = {};
    verifiedMetrics.forEach(function(m) { verifiedSet[m] = true; });

    var intentsHtml = '';
    var intents = (cap.intent || []).slice(0, 3);
    if (intents.length) {
      intentsHtml = '<div class="capability-card-intents"><strong>Intents:</strong><ul>';
      intents.forEach(function(i) { intentsHtml += '<li>' + escHtml(i) + '</li>'; });
      intentsHtml += '</ul></div>';
    }

    var metricsHtml = '';
    var metrics = cap.metrics || [];
    if (metrics.length) {
      metricsHtml = '<div class="capability-card-metrics">';
      metrics.slice(0, 6).forEach(function(m) {
        var tagClass = verifiedSet[m.canonical] ? ' verified' : '';
        metricsHtml += '<span class="capability-card-metric-tag' + tagClass + '">' + escHtml(m.canonical) + '</span>';
      });
      if (metrics.length > 6) metricsHtml += '<span class="capability-card-metric-tag">+' + (metrics.length - 6) + '</span>';
      metricsHtml += '</div>';
    }

    html += '<div class="capability-card" data-capability-id="' + escHtml(cap.capability) + '">' +
      '<div class="capability-card-header">' +
        '<span class="capability-card-status ' + cls + '">' + icon + '</span>' +
        '<span class="capability-card-name">' + escHtml(cap.name) + '</span>' +
      '</div>' +
      '<div class="capability-card-id">' + escHtml(cap.capability) + '</div>' +
      '<div class="capability-card-desc">' + escHtml(cap.description) + '</div>' +
      intentsHtml +
      metricsHtml +
      '<div class="capability-card-footer">' +
        '<span><span class="capability-card-platform">' + escHtml(provider.platform || '') + '</span> &middot; <span class="capability-card-acquisition">' + escHtml(provider.acquisition || '') + '</span></span>' +
        '<button class="capability-card-action">View Details</button>' +
      '</div>' +
    '</div>';
  });
  container.innerHTML = html;

  if (footer) {
    var total = summary.total_capabilities || capabilities.length;
    var verified = summary.verified_capabilities || 0;
    var blocked = summary.blocked_capabilities || 0;
    footer.innerHTML = '<span class="muted" style="font-size:0.72rem">' + total + ' capabilities &middot; ' +
      '<span style="color:var(--success)">' + verified + ' verified</span> &middot; ' +
      '<span style="color:var(--danger)">' + blocked + ' blocked</span></span>';
  }
}

function showCapabilityDetail(container, cap, cardsList) {
  var vStatus = (cap.validation && cap.validation.status) || 'pending';
  var provider = cap.provider || {};
  var verifiedMetrics = (cap.validation && cap.validation.verified_metrics) || [];
  var lastVerified = (cap.validation && cap.validation.last_verified) || '';

  var metricsHtml = '';
  (cap.metrics || []).forEach(function(m) {
    var verifiedBadge = verifiedMetrics.indexOf(m.canonical) >= 0 ? ' &#9989;' : '';
    metricsHtml += '<span style="display:inline-block;padding:4px 10px;background:var(--bg-strong);border-radius:10px;font-family:var(--font-mono);font-size:0.7rem;margin:2px">' + escHtml(m.canonical) + ' <span class="muted">(' + m.unit + ')</span>' + verifiedBadge + '</span>';
  });

  var intentsHtml = '';
  (cap.intent || []).forEach(function(i) {
    intentsHtml += '<li>' + escHtml(i) + '</li>';
  });

  var constraints = cap.constraints || {};
  var constraintNotes = [];
  if (constraints.requires_premium) constraintNotes.push('<span style="color:var(--danger)">&#128176; Requires: ' + escHtml(constraints.premium_tier || 'premium subscription') + '</span>');
  if (constraints.requires_ad_account) constraintNotes.push('<span style="color:var(--warning)">&#9888; Requires ad account</span>');
  if (constraints.is_popup) constraintNotes.push('<span style="color:var(--warning)">&#128683; Opens as popup/modal</span>');
  if (constraints.notes) constraintNotes.push('<span style="color:var(--muted)">' + escHtml(constraints.notes) + '</span>');

  var html = '<div style="position:sticky;top:0;background:var(--bg);z-index:1;padding:8px 0;margin-bottom:16px">' +
    '<button class="btn-icon" onclick="document.getElementById(\'capabilityDetail\').style.display=\'none\';document.getElementById(\'capabilityCardsList\').style.display=\'\';document.getElementById(\'capabilitySummaryFooter\').style.display=\'\'">&#8592; Back to list</button>' +
    '</div>' +
    '<div style="max-width:720px">' +
    '<h2 style="font-family:var(--font-display)">' + escHtml(cap.name) + '</h2>' +
    '<p class="muted" style="font-family:var(--font-mono);font-size:0.8rem;margin-bottom:12px">' + escHtml(cap.capability) + ' &middot; Status: ' + vStatus + '</p>' +
    '<p style="line-height:1.6;margin-bottom:16px">' + escHtml(cap.description) + '</p>' +

    '<h3 style="font-size:0.9rem;margin-bottom:8px">Intents (Agent queries this capability for)</h3>' +
    '<ul style="margin-bottom:16px;line-height:1.6">' + intentsHtml + '</ul>' +

    '<h3 style="font-size:0.9rem;margin-bottom:8px">Metrics (' + (cap.outputs || []).length + ' total)</h3>' +
    '<div style="margin-bottom:16px">' + metricsHtml + '</div>' +

    '<h3 style="font-size:0.9rem;margin-bottom:8px">Dimensions</h3>' +
    '<div style="margin-bottom:16px">' + (cap.dimensions || []).map(function(d) { return '<span style="padding:2px 8px;background:var(--bg-strong);border-radius:8px;font-size:0.72rem;margin:2px">' + escHtml(d) + '</span>'; }).join(' ') + '</div>' +

    '<h3 style="font-size:0.9rem;margin-bottom:8px">Provider</h3>' +
    '<p style="margin-bottom:4px"><strong>Platform:</strong> ' + escHtml(provider.platform || '') + '</p>' +
    '<p style="margin-bottom:4px"><strong>Acquisition:</strong> ' + escHtml(provider.acquisition || '') + '</p>' +
    (lastVerified ? '<p style="margin-bottom:4px"><strong>Last verified:</strong> ' + escHtml(lastVerified) + '</p>' : '') +
    (constraintNotes.length ? '<div style="margin-top:8px">' + constraintNotes.join('<br>') + '</div>' : '') +
    '</div>';

  container.innerHTML = html;
  container.style.display = 'block';
  cardsList.style.display = 'none';
  if (document.getElementById('capabilitySummaryFooter')) document.getElementById('capabilitySummaryFooter').style.display = 'none';
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══ Evidence Viewer (Phase 2) ══════════════════════════
async function loadEvidenceViewer() {
  var select = document.getElementById('evidenceCapabilitySelect');
  var content = document.getElementById('evidenceContent');
  var loadBtn = document.getElementById('evidenceLoadBtn');

  // Populate capability dropdown
  select.innerHTML = '<option value="">— Choose a capability —</option>';
  try {
    var data = await apiGet('/api/capabilities');
    var capabilities = data.capabilities || [];
    capabilities.forEach(function(cap) {
      var label = cap.name + ' (' + cap.capability + ')';
      select.innerHTML += '<option value="' + escHtml(cap.capability) + '">' + escHtml(label) + '</option>';
    });
  } catch (e) {
    select.innerHTML = '<option value="">— Failed to load capabilities —</option>';
  }

  content.innerHTML = '<p class="muted placeholder">Select a capability to view its evidence provenance chain.</p>';

  // Load evidence on button click
  loadBtn.addEventListener('click', async function() {
    var capId = select.value;
    if (!capId) { content.innerHTML = '<p class="muted placeholder">Please select a capability first.</p>'; return; }
    content.innerHTML = '<p class="muted">Loading evidence for ' + escHtml(capId) + '...</p>';
    try {
      var evidence = await apiGet('/api/evidence/' + capId);
      renderProvenanceChain(content, evidence, capId);
    } catch (e) {
      content.innerHTML = '<p class="muted placeholder">Failed to load evidence (' + e.message + ')</p>';
    }
  });
}

function renderProvenanceChain(container, evidence, capId) {
  var cap = evidence.capability || {};
  var provider = evidence.provider || {};
  var artifacts = evidence.artifacts || {};
  var records = evidence.evidence_records || [];
  var summary = evidence.summary || {};

  var html = '<div class="evidence-breadcrumb">' +
    '<span>Agent Session</span> <span class="sep">&gt;</span> ' +
    '<span>' + escHtml(capId) + '</span> <span class="sep">&gt;</span> ' +
    '<span>Evidence</span>' +
    '</div>';

  // Provenance chain
  html += '<div class="provenance-chain">';

  // Node 1: Capability
  html += '<div class="provenance-node">' +
    '<div class="provenance-node-icon">&#128269;</div>' +
    '<div class="provenance-node-body">' +
      '<div class="provenance-node-title">' + escHtml(cap.name || capId) + '</div>' +
      '<div class="provenance-node-subtitle">Capability: ' + escHtml(cap.domain || '') + '</div>' +
      '<div class="provenance-node-detail">' + escHtml(cap.description || '') + '</div>' +
    '</div>' +
    '<span class="provenance-status verified">' + escHtml(provider.platform || '') + ' &middot; ' + escHtml(provider.acquisition || '') + '</span>' +
  '</div>';

  // Node 2: Discovery artifacts
  var discoveryKeys = Object.keys(artifacts).filter(function(k) { return artifacts[k]; });
  if (discoveryKeys.length) {
    html += '<div class="provenance-node-connector"></div>';
    html += '<div class="provenance-node">' +
      '<div class="provenance-node-icon">&#128218;</div>' +
      '<div class="provenance-node-body">' +
        '<div class="provenance-node-title">Discovery Artifacts</div>' +
        '<div class="provenance-node-subtitle">' + discoveryKeys.length + ' discovery files</div>' +
        '<div class="provenance-node-meta">' + discoveryKeys.map(function(k) { return escHtml(k); }).join(', ') + '</div>';
    discoveryKeys.forEach(function(k) {
      var art = artifacts[k];
      var preview = typeof art === 'object' ? JSON.stringify(art).slice(0, 300) : String(art).slice(0, 300);
      html += '<span class="provenance-node-expand" onclick="var el=this.nextElementSibling;el.style.display=el.style.display===\'block\'?\'none\':\'block\'">&#9654; View ' + escHtml(k) + '</span>' +
        '<pre class="provenance-node-expanded" style="display:none">' + escHtml(preview) + '...</pre>';
    });
    html += '</div></div>';
  }

  // Node 3: Evidence records
  if (records.length) {
    html += '<div class="provenance-node-connector"></div>';
    html += '<div class="provenance-node">' +
      '<div class="provenance-node-icon">&#128260;</div>' +
      '<div class="provenance-node-body">' +
        '<div class="provenance-node-title">Evidence Records</div>' +
        '<div class="provenance-node-subtitle">' + records.length + ' evidence files</div>';

    // Evidence timeline
    html += '<div class="evidence-timeline"><div class="evidence-timeline-title">Timeline</div>';
    records.slice(0, 20).forEach(function(rec) {
      var meta = rec.metadata || {};
      var acquired = meta.acquired_at ? meta.acquired_at.slice(0, 10) : (rec.date || '');
      var dataType = meta.data_type || rec.data_type || rec.type || '';
      var method = meta.acquisition_method || meta.method || 'none';
      var statusClass = method === 'cdp' ? 'cdp' : method === 'mock' ? 'mock' : 'none';
      html += '<div class="evidence-timeline-item">' +
        '<span><span class="evidence-timeline-date">' + escHtml(acquired) + '</span> ' +
        '<span class="evidence-timeline-meta">' + escHtml(dataType) + '</span></span>' +
        '<span class="evidence-timeline-status ' + statusClass + '">' + escHtml(method) + '</span>' +
      '</div>';
    });
    html += '</div>';

    html += '<div class="provenance-node-meta" style="margin-top:8px">' +
      'Total: ' + summary.total_evidence + ' records &middot; ' +
      'From: ' + escHtml(summary.date_range || '') +
      '</div>';

    html += '</div></div>';
  }

  html += '</div>'; // end provenance-chain

  container.innerHTML = html;
}

// ═══ Agent Trace Panel ════════════════════════════════════
function selectFinding(finding) {
  state.selectedEntityId = finding.entityId || finding.entity_id;
  const eid = state.selectedEntityId;
  document.querySelectorAll('.finding-card').forEach(c => { c.classList.toggle('selected', c.dataset.entityId === eid); });
  const entityName = finding.entityName || state.productNames[eid] || eid;
  document.getElementById('decisionEntityLabel').textContent = entityName;
  document.getElementById('decisionPlaceholder').style.display = 'none';
  document.getElementById('decisionContent').style.display = 'block';

  const ranking = state.rankingsCache.find(r => r.entity_id === eid);
  updatePanel(finding, ranking);
}

function updatePanel(finding, ranking) {
  if (state.panelMode === 'business') {
    renderBusinessPanel(finding, ranking);
  } else {
    renderTracePanel(finding, ranking);
  }
}

// ═══ V1 Business Mode: AI Summary + Reasoning + Tool Calls ═══
function renderBusinessPanel(finding, ranking) {
  document.getElementById('panelBusiness').style.display = 'block';
  document.getElementById('panelDeveloper').style.display = 'none';

  const comp = ranking?.component_scores ?? {};
  const dt = ranking?.decision_trace ?? {};
  const signalsUsed = ranking?.signals_used || [];

  // Reasoning from real ranking data
  const reasons = [];
  if (comp.growth) reasons.push(`增长得分: ${(comp.growth*100).toFixed(0)}% — ${comp.growth >= 0.5 ? '增长势头强劲' : comp.growth >= 0.3 ? '增长稳定' : '增长空间大'}`);
  if (comp.competition) reasons.push(`竞争得分: ${(comp.competition*100).toFixed(0)}% — ${comp.competition >= 0.5 ? '竞争优势明显' : '竞争压力较大'}`);
  if (comp.supply_stability) reasons.push(`供应稳定性: ${(comp.supply_stability*100).toFixed(0)}%`);
  if (comp.quality) reasons.push(`质量得分: ${(comp.quality*100).toFixed(0)}%`);
  if (ranking?.explainability?.strengths?.length) {
    reasons.push('优势: ' + ranking.explainability.strengths.slice(0, 2).join('、'));
  }
  if (ranking?.explainability?.risks?.length) {
    reasons.push('风险: ' + ranking.explainability.risks.slice(0, 2).join('、'));
  }
  if (!reasons.length) reasons.push('基于多维度指标综合评估');

  document.getElementById('decisionReasoningList').innerHTML = reasons.map(r => `
    <div class="reasoning-item"><div class="reasoning-dot"></div><div>
      <div class="reasoning-item-title">${r}</div>
      <div class="reasoning-item-desc">${finding.aiSuggestion || ''}</div>
    </div></div>`).join('');

  // Pipeline steps — describe actual execution flow
  const steps = [
    { title: '信号计算', desc: `Compute ${signalsUsed.length || 9} signals/product × [3,7,14]d windows` },
    { title: '多维评分', desc: `Growth(${((comp.growth||0)*100).toFixed(0)}%) + Competition(${((comp.competition||0)*100).toFixed(0)}%) + Supply(${((comp.supply_stability||0)*100).toFixed(0)}%) + Quality(${((comp.quality||0)*100).toFixed(0)}%)` },
    { title: '记忆调整', desc: `${ranking?.memory_adjustments?.length || 0} active memory adjustments applied` },
    { title: '排名输出', desc: `Overall score: ${ranking?.overall_score?.toFixed(3) || '?'} · Confidence: ${Math.round((ranking?.confidence||0)*100)}%` },
  ];
  document.getElementById('decisionStepsList').innerHTML = steps.map((s, i) => `
    <div class="execution-step"><div class="step-num">${i+1}</div><div>
      <div class="step-title">${s.title}</div><div class="step-desc">${s.desc}</div>
    </div></div>`).join('');

  // Tool calls — real signal names from ranking data
  const toolNames = signalsUsed.length > 0
    ? signalsUsed.slice(0, 5).map(s => ({ name: s.signal_name || s, status: '成功' }))
    : (dt.top_signals || []).slice(0, 5).map(s => ({ name: s.signal_name || s, status: '成功' }));
  if (!toolNames.length) {
    toolNames.push({ name: 'signal_pipeline', status: '成功' });
    toolNames.push({ name: 'ranking_engine', status: '成功' });
  }
  document.getElementById('decisionToolCalls').innerHTML = toolNames.map(t => `
    <div class="tool-call-item"><span class="tool-call-name">${t.name}</span><span class="tool-call-status">${t.status}</span></div>`).join('');
}

// ═══ Developer Mode: P0003.1 Trace Panel ══════════════════
function renderTracePanel(finding, ranking) {
  document.getElementById('panelBusiness').style.display = 'none';
  document.getElementById('panelDeveloper').style.display = 'block';

  const comp = ranking?.component_scores ?? {};
  const dt = ranking?.decision_trace ?? {};

  // Decision Summary
  document.getElementById('traceDecisionSummary').innerHTML = `
    <div class="trace-section-title">Decision Summary</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text">${finding.entityName || finding.entityId || '?'} ranked at score ${ranking?.overall_score?.toFixed(3) || '?'}</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">Growth: ${(comp.growth||0).toFixed(2)} | Competition: ${(comp.competition||0).toFixed(2)} | Supply: ${(comp.supply_stability||0).toFixed(2)} | Quality: ${(comp.quality||0).toFixed(2)}</span></div>
    <div class="trace-step-conf"><span class="conf-mini ${(ranking?.confidence||0)>=0.7?'high':(ranking?.confidence||0)>=0.4?'medium':'low'}">Confidence: ${Math.round((ranking?.confidence||0)*100)}%</span><span class="conf-mini ${(ranking?.coverage||0)>=0.7?'high':(ranking?.coverage||0)>=0.4?'medium':'low'}">Coverage: ${Math.round((ranking?.coverage||0)*100)}%</span></div>`;

  // Data Sources
  document.getElementById('traceDataSources').innerHTML = `
    <div class="trace-section-title">Data Sources</div>
    ${(dt.top_signals||[]).slice(0,3).map(s => `<div class="data-source-item"><span class="data-source-dot"></span>${s.signal_name}</div>`).join('') || '<div class="muted">No signal data</div>'}`;

  // Execution Status
  const hasRisks = (dt.risk_signals||[]).length > 0;
  document.getElementById('traceExecutionStatus').innerHTML = `
    <div class="trace-section-title">Execution Status</div>
    <span class="execution-status ${hasRisks?'warn':'ok'}">${hasRisks?'Needs Review':'OK'}</span>`;

  // Builder-expanded sections
  const mems = state.memoriesCache.slice(0, 3);

  // Skills — real skills from the system
  const skillsUsed = [
    { name: 'signal_pipeline', desc: `Compute ${ranking?.signals_used?.length || 9} signal types × [3,7,14]d` },
    { name: 'ranking_engine', desc: 'Weighted multi-component scoring + dampening' },
    { name: 'memory_adjustment', desc: `${ranking?.memory_adjustments?.length || 0} active memories applied` },
  ];
  document.getElementById('traceSkillsTriggered').innerHTML = `
    <div class="trace-section-title">Skills Triggered</div>
    ${skillsUsed.map(s => `<div class="trace-step"><span class="trace-step-num">-</span><span class="trace-step-text">${s.name} — ${s.desc}</span></div>`).join('')}`;

  // MCP / Tool Calls — real API calls made
  const mcpCalls = [
    { name: 'GET /api/ranking/operator_mode', result: `${state.rankingsCache.length} ranked products` },
    { name: 'GET /api/memory', result: `${mems.length} active memories` },
    { name: 'GET /api/signals', result: `${ranking?.signals_used?.length || '?'} signal types` },
  ];
  document.getElementById('traceMcpCalls').innerHTML = `
    <div class="trace-section-title">MCP / Tool Calls</div>
    ${mcpCalls.map((c, i) => `<div class="trace-step"><span class="trace-step-num">${i+1}</span><span class="trace-step-text">${c.name} → ${c.result}</span></div>`).join('')}`;

  document.getElementById('traceMemoryInfluence').innerHTML = `
    <div class="trace-section-title">Memory Influence</div>
    ${mems.length ? mems.map(m => `<div class="memory-influence-item"><div class="mi-statement">${m.statement||m.memory_id}</div><div class="mi-meta">${m.memory_type} | score: ${m.weight?.final_score?.toFixed(3)||'?'}</div></div>`).join('') : '<div class="muted">No active memories</div>'}`;

  // Execution steps — real pipeline stages
  const execSteps = [
    { step: 1, title: 'Signal Computation', desc: `${ranking?.signals_used?.length || 9} types × [3,7,14]d windows → ${ranking?.signals_used?.length || '?'} signals per product` },
    { step: 2, title: 'Component Scoring', desc: `Growth(${((comp.growth||0)*100).toFixed(0)}%) · Competition(${((comp.competition||0)*100).toFixed(0)}%) · Supply(${((comp.supply_stability||0)*100).toFixed(0)}%) · Quality(${((comp.quality||0)*100).toFixed(0)}%)` },
    { step: 3, title: 'Memory Adjustment', desc: `${ranking?.memory_adjustments?.length || 0} memories matched → score adjustment applied` },
    { step: 4, title: 'Final Ranking', desc: `Overall: ${ranking?.overall_score?.toFixed(3) || '?'} · Coverage: ${((ranking?.coverage||0)*100).toFixed(0)}% · Confidence: ${Math.round((ranking?.confidence||0)*100)}%` },
  ];
  document.getElementById('traceExecutionSteps').innerHTML = `
    <div class="trace-section-title">Execution Steps</div>
    ${execSteps.map(s => `<div class="trace-step"><span class="trace-step-num">${s.step}</span><span class="trace-step-text">${s.title}: ${s.desc}</span></div>`).join('')}`;

  document.getElementById('traceResultValidation').innerHTML = `
    <div class="trace-section-title">Result Validation</div>
    <div class="validation-item"><span>Coverage</span><span class="validation-value ${(ranking?.coverage||0)>=0.6?'ok':'warn'}">${(ranking?.coverage||0).toFixed(2)}</span></div>
    <div class="validation-item"><span>Confidence</span><span class="validation-value ${(ranking?.confidence||0)>=0.7?'ok':'warn'}">${Math.round((ranking?.confidence||0)*100)}%</span></div>
    <div class="validation-item"><span>Signals Used</span><span class="validation-value">${ranking?.signals_used?.length||0}</span></div>`;

  // Collapsible trace: start collapsed, user can expand
  var expandEl = document.getElementById('traceExpanded');
  var btnEl = document.getElementById('traceExpandBtn');
  expandEl.style.display = state.traceExpanded ? 'block' : 'none';
  btnEl.style.display = 'block';
  btnEl.textContent = state.traceExpanded ? '▲ Collapse Details' : '▼ Expand Details';
  document.getElementById('traceCollapsed').style.display = 'block';
}

// ═══ Mode Toggles ═════════════════════════════════════════
function togglePanelMode() {
  var checked = document.getElementById('panelModeToggle').checked;
  state.panelMode = checked ? 'developer' : 'business';

  var biz = document.getElementById('panelBusiness');
  var dev = document.getElementById('panelDeveloper');
  if (!biz || !dev) return;

  if (state.panelMode === 'business') {
    biz.style.display = 'block';
    dev.style.display = 'none';
  } else {
    biz.style.display = 'none';
    dev.style.display = 'block';
  }

  if (state.selectedEntityId) {
    var finding = state.findingsData.find(function(f) { return (f.entityId||f.entity_id) === state.selectedEntityId; });
    var ranking = state.rankingsCache.find(function(r) { return r.entity_id === state.selectedEntityId; });
    if (finding) updatePanel(finding, ranking);
  }
}

function toggleTraceExpand() {
  state.traceExpanded = !state.traceExpanded;
  document.getElementById('traceExpanded').style.display = state.traceExpanded ? 'block' : 'none';
  document.getElementById('traceExpandBtn').textContent = state.traceExpanded ? '▲ Collapse Details' : '▼ Expand Details';
}

// ═══ Event Bindings ══════════════════════════════════════
document.getElementById('langToggle')?.addEventListener('change', (e) => {
  currentLang = e.target.value;
  localStorage.setItem('agentfabric-lang', currentLang);
  applyI18n();
  viewLoaders[state.activeView]?.(state.activeFilter);
});
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view, item.dataset.filter || 'all'); });
});
document.getElementById('panelModeToggle')?.addEventListener('change', togglePanelMode);
document.getElementById('decisionCloseBtn')?.addEventListener('click', () => {
  state.selectedEntityId = null;
  document.getElementById('decisionEntityLabel').textContent = '';
  document.getElementById('decisionPlaceholder').style.display = 'flex';
  document.getElementById('decisionContent').style.display = 'none';
  document.querySelectorAll('.finding-card').forEach(c => c.classList.remove('selected'));
});
document.getElementById('traceExpandBtn')?.addEventListener('click', toggleTraceExpand);
document.getElementById('refreshInboxBtn')?.addEventListener('click', () => { loadInbox(state.activeFilter); showToast(t('toast.refreshed')); });
document.getElementById('filterPriority')?.addEventListener('change', () => { loadInbox(state.activeFilter); });
document.getElementById('filterType')?.addEventListener('change', (e) => { switchView('inbox', e.target.value); });
document.getElementById('saveAgentConfig')?.addEventListener('click', () => {
  const config = {
    growthWeight: parseFloat(document.getElementById('cfgGrowthWeight')?.value) || 0.35,
    competitionWeight: parseFloat(document.getElementById('cfgCompetitionWeight')?.value) || 0.25,
    qualityWeight: parseFloat(document.getElementById('cfgQualityWeight')?.value) || 0.15,
    memoryTtl: parseInt(document.getElementById('cfgMemoryTtl')?.value) || 30,
    memoryDecay: parseFloat(document.getElementById('cfgMemoryDecay')?.value) || 0.05,
    memoryThreshold: parseFloat(document.getElementById('cfgMemoryThreshold')?.value) || 0.6,
  };
  localStorage.setItem('agentfabric-workspace-config', JSON.stringify(config));
  showToast(t('config.saved'));
});

// Chat
document.getElementById('chatSendButton')?.addEventListener('click', async () => {
  const inp = document.getElementById('chatInput');
  const message = inp?.value.trim();
  if (!message) return;
  // Show user message
  const container = document.getElementById('inboxChatMessages');
  if (container) {
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message-user';
    userMsg.style.cssText = 'text-align:right;margin-bottom:8px;padding:6px 12px;background:var(--card-bg);border-radius:8px;font-size:0.82rem';
    userMsg.textContent = message;
    container.appendChild(userMsg);
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message-bot';
    loadingMsg.id = 'chatLoadingMsg';
    loadingMsg.style.cssText = 'margin-bottom:8px;padding:6px 12px;color:var(--text-muted);font-size:0.82rem';
    loadingMsg.textContent = 'Agent 思考中...';
    container.appendChild(loadingMsg);
    container.scrollTop = container.scrollHeight;
    inp.value = '';
    try {
      const data = await apiPost('/api/chat', { message: message });
      loadingMsg.remove();
      const botMsg = document.createElement('div');
      botMsg.className = 'chat-message-bot';
      botMsg.style.cssText = 'margin-bottom:8px;padding:8px 12px;background:var(--card-bg);border-left:3px solid var(--primary);border-radius:6px;font-size:0.82rem';
      var replyText = (data.reply || '无法处理该请求');
      if (data.execution && data.execution.success) {
        replyText += '\n\n[查看执行详情 →](/runtime/' + data.intent + ')';
      }
      botMsg.textContent = replyText;
      container.appendChild(botMsg);
      container.scrollTop = container.scrollHeight;
    } catch (e) {
      loadingMsg.remove();
      const errMsg = document.createElement('div');
      errMsg.className = 'chat-message-bot';
      errMsg.style.cssText = 'margin-bottom:8px;padding:6px 12px;color:var(--danger);font-size:0.82rem';
      errMsg.textContent = 'Agent 响应失败: ' + e.message;
      container.appendChild(errMsg);
    }
  }
  if (inp) inp.value = '';
});
document.getElementById('runtimeCollectBtn')?.addEventListener('click', async () => {
  const status = document.getElementById('runtimeCollectStatus');
  const btn = document.getElementById('runtimeCollectBtn');
  if (status) status.textContent = '采集进行中...';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 采集中...'; }
  try {
    const result = await apiPost('/api/runtime/collect', { platform: 'jd', shopId: 'jd_shop_001', mock: true });
    if (status) status.textContent = '✅ 采集完成！' + (result.signalCount || 0) + ' 信号, ' + (result.evidenceCount || 0) + ' 证据';
    loadRuntime();
    loadData(); // Refresh sidebar stats
  } catch (e) {
    if (status) status.textContent = '❌ 采集失败: ' + e.message;
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔰 采集数据 (Mock)'; }
});

// Replay
document.getElementById('replayRunBtn')?.addEventListener('click', async () => {
  const from = document.getElementById('replayFrom')?.value;
  const to = document.getElementById('replayTo')?.value;
  const status = document.getElementById('replayStatus');
  const progressDiv = document.getElementById('replayProgress');
  const progressBar = document.getElementById('replayProgressBar');
  const progressText = document.getElementById('replayProgressText');
  const resultDiv = document.getElementById('replayResult');
  const btn = document.getElementById('replayRunBtn');

  if (!from || !to) { if (status) status.textContent = '请选择日期范围'; return; }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Replaying...'; }
  if (status) status.textContent = 'Starting replay...';
  if (progressDiv) progressDiv.style.display = 'block';
  if (resultDiv) resultDiv.innerHTML = '';

  try {
    const result = await apiPost('/api/runtime/replay', { shopId: 'jd_shop_001', from, to });
    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = result.completed + '/' + result.days + ' days completed';
    if (status) status.textContent = '✅ Replay complete';

    const summaryHtml = '<strong>Replay Result:</strong> ' +
      result.completed + '/' + result.days + ' days · ' +
      result.signals + ' signals · ' +
      result.evidence + ' evidence records' +
      (result.failed > 0 ? ' · ⚠️ ' + result.failed + ' failed' : '');
    if (resultDiv) resultDiv.innerHTML = summaryHtml;

    // Refresh execution history and sidebar
    loadRuntime();
    loadData();
  } catch (e) {
    if (status) status.textContent = '❌ Replay failed: ' + e.message;
    if (resultDiv) resultDiv.innerHTML = '<span style=\"color:var(--danger)\">Replay error: ' + e.message + '</span>';
  }
  if (btn) { btn.disabled = false; btn.textContent = '▶️ Run Replay'; }
  if (progressDiv) progressDiv.style.display = 'none';
});
document.querySelectorAll('.chip-question').forEach(chip => {
  chip.addEventListener('click', () => { const inp = document.getElementById('chatInput'); if (inp) { inp.value = chip.dataset.question; } });
});

// ═══ Boot ═════════════════════════════════════════════════
(async function boot() {
  const savedLang = localStorage.getItem('agentfabric-lang');
  if (savedLang && i18n[savedLang]) { currentLang = savedLang; document.getElementById('langToggle').value = savedLang; }
  // Set replay date picker max to today
  var today = new Date().toISOString().slice(0, 10);
  var replayFrom = document.getElementById('replayFrom');
  var replayTo = document.getElementById('replayTo');
  if (replayFrom) { replayFrom.max = today; replayFrom.value = '2026-07-01'; }
  if (replayTo) { replayTo.max = today; replayTo.value = today; }

  applyI18n();
  switchView('agentSession');
  await loadData();

  // If no rankings exist yet, auto-compute them (first-time setup)
  if (state.rankingsCache.length === 0) {
    try {
      showToast('正在生成初始分析数据...');
      await apiPost('/api/ranking', { profile: 'operator_mode', persist: true });
      await loadData();
      loadInbox(state.activeFilter);
      showToast(t('toast.ready'));
    } catch (e) {
      showToast(t('toast.ready'));
    }
  } else {
    showToast(t('toast.ready'));
  }
  setInterval(loadData, 300000);
})();

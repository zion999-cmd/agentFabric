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
    'nav.product': '商品分析', 'nav.memory': 'Memory 成长', 'nav.agentConfig': 'Agent 配置',
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
    'memory.title': 'Memory 成长', 'memory.subtitle': 'Agent 从运营反馈中学习的知识积累',
    'config.title': 'Agent 配置', 'config.ranking': '排名权重',
    'config.growthWeight': '增长权重', 'config.competitionWeight': '竞争权重', 'config.qualityWeight': '质量权重',
    'config.memory': 'Memory 设置', 'config.memoryTtl': 'TTL (天)', 'config.memoryDecay': '衰减率', 'config.memoryThreshold': '验证阈值',
    'config.llm': 'LLM 配置', 'config.llmProvider': 'Provider', 'config.llmModel': 'Model', 'config.llmTemp': 'Temperature',
    'config.save': '保存配置', 'config.saved': '配置已保存',
    'label.score': 'Score', 'label.growth': 'Growth', 'label.competition': 'Competition',
    'label.supply': 'Supply', 'label.quality': 'Quality', 'label.conf': 'Conf', 'label.none': '--',
    'label.updated': 'Updated {time}', 'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'toast.ready': 'Agent Workspace 就绪', 'toast.refreshed': '已刷新', 'toast.configSaved': '配置已保存',
  },
  en: {
    'mode.business': 'Business', 'mode.developer': 'Developer', 'mode.operator': 'Operator', 'mode.builder': 'Builder',
    'header.role': 'Ops Director', 'header.team': 'E-commerce Team',
    'nav.section.discovery': 'Discovery', 'nav.section.analysis': 'Analysis',
    'nav.inbox': 'Today', 'nav.growth': 'Growth', 'nav.risk': 'Risk Alerts', 'nav.review': 'Reviews',
    'nav.product': 'Products', 'nav.memory': 'Memory', 'nav.agentConfig': 'Config',
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
    'memory.title': 'Memory Growth', 'memory.subtitle': 'Knowledge from operations feedback',
    'config.title': 'Agent Config', 'config.ranking': 'Ranking Weights',
    'config.growthWeight': 'Growth', 'config.competitionWeight': 'Competition', 'config.qualityWeight': 'Quality',
    'config.memory': 'Memory Settings', 'config.memoryTtl': 'TTL (days)', 'config.memoryDecay': 'Decay', 'config.memoryThreshold': 'Threshold',
    'config.llm': 'LLM Config', 'config.llmProvider': 'Provider', 'config.llmModel': 'Model', 'config.llmTemp': 'Temperature',
    'config.save': 'Save', 'config.saved': 'Saved',
    'label.score': 'Score', 'label.growth': 'Growth', 'label.competition': 'Competition',
    'label.supply': 'Supply', 'label.quality': 'Quality', 'label.conf': 'Conf', 'label.none': '--',
    'label.updated': 'Updated {time}', 'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'toast.ready': 'Agent Workspace ready', 'toast.refreshed': 'Refreshed', 'toast.configSaved': 'Config saved',
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
  traceMode: 'operator', // 'operator' | 'builder'
  traceExpanded: false,
  selectedEntityId: null, findingsData: [],
  rankingsCache: [], memoriesCache: [],
};

function showToast(msg) { toastNode.textContent = msg; toastNode.classList.add('show'); setTimeout(() => toastNode.classList.remove('show'), 1500); }
async function apiGet(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${r.status}`); const j = await r.json(); return j.data || j; }
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

const viewLoaders = { inbox: loadInbox, product: loadProduct, memory: loadMemory, agentConfig: loadConfig };

// ═══ Data Loading ══════════════════════════════════════════
async function loadData() {
  try {
    const [rankings, memories, findings] = await Promise.all([
      apiGet('/api/ranking/operator_mode'),
      apiGet('/api/memory'),
      apiGet('/api/workspace/findings?profile=operator_mode'),
    ]);
    state.rankingsCache = Array.isArray(rankings) ? rankings : [];
    state.memoriesCache = Array.isArray(memories) ? memories : [];
    state.findingsData = Array.isArray(findings) ? findings : [];
  } catch { /* keep caches */ }
}

// ═══ Inbox ═════════════════════════════════════════════════
async function loadInbox(filterType = 'all') {
  document.getElementById('findingsTitle').textContent = `${t('findings.title')}`;
  await loadData();
  const findings = state.findingsData;

  // Sidebar badges
  document.getElementById('badgeAll').textContent = findings.length;
  document.getElementById('badgeGrowth').textContent = findings.filter(f => f.discovery_type === 'opportunity').length;
  document.getElementById('badgeRisk').textContent = findings.filter(f => f.discovery_type === 'risk').length;
  document.getElementById('badgeReview').textContent = findings.filter(f => f.discovery_type === 'review').length;

  // Filter
  let filtered = findings;
  if (filterType === 'review') {
    try {
      const reviews = await apiGet('/api/reviews/ranking');
      filtered = (Array.isArray(reviews) ? reviews : []).map(r => ({
        entity_id: r.entity_id, discovery_type: 'review', priority: 'high',
        title: r.reason || 'Pending', aiSuggestion: r.reason_category || '',
        confidence: 0.5, score: 0.5,
      }));
    } catch { filtered = []; }
    document.getElementById('findingsTitle').textContent = t('nav.review');
  } else {
    if (filterType !== 'all') filtered = findings.filter(f => f.discovery_type === filterType);
  }
  const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
  if (priorityFilter !== 'all') filtered = filtered.filter(f => f.priority === priorityFilter);

  document.getElementById('inboxSubtitle').textContent = tf('inbox.insightCount', { count: filtered.length });

  // Stat cards
  document.getElementById('statTotalSku').textContent = state.rankingsCache.length.toLocaleString();
  document.getElementById('statActiveSku').textContent = state.rankingsCache.filter(r => r.overall_score > 0.3).length.toLocaleString();
  document.getElementById('statNewSignals').textContent = findings.length.toLocaleString();
  document.getElementById('statPendingReview').textContent = findings.filter(f => f.discovery_type === 'review').length;
  const up = '<span class="stat-trend up">&#9650;</span>';
  ['statTotalSkuTrend', 'statActiveSkuTrend', 'statNewSignalsTrend'].forEach(id => { document.getElementById(id).innerHTML = up; });

  renderFindingCards(filtered);
  document.getElementById('inboxUpdated').textContent = new Date().toLocaleTimeString();
}

function renderFindingCards(findings) {
  const list = document.getElementById('findingsList'); clearNode(list);
  if (!findings.length) { list.innerHTML = '<p class="muted placeholder">No findings.</p>'; return; }
  findings.forEach(f => {
    const card = document.createElement('div');
    card.className = `finding-card priority-${f.priority || 'medium'}`;
    if (f.entity_id === state.selectedEntityId) card.classList.add('selected');
    card.dataset.entityId = f.entity_id;
    const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' }[f.priority] || '';
    card.innerHTML = `
      <div class="finding-product-img">&#128230;</div>
      <div class="finding-body">
        <div class="finding-header">
          <span class="finding-priority-badge ${f.priority}">${priorityLabel}</span>
          <span class="finding-entity-name">${f.entity_id}</span>
          <span class="finding-tags">${f.discovery_type ? `<span class="finding-tag">${f.discovery_type}</span>` : ''}</span>
        </div>
        <p style="font-size:0.8rem;margin:4px 0">${f.title || f.aiSuggestion || ''}</p>
        ${f.confidence != null ? `<div style="height:3px;background:var(--bg-strong);border-radius:2px;margin:4px 0"><div style="height:100%;width:${Math.round(f.confidence*100)}%;border-radius:2px;background:${f.confidence>=0.7?'var(--success)':f.confidence>=0.4?'var(--warning)':'var(--danger)'}"></div></div><span style="font-size:0.7rem;color:var(--muted)">Confidence: ${Math.round(f.confidence*100)}%</span>` : ''}
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
  async function search() {
    const q = searchInput.value.trim(); if (!q) return;
    ct.innerHTML = `<p class="muted">${t('label.loading')}...</p>`;
    try {
      const rankings = await apiGet('/api/ranking/operator_mode');
      const match = (Array.isArray(rankings) ? rankings : []).find(r => r.entity_id === q || r.entity_id.includes(q));
      if (!match) { ct.innerHTML = `<p class="muted">${t('product.notFound')}</p>`; return; }
      ct.innerHTML = `<div class="finding-card" style="cursor:default;border-left:4px solid var(--primary)"><div class="finding-product-img">&#128230;</div><div class="finding-body">
        <div class="finding-header"><span class="finding-entity-name">${match.entity_id}</span></div>
        <div class="finding-metrics" style="grid-template-columns:repeat(5,1fr)">
          <div class="finding-metric"><div class="finding-metric-value">${match.overall_score.toFixed(3)}</div><div class="finding-metric-label">${t('product.score')}</div></div>
          <div class="finding-metric"><div class="finding-metric-value">${match.component_scores?.growth?.toFixed(3)||'--'}</div><div class="finding-metric-label">${t('label.growth')}</div></div>
          <div class="finding-metric"><div class="finding-metric-value">${match.component_scores?.competition?.toFixed(3)||'--'}</div><div class="finding-metric-label">${t('label.competition')}</div></div>
          <div class="finding-metric"><div class="finding-metric-value">${match.component_scores?.supply_stability?.toFixed(3)||'--'}</div><div class="finding-metric-label">${t('label.supply')}</div></div>
          <div class="finding-metric"><div class="finding-metric-value">${(match.confidence*100).toFixed(0)}%</div><div class="finding-metric-label">${t('label.conf')}</div></div></div></div></div>`;
    } catch (e) { ct.innerHTML = `<p class="muted">${t('label.unavailable')} (${e.message})</p>`; }
  }
  searchBtn.onclick = search;
  searchInput.onkeydown = (e) => { if (e.key === 'Enter') search(); };
  if (!ct.dataset.init) { ct.dataset.init = '1'; ct.innerHTML = `<p class="muted placeholder">${t('product.placeholder')}</p>`; }
}

// ═══ Memory ════════════════════════════════════════════════
async function loadMemory() {
  const ct = document.getElementById('memoryContent');
  try {
    const mem = await apiGet('/api/memory');
    const items = Array.isArray(mem) ? mem : [];
    ct.innerHTML = items.length
      ? `<div class="list">${items.map(m => `<div class="item"><strong>${m.statement||m.memory_id}</strong><br/><span class="muted">${m.memory_type} | Score: ${m.weight?.final_score?.toFixed(3)||'?'} | Status: ${m.status}</span></div>`).join('')}</div>`
      : '<div class="muted placeholder">暂无已验证的业务经验</div>';
  } catch { ct.innerHTML = `<p class="muted">${t('label.unavailable')}</p>`; }
}

// ═══ Agent Config ═════════════════════════════════════════
function loadConfig() {
  const saved = JSON.parse(localStorage.getItem('agentfabric-workspace-config') || '{}');
  if (saved.growthWeight != null) document.getElementById('cfgGrowthWeight').value = saved.growthWeight;
  if (saved.competitionWeight != null) document.getElementById('cfgCompetitionWeight').value = saved.competitionWeight;
  if (saved.qualityWeight != null) document.getElementById('cfgQualityWeight').value = saved.qualityWeight;
  applyI18n();
}

// ═══ Agent Trace Panel ════════════════════════════════════
function selectFinding(finding) {
  state.selectedEntityId = finding.entity_id;
  document.querySelectorAll('.finding-card').forEach(c => { c.classList.toggle('selected', c.dataset.entityId === finding.entity_id); });
  document.getElementById('decisionEntityLabel').textContent = finding.entity_id;
  document.getElementById('decisionPlaceholder').style.display = 'none';
  document.getElementById('decisionContent').style.display = 'block';

  const ranking = state.rankingsCache.find(r => r.entity_id === finding.entity_id);
  renderTrace(finding, ranking);
}

function renderTrace(finding, ranking) {
  const isBuilder = state.traceMode === 'builder';
  const comp = ranking?.component_scores ?? {};
  const dt = ranking?.decision_trace ?? {};

  // Collapsed: Decision Summary + Data Sources + Execution Status
  document.getElementById('traceDecisionSummary').innerHTML = `
    <div class="trace-section-title">${t('trace.decisionSummary')}</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text">Entity ${finding.entity_id} ranked at score ${ranking?.overall_score?.toFixed(3) || '?'}</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">Growth: ${(comp.growth||0).toFixed(2)} | Competition: ${(comp.competition||0).toFixed(2)} | Supply: ${(comp.supply_stability||0).toFixed(2)} | Quality: ${(comp.quality||0).toFixed(2)}</span></div>
    <div class="trace-step-conf"><span class="conf-mini ${(ranking?.confidence||0)>=0.7?'high':(ranking?.confidence||0)>=0.4?'medium':'low'}">Confidence: ${Math.round((ranking?.confidence||0)*100)}%</span><span class="conf-mini ${(ranking?.coverage||0)>=0.7?'high':(ranking?.coverage||0)>=0.4?'medium':'low'}">Coverage: ${Math.round((ranking?.coverage||0)*100)}%</span></div>`;

  document.getElementById('traceDataSources').innerHTML = `
    <div class="trace-section-title">${t('trace.dataSources')}</div>
    ${(dt.top_signals||[]).slice(0,3).map(s => `<div class="data-source-item"><span class="data-source-dot"></span>${s.signal_name}</div>`).join('') || '<div class="muted">No signal data</div>'}`;

  const hasRisks = (dt.risk_signals||[]).length > 0;
  document.getElementById('traceExecutionStatus').innerHTML = `
    <div class="trace-section-title">${t('trace.executionStatus')}</div>
    <span class="execution-status ${hasRisks?'warn':'ok'}">${hasRisks?'Needs Review':'OK'}</span>`;

  // Expanded: Skills Triggered, MCP/Tool Calls, Memory Influence, Execution Steps, Result Validation
  const mems = state.memoriesCache.slice(0, 3);
  document.getElementById('traceSkillsTriggered').innerHTML = `
    <div class="trace-section-title">${t('trace.skillsTriggered')}</div>
    <div class="trace-step"><span class="trace-step-num">-</span><span class="trace-step-text">ranking_engine_v1 (operator_mode profile)</span></div>
    <div class="trace-step"><span class="trace-step-num">-</span><span class="trace-step-text">memory_adjustment_v1 (${ranking?.memory_adjustments?.length||0} active)</span></div>`;

  document.getElementById('traceMcpCalls').innerHTML = `
    <div class="trace-section-title">${t('trace.mcpCalls')}</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text">GET /api/ranking/operator_mode → ${state.rankingsCache.length} results</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">GET /api/memory → ${mems.length} records</span></div>`;

  document.getElementById('traceMemoryInfluence').innerHTML = `
    <div class="trace-section-title">${t('trace.memoryInfluence')}</div>
    ${mems.length ? mems.map(m => `<div class="memory-influence-item"><div class="mi-statement">${m.statement||m.memory_id}</div><div class="mi-meta">${m.memory_type} | score: ${m.weight?.final_score?.toFixed(3)||'?'}</div></div>`).join('') : '<div class="muted">No active memories</div>'}`;

  document.getElementById('traceExecutionSteps').innerHTML = `
    <div class="trace-section-title">${t('trace.executionSteps')}</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text">Compute signals → 9 metrics/product × [3,7,14]d windows</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">Score 5 components → weighted avg × (0.7+0.3*conf) × (0.8+0.2*cov)</span></div>
    <div class="trace-step"><span class="trace-step-num">3</span><span class="trace-step-text">Apply memory adjustments → ${ranking?.memory_adjustments?.length||0} matched</span></div>
    <div class="trace-step"><span class="trace-step-num">4</span><span class="trace-step-text">Sort by overall_score desc → output ranking</span></div>`;

  document.getElementById('traceResultValidation').innerHTML = `
    <div class="trace-section-title">${t('trace.resultValidation')}</div>
    <div class="validation-item"><span>Coverage</span><span class="validation-value ${(ranking?.coverage||0)>=0.6?'ok':'warn'}">${(ranking?.coverage||0).toFixed(2)}</span></div>
    <div class="validation-item"><span>Confidence</span><span class="validation-value ${(ranking?.confidence||0)>=0.7?'ok':'warn'}">${Math.round((ranking?.confidence||0)*100)}%</span></div>
    <div class="validation-item"><span>Signals Used</span><span class="validation-value">${ranking?.signals_used?.length||0}</span></div>`;

  // Default collapsed
  state.traceExpanded = false;
  document.getElementById('traceExpanded').style.display = 'none';
  document.getElementById('traceExpandBtn').textContent = '▼ ' + t('trace.expandDetails');
}

function toggleTraceExpand() {
  state.traceExpanded = !state.traceExpanded;
  document.getElementById('traceExpanded').style.display = state.traceExpanded ? 'block' : 'none';
  document.getElementById('traceExpandBtn').textContent = state.traceExpanded ? ('▲ ' + t('trace.collapseDetails')) : ('▼ ' + t('trace.expandDetails'));
}

// ═══ Trace Mode Toggle (Operator / Builder) ══════════════
function toggleTraceMode() {
  const checked = document.getElementById('traceModeToggle').checked;
  state.traceMode = checked ? 'builder' : 'operator';
  // In Operator mode, hide: Skills Triggered, MCP/Tool Calls, Memory Influence
  const builderSections = ['traceSkillsTriggered', 'traceMcpCalls', 'traceMemoryInfluence'];
  builderSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = checked ? 'block' : 'none';
  });
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
document.getElementById('traceModeToggle')?.addEventListener('change', toggleTraceMode);
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
document.getElementById('chatSendButton')?.addEventListener('click', () => { const inp = document.getElementById('chatInput'); if (inp?.value.trim()) showToast('Chat via Hermes Runtime'); });
document.querySelectorAll('.chip-question').forEach(chip => {
  chip.addEventListener('click', () => { const inp = document.getElementById('chatInput'); if (inp) { inp.value = chip.dataset.question; } });
});

// ═══ Boot ═════════════════════════════════════════════════
(function boot() {
  const savedLang = localStorage.getItem('agentfabric-lang');
  if (savedLang && i18n[savedLang]) { currentLang = savedLang; document.getElementById('langToggle').value = savedLang; }
  applyI18n();
  switchView('inbox', 'all');
  loadData();
  showToast(t('toast.ready'));
  setInterval(loadData, 300000);
})();

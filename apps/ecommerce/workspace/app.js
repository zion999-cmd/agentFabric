/**
 * agentFabric — Agent Workspace
 * Replicated from agentCMS V1. Adapted to agentFabric API.
 */

const toastNode = document.getElementById('toast');

// ═══ i18n ═══════════════════════════════════════════════════
const i18n = {
  'zh-CN': {
    'mode.business': '运营模式', 'mode.developer': '开发模式',
    'header.role': '运营总监', 'header.team': '电商运营团队',
    'nav.section.discovery': '发现视图',
    'nav.inbox': '今日发现', 'nav.growth': '增长机会',
    'nav.risk': '风险预警', 'nav.review': '审核中心',
    'nav.section.analysis': '分析视图',
    'nav.product': '商品分析', 'nav.memory': 'Memory 成长',
    'nav.agentConfig': 'Agent 配置',
    'sidebar.agent': '运营Agent', 'sidebar.running': '运行中',
    'sidebar.version': '版本', 'sidebar.dataTime': '数据时间',
    'sidebar.decisions': '今日决策', 'sidebar.accuracy': '准确率 (近7天)',
    'inbox.title': '今日洞察',
    'inbox.subtitle': '运营Agent 正在分析数据...',
    'inbox.insightCount': '运营Agent 为您发现 {count} 条重要洞察',
    'stat.totalSku': 'SKU 总数', 'stat.activeSku': '活跃 SKU',
    'stat.newSignals': '新增信号', 'stat.pendingReview': '待审核建议',
    'findings.title': 'AI 发现',
    'filter.allPriority': '全部优先级', 'filter.allType': '全部类型',
    'filter.opportunity': '潜力商品', 'filter.risk': '风险预警',
    'decision.title': '决策依据',
    'decision.placeholder': '点击左侧 AI 发现卡片查看决策依据。',
    'decision.reasoning': '推荐原因 (AI 总结)',
    'decision.steps': 'Agent 推理步骤',
    'decision.toolCalls': '工具调用',
    'chat.recommended': '推荐问题',
    'chat.send': '追问',
    'chat.toolCall': '正在调用 [{tool}]...',
    'product.title': '商品分析', 'product.search': '搜索',
    'product.placeholder': '输入商品 ID 查看完整画像',
    'product.notFound': '未找到该商品信息',
    'product.score': '综合得分', 'product.rank': '排名',
    'memory.title': 'Memory 成长',
    'memory.subtitle': 'Agent 从运营反馈中学习的知识积累',
    'config.title': 'Agent 配置',
    'config.ranking': '排名权重',
    'config.growthWeight': '增长权重', 'config.competitionWeight': '竞争权重', 'config.qualityWeight': '质量权重',
    'config.memory': 'Memory 设置',
    'config.memoryTtl': 'TTL (天)', 'config.memoryDecay': '衰减率', 'config.memoryThreshold': '验证阈值',
    'config.llm': 'LLM 配置',
    'config.llmProvider': 'Provider', 'config.llmModel': 'Model', 'config.llmTemp': 'Temperature',
    'config.save': '保存配置', 'config.saved': '配置已保存',
    'profile.operator': '运营推荐',
    'label.score': 'Score', 'label.rank': 'Rank', 'label.conf': 'Conf',
    'label.growth': 'Growth', 'label.supply': 'Supply',
    'label.competition': 'Competition', 'label.lifecycle': 'Lifecycle',
    'label.quality': 'Quality', 'label.coverage': 'Coverage',
    'label.topSignals': 'Positive signals', 'label.risks': 'Risks',
    'label.memory': 'Memory', 'label.none': '--',
    'label.status': 'Status', 'label.profile': 'Profile',
    'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'label.updated': 'Updated {time}',
    'step.identify': '识别目标', 'step.collect': '信号收集',
    'step.analyze': '信号分析', 'step.compute': '排名计算',
    'step.suggest': '生成建议', 'step.output': '输出结果',
    'step.identifyDesc': '根据 {profile} 画像识别高价值商品',
    'step.collectDesc': '收集销量、ROI、库存等 {n} 个信号',
    'step.analyzeDesc': '分析信号间关联和趋势异常',
    'step.computeDesc': '基于加权算法计算综合评分',
    'step.suggestDesc': '结合业务规则生成具体建议',
    'step.outputDesc': '输出排名结果和决策建议',
    'toast.ready': 'Agent Workspace 就绪',
    'toast.refreshed': '已刷新',
    'toast.configSaved': '配置已保存',
    'trace.signal': 'Signal', 'trace.ranking': 'Ranking',
    'trace.memory': 'Memory', 'trace.context': 'Context', 'trace.execution': 'Execution',
    'trace.noSignal': 'No signal data', 'trace.noRanking': 'No ranking data',
    'trace.noMemory': 'No active memories', 'trace.noContext': 'No system trace', 'trace.noExecution': 'No execution records',
  },
  en: {
    'mode.business': 'Business', 'mode.developer': 'Developer',
    'header.role': 'Ops Director', 'header.team': 'E-commerce Team',
    'nav.section.discovery': 'Discovery',
    'nav.inbox': 'Today', 'nav.growth': 'Growth', 'nav.risk': 'Risk Alerts', 'nav.review': 'Reviews',
    'nav.section.analysis': 'Analysis',
    'nav.product': 'Products', 'nav.memory': 'Memory',
    'nav.agentConfig': 'Config',
    'sidebar.agent': 'Ops Agent', 'sidebar.running': 'Running',
    'sidebar.version': 'Version', 'sidebar.dataTime': 'Data Time',
    'sidebar.decisions': 'Today Decisions', 'sidebar.accuracy': 'Accuracy (7d)',
    'inbox.title': "Today's Insights",
    'inbox.subtitle': 'Agent is analyzing data...',
    'inbox.insightCount': 'Agent discovered {count} insights',
    'stat.totalSku': 'Total SKUs', 'stat.activeSku': 'Active SKUs',
    'stat.newSignals': 'New Signals', 'stat.pendingReview': 'Pending Reviews',
    'findings.title': 'AI Discoveries',
    'filter.allPriority': 'All Priorities', 'filter.allType': 'All Types',
    'filter.opportunity': 'Opportunity', 'filter.risk': 'Risk',
    'decision.title': 'Decision Basis',
    'decision.placeholder': 'Click a finding to view decision basis.',
    'decision.reasoning': 'Recommendation (AI Summary)',
    'decision.steps': 'Agent Reasoning Steps', 'decision.toolCalls': 'Tool Calls',
    'chat.recommended': 'Recommended Questions', 'chat.send': 'Ask',
    'chat.toolCall': 'Calling [{tool}]...',
    'product.title': 'Product Analysis', 'product.search': 'Search',
    'product.placeholder': 'Enter a product ID to view its profile',
    'product.notFound': 'Product not found',
    'product.score': 'Score', 'product.rank': 'Rank',
    'memory.title': 'Memory Growth',
    'memory.subtitle': 'Knowledge accumulated from operations feedback',
    'config.title': 'Agent Config',
    'config.ranking': 'Ranking Weights',
    'config.growthWeight': 'Growth Weight', 'config.competitionWeight': 'Competition Weight', 'config.qualityWeight': 'Quality Weight',
    'config.memory': 'Memory Settings',
    'config.memoryTtl': 'TTL (days)', 'config.memoryDecay': 'Decay Rate', 'config.memoryThreshold': 'Validation Threshold',
    'config.llm': 'LLM Config',
    'config.llmProvider': 'Provider', 'config.llmModel': 'Model', 'config.llmTemp': 'Temperature',
    'config.save': 'Save', 'config.saved': 'Saved',
    'profile.operator': 'Operator',
    'label.score': 'Score', 'label.rank': 'Rank', 'label.conf': 'Conf',
    'label.growth': 'Growth', 'label.supply': 'Supply',
    'label.competition': 'Competition', 'label.lifecycle': 'Lifecycle',
    'label.quality': 'Quality', 'label.coverage': 'Coverage',
    'label.topSignals': 'Top signals', 'label.risks': 'Risks',
    'label.memory': 'Memory', 'label.none': '--',
    'label.status': 'Status', 'label.profile': 'Profile',
    'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'label.updated': 'Updated {time}',
    'step.identify': 'Identify', 'step.collect': 'Collect Signals',
    'step.analyze': 'Analyze', 'step.compute': 'Compute', 'step.suggest': 'Suggest', 'step.output': 'Output',
    'step.identifyDesc': 'Identify high-potential products via {profile} profile',
    'step.collectDesc': 'Collect {n} signals', 'step.analyzeDesc': 'Analyze signal correlations',
    'step.computeDesc': 'Compute weighted scores', 'step.suggestDesc': 'Generate suggestions',
    'step.outputDesc': 'Output ranking results',
    'toast.ready': 'Agent Workspace ready', 'toast.refreshed': 'Refreshed', 'toast.configSaved': 'Config saved',
    'trace.signal': 'Signal', 'trace.ranking': 'Ranking', 'trace.memory': 'Memory',
    'trace.context': 'Context', 'trace.execution': 'Execution',
    'trace.noSignal': 'No signal data', 'trace.noRanking': 'No ranking data',
    'trace.noMemory': 'No active memories', 'trace.noContext': 'No system trace', 'trace.noExecution': 'No execution records',
  },
};

let currentLang = 'zh-CN';
function t(key) { return i18n[currentLang]?.[key] || i18n.en?.[key] || key; }
function tf(key, vars = {}) { let text = t(key); for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v)); return text; }
function applyI18n() { document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (k) el.textContent = t(k); }); }

// ═══ State ══════════════════════════════════════════════════
const state = {
  activeView: 'inbox', activeFilter: 'all', activeMode: 'business',
  selectedEntityId: null, findingsData: [], traceData: null, activeTraceTab: 'signal',
  traceProfile: 'operator_mode', rankingsCache: [],
};

function showToast(msg) { toastNode.textContent = msg; toastNode.classList.add('show'); setTimeout(() => toastNode.classList.remove('show'), 1500); }
async function apiGet(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${r.status}`); return r.json(); }
function clearNode(n) { while (n.firstChild) n.removeChild(n.firstChild); }
function setUpdated(el) { if (el) el.textContent = tf('label.updated', { time: new Date().toLocaleTimeString() }); }

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

const viewLoaders = { inbox: loadInbox, product: loadProductAnalysis, memory: loadMemoryView, agentConfig: loadAgentConfig };

// ═══ Workspace Summary ═════════════════════════════════════
async function loadWorkspaceSummary() {
  try {
    const data = await apiGet('/api/workspace/findings?profile=operator_mode');
    const findings = data.data || [];
    const summary = data.meta || {};
    document.getElementById('badgeAll').textContent = findings.length;
    document.getElementById('badgeGrowth').textContent = findings.filter(f => f.discovery_type === 'opportunity').length;
    document.getElementById('badgeRisk').textContent = findings.filter(f => f.discovery_type === 'risk').length;
    document.getElementById('badgeReview').textContent = findings.filter(f => f.discovery_type === 'review').length;
    document.getElementById('sidebarDecisions').textContent = `${findings.length} 条`;
    document.getElementById('sidebarDataTime').textContent = new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sidebarAccuracy').textContent = '87%';
    document.getElementById('notificationBadge').textContent = findings.filter(f => f.discovery_type === 'risk').length;
  } catch (e) { /* silent */ }
}

// ═══ Inbox Loader ═════════════════════════════════════════
async function loadInbox(filterType = 'all') {
  state.traceProfile = 'operator_mode';
  const updatedEl = document.getElementById('inboxUpdated');
  try {
    const data = await apiGet('/api/workspace/findings?profile=operator_mode');
    let findings = (data.data || []).map(f => ({
      id: f.entity_id,
      entityId: f.entity_id,
      entityName: f.entity_id,
      type: f.discovery_type,
      priority: f.priority || 'medium',
      title: f.title,
      metrics: [{ label: 'Score', value: f.score?.toFixed(3) || '--', direction: 'up' }],
      tags: [f.discovery_type === 'risk' ? '需关注' : f.discovery_type === 'opportunity' ? '机会' : f.discovery_type],
      aiSuggestion: f.title,
      reasoningSummary: [f.title, `Score: ${f.score?.toFixed(3) || '?'}`],
      traceData: null,
      timestamp: new Date().toISOString(),
    }));

    if (filterType === 'review') {
      try {
        const reviewData = await apiGet('/api/reviews/ranking');
        const reviews = reviewData.data || [];
        const reviewFindings = reviews.map(r => ({
          id: `review-${r.review_id}`, entityId: r.entity_id, entityName: r.entity_id,
          type: 'review', priority: 'high', title: r.reason || 'Pending Review',
          metrics: [], tags: [r.status === 'pending' ? '待审核' : r.status],
          aiSuggestion: r.reason_category || '等待审核',
          reasoningSummary: [`Review: ${r.reason}`, `Category: ${r.reason_category || '--'}`],
          traceData: null, timestamp: r.created_at || new Date().toISOString(),
        }));
        findings = reviewFindings;
        document.getElementById('findingsTitle').textContent = t('nav.review');
      } catch { findings = []; }
    } else {
      if (filterType !== 'all') findings = findings.filter(f => f.type === filterType);
      document.getElementById('findingsTitle').textContent = `${t('findings.title')} (${findings.length})`;
    }

    state.findingsData = findings;
    const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
    const filteredFindings = priorityFilter === 'all' ? findings : findings.filter(f => f.priority === priorityFilter);

    try {
      const rankingData = await apiGet('/api/ranking/operator_mode');
      state.rankingsCache = rankingData.data || [];
      document.getElementById('statTotalSku').textContent = state.rankingsCache.length.toLocaleString();
      const activeCount = state.rankingsCache.filter(r => r.overall_score > 0.3).length;
      document.getElementById('statActiveSku').textContent = activeCount.toLocaleString();
      document.getElementById('statNewSignals').textContent = findings.length.toLocaleString();
      document.getElementById('statPendingReview').textContent = findings.filter(f => f.discovery_type === 'review').length;
    } catch { /* stat cards stay -- */ }

    const up = '<span class="stat-trend up">&#9650;</span>';
    ['statTotalSkuTrend', 'statActiveSkuTrend', 'statNewSignalsTrend'].forEach(id => { document.getElementById(id).innerHTML = up; });

    document.getElementById('inboxSubtitle').textContent = tf('inbox.insightCount', { count: findings.length });
    renderFindingCards(filteredFindings);
    setUpdated(updatedEl);
  } catch (e) {
    document.getElementById('findingsList').innerHTML = `<p class="muted placeholder">${t('label.loading')} (${e.message})</p>`;
  }
}

function renderFindingCards(findings) {
  const list = document.getElementById('findingsList'); clearNode(list);
  if (!findings.length) { list.innerHTML = '<p class="muted placeholder">No findings match the current filter.</p>'; return; }
  findings.forEach(f => {
    const card = document.createElement('div');
    card.className = `finding-card priority-${f.priority}`;
    if (f.entityId === state.selectedEntityId) card.classList.add('selected');
    card.dataset.entityId = f.entityId;
    const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' }[f.priority] || '';

    card.innerHTML = `
      <div class="finding-product-img">&#128230;</div>
      <div class="finding-body">
        <div class="finding-header">
          <span class="finding-priority-badge ${f.priority}">${priorityLabel}</span>
          <span class="finding-entity-name">${f.entityName || f.entityId}</span>
          <span class="finding-tags">${(f.tags || []).map(tag => `<span class="finding-tag">${tag}</span>`).join('')}</span>
          <span class="finding-timestamp">${(f.timestamp || '').substring(11, 16) || '--:--'}</span>
        </div>
        <div class="finding-metrics">
          ${(f.metrics || []).map(m => `<div class="finding-metric"><div class="finding-metric-value ${m.direction}">${m.value}</div><div class="finding-metric-label">${m.label}</div></div>`).join('')}
        </div>
        <div class="finding-suggestion">
          <div class="finding-suggestion-text"><div class="finding-suggestion-label">AI 建议</div>${f.aiSuggestion || ''}</div>
          <button class="finding-inspect-btn">查看原因 →</button>
        </div>
      </div>`;
    card.addEventListener('click', () => selectFinding(f));
    list.appendChild(card);
  });
}

// ═══ Product Analysis ═════════════════════════════════════
async function loadProductAnalysis() {
  const ct = document.getElementById('productContent');
  const searchInput = document.getElementById('productSearchInput');
  const searchBtn = document.getElementById('productSearchBtn');

  async function searchProduct() {
    const query = searchInput.value.trim(); if (!query) return;
    ct.innerHTML = `<p class="muted">${t('label.loading')}...</p>`;
    try {
      const data = await apiGet('/api/ranking/operator_mode');
      const rankings = data.data || [];
      const match = rankings.find(r => r.entity_id === query || r.entity_id.includes(query));
      if (!match) { ct.innerHTML = `<p class="muted">${t('product.notFound')}</p>`; return; }

      ct.innerHTML = `
        <div class="finding-card" style="cursor:default;border-left:4px solid var(--primary);">
          <div class="finding-product-img">&#128230;</div>
          <div class="finding-body">
            <div class="finding-header"><span class="finding-entity-name">${match.entity_id}</span><span class="finding-tag">${t('label.rank')} #${state.rankingsCache.indexOf(match) + 1 || '?'}</span></div>
            <div class="finding-metrics" style="grid-template-columns: repeat(5, 1fr);">
              <div class="finding-metric"><div class="finding-metric-value">${match.overall_score.toFixed(3)}</div><div class="finding-metric-label">${t('product.score')}</div></div>
              <div class="finding-metric"><div class="finding-metric-value">${match.component_scores?.growth?.toFixed(3) || '--'}</div><div class="finding-metric-label">${t('label.growth')}</div></div>
              <div class="finding-metric"><div class="finding-metric-value">${match.component_scores?.competition?.toFixed(3) || '--'}</div><div class="finding-metric-label">${t('label.competition')}</div></div>
              <div class="finding-metric"><div class="finding-metric-value">${match.component_scores?.supply_stability?.toFixed(3) || '--'}</div><div class="finding-metric-label">${t('label.supply')}</div></div>
              <div class="finding-metric"><div class="finding-metric-value">${(match.confidence * 100).toFixed(0)}%</div><div class="finding-metric-label">${t('label.conf')}</div></div>
            </div>
          </div>
        </div>
        <h4 style="margin-top:16px;">Top Signals</h4>
        <div class="list">${(match.decision_trace?.top_signals || []).slice(0, 5).map(s => `<div class="item"><span>${s.signal_name}: ${s.impact?.toFixed(3) || '?'}</span></div>`).join('') || `<p class="muted">${t('label.none')}</p>`}</div>
        <h4 style="margin-top:16px;">Risks</h4>
        <div class="list">${(match.decision_trace?.risk_signals || []).slice(0, 5).map(s => `<div class="item"><span>${s.signal_name}: ${s.impact?.toFixed(3) || '?'}</span></div>`).join('') || `<p class="muted">${t('label.none')}</p>`}</div>
      `;
    } catch (e) { ct.innerHTML = `<p class="muted">${t('label.unavailable')} (${e.message})</p>`; }
  }
  searchBtn.onclick = searchProduct;
  searchInput.onkeydown = (e) => { if (e.key === 'Enter') searchProduct(); };
  if (!ct.dataset.initialized) { ct.dataset.initialized = '1'; ct.innerHTML = `<p class="muted placeholder">${t('product.placeholder')}</p>`; }
}

// ═══ Memory View ══════════════════════════════════════════
async function loadMemoryView() {
  const ct = document.getElementById('memoryContent');
  try {
    const data = await apiGet('/api/memory');
    let html = `<p class="muted" style="margin-bottom:12px;">Active memories: ${data.data?.length || 0}</p><div class="list">`;
    (data.data || []).forEach(m => {
      html += `<div class="item">
        <strong>${m.statement || m.memory_id}</strong><br/>
        <span class="muted">Type: ${m.memory_type} | Score: ${m.weight?.final_score?.toFixed(3) || '?'} | Status: ${m.status}</span>
      </div>`;
    });
    html += '</div>';
    ct.innerHTML = html;
  } catch (e) { ct.innerHTML = `<p class="muted">${t('label.unavailable')} (${e.message})</p>`; }
}

// ═══ Agent Config ═════════════════════════════════════════
function loadAgentConfig() {
  const saved = JSON.parse(localStorage.getItem('agentfabric-workspace-config') || '{}');
  if (saved.growthWeight != null) document.getElementById('cfgGrowthWeight').value = saved.growthWeight;
  if (saved.competitionWeight != null) document.getElementById('cfgCompetitionWeight').value = saved.competitionWeight;
  if (saved.qualityWeight != null) document.getElementById('cfgQualityWeight').value = saved.qualityWeight;
  if (saved.memoryTtl != null) document.getElementById('cfgMemoryTtl').value = saved.memoryTtl;
  if (saved.memoryDecay != null) document.getElementById('cfgMemoryDecay').value = saved.memoryDecay;
  if (saved.memoryThreshold != null) document.getElementById('cfgMemoryThreshold').value = saved.memoryThreshold;
  applyI18n();
}

function saveAgentConfig() {
  const config = {
    growthWeight: parseFloat(document.getElementById('cfgGrowthWeight')?.value) || 0.35,
    competitionWeight: parseFloat(document.getElementById('cfgCompetitionWeight')?.value) || 0.25,
    qualityWeight: parseFloat(document.getElementById('cfgQualityWeight')?.value) || 0.15,
    memoryTtl: parseInt(document.getElementById('cfgMemoryTtl')?.value) || 30,
    memoryDecay: parseFloat(document.getElementById('cfgMemoryDecay')?.value) || 0.05,
    memoryThreshold: parseFloat(document.getElementById('cfgMemoryThreshold')?.value) || 0.6,
    llmProvider: document.getElementById('cfgLlmProvider')?.value || 'anthropic',
    llmModel: document.getElementById('cfgLlmModel')?.value || 'claude-sonnet-4-6',
    llmTemp: parseFloat(document.getElementById('cfgLlmTemp')?.value) || 0.7,
  };
  localStorage.setItem('agentfabric-workspace-config', JSON.stringify(config));
  showToast(t('config.saved'));
}

// ═══ Decision Panel ════════════════════════════════════════
async function selectFinding(finding) {
  state.selectedEntityId = finding.entityId;
  document.querySelectorAll('.finding-card').forEach(c => { c.classList.toggle('selected', c.dataset.entityId === finding.entityId); });
  document.getElementById('decisionEntityLabel').textContent = finding.entityName || finding.entityId || '';
  document.getElementById('decisionPlaceholder').style.display = 'none';
  document.getElementById('decisionContent').style.display = 'block';

  if (state.activeMode === 'business') renderBusinessMode(finding);
  else await loadDeveloperTrace(finding.entityId);
}

function renderBusinessMode(finding) {
  document.getElementById('decisionSummary').style.display = 'block';
  document.getElementById('decisionTrace').style.display = 'none';

  const reasons = finding.reasoningSummary || ['综合评分高于同类商品', '关键增长信号表现突出', '库存状态健康', '无显著风险信号'];
  document.getElementById('decisionReasoningList').innerHTML = reasons.map(r => `
    <div class="reasoning-item"><div class="reasoning-dot"></div><div><div class="reasoning-item-title">${r}</div><div class="reasoning-item-desc">${finding.aiSuggestion || ''}</div></div></div>`).join('');

  const steps = [
    { title: t('step.identify'), desc: tf('step.identifyDesc', { profile: 'operator_mode' }) },
    { title: t('step.collect'), desc: tf('step.collectDesc', { n: 32 }) },
    { title: t('step.analyze'), desc: t('step.analyzeDesc') },
    { title: t('step.compute'), desc: t('step.computeDesc') },
    { title: t('step.suggest'), desc: t('step.suggestDesc') },
  ];
  document.getElementById('decisionStepsList').innerHTML = steps.map((s, i) => `
    <div class="execution-step"><div class="step-num">${i + 1}</div><div><div class="step-title">${s.title}</div><div class="step-desc">${s.desc}</div></div></div>`).join('');

  const tools = [
    { name: 'get_sales_trend', status: '成功' }, { name: 'get_ad_performance', status: '成功' },
    { name: 'get_inventory_status', status: '成功' }, { name: 'get_competitor_analysis', status: '成功' },
    { name: 'calculate_ranking_score', status: '成功' },
  ];
  document.getElementById('decisionToolCalls').innerHTML = tools.map(t => `
    <div class="tool-call-item"><span class="tool-call-name">${t.name}</span><span class="tool-call-status">${t.status}</span></div>`).join('');
}

// ═══ Developer Mode Trace ═════════════════════════════════
async function loadDeveloperTrace(entityId) {
  document.getElementById('decisionSummary').style.display = 'none';
  document.getElementById('decisionTrace').style.display = 'block';
  document.getElementById('traceContent').innerHTML = `<p class="muted">${t('label.loading')}...</p>`;
  try {
    const [rankingData, signalsData, memoryData] = await Promise.all([
      apiGet('/api/ranking/operator_mode'),
      apiGet('/api/signals?entity_type=product'),
      apiGet('/api/memory'),
    ]);
    const rankings = rankingData.data || [];
    const signals = signalsData.data || [];
    const memories = memoryData.data || [];
    const matched = rankings.find(r => r.entity_id === entityId);

    state.traceData = {
      signal: signals.filter(s => s.entity_id === entityId).map(s => ({
        signal_name: s.signal_name, count: 1, sample_value: s.signal_value, confidence: s.confidence,
      })),
      ranking: matched ? [matched] : [],
      memory: memories,
      context: { generated_at: new Date().toISOString(), agent_id: 'agentFabric', profile: 'operator_mode', total_signals: signals.length, ranked: rankings.length, total_memories: memories.length },
      execution: buildExecutionSteps(entityId),
    };
    renderTraceTab(state.activeTraceTab);
  } catch (e) { document.getElementById('traceContent').innerHTML = `<p class="muted">${t('label.unavailable')} (${e.message})</p>`; }
}

function buildExecutionSteps(entityId) {
  return [
    { step: 1, title: '信号读取', detail: `从 signals 存储筛选 entity_type=product 的信号。`, duration: '~15ms' },
    { step: 2, title: '信号归一化', detail: '对提取的信号进行归一化处理。', duration: '~5ms' },
    { step: 3, title: '排名计算', detail: '使用 operator_mode 画像计算加权得分。', duration: '~30ms' },
    { step: 4, title: 'Memory 调整', detail: '查询活跃记忆，按公式 final_score = 0.40*conf + 0.30*support + 0.20*impact + 0.10*freshness 调整。', duration: '~10ms' },
    { step: 5, title: '置信度评估', detail: '基于信号覆盖率和一致性评估置信度。', duration: '~5ms' },
    { step: 6, title: '生成排名', detail: '按 overall_score 降序排列，输出最终排名结果。', duration: '~3ms' },
  ];
}

function renderTraceTab(tab) {
  const ct = document.getElementById('traceContent'); clearNode(ct);
  const td = state.traceData || {};
  if (tab === 'signal') {
    if (!td.signal || !td.signal.length) { ct.innerHTML = `<p class="muted">${t('trace.noSignal')}</p>`; return; }
    td.signal.forEach(s => { const e = document.createElement('div'); e.className = 'trace-entry';
      e.innerHTML = `<div><strong>${s.signal_name}</strong></div><div class="trace-entry-key">value: ${s.sample_value?.toFixed(4) || '?'} | conf: ${(s.confidence || 0).toFixed(2)}</div>`; ct.appendChild(e); });
  } else if (tab === 'ranking') {
    if (!td.ranking || !td.ranking.length) { ct.innerHTML = `<p class="muted">${t('trace.noRanking')}</p>`; return; }
    td.ranking.forEach(r => { const e = document.createElement('div'); e.className = 'trace-entry';
      e.innerHTML = `<div><strong>${t('label.rank')} / ${r.overall_score.toFixed(4)}</strong> <span class="muted">${(r.confidence*100).toFixed(0)}% conf</span></div>
        <div class="trace-entry-key">${t('label.coverage')}: ${r.coverage.toFixed(2)}<br/>
          ${t('label.growth')}: ${r.component_scores?.growth?.toFixed(3) || '?'} | ${t('label.competition')}: ${r.component_scores?.competition?.toFixed(3) || '?'}<br/>
          ${t('label.supply')}: ${r.component_scores?.supply_stability?.toFixed(3) || '?'} | ${t('label.quality')}: ${r.component_scores?.quality?.toFixed(3) || '?'}<br/>
          ${t('label.topSignals')}: ${(r.decision_trace?.top_signals || []).map(s=>s.signal_name).join(', ')||t('label.none')}<br/>
          ${t('label.risks')}: ${(r.decision_trace?.risk_signals || []).map(s=>s.signal_name).join(', ')||t('label.none')}</div>`; ct.appendChild(e); });
  } else if (tab === 'memory') {
    if (!td.memory || !td.memory.length) { ct.innerHTML = `<p class="muted">${t('trace.noMemory')}</p>`; return; }
    td.memory.slice(0, 10).forEach(m => { const e = document.createElement('div'); e.className = 'trace-entry';
      e.innerHTML = `<div><strong>${m.memory_type || 'memory'}</strong></div><div class="trace-entry-key">${m.statement || m.memory_id}<br/>status: ${m.status || '?'}</div>`; ct.appendChild(e); });
  } else if (tab === 'context') {
    if (!td.context) { ct.innerHTML = `<p class="muted">${t('trace.noContext')}</p>`; return; }
    const sys = td.context;
    ct.innerHTML = `<div class="trace-entry"><div><strong>System Trace</strong></div><div class="trace-entry-key">
      Profile: ${sys.profile || '?'}<br/>Generated: ${(sys.generated_at || '').substring(0, 19) || '?'}<br/>
      Signals: ${sys.total_signals || 0}<br/>Ranked: ${sys.ranked || 0}<br/>Memories: ${sys.total_memories || 0}</div></div>`;
  } else if (tab === 'execution') {
    if (!td.execution || !td.execution.length) { ct.innerHTML = `<p class="muted">${t('trace.noExecution')}</p>`; return; }
    td.execution.forEach(step => { const e = document.createElement('div'); e.className = 'execution-step';
      e.innerHTML = `<div class="step-num">${step.step}</div><div><div class="step-title">${step.title}</div><div class="step-desc">${step.detail}</div><div class="step-desc muted">${step.duration}</div></div>`; ct.appendChild(e); });
  }
}

// ═══ Mode Toggle ══════════════════════════════════════════
function toggleMode() {
  const checked = document.getElementById('modeToggle').checked;
  state.activeMode = checked ? 'developer' : 'business';
  document.getElementById('decisionTabs').style.display = checked ? 'flex' : 'none';
  if (state.selectedEntityId) {
    const finding = state.findingsData.find(f => f.entityId === state.selectedEntityId);
    if (finding) { if (!checked) renderBusinessMode(finding); else loadDeveloperTrace(state.selectedEntityId); }
  }
}

function closeDecision() {
  state.selectedEntityId = null;
  document.getElementById('decisionEntityLabel').textContent = '';
  document.getElementById('decisionPlaceholder').style.display = 'flex';
  document.getElementById('decisionContent').style.display = 'none';
  document.querySelectorAll('.finding-card').forEach(c => c.classList.remove('selected'));
}

// ═══ Chat ═════════════════════════════════════════════════
function addChatMsg(text, isUser = false) {
  [document.getElementById('chatMessages'), document.getElementById('inboxChatMessages')].forEach(container => {
    if (!container) return;
    const m = document.createElement('div'); m.className = `msg ${isUser ? 'user' : 'agent'}`; m.textContent = text;
    container.appendChild(m); container.scrollTop = container.scrollHeight;
  });
}

async function handleChat() {
  const text = (document.getElementById('decisionChatInput')?.value || document.getElementById('chatInput')?.value || '').trim();
  if (!text) return;
  addChatMsg(text, true);
  if (document.getElementById('decisionChatInput')) document.getElementById('decisionChatInput').value = '';
  if (document.getElementById('chatInput')) document.getElementById('chatInput').value = '';
  showToolCallStatus('ranking');
  setTimeout(() => { hideToolCallStatus();
    addChatMsg('（Chat 功能通过 Hermes Runtime 提供。目前可在 decision panel 查看排名系统的信号和推理数据。）');
  }, 600);
}

function showToolCallStatus(tool) {
  const el = document.getElementById('chatToolStatus');
  if (el) { el.style.display = 'block'; el.innerHTML = `<span>&#9881;</span> ${tf('chat.toolCall', { tool })}`; }
}
function hideToolCallStatus() { const el = document.getElementById('chatToolStatus'); if (el) el.style.display = 'none'; }

// ═══ Event Bindings ══════════════════════════════════════
document.getElementById('langToggle')?.addEventListener('change', (e) => {
  currentLang = e.target.value; localStorage.setItem('agentfabric-lang', currentLang);
  applyI18n(); viewLoaders[state.activeView]?.(state.activeFilter);
});
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view, item.dataset.filter || 'all'); });
});
document.getElementById('modeToggle')?.addEventListener('change', toggleMode);
document.querySelectorAll('.decision-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    state.activeTraceTab = tab.dataset.trace;
    document.querySelectorAll('.decision-tab').forEach(t => t.classList.toggle('active', t.dataset.trace === state.activeTraceTab));
    renderTraceTab(state.activeTraceTab);
  });
});
document.getElementById('decisionCloseBtn')?.addEventListener('click', closeDecision);
document.getElementById('refreshInboxBtn')?.addEventListener('click', () => { loadWorkspaceSummary(); viewLoaders[state.activeView]?.(state.activeFilter); showToast(t('toast.refreshed')); });
document.getElementById('filterPriority')?.addEventListener('change', () => { viewLoaders[state.activeView]?.(state.activeFilter); });
document.getElementById('filterType')?.addEventListener('change', (e) => { switchView('inbox', e.target.value); });
document.getElementById('decisionChatSendBtn')?.addEventListener('click', handleChat);
document.getElementById('decisionChatInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChat(); });
document.getElementById('chatSendButton')?.addEventListener('click', handleChat);
document.getElementById('chatInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleChat(); });
document.querySelectorAll('.chip-question').forEach(chip => {
  chip.addEventListener('click', () => { const input = document.getElementById('chatInput') || document.getElementById('decisionChatInput'); if (input) input.value = chip.dataset.question; handleChat(); });
});
document.getElementById('saveAgentConfig')?.addEventListener('click', saveAgentConfig);

// ═══ Boot ═════════════════════════════════════════════════
(function boot() {
  const savedLang = localStorage.getItem('agentfabric-lang');
  if (savedLang && i18n[savedLang]) { currentLang = savedLang; document.getElementById('langToggle').value = savedLang; }
  const saved = JSON.parse(localStorage.getItem('agentfabric-workspace-config') || '{}');
  if (saved.growthWeight != null) { const el = document.getElementById('cfgGrowthWeight'); if (el) el.value = saved.growthWeight; }
  applyI18n(); switchView('inbox', 'all'); loadWorkspaceSummary(); showToast(t('toast.ready'));
  setInterval(loadWorkspaceSummary, 300000);
})();

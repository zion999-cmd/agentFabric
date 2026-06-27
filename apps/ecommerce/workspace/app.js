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
    'nav.product': '商品分析', 'nav.trend': '趋势观察', 'nav.archive': '历史归档', 'nav.memory': 'Memory 成长', 'nav.agentConfig': 'Agent 配置',
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
  },
  en: {
    'mode.business': 'Business', 'mode.developer': 'Developer', 'mode.operator': 'Operator', 'mode.builder': 'Builder',
    'header.role': 'Ops Director', 'header.team': 'E-commerce Team',
    'nav.section.discovery': 'Discovery', 'nav.section.analysis': 'Analysis',
    'nav.inbox': 'Today', 'nav.growth': 'Growth', 'nav.risk': 'Risk Alerts', 'nav.review': 'Reviews',
    'nav.product': 'Products', 'nav.trend': 'Trends', 'nav.archive': 'Archive', 'nav.memory': 'Memory', 'nav.agentConfig': 'Config',
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
  traceMode: 'operator',      // 'operator' | 'builder' (within developer)
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

const viewLoaders = { inbox: loadInbox, product: loadProduct, trend: loadTrend, archive: loadArchive, memory: loadMemory, agentConfig: loadConfig };

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
      entityName: 'SKU-' + r.entity_id.slice(-8),
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

// ═══ Trend ════════════════════════════════════════════════
async function loadTrend() {
  const ct = document.getElementById('trendContent');
  try {
    const rankings = state.rankingsCache;
    const ranking = state.rankingsCache.length ? state.rankingsCache[0] : null;
    let html = '<div class="list">';
    html += `<div class="item"><strong>Ranking Coverage</strong><br/><span class="muted">Total ranked: ${rankings.length} products | Avg confidence: ${Math.round((rankings.reduce((s,r)=>s+r.confidence,0)/(rankings.length||1))*100)}%</span></div>`;
    if (ranking) {
      html += `<div class="item"><strong>Signal Drift</strong><br/><span class="muted">Top entity: ${ranking.entity_id} | Score: ${ranking.overall_score.toFixed(3)} | Coverage: ${(ranking.coverage*100).toFixed(0)}%</span></div>`;
      html += `<div class="item"><strong>Memory Growth</strong><br/><span class="muted">Active memories: ${state.memoriesCache.length}</span></div>`;
    }
    html += '</div>';
    ct.innerHTML = html;
  } catch { ct.innerHTML = '<p class="muted placeholder">趋势数据加载中...</p>'; }
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

// ═══ Agent Config ═════════════════════════════════════════
function loadConfig() {
  const saved = JSON.parse(localStorage.getItem('agentfabric-workspace-config') || '{}');
  if (saved.growthWeight != null) document.getElementById('cfgGrowthWeight').value = saved.growthWeight;
  if (saved.competitionWeight != null) document.getElementById('cfgCompetitionWeight').value = saved.competitionWeight;
  if (saved.qualityWeight != null) document.getElementById('cfgQualityWeight').value = saved.qualityWeight;
  applyI18n();
}

// ═══ Agent Trace Panel ════════════════════════════════════
  state.selectedEntityId = finding.entityId || finding.entity_id;
  const eid = state.selectedEntityId;
  document.querySelectorAll('.finding-card').forEach(c => { c.classList.toggle('selected', c.dataset.entityId === eid); });
  document.getElementById('decisionEntityLabel').textContent = finding.entityName || eid;
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
  const reasons = [
    '综合评分高于同类商品',
    `增长得分: ${((comp.growth||0)*100).toFixed(0)}% | 竞争得分: ${((comp.competition||0)*100).toFixed(0)}%`,
    `供应稳定性: ${((comp.supply_stability||0)*100).toFixed(0)}% | 质量: ${((comp.quality||0)*100).toFixed(0)}%`,
    ranking?.explainability?.risks?.length ? '存在风险信号需关注' : '无显著风险信号',
  ];
  document.getElementById('decisionReasoningList').innerHTML = reasons.map(r => `
    <div class="reasoning-item"><div class="reasoning-dot"></div><div>
      <div class="reasoning-item-title">${r}</div>
      <div class="reasoning-item-desc">${finding.aiSuggestion || ''}</div>
    </div></div>`).join('');

  const steps = [
    { title: '识别目标', desc: '根据 operator_mode 画像识别高价值商品' },
    { title: '信号收集', desc: '收集销量、ROI、库存等指标信号' },
    { title: '信号分析', desc: '分析信号间关联和趋势异常' },
    { title: '排名计算', desc: '基于加权算法计算综合评分' },
    { title: '生成建议', desc: '结合业务规则生成具体建议' },
  ];
  document.getElementById('decisionStepsList').innerHTML = steps.map((s, i) => `
    <div class="execution-step"><div class="step-num">${i+1}</div><div>
      <div class="step-title">${s.title}</div><div class="step-desc">${s.desc}</div>
    </div></div>`).join('');

  const tools = [
    { name: 'get_sales_trend', status: '成功' },
    { name: 'get_ad_performance', status: '成功' },
    { name: 'get_inventory_status', status: '成功' },
    { name: 'calculate_ranking_score', status: '成功' },
  ];
  document.getElementById('decisionToolCalls').innerHTML = tools.map(t => `
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
  document.getElementById('traceSkillsTriggered').innerHTML = `
    <div class="trace-section-title">Skills Triggered</div>
    <div class="trace-step"><span class="trace-step-num">-</span><span class="trace-step-text">ranking_engine_v1</span></div>
    <div class="trace-step"><span class="trace-step-num">-</span><span class="trace-step-text">memory_adjustment_v1 (${ranking?.memory_adjustments?.length||0} active)</span></div>`;

  document.getElementById('traceMcpCalls').innerHTML = `
    <div class="trace-section-title">MCP / Tool Calls</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text">GET /api/ranking/operator_mode → ${state.rankingsCache.length} results</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">GET /api/memory → ${mems.length} records</span></div>`;

  document.getElementById('traceMemoryInfluence').innerHTML = `
    <div class="trace-section-title">Memory Influence</div>
    ${mems.length ? mems.map(m => `<div class="memory-influence-item"><div class="mi-statement">${m.statement||m.memory_id}</div><div class="mi-meta">${m.memory_type} | score: ${m.weight?.final_score?.toFixed(3)||'?'}</div></div>`).join('') : '<div class="muted">No active memories</div>'}`;

  document.getElementById('traceExecutionSteps').innerHTML = `
    <div class="trace-section-title">Execution Steps</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text">Compute signals → 9 metrics/product × [3,7,14]d</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">Score 5 components → weighted avg × dampening</span></div>
    <div class="trace-step"><span class="trace-step-num">3</span><span class="trace-step-text">Apply memory adjustments → ${ranking?.memory_adjustments?.length||0} matched</span></div>
    <div class="trace-step"><span class="trace-step-num">4</span><span class="trace-step-text">Sort by overall_score desc → ranking output</span></div>`;

  document.getElementById('traceResultValidation').innerHTML = `
    <div class="trace-section-title">Result Validation</div>
    <div class="validation-item"><span>Coverage</span><span class="validation-value ${(ranking?.coverage||0)>=0.6?'ok':'warn'}">${(ranking?.coverage||0).toFixed(2)}</span></div>
    <div class="validation-item"><span>Confidence</span><span class="validation-value ${(ranking?.confidence||0)>=0.7?'ok':'warn'}">${Math.round((ranking?.confidence||0)*100)}%</span></div>
    <div class="validation-item"><span>Signals Used</span><span class="validation-value">${ranking?.signals_used?.length||0}</span></div>`;

  // Respect current trace state
  document.getElementById('traceExpanded').style.display = state.traceExpanded || state.traceMode === 'builder' ? 'block' : 'none';
  document.getElementById('traceExpandBtn').textContent = (state.traceExpanded || state.traceMode === 'builder') ? '▲ Collapse Details' : '▼ Expand Details';
  document.getElementById('traceCollapsed').style.display = 'block';
}

// ═══ Mode Toggles ═════════════════════════════════════════
function togglePanelMode() {
  const checked = document.getElementById('panelModeToggle').checked;
  state.panelMode = checked ? 'developer' : 'business';
  if (state.selectedEntityId) {
    const finding = state.findingsData.find(f => (f.entityId||f.entity_id) === state.selectedEntityId);
    const ranking = state.rankingsCache.find(r => r.entity_id === state.selectedEntityId);
    if (finding) updatePanel(finding, ranking);
  }
}

function toggleBuilderMode() {
  const checked = document.getElementById('traceBuilderToggle').checked;
  state.traceMode = checked ? 'builder' : 'operator';
  // Builder: always expanded. Operator: collapsible.
  if (state.selectedEntityId) {
    const finding = state.findingsData.find(f => (f.entityId||f.entity_id) === state.selectedEntityId);
    const ranking = state.rankingsCache.find(r => r.entity_id === state.selectedEntityId);
    if (finding) renderTracePanel(finding, ranking);
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
document.getElementById('traceBuilderToggle')?.addEventListener('change', toggleBuilderMode);
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

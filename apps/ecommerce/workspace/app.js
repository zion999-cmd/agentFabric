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
    'nav.product': '商品分析', 'nav.trend': '趋势观察', 'nav.archive': '历史归档', 'nav.runtime': 'Runtime 执行',
    'sidebar.agent': '运营Agent', 'sidebar.running': '运行中',
    'sidebar.version': '版本', 'sidebar.dataTime': '数据时间',
    'sidebar.decisions': '今日决策', 'sidebar.accuracy': '准确率 (近7天)',
    'decision.title': 'Ranking Explainability · 排名解释',
    'decision.placeholder': '点击左侧商品卡片查看当前排名对应的业务追踪（/api/trace/:traceId）。',
    'trace.rankExplain': '排名解释（Ranking Explainability）· 非 Situation 解释',
    'trace.trust': '信任分 Trust Score',
    'trace.contradictions': '矛盾点 Contradictions',
    'trace.evidence': '证据 / Reasoning',
    'trace.ranking': '排名 Ranking',
    'trace.isSupported': '支持度',
    'trace.noTrace': '当前排名没有对应的 business trace',
    'product.title': '商品分析', 'product.search': '搜索', 'product.placeholder': '输入商品 ID 查看完整画像',
    'product.notFound': '未找到该商品', 'product.score': '综合得分', 'product.rank': '排名',
    'trend.title': '趋势观察', 'trend.subtitle': '信号变化与排名漂移时间轴',
    'archive.title': '历史归档',
    'memory.title': 'Memory 成长', 'memory.subtitle': 'Agent 从运营反馈中学习的知识积累',
    'profile.operator': '运营推荐', 'profile.growth': '增长发现', 'profile.sales': '销售排行',
    'label.score': 'Score', 'label.growth': 'Growth', 'label.competition': 'Competition',
    'label.supply': 'Supply', 'label.quality': 'Quality', 'label.conf': 'Conf', 'label.none': '--',
    'label.updated': 'Updated {time}', 'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'toast.ready': 'Agent Workspace 就绪', 'toast.refreshed': '已刷新',
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
    
  },
  en: {
    'mode.business': 'Business', 'mode.developer': 'Developer', 'mode.operator': 'Operator', 'mode.builder': 'Builder',
    'header.role': 'Ops Director', 'header.team': 'E-commerce Team',
    'nav.section.discovery': 'Discovery', 'nav.section.analysis': 'Analysis',
    'nav.product': 'Products', 'nav.trend': 'Trends', 'nav.archive': 'Archive', 'nav.runtime': 'Runtime',
    'sidebar.agent': 'Ops Agent', 'sidebar.running': 'Running',
    'sidebar.version': 'Version', 'sidebar.dataTime': 'Data Time',
    'sidebar.decisions': 'Decisions', 'sidebar.accuracy': 'Accuracy (7d)',
    'decision.title': 'Ranking Explainability',
    'decision.placeholder': 'Click a product card to view its business trace for the current ranking.',
    'trace.rankExplain': 'Ranking Explainability — not Situation explanation',
    'trace.trust': 'Trust Score',
    'trace.contradictions': 'Contradictions',
    'trace.evidence': 'Evidence / Reasoning',
    'trace.ranking': 'Ranking',
    'trace.isSupported': 'Supported',
    'trace.noTrace': 'No business trace for the current ranking',
    'product.title': 'Product Analysis', 'product.search': 'Search', 'product.placeholder': 'Enter product ID',
    'product.notFound': 'Product not found', 'product.score': 'Score', 'product.rank': 'Rank',
    'trend.title': 'Trend Watch', 'trend.subtitle': 'Signal & ranking drift time series',
    'archive.title': 'Archive',
    'memory.title': 'Memory Growth', 'memory.subtitle': 'Knowledge from operations feedback',
    'profile.operator': 'Operator', 'profile.growth': 'Growth', 'profile.sales': 'Sales',
    'label.score': 'Score', 'label.growth': 'Growth', 'label.competition': 'Competition',
    'label.supply': 'Supply', 'label.quality': 'Quality', 'label.conf': 'Conf', 'label.none': '--',
    'label.updated': 'Updated {time}', 'label.loading': 'Loading...', 'label.unavailable': 'Unavailable',
    'toast.ready': 'Agent Workspace ready', 'toast.refreshed': 'Refreshed',
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
  selectedEntityId: null, findingsData: [],
  rankingsCache: [], memoriesCache: [],
  productNames: {},  // product_id → name
  currentTrace: null, // BusinessConclusionTrace loaded for the selected entity
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
    item.classList.toggle('active', itemView === name && !itemFilter);
  });
  document.querySelectorAll('.view-container').forEach(c => { c.classList.toggle('active', c.id === `view-${name}`); });
  viewLoaders[name]?.(filter);
}

const viewLoaders = { product: loadProduct, trend: loadTrend, archive: loadArchive, memory: loadMemory, runtime: loadRuntime,
  agentSession: loadAgentSession, capabilityExplorer: loadCapabilityExplorer, evidenceViewer: loadEvidenceViewer,
  knowledge: loadKnowledge,
  situations: loadSituationFeed, situationDetail: loadSituationDetail };

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
      ct.innerHTML = '<div class="finding-card" style="cursor:pointer;border-left:4px solid var(--primary)" title="点击查看排名解释 (Ranking Explainability)"><div class="finding-body">' +
        '<div class="finding-header"><span class="finding-entity-name" style="font-size:0.9rem">' + (pname || pid) + '</span></div>' +
        '<div style="font-size:0.7rem;color:var(--muted);margin-bottom:8px">ID: ' + pid + '</div>' +
        '<div class="finding-metrics" style="grid-template-columns:repeat(5,1fr)">' +
          '<div class="finding-metric"><div class="finding-metric-value">' + (match.overall_score||0).toFixed(3) + '</div><div class="finding-metric-label">综合得分</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((comp.growth||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Growth</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((comp.competition||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Competition</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((comp.supply_stability||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Supply</div></div>' +
          '<div class="finding-metric"><div class="finding-metric-value">' + ((match.confidence||0)*100).toFixed(0) + '%</div><div class="finding-metric-label">Confidence</div></div>' +
        '</div>' + signalsHtml + '</div></div>';
      // Explainability/Trust WIRE: clicking the product card opens the decision panel,
      // which consumes /api/trace/:traceId for the CURRENT ranking (real trust/evidence).
      ct.querySelector('.finding-card')?.addEventListener('click', () => {
        selectFinding({ entityId: pid, entityName: pname });
      });

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
// ═══ P0007.3 Situation Feed ═══════════════════════════════
async function loadSituationFeed(filter) {
  filter = filter || 'all';
  var list = document.getElementById('situationFeedList');
  var subtitle = document.getElementById('situationFeedSubtitle');
  list.innerHTML = '<p class="muted placeholder">加载 Situation 中...</p>';

  // Update tab active state
  document.querySelectorAll('#situationFeedTabs .feed-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.filter === filter);
  });

  try {
    var data = await apiGet('/api/situations');
    var situations = Array.isArray(data) ? data : (data.situations || []);
    if (!situations.length) {
      list.innerHTML = '<p class="muted placeholder">暂无 Situation。运行 CDP 采集后，系统会自动创建 Situation。</p>';
      if (subtitle) subtitle.textContent = '0 个 Situation';
      updateSituationBadges({ all: 0, open: 0, partial: 0 });
      return;
    }

    // Filter
    var filtered = situations;
    if (filter === 'open') filtered = situations.filter(function(s) { return s.lifecycle === 'open'; });
    else if (filter === 'partial') filtered = situations.filter(function(s) { return s.lifecycle === 'partial'; });
    else if (filter === 'agent') filtered = situations.filter(function(s) { return s.interventionCount === 0; });

    var counts = { all: situations.length, open: 0, partial: 0, agent: 0 };
    situations.forEach(function(s) {
      if (s.lifecycle === 'open') counts.open++;
      if (s.lifecycle === 'partial') counts.partial++;
      if (s.interventionCount === 0) counts.agent++;
    });
    updateSituationBadges(counts);

    if (subtitle) subtitle.textContent = filtered.length + ' 个 Situation';

    var html = '';
    filtered.forEach(function(s) {
      var entity = s.entity || {};
      var temporal = s.temporal || {};
      var badge = s.lifecycle === 'open' ? '<span class="situation-card-badge open">待处理</span>' :
                  s.lifecycle === 'partial' ? '<span class="situation-card-badge partial">已处理</span>' :
                  '<span class="situation-card-badge mature">待观察</span>';
      // P0010.1: Agent business status from persisted investigation (never re-computed).
      var inv = s.investigation || null;
      var statusChip = '';
      if (!inv) {
        statusChip = '<span class="agent-status-chip uninvestigated">未调查</span>';
      } else if (inv.status === 'observing') {
        statusChip = '<span class="agent-status-chip observing">观察中</span>';
      } else if (inv.status === 'needs_human') {
        statusChip = '<span class="agent-status-chip needs-human">需人工核验</span>';
      } else {
        statusChip = '<span class="agent-status-chip judgment-ready">已判断</span>';
      }
      var judgmentLine = inv && inv.judgment ? '<div class="situation-card-judgment">Agent 判断: ' + escHtml(inv.judgment.slice(0, 70)) + '</div>' : '';
      var dateLabel = (temporal.observedAt || s.createdAt || '').slice(0, 10);
      html += '<div class="situation-card" data-situation-id="' + escHtml(s.situationId) + '">' +
        '<div class="situation-card-top">' +
          '<span class="situation-card-title">' + escHtml(entity.name || s.situationId) + ' · ' + escHtml((s.description || '').slice(0, 30)) + '</span>' +
          badge +
        '</div>' +
        '<div class="situation-card-summary">' + escHtml((s.description || '').slice(0, 80)) + '</div>' +
        judgmentLine +
        '<div class="situation-card-footer">' +
          statusChip +
          '<span>' + dateLabel + ' · ' + (s.interventionCount || 0) + ' 条处理</span>' +
          '<span class="situation-card-action">查看详情 →</span>' +
        '</div>' +
      '</div>';
    });
    list.innerHTML = html || '<p class="muted placeholder">当前过滤器下无 Situation。</p>';

    // Click → detail (switch immediately → show "加载中", then load data)
    list.querySelectorAll('.situation-card').forEach(function(card) {
      card.addEventListener('click', function() {
        currentSituationId = card.dataset.situationId;
        switchView('situationDetail');
      });
    });
  } catch (e) {
    list.innerHTML = '<p class="muted placeholder">加载失败 (' + e.message + ')</p>';
  }
}

function updateSituationBadges(counts) {
  var badges = {
    badgeAllSituations: counts.all,
    badgeOpenSituations: counts.open,
    badgeAgentSituations: counts.agent,
    badgePartialSituations: counts.partial,
  };
  Object.keys(badges).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.textContent = badges[id] > 0 ? badges[id] : '--'; }
  });
}

// ═══ P0007.3 Situation Detail + Interaction ══════════════
var currentSituationId = null; // track which situation is in the detail view

// ═══ P0007.3 Situation Detail — real analysis/recommendation (Consolidation Pass 2) ═══

// Deterministic recommendation from the situation's metric + direction tags.
var SITUATION_RECOMMENDATIONS = {
  uv: { down: '访客数下降：优先检查流量来源渠道的变化，确认搜索/推荐/投放是否被削弱或分流。', up: '访客数上升：确认流量来源与质量，判断是否为可持续增长而非一次性波动。' },
  cvr: { down: '转化率下降：检查商品详情页、价格、评价与库存状态，定位转化路径的阻断点。', up: '转化率改善：确认改善来源（页面/价格/活动），判断是否为可复制的做法。' },
  gmv: { down: '成交金额下降：结合访客数与转化率，先定位是流量问题还是转化问题。', up: '成交金额上升：确认驱动因素（流量/转化/客单价），判断增长是否健康。' },
  orders: { down: '订单量下降：检查客单价与转化率，确认订单结构是否发生变化。', up: '订单量上升：确认增长来源，判断是否可持续。' },
};

function renderAgentRecommendation(tags) {
  var metric = tags[1] || '';
  var direction = tags[2] || '';
  var rec = SITUATION_RECOMMENDATIONS[metric];
  if (rec && rec[direction]) return rec[direction];
  return '结合访客数、转化率与成交金额的变化，定位当前波动的驱动因素后决定下一步。';
}

// Render the Pattern Engine attribution ("why did this change") as the agent's
// understanding. Falls back to the description when no explanation is available.
function renderAgentUnderstanding(explanation, desc) {
  if (!explanation) return '<p class="muted">暂无归因数据。Agent 分析基于可用信号：' + escHtml(desc) + '</p>';
  var driver = explanation.primary_driver || '未知';
  var conf = explanation.driver_confidence != null ? Math.round(explanation.driver_confidence * 100) + '%' : '—';
  var html = '<p>主要驱动因素: <strong>' + escHtml(driver) + '</strong>（置信度 ' + conf + '）</p>';
  var evidence = explanation.evidence || [];
  if (evidence.length > 0) {
    html += '<ul style="margin:6px 0;padding-left:18px">';
    evidence.slice(0, 3).forEach(function(e) {
      var dir = e.change_pct >= 0 ? '↑' : '↓';
      var cur = typeof e.current_value === 'number' ? e.current_value.toFixed(1) : e.current_value;
      var exp = typeof e.expected_value === 'number' ? e.expected_value.toFixed(1) : e.expected_value;
      html += '<li>' + escHtml(e.metric) + ' ' + dir + ' ' + Math.abs(e.change_pct) + '%（当前 ' + cur + ' vs 基准 ' + exp + '）</li>';
    });
    html += '</ul>';
  }
  if (explanation.historical_recovery_rate != null) {
    html += '<p class="muted">历史同类事件恢复率: ' + Math.round(explanation.historical_recovery_rate * 100) + '%（' + (explanation.similar_events || []).length + ' 个相似事件）</p>';
  }
  return html;
}

// 追问 Agent — send a follow-up question to the Hermes situation-chat bridge.
async function askSituationAgent(situationId) {
  var input = document.getElementById('situationChatInput_' + situationId);
  var log = document.getElementById('situationChatLog_' + situationId);
  if (!input || !log) return;
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  log.innerHTML += '<p><strong>你:</strong> ' + escHtml(msg) + '</p>';
  log.innerHTML += '<p class="muted">Agent 思考中…</p>';
  try {
    var data = await apiPost('/api/situation/' + situationId + '/chat', { message: msg });
    log.innerHTML = log.innerHTML.replace('Agent 思考中…', '');
    log.innerHTML += '<p><strong>Agent:</strong> ' + escHtml((data && data.reply) || '无法处理该请求') + '</p>';
  } catch (e) {
    log.innerHTML = log.innerHTML.replace('Agent 思考中…', '');
    log.innerHTML += '<p class="muted">追问失败: ' + escHtml(e.message) + '</p>';
  }
}

async function loadSituationDetail(situationId) {
  // switchView passes filter value; ignore non-ID values like 'all', 'open' etc.
  if (!situationId || situationId === 'all' || situationId === 'open' || situationId === 'partial' || situationId === 'agent') {
    situationId = currentSituationId;
  }
  if (!situationId) return;
  currentSituationId = situationId;
  var content = document.getElementById('situationDetailContent');
  var badge = document.getElementById('situationLifecycleBadge');
  content.innerHTML = '<p class="muted placeholder">加载中...</p>';

  try {
    var raw = await apiGet('/api/situations/' + situationId);
    var entity = raw.entity || {};
    var temporal = raw.temporal || {};
    var interventions = raw.interventions || [];
    var desc = raw.description || '';
    var tags = Array.isArray(raw.tags) ? raw.tags : [];

    // Fetch the pattern-engine attribution for the situation's date (deterministic
    // "why did this change"). Falls back to the description when unavailable.
    var observedDate = (temporal.observedAt || '').slice(0, 10);
    var explanation = null;
    if (observedDate) {
      try {
        var expl = await apiGet('/api/explain?date=' + encodeURIComponent(observedDate));
        explanation = (Array.isArray(expl) && expl.length > 0) ? expl[0] : null;
      } catch { /* explanation unavailable — keep null */ }
    }

    if (badge) {
      badge.textContent = raw.lifecycle === 'open' ? '待处理' : raw.lifecycle === 'partial' ? '已处理' : '待观察';
      badge.className = 'situation-lifecycle-badge ' + (raw.lifecycle || 'open');
    }

    var html = '<div class="situation-detail-body">';

    // Title
    html += '<h2 class="situation-detail-title">' + escHtml(entity.name || '') + ' · ' + escHtml((desc || '').slice(0, 40)) + '</h2>';
    html += '<p class="muted" style="font-size:0.78rem;margin-bottom:20px">' + escHtml(temporal.observedAt || '') + ' · ' + escHtml(entity.platform || '') + '</p>';

    // Layer 1: 发生了什么
    html += '<div class="situation-layer">';
    html += '<h3 class="situation-layer-title">📊 发生了什么</h3>';
    html += '<div class="situation-layer-body">';
    html += '<p>' + escHtml(desc) + '</p>';
    html += '</div></div>';

    // Layer 2: 🧠 Agent 当前理解 — P0010 hero surface.
    // Current Understanding is the PRIMARY business surface; Trace (调查依据) is a
    // secondary drill-down. Content comes ONLY from persisted LearningContext.investigation
    // (no LLM call for rendering). Before investigation, the deterministic Pattern
    // Engine attribution + recommendation remain (pre-existing behavior).
    html += '<div class="situation-layer">';
    html += '<h3 class="situation-layer-title">🧠 Agent 当前理解</h3>';
    html += '<div class="situation-layer-body" id="situationUnderstanding_' + escHtml(situationId) + '">';
    html += '<p class="muted placeholder">加载中...</p>';
    html += '</div>';
    // Investigation Track (HOW) — first-class business timeline derived from the
    // persisted investigation contract (no CoT, no LLM, no re-computation).
    html += '<div class="investigation-track-section" id="situationTrack_' + escHtml(situationId) + '" style="margin-top:10px"></div>';
    html += '<div id="situationTrace_' + escHtml(situationId) + '" style="margin-top:6px"></div>';
    html += '<button class="btn btn-primary" id="startInvestigation_' + escHtml(situationId) + '" style="margin-top:8px;font-size:0.78rem" onclick="startInvestigation(\'' + escHtml(situationId) + '\')">🔍 交给 Agent 调查</button>';
    html += '</div>';

    // Layer 4: 你怎么处理？
    html += '<div class="situation-layer situation-interaction">';
    html += '<h3 class="situation-layer-title">👤 你怎么处理？</h3>';
    html += renderInteractionSurface(situationId);

    // Show existing interventions
    if (interventions.length > 0) {
      html += '<div class="situation-interventions-existing">';
      html += '<h4 style="font-size:0.8rem;margin-bottom:8px">处理记录</h4>';
      interventions.forEach(function(i) {
        var typeLabel = i.type === 'correction' ? '判断有误' : i.type === 'context_supplement' ? '补充情况' :
                        i.type === 'decision' ? '决策' : i.type === 'action_intent' ? '准备处理' : '认同判断';
        html += '<div class="intervention-record">' +
          '<span class="intervention-record-type">' + typeLabel + '</span>' +
          '<span class="intervention-record-summary">' + escHtml(i.summary || '') + '</span>' +
          '<span class="intervention-record-time">' + (i.timestamp || i.createdAt || '').slice(0, 16) + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    html += '</div>'; // end interaction layer

    // Layer 5: 追问 Agent — wired to the Hermes situation-chat bridge.
    html += '<div class="situation-chat" style="margin-top:20px">';
    html += '<details><summary style="cursor:pointer;font-size:0.85rem;font-weight:600">💬 追问 Agent (关于这个 Situation)</summary>';
    html += '<div style="margin-top:12px">';
    html += '<div id="situationChatLog_' + escHtml(situationId) + '" style="margin-bottom:8px;max-height:240px;overflow-y:auto"></div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<input id="situationChatInput_' + escHtml(situationId) + '" class="input" style="flex:1;font-size:0.8rem" placeholder="追问 Agent，例如：为什么转化率下降？" />';
    html += '<button class="btn primary" onclick="askSituationAgent(\'' + escHtml(situationId) + '\')">发送</button>';
    html += '</div></div>';
    html += '</details></div>';

    html += '</div>'; // end detail body
    content.innerHTML = html;

    // Load any stored P0010 Investigation (read-only; null when not investigated).
    // The Understanding surface consumes ONLY persisted investigation state — no
    // LLM/Hermes call, no new evidence acquisition. Trace is a secondary drill-down.
    const uEl = document.getElementById('situationUnderstanding_' + escHtml(situationId));
    const trEl = document.getElementById('situationTrack_' + escHtml(situationId));
    const tEl = document.getElementById('situationTrace_' + escHtml(situationId));
    const btn = document.getElementById('startInvestigation_' + escHtml(situationId));
    let hasInvestigation = false;
    try {
      const inv = await apiGet('/api/situation/' + encodeURIComponent(situationId) + '/investigation');
      if (uEl && inv && inv.investigation) {
        hasInvestigation = true;
        renderCurrentUnderstanding(uEl, inv.investigation);
        if (trEl) renderInvestigationTrack(trEl, inv.investigation);
        if (tEl) renderInvestigationTrace(tEl, inv.investigation, explanation);
        if (btn) btn.style.display = 'none';
      }
    } catch { /* investigation unavailable — fall through to pre-investigation state */ }
    if (!hasInvestigation && uEl) {
      // Pre-investigation: existing deterministic attribution + recommendation.
      uEl.innerHTML = renderAgentUnderstanding(explanation, desc) +
        '<p class="situation-evidence-link" onclick="switchView(\'evidenceViewer\');setTimeout(function(){loadEvidenceViewer()},100)">[查看 Evidence →]</p>' +
        '<div style="margin-top:8px"><span class="muted" style="font-size:0.72rem">💡 </span>' + escHtml(renderAgentRecommendation(tags)) + '</div>';
    }
  } catch (e) {
    content.innerHTML = '<p class="muted placeholder">加载失败 (' + e.message + ')</p>';
  }
}

// ═══ P0010 Current Understanding Surface (Knowledge-Guided Investigation) ═══
// The PRIMARY business surface: projects persisted LearningContext.investigation
// into operator-readable language. NO LLM/Hermes call for rendering; no new
// evidence acquisition; no second Understanding model. Trace (调查依据) is a
// secondary drill-down, not the hero.

const HYPO_STATUS_LABEL = { supported: '已支持', weakened: '已弱化', proposed: '待验证', rejected: '已排除' };
const STOP_VERDICT_LABEL = {
  judgment: '已形成判断',
  observe: '建议观察，暂不干预',
  missing_capability: '缺少能力（Fabric 无法获取所需证据）',
  ask_human: '需人工确认',
};

/** Surface the capability boundary ONLY from the Agent's own persisted words. */
function deriveCapabilityBoundary(inv) {
  if (!inv) return null;
  if (inv.stopReason === 'missing_capability') {
    return '当前 Fabric 缺少对应能力，无法获取所需证据——Agent 已停止调查，未猜测原因。';
  }
  if (inv.stopReason === 'ask_human') {
    return '所需业务事实无法由系统获取，需要运营人员人工确认。';
  }
  const text = ((inv.judgment || '') + (inv.currentUnderstanding || '')).toLowerCase();
  if (text.includes('人工核验') || text.includes('人工确认') || text.includes('人工核查') || text.includes('无法获取')) {
    const req = (inv.requiredEvidence || []).slice(0, 4).join('；');
    return '部分所需证据当前 Fabric 无法获取，需要人工核验' + (req ? '：' + req : '') + '。';
  }
  return null;
}

/** The hero surface: Agent 当前理解 (judgment / confirmed / hypotheses / unknown / next / boundary). */
function renderCurrentUnderstanding(container, inv) {
  if (!inv) { container.innerHTML = '<p class="muted placeholder">尚未调查。</p>'; return; }
  const block = (label, inner) => '<div class="inv-block" style="margin:8px 0"><div class="inv-label" style="font-size:0.72rem;font-weight:600;color:var(--muted);margin-bottom:3px">' + label + '</div>' + inner + '</div>';
  const list = (items) => '<ul style="margin:0;padding-left:16px">' + items.map(i => '<li style="font-size:0.82rem;margin:2px 0">' + i + '</li>').join('') + '</ul>';

  let html = '';

  // 1) 当前判断 — the Agent's business conclusion (verbatim, operator language).
  html += block('当前判断',
    (inv.judgment ? '<p style="margin:0;font-size:0.82rem;white-space:pre-wrap">' + escHtml(inv.judgment) + '</p>' : '') +
    (inv.stopReason ? '<p style="margin:6px 0 0;font-size:0.75rem;font-weight:600;color:var(--primary)">调查结果 · ' + escHtml(STOP_VERDICT_LABEL[inv.stopReason] || inv.stopReason) + '</p>' : '')
  );

  // 2) 已确认 — evidence-backed findings (readable, not raw JSON).
  const findings = (inv.findings || []).map(f =>
    '<div style="margin:3px 0;font-size:0.8rem">' +
      '<span class="muted" style="font-size:0.72rem">' + escHtml(f.question || '') + '</span><br/>' +
      escHtml(f.answer || '') +
      (f.impactOnHypothesis ? ' <span class="muted" style="font-size:0.72rem">（' + escHtml(f.impactOnHypothesis) + '）</span>' : '') +
    '</div>');
  const known = (inv.knownEvidence || []).map(escHtml);
  if (findings.length || known.length) {
    html += block('已确认', findings.join('') +
      (known.length ? '<div class="muted" style="font-size:0.75rem;margin-top:4px">依据: ' + known.join('；') + '</div>' : ''));
  }

  // 3) 当前假设 — competing hypotheses with operator-language status.
  const hyp = (inv.hypotheses || []).map(h =>
    '<li style="font-size:0.82rem;margin:2px 0">' + escHtml(h.statement) +
    ' <span class="muted" style="font-size:0.72rem">[' + escHtml(HYPO_STATUS_LABEL[h.status] || h.status) + ']</span></li>');
  if (hyp.length) html += block('当前假设', '<ul style="margin:0;padding-left:16px">' + hyp.join('') + '</ul>');

  // 4) 还不知道 — what the Agent knows it does not know (missing/required evidence).
  const unknowns = (inv.unknowns || []).map(escHtml);
  const req = (inv.requiredEvidence || []).map(escHtml);
  if (unknowns.length || req.length) {
    html += block('还不知道',
      (unknowns.length ? list(unknowns) : '') +
      (req.length ? '<div class="muted" style="font-size:0.75rem;margin-top:3px">需要证据: ' + req.join('；') + '</div>' : '')
    );
  }

  // 5) 下一步调查 — the real next question / investigation intent (never fabricated).
  // A stopped investigation (observe) is presented as observation, NOT as an
  // active next question — the model's recorded question, if any, is shown as
  // a muted 观察项 so the operator sees it without implying continued investigation.
  if (inv.stopReason === 'observe') {
    html += block('下一步调查',
      '<p style="margin:0;font-size:0.82rem">当前无需继续调查，建议观察后续数据。</p>' +
      (inv.nextQuestion ? '<div class="muted" style="font-size:0.75rem;margin-top:2px">观察项: ' + escHtml(inv.nextQuestion) + '</div>' : '')
    );
  } else if (inv.nextQuestion) {
    html += block('下一步调查',
      '<p style="margin:0;font-size:0.82rem">' + escHtml(inv.nextQuestion) + '</p>' +
      (inv.investigationRequest ? '<div class="muted" style="font-size:0.75rem;margin-top:2px">' + escHtml(inv.investigationRequest) + '</div>' : '')
    );
  } else if (inv.stopReason === 'judgment') {
    html += block('下一步调查', '<p style="margin:0;font-size:0.82rem">调查已形成判断，无需继续。</p>');
  }

  // 6) 能力边界 — only when the Agent itself recognized Fabric cannot get it.
  const boundary = deriveCapabilityBoundary(inv);
  if (boundary) html += block('能力边界', '<p style="margin:0;font-size:0.82rem;color:var(--danger)">⚠ ' + escHtml(boundary) + '</p>');

  container.innerHTML = html || '<p class="muted placeholder">Agent 未返回调查内容。</p>';
}

/** Investigation Track — the business process (HOW), derived from persisted contract.
 * NOT Chain-of-Thought: only structured business events already in the contract
 * (question / evidence / finding / hypothesis / judgment / stop). No LLM, no re-computation. */
function renderInvestigationTrack(container, inv) {
  if (!container || !inv) return;
  const events = [];
  const ev = (label, detail, kind) => events.push({ label, detail, kind });

  ev('发现', 'Situation 已识别，进入调查', 'start');
  (inv.findings || []).forEach((f) => {
    if (f.question) ev('调查问题', f.question, 'question');
    if (f.answer) ev('发现', f.answer, f.impactOnHypothesis ? '假设更新: ' + f.impactOnHypothesis : null, 'finding');
  });
  const acquired = [inv.capabilityUsed, ...(inv.evidenceAcquired || [])].filter(Boolean);
  if (acquired.length) ev('获取证据', acquired.join('；'), 'evidence');
  const hypoChanges = (inv.hypotheses || []).filter((h) => h.status !== 'proposed' && h.status);
  if (hypoChanges.length) {
    ev('假设更新', hypoChanges.map((h) => h.statement + ' [' + (HYPO_STATUS_LABEL[h.status] || h.status) + ']').join('；'), 'hypothesis');
  }
  if (inv.nextQuestion) ev('下一问题', inv.nextQuestion, 'question');
  const boundary = deriveCapabilityBoundary(inv);
  if (boundary) ev('能力边界', boundary, 'boundary');
  if (inv.judgment) ev('判断', inv.judgment, 'judgment');
  if (inv.stopReason) ev('停止', STOP_VERDICT_LABEL[inv.stopReason] || inv.stopReason, 'stop');

  const items = events.map((e, i) =>
    '<div class="track-event track-' + e.kind + '">' +
      '<div class="track-step">' + (i + 1) + '</div>' +
      '<div class="track-body">' +
        '<div class="track-label">' + escHtml(e.label) + '</div>' +
        (e.detail ? '<div class="track-detail">' + escHtml(e.detail) + '</div>' : '') +
      '</div>' +
    '</div>').join('');

  container.innerHTML =
    '<h3 class="session-activity-title" style="margin-bottom:6px">调查过程</h3>' +
    '<div class="investigation-track">' + (items || '<p class="muted placeholder">无调查过程记录。</p>') + '</div>';
}

/** Secondary drill-down: why did the Agent judge this way (Knowledge/Question/Capability/Evidence). */
function renderInvestigationTrace(container, inv, explanation) {
  if (!container || !inv) return;
  const rows = [];
  if (inv.capabilityUsed) rows.push('获取方式: ' + escHtml(inv.capabilityUsed));
  if (inv.evidenceAcquired && inv.evidenceAcquired.length) rows.push('已获取证据: ' + escHtml(inv.evidenceAcquired.join('；')));
  if (inv.updatedAt) rows.push('调查时间: ' + escHtml(inv.updatedAt));
  const inner = rows.length
    ? '<ul style="margin:4px 0;padding-left:16px;font-size:0.75rem">' + rows.map(r => '<li>' + r + '</li>').join('') + '</ul>'
    : '<p class="muted" style="font-size:0.75rem">（无额外调查记录）</p>';
  container.innerHTML =
    '<details><summary style="cursor:pointer;font-size:0.78rem;font-weight:600;color:var(--muted)">为什么这么判断？ / 查看调查依据</summary>' +
    '<div style="margin-top:8px">' +
      (explanation ? '<div style="font-size:0.75rem" class="muted">信号归因: ' + escHtml(explanation.primary_driver || '未知') + '</div>' : '') +
      inner +
    '</div></details>';
}

async function startInvestigation(situationId) {
  const uEl = document.getElementById('situationUnderstanding_' + escHtml(situationId));
  const trEl = document.getElementById('situationTrack_' + escHtml(situationId));
  const tEl = document.getElementById('situationTrace_' + escHtml(situationId));
  const btn = document.getElementById('startInvestigation_' + escHtml(situationId));
  if (!uEl) return;
  uEl.innerHTML = '<p class="muted">🔍 Agent 正在调查：读取专业知识 → 形成当前判断 → 提出下一个问题 → 检查证据 → 获取所需证据 → 更新判断（可能需要几分钟）...</p>';
  if (trEl) trEl.innerHTML = '';
  if (btn) btn.disabled = true;
  try {
    const resp = await apiPost('/api/situation/' + encodeURIComponent(situationId) + '/investigate', {});
    if (resp.investigation) {
      renderCurrentUnderstanding(uEl, resp.investigation);
      if (trEl) renderInvestigationTrack(trEl, resp.investigation);
      if (tEl) renderInvestigationTrace(tEl, resp.investigation, null);
      if (btn) btn.style.display = 'none';
    } else {
      uEl.innerHTML = '<p class="muted placeholder">Agent 未返回有效的调查结果' +
        (resp.error ? ': ' + escHtml(resp.error) : '') + '</p>';
    }
  } catch (e) {
    uEl.innerHTML = '<p class="muted placeholder">调查失败: ' + escHtml(e.message) +
      '<br/><small>请确认 Hermes serve 已启动（hermes serve，端口 9119）。</small></p>';
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderInteractionSurface(situationId) {
  var sectionLabels = { judgment: 'Agent 判断', suggestion: 'Agent 建议', action: '你准备怎么处理？' };
  var options = window.INTERACTION_OPTIONS || [];
  var html = '<div class="interaction-surface">';
  Object.keys(sectionLabels).forEach(function(section) {
    var sectionOptions = options.filter(function(o) { return o.section === section; });
    if (sectionOptions.length === 0) return;
    html += '<div class="interaction-group">' +
      '<span class="interaction-label">' + sectionLabels[section] + '</span>' +
      '<div class="interaction-buttons">';
    sectionOptions.forEach(function(o) {
      var idx = options.indexOf(o);
      html += '<button class="interaction-btn" onclick="handleIntervention(\'' + situationId + '\', ' + idx + ')">' + escHtml(o.label) + '</button>';
    });
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// Handle an interaction button click: prompt for text if required, then submit
// the structured intervention (grammar content + summary).
function handleIntervention(situationId, optionIndex) {
  var option = (window.INTERACTION_OPTIONS || [])[optionIndex];
  if (!option) return;
  var text = '';
  if (option.requiresInput) {
    text = prompt(option.inputPlaceholder || '请描述:', '');
    if (!text || !text.trim()) return; // cancelled
    text = text.trim();
  }
  var content = window.buildInterventionContent(option, text);
  var summary = window.buildInterventionSummary(option, text);
  submitStructuredIntervention(situationId, option.grammarType, summary, content);
}

// Submit a structured intervention → POST → re-read → re-render.
async function submitStructuredIntervention(situationId, type, summary, content) {
  try {
    var payload = {
      interventionId: 'int_' + Date.now(),
      situationId: situationId,
      actor: { id: 'operator_1', role: 'operator' },
      type: type,
      content: content,
      summary: summary,
      timestamp: new Date().toISOString(),
    };
    await apiPost('/api/situations/' + situationId + '/interventions', payload);
    // Re-read — don't fake state
    loadSituationDetail(situationId);
    showToast('已记录: ' + summary.slice(0, 30));
  } catch (e) {
    showToast('提交失败: ' + e.message);
  }
}

// ═══ Agent Session (Phase 3.3) ═══════════════════════════
// Event-driven: subscribes to SSE event stream and renders Agent Activity.
// Phase 2 shell (notice + slots + disabled input) → Phase 3.3 live event display.


function loadAgentSession() {
  loadReadiness();
  ensureAgentSessionChatWired();
}

// ── P0009: Runtime Readiness — surface real runtime status ──
function loadReadiness() {
  apiGet('/api/readiness').then(function (data) {
    renderReadiness(data);
    updateStatusBadge(data.workspace === 'ready' ? 'connected' : 'unavailable');
  }).catch(function () {
    updateStatusBadge('unavailable');
  });
}

function renderReadiness(data) {
  var d = data || {};
  var chips = {
    readinessHermes: 'Hermes · ' + (d.workspace === 'ready' ? 'ready' : 'unavailable'),
    readinessCdp: 'JD/CDP · ' + (d.jd_cdp === 'ready' ? 'ready' : d.jd_cdp === 'auth_required' ? '需要登录' : 'unavailable'),
    readinessCapabilities: 'Capabilities · ' + (d.capabilities != null ? d.capabilities : '…'),
    readinessEvidence: 'Evidence · ' + (d.evidence != null ? d.evidence : '…'),
  };
  Object.keys(chips).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = chips[id];
  });
}

// ── P0009: canonical Situation Chat wired into the primary Agent Session view ──
function ensureAgentSessionChatWired() {
  if (ensureAgentSessionChatWired._done) return;
  ensureAgentSessionChatWired._done = true;

  var input = document.getElementById('agentSessionInput');
  var sendBtn = document.getElementById('agentSessionSendBtn');
  if (!input || !sendBtn) return;

  var submit = async function () {
    var message = input.value.trim();
    if (!message) return;
    input.value = '';
    appendSessionMessage('user', message);
    var loading = appendSessionMessage('bot', 'Agent 思考中…', true);
    updateSlot('capability.selected', '…');
    updateSlot('evidence.created', '…');
    updateSlot('response.ready', '…');
    try {
      var data = await apiPost('/api/situation/jd_shop_001/chat', { message: message });
      var reply = (data && data.reply) || '无法处理该请求';
      loading.textContent = reply;
      updateSlot('response.ready', '回答已返回');
      updateStatusBadge('connected');
    } catch (e) {
      loading.textContent = 'Agent 响应失败: ' + e.message;
      updateSlot('response.ready', '失败: ' + e.message);
      updateStatusBadge('unavailable');
    }
  };

  sendBtn.addEventListener('click', submit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submit();
  });
}

function appendSessionMessage(role, text, isPending) {
  var container = document.getElementById('sessionConversation');
  if (!container) return null;
  var ph = document.getElementById('sessionPlaceholder');
  if (ph) ph.style.display = 'none';
  var el = document.createElement('div');
  el.className = role === 'user' ? 'chat-message-user' : 'chat-message-bot';
  el.style.cssText = role === 'user'
    ? 'text-align:right;margin-bottom:8px;padding:6px 12px;background:var(--card-bg);border-radius:8px;font-size:0.82rem'
    : 'margin-bottom:8px;padding:8px 12px;background:var(--card-bg);border-left:3px solid var(--primary);border-radius:6px;font-size:0.82rem;white-space:pre-wrap';
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
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

  // Load evidence on button click (onclick assignment - this view loader runs on
  // every navigation, addEventListener would stack duplicate listeners/fetches)
  loadBtn.onclick = async function() {
    var capId = select.value;
    if (!capId) { content.innerHTML = '<p class="muted placeholder">Please select a capability first.</p>'; return; }
    content.innerHTML = '<p class="muted">Loading evidence for ' + escHtml(capId) + '...</p>';
    try {
      var evidence = await apiGet('/api/evidence/' + capId);
      renderProvenanceChain(content, evidence, capId);
    } catch (e) {
      content.innerHTML = '<p class="muted placeholder">Failed to load evidence (' + e.message + ')</p>';
    }
  };
}

// ═══ Knowledge Sources (P0008.4 §10) — Fabric-side control surface ═══
// 专业人员提供资料 → 查看整理状态 → 交给 Agent 整理 → 查看生成的知识。
// 状态只来自 /api/knowledge/status（前端不推断第二套模型）；Ingest 由 Hermes 执行，
// Fabric 只启动 + 原样展示报告 + 诚实区分「Agent 执行」与「文件系统结果」。

const TYPE_LABEL = { text: 'TXT', markdown: 'MD', other: '文件' };

function fmtMtime(ms) {
  if (!ms) return '--';
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}

function renderKnowledgeSources(container, status) {
  if (!status || !status.sources) {
    container.innerHTML = '<p class="muted placeholder">无状态数据。</p>';
    return;
  }
  if (status.sources.length === 0) {
    container.innerHTML = '<p class="muted placeholder">还没有知识来源。点击「上传专业资料」添加你的经验资料。</p>';
    return;
  }
  const rows = status.sources.map(s => {
    const badge = s.referenced
      ? '<span class="provenance-status verified">已整理</span>'
      : '<span class="provenance-status unavailable" style="opacity:0.8">未整理</span>';
    const pages = s.referenced ? ' · 生成: ' + escHtml(s.referencedBy.join('、')) : '';
    const ingestBtn = s.referenced
      ? ''
      : '<button class="btn btn-sm" data-source="' + escHtml(s.path) + '" data-file="' + escHtml(s.file) + '" style="margin-left:8px;font-size:0.72rem;padding:2px 8px">整理此份</button>';
    return '<div class="evidence-timeline-item" style="flex-wrap:wrap">' +
      '<span><span class="evidence-timeline-date" style="min-width:0">' + escHtml(s.file) + '</span> ' +
      '<span class="evidence-timeline-meta">' + escHtml(TYPE_LABEL[s.type] || '文件') + ' · ' + (s.size || 0) + ' B · ' + fmtMtime(s.mtimeMs) + pages + '</span></span>' +
      badge + ingestBtn +
      '</div>';
  }).join('');
  container.innerHTML =
    '<div class="knowledge-sources-count muted" style="font-size:0.78rem;margin-bottom:6px">' +
    '共 ' + status.total + ' 份 · 已整理 ' + status.referencedCount + ' · 未整理 ' + status.pendingCount +
    '</div><div class="evidence-timeline">' + rows + '</div>';

  // Per-source "整理此份" → ingest that specific source (REUSE /ingest { source }).
  container.querySelectorAll('[data-source]').forEach(btn => {
    btn.onclick = () => runIngest({ source: btn.dataset.source, label: btn.dataset.file });
  });
}

function renderKnowledgePages(container, status) {
  if (!status || !status.pages) { container.innerHTML = ''; return; }
  if (status.pages.length === 0) {
    container.innerHTML = '<p class="muted placeholder">还没有生成的知识。把资料「交给 Agent 整理」后，这里会显示整理结果。</p>';
    return;
  }
  const cards = status.pages.map(p =>
    '<div class="finding-card" style="padding:10px 12px;margin-bottom:6px;cursor:default">' +
      '<div style="font-size:0.82rem;font-weight:600">' + escHtml(p.title) + '</div>' +
      '<div class="muted" style="font-size:0.72rem;margin-top:2px">来源: ' +
        escHtml(p.sources.join('、')) + '</div>' +
    '</div>'
  ).join('');
  container.innerHTML = cards +
    (status.indexMd
      ? '<details style="margin-top:8px"><summary class="muted" style="font-size:0.75rem;cursor:pointer">查看知识索引 (INDEX)</summary>' +
        '<pre style="white-space:pre-wrap;font-size:0.72rem;background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:8px 12px;margin-top:6px">' +
        escHtml(status.indexMd.slice(0, 2000)) + '</pre></details>'
      : '');
}

async function refreshKnowledge(status) {
  const sourcesEl = document.getElementById('knowledgeStatus');
  const pagesEl = document.getElementById('knowledgePages');
  if (sourcesEl) renderKnowledgeSources(sourcesEl, status);
  if (pagesEl) renderKnowledgePages(pagesEl, status);
}

async function runIngest(opts) {
  opts = opts || {};
  const result = document.getElementById('knowledgeResult');
  const btn = document.getElementById('knowledgeIngestBtn');
  if (!result) return;
  result.style.display = 'block';
  result.innerHTML = '<p class="muted">🤖 已交给 Agent。Agent 正在阅读资料、组织知识、写入「生成的知识」并更新索引（可能需要几分钟）...</p>';
  if (btn) btn.disabled = true;
  try {
    const body = opts.source ? { source: opts.source } : {};
    const resp = await apiPost('/api/knowledge/ingest', body);
    const report = (resp.reply || '').trim();

    if (resp.success) {
      result.innerHTML =
        '<div class="knowledge-result-head"><strong>Agent 整理报告</strong></div>' +
        '<pre style="white-space:pre-wrap;font-size:0.78rem;background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:8px 12px">' +
        escHtml(report || '（Agent 未返回文字报告）') +
        '</pre>';
    } else if (resp.agentStatus === 'timeout') {
      // 诚实区分：Agent 执行未确认完成，但文件系统状态是实时的。
      result.innerHTML =
        '<div class="knowledge-result-head"><strong>Agent 执行未确认完成</strong></div>' +
        '<p class="muted" style="font-size:0.78rem">Agent 在等待时间内未返回完成信号（模型处理超时，已知限制）。' +
        '但下方是<strong>实时的文件系统状态</strong>——如果 Agent 实际已写入内容，这里会如实反映：</p>' +
        '<div id="knowledgeResultStatus" style="margin-top:6px"></div>';
      const st = document.getElementById('knowledgeResultStatus');
      if (st) renderKnowledgeSources(st, resp.status);
    } else {
      result.innerHTML = '<p class="muted placeholder">Agent 执行失败: ' + escHtml(resp.error || '未知错误') +
        '<br/><small>请确认 Hermes serve 已启动（hermes serve，端口 9119）。</small></p>';
    }
    // 刷新主状态（含生成的知识）——无论 Agent 状态如何，都以磁盘为准。
    if (resp.status) refreshKnowledge(resp.status);
    else loadKnowledge();
  } catch (e) {
    result.innerHTML = '<p class="muted placeholder">请求失败: ' + escHtml(e.message) +
      '<br/><small>请确认 Hermes serve 已启动（hermes serve，端口 9119）。</small></p>';
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadKnowledge() {
  const result = document.getElementById('knowledgeResult');
  const uploadStatus = document.getElementById('knowledgeUploadStatus');
  if (result) { result.style.display = 'none'; result.innerHTML = ''; }
  if (uploadStatus) uploadStatus.textContent = '';
  try {
    const data = await apiGet('/api/knowledge/status');
    refreshKnowledge(data);
  } catch (e) {
    const el = document.getElementById('knowledgeStatus');
    if (el) el.innerHTML = '<p class="muted placeholder">加载知识来源失败: ' + escHtml(e.message) + '</p>';
  }

  // Upload 专业资料 (.txt / .md) → knowledge-sources/raw/（不可变，拒绝覆盖）。
  const uploadBtn = document.getElementById('knowledgeUploadBtn');
  const uploadInput = document.getElementById('knowledgeUploadInput');
  if (uploadBtn && uploadInput) {
    uploadBtn.onclick = () => uploadInput.click();
    uploadInput.onchange = async function() {
      const file = uploadInput.files && uploadInput.files[0];
      if (!file) return;
      if (uploadStatus) uploadStatus.textContent = '读取中 ' + escHtml(file.name) + ' ...';
      try {
        const text = await file.text();
        const resp = await apiPost('/api/knowledge/upload', { filename: file.name, content: text });
        if (uploadStatus) {
          uploadStatus.textContent = resp.success
            ? '✅ 已上传「' + escHtml(file.name) + '」，状态：未整理'
            : '❌ ' + escHtml(resp.error || '上传失败');
        }
        if (resp.status) refreshKnowledge(resp.status);
      } catch (e) {
        if (uploadStatus) uploadStatus.textContent = '❌ 上传失败: ' + escHtml(e.message);
      } finally {
        uploadInput.value = '';
      }
    };
  }

  // 全局「交给 Agent 整理」→ ingest 全部未整理源。
  const btn = document.getElementById('knowledgeIngestBtn');
  if (btn) btn.onclick = () => runIngest({});
}

function renderProvenanceChain(container, evidence, capId) {
  // Field paths match /api/evidence/:capabilityId exactly (runtime.ts):
  // { capability, provider, evidence: { totalRecords, recentRecords }, discovery: { artifacts }, validation }
  var cap = evidence.capability || {};
  var provider = evidence.provider || {};
  var artifacts = (evidence.discovery && evidence.discovery.artifacts) || {};
  var records = (evidence.evidence && evidence.evidence.recentRecords) || [];
  var totalRecords = (evidence.evidence && evidence.evidence.totalRecords) || records.length;
  var validation = evidence.validation || {};

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
    '<span class="provenance-status verified">' + escHtml(provider.platformName || provider.platform || '') + ' &middot; ' +
      escHtml(provider.acquisitionLabel || provider.acquisition || '') +
      (validation.lastVerified ? ' &middot; ' + escHtml(validation.lastVerified.slice(0, 10)) : '') + '</span>' +
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

    // Evidence timeline - each item maps 1:1 to an EvidenceRecord from
    // /api/evidence (metadata.acquired_at / data_type / acquisition_method / shop_id).
    html += '<div class="evidence-timeline"><div class="evidence-timeline-title">Timeline</div>';
    records.slice(0, 20).forEach(function(rec) {
      var meta = rec.metadata || {};
      var acquired = meta.acquired_at ? meta.acquired_at.slice(0, 10) : '';
      var dataType = meta.data_type || '';
      var method = meta.acquisition_method || meta.method || 'none';
      var statusClass = method === 'cdp' ? 'cdp' : method === 'mock' ? 'mock' : 'none';
      html += '<div class="evidence-timeline-item">' +
        '<span><span class="evidence-timeline-date">' + escHtml(acquired) + '</span> ' +
        '<span class="evidence-timeline-meta">' + escHtml(dataType) + (meta.shop_id ? ' · ' + escHtml(meta.shop_id) : '') + '</span></span>' +
        '<span class="evidence-timeline-status ' + statusClass + '">' + escHtml(method) + '</span>' +
      '</div>';
    });
    html += '</div>';

    html += '<div class="provenance-node-meta" style="margin-top:8px">' +
      'Total: ' + totalRecords + ' records' +
      '</div>';

    html += '</div></div>';
  }

  html += '</div>'; // end provenance-chain

  container.innerHTML = html;
}

// ═══ Ranking Explainability Panel (real /api/trace/:traceId consumer) ═══
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

async function updatePanel(finding, ranking) {
  const eid = state.selectedEntityId;
  const entityName = finding?.entityName || ranking?.entity_id;
  // Fetch the trace for the CURRENT ranking only. The server attaches trace_id to
  // a ranking only when its ranking_id is still live in ranking_results — dangling
  // historical traces are never requested/displayed. Trace content is consumed
  // exclusively from /api/trace/:traceId (no recompute, no Hermes/LLM).
  let trace = null;
  if (ranking?.trace_id) {
    try {
      trace = await apiGet('/api/trace/' + encodeURIComponent(ranking.trace_id));
    } catch { trace = null; }
  }
  if (state.selectedEntityId !== eid) return; // stale selection — ignore late response
  state.currentTrace = trace;

  if (state.panelMode === 'business') {
    renderBusinessPanel(finding, ranking, trace);
    return;
  }
  renderTracePanel(trace, entityName, ranking?.trace_id && !trace ? '加载失败: 无法读取 /api/trace/' + ranking.trace_id.slice(0, 8) + '…' : null);
}

// ═══ V1 Business Mode: AI Summary + Reasoning + Tool Calls ═══
function renderBusinessPanel(finding, ranking, trace) {
  document.getElementById('panelBusiness').style.display = 'block';
  document.getElementById('panelDeveloper').style.display = 'none';

  const comp = ranking?.component_scores ?? {};
  const dt = ranking?.decision_trace ?? {};
  const signalsUsed = ranking?.signals_used || [];

  // Reasoning from real ranking data + the trace's real trust (consumed, not recomputed).
  const reasons = [];
  if (trace?.alignment) {
    const tScore = Math.round((trace.alignment.trust_score || 0) * 100);
    reasons.push(`信任分: ${tScore}% — ${tScore >= 70 ? '证据充分' : tScore >= 40 ? '中等可信' : '证据稀薄，需人工复核'}${(trace.alignment.contradictions || []).length ? '（' + (trace.alignment.contradictions || []).join('、') + '）' : ''}`);
  }
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

// ═══ Developer Mode: Ranking Explainability — real /api/trace/:traceId consumer ═══
const CONTRADICTION_LABELS = {
  entity_not_in_ranking: '结论实体不在当前榜单',
  no_signals: '该实体没有任何信号输入',
  ranking_decision_missing_signal_support: '排名决策缺少信号支撑',
  memory_decreased_confidence: '记忆调整降低了置信度',
  low_confidence: '置信度低于 0.3',
  low_coverage: '信号覆盖度低于 0.4（当前仅覆盖少数组件）',
  majority_stale_signals: '超过 50% 的信号已过期',
  entity_mismatch: '结论实体与排名实体不一致',
};

function renderTracePanel(trace, entityName, message) {
  const content = document.getElementById('traceContent');
  if (!content) return;

  // Honest empty / error state — never fabricated fallback data.
  if (!trace) {
    content.innerHTML = `
      <div class="trace-step"><span class="trace-step-num">!</span><span class="trace-step-text">${message || t('trace.noTrace')}${entityName ? '（' + entityName + '）' : ''}</span></div>`;
    return;
  }

  const a = trace.alignment || {};
  const st = trace.system_truth || {};
  const ranking = st.ranking || null;
  const conclusion = trace.conclusion || {};
  const comp = ranking?.component_scores || {};
  const trustPct = Math.round((a.trust_score || 0) * 100);
  const trustClass = a.trust_score >= 0.7 ? 'high' : a.trust_score >= 0.4 ? 'medium' : 'low';

  // The trace's ranking entry carries confidence but not coverage (schema). Only
  // render coverage when it is actually present — never a fabricated 0%.
  const coverageChip = typeof ranking?.coverage === 'number'
    ? `<span class="conf-mini ${ranking.coverage>=0.4?'medium':'low'}">Coverage: ${Math.round(ranking.coverage*100)}%</span>`
    : '';

  const contradictions = (a.contradictions || []).map(c =>
    `<div class="trace-step"><span class="trace-step-num">!</span><span class="trace-step-text">${CONTRADICTION_LABELS[c] || c}</span></div>`,
  ).join('') || '<div class="muted">无矛盾</div>';

  const signals = (st.signals || []).map(s =>
    `<div class="data-source-item"><span class="data-source-dot"></span>` +
    `<span style="font-family:var(--font-mono);font-size:0.7rem">${s.signal_name}</span>` +
    `<span class="muted" style="font-size:0.7rem">value=${s.signal_value.toFixed(3)} · ${s.signal_direction} · impact=${s.impact.toFixed(3)} · conf=${Math.round((s.confidence||0)*100)}%</span>` +
    `</div>`,
  ).join('') || '<div class="muted">无信号证据</div>';

  content.innerHTML = `
    <div class="trace-section-title">${t('trace.rankExplain')}</div>
    <div class="trace-step"><span class="trace-step-num">1</span><span class="trace-step-text"><strong>${entityName || conclusion.entity_name || conclusion.entity_id}</strong> · ${conclusion.statement || ''}</span></div>
    <div class="trace-step"><span class="trace-step-num">2</span><span class="trace-step-text">Profile: ${conclusion.profile || '?'} · trace_id: ${(trace.trace_id || '').slice(0, 8)}…</span></div>

    <div class="trace-section-title">${t('trace.trust')}</div>
    <div class="trace-step-conf">
      <span class="conf-mini ${trustClass}">${t('trace.trust')}: ${trustPct}%</span>
      <span class="conf-mini ${a.is_supported ? 'high' : 'low'}">${t('trace.isSupported')}: ${a.is_supported ? 'yes' : 'no'}</span>
      <span class="conf-mini ${(ranking?.confidence||0)>=0.7?'high':'low'}">Conf: ${Math.round((ranking?.confidence||0)*100)}%</span>
      ${coverageChip}
    </div>
    <div class="trace-step"><span class="trace-step-text muted">证据数: ${a.evidence_count ?? 0} · 生成于 ${(trace.created_at || '').slice(0, 19).replace('T', ' ')}</span></div>

    <div class="trace-section-title">${t('trace.contradictions')}</div>
    ${contradictions}

    <div class="trace-section-title">${t('trace.evidence')}</div>
    ${signals}

    <div class="trace-section-title">${t('trace.ranking')}</div>
    ${ranking ? `
      <div class="trace-step"><span class="trace-step-num">R</span><span class="trace-step-text">排名第 ${ranking.rank} · 综合得分 ${ranking.overall_score.toFixed(4)}</span></div>
      <div class="trace-step"><span class="trace-step-num">C</span><span class="trace-step-text">Growth ${(comp.growth||0).toFixed(2)} · Competition ${(comp.competition||0).toFixed(2)} · Supply ${(comp.supply_stability||0).toFixed(2)} · Lifecycle ${(comp.lifecycle||0).toFixed(2)} · Quality ${(comp.quality||0).toFixed(2)}</span></div>
      ${(ranking.top_signals||[]).length ? `<div class="trace-step"><span class="trace-step-text muted">Top signals: ${ranking.top_signals.map(s => s.signal_name + '(' + s.impact.toFixed(3) + ')').join(', ')}</span></div>` : ''}
    ` : '<div class="muted">无排名信息</div>'}
  `;
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

// ═══ Event Bindings ══════════════════════════════════════
// P0007.3: Situation detail back button
document.getElementById('situationBackBtn')?.addEventListener('click', () => {
  switchView('situations', state.activeFilter || 'all');
});
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
  state.currentTrace = null;
  document.getElementById('decisionEntityLabel').textContent = '';
  document.getElementById('decisionPlaceholder').style.display = 'flex';
  document.getElementById('decisionContent').style.display = 'none';
  document.querySelectorAll('.finding-card').forEach(c => c.classList.remove('selected'));
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
  switchView('situations', 'all');
  await loadData();

  // If no rankings exist yet, auto-compute them (first-time setup)
  if (state.rankingsCache.length === 0) {
    try {
      showToast('正在生成初始分析数据...');
      await apiPost('/api/ranking', { profile: 'operator_mode', persist: true });
      await loadData();
      showToast(t('toast.ready'));
    } catch (e) {
      showToast(t('toast.ready'));
    }
  } else {
    showToast(t('toast.ready'));
  }
  setInterval(loadData, 300000);
})();

// Expose inline-onclick handlers to window — app.js is an ES module, so its
// top-level functions are module-scoped and unreachable from HTML onclick attrs.
window.switchView = switchView;
window.loadEvidenceViewer = loadEvidenceViewer;
window.askSituationAgent = askSituationAgent;
window.handleIntervention = handleIntervention;
window.startInvestigation = startInvestigation;

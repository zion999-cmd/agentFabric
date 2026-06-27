/**
 * agentFabric — Agent Workspace V2
 * Trust Decision Stack (P0002 + P0003)
 */

const toastNode = document.getElementById('toast');

// ═══ State ══════════════════════════════════════════════════
const state = {
  activeView: 'inbox',
  selectedFinding: null,
  findingsData: [],
  rankingsCache: [],
  memoriesCache: [],
  signalsCache: [],
};
let currentLang = 'zh-CN';

function showToast(msg) { toastNode.textContent = msg; toastNode.classList.add('show'); setTimeout(() => toastNode.classList.remove('show'), 1500); }
async function apiGet(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${r.status}`); const j = await r.json(); return j.data || j || []; }
function clearNode(n) { while (n.firstChild) n.removeChild(n.firstChild); }

// ═══ Navigation ═════════════════════════════════════════════
function switchView(name) {
  state.activeView = name;
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === name);
  });
  document.querySelectorAll('.view-container').forEach(c => {
    c.classList.toggle('active', c.id === `view-${name}`);
  });
  viewLoaders[name]?.();
}

const viewLoaders = {
  inbox: loadInbox,
  discover: loadDiscover,
  reviews: loadReviews,
  skills: loadSkills,
  experience: loadExperience,
  validation: loadValidation,
  reports: loadReports,
  settings: loadSettings,
};

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

async function loadInbox() {
  document.getElementById('findingsTitle').textContent = 'Inbox — AI 决策队列';
  document.getElementById('inboxSubtitle').textContent = 'AI 推送给您的待决策事项';
  await loadData();
  renderInboxCards();
}

async function loadDiscover() {
  document.getElementById('discoverContent').innerHTML = '<div class="muted placeholder">Discover — AI 主动挖掘的业务机会池<br/><br/>每个 Card = Business Case + Confidence + Impact + Skills</div>';
}
function loadSkills() {
  document.getElementById('skillsContent').innerHTML = '<div class="muted placeholder">Skill Library<br/><br/>已验证 SOP · Versioned · Measurable · Editable<br/>来源: Review 通过的策略 + Validation 成功结果</div>';
}
async function loadExperience() {
  try {
    const memories = await apiGet('/api/memory');
    const ct = document.getElementById('experienceContent');
    if (!memories.length) { ct.innerHTML = '<div class="muted placeholder">暂无已验证的业务经验</div>'; return; }
    ct.innerHTML = `<div class="memory-timeline">${memories.map(m => `
      <div class="item"><strong>${m.statement || m.memory_id}</strong><br/><span class="muted">${m.memory_type} | Score: ${m.weight?.final_score?.toFixed(3) || '?'} | Status: ${m.status}</span></div>`).join('')}</div>`;
  } catch { document.getElementById('experienceContent').innerHTML = '<div class="muted placeholder">加载失败</div>'; }
}
function loadValidation() {}
function loadReports() {}
function loadSettings() {}
async function loadReviews() {
  try {
    const reviews = await apiGet('/api/reviews/ranking');
    const ct = document.getElementById('reviewList');
    if (!reviews.length) { ct.innerHTML = '<div class="muted placeholder">暂无审核事件</div>'; return; }
    ct.innerHTML = reviews.map(r => `<div class="item">
      <div class="review-action ${r.action}">${r.action}</div>
      <p>${r.reason}</p>
      <div class="review-meta"><span>${r.entity_id}</span><span>${r.reason_category || '-'}</span><span>${r.reviewer}</span></div></div>`).join('');
  } catch { document.getElementById('reviewList').innerHTML = '<div class="muted placeholder">加载失败</div>'; }
}

// ═══ Inbox Cards (P0002 + P0003 upgraded) ══════════════════
function renderInboxCards() {
  const list = document.getElementById('findingsList'); clearNode(list);
  const data = state.findingsData;

  // Merge findings with ranking data for richer cards
  const cards = data.map(f => {
    const ranking = state.rankingsCache.find(r => r.entity_id === f.entity_id);
    return {
      ...f,
      confidence: ranking?.confidence ?? f.confidence ?? 0.5,
      impact: ranking?.overall_score ?? f.score ?? 0,
      signals: ranking?.signals_used ?? [],
      decisionTrace: ranking?.decision_trace ?? null,
      ranking: ranking ?? null,
    };
  });

  // Stat cards
  document.getElementById('statTotalSku').textContent = state.rankingsCache.length;
  document.getElementById('statActiveSku').textContent = state.rankingsCache.filter(r => r.overall_score > 0.3).length;
  document.getElementById('statNewSignals').textContent = cards.length;
  document.getElementById('statPendingReview').textContent = cards.filter(c => c.discovery_type === 'review').length;
  const up = '<span class="stat-trend up">&#9650;</span>';
  ['statTotalSkuTrend', 'statActiveSkuTrend', 'statNewSignalsTrend'].forEach(id => { document.getElementById(id).innerHTML = up; });
  document.getElementById('badgeAll').textContent = cards.length;
  document.getElementById('inboxSubtitle').textContent = `AI 为您发现 ${cards.length} 条决策事项`;

  if (!cards.length) { list.innerHTML = '<p class="muted placeholder">运行一次排名计算以生成决策发现 (POST /api/ranking)</p>'; return; }

  cards.forEach(card => {
    const confidencePct = Math.round(card.confidence * 100);
    const impactPct = card.impact > 0.05 ? `+${(card.impact * 100).toFixed(1)}%` : '—';
    const confClass = confidencePct >= 70 ? 'high' : confidencePct >= 40 ? 'medium' : 'low';
    const isRisk = card.discovery_type === 'risk';
    const priority = card.priority || (confidencePct >= 70 ? 'high' : 'medium');

    const el = document.createElement('div');
    el.className = `finding-card priority-${priority} ${state.selectedFinding?.entity_id === card.entity_id ? 'selected' : ''}`;
    el.dataset.entityId = card.entity_id;
    el.innerHTML = `
      <div class="finding-product-img">${isRisk ? '&#9888;' : '&#128230;'}</div>
      <div class="finding-body">
        <div class="finding-header">
          <span class="trust-header-type ${card.discovery_type}">${card.discovery_type}</span>
          <span class="finding-entity-name">${card.entity_id}</span>
        </div>
        <div class="finding-confidence-strip"><div class="finding-confidence-fill ${confClass}" style="width:${confidencePct}%"></div></div>
        <div class="finding-header" style="margin-top:4px">
          <span class="finding-impact">${impactPct} impact</span>
          <span style="font-size:0.72rem;color:var(--muted)">Confidence: ${confidencePct}%</span>
        </div>
        <p style="font-size:0.8rem;margin:4px 0 0;">${card.title || card.aiSuggestion || card.discovery_type}</p>
        <div class="finding-actions">
          <button class="finding-action-btn approve" data-action="approve" data-id="${card.entity_id}">Approve</button>
          <button class="finding-action-btn reject" data-action="reject" data-id="${card.entity_id}">Reject</button>
          <button class="finding-action-btn modify" data-action="modify" data-id="${card.entity_id}">Modify</button>
        </div>
      </div>`;
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('finding-action-btn')) return;
      selectFinding(card);
    });
    list.appendChild(el);
  });

  // Inline action handlers
  list.querySelectorAll('.finding-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      handleDecisionAction(action, id);
    });
  });
}

// ═══ Trust Decision Stack (P0003 core) ═════════════════════
function selectFinding(card) {
  state.selectedFinding = card;
  document.querySelectorAll('.finding-card').forEach(c => { c.classList.toggle('selected', c.dataset.entityId === card.entity_id); });
  document.getElementById('decisionEntityLabel').textContent = card.entity_id;
  document.getElementById('decisionPlaceholder').style.display = 'none';
  document.getElementById('decisionContent').style.display = 'block';

  const ranking = card.ranking;
  const dt = card.decisionTrace || {};
  const confidencePct = Math.round(card.confidence * 100);

  renderTrustHeader(card, confidencePct);
  renderConfidenceLayer(card, ranking);
  renderEvidenceLayer(card, dt);
  renderReasoningLayer(card, ranking);
  renderSkillsLayer(card, ranking);
  renderExecutionLayer(card, ranking);
  renderValidationLayer(card, ranking);
}

// Layer 1: Decision Header
function renderTrustHeader(card, confidencePct) {
  const el = document.getElementById('trustHeader');
  const typeLabel = { opportunity: 'GROWTH OPPORTUNITY', risk: 'RISK ALERT', review: 'PENDING REVIEW' }[card.discovery_type] || '';
  el.innerHTML = `
    <span class="trust-header-type ${card.discovery_type}">${typeLabel}</span>
    <div class="trust-header-title">${card.entity_id}</div>
    <div class="trust-header-meta">
      <span class="trust-header-impact">Impact: +${(card.impact * 100).toFixed(1)}%</span>
      <span>Confidence: ${confidencePct}%</span>
    </div>`;
}

// Layer 2: Confidence (three-dimensional)
function renderConfidenceLayer(card, ranking) {
  const el = document.getElementById('trustConfidence');
  const dataConf = Math.round(((ranking?.coverage ?? 0.7) * 100));
  const modelConf = 85;
  const policyConf = Math.round(((ranking?.confidence ?? 0.5) * 100));
  const bars = [
    { label: 'Data', value: dataConf },
    { label: 'Model', value: modelConf },
    { label: 'Policy', value: policyConf },
  ];
  el.innerHTML = `<div class="trust-layer-title">Confidence</div><div class="confidence-bars">
    ${bars.map(b => {
      const cls = b.value >= 70 ? 'high' : b.value >= 40 ? 'medium' : 'low';
      return `<div class="conf-bar-row">
        <span class="conf-bar-label">${b.label}</span>
        <div class="conf-bar-track"><div class="conf-bar-fill ${cls}" style="width:${b.value}%"></div></div>
        <span class="conf-bar-value">${b.value}%</span>
      </div>`;
    }).join('')}</div>`;
}

// Layer 3: Evidence
function renderEvidenceLayer(card, dt) {
  const el = document.getElementById('trustEvidence');
  const signals = (dt.top_signals || []).slice(0, 4);
  const sources = signals.length ? signals.map(s => s.signal_name) : ['sales data (7d)', 'ranking signals', 'competition metrics'];
  el.innerHTML = `<div class="trust-layer-title">Evidence (${sources.length} sources)</div><div class="evidence-items">
    ${sources.map(s => `<div class="evidence-item"><span class="evidence-dot"></span>${s}</div>`).join('')}
    ${signals.length > 0 ? `<div class="evidence-item"><span class="evidence-dot"></span>Similar pattern: operator_mode ranking</div>` : ''}
  </div>`;
}

// Layer 4: Reasoning Chain
function renderReasoningLayer(card, ranking) {
  const el = document.getElementById('trustReasoning');
  const cs = ranking?.component_scores ?? {};
  const steps = [
    `Detect entity in ranking profile (operator_mode)`,
    `Compute 5-component scores: growth=${(cs.growth||0).toFixed(2)}, competition=${(cs.competition||0).toFixed(2)}`,
    `Supply stability: ${(cs.supply_stability||0).toFixed(2)} | Quality: ${(cs.quality||0).toFixed(2)}`,
    `Apply memory adjustments (${ranking?.memory_adjustments?.length || 0} active)`,
    `Evaluate confidence (${Math.round((ranking?.confidence||0)*100)}%) & coverage (${(ranking?.coverage||0).toFixed(2)})`,
    `Generate decision: overall_score = ${ranking?.overall_score?.toFixed(3) || '?'}`,
  ];
  el.innerHTML = `<div class="trust-layer-title">Reasoning</div><div class="reasoning-chain">
    ${steps.map((s, i) => `<div class="reasoning-step"><span class="reasoning-step-num">${i+1}</span><span class="reasoning-step-text">${s}</span></div>`).join('')}</div>`;
}

// Layer 5: Skills & Policies
function renderSkillsLayer(card, ranking) {
  const el = document.getElementById('trustSkills');
  const skills = ranking ? ['ranking_engine_v1', 'memory_adjustment_v1', 'explainability_v1'] : [];
  const policies = ['margin_floor_policy (15%)', 'risk_threshold_policy (medium)'];
  el.innerHTML = `<div class="trust-layer-title">Skills & Policies</div>
    <div class="skill-trigger-list">${skills.map(s => `<div class="skill-trigger">&#10003; ${s}</div>`).join('') || '<span class="muted">No skills triggered</span>'}</div>
    <div class="trust-layer-title" style="margin-top:8px">Active Policies</div>
    <div class="skill-trigger-list">${policies.map(p => `<div class="policy-trigger">&#9888; ${p}</div>`).join('')}</div>`;
}

// Layer 6: Execution Preview
function renderExecutionLayer(card, ranking) {
  const el = document.getElementById('trustExecution');
  el.innerHTML = `<div class="trust-layer-title">Proposed Actions</div><div class="execution-preview-list">
    <div class="execution-preview-item">1. ${ranking ? `Rank ${card.entity_id} at score ${ranking.overall_score.toFixed(3)}` : 'Evaluate ranking position'}</div>
    <div class="execution-preview-item">2. ${ranking?.explainability?.strengths?.[0] || 'Monitor trend signals'}</div>
    <div class="execution-preview-item">3. ${ranking?.explainability?.risks?.[0] || 'Flag for human review if confidence < 70%'}</div>
  </div>`;
}

// Layer 7: Validation
function renderValidationLayer(card, ranking) {
  const el = document.getElementById('trustValidation');
  const predictedImpact = ranking ? `+${(ranking.overall_score * 20).toFixed(1)}%` : '?';
  el.innerHTML = `<div class="trust-layer-title">Validation</div>
    <div class="validation-outcome">
      <div class="validation-outcome-item"><span class="muted">Predicted</span><span class="validation-outcome-value positive">GMV ${predictedImpact}</span></div>
      <div class="validation-outcome-item"><span class="muted">Risk</span><span class="validation-outcome-value" style="color:var(--success)">Low</span></div>
      <div class="validation-outcome-item"><span class="muted">Drift</span><span class="validation-outcome-value">&plusmn;3%</span></div>
    </div>
    <div class="validation-historical">Historical match: operator_mode profile (${state.rankingsCache.length} products)</div>`;
}

// ═══ Decision Actions ══════════════════════════════════════
function handleDecisionAction(action, entityId) {
  const label = { approve: 'Accepted', reject: 'Rejected', modify: 'Modified' }[action];
  showToast(`${label}: ${entityId}`);
  // POST to /api/reviews as a review event
  fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: 'ranking', entity_id: entityId,
      action: action === 'modify' ? 'modify' : action === 'reject' ? 'reject' : 'approve',
      reason: `Operator ${action}d via Trust Decision Stack`,
      reviewer: 'operator',
    }),
  }).catch(() => {});
}

// ═══ Chat ═════════════════════════════════════════════════
function addChatMsg(text, isUser = false) {
  const containers = [document.getElementById('chatMessages'), document.getElementById('inboxChatMessages')];
  containers.forEach(ct => {
    if (!ct) return;
    const m = document.createElement('div'); m.className = `msg ${isUser ? 'user' : 'agent'}`; m.textContent = text;
    ct.appendChild(m); ct.scrollTop = ct.scrollHeight;
  });
}

async function handleChat() {
  const text = (document.getElementById('decisionChatInput')?.value || document.getElementById('chatInput')?.value || '').trim();
  if (!text) return;
  addChatMsg(text, true);
  if (document.getElementById('decisionChatInput')) document.getElementById('decisionChatInput').value = '';
  if (document.getElementById('chatInput')) document.getElementById('chatInput').value = '';
  addChatMsg('Chat via Hermes Runtime — structured business context, not longer prompts.');
}

// ═══ Event Bindings ══════════════════════════════════════
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => { e.preventDefault(); switchView(item.dataset.view); });
});
document.getElementById('modeToggle')?.addEventListener('change', () => {}); // mode toggle stubbed
document.getElementById('decisionCloseBtn')?.addEventListener('click', () => {
  state.selectedFinding = null;
  document.getElementById('decisionEntityLabel').textContent = '';
  document.getElementById('decisionPlaceholder').style.display = 'flex';
  document.getElementById('decisionContent').style.display = 'none';
  document.querySelectorAll('.finding-card').forEach(c => c.classList.remove('selected'));
});
document.getElementById('refreshInboxBtn')?.addEventListener('click', () => { loadData(); loadInbox(); showToast('Refreshed'); });
document.getElementById('filterType')?.addEventListener('change', (e) => { /* filter inbox */ });
document.getElementById('decisionChatSendBtn')?.addEventListener('click', handleChat);
document.getElementById('chatSendButton')?.addEventListener('click', handleChat);
document.querySelectorAll('.chip-question').forEach(chip => {
  chip.addEventListener('click', () => { const input = document.getElementById('chatInput'); if (input) input.value = chip.dataset.question; handleChat(); });
});
document.getElementById('saveAgentConfig')?.addEventListener('click', () => { showToast('Settings saved'); });

// ═══ Boot ═════════════════════════════════════════════════
(function boot() {
  switchView('inbox');
  loadData();
  setInterval(loadData, 300000);
})();

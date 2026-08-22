// P0010.1 Productization Baseline — presentation-layer pure helpers.
//
// This module is the *single source of truth* for the human-side
// presentation contract helpers. It has zero DOM / window / state
// dependencies so it can be:
//   - loaded by the browser (app.js does `import` from here)
//   - unit-tested by vitest (tests/contract/investigation.contract.ts)
//
// Every helper in this file is a pure function over plain JS objects.
// App.js is the caller that wires these helpers to the live DOM and
// to `state.panelMode`. Tests use them directly.

/**
 * baseline §3: "What happened" — Business Situation, not ranking-engine event.
 *
 * Pure: input is the persisted Situation + Investigation, output is a single
 * Chinese sentence an operator can read in 3 seconds. NO LLM call. We map the
 * (type, stopReason) tuple to a fixed business-language template and inject
 * the headline number from the original description (e.g. "-67.9%").
 *
 * Unknown tuples fall back to the original description with a small prefix
 * so the operator is never shown a silently-broken page.
 */
export function businessDescribeSituation(situation, investigation) {
  var type = (situation && situation.type) || '';
  var stopReason = (investigation && investigation.stopReason) || '';
  var desc = (situation && situation.description) || '';
  var pctMatch = desc.match(/[-+]?\d+(?:\.\d+)?\s*%/);
  var pct = pctMatch ? pctMatch[0] : '';
  var down = /(下降|下滑|降低|回落|减少)/.test(desc);
  var hasPrior = !!(investigation && (investigation.judgment || investigation.currentUnderstanding));
  var dirSuffix = pct ? '（' + pct + '）' : '';
  // (type, stopReason) -> 业务话术。
  // 没有 stopReason 意味着 Agent 还没给出结论：告诉运营"待整理"。
  if (type === 'ranking_attention' && stopReason === 'observe') {
    return '这个商品近期表现值得关注。系统发现其近期经营表现相对突出，因此进入 Agent 持续观察' + (pct ? '（' + pct + '）' : '') + '。';
  }
  if (type === 'ranking_attention' && stopReason === 'judgment') {
    return 'Agent 已对此商品形成判断，详见下方。';
  }
  if (type === 'meaningful_change' && stopReason === 'observe') {
    return 'Agent 关注到近期经营波动' + dirSuffix + '，结合历史数据判断属于正常范围，建议持续观察。';
  }
  if (type === 'meaningful_change' && stopReason === 'judgment') {
    return (down ? 'Agent 判定此次下降需要重点关注' : 'Agent 判定此次变化需要重点关注') + (pct ? '（' + pct + '）' : '') + '。';
  }
  if (type === 'anomaly_investigation' && stopReason === 'observe') {
    return 'Agent 持续观察中，暂未发现经营异常' + (pct ? '（' + pct + '）' : '') + '。';
  }
  if (type === 'anomaly_investigation' && stopReason === 'judgment') {
    return 'Agent 已形成判断' + (pct ? '（波动 ' + pct + '）' : '') + '，详见下方。';
  }
  if (!stopReason) {
    return '（待整理）' + desc;
  }
  return desc || '（暂无描述）';
}

/**
 * Card-level one-liner for the Situation feed (≤ 30 chars).
 * Pure: same input contract as businessDescribeSituation.
 */
export function businessDescribeSituationShort(situation, investigation) {
  var type = (situation && situation.type) || '';
  var stopReason = (investigation && investigation.stopReason) || '';
  if (type === 'ranking_attention' && stopReason === 'observe') return '持续观察中';
  if (type === 'ranking_attention' && stopReason === 'judgment') return '已形成判断';
  if (type === 'meaningful_change' && stopReason === 'observe') return '波动观察中';
  if (type === 'meaningful_change' && stopReason === 'judgment') return '波动需关注';
  if (type === 'anomaly_investigation' && stopReason === 'observe') return '持续观察中';
  if (type === 'anomaly_investigation' && stopReason === 'judgment') return '异常需关注';
  return '待整理';
}

/**
 * baseline §11: Source tag — citation chain label.
 * Returns a SHORT Chinese label like "[证据]" / "[H1]" / "[规则]" / "[记忆]".
 * Returns "" for unknown kinds so the caller can skip rendering entirely
 * (we do NOT fabricate attribution).
 */
export function sourceTagLabel(kind, refId) {
  if (kind === 'evidence') return '[证据]';
  if (kind === 'knowledge') return '[规则]';
  if (kind === 'human') return '[H' + (refId || '?') + ']';
  if (kind === 'memory') return '[记忆]';
  return '';
}

/**
 * Source tag tooltip — what the operator sees on hover.
 * Always returns a Chinese sentence that admits the schema blocker honestly.
 */
export function sourceTagTooltip(kind) {
  if (kind === 'evidence') return 'Evidence 当前为运行时生成，无跨会话稳定引用。开发模式可看 content_hash。';
  if (kind === 'knowledge') return 'Knowledge 当前无 first-class 记录；引用以 knowledge/INDEX.md 路径为锚。';
  if (kind === 'human') return '本 Situation 人工干预记录。开发模式可看 intervention_id。';
  if (kind === 'memory') return 'Memory 当前为 Runtime 拥有，Fabric 不持久化其稳定 id。';
  return '';
}

/**
 * baseline §4: humanize a raw error string from a failed investigation.
 * Pure table lookup; NO LLM call. Business mode returns the Chinese
 * description only; developer mode includes the original error in parens.
 *
 * panelMode is injected by the caller (app.js reads state.panelMode; tests
 * pass the literal string 'business' or 'developer').
 */
export const ERROR_HUMANIZE = [
  { match: 'turn timed out', text: '调查超时（已超过 10 分钟）' },
  { match: 'timeout', text: '调查超时' },
  { match: 'invalid investigation contract', text: '调查结果未能形成有效判断' },
  { match: 'parse failure', text: '调查结果未能形成有效判断' },
  { match: 'invalid recommendation json', text: '建议生成未形成有效输出' },
  { match: 'no completed investigation', text: '建议生成前需要先完成调查' },
  { match: 'situation not found', text: 'Situation 不存在' },
];

export function humanizeError(raw, panelMode) {
  if (!raw) return '调查未完成（系统已记录原因，会在下一次启动时自动恢复调查）';
  var lower = String(raw).toLowerCase();
  for (var i = 0; i < ERROR_HUMANIZE.length; i++) {
    if (lower.indexOf(ERROR_HUMANIZE[i].match) >= 0) return ERROR_HUMANIZE[i].text;
  }
  if (panelMode === 'developer') return '调查未完成（开发模式可见：' + raw + '）';
  return '调查未完成（系统已记录原因，会在下一次启动时自动恢复调查）';
}

/**
 * baseline §5: descClean — strip system terms from a free-form description
 * so that the persisted `description` field does not leak into the
 * business-language layer. We DO NOT use this on the persisted field — we
 * use it as a safety net on the rendered Layer 1 text in case the seed /
 * producer emits internal terms.
 */
const SYSTEM_TERMS = [
  '综合得分', 'overall_score', '右侧 Track', 'Evidence Viewer', '右侧追踪',
  '已记录', '已捕获', '信号触发', 'signal', '已形成 ranking engine 事件',
];
export function descClean(text) {
  if (!text) return '';
  var out = String(text);
  for (var i = 0; i < SYSTEM_TERMS.length; i++) {
    if (out.indexOf(SYSTEM_TERMS[i]) >= 0) {
      out = out.split(SYSTEM_TERMS[i]).join('近期表现');
    }
  }
  return out;
}

/**
 * baseline §11: has prior valid cognition — used to decide whether the
 * failed banner should show. Mirrors the REPAIR invariant in
 * markInvestigation: status='failed' alone is NOT enough; the prior
 * completed investigation must have written judgment / currentUnderstanding.
 */
export function hasPriorValidCognition(investigation) {
  if (!investigation) return false;
  return !!(investigation.judgment || investigation.currentUnderstanding);
}

// Interaction Grammar — browser-loadable definition of the P0007.2 Human
// Intervention grammar. Moved out of situation-viewmodel.ts (a .ts file the
// vanilla-JS workspace cannot load) so it is the single source of truth for the
// interaction surface. Loaded as a plain script (globals), before app.js.
//
// app.js renders the buttons from INTERACTION_OPTIONS and builds the type-specific
// structured `content` via buildInterventionContent — no divergent hardcoded copy.

var INTERACTION_OPTIONS = [
  // Agent 判断
  { label: '认同', grammarType: 'response', section: 'judgment', requiresInput: false, decision: null },
  { label: '这里判断错了', grammarType: 'correction', section: 'judgment', requiresInput: true, inputPlaceholder: '正确的判断是什么？', decision: null },
  { label: '还有一个你不知道的情况', grammarType: 'context_supplement', section: 'judgment', requiresInput: true, inputPlaceholder: '什么情况？', decision: null },
  // Agent 建议
  { label: '采用建议', grammarType: 'decision', section: 'suggestion', requiresInput: false, decision: 'accept' },
  { label: '不采用', grammarType: 'decision', section: 'suggestion', requiresInput: true, inputPlaceholder: '为什么不采用？', decision: 'reject' },
  { label: '稍后处理', grammarType: 'decision', section: 'suggestion', requiresInput: false, decision: 'defer' },
  // 你准备怎么处理
  { label: '我准备这样处理…', grammarType: 'action_intent', section: 'action', requiresInput: true, inputPlaceholder: '描述你准备做什么…', decision: null },
  { label: '暂不处理', grammarType: 'decision', section: 'action', requiresInput: false, decision: 'no_action' },
];

/** Build the type-specific structured content per InterventionContentSchema. */
function buildInterventionContent(option, text) {
  var content = { type: option.grammarType };
  switch (option.grammarType) {
    case 'response':
      content.respondsTo = { agentActivityIds: [], signalIds: [], observationIds: [] };
      content.evaluation = 'agree';
      break;
    case 'correction':
      content.corrects = {};
      content.correction = text || '';
      break;
    case 'context_supplement':
      content.supplements = {};
      content.information = text || '';
      break;
    case 'decision':
      content.decision = option.decision || 'accept';
      content.appliesTo = {};
      if (text) content.rationale = text;
      break;
    case 'action_intent':
      content.description = text || '';
      content._hypothesis = true;
      break;
  }
  return content;
}

/** Human-readable summary for the intervention record. */
function buildInterventionSummary(option, text) {
  if (text) return option.label + ': ' + text;
  return option.label;
}

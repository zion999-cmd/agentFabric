// P0007.3 — Situation ViewModel.
// Presentation adapter between raw APIs and Workspace rendering.
//
// Transforms:
//   GET /api/situations response → SituationCard[]
//   GET /api/situations/:id response → SituationDetail
//
// Design rules:
//   1. UI never directly assembles LearningContext + Situation + Intervention raw structures
//   2. Grammar types are translated to business-language labels here
//   3. Timestamps become human-readable dates
//   4. Metric snapshots become formatted display values

// ---- Types ----

export interface SituationCardVM {
  situationId: string;
  title: string;              // derived from description + entity
  domain: string;
  type: string;
  lifecycle: 'open' | 'partial' | 'mature';
  lifecycleLabel: string;     // "待处理" | "已处理" | "待观察"
  entity: { name: string; platform: string };
  summary: string;            // 1-line: "搜索曝光 ↑23% · CTR ↓17%"
  agentSuggestion: string;    // Agent's top recommendation, if any
  signalCount: number;
  interventionCount: number;
  observedAt: string;         // human-readable: "12 Aug 02:38"
  createdAt: string;
}

export interface SituationDetailVM {
  situationId: string;
  title: string;
  domain: string;
  lifecycle: 'open' | 'partial' | 'mature';
  lifecycleLabel: string;

  // Layer 1: What happened
  observations: ObservationVM[];
  metrics: MetricVM[];

  // Layer 2: Agent interpretation
  agentInterpretation: AgentActivityVM | null;

  // Layer 3: Agent proposal
  agentRecommendation: AgentActivityVM | null;

  // Layer 4: Human interventions
  interventions: InterventionVM[];

  // Meta
  entity: { id: string; type: string; name: string; platform: string };
  temporal: { observedAt: string; windowStart?: string; windowEnd?: string };
  tags: string[];
}

export interface ObservationVM {
  capability: string;
  provider: string;           // "JD 商智 · CDP"
  summary: string;
  metrics: Record<string, number>;
}

export interface MetricVM {
  label: string;              // "搜索曝光"
  canonical: string;          // "search_exposure"
  value: string;              // formatted: "12,340"
  change?: { direction: 'up' | 'down' | 'flat'; pct: number; label: string };
}

export interface AgentActivityVM {
  activityId: string;
  type: string;
  summary: string;
  timestamp: string;
}

export interface InterventionVM {
  interventionId: string;
  type: 'response' | 'correction' | 'context_supplement' | 'decision' | 'action_intent';
  typeLabel: string;          // business language
  summary: string;
  actor: string;              // "运营人员"
  timestamp: string;
}

// ---- Interaction Definition ----

/** Defines what interaction buttons to show and what Grammar type they map to. */
export interface InteractionOption {
  /** Button label in business language */
  label: string;
  /** Grammar type this maps to */
  grammarType: 'response' | 'correction' | 'context_supplement' | 'decision' | 'action_intent';
  /** Which section this belongs to */
  section: 'judgment' | 'suggestion' | 'action';
  /** If this option requires additional input */
  requiresInput: boolean;
  /** Placeholder for input if required */
  inputPlaceholder?: string;
}

/** The full set of interaction options for a Situation. */
export const INTERACTION_OPTIONS: InteractionOption[] = [
  // Agent 判断
  { label: '认同', grammarType: 'response', section: 'judgment', requiresInput: false },
  { label: '这里判断错了', grammarType: 'correction', section: 'judgment', requiresInput: true, inputPlaceholder: '正确的判断是什么？' },
  { label: '还有一个你不知道的情况', grammarType: 'context_supplement', section: 'judgment', requiresInput: true, inputPlaceholder: '什么情况？' },
  // Agent 建议
  { label: '采用建议', grammarType: 'decision', section: 'suggestion', requiresInput: false },
  { label: '不采用', grammarType: 'decision', section: 'suggestion', requiresInput: true, inputPlaceholder: '为什么不采用？' },
  { label: '稍后处理', grammarType: 'decision', section: 'suggestion', requiresInput: false },
  // 你准备怎么处理
  { label: '我准备这样处理…', grammarType: 'action_intent', section: 'action', requiresInput: true, inputPlaceholder: '描述你准备做什么…' },
  { label: '暂不处理', grammarType: 'decision', section: 'action', requiresInput: false },
];

// ---- Transformers ----

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const lifecycleLabel = (lc: string): string => {
  switch (lc) {
    case 'open': return '待处理';
    case 'partial': return '已处理';
    case 'mature': return '待观察';
    default: return lc;
  }
};

const interventionTypeLabel = (type: string): string => {
  switch (type) {
    case 'response': return '认同判断';
    case 'correction': return '判断有误';
    case 'context_supplement': return '补充情况';
    case 'decision': return '决策';
    case 'action_intent': return '准备处理';
    default: return type;
  }
};

/** Transform a raw situation list item to a card ViewModel. */
export const toSituationCard = (raw: Record<string, unknown>): SituationCardVM => {
  const entity = (raw.entity as Record<string, unknown>) ?? {};
  const temporal = (raw.temporal as Record<string, unknown>) ?? {};
  const life = lifecycleLabel(String(raw.lifecycle ?? 'open'));

  // Build summary from if available; otherwise use description
  const desc = String(raw.description ?? '');
  const summary = desc.length > 50 ? desc.slice(0, 50) + '…' : desc;

  return {
    situationId: String(raw.situationId ?? ''),
    title: `${entity.name ?? 'Unknown'} · ${desc.slice(0, 30)}`,
    domain: String(raw.domain ?? ''),
    type: String(raw.type ?? ''),
    lifecycle: (raw.lifecycle as 'open' | 'partial' | 'mature') ?? 'open',
    lifecycleLabel: life,
    entity: { name: String(entity.name ?? ''), platform: String(entity.platform ?? '') },
    summary,
    agentSuggestion: '', // populated from detail
    signalCount: 0,
    interventionCount: Number(raw.interventionCount ?? 0),
    observedAt: formatDate(String(temporal.observedAt ?? raw.createdAt ?? '')),
    createdAt: String(raw.createdAt ?? ''),
  };
};

/** Transform a full situation detail to the Detail ViewModel. */
export const toSituationDetail = (raw: Record<string, unknown>): SituationDetailVM => {
  const entity = (raw.entity as Record<string, unknown>) ?? {};
  const temporal = (raw.temporal as Record<string, unknown>) ?? {};
  const interventions = (raw.interventions as Record<string, unknown>[]) ?? [];
  const desc = String(raw.description ?? '');

  // Build observations from description + tags
  const tags = (raw.tags as string[]) ?? [];
  const observations: ObservationVM[] = [];
  if (tags.length > 0 || desc) {
    observations.push({
      capability: 'trade.overview',
      provider: 'JD 商智 · CDP',
      summary: desc,
      metrics: {},
    });
  }

  // Interventions
  const interventionVMs: InterventionVM[] = interventions.map((i: Record<string, unknown>) => ({
    interventionId: String(i.interventionId ?? ''),
    type: (i.type as InterventionVM['type']) ?? 'decision',
    typeLabel: interventionTypeLabel(String(i.type ?? '')),
    summary: String(i.summary ?? ''),
    actor: '运营人员',
    timestamp: formatDate(String(i.timestamp ?? i.createdAt ?? '')),
  }));

  // Agent activities — placeholder for now (populated when HermesAgent is connected)
  const agentInterpretation: AgentActivityVM | null = desc
    ? { activityId: '', type: 'analysis', summary: `Agent 分析: ${desc}`, timestamp: String(temporal.observedAt ?? '') }
    : null;

  const agentRecommendation: AgentActivityVM | null = desc
    ? { activityId: '', type: 'recommendation', summary: 'Agent 建议: 查看详细数据判断原因', timestamp: String(temporal.observedAt ?? '') }
    : null;

  return {
    situationId: String(raw.situationId ?? ''),
    title: `${entity.name ?? 'Unknown'} · ${desc.slice(0, 30)}`,
    domain: String(raw.domain ?? ''),
    lifecycle: (raw.lifecycle as 'open' | 'partial' | 'mature') ?? 'open',
    lifecycleLabel: lifecycleLabel(String(raw.lifecycle ?? 'open')),
    observations,
    metrics: [],
    agentInterpretation,
    agentRecommendation,
    interventions: interventionVMs,
    entity: {
      id: String(entity.id ?? ''),
      type: String(entity.type ?? ''),
      name: String(entity.name ?? ''),
      platform: String(entity.platform ?? ''),
    },
    temporal: {
      observedAt: String(temporal.observedAt ?? ''),
      ...(temporal.windowStart ? { windowStart: temporal.windowStart as string } : {}),
      ...(temporal.windowEnd ? { windowEnd: temporal.windowEnd as string } : {}),
    },
    tags,
  };
};

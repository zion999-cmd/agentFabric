// Business Skill Definitions — structured data, not executable code.
// P0006: Skills describe what the system can do. The ChatRouter reads these
// definitions to match user intents → handler dispatch.
//
// Each skill maps to an existing Runtime Kernel or Orchestrator operation.
// Skills do NOT implement business logic — they point to it.

// ---- Skill Handler Types ----

/**
 * Identifies which subsystem handles a skill invocation.
 * - 'kernel': RuntimeKernel methods (data acquisition, import)
 * - 'orchestrator': Composition layer (ranking, analysis)
 * - 'facade': Read-only data queries (signals, evidence, memory)
 */
export type SkillHandlerType = 'kernel' | 'orchestrator' | 'facade';

/**
 * Concrete handler name — each maps to a specific function in the system.
 */
export type SkillHandler =
  | 'kernel.execute'          // RuntimeKernel.execute() — single-day pipeline
  | 'kernel.executeLiveCDP'   // RuntimeKernel.executeLiveCDP() — multi-day CDP
  | 'kernel.executeImport'    // RuntimeKernel.executeImport() — historical import
  | 'orchestrator.rank'       // rankProductsComposition() — full ranking vertical
  | 'facade.signals'          // SignalFacade.list/listAll() — read signals
  | 'facade.evidence'         // Evidence store — read evidence records
  | 'facade.memory'           // MemoryFacade.queryActive() — read memories
  | 'facade.products'          // ProductRepository — list products
  | 'bridge.discover';           // CapabilityBridge — discover capabilities

// ---- Skill Definition ----

export interface SkillDefinition {
  /** Machine-readable skill name (e.g. "collect_data") */
  readonly name: string;
  /** Human-readable display name (e.g. "数据采集") */
  readonly displayName: string;
  /** What this skill does — used in intent classification prompts */
  readonly description: string;
  /**
   * Natural language patterns that trigger this skill.
   * Used for fast pattern matching before falling back to HermesAgent classification.
   */
  readonly intentPatterns: readonly string[];
  /** Which subsystem + function handles this skill */
  readonly handlerType: SkillHandlerType;
  /** The specific handler function to call */
  readonly handler: SkillHandler;
  /**
   * Parameters required by this skill's handler.
   * The ChatRouter validates that required params are present or prompt the user.
   */
  readonly requiredParams: readonly string[];
  /**
   * Prompt template for HermesAgent response generation.
   * Use {{key}} placeholders that get bound to execution result values.
   */
  readonly responseTemplate: string;
}

// ---- Skill Catalog ----

/**
 * All registered business skills.
 *
 * Each skill points to an EXISTING subsystem — no new business logic here.
 * Adding a skill means wiring a user intent to an already-existing capability.
 */
export const SKILL_CATALOG: readonly SkillDefinition[] = [
  {
    name: 'collect_data',
    displayName: '数据采集',
    description: '从电商平台采集店铺数据，包括销售概况、流量趋势、商品排行。执行完整的采集→解析→信号→证据流程。',
    intentPatterns: [
      '采集数据', '拉取数据', '更新数据', '同步数据',
      'collect', 'fetch', 'sync',
      '帮我采集', '帮我拉取', '帮我更新店铺数据',
      '今天的销售数据', '今天的数据', '拉一下数据',
      '获取京东数据', '京东店铺数据',
    ],
    handlerType: 'kernel',
    handler: 'kernel.execute',
    requiredParams: ['platform', 'shopId'],
    responseTemplate: [
      '你是电商运营助手。用户刚刚执行了一次数据采集。基于以下采集结果，用自然语言告知用户采集情况。',
      '',
      '采集平台: {{platform}}',
      '店铺: {{shopId}}',
      '日期: {{date}}',
      '采集状态: {{success}}',
      '生成信号数: {{signalCount}}',
      '捕获证据数: {{evidenceCount}}',
      '信号类型: {{signalTypes}}',
      ...(process.env.NODE_ENV === 'test' ? [] : ['若有错误: {{errors}}']),
      '',
      '请用2-3句话总结采集结果，语气专业简洁。',
    ].join('\n'),
  },

  {
    name: 'analyze_ranking',
    displayName: '排名分析',
    description: '对所有商品进行加权排名分析，综合增长、竞争、供应稳定性、质量四个维度，输出排名榜单和AI分析。',
    intentPatterns: [
      '排名', '排行', '榜单', '排名分析',
      'ranking', 'rank', 'leaderboard',
      '哪些商品表现好', '哪个商品排第一', '商品排名',
      '帮我分析排名', '看看排名情况', '生成榜单',
      '销售排行', '增长排行', '运营推荐',
    ],
    handlerType: 'orchestrator',
    handler: 'orchestrator.rank',
    requiredParams: ['profile'],
    responseTemplate: [
      '你是电商运营助手。基于以下排名分析结果，用一段话向运营人员解释排名情况。',
      '',
      '榜单类型: {{profile}}',
      '排名商品数: {{rankedCount}}',
      'Top 1 商品: {{topProduct}}',
      'Top 1 得分: {{topScore}}',
      'Top 1 总结: {{topSummary}}',
      '平均置信度: {{avgConfidence}}',
      '',
      '请用2-3句话总结排名结果，重点突出Top 1商品，并给出一条可执行建议。',
    ].join('\n'),
  },

  {
    name: 'query_signals',
    displayName: '信号查询',
    description: '查询已存储的业务信号数据，包括GMV、订单量、访客数、转化率等指标。可按商品或时间筛选。',
    intentPatterns: [
      '信号', '指标', '数据', '查询',
      'signals', 'metrics', 'query',
      'GMV', '销量', '订单', '流量', '转化率',
      '查看信号', '查询信号', '帮我看看数据',
      '销售数据', '店铺数据', '商品数据',
      '最近的数据', '最近7天', '今天的数据',
    ],
    handlerType: 'facade',
    handler: 'facade.signals',
    requiredParams: [],
    responseTemplate: [
      '你是电商运营助手。基于以下信号数据，回答用户的问题。',
      '',
      '可用信号: {{signalSummary}}',
      '用户原始问题: {{userMessage}}',
      '',
      '请用简洁的语言回答用户，引用具体数据。如果数据不足以回答问题，请如实告知。',
    ].join('\n'),
  },

  {
    name: 'query_evidence',
    displayName: '证据查询',
    description: '查询原始采集证据（API响应数据），查看数据采集的原始记录和来源。',
    intentPatterns: [
      '证据', '原始数据', '采集记录', 'API数据',
      'evidence', 'raw data', 'source',
      '查看证据', '原始响应', '数据来源',
    ],
    handlerType: 'facade',
    handler: 'facade.evidence',
    requiredParams: [],
    responseTemplate: [
      '你是电商运营助手。基于以下证据查询结果，回答用户的问题。',
      '',
      '证据记录: {{evidenceSummary}}',
      '用户原始问题: {{userMessage}}',
      '',
      '请用简洁的语言告知用户数据采集情况和证据状态。',
    ].join('\n'),
  },

  {
    name: 'general_question',
    displayName: '通用问答',
    description: '回答关于店铺运营、数据分析、系统功能的一般性问题。当用户意图不明确时使用此技能。',
    intentPatterns: [
      '帮助', '能做什么', '功能', '怎么用',
      'help', 'what can you do', 'how to',
      '介绍', '说明', '有哪些能力',
    ],
    handlerType: 'facade',
    handler: 'facade.memory',
    requiredParams: [],
    responseTemplate: [
      '你是电商运营助手 agentFabric。你可以帮助运营人员完成以下工作：',
      '',
      '1. **数据采集** — 从京东商智等平台自动采集店铺数据（销售概况、流量趋势、商品排行）',
      '2. **排名分析** — 基于多维指标对商品进行加权排名，识别增长机会和风险',
      '3. **信号查询** — 查询已存储的GMV、订单量、访客数、转化率等业务信号',
      '4. **证据查询** — 查看原始数据采集记录和API响应',
      '',
      '用户问题: {{userMessage}}',
      '',
      '请根据用户的具体问题，用友好的语气回答，并引导用户使用合适的命令。如果需要执行数据采集或排名分析，请告知用户。',
    ].join('\n'),
  },
  {
    name: 'discover_capability',
    displayName: '能力发现',
    description: '查询 agentFabric 已具备的数据获取能力。根据用户意图，返回可用的 Capability（如交易概览、流量分析、商品排行等）及其可提供的指标。',
    intentPatterns: [
      '能获取什么数据', '有什么数据', '数据能力', '能查什么',
      '能拿到哪些指标', '平台有什么', '可以获取什么',
      '能分析流量吗', '能看交易数据吗', '能查商品吗',
      'what data', 'what capabilities', 'available data',
      'capability', '能力', '数据来源',
    ],
    handlerType: 'facade',
    handler: 'bridge.discover',
    requiredParams: [],
    responseTemplate: [
      '你是 agentFabric 的能力发现助手。以下是当前可用的数据获取能力：',
      '',
      '{{capabilitySummary}}',
      '',
      '用户想要: {{userMessage}}',
      '',
      '请根据用户的意图，推荐最匹配的能力，并说明该能力可以提供哪些指标。如果用户的问题暂时没有匹配的能力，请如实告知。',
    ].join('\n'),
  },
];

// ---- Helpers ----

/** Lookup a skill by its machine name. */
export const getSkillByName = (name: string): SkillDefinition | undefined =>
  SKILL_CATALOG.find((s) => s.name === name);

/** List all skill names for the intent classification prompt. */
export const skillListForPrompt = (): string =>
  SKILL_CATALOG.map(
    (s) => `- ${s.name}: ${s.description}`,
  ).join('\n');

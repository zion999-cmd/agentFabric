# 技术决策记录 (ADR)

## ADR-027: P0006.2 Real Data Runtime Replay — Evidence Store Parsing Fix

- **日期**: 2026-08-09
- **状态**: Accepted
- **决策**: `parseAcquiredData()` 在映射 endpoint→data type keys 时，将单对象包裹为数组 `[data]`，确保 evidence store 中 JD API envelope 格式的数据能被 parser 正确识别。

### 问题

Full 180-day replay (2026-01-01 ~ 2026-07-09) 执行成功 (190/190 days)，但 `parseAcquiredData()` 将 evidence store 的单对象数据传给 parser 时，`asArray()` 对非数组返回 `[]`，导致 parser 永远返回 `emptySummary()`。

Evidence store 中每条数据都是单个 `{ header: { code:0 }, body: { data: [...] } }` 对象。`historical-acquire.ts` 将其返回为 `data[endpoint] = loaded.data`。`parseAcquiredData()` 将其映射到 `raw['summary'] = data`，但 parser 期望 `raw['summary']` 是数组。

### 修复

`runtime-executor.ts:parseAcquiredData()` — 在 endpoint→base key 映射时包裹非数组值: `const wrapped = Array.isArray(data) ? data : [data]`。

### 验证

- 修复前: 3 天 replay → 3 signals, 全部 `signal_value=0, metrics={}`
- 修复后: 3 天 replay → 64 signals, `signal_value=¥12,351~¥14,229` (真实 CDP 采集数据)
- Full replay: 190 天 → 3,489 signals, 570 evidence, 0 errors. `signal_value` 均为真实值

### 已知限制

`metrics` 字段（EnterpriseSignalPayload: gmv, orders, uv, cvr 等）未被 repository.toRow 持久化到 SQLite。Workspace 使用 `signal_value` 展示 GMV，功能正常。完整 metrics 持久化留待后续补齐。

---

## ADR-026: JD Persistence Layer — platform/storage/

- **日期**: 2026-07-12
- **状态**: Accepted
- **决策**: JD 数据持久化层（jd-schema.ts + jd-persistence.ts）属于 platform/storage（基础设施层），不属于 connectors（业务执行层）。

---

## ADR-025: Signal Observation Model — Three-Timeline Architecture (P0006.1.1)

- **日期**: 2026-07-09
- **状态**: Accepted
- **决策**: 建立三层时间轴模型，Signal Schema 新增 `observed_at` 列，UNIQUE 约束从 `(entity_type, entity_id, signal_name, window)` 升级为 `(entity_type, entity_id, signal_name, window, observed_at)`。

### 三层时间轴（不可再混）

| 时间轴 | 字段 | 含义 | 来源 |
|--------|------|------|------|
| **Business Timeline** | `observed_at` | 业务观测时间 — 这条数据"测量的事发生在什么时候" | `SignalCollectorInput.timestamp` |
| **System Timeline** | `ingested_at` | 系统采集时间 — 这条数据"什么时候被存进来的" | `nowIso()` at pipeline start |
| **Execution Timeline** | `execution_id` / `pipeline_run_id` | 执行时间 — "哪次 Run 产生的这条数据" | `trace.pipeline_run_id` |

### Signal 两层模型

```
Layer 1: Signal Type (Definition) — 固定
  daily_summary, hourly_sales, hourly_traffic
  来自 blueprint.manifest.signal_types

Layer 2: Observation (Instance) — 每次采集产生
  daily_summary on 2026-07-09 for jd_shop_001
  来自 SignalCollectorInput.timestamp → observed_at
```

### 回退的补丁

- `hourly_traffic_14` → `hourly_traffic`（signal_name 恢复纯净类型名）
- 删除 `extractHour()` helper
- 删除 signal-engine 中的 signal_name mutation 逻辑

### 受影响模块

- `shared/schemas/signal.ts` — SignalSchema +observed_at
- `platform/storage/schema.ts` — v3 migration, 新 UNIQUE 约束
- `apps/ecommerce/connectors/normalizer.ts` — 传递 timestamp→observed_at
- `apps/ecommerce/analysis/metrics/repository.ts` — toRow/fromRow/storeSignals/listAllSignals
- `apps/ecommerce/analysis/metrics/pipeline.ts` — 计算信号使用 pipeline 时间作为 observed_at
- `apps/ecommerce/runtime/kernel/runtime-signal-engine.ts` — 删除小时后缀逻辑
- `platform/server/routes/runtime.ts` — 使用 observed_at 分组执行历史
- `platform/server/routes/chat.ts` — 使用 observed_at 分组日期

- **原因**: P0006.1 C1 暴露了 Signal 数据模型缺陷——`signal_name` 被同时用作类型标识和观测标识（`hourly_traffic_14`），导致 UNIQUE 约束 `(entity_type, entity_id, signal_name, window)` 无法区分不同日期的观测。这不是字符串拼接问题，而是数据模型从两层被压扁为一层的问题。P0006.1.1 将其恢复为正确的两层模型 + 三层时间轴。

## ADR-024: Agent Loop — agentFabric-Owned, Not HermesAgent-Owned (P0006)

- **日期**: 2026-07-09
- **状态**: Accepted
- **决策**: Agent Loop 由 agentFabric 拥有，不由 HermesAgent 拥有。当前 HermesClient 是 one-shot 文本接口（prompt → stdout），不支持 tool calling。不改动 Hermes（保持可替换性），agentFabric 用两次 one-shot 调用实现 agent loop：
  - **Intent Classification** — HermesAgent one-shot: "这个用户想问什么？" → 从 Skill Catalog 中选择最匹配的技能
  - **Response Generation** — HermesAgent one-shot: "基于这些执行结果，回答用户问题"
  - **Dispatch Logic** — agentFabric 负责: 技能匹配（pattern + HermesAgent fallback）→ handler 分发 → Kernel/Orchestrator 调用 → 结果组装
- **Skills as Data**: Skills 是结构化定义（name, intentPatterns, handler, responseTemplate），不是可执行代码。ChatRouter 读取 skill definitions 进行 intent → handler 分发。Handlers 是 thin wrappers 调用现有 Kernel/Orchestrator 操作。
- **Runtime via HTTP**: Kernel 新增 HTTP 路由（/api/runtime/collect, /api/runtime/executions），Workspace 和 Chat 可触发执行。CLI 继续可用。HTTP 是额外入口，不是替代。
- **原因**: P0005 完成后系统 "Runtime Ready, Product Not Ready" — Kernel CLI-only, Hermes 只生成文本摘要, Workspace 面板硬编码。P0006 不新增业务能力，只把已有能力接起来：HermesAgent → Runtime Kernel → Workspace。

## ADR-023: CLI Final Patch — Pure Shell, Zero Business Logic (P0005.6.1)
- **日期**: 2026-07-04
- **状态**: Accepted
- **决策**: CLI 彻底变为纯入口壳层。所有业务逻辑（acquire、saveEvidence、normalizeSignal、SignalFacade.store、parse、evidence wrapping）移入 Kernel。CLI 只调用三个方法：`kernel.execute()`（单日 mock/live）、`kernel.executeLiveCDP()`（多日 CDP）、`kernel.executeImport()`（历史导入）。
  - `executeLiveCDPPipeline` — 多日 CDP 采集 + 逐日 signal/evidence 处理，全部在 kernel 内完成
  - `executeImportPipeline` — 读取历史 JSON → 保存 evidence → 生成 signal（blueprint 或 legacy fallback），全部在 kernel 内完成
  - `createEmptyBlueprint` — 无 Discovery 数据时的合法"空状态"，让 import pipeline 走 legacy fallback
  - CLI imports 从 20 个缩减到 6 个：移除 `acquireJdData`, `saveEvidence`, `normalizeSignal`, `generateSignals`, `captureEvidence`, `buildSpecFromBlueprint`, `INDICATOR_OVERRIDES`
- **原则**: CLI 不允许知道任何业务逻辑。Kernel is the ONLY execution boundary. `saveEvidence()` 和 `SignalFacade.store()` 绝不在 CLI 中出现。
- **原因**: P0005.6 消除了 `processDay()` 但 Live CDP 和 import-jd 路径仍有 bypass。P0005.6.1 补上最后两个缺口，实现真正的 100% Kernel 收敛。

## ADR-022: Execution Convergence — Zero Legacy Paths (P0005.6)
- **日期**: 2026-07-04
- **状态**: Accepted
- **决策**: 彻底消除所有非 Kernel 执行路径。`processDay()` 函数完全删除。Live CDP 路径改用 `generateSignals()` + `captureEvidence()`。`cmdImportJd` 信号生成改用 signal-engine (blueprint 可用时), 保留 evidence save 作为历史数据迁移特例。
- **原则**: Kernel is the ONLY runtime entry point. CLI must never execute business logic directly. CDP/Acquisition must only be invoked via Kernel injection.
- **原因**: P0005.5 创建了 Kernel 但留下了 3 条 legacy path (processDay, live CDP direct, import-jd direct)。P0005.6 砍掉所有绕过 Kernel 的路径, 只保留一条执行河流: CLI → Kernel → Binding → Connector → Evidence/Signal。

## ADR-021: Runtime Convergence Layer — Single Kernel Entry Point (P0005.5)
- **日期**: 2026-07-04
- **状态**: Accepted
- **决策**: 建立 `apps/ecommerce/runtime/kernel/` — 统一运行时收敛层, 收敛 3 套并行运行体系为 1 个 Runtime Kernel。
  - `runtime-kernel.ts` — CLI 的唯一入口, createRuntimeKernel + execute
  - `runtime-normalizer-resolver.ts` — 3 层 resolution: INDICATOR_OVERRIDES → generated normalizer-plan (887 rules) → JD_SPEC fallback (16 keys)。输出 895 canonical metrics (vs 旧 16)
  - `runtime-signal-engine.ts` — blueprint-driven signal 生成, 替代 processDay 的 hardcoded signal types/mapping
  - `runtime-evidence-orchestrator.ts` — blueprint-driven evidence capture, 用 evidence_strategy.capture_rules 替代 hardcoded summary/trend/productTop
  - `runtime-executor.ts` — unified pipeline: Plan → Acquire → Parse → Normalize → Signal → Evidence
  - CLI `collect` 命令走 Kernel (blueprint-driven), `processDay` 标记 @deprecated
- **原因**: 深度审计发现 CLI 未经过 binding layer (executor/planner), processDay 全部 hardcoded, normalizer-plan.json 从未被加载。P0005.5 让 Blueprint 成为唯一 runtime truth。

## ADR-020: Connector Binding Layer — Capability is Data, Not Code (P0005.4)
- **日期**: 2026-07-03
- **状态**: Accepted
- **决策**: 建立 `apps/ecommerce/connectors/binding/` 模块, 桥接 generated/ 和 Connector 执行。Connector 不再定义能力 (API列表、Indicator映射、Business Context), 只执行 blueprint。
  - `loader.ts` — 读取 generated/*.json → Zod 验证 → 返回 BoundCapabilityModel
  - `planner.ts` — Blueprint → CapabilityExecutionPlan (挑选 API、解析 Indicator、证据规则)
  - `executor.ts` — 平台无关的通用执行管线: acquire → parse → normalize → evidence
  - `types.ts` — BoundCapabilityModelSchema (复用 ConnectorBlueprintSchema) + CapabilityExecutionPlanSchema
  - Hand-written overrides 保留 (INDICATOR_OVERRIDES) 在 generated dict 之上, 确保业务关键指标语义准确
  - Manifest, indicator-map, acquisition facade 全部从 binding layer 消费 blueprint
- **原因**: Pre-Light Architecture Audit 发现 generated/ 是 orphaned (write-only), Connector 完全手写。Binding Layer 让 "Capability is data, not code" 成为现实 — Connector 变为 pure executor。

## ADR-019: Discovery Capability Generator (P0005.3)
- **日期**: 2026-07-01
- **状态**: Accepted
- **决策**: 建立 Discovery → Capability → Connector 的中间层。P0005.2 负责分析（classify, map, detect），P0005.3 负责生成（blueprint, plan, manifest, coverage）。
  - `apps/ecommerce/connectors/capability/` — 6 模块，5 个 Phase，消费 P0005.2 但不修改它
  - 生成物输出到 `generated/`（5 个 JSON 文件），Connector 可选择消费
  - Coverage Report：Discovery 70 APIs vs Connector 3 APIs → 4% API 覆盖率，诚实暴露差距
  - 关键原则：Generator 不负责发现（discovery 做），不负责采集（connector 做）。只负责把 Discovery Assets 转换成 Connector Blueprint。
- **原因**: 见 [P0005.3](proposals/P0005.3-discovery-capability-generator.md)。hand-written 的 manifest.ts 和 indicator-map.ts 需要被 auto-generated 的 blueprint 替代。新增平台只需 re-run Discovery → Generator → Connector。

## ADR-000: 项目初始化
- **日期**: 2026-06-26
- **状态**: Accepted
- **决策**: monorepo 结构，按 apps/shared/workspace 划分模块

## ADR-001: Reboot 架构 (信号命名 + 权重解析)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: signal_name = `${base}_${windowDays}d`; weights keyed by BASE name; ranking matches by prefix (matchComponent)
- **原因**: 比 agentCMS 的 window=field-but-name-fixed 方式更简洁

## ADR-002: exactOptionalPropertyTypes = ON
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: tsconfig 启用 exactOptionalPropertyTypes；可选属性通过条件展开传递

## ADR-003: ContextMemory 的结构化 adjustment 字段
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: ContextMemory 带有可选 `adjustment: RankingMemoryAdjustment` 字段，在提取时设置；ranking 通过前缀匹配 (base → windowed) 进行匹配
- **原因**: 修复 agentCMS 在注入时重新解析自然语言 statement 的差异

## ADR-004: Hermes 子进程契约 (顶层 -z oneshot)
- **日期**: 2026-06-27
- **状态**: Accepted
- **契约**: `hermes -z "<prompt>" [-m MODEL] [-t TOOLSETS] [--skills SKILLS] [--safe-mode]`

## ADR-005: 删除 src/ — 从技术分层到业务分层
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 完全删除 `src/`；所有业务逻辑位于 `apps/ecommerce/`
- **原因**: agentFabric 不是通用 SDK/框架，而是具体的 Business Workspace。不存在跨 App 的 "domain" — 每个 App 拥有自己的 business capabilities。

## ADR-006: signal → metrics, ranking → decision, trace → explainability, memory → experience
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 四个核心模块的命名从工程语言改为业务语言
- **原因**:
  - signal: 运营说 "指标" 而非 "信号"
  - ranking: AI 给出 Decision (含 priority + recommendation)，而非仅仅是 Ranking
  - trace: trace 是开发视角；运营看到的是 explainability (可解释性)
  - memory: Memory 已被 Hermes Runtime 占据；Business Experience 才是我们的资产

## ADR-007: 每目录对应企业真实角色
- **日期**: 2026-06-27
- **状态**: Accepted
- **原则**: 每个目录/模块必须能回答："在企业里对应哪个真实角色、哪项真实资产、或哪条真实业务流程？"
- **不符合**: 只落到 Runtime、模型能力或工程实现上的 → 属于 Hermes 或其他 Runtime

## ADR-008: 项目记忆系统 (Four-layer Context)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 采用四层 Context 作为 AgentFabric 自身的 Project Memory (Single Source of Truth)
  - Layer 1 (几乎不变): PROJECT.md + philosophy.md
  - Layer 2 (每次 dev 更新): context/current_state.md
  - Layer 3 (重要决策记录): context/decisions.md (本文件)
  - Layer 4 (每次 dev 自动生成): context/handoff.md
  - Machine-readable: context/status.json
  - Architecture view: context/architecture_snapshot.md
- **原因**: 不是为 ChatGPT 写的 context，而是全项目共享的 Single Source of Truth — ChatGPT、Claude Code、Codex、Hermes 都读同一套 Context

## ADR-009: Path aliases (#shared, #platform, #app)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 使用 tsconfig paths + vitest resolve.alias 实现 `#shared/*`、`#platform/*`、`#app/*` 路径别名
- **原因**: 消除深度相对路径 (../../../../shared/...) 带来的脆弱性；所有文件无论深度如何都使用统一的别名路径

## ADR-010: UI 完全复刻 agentCMS V1
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: Workspace UI 完全复刻 agentCMS V1（Agent Workspace 布局），不做任何设计变更。HTML/CSS 逐字节复制，JS 适配 agentFabric API 端点。
- **原因**: 用户要求"先把旧项目 UI 完全复刻，完成后再告诉你怎么改"。V1 UI 经过 agentCMS 两个月迭代验证，是稳定的基线。后续设计变更在此基线上进行。

## ADR-011: 目录重命名（dashboard→workspace, collectors→connectors, composition→orchestrator）
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 三个目录重命名，反映业务语言而非工程语言
- **原因**: 见 [P0002](proposals/P0002-workspace-information-architecture.md)。dashboard 只是 workspace 中的 widget；connectors 不只是 collectors（还有 ERP、Webhook、MCP）；orchestrator 编排整个业务循环而非"组合"几个 domain。

## ADR-012: 项目记忆系统（Four-layer Context）
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 每次开发会话结束后，必须更新 context/{current_state, decisions, handoff, status.json, roadmap}。这些文件是项目的 Single Source of Truth，所有 agent（ChatGPT, Claude Code, Codex, Hermes）共用。
- **原因**: 见 [chat_history3](docs/chat_history3.txt)。不是为 ChatGPT 写的 context，而是项目自己的记忆系统。

## ADR-013: Trust Decision Stack (P0003 UI 升级)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: Workspace 从 V1 (agentCMS 复刻) 升级为 V2 Trust Decision Stack。右侧面板从 Explain/Reason/Trace 升级为 7 层信任决策栈 (Confidence→Evidence→Reasoning→Skills→Execution→Validation)。Inbox Card 增加 Impact Score、Confidence、Approve/Reject/Modify 行动按钮。侧边栏 IA 对齐 P0002 (Inbox/Discover → Reviews → Skills/Experience → Validation/Reports → Settings)。
- **原因**: 见 [P0002](proposals/P0002-workspace-information-architecture.md) + [P0003](proposals/P0003-trust-ui-system.md)。Workspace 不是 Dashboard — 是 Human↔AI Business Decision Operating System。核心原则: Trust is product, not feature。

## ADR-014: UI Fix & Trace Panel (P0003.1)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: (1) 侧边栏恢复至 V1 agentCMS 稳定结构，全 i18n，移除 P0003 实验性分类。(2) 右侧面板从 Trust Decision Stack 重构为 Agent Transparency / Trace Panel——Operator 模式显示 Decision Summary + Data Sources + Execution Status，Builder 模式展开完整 trace（Skills Triggered、MCP/Tool Calls、Memory Influence、Execution Steps、Result Validation），默认折叠。(3) 中间 Workspace 保持不变。
- **原因**: 见 [P0003.1](proposals/P0003.1-ui-fix-right-panel-redesign.md)。三栏职责分离清晰：Sidebar = Navigation, Workspace = Execution, Right Panel = Agent Trace。不允许 Sidebar 承担 AI 逻辑、Right Panel 做统计 Dashboard。

## ADR-017: JD Business Data Connector (P0005.1)
- **日期**: 2026-06-30
- **状态**: Accepted
- **决策**: 实现京东商智数据获取能力，验证 P0005 Business Data Pipeline 完整链路
  - Evidence Store: 文件型不可变存储 (`data/evidence/{platform}/{year}/{month}/`), metadata+hash 防篡改
  - JD Parser: 从 agentCMS 移植 JD indicator key 映射 (8 个主指标 + 3 个 WoW 对比指标)
  - JD Acquisition: 双模式 — Mock (开发/测试/CI) + CDP/Playwright (生产, 复用 Chrome session)
  - CLI: `cli collect jd <shopId> [--mock true|false] [--days N]` 完整可运行
  - 目录结构遵循 P0005: acquisition/ parsers/ evidence/ normalizers/ manifest.ts
- **原因**: 见 [P0005](proposals/P0005-business-data-foundation.md) + [P0005.1](proposals/P0005.1-jd-connector.md)。京东商智是第一个完整验证 P0005 管线的 connector。Mock 模式默认开启，零外部依赖即可开发。

## ADR-016: Runtime Control Plane (P0004)
- **日期**: 2026-06-29
- **状态**: Accepted
- **决策**: 建立 Runtime Control Plane — 4 个新模块 (types, registry, router, hermes/adapter) + 适配器包装模式
  - `RuntimeAdapter` 接口: 所有 Runtime 的通用契约 (execute, isAvailable, capability)
  - `ExecutionPlan`: 结构化可序列化计划 (skill + context + steps + policy_constraints)
  - `ExecutionResult`: Runtime 返回 (step_results + aggregate_confidence + duration_ms)
  - `RuntimeRegistry`: 运行时注册表 (register/unregister/get/list/resolve)
  - `DefaultRouter`: 控制平面入口 (action → runtime → plan → dispatch → result)
  - `HermesRuntimeAdapter`: 包装 HermesClient，实现 RuntimeAdapter (零改动 HermesClient)
- **原因**: 见 [P0004](proposals/P0004-runtime-control-plane.md)。AgentFabric 只依赖 RuntimeAdapter 接口，绝不依赖 Runtime 实现。Router 是唯一与 Runtime 通信的入口。所有 Runtime (Hermes, Claude Code, Codex, OpenHands) 执行同一份 ExecutionPlan。替换 Runtime 不应改变任何业务逻辑。

## ADR-015: 合并 V1 运营/开发模式 + Trace Panel
- **日期**: 2026-06-28
- **状态**: Accepted
- **决策**: 右侧面板最终方案——运营模式 = V1 业务面板（AI Summary + Reasoning Steps + Tool Calls），开发模式 = Trace Panel（Decision Summary → Data Sources → Execution Status，可展开 Skills/MCP/Memory/Steps/Validation）。移除单独 Operator/Builder 子切换（"Operator" 与 "运营" 语义重复）。
- **原因**: 用户反馈。V1 模式和新功能是扩展关系而非替换。运营模式服务于日常操作，开发模式服务于深度调试。两档切换简洁清晰。

## ADR-018: D0002 JD Capability Discovery — 数据驱动能力发现
- **日期**: 2026-06-30
- **状态**: Accepted
- **决策**: 通过 CDP 自动遍历 JD 商智全部页面，从真实 API 响应数据反向生长 Business Context，绝不从页面名称正向推导。
- **方法**:
  - Playwright `page.on('response')` 全量网络捕获
  - 遍历 15 个 JD 商智页面，每个页面等待 12s SPA 轮询周期
  - 提取全部 API 响应体 → 解析字段 Schema → 映射到 Business Context
- **发现**:
  - 70 个 API 端点，分布在 6 个模块（indexSummary, industryMarket, growthSummary, marketing, stock, common）
  - 7 个已验证的业务上下文（Store/Traffic/Product/Customer/Industry/Marketing/SupplyChain）
  - 行业数据全部指数化（JD 不暴露绝对 GMV）
  - 竞争分析需要 ¥8,856/年数据尊享包
  - JDR 键命名规律: `jdr_sch_{domain}_{metric}_{source}`
- **原因**: 见 [D0002](discovery/D0002-JD-Capability-Discovery.md)。能力矩阵是 Connector 开发的唯一可靠基础。基于页面名称的推测不可靠（如"搜索分析"页面实际可能返回商品排行而非搜索关键词）。所有 Business Context 必须由真实数据字段验证。
- **资产**: discovery/jd-capability/ — page_inventory, api_inventory, indicator_dictionary, business_context_candidates, screenshots, dom, api-responses

## ADR-019: Connector 永远不得定义 Business Context (P0005.2)
- **日期**: 2026-07-01
- **状态**: Accepted
- **决策**: Connector 只负责 Acquisition、Evidence、Discovery。Business Context 必须从 Discovery 数据字段反向生成，永远不能由程序员在 manifest 中手写声明。
- **责任分离**:
  - **Connector**: Acquire Data → Capture Evidence → Execute Discovery → Expose Capability
  - **Discovery Engine** (`apps/ecommerce/connectors/discovery/`): API Inventory → Schema Evolution → Indicator Dictionary → Business Context Generation
  - **Business Context**: 来自 `CONTEXT_DETECTION_RULES` 对真实 API 响应字段的分析，不是来自程序员判断
- **规则**:
  - `manifest.ts` 中的 `business_context` 字段最终必须由 Discovery 生成，不由人工维护
  - 所有 Business Context 候选必须有对应的真实 API 字段作为证据（context→based_on_fields）
  - Context Detection Rules (`CONTEXT_DETECTION_RULES`) 是 field-pattern→context 映射的单一可信源
  - 新增平台时，Skill/Decision/Experience/Review 全部无需修改 — Context 由 Discovery 自动生成
- **原因**: 见 [P0005.2](proposals/P0005.2-discovery-driven-connector-architecture.md)。基于页面名称的推测不可靠。只有真实 API 响应字段才能验证"这个平台能提供什么数据"。这是平台无关性的基础 — 每个新平台只需运行 Discovery，Context 自动生成。

## ADR-026: JD Persistence Layer — Data → SQLite Bridge (2026-07-12)

- **日期**: 2026-07-12
- **状态**: Accepted
- **决策**: 建立 `platform/storage/jd-schema.ts` + `platform/storage/jd-persistence.ts`，将 CDP 采集的原始数据持久化到 SQLite。

### 模块职责

| 文件 | 职责 | 位置 |
|------|------|------|
| `jd-schema.ts` | 4 张表定义：`jd_raw_data`（原始行）、`jd_collection_runs`（采集任务）、`jd_dataset_metadata`（数据集元数据）、`jd_metric_timeseries`（指标时序） | `platform/storage/` |
| `jd-persistence.ts` | 桥接 CDP 采集结果 (`AcquireResult`) → SQLite 持久化。包含行提取 (`extractRowsFromPayload`)、指标提取 (`extractMetricsFromRows`)、UPSERT 逻辑 | `platform/storage/` |
| `init.ts` | 在 `initDatabase()` 中调用 `applyJdSchema()` + `seedJdDatasets()` | `platform/storage/` |

### 为什么放在 `platform/storage/` 而非 `apps/ecommerce/connectors/jd/`

- `persistence.ts` 是**基础设施**（数据持久化），不是业务逻辑
- 遵循 "Every Module Must Represent Business" 原则：持久化层属于平台层，不体现业务角色
- 符合 CLAUDE.md 目录布局：`platform/storage/` = SQLite (connection, schema, init, product repository)

### 设计决策

1. **UPSERT 语义** — `jd_raw_data` 用 `(dataset_id, source_page, row_index, data_date)` 作为唯一键，支持增量更新
2. **指标时序** — `jd_metric_timeseries` 用 `(dataset_id, entity_id, metric_name, data_date)` 作为唯一键
3. **采集任务追踪** — `jd_collection_runs` 记录每次采集的日期范围、数据集、行数、状态
4. **数据集元数据** — `jd_dataset_metadata` 预注册已知数据集（productTop, summary, trend, flowAnalysis 等）

### 受影响模块

- `platform/storage/jd-schema.ts` — 新建
- `platform/storage/jd-persistence.ts` — 新建
- `platform/storage/init.ts` — +applyJdSchema() 调用
- `apps/ecommerce/connectors/jd/historical-acquire.ts` — 修复 MockJdPayload 类型转换

### 修复: historical-acquire.ts 类型错误

- **问题**: `MockJdPayload` 没有索引签名，TS 不允许用联合字面量类型索引它
- **修复**: 使用 `key in mock` 类型守卫 + `keyof MockJdPayload` 替代 `as any`
- **符合规范**: CLAUDE.md 规定 "No `any` — use `unknown` and narrow"

- **原因**: 采集的数据需要持久化到 SQLite 供后续分析使用。这是 P0005.1 (Connector) 和 P0005.5 (Kernel) 之后的数据持久化层补充。

## ADR-019: Proposal 命名规范

- **日期**: 2026-08-11
- **状态**: Accepted
- **决策**: 统一 proposal 文件命名规范。详见 `proposals/README.md`。

规则：
1. Architecture Proposal: `P{NNNN}[-{N}]-{kebab-case-description}.md`
2. Feature/Phase Proposal: `{module}-v{version}-phase{N}-{description}.md`
3. Expansion Layer: `P000x.N` 保留前缀
4. 全小写 kebab-case，只用连字符，不用下划线/特殊字符/PascalCase
5. 描述必须完整，不截断

本次规范化：17 个文件重命名（修复 PascalCase、typo、下划线、特殊字符、截断描述）。

## ADR-020: Phase 3 HermesAgent Integration — 四个核心设计决策

- **日期**: 2026-08-11
- **状态**: Accepted (Design)
- **来源**: [workspace-v0.2-phase3-hermes-integration.md](proposals/workspace-v0.2-phase3-hermes-integration.md)

### 决策 1: Capability Discovery 由 HermesAgent 驱动

HermesAgent 调用 `CapabilityRegistry.searchByIntent()` 获取候选能力，自行选择最优匹配。Registry 只返回 capability candidates，不返回数据，不执行采集。

**意义**: HermesAgent 只理解需求，不接触采集细节。Capability Registry 是纯查询接口。

### 决策 2: Runtime Kernel 是共享 Capability Execution Layer

Runtime Kernel 不属于 HermesAgent 内部。它是 agentFabric 的公共执行层——任何 Agent Runtime (Hermes, Claude Agent, future agents) 都可以共享。

**意义**: agentFabric 不会退化成"会调用工具的 ChatBot"。它是多 Agent 共享的能力执行基础设施。

### 决策 3: Observable Event Model 定义 UI 契约

8 种标准化事件类型（intent.resolved → response.ready）。Agent Session UI 消费事件流渲染 Agent Activity panel。事件是 Agent 外部可观察行为，不是内部思维过程。

**意义**: UI 观察行为，不读取内部思维。不暴露模型 Chain-of-Thought。

## ADR-021: Phase 3.1 Runtime Kernel Contract

- **日期**: 2026-08-11
- **状态**: Accepted
- **来源**: [docs/runtime-kernel-contract.md](../docs/runtime-kernel-contract.md)

**决策**: 建立 Agent Runtime 与 Runtime Kernel 之间的标准化 ExecutionRequest/ExecutionEvent 协议。

- `ExecutionRequest`: Agent 发送 { taskId, capability, inputs, context } — Kernel 决定 HOW 执行
- `ExecutionEvent`: Kernel 发出 7 种可观察事件（execution.started → execution.completed/failed）
- Contract 是 Agent-agnostic 的 — 任何 Agent Runtime 都可用
- 事件描述执行状态，不描述模型思维（无 thinking/reasoning/chain-of-thought）
- 与 Capability Contract 的关系: Contract 定义 WHAT; Execution Contract 定义 HOW TO REQUEST
- 文件: `shared/schemas/execution.ts` + `tests/contract/execution.contract.ts` (20 tests)

### 决策 4: Runtime Chat 是异步 Task 模型

`POST /api/runtime/chat` 不是同步 Chat API——是异步 task 模型 + SSE 事件流。因为 CDP 采集需要 10-30 秒，Agent 执行是过程不是同步问答。

**意义**: Task 模型支持多消费者观察同一任务（Workspace + CLI + future tools），支持 replay/audit/debug。

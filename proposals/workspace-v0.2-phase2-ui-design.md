# Workspace v0.2 — Agent Cognitive Workspace

**Human ↔ Agent ↔ Capability ↔ Evidence**

**Status**: Proposal  
**Date**: 2026-08-11  
**Depends on**: P0006.5.3 Capability Contract, P0002 Workspace IA  
**Type**: Pure Design — no implementation

---

## 1. Objective

Workspace v0.2 将现有 agentFabric Workspace MVP 升级为 **Agent Cognitive Workspace**，使用户能够：

- 与 HermesAgent（agentFabric 当前选用的 Agent Runtime）进行工作对话
- 查看 Agent 当前任务状态与可观测的执行过程
- 发现 agentFabric 已具备的 Capability（数据获取能力）
- 追溯每个 Capability 使用的数据来源与 Evidence 链路

Workspace 的对象是 **agentFabric 系统本身**。HermesAgent 是它当前的 Agent Runtime。

---

## 2. Architecture

### 2.1 System Boundary

```
                    agentFabric
┌──────────────────────────────────────────────────┐
│                                                  │
│   Workspace (人机交互层)                          │
│      │                                           │
│      ├──── Agent Session ───────────┐            │
│      │     (主工作视图)              │            │
│      │                              │            │
│      ├──── Capability Explorer      │            │
│      │     (能力发现)               │            │
│      │                              ▼            │
│      └──── Evidence Viewer     HermesAgent       │
│           (证据追溯)            (Agent Runtime)   │
│                │                    │            │
│                ▼                    │            │
│         Capability Registry         │            │
│                │                    │            │
│                ▼                    │            │
│         Catalog / Evidence          │            │
│                │                    │            │
│                └──────────┬─────────┘            │
│                           ▼                      │
│                   Runtime / Acquisition          │
│                           │                      │
│                        JD 商智                    │
└──────────────────────────────────────────────────┘
```

**关键关系**：

- HermesAgent 和 Workspace 都处于 agentFabric 内部架构中
- 不存在 Workspace → CBP → HermesAgent → agentFabric 的外部链
- Capability Registry / Catalog / Evidence 是 agentFabric 自己的能力资产
- CBP 不属于这条架构链

### 2.2 Ownership Boundary

```
agentFabric owns:                    HermesAgent owns:
├── Workspace                        ├── task planning
├── Capability Registry              ├── reasoning
├── Catalog                          ├── capability selection
├── Evidence                         ├── tool invocation
├── Acquisition capabilities         └── runtime loop
└── Domain knowledge / Skills
```

agentFabric 不重新实现 Agent loop。HermesAgent 不做数据采集。

---

## 3. Workspace Definition

Workspace 不是 Dashboard。

| Dashboard 思路 | Workspace 思路 |
|---------------|----------------|
| 系统发生了什么 → 展示状态 | 我要完成什么 → 与 Agent 工作 |
| 被动监控 | 主动协作 |
| 数据展示为中心 | Agent 交互为中心 |

Workspace 的工作流：

```
我要完成什么
      ↓
与 Agent 工作
      ↓
Agent 使用什么 Capability
      ↓
Capability 获取了什么 Evidence
      ↓
Agent 得出了什么认知/结果
```

这是一个**工作界面**，不是监控界面。

---

## 4. Information Architecture

### 4.1 Primary View: Agent Session

Agent Session 是 Workspace 的核心工作区，不是三个平级 Panel 之一。

```
┌─ Workspace ─────────────────────────────────────────────┐
│                                                          │
│  ┌─ Header ───────────────────────────────────────────┐ │
│  │  agentFabric · v0.2.0                               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────┬──────────────────────────────┬──────────┐ │
│  │ Sidebar  │     Center: Agent Session    │ Decision │ │
│  │          │                              │ Panel    │ │
│  │ 🤖 Agent │  用户 ↔ HermesAgent          │          │ │
│  │   Session│                              │ Detail   │ │
│  │          │  当前任务                     │ view for │ │
│  │ 🔍 Inbox │  当前认知                     │ agent    │ │
│  │   Growth │  Capability usage             │ claims   │ │
│  │   Risk   │  Evidence references          │          │ │
│  │   Review │  Result                       │          │ │
│  │          │                              │          │ │
│  │ 📋 Capab.│                              │          │ │
│  │   Evid.  │                              │          │ │
│  │          │                              │          │ │
│  │ 📊 Prod. │                              │          │ │
│  │   Trend  │                              │          │ │
│  │   Archive│                              │          │ │
│  │   Memory │                              │          │ │
│  │          │                              │          │ │
│  │ ⚡ Runtime│                              │          │ │
│  │          │                              │          │ │
│  │ ⚙️ Config│                              │          │ │
│  └──────────┴──────────────────────────────┴──────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Sidebar Structure

```
Workspace v0.2 Sidebar
│
├── 🤖 AGENT (NEW — primary)
│   └── Agent Session     ★ 首页/默认视图
│
├── 🔍 DISCOVERY (existing)
│   ├── Inbox
│   ├── Growth
│   ├── Risk
│   └── Review
│
├── 📋 CAPABILITY (NEW)
│   ├── Capability Explorer   — 浏览数据能力
│   └── Evidence Viewer       — 追溯证据链
│
├── 📊 ANALYSIS (existing)
│   ├── Product Analysis
│   ├── Trend View
│   ├── Archive
│   └── Memory Growth
│
├── ⚡ RUNTIME (existing)
│   └── Execution History
│
└── ⚙️ SYSTEM (existing)
    └── Agent Config
```

### 4.3 Existing Views — Modification Plan

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `workspace/index.html` | **Modify** | 新增 Agent Session / Capability Explorer / Evidence Viewer 的 DOM 容器；现有 view container 保留 |
| `workspace/styles.css` | **Modify** | 新增 capability cards、evidence provenance chain、session messages 的样式 |
| `workspace/app.js` | **Modify** | 新增 AgentSession、CapabilityExplorer、EvidenceViewer 模块；sidebar 新增 AGENT + CAPABILITY section；现有模块保留 |
| `platform/server/routes/runtime.ts` | **Modify** | 新增 `POST /api/runtime/chat`、`GET /api/evidence/:id`、`GET /api/capabilities` 端点 |
| 其他所有文件 | **Keep** | 不做任何修改 |

---

## 5. View Design: Agent Session（主视图）

### 5.1 Purpose

Agent Session 是用户与 HermesAgent 工作的主界面。用户输入自然语言，Agent 使用 agentFabric 的 Capability 获取数据，返回分析结果。每一条结论都可以追溯到 Capability 和 Evidence。

### 5.2 Strict Constraint: No Fabricated Cognition

**Agent Session 只能展示 Runtime 明确暴露的 observable state**：

| 允许展示 | 不允许展示（除非 Runtime 真实提供） |
|---------|-----------------------------------|
| 用户消息 | 伪造的 "Thinking..." 步骤 |
| Agent 返回的最终响应文本 | 伪造的 "Analyzing..." / "Reasoning..." |
| Runtime 明确发出的 task event（如 capability selected, acquisition started） | 推断的 chain-of-thought |
| Capability 使用记录（哪个 capability 被调用） | UI 自行推演的 "Agent thinks..." |
| Evidence reference（结果关联了哪个 evidence） | 编造的中间分析步骤 |
| 系统消息（session 开始/结束、capability 不可用、错误） | — |

**如果当前 HermesAgent integration 尚未提供 task/acquisition events**：UI 只展示 user message + agent response，不填充中间状态。

### 5.3 Layout

```
┌─ Agent Session ──────────────────────────────────────────┐
│                                                           │
│  ┌─ Session Header ──────────────────────────────────┐   │
│  │  🤖 HermesAgent · 2026-08-11 14:32                │   │
│  │  [New Session]  [History ▾]                        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Conversation ────────────────────────────────────┐   │
│  │                                                    │   │
│  │  🧑 "分析一下最近7天的流量下降原因"                 │   │
│  │      14:32                                         │   │
│  │                                                    │   │
│  │  ── System: capability selected ──                 │   │
│  │  traffic.overview (jd, CDP, verified ✅)           │   │
│  │  [View capability details]                         │   │
│  │                                                    │   │
│  │  ── System: acquisition started ──                 │   │
│  │  Capturing traffic data for 2026-08-04 ~ 08-11     │   │
│  │  (only if Runtime emits this event)                │   │
│  │                                                    │   │
│  │  🤖 "过去7天流量下降 23%，主要来自：               │   │
│  │                                                    │   │
│  │   1. 搜索渠道: -35% (关键词排名下降)               │   │
│  │      [View Evidence]                               │   │
│  │                                                    │   │
│  │   2. 推荐渠道: -12%                                │   │
│  │      [View Evidence]                               │   │
│  │                                                    │   │
│  │   Based on: traffic.overview (jd, CDP, ✅)         │   │
│  │   Evidence: 7 artifacts (2026-08-04 ~ 08-11)      │   │
│  │   "                                              │   │
│  │                                                    │   │
│  │  [Ask follow-up]                                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Input ───────────────────────────────────────────┐   │
│  │  [traffic.overview ×] Type a question...    [Send] │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 5.4 Observable Event Types (from Runtime)

| Event | Source | When |
|-------|--------|------|
| `session.created` | System | Session 开始 |
| `capability.selected` | HermesAgent | Agent 确定使用某个 Capability |
| `acquisition.started` | Runtime Kernel | 数据采集开始 |
| `acquisition.completed` | Runtime Kernel | 数据采集完成（含 evidence count） |
| `response.ready` | HermesAgent | Agent 返回分析结果 |
| `error` | System | Capability 不可用、采集失败等 |

> 以上 event types 定义了 UI 的 state interface。如果当前 HermesAgent / Runtime 尚未发出这些事件，UI 保留对应的渲染逻辑，但不填充伪造数据。

---

## 6. View Design: Capability Explorer

### 6.1 Purpose

Capability Explorer 回答：**"agentFabric 现在能获取什么数据？"**

它消费 Capability Contract，但展示的是**人类可读的业务语义**，不是 JSON dump。

### 6.2 Principle: Business Semantics, Not JSON Viewer

我们做 P0006.5.3 Capability Contract，不是为了在 UI 里漂亮地显示 JSON。

用户看到的不应该是：

```
❌ capability: "traffic.overview"
❌ outputs: ["uv", "pv", "conversion_rate"]
❌ provider: { platform: "jd", acquisition: "cdp" }
```

用户应该看到：

```
✅ 流量分析
   平台：京东商智
   可以回答：
   · 店铺流量怎么样？
   · 最近流量是否下降？
   · 哪个渠道贡献最大？
   · 商品流量表现如何？
   提供指标：访客数、浏览量、转化率、曝光、点击
   状态：Verified ✅
   Evidence：12 artifacts
   [查看详情]  [在 Agent Session 中使用]
```

### 6.3 Layout

```
┌─ Capability Explorer ────────────────────────────────────┐
│                                                           │
│  ┌─ Filters ──────────────────────────────────────────┐  │
│  │  [All] [Trade] [Traffic] [Product] [Service] [...]  │  │
│  │  🔍 Search intents...                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Capabilities ─────────────────────────────────────┐  │
│  │                                                     │  │
│  │  ┌──────────────────────────┐  ┌──────────────────┐ │  │
│  │  │ ✅ 交易概览               │  │ ⚠️ 流量分析       │ │  │
│  │  │ trade.overview            │  │ traffic.overview  │ │  │
│  │  │                          │  │                   │ │  │
│  │  │ 核心经营指标：GMV、订单、 │  │ 流量来源分析：    │ │  │
│  │  │ 访客、转化率。每日汇总 +  │  │ 各渠道访客数、UV、│ │  │
│  │  │ 24h趋势 + Top5商品排行。 │  │ PV、跳失率。      │ │  │
│  │  │                          │  │                   │ │  │
│  │  │ 可以回答：               │  │ 可以回答：        │ │  │
│  │  │ · 今天卖了多少？         │  │ · 店铺流量怎么样？│ │  │
│  │  │ · GMV涨跌分析            │  │ · 流量从哪里来？  │ │  │
│  │  │ · 哪个商品卖得最好？     │  │ · 搜索什么关键词？│ │  │
│  │  │                          │  │                   │ │  │
│  │  │ 提供指标：               │  │ 提供指标：        │ │  │
│  │  │ gmv orders visitors      │  │ visitors uv pv    │ │  │
│  │  │ customers conversion_rate│  │ bounce_rate ...   │ │  │
│  │  │                          │  │                   │ │  │
│  │  │ 平台：京东商智 · CDP     │  │ 平台：京东商智·CDP│ │  │
│  │  │ 已验证：2026-08-09       │  │ 已采集（待验证）  │ │  │
│  │  │                          │  │                   │ │  │
│  │  │ [在 Session 中使用]      │  │ [在 Session 中使用]│ │  │
│  │  └──────────────────────────┘  └──────────────────┘ │  │
│  │                                                     │  │
│  │  ┌──────────────────────────┐                       │  │
│  │  │ 💰 竞争分析               │                       │  │
│  │  │ trade.competition         │                       │  │
│  │  │ 需要 ¥8,856/年 数据尊享包 │                       │  │
│  │  └──────────────────────────┘                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  11 capabilities · 48 metrics · 1 verified · 4 blocked    │
└───────────────────────────────────────────────────────────┘
```

### 6.4 Capability Detail (expanded view)

点击 "查看详情" 进入单个 Capability 的完整视图：

```
┌─ Capability Detail: traffic.overview ────────────────────┐
│                                                           │
│  流量分析                                     ⚠️ captured │
│  traffic.overview                                         │
│                                                           │
│  流量来源分析：各渠道访客数、UV、PV、跳失率。             │
│  来源渠道归因 + 搜索关键词分析。                          │
│                                                           │
│  ── 可以回答 ──────────────────────────────────────────  │
│  · 店铺流量怎么样？                                       │
│  · 最近流量是否下降？                                     │
│  · 哪个渠道贡献最大？                                     │
│  · 搜索什么关键词进来的？                                 │
│  · 商品流量表现如何？                                     │
│                                                           │
│  ── 提供指标 ──────────────────────────────────────────  │
│  访客数 (visitors)    浏览量 (pv)         UV             │
│  跳失率 (bounce_rate)  停留时长           渠道访客        │
│  渠道成交              搜索词访客                         │
│                                                           │
│  ── Provider ──────────────────────────────────────────  │
│  平台：京东商智                                          │
│  获取方式：Live CDP                                       │
│  状态：Available                                          │
│  Last verified: — (captured, not yet verified)            │
│                                                           │
│  ── Evidence ──────────────────────────────────────────  │
│  12 artifacts (2026-08-04 ~ 2026-08-11)                   │
│  [Open Evidence Viewer →]                                 │
│                                                           │
│  ── 约束 ──────────────────────────────────────────────  │
│  需要子菜单点击交互                                       │
│                                                           │
│  [在 Agent Session 中使用此 Capability]                   │
└───────────────────────────────────────────────────────────┘
```

### 6.5 Key Constraint

**Contract 是机器接口；Workspace 展示的是 Capability 的人类语义。**
UI 从 CapabilityContractEntry 中读取字段，但渲染层必须转化为业务语言。

---

## 7. View Design: Evidence Viewer

### 7.1 Purpose

Evidence Viewer 回答：**"这个结论的数据从哪里来，能信吗？"**

它不是文件浏览器。它展示的是 **Capability → Discovery → Acquisition → Evidence 的 provenance 链**。

### 7.2 Principle: Provenance Chain, Not File Browser

不要做成：

```
❌ capture.json
❌ endpoints.json
❌ api-001.json
❌ api-002.json
```

要表达：

```
traffic.overview
     ↓
京东商智 / 流量 / 流量概况
     ↓
Live CDP Capture · 2026-08-10
     ↓
7 endpoints captured
     ↓
Raw Response → Semantic Mapping → 17 Metrics
     ↓
Capability Contract ← this evidence validates
```

用户需要时才能逐层展开 raw artifact。

### 7.3 Layout

```
┌─ Evidence Viewer ────────────────────────────────────────┐
│                                                           │
│  ┌─ Breadcrumb ───────────────────────────────────────┐  │
│  │  Agent Session > traffic.overview > 2026-08-10       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Provenance Chain ─────────────────────────────────┐  │
│  │                                                     │  │
│  │  traffic.overview                                   │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  京东商智 / 流量 / 流量概况                          │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  Live CDP Capture                                   │  │
│  │  2026-08-10 02:30 UTC                               │  │
│  │  Shop: 祁门红茶旗舰店 (11855009)                    │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  7 endpoints captured                               │  │
│  │  [▸ expand: getFlowDetail, getFlowSrcTop, ...]     │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  Raw Response                                       │  │
│  │  [▸ View raw JSON]                                  │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  Semantic Mapping                                   │  │
│  │  jdr_sch_traffic_... → traffic_by_channel (0.92)    │  │
│  │  jdr_sch_traffic_... → order_amount_by_channel (0.87)│  │
│  │  [▸ View all 17 mappings]                           │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  17 Metrics                                         │  │
│  │  visitors=1,234 | uv=892 | pv=3,456 | ...           │  │
│  │      │                                              │  │
│  │      ▼                                              │  │
│  │  Capability Contract                                │  │
│  │  This evidence supports: traffic.overview            │  │
│  │  Validation status: captured ⚠️                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Evidence Timeline ────────────────────────────────┐  │
│  │  2026-08-11  traffic  · 7 APIs · 17 metrics         │  │
│  │  2026-08-10  traffic  · 7 APIs · 17 metrics         │  │
│  │  2026-08-09  traffic  · 7 APIs · 17 metrics         │  │
│  │  ...                                                 │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

## 8. Data Flow

### 8.1 Agent Session Flow

```
User types "分析流量下降原因"
    │
    ▼
┌─────────────────────────────┐
│ Agent Session View           │
│ POST /api/runtime/chat       │
│ { prompt, session_id }       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ HermesAgent (agentFabric 的  │
│ Agent Runtime)               │
│                              │
│ Owns:                        │
│  - task planning             │
│  - reasoning                 │
│  - capability selection      │
│  - tool invocation           │
│                              │
│ 1. Queries CapabilityRegistry│
│    registry.searchByIntent() │
│    → traffic.overview        │
│                              │
│ 2. Plans acquisition         │
│                              │
│ 3. Invokes Runtime Kernel    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Runtime Kernel               │
│ (agentFabric acquisition)    │
│                              │
│ Owns:                        │
│  - CDP / API acquisition     │
│  - parsing / normalizing     │
│  - evidence storage          │
│                              │
│ → Returns: signals + evidence│
│   references                 │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ HermesAgent                  │
│ → Formats response           │
│ → Includes evidence links    │
│ → Includes capability ref    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Agent Session View           │
│ Renders:                     │
│  - Agent response            │
│  - Capability badge          │
│  - Evidence links            │
│  - Observable events (if any)│
└─────────────────────────────┘
```

### 8.2 Workspace Does NOT Know About Acquisition Implementation

```
Workspace sees:                  Workspace does NOT see:
┌──────────────────────┐        ┌──────────────────────┐
│ Provider: JD 商智     │        │ CDP port 9222        │
│ Method: Live CDP      │        │ szgateway.jd.com     │
│ Status: Available     │        │ POST body params     │
│ Last verified: ...    │        │ cookie               │
└──────────────────────┘        │ Playwright           │
                                │ page.goto()          │
                                └──────────────────────┘
```

实现细节属于 capability provider / acquisition implementation，不泄漏到 Workspace interaction model。

---

## 9. Component Boundaries

### 9.1 Ownership

```
Agent Session View
├── Owns: conversation state, message rendering, input handling
├── Reads: POST /api/runtime/chat → agent response + events
├── Does NOT: execute CDP, parse JDR keys, plan tasks
└── Links to: Capability Explorer, Evidence Viewer, Decision Panel

Capability Explorer
├── Owns: capability card rendering, domain filter, semantic search
├── Reads: CapabilityRegistry (in-memory, from capability-contract.json)
├── Does NOT: trigger acquisition, execute anything
└── Links to: Agent Session ("使用此 Capability")

Evidence Viewer
├── Owns: provenance chain rendering, data preview, mapping display
├── Reads: Evidence Store (file system), indicator-map (in-memory)
├── Does NOT: modify evidence, re-acquire data
└── Links to: Agent Session, Capability Explorer

Decision Panel (existing, preserved)
├── Owns: detailed reasoning display, trace expansion
├── Reads: agent response metadata
├── Does NOT: own conversation state
└── Mode: Business (AI summary) / Developer (full trace)
```

### 9.2 Cross-Component Navigation

```
Agent Session ──→ Capability Explorer
   "View capability details" on capability badge

Agent Session ──→ Evidence Viewer
   "View Evidence" on data claim

Agent Session ──→ Decision Panel
   Click claim → show detail in right sidebar

Capability Explorer ──→ Agent Session
   "在 Session 中使用" → opens Session with capability pre-selected

Evidence Viewer ──→ Capability Explorer
   "This evidence supports: traffic.overview"
```

---

## 10. Included (Phase 2 Scope)

- 扩展现有 agentFabric Workspace（`workspace/index.html` + `app.js` + `styles.css`），而非建立独立 Dashboard
- Agent Session 成为 Workspace 的核心工作视图（默认首页）
- Capability Explorer 消费现有 Capability Contract（`generated/capability-contract.json`），展示业务语义
- Capability Detail 展示单个 capability 的 intent、inputs、outputs、provider、validation
- Evidence Viewer 建立 Capability → Platform Page → CDP Capture → Raw Response → Semantic Mapping → Metrics 的 provenance 视图
- Agent Session 支持展示 Runtime 明确发出的 observable event（session start、capability selected、acquisition completed、response ready、error）
- 如果当前 HermesAgent integration 尚未提供 task/acquisition events：UI 只定义 state interface，不填充伪造数据
- 保留现有 Workspace 的全部已有功能（Inbox / Growth / Risk / Review / Product / Trend / Archive / Memory / Runtime / Config）
- 重新组织导航关系：AGENT section 置顶，CAPABILITY section 新增，其他 section 保留
- 为未来 Skill / Memory evolution 保留入口，但 Phase 2 不实现

---

## 11. NOT Included

| 类别 | 排除 | 原因 |
|------|------|------|
| CBP 项目 | ❌ | 不修改 CBP、CBP Protocol、CBP Dashboard、或 `/Users/bx/Workspace/bridge` 下的任何文件 |
| HermesAgent 重新实现 | ❌ | 不开发新的 Agent loop / planner / reasoning engine |
| Capability Contract 改为 UI schema | ❌ | Contract 是 Agent API contract，UI 只是 consumer |
| Workspace 内实现 CDP/Playwright/JD API | ❌ | 采集实现属于 acquisition layer |
| 伪造 Agent 认知链 | ❌ | 不展示或伪造模型内部 Chain-of-Thought |
| 重写现有 Workspace | ❌ | 必须增量扩展现有 Workspace |
| BI Dashboard | ❌ | 商品趋势、流量图表只在 Agent 工作结果需要时作为 artifact 展示 |
| P0007 Skill/Memory learning | ❌ | 属于下一阶段 |
| 多平台 Contract（Tmall, Amazon）| ❌ | 单平台先行 |
| 自动化采集调度 | ❌ | 当前依赖手动 Chrome + CLI |
| 代码实现 | ❌ | Design only — 本 Proposal 不包含任何代码 |

---

## 12. Acceptance Criteria

- [ ] Agent Session 是 Workspace 默认首页
- [ ] Agent Session 可接受自然语言输入，展示 Agent 返回的响应
- [ ] Agent 响应中包含 Capability badge（点击进入 Capability Detail）
- [ ] Agent 响应中的数据声明包含 Evidence link（点击进入 Evidence Viewer）
- [ ] Capability Explorer 展示全部 11 个 capabilities，以业务语义呈现
- [ ] Capability Detail 展示单个 capability 的 intent/metrics/provider/validation
- [ ] Evidence Viewer 展示完整的 provenance 链（capability → page → capture → raw → mapping → metrics）
- [ ] Provenance 链的每一层可按需展开
- [ ] Sidebar 新增 AGENT（顶部）和 CAPABILITY（第二）两个 section
- [ ] 现有一切视图完整保留，功能不受影响
- [ ] 如果 Runtime 不发出 task event，Agent Session 不展示伪造的中间状态

---

## 13. File Inventory

| 文件 | 变更 | 说明 |
|------|------|------|
| `apps/ecommerce/workspace/index.html` | **Modify** | Add: Agent Session container, Capability Explorer container, Evidence Viewer container. Keep: all existing view containers |
| `apps/ecommerce/workspace/styles.css` | **Modify** | Add: `.session-message`, `.capability-card`, `.provenance-chain`, `.evidence-timeline` styles. Keep: all existing styles |
| `apps/ecommerce/workspace/app.js` | **Modify** | Add: `AgentSession`, `CapabilityExplorer`, `EvidenceViewer` modules. Modify: sidebar nav (add AGENT + CAPABILITY sections). Keep: all existing modules |
| `platform/server/routes/runtime.ts` | **Modify** | Add: `POST /api/runtime/chat`, `GET /api/evidence/:id`, `GET /api/capabilities` |
| All other files | **Keep** | No changes |

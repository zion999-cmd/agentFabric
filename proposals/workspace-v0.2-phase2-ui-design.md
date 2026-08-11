# Workspace v0.2 Phase 2 — Agent Cognitive Workspace UI Design

**Status**: Proposal  
**Date**: 2026-08-11  
**Depends on**: P0006.5.3 Capability Contract, P0002 Workspace IA, P0006 HermesAgent Integration  
**Type**: Pure Design — no implementation

---

## 1. Context

### 1.1 What Exists Today (v0.9.1)

```
Workspace v0.9.1
├── Sidebar (8 nav items + agent status footer)
├── Center Panel (6 views)
│   ├── Inbox — AI findings + stat cards + chat
│   ├── Product Analysis — SKU search placeholder
│   ├── Trend View — signal timeline (placeholder)
│   ├── Archive — historical ranking profiles
│   ├── Memory — operator memory growth (placeholder)
│   └── Runtime — manual collect button + replay panel + execution history
├── Decision Panel (right sidebar)
│   ├── Business Mode — AI summary + reasoning + tool calls
│   └── Developer Mode — expanded trace (skills, MCP, memory, validation)
└── Header — branding + notification + lang + user
```

### 1.2 What Changed Since v0.9.1

P0006.5.3 completed the **Capability Contract** — a machine-readable interface that tells agent runtimes what data capabilities exist. Before this, the Workspace only displayed signals and findings that were already computed. Now, the Workspace can show *what capabilities are available* and *where data comes from*, not just *what conclusions were drawn*.

### 1.3 Phase 2 Goal

> Transform the Workspace from "AI output display" into "Agent Cognitive Workspace" — where operators can see what the agent knows, how it knows it, and interact with it to make decisions.

---

## 2. Core Architecture: Capability Contract → Workspace → HermesAgent

### 2.1 The Consumption Chain

```
┌─────────────────────────────────────────────────────────┐
│                   Capability Contract                    │
│                  (generated/capability-contract.json)    │
│                                                         │
│  11 capabilities · 48 metrics · 8 domains               │
│  intent-based search · validation status · provider     │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Contract Explorer   │  │    HermesAgent        │
│   (Workspace View)    │  │    (Runtime)          │
│                       │  │                       │
│  Operator browses:    │  │  Agent queries:       │
│  "What data can we    │  │  registry.searchBy    │
│   get from JD 商智?"  │  │  Intent("分析流量")   │
│                       │  │                       │
│  → See capabilities   │  │  → Gets capability    │
│  → See metrics        │  │  → Plans acquisition  │
│  → See validation     │  │  → Executes via CDP   │
└──────────────────────┘  └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   Agent Session View  │
                          │   (Workspace View)    │
                          │                       │
                          │  Operator interacts:  │
                          │  "分析流量下降原因"    │
                          │                       │
                          │  → See agent thinking │
                          │  → See capability used│
                          │  → See results        │
                          │  → Click into evidence│
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   Evidence Viewer     │
                          │   (Workspace View)    │
                          │                       │
                          │  Operator inspects:   │
                          │  "Where did this      │
                          │   GMV=¥4,634 come     │
                          │   from?"              │
                          │                       │
                          │  → Source platform    │
                          │  → Acquisition method │
                          │  → Timestamp + hash   │
                          │  → Raw → canonical    │
                          └──────────────────────┘
```

### 2.2 Design Principle: Capability-First Navigation

Before Phase 2, navigation was by *data type* (商品分析, 趋势观察) — the operator needed to know what data exists and where to find it.

After Phase 2, navigation is by *business capability* — the operator asks "what can the agent do?" and the Workspace shows the answer.

```
BEFORE (data-first):          AFTER (capability-first):
  商品分析                        Contract Explorer
  趋势观察                        ├── trade.overview ✅
  历史归档                        ├── traffic.overview ⚠️
  Memory 成长                     ├── product.overview ⚠️
  Runtime 执行                    └── ...
                                    │
                                    ├── Agent Session
                                    └── Evidence Viewer
```

---

## 3. Information Architecture — Phase 2 Update

### 3.1 Updated Sidebar Structure

```
Workspace v0.2 Sidebar
│
├── 🔍 DISCOVERY (existing, enhanced)
│   ├── Inbox — AI findings with capability provenance
│   ├── Growth — opportunities
│   ├── Risk — warnings
│   └── Review — human review queue
│
├── 📋 CAPABILITY (NEW)
│   ├── Contract Explorer — browse data capabilities
│   └── Evidence Viewer — inspect data provenance
│
├── 🤖 AGENT (NEW)
│   └── Agent Session — interact with HermesAgent
│
├── 📊 ANALYSIS (existing, preserved)
│   ├── Product Analysis
│   ├── Trend View
│   ├── Archive
│   └── Memory Growth
│
├── ⚡ RUNTIME (existing, preserved)
│   └── Execution History
│
└── ⚙️ SYSTEM (existing)
    └── Agent Config
```

### 3.2 What's New vs What's Preserved

| View | Status | Notes |
|------|--------|-------|
| Inbox / Growth / Risk / Review | **Preserved** | Existing findings + chat |
| Product / Trend / Archive / Memory | **Preserved** | Existing analysis views |
| Runtime Execution | **Preserved** | Existing collect + replay |
| Agent Config | **Preserved** | Existing settings |
| **Contract Explorer** | **NEW** | Capability browsing |
| **Evidence Viewer** | **NEW** | Provenance inspection |
| **Agent Session** | **NEW** | HermesAgent interaction |

---

## 4. View Design: Contract Explorer

### 4.1 Purpose

The Contract Explorer answers: *"What data capabilities does agentFabric have?"*

It is the human-readable rendering of `capability-contract.json`. Operators use it to understand what data the agent can access before asking questions.

### 4.2 Layout

```
┌─ Contract Explorer ──────────────────────────────────────┐
│                                                           │
│  ┌─ Domain Filter ────────────────────────────────────┐  │
│  │ [All] [Trade] [Traffic] [Product] [Service] [...]   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Search ───────────────────────────────────────────┐  │
│  │ 🔍 "分析流量"                          [11 results]  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Capability Cards (grid, 2-col) ───────────────────┐  │
│  │                                                     │  │
│  │  ┌─ trade.overview ✅ verified ──────────────────┐  │  │
│  │  │  交易概览                                      │  │  │
│  │  │  核心经营指标：GMV、订单、访客、转化率         │  │  │
│  │  │                                               │  │  │
│  │  │  Outputs: gmv, orders, visitors, customers,   │  │  │
│  │  │           conversion_rate, gmv_hourly         │  │  │
│  │  │                                               │  │  │
│  │  │  Provider: jd · CDP · Last verified 2026-08-09│  │  │
│  │  │                                               │  │  │
│  │  │  Intents: 今天卖了多少 | GMV涨跌分析 | ...    │  │  │
│  │  │                                               │  │  │
│  │  │  [View Evidence]  [Ask Agent about this]      │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─ traffic.overview ⚠️ captured ───────────────┐  │  │
│  │  │  ...                                          │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─ trade.competition 💰 premium ────────────────┐  │  │
│  │  │  ...                                          │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Summary Footer ──────────────────────────────────┐   │
│  │  11 capabilities · 48 metrics · 1 verified · ...   │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### 4.3 Card Component Specification

Each capability card renders the CapabilityContractEntry:

| Field | Rendering |
|-------|-----------|
| `capability` | Title + domain badge |
| `validation.status` | Status icon: ✅ verified / ⚠️ captured / 💰 premium / 🚧 blocked |
| `description` | Subtitle text |
| `outputs` | Metric chips (small pills showing canonical names) |
| `provider` | "jd · CDP" compact label |
| `intent` | Example questions (max 3), as clickable chips → jump to Agent Session |
| `validation.last_verified` | "Last verified: 2026-08-09" (only if verified) |
| `constraints` | Warning banner if premium/popup blocked |

### 4.4 Interactions

1. **Domain filter** — click domain pill, cards filter in-place
2. **Search** — calls `registry.searchByIntent(query)`, shows ranked results
3. **"Ask Agent about this"** — clicks a capability card → opens Agent Session view with capability pre-selected as context
4. **"View Evidence"** — clicks → opens Evidence Viewer filtered to this capability's verified metrics
5. **Intent chip click** — "GMV涨跌分析" → opens Agent Session with that intent as the initial prompt

---

## 5. View Design: Evidence Viewer

### 5.1 Purpose

The Evidence Viewer answers: *"Where did this data come from, and can I trust it?"*

It renders the provenance chain from `EvidenceMetadata`: acquisition_method → processing_method → content_hash → file_path. Every data point the agent uses must be traceable to its source.

### 5.2 Layout

```
┌─ Evidence Viewer ────────────────────────────────────────┐
│                                                           │
│  ┌─ Context Breadcrumb ───────────────────────────────┐  │
│  │  Agent Session > "分析流量下降" > traffic.overview   │  │
│  │  > Evidence: 2026-08-09_summary                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Evidence Record ──────────────────────────────────┐  │
│  │                                                     │  │
│  │  ┌─ Provenance Card ───────────────────────────┐   │  │
│  │  │  ┌──────────┐   ┌──────────┐   ┌──────────┐ │   │  │
│  │  │  │ JD 商智   │ → │ CDP      │ → │ Runtime  │ │   │  │
│  │  │  │ (source)  │   │ (acquire)│   │ (process) │ │   │  │
│  │  │  └──────────┘   └──────────┘   └──────────┘ │   │  │
│  │  │                                             │   │  │
│  │  │  Platform:    jd                            │   │  │
│  │  │  Shop:        祁门红茶旗舰店 (11855009)      │   │  │
│  │  │  Data Type:   summary                       │   │  │
│  │  │  Acquired:    2026-08-09T02:30:00Z (CDP)    │   │  │
│  │  │  Processed:   2026-08-09T02:31:00Z (runtime) │   │  │
│  │  │  Hash:        sha256:a3f2b8c1...            │   │  │
│  │  │  File:        data/evidence/jd/2026/08/     │   │  │
│  │  │               09_summary.json               │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │  ┌─ Data Preview ──────────────────────────────┐   │  │
│  │  │  {                                          │   │  │
│  │  │    "gmv": 4634.40,                          │   │  │
│  │  │    "orders": 25,                            │   │  │
│  │  │    "visitors": 448,                         │   │  │
│  │  │    "customers": 21,                         │   │  │
│  │  │    "conversion_rate": 5.58                  │   │  │
│  │  │  }                                          │   │  │
│  │  │  [View Raw]  [Copy]                         │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                                                     │  │
│  │  ┌─ Canonical Mapping ─────────────────────────┐   │  │
│  │  │  jdr_sch_trade_deal_ord_ord_amt_sz_... → gmv │   │  │
│  │  │  jdr_sch_trade_deal_ord_ord_qtty_sz_... → ord │   │  │
│  │  │  Confidence: 1.0 (hand-verified)             │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Evidence List (sidebar, scrollable) ──────────────┐   │
│  │  2026-08-09  summary    ✅ verified                 │   │
│  │  2026-08-09  trend      24h breakdown               │   │
│  │  2026-08-09  productTop Top 5 SKU                   │   │
│  │  2026-08-08  summary    ...                         │   │
│  │  ...                                                │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### 5.3 Key Interactions

1. **Provenance flow** — visual 3-step pipeline: Source → Acquisition → Processing, with timestamps
2. **Content hash** — displayed but truncated; click to copy full SHA-256
3. **Raw data toggle** — expand/collapse the raw JSON payload
4. **Canonical mapping** — expandable section showing JDR key → canonical metric + confidence
5. **Evidence list** — chronological list of all evidence records for this data type, with verification badges
6. **Cross-reference** — "This evidence was used in: Agent Session #42, Signal #128"

---

## 6. View Design: Agent Session View

### 6.1 Purpose

The Agent Session View is the primary interaction surface between the operator and HermesAgent. It replaces the current inline chat (which is buried in the Inbox view) with a first-class conversational interface that shows:

- What the operator asked
- What the agent understood (intent)
- Which capability the agent used
- What data the agent acquired
- What conclusion the agent reached
- The evidence trail for every claim

### 6.2 Layout

```
┌─ Agent Session ───────────────────────────────────────────┐
│                                                            │
│  ┌─ Session Header ───────────────────────────────────┐   │
│  │  🤖 HermesAgent · Session #42 · 2026-08-11 14:32   │   │
│  │  Status: ● Active  |  [New Session]  [History ▾]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─ Conversation (scrollable) ────────────────────────┐   │
│  │                                                     │   │
│  │  ┌─ Operator Message ──────────────────────────┐   │   │
│  │  │  🧑 "分析一下最近7天的流量下降原因"          │   │   │
│  │  │              2026-08-11 14:32                │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─ Agent Thinking (collapsible) ───────────────┐  │   │
│  │  │  🤔 Understanding...                         │  │   │
│  │  │  ├─ Intent: 分析流量变化, 解释访客下降        │  │   │
│  │  │  ├─ Capability: traffic.overview (jd, CDP)   │  │   │
│  │  │  └─ Need: 7 days of traffic data             │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  ┌─ Agent Action (collapsible) ────────────────┐   │   │
│  │  │  ⚡ Acquiring data...                        │  │   │
│  │  │  ├─ CDP connect → jdsz.jd.com ✓              │  │   │
│  │  │  ├─ Navigate → flow-summary ✓                │  │   │
│  │  │  ├─ Capture → getFlowDetail (3 APIs) ✓       │  │   │
│  │  │  └─ Normalize → 12 metrics mapped ✓          │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  ┌─ Agent Response ────────────────────────────┐   │   │
│  │  │  🤖 "过去7天流量下降 23%，主要来自："       │  │   │
│  │  │                                             │  │   │
│  │  │  1. 搜索渠道: -35% (关键词排名下降)         │  │   │
│  │  │     [View Evidence] [View Trend]            │  │   │
│  │  │                                             │  │   │
│  │  │  2. 推荐渠道: -12%                          │  │   │
│  │  │     [View Evidence]                         │  │   │
│  │  │                                             │  │   │
│  │  │  Confidence: 0.87                           │  │   │
│  │  │  Based on: traffic.overview (jd, CDP, ✅)   │  │   │
│  │  │                                             │  │   │
│  │  │  [Approve Analysis] [Ask Follow-up]         │  │   │
│  │  └─────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Input Area ───────────────────────────────────────┐   │
│  │  ┌─ Context Chips ─────────────────────────────┐   │  │
│  │  │  [traffic.overview ×]  [last 7 days]         │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Type a question...                          │   │  │
│  │  │                                    [Send →]  │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  │  Suggested: [查看最新GMV] [流量渠道分析] [商品排行] │   │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 6.3 Message Types

| Message Type | Icon | Content | Source |
|-------------|------|---------|--------|
| Operator Message | 🧑 | Natural language question | User input |
| Agent Thinking | 🤔 | Intent detection + capability resolution | HermesAgent planning phase |
| Agent Action | ⚡ | CDP connect, navigate, capture, normalize | Runtime execution log |
| Agent Response | 🤖 | Analysis conclusion + evidence links | HermesAgent response |
| System Note | ℹ️ | Session start, capability unavailable, error | System events |

### 6.4 Key Interactions

1. **Intent chips** — after agent responds, show detected intents as chips → operator can click to refine
2. **Evidence links** — every data claim in agent response has `[View Evidence]` link → opens Evidence Viewer
3. **Capability badge** — shows which capability was used (e.g., `traffic.overview ✅`) → click to open Contract Explorer for that capability
4. **Confidence display** — numeric + visual bar for agent confidence
5. **Approve/Follow-up** — operator actions on agent conclusions
6. **Session history** — dropdown to view/switch past sessions
7. **Context chips** — pre-selected capability/domain chips at input area, showing what context the agent is working with

### 6.5 Integration with Decision Panel

The existing Decision Panel (right sidebar) is the detail view for agent responses. When the operator clicks a data claim in the Agent Session:

```
Agent Session View (center)        Decision Panel (right)
┌─────────────────────────┐       ┌──────────────────────┐
│ "搜索渠道下降 35%"       │       │ Decision Basis       │
│  [View Evidence]  ←click │       │                      │
└────────────┬────────────┘       │ Evidence source:     │
             │                     │  jd · CDP · verified │
             └────────────────────→│                      │
                                   │ Raw metric:          │
                                   │  visitors_by_channel │
                                   │  = 289 (prev: 445)   │
                                   │                      │
                                   │ Confidence: 0.92     │
                                   │ [Developer Trace ▾]  │
                                   └──────────────────────┘
```

---

## 7. Data Flow

### 7.1 Complete Session Flow

```
Operator types "分析流量下降原因"
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ Agent Session View                                  │
│ → POST /api/runtime/chat  { prompt, session_id }    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ HermesAgent (planning phase)                        │
│                                                     │
│  1. Understand intent: "分析流量下降原因"            │
│  2. Query CapabilityRegistry:                       │
│     registry.searchByIntent("分析流量下降原因")      │
│     → traffic.overview (score: 38.0)                │
│  3. Verify capability is available:                 │
│     validation: captured ⚠️ (not verified)          │
│  4. Decide: proceed with caveat OR ask user         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Runtime Kernel (execution phase)                    │
│                                                     │
│  5. Execute acquisition plan:                       │
│     → CDP connect to jdsz.jd.com                    │
│     → Navigate to flow-summary                      │
│     → Click sub-menu: 来源渠道                       │
│     → Intercept getFlowDetail API                   │
│  6. Parse + normalize:                              │
│     JDR keys → canonical metrics                    │
│  7. Store evidence:                                 │
│     data/evidence/jd/2026/08/11_traffic.json        │
│  8. Compute signals:                                │
│     visitors_by_channel, traffic_trend               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ HermesAgent (response phase)                        │
│                                                     │
│  9. Analyze signals:                                │
│     "搜索渠道 visitors -35%, 推荐渠道 -12%"          │
│  10. Format response with evidence links            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Agent Session View (rendering)                      │
│                                                     │
│  Display:                                           │
│  - Agent Thinking (collapsed by default)            │
│  - Agent Action (collapsed by default)              │
│  - Agent Response (expanded)                        │
│  - Evidence links → click opens Evidence Viewer     │
│  - Capability badge → click opens Contract Explorer │
└─────────────────────────────────────────────────────┘
```

### 7.2 Capability Contract Data Flow

```
generated/capability-contract.json
    │
    │  loadContract()
    ▼
CapabilityRegistry (in-memory, indexed)
    │
    ├──→ Contract Explorer: renders cards from registry.listAll()
    │
    ├──→ HermesAgent: queries registry.searchByIntent(prompt)
    │
    └──→ Agent Session: shows capability badge via registry.getById(capability)
```

### 7.3 Evidence Viewer Data Flow

```
Agent Session: operator clicks [View Evidence]
    │
    ▼
Evidence Viewer loads:
    │
    ├── EvidenceMetadata from .meta.json (provenance card)
    ├── Raw payload from .json (data preview)
    └── Indicator mapping from indicator-map.ts (canonical mapping)
```

---

## 8. Component Boundaries

### 8.1 What Each Component Owns

```
Contract Explorer
├── Owns: capability card rendering, domain filter, search
├── Reads: CapabilityRegistry (in-memory)
├── Does NOT: trigger acquisition, execute anything
└── Exposes: "Ask Agent about this" → opens Agent Session

Evidence Viewer
├── Owns: provenance display, data preview, mapping display
├── Reads: Evidence Store (file system), indicator-map (in-memory)
├── Does NOT: modify evidence, re-acquire data
└── Exposes: "Used in Session #N" → links back to Agent Session

Agent Session View
├── Owns: conversation rendering, message types, input handling
├── Reads: HermesAgent API, CapabilityRegistry
├── Does NOT: execute CDP directly, parse JDR keys
└── Exposes: evidence links → opens Evidence Viewer

Decision Panel (existing, reused)
├── Owns: detailed reasoning display, trace expansion
├── Reads: agent response metadata
├── Does NOT: own conversation state
└── Exposes: Developer Mode trace for debugging
```

### 8.2 Cross-Component Links

```
Agent Session ←──────────→ Contract Explorer
     │  "Ask about this"        "Use this capability"
     │
     ├──────────→ Evidence Viewer
     │  "View Evidence"
     │
     └──────────→ Decision Panel
        "View Details" (existing)
```

---

## 9. Layout Design

### 9.1 Default Layout (Agent Session active)

```
┌─ Header ───────────────────────────────────────────────────┐
│  agentFabric · Agent Workspace · v0.2.0                     │
├────────┬────────────────────────────────────┬───────────────┤
│ Sidebar│        Center Panel                │ Decision Panel│
│ 240px  │                                    │ 340px         │
│        │  ┌─ Agent Session ──────────────┐  │               │
│  🔍    │  │                               │  │  Decision     │
│  Inbox │  │  🧑 "分析流量下降"            │  │  Basis        │
│  Growth│  │                               │  │               │
│  Risk  │  │  🤖 "过去7天流量下降23%..."   │  │  Source       │
│  Review│  │                               │  │  Evidence     │
│        │  │  [View Evidence] [Approve]    │  │  Reasoning    │
│  📋    │  │                               │  │  Trace        │
│  Contr.│  └───────────────────────────────┘  │               │
│  Evid. │                                     │               │
│        │  ┌─ Input ───────────────────────┐  │               │
│  🤖    │  │ [traffic.overview] Type...  → │  │               │
│  Sess. │  └───────────────────────────────┘  │               │
│        │                                     │               │
│  📊    │                                     │               │
│  ...   │                                     │               │
└────────┴────────────────────────────────────┴───────────────┘
```

### 9.2 Layout with Evidence Viewer (split center panel)

When operator clicks [View Evidence], the center panel splits:

```
┌─ Center Panel (split) ─────────────────────────────────────┐
│                                                            │
│  ┌─ Agent Session (60%) ────┐  ┌─ Evidence Viewer (40%) ┐ │
│  │                           │  │                        │ │
│  │  🤖 "搜索渠道下降 35%"    │  │  Provenance            │ │
│  │       [View Evidence] ←──┼──│  ┌──────────────────┐  │ │
│  │                           │  │  │ JD → CDP → RT    │  │ │
│  │                           │  │  └──────────────────┘  │ │
│  │                           │  │                        │ │
│  │                           │  │  Data Preview          │ │
│  │                           │  │  { visitors: 289 }     │ │
│  │                           │  │                        │ │
│  │                           │  │  [Close]               │ │
│  └───────────────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 9.3 Layout with Contract Explorer (replaces center)

When operator navigates to Contract Explorer:

```
┌─ Center Panel (full width) ────────────────────────────────┐
│                                                            │
│  ┌─ Contract Explorer ─────────────────────────────────┐   │
│  │                                                      │   │
│  │  [Domain Filter]  [Search]                           │   │
│  │                                                      │   │
│  │  ┌─ Capability Cards (grid) ─────────────────────┐   │   │
│  │  │  trade.overview  ·  traffic.overview  ·  ...  │   │   │
│  │  └───────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 10. NOT Included in This Design

Per the constraints stated:

| Category | Excluded | Reason |
|----------|----------|--------|
| CBP changes | ❌ | CBP is a separate system |
| Hermes Runtime extension | ❌ | Hermes provides execution; agentFabric provides business context |
| Execution implementation | ❌ | P0006.5.3 describes capability, doesn't execute |
| BI analytics platform | ❌ | Workspace is a decision OS, not a dashboard |
| New connector types | ❌ | P0006.5.3 works with existing connectors |
| Skill lifecycle management | ❌ | P0007 concern |
| Memory / Experience integration | ❌ | P0007 concern |
| Multi-platform contracts (Tmall, Amazon) | ❌ | Future — single platform first |
| Real-time streaming | ❌ | Current CDP is synchronous |
| Automated scheduling | ❌ | Manual Chrome + CLI for now |
| Code implementation | ❌ | Design only |

---

## 11. Acceptance Criteria (for when implementation begins)

- [ ] Contract Explorer renders all 11 capabilities from `capability-contract.json`
- [ ] Domain filter and search work via CapabilityRegistry
- [ ] "Ask Agent about this" navigates to Agent Session with capability pre-selected
- [ ] Evidence Viewer shows provenance chain: source → acquisition → processing
- [ ] Evidence Viewer displays raw data preview with canonical mapping
- [ ] Agent Session View accepts natural language prompts
- [ ] Agent responses include capability badges and evidence links
- [ ] Clicking [View Evidence] opens Evidence Viewer with correct context
- [ ] Decision Panel shows detailed trace for agent responses
- [ ] All three new views are navigable from the sidebar
- [ ] Existing views (Inbox, Product, Trend, Archive, Memory, Runtime) are preserved unchanged

---

## 12. File Inventory (for when implementation begins)

| File | Change | Purpose |
|------|--------|---------|
| `workspace/index.html` | ADD sections | Contract Explorer, Evidence Viewer, Agent Session views |
| `workspace/styles.css` | ADD styles | Capability cards, evidence provenance, session messages |
| `workspace/app.js` | ADD modules | ContractExplorer, EvidenceViewer, AgentSession controllers |
| `workspace/app.js` | MODIFY sidebar | Add CAPABILITY and AGENT sections |
| `platform/server/routes/runtime.ts` | ADD endpoint | `POST /api/runtime/chat` (Agent Session) |
| `platform/server/routes/runtime.ts` | ADD endpoint | `GET /api/evidence/:id` (Evidence detail) |
| `platform/server/routes/runtime.ts` | ADD endpoint | `GET /api/capabilities` (Contract read) |

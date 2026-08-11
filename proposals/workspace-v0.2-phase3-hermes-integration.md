# workspace-v0.2 Phase 3 — HermesAgent Runtime Integration

**Human → Agent → Capability → Acquisition → Evidence → Response**

**Status**: Proposal  
**Date**: 2026-08-11  
**Depends on**: Phase 2 Agent Cognitive Workspace, P0006.5.3 Capability Contract  
**Type**: Feature Proposal — not P-numbered (may be promoted when integration reaches architecture-level)

---

## 1. Objective

Phase 3 将 Workspace 从静态观察界面升级为 **Agent Runtime Observation Workspace**。

Phase 2 建立了 UI shell：Agent Session 展示了 event contract slot 但未连接运行时，Capability Explorer 展示了数据能力但 Agent 不会使用它们，Evidence Viewer 展示了溯源链但无人触发采集。

Phase 3 接通这条链路：

```
User types "分析流量下降原因"
    ↓
Agent Session → HermesAgent (计划)
    ↓
HermesAgent → CapabilityRegistry (选择能力)
    ↓
HermesAgent → Runtime Kernel (执行采集)
    ↓
Runtime Kernel → CDP → Evidence Store (证据)
    ↓
HermesAgent ← results (分析)
    ↓
Agent Session ← response + events (展示)
```

Phase 3 不是重新实现 HermesAgent。HermesAgent 已有的 planning/reasoning/tool-invocation 能力保留。Phase 3 做的是：**让 HermesAgent 知道 agentFabric 有什么能力，并能调用这些能力**。

---

## 2. Architecture

### 2.1 Integration Architecture

```
                        agentFabric
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   Workspace (人机交互)                                    │
│      │                                                   │
│      ├── Agent Session ──→ event stream                  │
│      │     (UI consumer)                                 │
│      │                                                   │
│      └── POST /api/runtime/chat                          │
│                │                                         │
│                ▼                                         │
│   ┌────────────────────────────┐                         │
│   │       HermesAgent           │                        │
│   │   (Agent Runtime — owns:    │                        │
│   │    planning, reasoning,     │                        │
│   │    capability selection,    │                        │
│   │    tool invocation)         │                        │
│   └──────┬─────────────────────┘                         │
│          │                                               │
│          │  searchByIntent("分析流量下降")                │
│          ▼                                               │
│   ┌────────────────────────────┐                         │
│   │   Capability Registry       │                        │
│   │   (capability-contract.json)│                        │
│   │                             │                        │
│   │   Returns: capability       │                        │
│   │   candidates, NOT data      │                        │
│   └────────────────────────────┘                         │
│          │                                               │
│          │  capability selected → execute                │
│          ▼                                               │
│   ┌────────────────────────────┐                         │
│   │   Runtime Kernel            │                        │
│   │   (Capability Execution     │                        │
│   │    Layer — shared across    │                        │
│   │    all agent runtimes)      │                        │
│   │                             │                        │
│   │   Acquisition → Parse →     │                        │
│   │   Normalize → Evidence      │                        │
│   └──────┬─────────────────────┘                         │
│          │                                               │
│          ▼                                               │
│   ┌────────────────────────────┐                         │
│   │   Evidence Store / Catalog  │                        │
│   │   (immutable, provenance-   │                        │
│   │    tracked data assets)     │                        │
│   └────────────────────────────┘                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Ownership — No Overlap

```
agentFabric owns:              HermesAgent owns:
├── Workspace                  ├── task planning
├── Capability Registry        ├── reasoning
├── Runtime Kernel             ├── capability selection
├── Evidence Store             ├── tool invocation
├── Catalog                    └── runtime loop
├── Acquisition capabilities
└── Domain knowledge / Skills
```

Runtime Kernel 不是 HermesAgent 的内部执行模块。它是 agentFabric 的 **Capability Execution Layer**——任何 Agent Runtime (Hermes, Claude Agent, OpenHands) 都可以共享。

---

## 3. Core Design — Four Key Decisions

### 3.1 HermesAgent 如何查询 CapabilityRegistry

**Design**: `searchByIntent()` — 返回 capability candidates，不返回数据，不执行采集。

```
Input: 自然语言 intent ("分析流量下降原因")
       ↓
CapabilityRegistry.searchByIntent(intent)
       ↓
Output: ranked CapabilityContractEntry[]
       [
         { capability: "traffic.overview", score: 38.0 },
         { capability: "trade.overview", score: 12.0 },
       ]
```

**Contract**:

```typescript
// CapabilityRegistry already implements this (P0006.5.3)
interface CapabilityRegistry {
  searchByIntent(query: string): ContractMatch[];
  // Returns: [{ entry: CapabilityContractEntry, score: number, matchReason: string }]
}

interface ContractMatch {
  entry: {
    capability: string;          // "traffic.overview"
    domain: string;              // "traffic"
    name: string;                // "流量分析"
    description: string;         // what this capability does
    intent: string[];            // what questions this answers
    outputs: string[];           // available metrics
    provider: { platform: string; acquisition: string };
    validation: { status: string; verified_metrics: string[] };
  };
  score: number;                 // relevance 0-N
  matchReason: string;           // why this matched
}
```

**HermesAgent's responsibility** after receiving candidates:
1. Select the best capability (or ask user to choose)
2. Verify capability is available (validation status)
3. Determine data requirements (date range, parameters)
4. Invoke Runtime Kernel with capability + parameters

### 3.2 Runtime Kernel as Capability Execution Layer

**Design**: Runtime Kernel 是 agentFabric 的公共执行层，不属于任何 Agent Runtime。

```
┌─────────────────────────────────────────┐
│          Runtime Kernel                  │
│                                          │
│  Input: capability + parameters          │
│    {                                     │
│      capability: "traffic.overview",     │
│      provider: { platform: "jd" },       │
│      parameters: {                       │
│        date_range: { from, to }          │
│      }                                   │
│    }                                     │
│                                          │
│  Execute:                                │
│    1. Resolve provider → connector       │
│    2. CDP acquisition (if live)          │
│    3. Parse JDR keys → canonical         │
│    4. Store evidence + metadata          │
│    5. Emit events during execution       │
│                                          │
│  Output:                                 │
│    {                                     │
│      taskId: "task_abc123",             │
│      evidence: EvidenceRecord[],         │
│      metrics: { gmv: 4634.40, ... },     │
│      events: ObservableEvent[]           │
│    }                                     │
└─────────────────────────────────────────┘
```

**Key property**: Runtime Kernel 不知道"谁在调用它"——HermesAgent、Claude Agent、CLI 都可以。它只接收 capability + parameters，返回 evidence + metrics。

**Existing infrastructure** (all from P0006.2 + P0006.5.3):
- `kernel.execute({ date, shopId })` — single-day execution
- `kernel.executeLiveCDP({ fromDate, toDate })` — multi-day live CDP
- Connector resolution via blueprint
- Evidence storage + metadata

**Phase 3 addition**: wrap the existing kernel in a capability-aware facade:
- Accept capability ID instead of raw parameters
- Emit standardized events during execution
- Return structured result with evidence references

### 3.3 Observable Event Model

**Design**: Agent Session UI 消费标准化事件流。事件是 Agent 外部可观察状态，不是内部思维过程。

```
Timeline:
  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ intent   │ → │ capability│ → │ execution│ → │ response │
  │ resolved │   │ selected │   │ lifecycle│   │ ready    │
  └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
              acquisition         evidence           execution
              .started            .created           .completed
```

**Event Types**:

| Event | Emitter | Content | UI Display |
|-------|---------|---------|------------|
| `intent.resolved` | HermesAgent | `{ intents: string[] }` | "Agent 理解了：分析流量变化" |
| `capability.selected` | HermesAgent | `{ capability: string, provider: string }` | Capability badge + provider |
| `execution.started` | Runtime Kernel | `{ taskId: string }` | Task ID in header |
| `acquisition.started` | Runtime Kernel | `{ taskId, method: "cdp", target: string }` | "采集开始：JD 商智 CDP" |
| `acquisition.progress` | Runtime Kernel | `{ taskId, completed: N, total: N }` | Progress bar (optional) |
| `evidence.created` | Runtime Kernel | `{ taskId, evidenceRef: string, metrics: {} }` | Evidence count updates |
| `execution.completed` | Runtime Kernel | `{ taskId, totalEvidence: N, totalMetrics: N }` | "完成：7 artifacts, 17 metrics" |
| `response.ready` | HermesAgent | `{ text: string, evidenceRefs: string[] }` | Agent response + evidence links |
| `error` | Any | `{ code: string, message: string }` | Error banner |

**What events are NOT**:
- ❌ `agent.thinking.*` — 不暴露内部推理
- ❌ `model.chain_of_thought` — 不暴露模型思维链
- ❌ `reasoning.step.*` — 不伪造推理步骤
- ❌ Any event not explicitly emitted by the system

### 3.4 POST /api/runtime/chat Contract

**Design**: Human → Agent Runtime Gateway。不是简单 Chat API——它是异步任务模型。

```
POST /api/runtime/chat

Request:
{
  sessionId: string,          // client-generated session ID
  message: string,            // user's natural language prompt
  context?: {
    capabilityId?: string,    // pre-select capability (from Contract Explorer)
    dateRange?: { from, to }, // override default date range
    shopId?: string            // override default shop
  }
}

Response (immediate):
{
  taskId: string,             // "task_a1b2c3d4"
  status: "accepted" | "rejected",
  acceptedIntent?: string[],  // if accepted: what was understood
  rejectionReason?: string    // if rejected: why
}

Event stream (SSE or polling):
GET /api/runtime/chat/{taskId}/events

Event format:
{
  taskId: string,
  event: "intent.resolved" | "capability.selected" | ...,
  timestamp: string,          // ISO 8601
  data: { ... }              // event-specific payload
}

Result (when execution.completed + response.ready):
GET /api/runtime/chat/{taskId}/result

{
  taskId: string,
  status: "completed" | "failed",
  capability: string,
  response: {
    text: string,
    evidenceRefs: string[],
    metrics: Record<string, number>
  },
  events: ObservableEvent[],
  duration: number           // total ms
}
```

**Why async task model, not simple request/response**:

1. CDP acquisition takes 10-30 seconds — too long for HTTP request/response
2. Agent Session needs intermediate state updates (acquisition progress, evidence count)
3. Multiple consumers may want to observe the same task (Workspace + CLI + future tools)
4. Task model enables replay, audit, and debugging

**Client usage pattern**:

```
1. POST /api/runtime/chat → get taskId
2. Open SSE to GET /api/runtime/chat/{taskId}/events
3. Render each event as it arrives in Agent Activity panel
4. When response.ready event arrives, fetch GET /api/runtime/chat/{taskId}/result
5. Display agent response with evidence links
```

---

## 4. Integration Flow — End to End

```
1. User types "分析流量下降原因" in Agent Session
       │
2. POST /api/runtime/chat { sessionId, message }
       │
3. HermesAgent receives request
       │
4. HermesAgent planning phase
   ├── Parse intent from message
   ├── Emit: intent.resolved { intents: ["分析流量变化", "解释访客下降"] }
   │
   ├── Query: CapabilityRegistry.searchByIntent(message)
   │   → traffic.overview (score: 38.0)
   │   → trade.overview (score: 12.0)
   │
   ├── Select: traffic.overview (best match, available via CDP)
   ├── Emit: capability.selected { capability: "traffic.overview", provider: "jd:cdp" }
   │
5. HermesAgent → Runtime Kernel
   ├── Emit: execution.started { taskId }
   │
   ├── Resolve: traffic.overview → JD connector → CDP acquisition
   ├── Emit: acquisition.started { method: "cdp", target: "jd traffic page" }
   │
   ├── CDP: connect → navigate → intercept APIs (7 endpoints)
   ├── Parse: JDR keys → canonical metrics (17 metrics)
   ├── Store: evidence files + metadata
   ├── Emit: evidence.created { evidenceRef, metrics }
   │
   ├── Emit: execution.completed { totalEvidence: 7, totalMetrics: 17 }
       │
6. HermesAgent analysis phase
   ├── Analyze signals: "visitors down 23%, search channel -35%"
   ├── Format response with evidence references
   ├── Emit: response.ready { text, evidenceRefs }
       │
7. Agent Session renders
   ├── Agent Activity panel: all events with timestamps
   ├── Agent response: text + capability badge + evidence links
   └── Evidence links → click opens Evidence Viewer
```

---

## 5. Boundary — Strict Phase 3 Scope

### Included

- `POST /api/runtime/chat` endpoint (task model, not simple chat)
- `GET /api/runtime/chat/{taskId}/events` (SSE event stream)
- `GET /api/runtime/chat/{taskId}/result` (task result)
- HermesAgent → CapabilityRegistry integration (searchByIntent call)
- HermesAgent → Runtime Kernel integration (capability → execution)
- Runtime Kernel event emission (observable event types)
- Agent Session UI: consume event stream, render events in Agent Activity panel
- Agent Session UI: render agent responses with capability badges + evidence links
- Agent Session UI: enable input (remove Phase 2 disabled state)
- At least ONE capability completes end-to-end (traffic.overview recommended)

### NOT Included

| Category | Excluded | Why |
|----------|----------|-----|
| HermesAgent internal implementation | ❌ | planning/reasoning owned by Hermes |
| Runtime Kernel reimplementation | ❌ | existing kernel is sufficient; we wrap it |
| Skill system | ❌ | P0007 concern |
| Memory system | ❌ | P0007 concern |
| Automated operational decisions | ❌ | Human-in-the-loop remains |
| MCP (Model Context Protocol) | ❌ | Future expansion |
| Multi-agent orchestration | ❌ | Single agent per session |
| Replacing existing agent framework | ❌ | HermesAgent is the runtime |
| POST /api/chat (legacy sync endpoint) | ❌ | Replace with task-based /api/runtime/chat |
| Multi-turn conversation memory | ❌ | Phase 3 = single-turn; multi-turn in future |
| Real-time WebSocket | ❌ | SSE is sufficient for Phase 3 |

---

## 6. Success Criteria

Phase 3 is complete when:

- [ ] HermesAgent can call `CapabilityRegistry.searchByIntent()` and receive capability candidates
- [ ] HermesAgent can select a capability and invoke Runtime Kernel with it
- [ ] Runtime Kernel emits standardized events during execution (acquisition.started → evidence.created → execution.completed)
- [ ] Agent Session UI consumes event stream and renders events in Agent Activity panel
- [ ] Agent Session UI renders agent response with capability badge and evidence links
- [ ] User can type a prompt, Agent processes it, response appears with evidence links
- [ ] Clicking evidence link opens Evidence Viewer with correct provenance chain
- [ ] At least one capability (traffic.overview) completes end-to-end: prompt → capability → acquisition → evidence → response
- [ ] Phase 2 views (Inbox, Product, Trend, Archive, Memory, Runtime, Config) remain unchanged and functional
- [ ] Tests pass for all existing functionality

---

## 7. Relationship to Other Proposals

| Proposal | Relationship |
|----------|-------------|
| `workspace-v0.2-phase2-ui-design.md` | Phase 2 built the UI shell. Phase 3 connects it to runtime. |
| `P0006.5.3-capability-contract` (code) | Phase 3 HermesAgent consumes the Contract via Registry. No Contract changes. |
| `P0006-hermes-agent-workspace-integration.md` | Original P0006 defined the vision. Phase 3 is the concrete implementation of that vision. |
| `P0006.2-historical-replay-runtime.md` | Runtime Kernel already exists. Phase 3 wraps it for Agent-driven execution. |
| `P0007.3-memory-retrieval.md` | Memory is P0007. Phase 3 does not touch it. |

---

*此 Proposal 使用 Feature Proposal 命名规则（`workspace-v0.2-phase3-*`）。如果 HermesAgent Runtime 集成日后证明是架构级决策，可升级为 P0006.3。*

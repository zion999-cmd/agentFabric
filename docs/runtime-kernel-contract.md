# Runtime Kernel Contract

**Version**: 1.0.0  
**Phase**: 3.1 — Contract Definition  
**Status**: Accepted

---

## 1. Purpose

Runtime Kernel Contract 定义了 Agent Runtime 与 agentFabric Runtime Kernel 之间的稳定协议。

```
Agent Runtime                   Runtime Kernel
(HermesAgent, Claude, ...)      (agentFabric execution layer)
     │                                │
     │  ExecutionRequest              │
     ├───────────────────────────────→│
     │                                │
     │  ExecutionEvent[] (SSE)        │
     │←───────────────────────────────┤
     │                                │
```

---

## 2. Responsibilities

### Runtime Kernel (agentFabric)

| Responsibility | Description |
|---------------|-------------|
| Capability resolution | Map capability ID → connector + acquisition method |
| Data acquisition | CDP interception, API calls, data capture |
| Parsing & normalization | JDR keys → canonical metrics |
| Evidence storage | Immutable file storage with provenance metadata |
| Event emission | Emit observable events during execution |

### Agent Runtime (HermesAgent, Claude Agent, future)

| Responsibility | Description |
|---------------|-------------|
| Intent understanding | Parse user prompt → intents |
| Capability selection | Query CapabilityRegistry, select best match |
| Task planning | Determine date range, parameters |
| Result analysis | Analyze signals, format response |
| Response generation | Produce human-readable response with evidence links |

### NOT in Scope

| Category | Owner |
|----------|-------|
| CDP/Playwright implementation | Runtime Kernel |
| JDR key parsing | Runtime Kernel |
| Model reasoning | Agent Runtime |
| Chain-of-thought | Agent Runtime |
| UI rendering | Workspace |

---

## 3. ExecutionRequest

### Schema

```typescript
{
  taskId: string,          // Client-generated unique ID
  capability: string,      // CapabilityContractEntry.capability
  inputs: {
    dateRange?: { from: IsoDateString, to: IsoDateString },
    shopId?: string,
    dimensions?: string[]
  },
  context?: {              // Metadata only — not used for execution logic
    sessionId?: string,
    userPrompt?: string,
    platform?: string
  }
}
```

### Validation Rules

1. `taskId` must be non-empty
2. `capability` must match a valid CapabilityContractEntry.capability
3. `inputs.dateRange.from` must be a valid ISO date
4. `inputs.dateRange.to` must be a valid ISO date
5. `context` is optional — execution must work without it

### What It Does NOT Contain

- ❌ Agent reasoning steps
- ❌ Internal plan structure
- ❌ Connector/endpoint details
- ❌ CDP port or URL
- ❌ Model prompt or tokens
- ❌ Skill definitions

---

## 4. ExecutionEvent

### Event Types (7)

| Event | Emitter | Meaning |
|-------|---------|---------|
| `execution.started` | Runtime Kernel | Kernel accepted the task; capability + provider info |
| `acquisition.started` | Runtime Kernel | Data acquisition beginning (method, platform, page) |
| `acquisition.progress` | Runtime Kernel | Optional incremental progress (N of M endpoints) |
| `acquisition.completed` | Runtime Kernel | All data captured (endpoint count, duration) |
| `evidence.created` | Runtime Kernel | One evidence file written (type, metrics count) |
| `execution.completed` | Runtime Kernel | Task done (total evidence, total metrics, duration) |
| `execution.failed` | Runtime Kernel | Unrecoverable error (code, message, recoverable flag) |

### Event Order

```
execution.started
    │
    ├──→ acquisition.started
    │        │
    │        ├──→ evidence.created ──┐
    │        ├──→ evidence.created   │ (one per evidence file)
    │        └──→ evidence.created ──┘
    │        │
    │        └──→ acquisition.completed
    │
    └──→ execution.completed
    │
    OR
    └──→ execution.failed
```

### What Events Describe

- ✅ Execution lifecycle state
- ✅ Acquisition progress
- ✅ Evidence artifacts created
- ✅ Success/failure outcomes

### What Events Do NOT Describe

- ❌ Agent thinking process
- ❌ Model chain-of-thought
- ❌ Reasoning steps
- ❌ Internal planning decisions
- ❌ Capability selection rationale
- ❌ Prompt engineering details

---

## 5. Relationship to Capability Contract

```
Capability Contract                  Execution Contract
(P0006.5.3)                          (Phase 3.1)

Defines WHAT capabilities exist      Defines HOW to request execution
    │                                      │
    │  capability: "traffic.overview"       │  capability: "traffic.overview"
    │  outputs: [gmv, orders, ...]          │  inputs: { dateRange }
    │  provider: { platform: jd }           │  context: { userPrompt }
    │                                      │
    ▼                                      ▼
Agent selects capability              Agent sends ExecutionRequest
    │                                      │
    └──────────────┬───────────────────────┘
                   ▼
            Runtime Kernel
            (resolves capability → connector → CDP)
```

---

## 6. Event Consumption (Phase 3.3+)

Events are consumed via SSE:

```
GET /api/runtime/chat/{taskId}/events

→ event: execution.started
→ event: acquisition.started
→ event: evidence.created
→ event: acquisition.completed
→ event: execution.completed

Each event is a JSON line:
{ "type": "execution.started", "taskId": "...", "timestamp": "...", "data": {...} }
```

The Workspace Agent Session UI subscribes to this stream and renders events in the Agent Activity panel.

---

## 7. Extensibility

The contract is designed to be extended, not broken:

- **New event types**: Add to `ExecutionEventTypeSchema` + discriminated union
- **New request fields**: Add to `ExecutionRequestSchema` — backward compatible if optional
- **New Agent Runtimes**: No schema changes needed — contract is Agent-agnostic

Breaking changes require a contract version bump and migration plan.

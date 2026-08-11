# Phase 3.2 — Hermes Capability Discovery Design

**Date**: 2026-08-11  
**Status**: Design + Implementation  

---

## 1. Exploration — HermesAgent 当前在 agentFabric 中的位置

### 1.1 架构位置

```
agentFabric
├── platform/runtime/hermes/        ← HermesAgent 的 thin client layer
│   ├── types.ts                    HermesClient interface + request/result types
│   ├── subprocess-client.ts        hermes -z "prompt" via child_process
│   ├── stub-client.ts              test stub (no binary needed)
│   ├── adapter.ts                  HermesRuntimeAdapter (wraps HermesClient)
│   ├── index.ts                    factory: createHermesClient()
│   └── capability-bridge.ts        ← NEW Phase 3.2
│
├── apps/ecommerce/skills/          ← Business skill definitions
│   ├── definitions.ts              SKILL_CATALOG (5 skills + discover_capability)
│   └── registry.ts                 Intent matching + handler dispatch
│
└── apps/ecommerce/connectors/capability/  ← Capability layer
    ├── contract-types.ts           CapabilityContractEntry schema
    ├── contract-registry.ts        CapabilityRegistry (searchByIntent, etc.)
    └── contract-generator.ts       Generates capability-contract.json
```

### 1.2 HermesAgent 是独立 Runtime，不是 ecommerce 内部模块

```typescript
// types.ts — HermesClient is a replaceable seam
export interface HermesClient {
  oneShot(req: HermesOneShotRequest): Promise<HermesOneShotResult>;
  isAvailable(): boolean;
}
```

- HermesAgent 作为独立进程运行（`hermes -z "prompt"`）
- agentFabric 通过 `HermesClient` interface 与之通信
- `HermesRuntimeAdapter` 将其包装为 RuntimeAdapter
- 可替换：`createHermesClient()` 根据 env 选择 subprocess 或 stub

### 1.3 当前 Adapter 能力

```typescript
// adapter.ts — HermesRuntimeAdapter
supported_actions: ['summarize_top_ranking']
```

目前只支持一个 action。Phase 3.2 不需要修改此 adapter。

---

## 2. CapabilityRegistry 当前能力

### 2.1 Interface

```typescript
interface CapabilityRegistry {
  searchByIntent(query: string): ContractMatch[];     // ranked by relevance
  findByDomain(domain: string): CapabilityContractEntry[];
  findByMetric(canonical: string): CapabilityContractEntry[];
  getById(capability: string): CapabilityContractEntry | null;
  getSummary(): { total_capabilities, domains, platforms };
  describe(capability: string): string | null;        // LLM context injection
}
```

### 2.2 数据来源

```
generated/capability-contract.json  (11 capabilities, 48 metrics, 8 domains)
    │
    ▼ loadContract()
CapabilityRegistry (in-memory, 3 indexes)
    │
    ▼ searchByIntent("分析流量下降原因")
[{ entry: traffic.overview, score: 38.0 }, ...]
```

---

## 3. Phase 3.2 设计 — CapabilityBridge

### 3.1 Bridge 定位

```
HermesAgent                    agentFabric
┌──────────────┐              ┌─────────────────────┐
│  planning    │              │ CapabilityBridge     │
│     │        │   intent     │     │                │
│     ├────────┼──────────────┼─→ searchByIntent()  │
│     │        │              │     │                │
│     │        │  candidates  │     ▼                │
│     │←───────┼──────────────┼─ CapabilityRegistry  │
│     │        │              │     │                │
│  capability  │              │  capability-contract │
│  selection   │              │  .json (read-only)   │
└──────────────┘              └─────────────────────┘
```

### 3.2 Bridge Interface

```typescript
interface CapabilityBridge {
  searchByIntent(intent: string): CapabilityDiscoveryResult;
  getById(capabilityId: string): ContractMatch['entry'] | null;
  findByDomain(domain: string): ContractMatch['entry'][];
  getSummary(): { totalCapabilities, domains, platforms };
}
```

### 3.3 Intent → Capability 数据流

```
User: "分析最近30天流量变化"
    │
    ▼
HermesAgent receives prompt
    │
    ├── 1. HermesAgent calls bridge.searchByIntent("分析最近30天流量变化")
    │      │
    │      ▼
    │   CapabilityRegistry.searchByIntent("分析最近30天流量变化")
    │      │
    │      ├── Tokenize: ["分析最近30天流量变化"] → bigrams
    │      ├── Match: traffic.overview (score: 38.0)
    │      │         trade.overview (score: 15.0)
    │      │         product.overview (score: 12.0)
    │      └── Return: ranked candidates (top 5)
    │
    ├── 2. HermesAgent selects best match: traffic.overview
    │      (selection logic owned by HermesAgent, not by bridge)
    │
    └── 3. HermesAgent constructs ExecutionRequest
           { capability: "traffic.overview", inputs: { dateRange: ... } }
           (sends to Runtime Kernel — Phase 3.3+, NOT Phase 3.2)
```

### 3.4 Intent Matching Boundary

| Layer | Responsibility | Phase |
|-------|---------------|-------|
| CapabilityRegistry | Token matching, scoring, ranking | P0006.5.3 ✅ |
| CapabilityBridge | Thin wrapper, field normalization | Phase 3.2 ✅ |
| HermesAgent | Capability selection from candidates | Phase 3.2 Hermes side |
| HermesAgent | ExecutionRequest construction | Phase 3.3 |
| Runtime Kernel | Execution + event emission | Phase 3.3+ |

---

## 4. Skill Registration

`discover_capability` skill 已注册到 SKILL_CATALOG:

```typescript
{
  name: 'discover_capability',
  handler: 'bridge.discover',
  handlerType: 'facade',
  intentPatterns: [
    '能获取什么数据', '有什么数据', '数据能力',
    '能分析流量吗', '能查商品吗', ...
  ],
}
```

这使得现有的 ChatRouter（`apps/ecommerce/skills/registry.ts`）可以通过 pattern matching 将 "有什么数据能力" 这类问题路由到 CapabilityBridge。

---

## 5. Tests

13 contract tests, all pass:

| Test Group | Tests | Status |
|-----------|-------|--------|
| searchByIntent — Chinese intent matching | 5 | ✅ |
| getById — specific capability lookup | 3 | ✅ |
| findByDomain — domain filtering | 2 | ✅ |
| getSummary — metadata | 1 | ✅ |
| Contract integration — field validation | 2 | ✅ |

---

## 6. NOT Included

| Category | Status |
|----------|--------|
| Runtime Kernel execution | ❌ Phase 3.3 |
| CDP / JD data acquisition | ❌ Phase 3.3+ |
| POST /api/runtime/chat | ❌ Phase 3.3 |
| Agent Session UI changes | ❌ Phase 3.3 |
| HermesAgent internal modifications | ❌ Hermes-owned |
| Skill system expansion beyond registration | ❌ P0007 |

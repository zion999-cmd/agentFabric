# P0008: World Abstraction Infrastructure

**Status**: Proposed
**Date**: 2026-08-13
**Depends on**: Existing Capability Discovery / Evidence infrastructure
**Parallel relationship**: P0007 Learning Infrastructure

## Objective

建立 agentFabric 缺失的 **World Abstraction Infrastructure**：让上游 Runtime 在进入一个垂直业务领域时，不是一个对该世界一无所知的 Blank Agent。

agentFabric 不实现通用 Discovery Engine，也不负责理解业务规律。外部 Agent（Hermes / Claude / Codex / Future Runtime）利用 Browser、CDP、API、MCP、DB 等能力自主探索陌生系统；agentFabric 定义探索成果如何被验证、沉淀、查询，并最终形成 Runtime-neutral 的 **Domain/System World Model**。

第一阶段使用已有京东商智资产验证该架构：旧 `discovery/`、`data/jd_shangzhi_features/` 与 Hermes 新生成的 `WorldExplorationTask/`。

最终目标是：

> **agentFabric 给 Agent 的不是一堆数据，而是一个可以理解、查询并继续观察的世界。**

---

## Background

现有 agentFabric 已经具备两类重要基础能力：

```text
Capability
“我能怎么观察/操作？”

Evidence / Situation / Learning Context
“世界发生了什么？”
```

但中间缺失了一层：

```text
“这个世界本身有什么？”
```

历史 AgentCMS 实际已经无意中探索过这个问题。

京东商智探索形成了三类资产：

```text
discovery/
    ↓
探索方法、Capability Discovery、
Business Context 等早期设计

data/jd_shangzhi_features/
    ↓
Claude 探索 JD 后形成的
页面 / 功能 / 指标 / 导航 / 结构资产

WorldExplorationTask/
    ↓
Hermes Zero-shot World Exploration
形成的新 Discovery Artifact
```

Hermes 实验进一步证明：

> 不预先提供 World Model Schema，上游 Agent 也能自主发现 System、Surface、Entity、Metric、Dimension、Granularity、Constraint、Evidence 等世界结构。

同时实验暴露出一个重要 Gap：

> Agent 很容易从“观察到”继续走向“推测到”。

因此 agentFabric 的职责不是替 Agent 探索，而是建立 **Discovery → Evidence → Verified World Model** 的基础设施。

---

## Architecture

```text
                   REAL WORLD

       JD / 千牛 / ERP / CMS / MES / ...
                        │
                        ▼
               World Access Layer
        Browser / CDP / API / MCP / DB
                        │
                        ▼
════════════════ Runtime / Agent Boundary ════════════════
                        │
                 Explorer Agent
        Hermes / Claude / Codex / Future
                        │
                 autonomous exploration
                        │
                        ▼
               Discovery Artifacts
                        │
══════════════════ agentFabric ═══════════════════════════
                        │
              World Abstraction Layer
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     Validate        Normalize        Provenance
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                   World Model
               ┌────────┴────────┐
               │                 │
          Domain Model       System Model
          Ecommerce         JD Shangzhi
               │                 │
               └────────┬────────┘
                        │
                 Capability Binding
                        │
                        ▼
                 World Query Layer
                        │
                        ▼
               Bootstrap Context
                        │
════════════════ Runtime Boundary ════════════════════════
                        │
            Hermes / Codex / Claude / ...
                        │
              Situation / Experience
                        │
                Learning Context
                        │
            Runtime Memory / Skill
```

---

# Design

## 1. 两条成长链严格分离

这是本 Proposal 最重要的架构边界之一。

### World Growth

```text
Unknown System
    ↓
Agent Exploration
    ↓
Discovery Artifact
    ↓
Validation
    ↓
World Model
    ↓
Better Bootstrap
```

回答：

> **这个世界是什么？**

### Agent Growth

```text
Situation
    ↓
Experience
    ↓
Learning Context
    ↓
Reflection
    ↓
Memory
    ↓
Skill
```

回答：

> **我怎样在这个世界里把事情做好？**

World Model 可以跨 Runtime 共享。

Runtime Memory / Skill 不属于 World Model。

---

# 2. Explorer 属于 Runtime，不属于 Fabric

agentFabric **不实现固定探索算法**。

例如京东商智：

```text
Hermes
  ↓
观察导航
  ↓
选择页面
  ↓
检查 DOM
  ↓
观察 Network
  ↓
尝试筛选条件
  ↓
理解 Response
  ↓
继续下钻
```

“下一步探索哪里”依赖 Agent cognition。

因此：

```text
agentFabric owns:
    Discovery Contract
    World Model Contract
    Evidence / Provenance
    Validation
    Registry
    Query
    Capability Binding
    Bootstrap

Runtime owns:
    Exploration Strategy
    Tool Selection
    Reasoning
    Hypothesis
    Exploration Loop
```

Playwright、CDP、crawl4ai 等只是 World Access Tool，不进入 World Model 核心语义。

---

# 3. Discovery Artifact ≠ World Model

Explorer Agent 可以自由组织自己的探索过程和临时产物。

例如：

```text
screenshots
DOM snapshot
network response
markdown notes
JSON
page map
API candidates
unknown list
```

这些都是：

> **Discovery Artifact**

不能直接视为 World Fact。

必须经过：

```text
Discovery Artifact
        ↓
   extraction
        ↓
Candidate Fact
        ↓
Evidence validation
        ↓
Published World Model
```

因此保留 Explorer 的自由，同时避免让 Agent 的推测污染共享知识。

---

# 4. World Model 最小 Primitive

P0008.1 不追求完整 Ontology。

考古结论（`P0008.1-world-model-gap-map.md`）：真正发现的不是"7 个节点类型"，而是：

> **少量 World Objects + 一个有证据、有认知状态的 Assertion Graph。**

### World Primitive（Object 类型，6 个）

```text
System
Surface
Feature / Affordance
Metric
Dimension
Constraint
```

**关键命名修正**：`Feature / Affordance`（系统自己提供什么，如"实时榜单"）必须与 agentFabric 的 `Capability`（traffic.overview，怎样实际观察）严格区分。二者不是同一个东西，否则 World Registry 与 Capability Registry 会被揉在一起。

### World Assertion（Graph edge，带 epistemic status）

真正的认知状态挂在 Assertion 上，不是对象 metadata 上：

```text
subject → predicate → object/reference
  + epistemicStatus (suspected / observed / verified)
  + evidenceRefs
  + discoveredAt
  + source
```

示例：

```text
JD Shangzhi          has_surface      Realtime Overview       [verified]
Realtime Overview    exposes_metric   Transaction Amount      [verified]
Transaction Amount   observable_by    /szgateway/xxx          [suspected]
```

`Relationship` 由 `World Assertion` 承担，不单独做对象类型。

### External Binding（World → Capability）

```text
World Assertion / Surface / Metric
        ↓
CapabilityBinding
        ↓
CapabilityRegistry
```

### 延后（无真实证据）

```text
Entity registry（三方都只隐式出现，从未一等建模）
Concept 独立节点（discovery 的 Business Context 太松散）
```

P0008.1 只做 `Capability ↔ Surface binding`；`Capability ↔ Entity binding` 延后。

这些 Primitive 必须通过真实 JD Artifact 验证，而不是为了 Schema 完整性继续扩张。

---

# 5. Domain Model 与 System Model 分离

这是跨平台抽象的关键。

### Domain Model

描述业务世界本身：

```text
Ecommerce
├── Product
├── SKU
├── Shop
├── Traffic
├── Transaction
├── Customer
├── Inventory
├── Content
├── Promotion
└── Advertising
```

### System Model

描述某个具体系统如何呈现这个世界：

```text
JD Shangzhi
├── Surface
├── Metric
├── Dimension
├── Constraint
└── Capability
```

未来：

```text
Qianniu
ERP
CMS
...
```

通过 Mapping：

```text
JD 成交金额 ──────┐
                  ├──→ Transaction.GMV
千牛支付金额 ─────┘


JD SKU ID ────────┐
ERP SKU Code ─────┼──→ Ecommerce.SKU
CMS Product ID ───┘
```

第一阶段只验证 JD。

**不得为了未来系统提前设计复杂跨平台 Ontology。**

---

# 6. Knowledge 必须能够导向 Observation

World Model 与普通 RAG/知识库最大的区别：

> Agent 知道一个概念之后，应当能够进一步知道“怎样去观察它”。

因此：

```text
Concept
    ↓
Metric
    ↓
Surface
    ↓
Capability
    ↓
Evidence
```

例如：

```text
Agent:
“我要调查商品 Traffic。”

        ↓

World Query

        ↓

Product
 └─ Traffic
     ├─ available metrics
     ├─ JD surfaces
     ├─ supported dimensions
     └─ observable capabilities

        ↓

Capability Discovery

        ↓

real observation

        ↓

Evidence
```

如果 World Model 只能回答：

> “京东有一个实时关键词功能。”

却无法导向实际观察路径，那么 P0008 尚未完成。

---

# 7. Fact Epistemic Status

Hermes 实验已经证明必须区分：

```text
suspected
    ↓
observed
    ↓
verified
```

建议 Contract 至少表达这种语义，不要求当前立即固定字段名。

### suspected

Agent 根据 URL、页面名称、代码或模式推测。

不能作为稳定 World Fact。

### observed

真实观察到了页面、字段、API Response 或其他 Evidence。

### verified

经过足够 Evidence 验证，可作为 Published World Model 使用。

核心原则：

> **Unknown ≠ Absent。**

没有发现某能力只能表示：

```text
unknown / undiscovered
```

不能自动推断：

```text
does_not_exist
```

这一原则继承旧 JD Capability Discovery 的正确设计。

---

# 8. Provenance 必须是一等能力

World Fact 必须能够回答：

```text
“你怎么知道？”
```

例如：

```text
World Fact
Metric: transaction_amount
       │
       ├─ discoveredBy: explorer session
       ├─ sourceSystem: jd_shangzhi
       ├─ sourceSurface: ...
       ├─ evidenceIds[]
       └─ observedAt
```

Evidence 可以来自：

```text
Screenshot
DOM
Network Request
Network Response
API Schema
Official Documentation
DB Schema
MCP Description
...
```

不同来源可以具有不同证据等级，但 P0008.1 不建设复杂评分系统。

---

# 9. World Model 与 Platform Guidance 分离

JD 文档可能同时包含：

```text
“这里存在什么指标”
```

以及：

```text
“运营人员应该如何使用这个指标”
```

必须分离。

### World Fact

```text
这个指标存在
定义是什么
在哪里
时间粒度
支持哪些 Dimension
如何获取
```

### Platform Guidance

```text
JD 官方建议某场景这样使用
```

可以保存，但必须带明确 provenance：

```text
source = JD documentation
type = platform_guidance
```

### Learned Expertise

例如：

```text
CTR 出现某种变化时应该换主图
```

**禁止进入 World Model。**

它属于：

```text
Experience
→ Learning Context
→ Runtime
→ Memory / Skill
```

---

# 10. Bootstrap Context

不能把整个 World Model 塞进 Runtime Prompt。

Bootstrap 应采用：

> **Map + Query Interface**

初始 Agent 至少知道：

```text
Domain
Connected Systems
Core Entities
Core Concepts
Available Capabilities
Current Situation
World Query Interface
```

例如：

```text
You are entering:

Domain:
  Ecommerce

Connected Systems:
  JD Shangzhi

Observable areas:
  Traffic
  Transaction
  Product
  Competition
  ...

Current Situation:
  ...

Available:
  World Query
  Capability Discovery
```

当 Runtime 需要调查 Traffic 时：

```text
Runtime
   ↓
World Query("Product Traffic")
   ↓
相关 World Model subset
   ↓
Surface / Metric / Dimension / Capability
```

这样 World Model 可以持续增长，而不会导致 Bootstrap Context 无限膨胀。

---

# 11. 与 P0007 的关系

P0008：

> **世界是什么？**

P0007：

> **世界发生了什么？**

因此：

```text
World Model
    │
    ├──────────────┐
    ↓              ↓
Observation    Agent Bootstrap
    ↓
Situation
    ↓
Conversation
    ↓
Outcome
    ↓
Learning Context
    ↓
Runtime Growth
```

P0008 不修改 P0007 Learning Context ownership。

但未来 Learning Context 可以引用 World Model 中稳定的 Entity / Concept / Metric identity。

---

# 12. Proposed Phases

## P0008.1 — World Model Contract + JD Validation

从三组已有资产反推 Contract：

```text
discovery/
data/jd_shangzhi_features/
WorldExplorationTask/
```

建立最小 World Model。

不新增探索。

---

## P0008.2 — World Query + Capability Binding

实现：

```text
World Knowledge
      ↓
Capability
      ↓
Observation
      ↓
Evidence
```

证明 Knowledge 可以转化成实际观察能力。

---

## P0008.3 — Bootstrap Context

定义 Runtime-neutral Bootstrap Context。

不定义 Hermes Soul。

不定义 JD Expert Prompt。

---

## P0008.4 — Blank Runtime E2E

启动没有：

```text
JD Skill
JD Memory
JD Soul
```

的 Runtime。

仅提供：

```text
Bootstrap Context
World Query
Capability Registry
```

验证它能否自主调查一个真实 JD Situation。

---

## P0008.5 — Explorer Artifact Protocol

基于 Claude 历史探索 + Hermes 实验，正式定义：

> Explorer 完成一次 World Discovery 后应该向 Fabric 交付什么。

仍然**不实现 Discovery Engine**。

---

## P0008.6 — Second-System Validation

选择一个真实第二系统：

```text
千牛
OR
真实 CMS
OR
真实 ERP
```

验证核心 World Model Contract 是否无需重构即可接入。

这是 P0008 最终证明“Fabric”而不是“JD Adapter”的关键阶段。

---

# Boundaries

## Included

* World Model Contract
* Domain/System Model 分层
* Discovery Artifact → Candidate World Model
* Fact epistemic status
* Evidence / Provenance binding
* World Model Registry
* World Query
* Capability Binding
* Bootstrap Context
* JD concrete validation
* Blank Runtime validation
* 第二系统架构验证

## NOT Included — CRITICAL

* **不开发通用自动 Discovery Engine**
* **不实现网站自动遍历算法**
* **不规定 Explorer 必须使用 Playwright/CDP/crawl4ai**
* **不把 Claude/Hermes 的推测直接写成 World Fact**
* **不建设 Graph Database**
* **不建设 Vector DB / 通用 RAG 平台**
* **不建设 Ontology Editor**
* **不建设知识管理后台**
* **不提前支持千牛/ERP/CMS**
* **不编写京东运营知识**
* **不从数据相关性生成业务规律**
* **不生成 Runtime Memory**
* **不生成 Runtime Skill**
* **不定义 Hermes Soul**
* **不定义 Hermes 专属 Contract**
* **不修改 P0007 Learning Context 核心职责**
* **不重构现有 Capability Discovery，除非 P0008.2 证明 Contract 无法绑定**
* **不把 `jd_shangzhi_features` 直接改名后冒充 World Model**
* **不要求 Explorer 按固定 World Model Schema 进行探索**
* **不为未来所有行业设计“大一统 Ontology”**

---

# Directory Structure

架构级建议，具体路径在 P0008.1 结合现有仓库确定：

```text
world/
├── contracts/
│   └── world-model
│
├── domains/
│   └── ecommerce
│
├── systems/
│   └── jd-shangzhi
│
├── mappings/
│
└── bootstrap/

discovery/
    # 保留 Explorer / discovery artifacts

data/jd_shangzhi_features/
    # 保留历史 source material

WorldExplorationTask/
    # 保留 Hermes 实验 artifact
```

**P0008.1 不移动或删除三个现有历史目录。**

---

# Success Criteria

1. 能从现有 JD 三组资产构建一个最小、机器可查询的 JD System World Model。

2. World Model 中的事实能够追溯到真实 Discovery Artifact / Evidence，而不是 LLM 无来源生成。

3. 系统能够区分 `unknown / suspected / observed / verified` 等不同知识状态，不把“未发现”等价为“不存在”。

4. Agent 查询一个业务 Concept 时，可以从 World Model 找到相关 Entity、Metric、Dimension、Surface 和 Constraint。

5. 至少一条 JD World Knowledge 可以继续绑定到现有 Capability，并取得真实 Evidence：

```text
World Knowledge
→ Capability
→ Observation
→ Evidence
```

6. 一个没有 JD Memory、Skill、Soul 的 Blank Runtime，只获得 Bootstrap Context + World Query + Capability 后，能够正确描述 JD 世界的主要结构。

7. 同一 Blank Runtime 面对真实 JD Situation，能够自主选择至少一个合理的下一步 Observation，而无需人工告诉它具体 JD 页面/API。

8. Runtime 可以明确区分：

   * World Fact
   * Platform Guidance
   * Current Observation
   * Runtime Learned Expertise

9. P0008.1–8.5 完成过程中不实现任何 JD 运营策略或 Runtime Skill。

10. 第二个真实业务系统接入时，如果必须重写 World Model 核心 Contract，则 **P0008.6 判定失败**；允许新增 Domain/System-specific primitives 或 mappings，但不得把核心 Contract 退化为平台专用 Schema。

---


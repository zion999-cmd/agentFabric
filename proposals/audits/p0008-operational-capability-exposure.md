# P0008 Operational Capability Exposure Audit

**Date**: 2026-08-14
**Type**: Audit only — no implementation
**Inputs**: repo HEAD `2d16bb1`, committed tests, P0008.3/8.4/8.5 proposals + E2E evidence

---

## 0. 目的与方法

回答一个问题：**P0008.3–P0008.5 实现/验证出来的东西，在正式 agentFabric 服务启动后，一个新的 Blank Runtime 是否知道它们存在、知道何时用、知道怎么用？**

方法：从**实际 repo HEAD 的代码接线**出发（不看 Proposal 声称，只看代码），判定每一项的 Runtime Discoverable 路径。**不因"有测试"标记 discoverable，不因"有代码"就认为 Agent 知道它存在。**

---

## 1. 生产现实（HEAD 接线，非 Proposal 声称）

`platform/server/index.ts` 挂载两条 Runtime 路径：

### 路径 A — P0008.3 Situation Chat（`/api/situation/:id/chat`）

`createServer` 在构造时执行 `situationChatRouter`，其 `ensureWorkspace(dir)` **每次服务启动**都：

1. `writeProjection(JD_FIXTURE, data/fabric-workspace)`：
   - `rmSync(targetDir, recursive)` **清空整个 workspace**
   - 写入 `README.md` + `world/jd_shangzhi/{system,surfaces,features,metrics,dimensions,constraints,assertions}.md` + `capability/bindings.md`
2. `initSharedKnowledgeLayer(data/fabric-workspace)`：
   - 写入 `AGENTS.md`（来自 `contract.ts` 的 `AGENTS_CONTRACT` 字符串）
   - 写入 `knowledge-sources/raw/*`、`knowledge/{KNOWLEDGE,INDEX,log}.md`、`knowledge/platform/京东内容化推广.md`

首条 chat 消息触发 `session.create(cwd=workspace, profile=default)` → 持久 Hermes session 靠 filesystem discovery。

### 路径 B — Legacy `/api/chat`（Phase 3）

`chat.ts` 用 `createCapabilityBridge()`（读 `generated/capability-contract.json`，11 capabilities）+ `hermes -z` one-shot subprocess。**与路径 A 完全断开**。

### 关键代码事实（本 Audit 的证据基础）

| 事实 | 证据 | 影响 |
|------|------|------|
| workspace 是 **minimal fixture**（9 objects / 6 assertions / 1 binding） | `jd-fixture.ts` | P0008.5 测试用的丰富 world（星级 4.6 等）根本不在生产 fixture 里 |
| **无 `world/INDEX.md` 生成** | `projector.ts` 只写 per-primitive 文件 | world 无导航入口（P0008.5 已证其后果） |
| **无 `contracts/WORLD_MODEL.md` 写入** | 全 repo 只有 `contract.ts:83` 引用它，无人写它 | AGENTS.md 的 "World Model Construction" 指针是 dangling |
| **命名不一致焊死在代码里** | `AGENTS_CONTRACT` 写 `capabilities/`、`world/`；projector 写 `capability/` | P0008.5 的 `systems/` 改名**未进生产代码** |
| **CapabilityRegistry 只在 legacy chat.ts 用** | `chat.ts:232` 是唯一生产调用点 | 路径 A 的 runtime 看不到 11 capabilities |
| **`writeProjection` 每次启动 `rmSync` 清空** | `fabric-workspace/index.ts:22` | Agent 编译进 `knowledge/` 的内容**重启即丢**（见 §5-A） |

---

## 2. 逐项检查（9 项）

### 2.1 Hermes persistent session / Situation Chat

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| 持久 Hermes session + Situation Chat bridge | Fabric（bridge）+ Hermes（session 实现） | ✅ `session-client.ts` + `situation-chat.ts` | ✅ contract test（MockClient 验证 session 复用/隔离）+ unit test（mock WS）。**非真实 Hermes E2E**（真实 E2E 是手动的，见 P0008.3 evidence） | `POST /api/situation/:id/chat`（已 mount） | **YES** | HTTP route，UI 调用即创建 session，cwd=workspace | 无（机制已产品化）。但 session **内**的 runtime 是否发现 workspace 是下一项 |

### 2.2 Fabric Agent Workspace

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| 干净 workspace 投影 | Fabric | ✅ projector + initSharedKnowledgeLayer | ✅ unit（projector deterministic / shared-knowledge 结构） | 服务启动时 `ensureWorkspace` 生成到 `data/fabric-workspace` | **YES（但内容有 gap）** | session cwd = workspace，Hermes 原生读文件 | world 无 INDEX、AGENTS.md 有 dangling 指针 + 命名不一致、world 是 minimal fixture |

### 2.3 System Context Construction（World → structured world/）

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| 从 Exploration Artifact 构建 world/ | **Fabric Procedure**（但生产由 code 做） | ⚠️ **code 做**（projector），Agent 侧 procedure 未实现 | ⚠️ P0008.5 Phase B 是**手动测试**（Preparation Agent + test prompt）；无 committed 自动化测试 | **无 Agent-facing 入口**——projector 从 JD_FIXTURE 生成，Agent 从不被要求构建 world/ | **NO** | AGENTS.md 提 "When constructing world/… read contracts/WORLD_MODEL.md"，但该文件不存在，且生产由 projector 代劳 | **Procedure 完全缺失 Runtime-facing exposure**：agent 不知道该 procedure 存在、该何时触发；且 AGENTS.md 的声明指向 dangling 文件 |

### 2.4 Shared Knowledge Ingestion（raw → knowledge/）

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| raw source → semantic compilation → knowledge/ | **Fabric Procedure**（Agent 执行，无 compiler） | ⚠️ **声明式**：governance + 结构 + raw seed 存在，编译由 Agent reasoning + file tools 完成 | ✅ P0008.5 Phase C/D（手动）+ unit（结构） | AGENTS.md → `knowledge/KNOWLEDGE.md`（Ingest 操作） | **YES（Declarative）** | AGENTS.md "读 KNOWLEDGE.md" 指针（这条链 P0008.5 已验证有效） | 无独立 procedure registry——ingest 只是 KNOWLEDGE.md 里的一段操作描述，靠 Agent 读 AGENTS.md 才被发现 |

### 2.5 System Context Consumption（从 world/ 回答）

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| 用 world/ 回答外部系统事实问题 | Runtime（Agent）+ Fabric（world 内容） | ✅ world/*.md 存在（minimal） | ❌ P0008.5 known-fact **0/3 失败**（systems/ 改名后 1/3） | world/*.md 文件 | **NO** | 无 routing 指针、无 world/INDEX、无 epistemic authority 指令 | **最严重 gap**：routing（何时读 world 而非 web）、navigation（world/INDEX）、epistemic authority（verified > web）全部缺失 |

### 2.6 Shared Knowledge Consumption（从 knowledge/ 回答）

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| 用 knowledge/ 回答方法/规则类问题 | Runtime（Agent）+ Fabric（knowledge 内容 + INDEX + governance） | ✅ knowledge/ + INDEX + KNOWLEDGE.md（含 Query 操作） | ✅ P0008.5 Probe B/C **PASS** | AGENTS.md → KNOWLEDGE.md → "Query: read INDEX → pages" | **YES** | 完整消费链（routing + navigation + content）已验证 | 持久化问题（§5-A：重启即丢）——这是产品化缺陷，非 exposure 缺陷 |

### 2.7 Context Navigation（INDEX-driven）

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| INDEX 引导导航到正确 context | Fabric（INDEX）+ Runtime（导航） | ⚠️ knowledge/INDEX ✅ 生成；**world/INDEX ❌ 未生成** | knowledge 导航 PASS；world 导航 FAIL（P0008.5） | knowledge/INDEX.md 存在；world/ 无 INDEX | **partial**（knowledge YES，world NO） | knowledge：AGENTS.md → KNOWLEDGE.md → INDEX；world：无 | world/INDEX.md 缺失 + 无 "读 world/INDEX" 指针 |

### 2.8 CapabilityRegistry / Capability Binding

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| capability 发现 + binding | Fabric | ✅ 两个表面：(a) `capability/bindings.md`（workspace，1 binding）；(b) CapabilityBridge/Registry（code，11 capabilities，读 generated/capability-contract.json） | ✅ Registry 测试（P0006.5.3 searchByIntent 等）；bindings 仅投影 | (a) bindings.md 在 workspace；(b) CapabilityBridge **只在 legacy chat.ts** | **NO（重大 gap）** | 路径 A 的 blank runtime 只见 `capability/bindings.md`（1 binding）；11 capabilities 在 code 里、走 legacy chat.ts，**session runtime 完全不可见** | **Capability catalog 未暴露给 P0008.3 runtime**：registry 与 workspace 脱节，两套 capability 表面不一致 |

### 2.9 World/System epistemic semantics

| Behavior | Owner | Implemented? | Tested? | Production Entry Point | Runtime Discoverable? | How Discovered | Missing Exposure |
|---|---|---|---|---|---|---|---|
| epistemic（verified/observed/suspected）语义 | Fabric | ✅ 数据里有（assertions.md `[verified]` 等 tag；schema 有 epistemicStatus/temporalStatus） | ✅ P0008.2 28 stress tests | assertions.md 渲染 `[epistemicStatus]` tag | **NO** | 语义在**数据**里，但**无 instruction 声明**其含义或信任优先级 | 无 epistemic authority 指令（"verified > web"）——语义被编码进数据却没被声明给 runtime |

---

## 3. Gap 分类

| 分类 | 行为 | 说明 |
|------|------|------|
| **Productized**（Implemented + Discoverable） | Hermes session / Situation Chat；Fabric Agent Workspace（内容有 gap）；Shared Knowledge Consumption；Shared Knowledge Ingestion（声明式，有入口） | 有生产 entry point，blank runtime 能通过 session cwd 发现并使用 |
| **Exposure Gap**（Implemented + Not Discoverable） | **System Context Consumption**（world 内容在，消费失败）；**CapabilityRegistry**（11 capabilities 实现+测试，runtime 不可见）；**World epistemic semantics**（数据里有，未声明）；**world navigation**（无 INDEX + 无指针） | 实现了，但 blank runtime 在正式 workspace 里找不到/不会用 |
| **Test Artifact**（Tested only） | **System Context Construction**（P0008.5 Phase B 靠 test prompt 让 Preparation Agent 构建 world/） | 生产里由 projector code 代劳，无 Agent-facing 路径；测试里发生的行为不会在正式运行复现 |
| **Declarative Only**（Instruction exists, no mechanism） | Shared Knowledge Ingestion（无 compiler，靠 agent）；"World Model Construction" 指针（声明了但 dangling） | 有文字指令，但要么无机制、要么指向不存在的文件 |

---

## 4. 回答核心问题

### Q1：当前是否存在"开发时会，正式运行不知道会"？

**存在，且是系统性的。** 三个最清晰的例子：

1. **System Context Construction**：P0008.5 里 Preparation Agent 能从 WorldExplorationTask 构建 world/，但生产里**没有任何路径让一个 Agent 这么做**（projector 从 JD_FIXTURE 用 code 生成），且 AGENTS.md 的"构建 world/"指针指向不存在的 `contracts/WORLD_MODEL.md`。
2. **CapabilityRegistry（11 capabilities）**：实现 + 测试都在，但生产 blank runtime 只能看到 workspace 里的 `capability/bindings.md`（**1 binding**），它对 11 capabilities 的存在一无所知。
3. **World epistemic semantics**：`[verified]` tag 在数据里，但没有任何 instruction 告诉 runtime 该信它、该优先于 web。

### Q2：哪些已经是正式能力？

- Hermes persistent session / Situation Chat（route 已 mount，session cwd=workspace）
- Fabric Agent Workspace 投影（生成 + 作为 cwd）
- Shared Knowledge Consumption（完整链：routing → INDEX → content，P0008.5 验证 PASS）
- Shared Knowledge Ingestion（声明式：governance + seeds + 入口都在生产）

### Q3：哪些只是 Procedure / Test behavior？

- **System Context Construction = Test Artifact**（测试里 Agent 会，生产里 projector 代劳，Agent 无此路径）
- **Shared Knowledge Ingestion = Declarative Procedure**（有指令、无 compiler，靠 Agent 读了 AGENTS.md 才执行）

### Q4：哪些缺少 Runtime-facing exposure？

按严重度排序：

1. **System Context Consumption** — world 内容存在但 0/3 消费失败（routing/navigation/epistemic 全缺）
2. **CapabilityRegistry** — 11 capabilities 对 session runtime 完全不可见（只在 legacy chat.ts）
3. **World epistemic semantics** — 数据里有 tag，无声明
4. **world navigation** — 无 INDEX、无指针
5. **System Context Construction** — 无 Agent-facing procedure 暴露（且声明 dangling）

### Q5：P0008.6 Instruction Architecture 是否够承担 exposure？还是需要独立 Procedure exposure mechanism？

**P0008.6 只承担一半，另一半需要独立的 exposure mechanism。**

P0008.6 Instruction Architecture **能**承担（本就是 instruction/navigation 范畴）：
- System Context Consumption 的 routing + epistemic authority 指令
- world navigation（world/INDEX + "读 INDEX" 指针）
- epistemic semantics 的声明（"verified > web"）

P0008.6 **不能**承担（超出 instruction 范畴，是"能力/程序目录"）：
- **Capability catalog exposure** — 11 capabilities 需要一个 runtime-facing 的 capability 目录（不只是 1 条 bindings.md），这是"Fabric 能做什么"的目录，不是"如何工作"的 instruction。
- **Procedure catalog exposure** — System Context Construction / Shared Knowledge Ingestion 需要作为**命名、可发现的 Procedure**（有触发条件、步骤、入口文件），而不是散落在 AGENTS.md 的几段文字里。

结论：**需要一个独立的 "Capability / Procedure exposure" 层**（workspace 内的一个目录，如 `capabilities/` 或 `procedures/`，由 generator/projector 写），与 P0008.6 的 Instruction Architecture **并列**，共同构成 Runtime-facing exposure。P0008.6 解决"何时/为何用哪种 context"，独立层解决"Fabric 有哪些能力、有哪些可执行 procedure"。

---

## 5. 附加发现（非 exposure，但必须记录）

### A. Shared Knowledge 持久化被破坏（P0008.4 principle #2 违反）

`ensureWorkspace` 的 `writeProjection` 每次服务启动执行 `rmSync(targetDir, recursive)`，**清空整个 workspace 后再重 seed**。这意味着 Agent 在上一 session 编译进 `knowledge/` 的任何页面，**下次服务重启即被删除**，只留下 initSharedKnowledgeLayer 的 2 raw + 1 seed page。

这与 P0008.4 核心原则 "persistent knowledge / compounding maintenance" 直接矛盾。Shared Knowledge 目前不是持久资产，是启动时重置的 seed。

### B. `contracts/WORLD_MODEL.md` dangling（Production code 里，非仅手写文件）

`AGENTS_CONTRACT`（`contract.ts:83`）引用 `contracts/WORLD_MODEL.md`，但 projector 与 initSharedKnowledgeLayer 都不写它。World Model Construction 的 instruction 指向一个生产里永不存在的文件。

### C. 命名不一致焊死在代码

`AGENTS_CONTRACT` 写 `capabilities/`、`world/`；projector 写 `capability/`、`world/`。P0008.5 的 `systems/` 改名实验（1/3 提升）**从未进入生产代码**——生产仍是 `world/`。

### D. 两套 capability 表面不一致

workspace 的 `capability/bindings.md`（1 binding，relationship 语义）与 CapabilityRegistry（11 capabilities，contract JSON）是两套独立、脱节的东西。runtime 看到前者，legacy chat.ts 用后者。

---

## 6. 结论

1. **"开发时会，正式运行不知道会"真实存在**，且不止一处：System Context Construction（test-only）、CapabilityRegistry（code-only）、world consumption + epistemic semantics（data-present-but-not-declared）。

2. **Productized 的是"管道"**（session + workspace 投影 + knowledge 消费链），**未 productize 的是"能力与程序的可发现性"**（capability catalog、procedure catalog、world 的 routing/epistemic/navigation）。

3. **P0008.6 Instruction Architecture 应承担 instruction/navigation 那一半 exposure**；**另一半（Capability + Procedure 目录）需要一个独立的 exposure 层**，不在 P0008.6 范围内。

4. **在进入 P0008.6 Proposal 前，建议 Review 同时确认**：Shared Knowledge 持久化 bug（§5-A）和 CapabilityRegistry 与 workspace 脱节（§5-D）——这两个是 productization 缺陷，不是 instruction 缺陷，P0008.6 修不了。

---

*Audit 完成。仅输出 exposure 诊断，未修改 workspace、未补 AGENTS.md、未新增 procedures/、未实现 Capability Engine、未跑新 Agent 测试。停止，等待 Review。*

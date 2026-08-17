# P0009: Real Product Vertical Slice — JD × Hermes × Workspace

**Status**: Proposed
**Date**: 2026-08-16
**Depends on**: P0005.1, P0006, Workspace v0.2 Phase 2/3, P0008.3, P0008.6

## Objective

把 agentFabric 已经存在但彼此分离的 Product Surface、Hermes Session、
Fabric Workspace、Capability Runtime、JD Acquisition 和 Evidence Store
第一次接成一条真实运行的产品链。

本阶段不开发新的业务能力，不继续建设底层架构。

完成标准不是 API 存在、单元测试通过或测试脚本可以跑通，而是：

> 一个专业人员从浏览器 Workspace 输入真实京东经营问题，
> 消息进入 persistent Hermes Session；
> Hermes 使用 Fabric Workspace 理解业务环境和可用能力，
> 自主调用 Fabric capability；
> Runtime 从真实京东商智获取数据并产生 Evidence；
> Evidence 返回 Hermes 继续 reasoning；
> 最终回答、执行过程和 Evidence 在浏览器中可见。

这是 agentFabric 第一次 Real Product Vertical Slice。


## Background

### 已经完成并验证的能力

以下能力已经存在，本阶段直接 REUSE，不重新设计：

- P0005.1：JD Connector / CDP acquisition
- Runtime Kernel
- CapabilityRegistry / CapabilityBinding
- Evidence Store + provenance
- Workspace UI shell
- Evidence Hub
- P0008.3：Situation Chat → persistent Hermes Session
- P0008.3：Hermes Session cwd = Fabric Workspace
- P0008.6：Fabric Workspace
  - AGENTS.md
  - systems/
  - knowledge/
  - capabilities/
- P0008.6 Runtime Acceptance：
  - Orientation PASS
  - System Context consumption 3/3 PASS
  - Shared Knowledge consumption PASS
  - Capability discovery PASS

因此，本阶段不得重新证明：

- Blank Agent 是否能理解 Workspace
- systems/ 是否应该存在
- knowledge/ 如何组织
- capabilities/ 如何暴露
- Hermes 是否应该拥有 Memory / Skill / Soul
- Fabric 是否应该成为 Agent Runtime

这些架构结论已经关闭。


### Wiring Audit 的当前事实

P0009 Wiring Gap Audit 已确认：

当前不是能力不存在，而是存在两条彼此断开的 Runtime Path。

#### Legacy Product Path

Browser 当前实际走：

    Browser
      ↓
    /api/chat
      ↓
    hermes -z one-shot
      ↓
    CapabilityBridge
      ↓
    Runtime Kernel
      ↓
    Acquisition
      ↓
    Evidence
      ↓
    reply

问题：

- 不使用 persistent Hermes Session
- 不使用 P0008 Fabric Workspace canonical path


#### Current Hermes Session Path

P0008 当前真实路径：

    /api/situation/:id/chat
      ↓
    persistent Hermes Session
      ↓
    cwd = Fabric Workspace
      ↓
    systems/
    knowledge/
    capabilities/
      ↓
      X

Hermes 能看到 capability，但不能执行 capability。

因此 P0009 的核心不是新建系统，而是消除这个 X。


### Wiring Audit 确认的两个架构断点

1. Browser 尚未接入 canonical Situation Chat。
2. Hermes Session 没有 Fabric Capability execution boundary。

此外存在一个 Product Reality Gap：

- JD CDP acquisition 已存在；
- Evidence Store 已存在；
- 但当前部分产品路径仍使用 mock:true；
- Agent Activity SSE 仍包含 demo/hard-coded evidence。

因此 P0009 同时必须确保最终链路使用真实 JD acquisition 和真实 Evidence。


## Architecture

P0009 的唯一 canonical product path：

    Professional User
           │
           ▼
    Existing Workspace UI
           │
           ▼
    /api/situation/:id/chat
           │
           ▼
    Persistent Hermes Session
           │
           ├──────── Fabric Workspace ────────┐
           │                                  │
           │       AGENTS.md                  │
           │       systems/                   │
           │       knowledge/                 │
           │       capabilities/              │
           │                                  │
           └──────────────────────────────────┘
           │
           ▼
    Hermes chooses capability
           │
           ▼
    Fabric Execution Boundary       ← NEW / MINIMAL
           │
           ▼
    Capability Binding              ← REUSE
           │
           ▼
    Runtime Kernel                  ← REUSE
           │
           ▼
    JD Connector / CDP              ← REUSE
           │
           ▼
    Real JD Data
           │
           ▼
    Evidence Store                  ← REUSE
           │
           ▼
    Execution Result + Evidence Ref
           │
           ▼
    Hermes continues reasoning
           │
           ▼
    Grounded Response
           │
           ▼
    Existing Workspace UI


核心设计原则：

> Context Plane 与 Execution Plane 必须在同一个 persistent Hermes Session 中汇合。


## Design

### 1. Browser Cutover

现有 Agent Session UI 不再以 legacy `/api/chat` 作为正式运行路径。

改为：

    Browser
      ↓
    /api/situation/:id/chat
      ↓
    persistent Hermes Session

必须复用 P0008.3 已完成的 Situation Chat。

不得创建第二套 Chat UI。

不得创建新的 Agent Session runtime。


### 2. Persistent Hermes Session Is Canonical

产品中的专业人员对话必须运行在 persistent Hermes Session 中。

必须保留：

- session continuity
- Fabric Workspace cwd
- P0008 Workspace instruction loading
- systems / knowledge / capabilities consumption

legacy `hermes -z` one-shot path 不再作为 P0009 产品链的一部分。

本阶段不要求删除 legacy `/api/chat`。

只要求正式 Workspace 不再依赖它。


### 3. Fabric Execution Boundary

这是 P0009 唯一主要的新 Runtime Integration。

Hermes 当前已经可以读取：

    capabilities/INDEX.md
    capabilities/<capability>.md
    capabilities/bindings.md

P0009 必须让 Hermes 从：

> “知道 capability 存在”

进入：

> “能够真正调用 capability”。


目标调用链：

    Hermes
      ↓
    capability selection
      ↓
    Fabric Execution Boundary
      ↓
    existing CapabilityBinding
      ↓
    existing Runtime Kernel
      ↓
    existing Connector


Execution Boundary 必须尽量薄。

优先使用 Hermes 已有的 native tool / MCP / external tool extension mechanism。

实现前必须检查当前 Hermes 实际支持的 extension interface，
选择最小接入方式。

禁止为了此功能：

- 创建新的 Agent Runtime
- 创建第二套 CapabilityRegistry
- 创建第二套 Runtime Kernel
- 将 Capability markdown 变成 executable implementation
- 用 prompt 假装执行 capability


### 4. Execution Return Contract

Fabric capability execution 结束后，结果必须返回当前 Hermes Session。

语义上至少需要包含：

    capability
    execution status
    result
    evidence reference
    provenance / acquisition timestamp

具体数据结构必须优先复用现有 Runtime/Evidence contracts。

不得为了 P0009 再设计新的 Evidence domain model。


目标：

    Hermes invokes capability
          ↓
    Fabric executes
          ↓
    Evidence created
          ↓
    result + evidenceRef
          ↓
    SAME Hermes Session
          ↓
    Hermes reasons over result
          ↓
    grounded response


Evidence → Hermes 是 Execution Boundary 的返回路径，
不是独立的新系统。


### 5. Live JD Acquisition

至少一个已有 JD capability 必须完成真实 E2E。

优先选择：

    traffic.overview

如果 Wiring/Runtime 实际代码证明另一个已经存在的 capability
更适合作为第一个 live slice，可以替换，但必须记录理由。

必须使用现有：

    JD login
      ↓
    Chrome / CDP
      ↓
    existing acquisition
      ↓
    parse / normalize
      ↓
    Evidence Store

不得重新实现 JD Connector。


### 6. No Fake Success

P0009 产品验收路径禁止：

    mock:true

禁止 fixture 替代 live JD acquisition。

禁止 hard-coded evidence。

禁止 demo SSE event 作为 execution evidence。

如果 JD/CDP 当前不可用：

    JD/CDP = unavailable

系统必须诚实暴露 unavailable 状态。

不得 fallback 到 mock 后向用户显示成功。


### 7. Professional Workspace

不重新设计 Workspace UI。

现有 Workspace 就是第一版 Professional Workspace。

专业人员至少应看到：

    当前业务系统
    当前 Agent Session
    Hermes response
    capability execution activity
    Evidence
    runtime/data readiness


专业人员不需要看到：

    WorldAssertion
    CapabilityBinding internals
    Runtime Kernel internals
    Hermes profile internals
    Markdown topology
    JSON contracts


### 8. Agent Activity

当前 demo/hard-coded Agent Activity 不得作为 P0009 验收依据。

Activity 必须来自真实 execution lifecycle。

最低限度能够表达：

    capability selected
    execution started
    acquisition started/completed
    evidence created
    execution completed/failed

如果现有 Runtime 已有对应 event，应直接复用。

只有现有 event 无法满足最小产品展示时，
才允许增加最薄的 integration event mapping。

不得建设新的 Event Bus。


### 9. Evidence

复用现有 Evidence Store 和 Evidence Hub。

Hermes 最终回答必须能够追溯：

    response
      ↓
    evidenceRef
      ↓
    Evidence Store
      ↓
    real acquisition
      ↓
    JD source + timestamp/provenance

专业人员应能从 Workspace 查看此次分析所依据的真实 Evidence。


### 10. Runtime Readiness

正式 Workspace 必须反映真实运行状态。

最低限度：

    Hermes Session     ready / unavailable
    Fabric Workspace   ready / error
    Capabilities       N available
    JD/CDP              ready / unavailable
    Evidence            available / error

不得把静态配置存在解释为 runtime ready。

JD/CDP readiness 必须反映真实 acquisition prerequisites。


## Implementation Scope

P0009 实际工程工作应主要收敛为三个 deliverables。


### Deliverable A — Browser Cutover

    Existing Agent Session UI
          ↓
    canonical Situation Chat
          ↓
    persistent Hermes Session


### Deliverable B — Fabric Execution Boundary

    Hermes Session
          ↕
    Fabric Execution Boundary
          ↕
    existing Runtime Kernel

包含：

- capability invocation
- execution
- result
- evidenceRef return


### Deliverable C — Live Product Evidence

    real JD CDP
        ↓
    real acquisition
        ↓
    real Evidence
        ↓
    real execution activity
        ↓
    Hermes grounded response
        ↓
    Workspace


## Boundaries

### Included

- 将现有 Agent Session UI 切换到 Situation Chat canonical route。
- 复用 persistent Hermes Session。
- 保持 Hermes cwd = Fabric Workspace。
- 复用 P0008.6 systems / knowledge / capabilities。
- 为 Hermes 提供最薄的 Fabric execution boundary。
- 复用 CapabilityRegistry / CapabilityBinding。
- 复用 Runtime Kernel。
- 复用 JD Connector / CDP acquisition。
- 至少跑通一个真实 JD capability。
- 复用 Evidence Store。
- 将 execution result + evidenceRef 返回 Hermes。
- Hermes 基于本次 execution evidence 继续 reasoning。
- Workspace 显示最终回答。
- Workspace 显示真实 execution activity。
- Workspace 可查看真实 Evidence。
- 暴露真实 runtime / JD readiness。


### NOT Included — CRITICAL

- 不新增 JD Connector。
- 不重新实现 CDP acquisition。
- 不新增 Runtime Kernel。
- 不新增 CapabilityRegistry。
- 不重新设计 CapabilityBinding。
- 不新增 Capability taxonomy。
- 不新增业务分析算法。
- 不重新设计 Workspace。
- 不创建新的 Chat UI。
- 不继续扩展 System Context ontology。
- 不继续扩展 Shared Knowledge architecture。
- 不修改 P0008 Workspace architecture。
- 不开发 RAG。
- 不开发 vector database。
- 不开发 Context Router。
- 不开发 Fabric Skill system。
- 不开发 Procedure system。
- 不实现 Hermes Memory。
- 不实现 Hermes Skill。
- 不实现 Hermes Soul。
- 不实现 Hermes Growth。
- 不开发新的 Agent Runtime。
- 不开发 multi-agent orchestration。
- 不开发完整账号/权限/组织系统。
- 不开发 Dashboard 大屏。
- 不删除 legacy `/api/chat`，只冻结。
- 不以 legacy one-shot Hermes 作为验收路径。
- 不使用 mock JD data 通过验收。
- 不使用 fixture JD data 通过验收。
- 不使用 CLI 人工补链。
- 不使用 test runner 人工补链。
- 不使用 hard-coded SSE/evidence 通过验收。

发现非 blocker 问题时：

> 记录，不扩大 P0009。


## Implementation Procedure

### Step 1 — Confirm Wiring

Wiring Audit 已完成。

实现 Agent 开始工作时只需确认 Audit 中涉及的具体入口仍与 HEAD 一致。

不得重新做 Architecture Audit。


### Step 2 — Browser Cutover

让现有 Agent Session 调用：

    /api/situation/:id/chat

确认浏览器真实进入 persistent Hermes Session。


### Step 3 — Execution Boundary

确认 Hermes 当前 native extension mechanism。

选择最薄方案：

    Hermes
      ↔
    Fabric Runtime

跑通一个已有 capability 到 Runtime Kernel。


### Step 4 — Evidence Return

确认 execution result 和 evidenceRef 返回同一个 Hermes Session。

确认 Hermes 可以读取/使用此次执行结果继续 reasoning。


### Step 5 — Live JD

关闭产品链中的 mock。

连接真实 JD/CDP。

通过同一个 capability 产生真实 Evidence。


### Step 6 — Product Surface

把真实：

- execution status
- capability
- evidence
- readiness

接到已有 Workspace。

不得重新设计页面。


### Step 7 — Browser E2E

最后只从浏览器操作。

不得使用 CLI/test runner 补链。


## Success Criteria

1. 正式 agentFabric 服务启动后，现有 Workspace UI 可以正常打开。

2. Workspace 显示真实 Hermes / Workspace / Capability / JD readiness。

3. 专业人员从浏览器 Agent Session 输入问题。

4. Browser 调用 canonical Situation Chat，而不是 legacy `/api/chat`。

5. 消息进入 persistent Hermes Session。

6. Hermes Session cwd 为 Fabric Workspace。

7. Hermes 可以正常消费：
   - systems/
   - knowledge/
   - capabilities/

8. Hermes 根据任务自主选择一个 Fabric capability。

9. Hermes 通过正式 Fabric Execution Boundary 调用该 capability。

10. Capability 使用现有 CapabilityBinding 和 Runtime Kernel。

11. Runtime 实际调用现有 JD Connector / CDP。

12. 本次验收 JD acquisition 必须为真实数据：
    - mock = false
    - no fixture fallback

13. acquisition 产生真实 Evidence。

14. Evidence 包含真实 source / timestamp / provenance。

15. execution result + evidenceRef 返回发起调用的同一个 Hermes Session。

16. Hermes 基于本次真实 Evidence 继续 reasoning。

17. Hermes 最终回答与本次 Evidence 内容一致，可追溯。

18. Browser 显示 Hermes 最终回答。

19. Workspace 显示真实 capability/execution activity。

20. Workspace 可以查看本次真实 Evidence。

21. JD/CDP 不可用时，Workspace 显示 unavailable，而不是 mock success。

22. 整个验收过程中不得人工调用 CLI 补链。

23. 整个验收过程中不得使用 test runner 代替产品路径。

24. 整个验收过程中不得手工把 Evidence 塞给 Hermes。

25. 服务重启后，同样的 browser → runtime path 仍然成立。


## Final Acceptance

最终必须保存一次完整的 Real Product E2E Evidence：

    Browser
       ↓
    Professional User Prompt
       ↓
    Situation Chat
       ↓
    Persistent Hermes Session
       ↓
    Fabric Workspace
       ↓
    systems / knowledge / capabilities
       ↓
    Hermes Capability Selection
       ↓
    Fabric Execution Boundary
       ↓
    Capability Binding
       ↓
    Runtime Kernel
       ↓
    JD Connector
       ↓
    Live CDP
       ↓
    Real JD Data
       ↓
    Evidence Store
       ↓
    Execution Result + EvidenceRef
       ↓
    SAME Hermes Session
       ↓
    Grounded Hermes Response
       ↓
    Workspace Activity + Evidence + Response


建议第一条真实验收问题：

> 分析一下最近的店铺流量情况，有什么值得关注的变化？

这不是测试 Hermes 分析能力。

它只验证一个事实：

> agentFabric 是否终于作为一个完整产品运行起来。


## Completion Rule

P0009 不允许以以下理由标记 Complete：

- “所有模块都存在”
- “unit tests pass”
- “API 测试成功”
- “Hermes 可以读 capability”
- “CLI 可以采集 JD”
- “Evidence Store 有历史数据”
- “curl 可以调用”
- “test runner E2E pass”

唯一允许的 Complete 条件：

> 从浏览器输入真实业务问题开始，
> 到浏览器看到基于本次真实京东采集 Evidence 的 Hermes 回答结束，
> 整条链路无人为补链、无 mock、无 fixture，并且可以重复运行。
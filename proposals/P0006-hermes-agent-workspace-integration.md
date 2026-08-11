P0006 — HermesAgent & Workspace Integration（HermesAgent 与 Workspace 集成）
🎯 核心目标（一句话）

让 agentFabric 从"后台 Runtime"升级为"用户真正可交互的 AI Agent 系统"。

P0005 已完成 Runtime Kernel 的统一与收敛。

P0006 的目标不是继续扩展 Runtime，而是让 Runtime 第一次真正连接到 HermesAgent 与 Workspace，形成完整的人机交互闭环。

当前状态

目前系统已经具备：

Runtime Kernel
Blueprint Runtime
Binding Layer
Connector Runtime
Signal Engine
Evidence Engine
Execution Pipeline

这些能力全部运行于后台。

Workspace 大部分页面仍为占位。

HermesAgent 尚未真正调用 agentFabric Runtime。

因此目前系统属于：

Runtime Ready，但 Product Not Ready。

P0006 的目标

完成下面这条完整链路：

User
    │
    ▼
HermesAgent
    │
Intent / Skill
    │
    ▼
agentFabric Runtime Kernel
    │
Binding
    │
Connector
    │
Signal
    │
Evidence
    │
Analysis
    │
    ▼
HermesAgent Response
    │
    ▼
Workspace Runtime View

这是 agentFabric 第一次真正成为一个可以运行的 AI Agent。

本阶段原则

P0006 不新增业务能力。

P0006 不新增 Connector。

P0006 不讨论 Marketplace。

P0006 不讨论 Blueprint Evolution。

P0006 唯一目标：

把已有能力真正接起来。

本阶段需要完成的内容
1. HermesAgent Integration

HermesAgent 不再直接调用各类 Skill。

HermesAgent 将 Runtime Kernel 作为业务执行入口。

HermesAgent 负责：

用户意图理解
Tool / Skill 选择
Runtime 调度
回复生成

agentFabric 负责：

数据获取
Runtime 执行
Analysis
Signal
Evidence
Result

职责完全分离。

2. Workspace Runtime

Workspace 不再只是静态页面。

Workspace 需要能够展示一次真实 Runtime 执行。

至少能够看到：

Execution
Signals
Evidence
Runtime Result

Workspace 的职责不是控制 Runtime。

Workspace 的职责是：

Runtime 的可视化窗口。

3. End-to-End Execution

第一次完成完整闭环：

一句自然语言

↓

HermesAgent

↓

Runtime

↓

Connector

↓

Signal

↓

Evidence

↓

Analysis

↓

Hermes 回复

↓

Workspace 可查看全过程

整个链路必须真实运行。

不得模拟。

本阶段验收标准

完成后必须满足：

✅ HermesAgent 可以直接调用 agentFabric Runtime

✅ Workspace 可以展示真实 Runtime Execution

✅ Runtime 不再只是 CLI 可运行

✅ 用户可以通过自然语言完成一次完整分析

✅ Workspace 可以回放一次执行过程
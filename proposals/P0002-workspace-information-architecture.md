P0002: Workspace Information Architecture

Status: Accepted
Type: Product Architecture Definition
Scope: AgentFabric / Ecommerce Workspace
Depends on: P0001 AgentFabric Positioning

1. 核心定义（必须作为全局约束）

AgentFabric Workspace 不是：

❌ 数据看板
❌ BI 系统
❌ 后台管理系统
❌ AI 输出展示层

AgentFabric Workspace 是：

Human ↔ AI Business Decision Operating System（人机业务决策操作系统）

2. 设计目标（Non-negotiable）

Workspace 必须同时满足四个目标：

2.1 Trust（信任建立）

用户必须能够回答：

AI 为什么这么建议？
AI 依据是什么？
AI 是否可靠？
AI 错了怎么办？
2.2 Decision（决策执行）

每一个 AI 输出必须能被：

approve
reject
modify
defer
2.3 Learning（系统进化）

每一次人类操作必须反馈：

Experience
Skills
Policies

形成闭环。

2.4 Traceability（可追溯性）

任何结论必须能追溯：

Input → Metrics → Reasoning → Skills → Policy → Decision
3. Workspace 信息架构（IA）
3.1 顶层结构
Workspace
│
├── Inbox（AI待处理任务）
├── Discover（AI主动发现机会）
├── Reviews（人类审核中心）
├── Skills（业务能力库）
├── Experience（已验证经验）
├── Validation（验证系统）
├── Reports（业务报告）
└── Settings（系统配置）
4. 模块定义
4.1 Inbox（AI任务入口）
定义

AI 推送给人类的“待决策事项队列”。

内容类型
高置信度机会
风险警告
异常检测
待确认策略
关键能力
优先级排序
SLA（时间敏感性）
批量处理
4.2 Discover（机会发现层）
定义

AI 从数据中主动挖掘的业务机会池。

每个 Card 必须包含：
Business Case
Confidence Score
Expected Impact
Triggered Skills
不允许：
纯数据展示
无解释结论
4.3 Reviews（人类审核中心）
定义

所有 AI 决策的人工控制点。

功能：
审批 / 拒绝 / 修改
决策记录
反馈原因
输出：
影响 Experience
更新 Skills
更新 Policy 权重
4.4 Skills（业务技能库）
定义

已验证 SOP / 策略模型

特性：
Versioned（版本化）
Measurable（有效果指标）
Editable（可进化）
来源：
Review 通过的策略
Validation 成功结果
4.5 Experience（企业经验库）
定义

被验证过的业务历史结果

结构：
Event
Decision
Outcome
Metrics
Context
作用：
AI 决策参考
Skill 演化基础
4.6 Validation（验证系统）
定义

判断 AI 是否正确的系统

验证方式：
KPI 回测
历史对比
多模型交叉验证
人工确认
4.7 Reports（业务报告）
定义

面向人类的总结层

类型：
日报
周报
战略分析
风险分析
4.8 Settings（系统配置）
内容：
Policy rules
Risk threshold
Confidence threshold
Skill activation rules
5. 核心信息流（Information Flow）
Connectors
    ↓
Metrics Layer
    ↓
AI Analysis Engine
    ↓
Discover / Inbox
    ↓
Reasoning Layer
    ↓
Skills + Policies
    ↓
Experience Lookup
    ↓
Proposal Generation
    ↓
Trust Layer (Confidence + Explanation)
    ↓
Human Review
    ↓
Execution (Hermes Runtime)
    ↓
Validation Layer
    ↓
Experience Update
    ↓
Skills Evolution
    ↓
Next Cycle
6. Trust Layer（核心新增）

每一个 AI Proposal 必须包含：

Confidence Score（0-100）

Reasoning Steps

Evidence Sources

Triggered Skills

Policy Constraints

Risk Analysis
7. UI 约束原则（非常重要）
7.1 UI 不展示数据，而展示“决策”

所有 Card 必须是：

Business Case Card

7.2 UI 必须支持三种行为
Approve（接受 AI）
Reject（拒绝 AI）
Modify（修改 AI）
7.3 UI 必须展示 AI 思考过程

必须可展开：

Why
How
Based on what
Risk
7.4 UI 不允许“纯列表模式”

所有列表必须包含：

Context
Confidence
Impact
Skills Triggered
8. 关键设计原则（强约束）
Principle 1: AI is a proposer, not executor

AI 永远不能直接执行业务决策。

Principle 2: Human is final authority

所有决策必须人类确认。

Principle 3: No black-box decisions

任何决策必须可解释。

Principle 4: Every decision must generate memory

没有反馈 = 没有学习。

Principle 5: Workspace = Learning System

Workspace 的本质是：

企业如何让 AI 变聪明的系统

9. 成功指标（非常关键）

不是传统 KPI，而是：

AI Decision Acceptance Rate
Average Confidence Drift
Skill Growth Rate
Experience Accumulation Rate
Human Override Rate
Validation Accuracy
10. 最终定义（一句话）

AgentFabric Workspace 是：

一个让企业能够安全地信任 AI，并持续让 AI 通过业务反馈进化的决策操作系统。
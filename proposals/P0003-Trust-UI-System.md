P0003: Trust UI System（Explainability + Confidence Layer）

Status: Accepted
Type: UI / Interaction Architecture
Depends on: P0002 Workspace IA
Base UI: AgentFabric vNext 三栏架构（左导航 / 中 Inbox / 右 Decision Panel）

1. UI 基底约束（不可修改）

本设计必须建立在以下结构之上：

┌──────────────┬──────────────────────────┬──────────────────────┐
│ Left Nav     │ Center Inbox Stream     │ Right Decision Panel │
│ (240px)      │ (flex-1)                │ (320px)              │
└──────────────┴──────────────────────────┴──────────────────────┘
2. 本 P0003 的核心目标

把“AI 黑盒输出”升级为“可被信任的决策对象”

UI 不再展示：

❌ 数据
❌ 结果
❌ 报表

UI 展示：

“带置信度 + 可解释链路 + 可验证证据的决策”

3. 右侧面板 = Trust Decision Panel（核心重构）

右侧面板从：

“Explain / Reason / Trace”

升级为：

Trust Decision Stack（信任决策栈）

3.1 Panel 分层结构
Decision Header
    ↓
Confidence Layer
    ↓
Evidence Layer
    ↓
Reasoning Layer
    ↓
Skill/Policy Trigger Layer
    ↓
Execution Preview Layer
    ↓
Validation Layer
4. Decision Header（决策头部）

每个 AI 卡片点击后右侧固定展示：

内容：
Decision Title（简化业务语言）
Type（Opportunity / Risk / Optimization）
Impact Score（业务影响）
Confidence Score（0-100）
UI 规范：
[HIGH IMPACT] Increase SKU-318 conversion rate
Confidence: 87%
Expected Impact: +12.4% GMV
5. Confidence Layer（置信度系统）
5.1 定义

不是单一数字，而是三维结构：

Confidence =
  Data Confidence +
  Model Confidence +
  Policy Alignment
5.2 UI 展示
Overall: 87%

Data: ████████░░ 82%
Model: █████████░ 90%
Policy: ██████████ 95%
5.3 必须支持
hover 查看 breakdown
点击展开 explanation
6. Evidence Layer（证据层）
6.1 定义

所有 AI 结论必须有：

数据来源
指标来源
历史事件
Similar cases
6.2 UI 结构
Evidence Sources (4)

• JD sales data (last 7 days)
• SKU-318 conversion funnel
• Similar SKU-112 campaign
• Price elasticity model v2.1
6.3 必须支持
点击 source → 打开 raw data preview
每条证据必须可 trace
7. Reasoning Layer（推理层）
7.1 定义

不是“LLM思考过程”，而是：

Business Reasoning Chain（业务推理链）

7.2 UI 格式
Step 1: Detect conversion drop (-8.3%)
Step 2: Correlate with traffic source change
Step 3: Match historical pattern (SKU-112)
Step 4: Apply Skill: pricing_elasticity_v3
Step 5: Validate against Policy: margin > 15%
Step 6: Generate decision proposal
7.3 关键约束
必须结构化
必须可展开
不允许纯自然语言段落
8. Skill / Policy Trigger Layer（核心差异点）
8.1 定义

展示：

AI 用了哪些“企业能力”做出这个决策

8.2 UI
Triggered Skills:

✓ pricing_elasticity_v3
✓ conversion_drop_detector
✓ seasonal_adjustment_model

Active Policies:

✓ margin_floor_policy (15%)
✓ risk_threshold_policy (medium)
9. Execution Preview Layer（执行预览）
9.1 定义

AI 建议“将要发生什么”，但不执行

9.2 UI
Proposed Actions:

1. Adjust SKU-318 price: -3%
2. Boost ad bid: +15%
3. Trigger A/B test: variant B
9.3 特性
可修改
可拒绝
可部分执行
10. Validation Layer（验证层 - 新增核心）
10.1 定义

回答一个问题：

如果执行，会发生什么？

10.2 UI
Predicted Outcome:

GMV: +12.4%
Risk: Low
Confidence drift: ±3%

Historical Match:
SKU-112 (92% similarity)
11. Center Inbox 升级规则

Inbox 中每个 Card 必须包含：

Title
Impact Score
Confidence Score
One-line Reason
Triggered Skill
12. Card → Panel 交互

点击卡片：

Center Card
    ↓ click
Right Panel (Trust Stack loads)
13. UI 核心原则（升级）
Principle 1: No opaque AI output

没有任何“纯结论”

Principle 2: Confidence is first-class citizen

置信度 ≠ 辅助信息
置信度 = UI主结构

Principle 3: Every decision must be explainable

必须支持：

Why
Based on what
Using which skill
Principle 4: Evidence > Reasoning > Output

优先级：

Data > Skill > Model > Result
Principle 5: Trust is product, not feature

整个 UI 的本质是：

build trust, not dashboards

14. 与 P0002 的关系

P0002 定义：

Workspace 信息架构

P0003 定义：

Workspace 如何让 AI 被信任
15. 一句话总结

AgentFabric vNext 的 UI 不是展示 AI 的结果，而是展示 AI 如何被允许做出这个结果。
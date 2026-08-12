P0007: Experience → Memory → Skill

Status: Proposed
Date: 2026-08-12
Depends on: P0006.5.3 Capability Contract, Workspace Phase 2, HermesAgent Integration Phase 3

Objective

P0007 定义 agentFabric 从“连接 Agent 与现实世界”进入“为 Agent 持续成长提供现实经验”的核心架构。

软件表象保持：

Experience → Memory → Skill

但职责边界明确为：

agentFabric:
World → Learning Context

Runtime:
Learning Context → Reflection / Experience → Memory → Skill

agentFabric 不判断什么值得学习，也不生成 Memory / Skill。它负责持续观察真实世界、记录 Agent 与专业人士如何介入世界、观察后续结果，并将足够广、足够深、具有 Provenance 的现实上下文交给 HermesAgent 或其他 Runtime。

最终目标不是制造另一个 Agent Runtime，而是让已有的通用 Runtime 能够进入一个垂直领域，看见这个领域、理解发生了什么、观察专业人士如何处理，并获得现实结果作为学习材料。

Background
1. agentFabric 的定位变化

agentFabric 来源于早期 agentCMS。

agentCMS 曾经尝试同时承担：

Agent Runtime
Ranking / Signal
Memory
Experience extraction
Review
Workspace
Agent configuration
Skill / workflow
Explainability

随着 HermesAgent、Claude Code、Codex 等通用 Agent Runtime 快速成熟，这种架构已经没有必要。

新的基本判断是：

不再制造更聪明的 Agent，而是让已经很聪明的 Agent 接触它原本无法接触的专业世界。

因此：

General Agent Runtime
        │
        │ reasoning / planning
        │ memory / skill / learning
        │
════════╪════════ Runtime Boundary
        │
    agentFabric
        │
 ┌──────┼───────┐
 │      │       │
Observe Act   Feedback
 │      │       │
 └──────┼───────┘
        │
    Real World

所谓 Fabric 一个垂直领域，不是给 Runtime 写几个领域 Skill，而是逐渐建立：

Domain Fabric
├── Capability Graph
├── Observation Vocabulary
├── Evidence
├── Signal / Context
├── Human Intervention
├── Action Vocabulary
├── Action Execution
├── Outcome Observation
├── Provenance
└── Learning Context

Runtime 可以更换，这些领域资产仍然存在。

2. HermesAgent Research Finding

HermesAgent 已经拥有自己的成长机制，包括 Memory、Skill、周期性 reflection/review、/learn 等能力。

因此 agentFabric 不应该复制：

Experience
    ↓
Pattern Extraction
    ↓
Memory Engine
    ↓
Skill Generator

Hermes 的学习本身依赖 Runtime 在一定时间、一定次数的经历后重新检索 Memory / Context，由 LLM 自己发现模式。

这意味着 agentFabric 真正需要优化的不是：

“我们怎么判断这是不是经验？”

而是：

Runtime 在进行 reflection 时，能够拿到多完整、多深入、多可信的现实上下文？

因此 P0007 的核心产物是：

Learning Context。

3. Legacy Archaeology Finding

现有 agentCMS 遗留实现已经包含 Experience 思想，但模型过早。

旧链路主要是：

Agent Output
    ↓
Human Review
    ↓
approve / reject / modify
    ↓
reason_category
    ↓
MEMORY_PATTERN_RULES
    ↓
ContextMemory

其核心问题不是 Review 本身错误，而是系统无法真正观察专业人士在现实业务中做了什么。

Professional Action 被压缩成：

approve
reject
modify

真实修改则进入缺乏语义结构的 modified_output。

旧 Experience extraction 因此只能通过：

Repeated Reject Reason
        ↓
Predefined Rule
        ↓
"Experience"

近似专业经验。

这不能作为 P0007 的基础。

4. Existing Assets

现有代码并非全部废弃。

REUSE
Capability Contract
Acquisition
Evidence
Execution Contract
Observable Execution Events
taskId / executionId / evidenceId
Feedback basic persistence
Workspace
Agent Session
Capability Explorer
Evidence Viewer

特别是 Phase 3 的 Execution Event Model：

execution.started
acquisition.started
acquisition.progress
evidence.created
acquisition.completed
execution.completed

已经形成正确的 Provenance 前半段。

EXTEND
Review
Feedback
Business Result
Workspace interaction
Execution lifecycle
LEGACY
MEMORY_PATTERN_RULES
Review consensus → Experience
agentFabric-owned Memory Engine
agentFabric-owned Skill generation
LLM/Memory configuration in Workspace
UI-reconstructed Agent Trace

旧代码暂不要求在 P0007 主 Proposal 中删除，由后续子阶段决定迁移。

Cross-Domain Validation

P0007 的抽象不能只针对电商。

已有跨行业流程验证覆盖：

大宗商品智能分析
电商多平台经营分析
智能质检
自动报价
供应商风险管理
Agent Trust Flow（横切模型）

前五种业务虽然 Action 完全不同，但都可以抽象为：

Observation
    ↓
Interpretation
    ↓
Proposal
    ↓
Intervention
    ↓
Action
    ↓
Execution
    ↓
Observation'
    ↓
Outcome
    ↓
Evaluation

该结构是 Grammar，不是固定 Workflow。

节点允许：

缺失
重复
分叉
延迟发生
多 Actor
无 Action

例如人工标注属于 Intervention，但不是 World Action；人工审核也可能只产生 Decision；供应商切换才真正改变业务世界。

因此：

Review ≠ Intervention ≠ Action ≠ Execution ≠ Outcome

这是 P0007 的基础语义边界。

Architecture
                         REAL WORLD
                             │
                      World Interface
                             ↓
                        Observation
                             ↓
                   Evidence / Signal
                             ↓
                     Situation / Case
                             │
                  Agent Interpretation
                             │
                      Recommendation
                             │
                  ┌──────────┴──────────┐
                  │   DOMAIN WORKSPACE  │
                  │                     │
                  │ Human Intervention  │
                  │ Action Intent       │
                  └──────────┬──────────┘
                             ↓
                   Professional Action
                             ↓
                      World Change
                             ↓
                   Outcome Observation
                             ↓
                      Learning Context
                             │
════════════════════ Runtime Boundary ════════════════════
                             │
                           Hermes
                             │
                     Memory → Skill
                             │
                     Behavior Change
                             │
                             ▼
                         REAL WORLD
                             ↺

两条横向基础设施贯穿整个过程：

Provenance
Observation → Evidence → Proposal → Intervention
            → Action → Outcome → Evaluation
                         │
                         ▼
                    Verifiability


Execution Lifecycle
Goal → Stage → Stage → Stage → Complete
              │
              ▼
      Execution Reliability
              │
              ▼
             Trust
Design
1. Learning Context

Learning Context 是 agentFabric 与 Runtime 之间的核心成长接口。

它不是一句总结，也不是 Memory。

它应该允许 Runtime访问一次真实业务经历所需的完整材料。

概念结构：

LearningContext
├── identity
├── temporal context
├── domain context
├── goal / task context
│
├── observations[]
├── evidence[]
├── signals[]
│
├── agent activities[]
├── execution stages[]
│
├── human interventions[]
├── actions[]
├── action executions[]
│
├── subsequent observations[]
├── outcomes[]
├── evaluations[]
│
└── provenance

Learning Context 可以是不完整的。

agentFabric 不应该因为缺少 Outcome 就拒绝记录现实。

因此允许：

OPEN
PARTIAL
MATURE

这样的生命周期概念，但具体状态名称由 P0007.1 确定。

广度原则

Runtime 应能够看到：

Context
+ Observation
+ Evidence
+ Signal
+ Agent Response
+ Human Intervention
+ Actual Action
+ Execution
+ Subsequent Observation
+ Outcome
+ Evaluation
+ Provenance
深度原则

不能只记录：

change_image → CTR +8%

而应该能够表达：

当时是什么商品
处于什么生命周期
曝光发生什么变化
竞争环境如何
Agent 建议什么
专业人士为什么没有采用
实际改变了什么
还有哪些变量同时发生变化
3d / 7d / 14d 后分别怎样

agentFabric 不替 Runtime做因果判断。

它负责保存足够上下文，使 Runtime 有可能进行正确判断。

2. Human Intervention Grammar

Human Intervention 是 Professional Action 的上位概念。

HumanIntervention
├── Decision
│   ├── accept
│   ├── reject
│   ├── modify
│   ├── defer
│   └── no_action
│
├── Correction
│
├── Annotation
│
├── Context Supplement
│
├── Action Intent
│
└── Professional Action

其中：

no_action 也是有效专业行为。

因为“不处理”本身可能包含重要隐性经验。

Professional Action 必须进一步区分：

Action Intent
     ↓
Action
     ↓
Execution
     ↓
Observed World Change

例如：

“准备降价”
      ≠
“价格已经修改”
      ≠
“平台确认价格从129变成119”

这些不能合并成一个字段。

3. Outcome Observation

Outcome 不依赖专业人士手工填写。

agentFabric 应优先通过已有 World Capability 再次观察现实。

概念流程：

T0 Professional Action
        │
        ├── baseline
        │
        ├── observation window
        │
        ├── T+n Acquisition
        │
        ├── Evidence
        │
        └── Outcome Observation

例如：

价格修改
   ↓
3d observation
7d observation
14d observation
   ↓
traffic / CTR / CVR / GMV / margin...

Observation Window 是领域相关的。

P0007 不建立一个通用的固定 3/7/14d 规则。

4. Provenance

Trust 不依赖 Agent 自己解释自己的 reasoning。

P0007 采用：

Observable Facts over Reconstructed Explanation

即：

谁
什么时候
观察了什么
通过什么 Capability
获得什么 Evidence
提出什么 Proposal
人类进行了什么 Intervention
实际执行什么 Action
世界发生什么变化
最后观察到什么 Outcome

必须来自真实事件和引用关系。

Workspace 可以渲染这些事实，但不得自行生成“可能发生过”的 Trace 作为 Provenance。

5. Trust Model

Trust 是横向能力，不是 Experience Pipeline 的最后一个节点。

至少存在两个维度。

Verifiability Trust
Can I verify what happened?

来源：

Evidence
Provenance
Action records
Outcome records
immutable observable events
Execution Reliability Trust
Can this Agent reliably finish the job?

关注：

Goal
 ↓
Stage 1
 ↓
Stage 2
 ↓
...
 ↓
Complete

未来可以观察：

task completion
stage completion
failure/recovery
human takeover
repeated retry
long-horizon drift
outcome success

Trust 不应被压缩成一个全局：

Agent Trust Score = 87%

它可以是 capability / task / domain scoped。

6. Dynamic Interaction Surface

P0007 不设计固定的“专业 Action 表单”。

核心原则：

UI is a function of Learning Context gaps.

Learning Context
       ↓
Context Gap Detection
       ↓
Interaction Need
       ↓
Interaction Definition
       ↓
Generic Surface Renderer
       ↓
Professional Intervention
       ↓
Learning Context enriched

例如系统已经通过 World Observation 检测到：

price: 129 → 119

则不应该再问：

“你做了什么？”

而应该生成类似交互需求：

Detected Action:
price 129 → 119

Is this related to this task?

Why was it changed?

Was another action performed simultaneously?

因此 Surface 的目标不是“收集 Feedback”，而是：

补齐 Runtime 后续学习所需但系统无法自行观察的专业上下文。

初期采用 Schema / Interaction Definition → Generic Renderer。

7. Runtime Boundary

Learning Context 必须 Runtime-neutral。

                Learning Context
                       │
          ┌────────────┼────────────┐
          │            │            │
       Hermes       Runtime B    Runtime C
          │            │            │
       Memory       own model     own model
          │
        Skill

HermesAgent 是首个验证 Runtime，不是协议所有者。

agentFabric 不规定 Runtime：

多久 reflection
检索多少 Memory
如何判断 pattern
如何合并 Memory
什么值得遗忘
什么值得成为 Skill
Skill 的文件格式
Skill 如何 inject
Design Principles

Domain Workspace is the primary human interface of Learning Context Formation.

The primary Workspace object is a Situation/Case, not a chat message or an Agent output.

Sub-Proposals

P0007 采用逐层验证，而不是一次实现全部架构。

P0007.1 — Learning Context Contract

定义整个 P0007 的核心数据契约。

核心概念：

Situation / Case
      ↓
Learning Context

Situation/Case 是一次真实业务情境的锚点。Observation、Evidence、Signal、Agent Proposal、Human Intervention、Action、Outcome 都围绕它关联。

验证：

现有 Observation / Evidence / Execution / Feedback 能否组成足够丰富的学习材料。

不做 UI，不接 Hermes learning。

P0007.2 — Human Intervention & Action Grammar

建立语义模型，明确区分：

Human Intervention
├── Decision
├── Correction
├── Annotation
├── Context Supplement
└── Action Intent

Professional Action
      ↓
Action Execution
      ↓
World Change

不使用 approve/reject/modify 作为完整专业行为模型。

并使用多个垂直领域案例验证 Grammar。重点解决”系统不知道全部 Action Vocabulary”问题。

P0007.3 — Domain Workspace & Interaction Surface

定义专业人员在哪里与 agentFabric 工作。

核心对象不是 Chat，也不是 Agent Output，而是 Situation：

              Situation

Observation / Evidence / Signal
              ↓
      Agent Interpretation
              ↓
        Recommendation
              ↓
════════ Domain Workspace ════════
              ↕
      Human Intervention
              ↓
      Professional Action
              ↓
        Learning Context

Dynamic Interaction Surface（原来的 7.5）是 Domain Workspace 内部的能力：Context Gap → Interaction Definition → Generic Renderer → Professional Input → Learning Context enriched。

第一阶段可以有固定 Workspace shell + schema-driven interaction。Dynamic Surface 是 Workspace 的能力，不是 Workspace 本身。

P0007.4 — Outcome Observation

Situation → Professional Action → World Change → T+n Re-observation → Outcome → Learning Context enrichment。

优先验证 JD Capability 自动重新观察闭环（traffic/CTR/CVR/GMV/margin），不要求运营人员手填”效果怎么样”。

不做因果推断引擎。

P0007.5 — Provenance & Trust

把现有 Execution Events 延伸到 Observation / Evidence / Agent Activity / Human Intervention / Action / Outcome / Evaluation 全链路。

Trust 两个维度明确区分：

Trust
├── Verifiability Trust
│   └── 它到底看到了什么、做了什么、结果如何
│       (Evidence, Provenance, Action records, Outcome records,
│        immutable observable events)
│
└── Execution Reliability Trust
    └── 它是否能稳定完成 Stage / Task / Goal
        (task completion, stage completion, failure/recovery,
         human takeover, repeated retry, long-horizon drift,
         outcome success)

Domain Workspace 消费这些事实来展示 Trust，但 Workspace 不生产 Provenance。

Trust 可以是 capability / task / domain scoped，不压缩成单一全局分数。

P0007.6 — Hermes Learning Loop Validation

第一次完整验证：

Situation
    ↓
完整 Learning Context
    ↓
Hermes
    ↓
Reflection
    ↓
Memory
    ↓
Skill

只观察 Hermes 是否能够从 Learning Context 中形成有价值的 Memory / Skill。

不修改 Hermes Memory / Reflection / Skill 机制。不复制 Hermes /learn、Memory、Curator 等能力。

Boundaries
Included
Learning Context contract
Experience material lifecycle
Human Intervention grammar
Professional Action representation
Action execution observation
Outcome observation
World re-observation
Provenance
Execution Reliability facts
Trust observable model
Context gap representation
Interaction Definition
Dynamic Surface architecture
Runtime-neutral Learning Context interface
HermesAgent 作为首个学习验证 Runtime
跨行业 Grammar 验证
现有 agentCMS Experience/Review 资产迁移分类
NOT Included — CRITICAL
不实现 Memory Engine。
不实现 Skill Generator。
不复制 Hermes /learn、Memory、Curator、Reflection 等机制。
不定义“什么经验值得学习”的固定规则。
不延续 MEMORY_PATTERN_RULES 作为新 Experience 架构。
不通过 reject 次数或 support rate 宣称 Experience 已被业务验证。
不把 approve/reject/modify 当成完整 Professional Action 模型。
不要求每条 Learning Context 都包含 Action。
不要求每条 Learning Context 都已有 Outcome。
不在 agentFabric 做通用因果推断。
不把 Agent 自己生成的 reasoning/explanation 当成 Provenance。
不记录或暴露 Runtime 私有 Chain-of-Thought。
不允许 Workspace 根据业务结果反向伪造执行 Trace。
不把 Trust 简化成单一全局分数。
不在 P0007 重建 Agent Runtime。
不在 P0007 重建 orchestration。
不实现新的 Multi-Agent Framework。
不修改 Hermes 内部成长算法。
不绑定 Hermes 私有 Memory/Skill 数据结构。
不一次实现 JD/Taobao/质检/报价/供应商等全部 Action Vocabulary。
不为每个领域手工开发独立 Action UI。
Dynamic Surface 第一阶段不允许 Agent 任意生成并执行前端代码。
不因为 P0007 顺手清理全部 agentCMS legacy runtime/memory UI。
不把 Phase 3 SSE demo technical debt 混入 Experience 架构实施。
Directory Structure

架构级建议，具体文件由各子 Proposal 确定：

shared/
└── schemas/
    ├── learning-context.ts
    ├── intervention.ts
    ├── action.ts
    ├── outcome.ts
    └── provenance.ts

platform/
└── experience/
    ├── context/
    ├── observation/
    ├── intervention/
    ├── outcome/
    └── provenance/

apps/
└── ecommerce/
    ├── experience/          # migration / domain adapter
    └── workspace/           # dynamic interaction surface

docs/
└── experience/

tests/
└── contract/
    └── experience/

proposals/
├── P0007-Experience-Memory-Skill.md
├── P0007.1-learning-context-contract.md
├── P0007.2-human-intervention-action-grammar.md
├── P0007.3-domain-workspace-interaction-surface.md
├── P0007.4-outcome-observation.md
├── P0007.5-provenance-trust.md
└── P0007.6-hermes-learning-loop-validation.md

注意： 此处仅定义目标架构位置，不授权 P0007 主阶段一次性创建以上所有模块。

每个子 Proposal 必须先检查现有代码并明确 create / migrate / reuse。

Success Criteria
同一个 Learning Context Contract 能表达电商、质检、报价、供应商风险等不同领域的真实经历，而无需修改核心 Schema。
系统能够明确区分 Human Feedback、Human Intervention、Action Intent、Professional Action、Action Execution 和 Outcome。
一次真实 Action 可以通过现有 World Capability 在后续时间重新观察，并形成引用原始 Evidence 的 Outcome。
Learning Context 能从 taskId / executionId / evidenceId / interventionId / actionId / outcomeId 建立可追溯关系，而不是建立第二套孤立 Trace 系统。
Workspace 展示的 Provenance 来源于真实 observable events，而不是前端根据结果重新构造 Agent 行为。
系统能够描述长任务的 stage execution、failure、recovery、human takeover 和 completion，为 Execution Reliability 提供事实基础。
Dynamic Surface 至少在两个明显不同的领域中，根据 Interaction Definition 生成不同专业交互，而无需新增领域专用页面。
系统能够自动观察到的 Action/Outcome 不要求专业人士重复录入；Surface 主要补充系统无法观察的 Context Gap。
Learning Context 可以在缺少 Action 或 Outcome 时合法存在，并能随现实世界后续 Observation 增量丰富。
HermesAgent 能消费 agentFabric 提供的 Learning Context，并通过其自身学习机制产生 Memory/Skill；agentFabric 无需理解或控制该内部过程。
更换 Runtime 时，Observation、Evidence、Human Intervention、Action、Outcome、Provenance 和 Learning Context 等领域资产保持有效。
P0007 完成后，agentFabric 的职责可以清晰表达为：
agentFabric:
World → Learning Context

Runtime:
Learning Context → Memory → Skill

而不存在第二套由 agentFabric 自己维护的 Runtime Growth Engine。
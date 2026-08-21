# P0010: Knowledge-Guided Investigation

**Status**: Proposed
**Date**: 2026-08-21
**Depends on**: P0008.4 Knowledge Layer, P0009 Runtime Integration, AgentFabric v0.9.9

## Objective

让 Agent 从当前的“读取已有数据并解释 Situation”，跨到**基于专业 Knowledge 主动调查 Situation**。

面对一个 Situation，Agent 必须结合已有 Evidence 与专业 Knowledge，判断当前已经知道什么、有哪些合理 Hypothesis、最关键的 Unknown 是什么，并决定**下一步最值得回答的问题（Next Question）**。

如果现有 Evidence 无法回答这个问题，Agent 应检查 Fabric 已有 Capability，主动获取所需 Evidence；新 Evidence 返回后更新 Understanding，并决定继续提出下一个 Question，或者停止调查并形成 Judgment。

P0010 不建设通用运营推理系统。只用一个真实场景验证这条最小闭环：

> **Situation → Knowledge → Question → Fabric → Evidence → Updated Understanding**

---

# Background

## 当前已经具备的基础

经过此前 Consolidation，AgentFabric 已经具备：

```text
JD World
   ↓
Acquisition
   ↓
Evidence
   ↓
Signals
   ↓
Situation
```

并且专业 Knowledge 已经形成另一条真实链：

```text
Professional Experience
   ↓
knowledge-sources/raw/
   ↓
Hermes Ingest
   ↓
knowledge/*.md
   ↓
INDEX + provenance
```

Workspace 也已经能够展示：

* Situation；
* Pattern Engine 归因；
* Ranking Explainability；
* Evidence provenance；
* Professional Intervention；
* Learning Context。

因此目前的问题已经不是“没有数据”，也不是“没有知识”。

真正缺失的是：

> **Agent 不会利用 Knowledge 决定自己接下来需要知道什么。**

---

# Current Problem

当前 Situation 理解基本还是：

```text
Situation
   ↓
Pattern Engine
   ↓
已有 Signals 的确定性归因
   ↓
“主要驱动因素：orders”
   ↓
固定建议
```

例如：

```text
GMV ↓ 24%
orders ↓ 31%
UV ↓ 18%
```

系统可以告诉运营人员：

> 成交金额下降，主要驱动因素是订单下降。

这没有错，但它仍然非常接近 BI 的复述。

真正有经验的运营不会停在这里。

他会继续问：

```text
这个下降是真的吗？
↓
还是正常的星期波动？

整个行业是不是也在跌？
↓
如果行业跌得更多，我其实没有表现差。

如果是真异常：
↓
到底是 UV、CVR 还是 AOV？

如果是 UV：
↓
哪个流量渠道掉了？

如果是自然搜索：
↓
关键词排名变了吗？

然后：
↓
为什么排名变了？
```

因此 Agent 与优秀运营之间真正缺少的，不只是“更多知识”，而是：

> **知道现在应该问什么问题。**

---

# Core Design Principle

P0010 的核心不是：

> Knowledge → Answer

而是：

> **Knowledge → Better Question**

Knowledge 不直接替 Agent 给出原因。

Knowledge 应该帮助 Agent 判断：

* 什么现象可能只是噪声；
* 哪些指标应该联动观察；
* 当前结论需要什么证据；
* 哪些 Hypothesis 值得优先验证；
* 哪些 Evidence 不足以支持结论；
* 什么情况下应该继续调查；
* 什么情况下应该停止；
* 什么情况下最好的操作是“不操作”。

因此：

```text
Knowledge
   ↓
Question Selection
   ↓
Evidence Acquisition
   ↓
Understanding
```

---

# Architecture

```text
┌──────────────────────────┐
│        Situation         │
│       GMV ↓ 24%          │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│      Hermes Runtime      │
│                          │
│ Situation + Evidence     │
└────────────┬─────────────┘
             │
        consult Knowledge
             ↓
┌──────────────────────────┐
│ Professional Knowledge   │
│                          │
│ · 周期节律               │
│ · 真/伪异常              │
│ · 指标联动               │
│ · 故障排查经验           │
│ · 边界条件               │
│ · 不干预条件             │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Current Understanding    │
│                          │
│ Known Evidence           │
│ Hypotheses               │
│ Unknowns                 │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│      Next Question       │
│                          │
│ “现在最需要知道什么？”   │
└────────────┬─────────────┘
             ↓
      Existing Evidence?
        ↙          ↘
      YES           NO
       ↓             ↓
    Answer      Fabric Capability?
                  ↙        ↘
                YES         NO
                 ↓           ↓
              Acquire    Missing Capability
                 ↓        / Ask Human
              Evidence
                 ↓
                 └──────┐
                        ↓
              ┌──────────────────┐
              │ Update           │
              │ Understanding    │
              └────────┬─────────┘
                       ↓
               Question / Stop?
                 ↙          ↘
             Question        Stop
                ↓             ↓
             next loop     Judgment
```

---

# Ownership

这是 P0010 最重要的架构边界之一。

## Hermes owns

Hermes 负责：

* 阅读 Knowledge；
* 理解 Situation；
* 形成业务 Hypothesis；
* 判断当前 Unknown；
* 选择 Next Question；
* 判断需要什么 Evidence；
* 选择可用 Fabric Capability；
* 阅读新 Evidence；
* 更新 Understanding；
* 判断继续调查还是停止。

## Fabric owns

Fabric 负责：

* Situation；
* Capability discovery；
* Capability execution；
* Acquisition；
* Evidence persistence；
* provenance；
* 将 Investigation 的业务级产物提供给 Workspace；
* Human Intervention / Learning Context。

Fabric **不负责替 Hermes 思考问题**。

因此禁止出现：

```text
if (gmv_down) {
    acquireTrafficSource();
}
```

这样的 Fabric 业务推理。

否则我们验证的是开发人员会写京东运营规则，而不是 Agent 会调查。

---

# Design

## 1. Situation 是 Investigation Trigger，不是 Conclusion

Situation：

```text
GMV ↓ 24%
```

只意味着：

> 发现一个值得关注的经营现象。

它不等于：

```text
原因 = 广告
```

也不等于：

```text
Action = 增加广告预算
```

Agent 首先必须判断：

> **这个 Situation 是否值得进一步调查？**

---

# 2. Investigation Gate

Knowledge 首先用于避免“指标一动就优化”。

根据已经整理的专业经验，Agent 应考虑：

* 波动幅度；
* 持续时间；
* 周度节律；
* 同比/环比基准；
* 行业大盘；
* 数据口径。

调查可能产生三类结果：

```text
OBSERVE
INVESTIGATE
NO_ACTION
```

例如：

```text
GMV ↓ 8%
仅一天
符合历史星期节律
```

合理结果可能是：

> 暂不干预，继续观察。

这本身就是一个成功的专业判断。

---

# 3. Investigation State

进入调查后，Runtime 至少需要形成下面这些**业务级认知产物**：

```text
Situation

Known Evidence

Hypotheses

Unknown / Missing Evidence

Next Question

Next Investigation
```

这些不是模型 Chain-of-Thought。

它们是可以被专业人员检查、纠正和积累的业务对象。

例如：

```text
Situation
GMV 连续三天下降，今日较基准 -24%

Known Evidence
- GMV -24%
- UV -27%
- CVR -2%
- AOV +1%

Hypotheses
H1: 流量侧异常是 GMV 下跌的主要来源
H2: 转化问题不是当前主要驱动因素

Unknown
- UV 下降来自哪个渠道？

Next Question
“自然搜索、付费、推荐、活动流量中，
究竟哪个渠道造成了主要 UV 缺口？”

Next Investigation
获取流量来源数据。
```

这就是 Workspace 将来应该看到的内容。

---

# 4. Question 是 Investigation 的驱动力

每一轮调查必须形成一个明确的业务问题：

```text
Next Question
```

Question 不是任意聊天问题，而应该满足：

> **回答这个问题，会明显减少当前 Situation 的业务不确定性。**

例如：

好的 Question：

```text
UV 下降主要来自哪个流量渠道？
```

差的 Question：

```text
GMV 为什么下降？
```

后者过于宽泛，无法直接映射 Evidence。

再例如：

```text
搜索 UV ↓38%
```

下一 Question 可以是：

```text
核心搜索关键词排名是否同步下降？
```

这样 Question 才能驱动 Acquisition。

---

# 5. Question → Required Evidence

Agent 形成 Question 后必须进一步明确：

```text
Question:
UV 下降来自哪个渠道？

Required Evidence:
traffic source breakdown
```

然后先检查：

```text
Existing Evidence
```

如果 Evidence Store 已经存在足够新鲜、适用的数据：

> 直接使用。

不要重复 Acquisition。

如果不存在，再进入 Capability discovery。

---

# 6. Required Evidence → Fabric Capability

Runtime 查询 Fabric：

```text
What capabilities can provide
traffic source evidence?
```

Fabric 返回已有 Capability。

例如：

```text
JD traffic analysis
```

然后由 Runtime 发起 execution。

核心原则：

> **不是 Fabric 主动给 Agent 塞所有可能有用的数据，而是 Agent 因为一个 Question 主动向 Fabric 请求 Evidence。**

这正是 P0010 要验证的架构假设。

---

# 7. Evidence → Answer

Capability 执行后：

```text
Fabric
 ↓
Acquisition
 ↓
Evidence
```

例如：

```text
Natural Search UV  -38%
Paid UV             -4%
Recommendation UV   -6%
Campaign UV          +1%
```

Hermes 得到新 Evidence 后，应该首先回答上一轮 Question：

```text
Question
UV 下降主要来自哪个渠道？

Answer
主要来自自然搜索。
```

然后更新：

```text
Current Understanding
```

---

# 8. Answer → Updated Hypothesis

原：

```text
H1:
流量侧异常导致 GMV 下跌
```

更新为：

```text
H1:
SUPPORTED

GMV 下跌主要由 UV 下跌驱动，
其中主要缺口集中在自然搜索。
```

同时产生新的 Unknown：

```text
为什么自然搜索流量下降？
```

---

# 9. Next Question

Knowledge 再次参与。

专业经验可能告诉 Agent：

搜索流量下降需要调查：

* keyword ranking；
* SKU stock；
* 商品属性变化；
* 平台违规/隐性降权；
* 竞品活动资源；
* 售后/评价异常。

但 Agent 不应该把这些全部一次查完。

它应该根据当前 Situation + Evidence + Knowledge 选择：

> **下一条信息价值最高的问题。**

例如：

```text
Next Question:
核心成交关键词的搜索排名是否同步下降？
```

然后进入下一轮。

---

# 10. Investigation Loop

因此真正的 Runtime loop 是：

```text
Situation
   ↓
Knowledge
   ↓
Current Understanding
   ↓
Next Question
   ↓
Required Evidence
   ↓
Existing Evidence?
   ↓
Fabric Capability
   ↓
Acquire
   ↓
Evidence
   ↓
Answer Question
   ↓
Update Hypothesis
   ↓
Next Question
```

直到进入 Stop Condition。

---

# 11. Stop Conditions

Agent 必须知道什么时候停止调查。

至少允许四种停止结果：

### A. Sufficient Understanding

证据已经足够支持业务判断。

```text
STOP: JUDGMENT
```

### B. Observe

异常不足以支持干预。

```text
STOP: OBSERVE
```

### C. Missing Capability

Agent 知道应该问什么，但 Fabric 当前回答不了。

```text
STOP: MISSING_CAPABILITY
```

例如：

> 需要核心关键词历史排名，但当前 Fabric 没有该能力。

这是非常有价值的结果。

它告诉我们：

> **Fabric 下一步真正应该扩什么。**

而不是开发人员凭感觉继续逆向 JD。

### D. Human Knowledge Required

数据存在，但某个业务事实机器无法获得。

例如：

> 昨天运营人员是否主动更换了主图？

可以：

```text
STOP: ASK_HUMAN
```

---

# 12. Unknown 是一等公民

Agent 必须允许说：

> 我不知道。

例如已经确认：

```text
GMV ↓
→ UV ↓
→ Search UV ↓
→ Keyword ranking ↓
```

但 Fabric 没有：

* 商品属性变更历史；
* 竞品资源位状态；
* 平台隐性降权证据。

Agent 应输出：

```text
Current Judgment:
自然搜索流量下降已经确认。

Unresolved:
目前无法确认排名下降的根因。

Missing Evidence:
- product attribute history
- competitor campaign state
- platform ranking/penalty evidence
```

而不是 LLM 从常识里挑一个：

> “大概率是竞品降价。”

---

# 13. Knowledge 不是 Rule Engine

禁止把当前专业资料转换成：

```text
GMV ↓ → UV
UV ↓ → traffic
traffic ↓ → search
search ↓ → keyword
```

这样的固定决策树。

这些专业资料包含大量：

* 条件；
* 例外；
* 权衡；
* 风险；
* 禁忌；
* 经验优先级。

它们应该作为 Hermes 判断 Question 的 Knowledge。

不是 Fabric 的 if/else。

---

# 14. Initial Acceptance Scenario

P0010 首先使用一个真实的 GMV Decline Situation
验证 Knowledge-Guided Investigation 闭环。

验证路径：

真实 GMV Decline Situation
        ↓
Hermes 读取 Knowledge
        ↓
形成 Current Understanding
        ↓
提出 Next Question
        ↓
发现 Existing Evidence 不足
        ↓
选择已有 Fabric Capability
        ↓
真实 Execute
        ↓
获得新 Evidence
        ↓
回答 Question
        ↓
更新 Hypothesis
        ↓
产生 Next Question 或 Stop

先做：

## P0010 — GMV Decline Investigation

只验证一个真实 Situation。

最低路径：

```text
真实 GMV Decline Situation
        ↓
Hermes 读取 Knowledge
        ↓
形成 Current Understanding
        ↓
提出 Next Question
        ↓
发现 Existing Evidence 不足
        ↓
选择已有 Fabric Capability
        ↓
真实 Execute
        ↓
获得新 Evidence
        ↓
回答 Question
        ↓
更新 Hypothesis
        ↓
产生 Next Question 或 Stop
```

**只要求自主 Acquisition 至少发生一次。**

不要为了 Demo 把调查做到根因树最底部。

---

# Runtime Contract

第一版不要设计复杂认知数据库。

但 Agent 与 Fabric 之间至少需要一个**业务级 Investigation Contract**。

概念结构：

```text
Investigation

situation
currentUnderstanding

knownEvidence[]

hypotheses[]

unknowns[]

nextQuestion

requiredEvidence[]

investigationRequest

findings[]

judgment

stopReason
```

其中关键对象：

### Hypothesis

```text
statement
status:
  proposed
  supported
  weakened
  rejected
```

### Question

```text
question
purpose
requiredEvidence
```

### Finding

```text
question
evidenceRefs
answer
impactOnHypothesis
```

注意：

这些是**领域级可审计产物**。

禁止：

* reasoning tokens；
* hidden reasoning；
* Chain-of-Thought；
* 模型内部思维过程。

---

# Workspace Design

P0010 不应该再只显示：

```text
Agent 怎么理解

主要驱动因素：
orders（67%）
```

Situation Detail 应逐渐形成真正的 Investigation Surface。

建议第一版：

```text
┌─────────────────────────────────────┐
│ 成交金额下降 24%                    │
│                                     │
│ Agent 当前判断                      │
│ 这是连续第 3 天异常下降，值得调查。 │
│                                     │
│ 已确认                              │
│ • GMV ↓24%                          │
│ • UV ↓27%                           │
│ • CVR 基本稳定                      │
│ • AOV 基本稳定                      │
│                                     │
│ 当前假设                            │
│ 流量侧异常是主要驱动因素            │
│                                     │
│ ─────────────────────────────────   │
│ Agent 正在调查                      │
│                                     │
│ 下一问题                            │
│ 哪个流量渠道造成了 UV 下降？        │
│                                     │
│ 需要证据                            │
│ 流量来源拆解                        │
│                                     │
│ 获取方式                            │
│ 京东商智 · Traffic Capability       │
│                                     │
│ [已获取 Evidence]                   │
│                                     │
│ 新发现                              │
│ 自然搜索 UV ↓38%                    │
│ 付费流量基本稳定                    │
│                                     │
│ 更新后的判断                        │
│ 当前下降主要集中于自然搜索流量。    │
│                                     │
│ 尚未确认                            │
│ 搜索流量下降的根因。                │
│                                     │
│ 下一问题                            │
│ 核心关键词排名是否同步下降？        │
└─────────────────────────────────────┘
```

这不是为了 UI 漂亮。

它是在产品层把 Agent 的业务认知过程暴露给专业人员。

专业人员因此可以判断：

> **Agent 问的问题对不对。**

这会直接连接我们已有的：

```text
Human Intervention
→ Learning Context
→ Hermes
```

未来专业人员真正可以纠正的不只是“最终答案”，还可以是：

> **“你下一步不应该查广告，应该先查库存。”**

这将成为未来 Skill Growth 非常重要的经验来源。

但 **P0010 不实现这种 Question correction learning**。

---

# Data Flow

完整数据流：

```text
Situation Store
     ↓
Investigation Start
     ↓
Hermes Session
     ↓
Workspace Knowledge
     ↓
Investigation State
     ↓
Next Question
     ↓
Fabric Capability Discovery
     ↓
Capability Execute
     ↓
Acquisition
     ↓
Evidence Store
     ↓
Evidence Refs
     ↓
Hermes
     ↓
Finding
     ↓
Updated Investigation State
     ↓
Workspace
```

关键原则：

**Evidence 仍然进入现有 Evidence Store。**

不要建立：

```text
investigation_evidence_store
```

第二套 Evidence 系统。

---

# Directory Structure

这是架构级建议，不要求 Claude 按名字机械创建。

优先 REUSE 现有模块。

可能涉及：

```text
apps/ecommerce/
  runtime/
    investigation/          # 仅当 repo 中没有合适现有位置
      contract.ts
      ...

platform/server/
  routes/
    situation-*.ts          # 优先扩现有 Situation/Hermes 路径

apps/ecommerce/workspace/
  app.js
  index.html

data/fabric-workspace/
  knowledge/                # REUSE，只读给 Runtime
  situations/               # REUSE existing Hermes context
```

在实现前必须先做一次窄审计：

* Hermes situation session 当前怎样拿 Context；
* Capability discovery/execute 当前 canonical 入口；
* Evidence acquisition 当前怎样返回；
* Learning Context 是否适合作为 Investigation 初始 Context；
* 是否已有 task/session lifecycle 可以承载 Investigation；
* 是否已有 schema 可以表达上述业务产物。

**能 WIRE 不 CREATE。**

---

# Boundaries

## Included

* 一个真实 GMV decline Situation；
* Hermes 真实读取现有 Knowledge；
* 形成 Known Evidence；
* 形成至少一个业务 Hypothesis；
* 形成 Unknown；
* Agent 自主提出 Next Question；
* 明确 Required Evidence；
* 检查 Existing Evidence；
* 选择一个已有 Fabric Capability；
* 真实执行一次 Acquisition；
* 新 Evidence 进入现有 Evidence Store；
* Evidence 回到 Hermes；
* 回答上一 Question；
* 更新 Hypothesis / Understanding；
* 产生 Next Question 或 Stop；
* Workspace 展示 Investigation 的业务级状态；
* Evidence provenance 保持可追溯。

## NOT Included — CRITICAL

### 不建设新的智能层

禁止：

* 通用 Reasoning Engine；
* Planner Engine；
* Question Engine；
* Investigation DSL；
* Rule Engine；
* Knowledge Graph；
* RAG；
* Vector DB；
* embeddings。

### 不把 Knowledge 编译成规则

禁止：

```text
GMV down → fetch traffic
traffic down → fetch keyword
```

这种开发人员预定义调查路径。

### 不扩业务执行

禁止：

* 自动调广告；
* 自动改价格；
* 自动库存操作；
* 自动优惠券；
* 自动报名活动；
* Action/Result execution。

本阶段只有：

> **read / investigate / understand**

### 不扩 Knowledge 系统

禁止：

* Knowledge editor；
* Skill generation；
* Skill optimization；
* 自动 Knowledge extraction；
* 新 Memory System。

### 不为了 Demo 大规模扩 JD

如果 Agent 提出的 Question 当前 Fabric 无 Capability：

```text
MISSING_CAPABILITY
```

就是正确结果。

不要为了让 Demo 继续跑而现场逆向大量 JD API。

### 不保存 Chain-of-Thought

只保存：

* Question；
* Hypothesis；
* Evidence；
* Finding；
* Judgment；
* Stop reason。

---

# Success Criteria

1. 使用一个**真实 GMV decline Situation**完成验证。

2. Hermes 实际读取 `knowledge/` 中由专业资料整理形成的 Knowledge；运营规则不能复制进代码或 investigation prompt。

3. Agent 能形成可观察的：

```text
Situation
Known Evidence
Hypotheses
Unknown
Next Question
```

4. `Next Question` 必须由 Agent 根据 Situation + Knowledge + Evidence 产生，不能由代码针对 GMV 场景硬编码。

5. Agent 明确说明回答 Question 需要什么 Evidence。

6. 如果 Existing Evidence 不足，Agent 能自主发现并选择一个**已有 Fabric Capability**。

7. 至少发生一次真实：

```text
Question
→ Capability
→ Acquisition
→ Evidence
→ Answer
```

8. 新 Evidence 必须进入现有 Evidence/provenance 体系，不建立旁路数据源。

9. 新 Evidence 必须造成可观察的认知变化，至少满足一种：

```text
Hypothesis supported
Hypothesis weakened
Hypothesis rejected
New hypothesis
Next Question changed
Investigation stopped
```

10. Workspace 能让专业人员看懂：

```text
Agent 已经知道什么
Agent 当前认为可能是什么
Agent 还不知道什么
Agent 现在在问什么
Agent 为此获取了什么证据
证据回来后判断发生了什么变化
Agent 接下来还要问什么
```

11. Evidence 不足时 Agent 能明确输出：

```text
MISSING_CAPABILITY
ASK_HUMAN
OBSERVE
```

而不是猜测。

12. 不发生任何真实业务写操作。

---

# Critical Acceptance

P0010 最重要的验收不是 UI，也不是 LLM 输出多专业。

必须真实观察到：

```text
Situation
   ↓
Knowledge
   ↓
Agent:
“我现在最需要回答 X”
   ↓
Question X
   ↓
“当前 Evidence 回答不了”
   ↓
Fabric Capability
   ↓
真实 Acquisition
   ↓
Evidence X
   ↓
Agent:
“现在 X 得到了回答，因此我的判断从 A 更新为 B”
   ↓
Next Question / Stop
```

如果这条链不能成立：

**P0010 不通过。**

---

## P0010 要验证的架构假设

最后我把整个 Proposal 压缩成三句话：

> **Knowledge 的价值不是替 Agent 给答案，而是让 Agent 知道该问什么。**

> **Fabric 的价值不是提前把所有数据塞给 Agent，而是让 Agent 能够向现实世界提问。**

> **Agent 的理解来自 Question → Evidence → Updated Understanding 的持续循环，而不是一次 Prompt 对 BI 数据的总结。**

这版我认为才同时包含了**指导思想、Runtime 行为、数据流、Workspace 产品形态、实现边界和可验收标准**。而且没有丢掉上一版里那些本来就是正确的部分。

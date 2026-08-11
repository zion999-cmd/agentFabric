D0001 - Business Context First

状态：Active

日期：2026-06-29

核心结论

Agent 不直接运行在原始数据（Raw Data）之上。

Agent 运行在 Business Context（业务上下文） 之上。

Raw Data 是事实。

Business Context 是经过业务组织后的当前业务状态。

问题来源

最初讨论 Skill Engine 时，发现一个根本问题：

Skill 无法脱离数据独立存在。

例如：

Skill:
分析 ROI 下降原因

如果没有：

广告数据
商品数据
评论数据
库存数据

Skill 无法执行。

因此：

Skill 的输入不是 Prompt。

也不是数据库。

而是当前业务状态。

Business Context 的定义

Business Context 表示：

某一个时间点，企业当前业务的完整状态。

例如：

SKU:
iPhone 17

广告：
ROI ↓ 18%

库存：
42

评论：
负面率 ↑

物流：
正常

促销：
618 第二天

这不是一张数据库表。

而是一份经过整理、归纳、关联后的业务状态。

Business Context 的来源

Business Context 来源于多个数据源共同构建。

包括但不限于：

平台数据
京东
天猫
拼多多
抖店
企业系统
ERP
CRM
WMS
OMS
企业知识
SOP
行业知识
培训资料
操作规范
历史业务数据
历史订单
历史广告
历史库存
历史运营结果
人类操作轨迹

包括：

点击
修改
决策
Review
驳回
同意

这些共同构成企业真实经验的重要来源。

Skill 的位置

Skill 不直接读取数据库。

Skill 读取 Business Context。

Business Context
        │
        ▼
     Business Skill
        │
        ▼
      Decision

因此：

Skill 可以独立于数据来源存在。

不同企业只需要构建自己的 Business Context。

同一个 Skill 即可复用。

为什么这很重要

如果 Skill 直接依赖：

JD API

ERP API

CRM API

那么：

Skill 无法迁移。

也无法跨行业复用。

而统一的 Business Context：

将 Runtime、数据源与业务能力彻底解耦。

对 AgentFabric 的影响

因此：

AgentFabric 不直接面向：

Raw Data

而是面向：

Business Context

所有后续模块：

Metrics
Decision
Review
Experience
Skills
Policy

均以 Business Context 为统一输入。

后续研究方向

未来需要继续验证：

Business Context 应包含哪些标准字段。
不同行业是否存在统一的 Context 模型。
Context 如何随着时间持续演化。
Context 如何影响 Skill 选择。
Experience 如何持续改善 Business Context。
我再补充一点（这一点我觉得比文档更重要）

这个 Discovery 目前不要写死。

为什么？

因为它现在还是一个工作假设（Working Theory）。

它非常符合目前的推导，也符合我们的系统架构，但还没有经过真实业务验证。

所以我建议所有 Discovery 文档都遵循一个规则：

Proposal：一旦 Accepted，就是项目开发规范。
Discovery：永远允许被新的业务实践推翻、修正或扩展。

这样，AgentFabric 的理论体系就会和它的产品一样，是持续演化的，而不是一开始就假设自己找到了最终答案。
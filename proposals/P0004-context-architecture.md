# P0003: Business Context 架构

**状态**: Proposed（尚未实现）
**日期**: 2026-06-27
**来源**: chat_history2

---

## 背景

当前目录中有 `context/`，但它是**项目记忆**（给开发者看的），不是**业务上下文**（给 AI 决策用的）。

chat_history2 指出了一个关键缺失：

> "现在目录有 context/，但是是空的。其实 Business Workspace 真正最重要的就是 Context。Current Campaign、Current Season、Holiday、Business Objective、Business Constraints、Store Configuration、Competitor Snapshot——这些都是 Context。不是 Knowledge，也不是 Experience。"

## 决策

Business Context 应该成为 **一等公民**，拥有自己的模块 `apps/ecommerce/context/`。

AI 每次做 Decision 之前，都应该先 Load Business Context。

## Context 的分类

### 1. Campaign Context
当前正在进行的营销活动：
- 618、双11、双12、年货节
- 活动目标（GMV 增长 30%）
- 活动预算
- 活动时间窗口

### 2. Business Context
业务目标和约束：
- 本月优先级（清库存 vs 冲销量 vs 保利润）
- 预算限制（广告预算、促销预算）
- 品牌定位约束（不能低于 X 元、不能用某个关键词）

### 3. Environment Context
外部环境：
- 季节性（旺季/淡季）
- 节假日（春节、国庆）
- 竞品快照（竞品价格、竞品活动）
- 平台政策变化

### 4. Runtime Context
技术/运行环境：
- 当前时间（运营日期锚定 vs 真实时间）
- 数据新鲜度（上次采集时间）
- 可用数据源

## 数据模型（草案）

```typescript
interface BusinessContext {
  context_id: string;
  context_type: 'campaign' | 'business' | 'environment' | 'runtime';
  key: string;           // e.g. 'current_campaign', 'seasonality'
  value: Record<string, unknown>;
  valid_from: string;    // ISO
  valid_until: string;   // ISO
  priority: number;      // 0-1, higher = more important
  source: 'manual' | 'system' | 'connector';
  created_at: string;
}
```

## Context 加载流程

```
Orchestrator.run()
  │
  ├── 1. Load Business Context（从 DB 或 cache）
  │       ├── active campaigns
  │       ├── current season / holiday
  │       ├── business objectives
  │       └── constraints
  │
  ├── 2. Connectors → raw data
  ├── 3. Metrics → computed signals
  ├── 4. Decision → ranking + recommendation
  │       └── injected with Business Context
  ├── 5. Explainability → trace
  ├── 6. Review → human gate
  ├── 7. Experience → memory extraction
  └── 8. Skills → automation update
```

## Context 与其他模块的区别

| 模块 | 问题 | 特点 |
|------|------|------|
| **Context** | 现在是什么情况？ | 临时的、当前的、窗口化的 |
| **Knowledge** | 行业通用知识是什么？ | 冷/静态、长期有效 |
| **Experience** | 我们学到了什么？ | 经过验证的、衰减的、活跃的 |
| **Policy** | 我们应该遵守什么规则？ | 持久的、约束性的 |

Context 是最易变的——campaign 结束它就过期。Knowledge 是冷库——几乎不改。Experience 在两者之间——它从 Context 中提取，经过验证后升级。

## 优先级

Context 是当前最优先的未完成模块。没有 Business Context 的 Decision 缺乏最重要的输入——它不知道"现在是什么季节、有没有大促、预算还剩多少"。

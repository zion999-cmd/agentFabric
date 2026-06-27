# P0004: Human Review Pipeline

**状态**: Accepted（已实现）
**日期**: 2026-06-27
**来源**: agentCMS 源码, chat_history1

---

## 背景

agentCMS 有两套审核系统：通用的 `HumanReview`（高风险输出前的人工门控）和领域特定的 `RankingReview`（运营是否同意排名引擎的判断）。

在 AgentFabric 中，我们统一为一套 Review 实体，以 `domain` 字段参数化，以 10-class reason category taxonomy 为核心区分能力。

## 决策

1. **统一 Review 实体** — 不再区分 HumanReview 和 RankingReview。一套 Review schema 覆盖所有 domain（ranking、signal、skill、memory）。
2. **reason_category taxonomy 是核心资产** — 10 个精心定义的原因类别，编码了运营领域知识。
3. **24h stale rule** — 超过 24h 未审核的 entity 自动重新入队。
4. **Feedback → Knowledge 提升** — approve→case, modify→rule, reject→rule。

## Review 实体

```typescript
interface ReviewEvent {
  review_id: string;
  domain: 'ranking' | 'signal' | 'skill' | 'memory';
  entity_id: string;
  action: 'approve' | 'reject' | 'modify';
  reason: string;                           // 自由文本
  reason_category?: RankingReviewReasonCategory;  // 结构化分类
  reviewer: string;
  signal_snapshot?: Record<string, number>; // 决策时的信号快照
  explainability_ref?: string;              // 链接到 trace
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  created_at: string;
  reviewed_at?: string;
}
```

## 10-Class Reason Category Taxonomy

这是整个 Review domain 的核心资产。它编码了运营人员**为什么**拒绝或修改排名的领域知识。

| Category | 含义 | 典型触发条件 |
|----------|------|----------|
| `inventory_concern` | 库存担忧 | stockout_risk > 0.5 ∧ gmv_growth > 0.3 |
| `promotion_ending` | 促销末期 | gmv_growth > 0.5 ∧ ad_density > 0.6 |
| `creator_drop` | 达人带动力下降 | creator_coverage < 0.3 |
| `seasonal_fluctuation` | 季节性波动 | sales_growth > 0.4 |
| `market_trend_shift` | 市场趋势转变 | price_competition_index < 0.3 |
| `pricing_issue` | 定价问题 | price_competition_index < 0.4 |
| `data_quality_doubt` | 数据质量存疑 | sales_growth > 0.5（异常值） |
| `growth_legitimate` | 增长合理（确认） | — |
| `manual_override` | 人工覆盖 | 其他 manual 原因 |
| `other` | 其他 | fallback |

## Review Queue (24h Stale Rule)

```
entity 无审核记录          → pending
entity 最近审核 > 24h 前   → pending（重新入队）
entity 最近审核 ≤ 24h 前   → not pending
```

## Feedback

Feedback 是审核的量化结果——代理的输出是否真的推动了业务指标的改善？

```typescript
interface Feedback {
  feedback_id: string;
  review_id?: string;
  task_id?: string;
  execution_id?: string;
  agent_output: Record<string, unknown>;
  human_action: {
    type: 'approve' | 'reject' | 'modify';
    modified_output: Record<string, unknown>;
  };
  business_result: {
    metric_delta: Record<string, number>;       // e.g. { roi: 0.12, gmv: 0.34 }
    attribution_window?: '3d' | '7d' | '14d';  // 归因窗口
    baseline?: Record<string, number>;          // 执行前指标
    post_value?: Record<string, number>;        // 执行后指标
    signal_usefulness?: Record<string, 'useful' | 'mixed' | 'not_useful'>;
  };
  timestamp: string;
}
```

## Knowledge Promotion

**Type inference（语义桥）**:

| Human Action | Knowledge Type | 含义 |
|-------------|---------------|------|
| `approve` | `case` | 保留 agent 输出，沉淀为可复用案例 |
| `modify` | `rule` | 基于人工修改结果，沉淀修正规则 |
| `reject` | `rule` | 基于人工拒绝结果，沉淀负向规则 |

**Auto-Promote Eligibility**（全部满足）:
1. human_action.type === 'approve'
2. approveCount(task) >= 2
3. distinctExecutionCount(task) >= 1
4. 每个 specified metric >= threshold
5. fingerprint 未重复
6. feedback_id 未被 promote

## Review Pipeline 流程

```
AI Decision（排名结果 + explainability）
  ↓
Human Review（approve / reject / modify + reason_category）
  ↓
Feedback（business_result + metric_delta + signal_usefulness）
  ↓
Knowledge Promotion（approve → case, modify/reject → rule）
  ↓
Memory Extraction（≥5 rejects same category, support_rate ≥ 0.6 → Experience）
  ↓
Future Decision Adjustment（decrease_confidence / cap_score / boost_score）
```

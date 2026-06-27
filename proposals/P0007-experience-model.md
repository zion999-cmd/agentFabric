# P0006: Business Experience 模型

**状态**: Accepted（已实现）
**日期**: 2026-06-27
**来源**: agentCMS Memory domain源码, ADR-003, ADR-006

---

## 背景

agentCMS 有一层 "Context Memory"，用于记住人工审核中反复出现的模式，并在未来排名中自动调整。但在 AgentFabric 中，"Memory" 这个名字已被 Hermes Runtime Memory 占据——Hermes 管理运行时记忆（conversation history、context compression、FTS5 session search）。

我们需要一个明确的名字来区分两者。chat_history2 建议："终于不是 Memory 了。Hermes = Runtime Memory，AgentFabric = Business Experience。"

## 决策

1. **模块名 `experience/`** —区分 Hermes Runtime Memory
2. **Experience = 经过验证的业务知识** — 只有通过 Human Review + 满足 ≥5 rejects + support_rate≥0.6 的模式才能成为 Experience
3. **Experience 是活的** — 有 TTL、衰减、覆盖机制（5 条硬约束）
4. **Experience 的结构化 adjustment 字段** — 不在注入时重新解析自然语言，adjustment 在提取时写入并持久化（ADR-003）

## Experience 实体

```typescript
interface ContextMemory {
  memory_id: string;
  memory_type: 'signal_reliability' | 'ranking_override_pattern' |
               'product_risk_pattern' | 'reviewer_preference_pattern';

  // 范围
  scope: {
    entity_type: 'product' | 'category' | 'signal' | 'ranking_rule' | 'workflow';
    entity_ids: string[];
    agent_id?: string;
  };

  // 经验声明（人类可读）
  statement: string;  // e.g. "库存紧张时不应放大增长信号"

  // 证据
  evidence: {
    sample_size: number;       // 支持本经验的事件数
    support_rate: number;      // 正面支持占比
    counter_rate: number;      // 反面证据占比
    sources: string[];         // 来源 review_id 列表
  };

  // 权重
  weight: {
    importance: number;   // 0-1 业务重要性
    confidence: number;   // 0-1 证据置信度（≤ 0.9）
    freshness: number;    // 0-1 时间新鲜度（指数衰减）
    final_score: number;  // 0-1 综合权重
  };

  // 时效
  temporal: {
    first_seen_at: string;
    last_seen_at: string;
    half_life_days: number;    // 默认 30
    expires_at: string;        // now + half_life_days
  };

  // 状态
  status: 'active' | 'stale' | 'deprecated';

  // 验证
  validation: {
    state: 'pending' | 'validated' | 'rejected';
    validator?: 'human' | 'rule';
    validated_at?: string;
    notes?: string;
  };

  // 覆盖（人可覆盖经验，覆盖后仅供解释，不再自动调整排名）
  override: {
    is_overridden: boolean;
    override_reason?: string;
    overridden_by?: string;
    overridden_at?: string;
  };

  // 追溯
  trace: {
    source_review_ids: string[];
    extraction_run_id: string;
  };

  // 调整动作（结构化持久化，不在注入时重新解析自然语言）
  adjustment?: RankingMemoryAdjustment;  // ADR-003
}
```

## Weight Formula（逐字移植自 agentCMS）

```
final_score = 0.40 × confidence
            + 0.30 × support_rate
            + 0.20 × importance
            + 0.10 × freshness
```

Tier 分类：
- `≥ 0.7` → **strong** 记忆（主动影响排名决策）
- `0.5 – 0.7` → **weak** 记忆（仅作为参考）
- `< 0.5` → **rejected**（不合格，不激活）

## Exponential Decay

```
freshness(t) = e^(-λt)
λ = ln(2) / half_life_days
```

默认 half_life = 30 天。freshness 从 1.0（刚提取时）开始指数衰减。当 freshness < 某阈值或超过 expires_at 时，status → `stale`。

## 5 Active-Memory Hard Constraints

1. **TTL** — 必须有过期时间
2. **Confidence** — 必须有可计算的置信度 + 最低准入阈值
3. **Decay** — 必须有指数衰减模型
4. **Validation** — Rule 或 Human 验证后才能 Activate
5. **Override** — 必须允许人覆盖/禁用/追溯

缺少任意一条，不能标记为 `active`。

## Extraction Rules (MEMORY_PATTERN_RULES)

当 ≥5 条 reject Review 属于同一 reason_category，且 support_rate ≥ 0.6 时，触发提取。

**8 条核心映射**（最宝贵的业务资产）：

| reason_category | Condition | Lesson | Adjustment |
|----------------|-----------|--------|------------|
| `inventory_concern` | stockout_risk > 0.5 ∧ gmv_growth > 0.3 | 库存紧张时不应放大增长信号 | decrease_confidence gmv_growth 0.3 |
| `promotion_ending` | gmv_growth > 0.5 ∧ ad_density > 0.6 | 促销末期的高增长不可持续 | decrease_confidence gmv_growth 0.2 |
| `creator_drop` | creator_coverage < 0.3 | 达人带动力下降时降低信号置信度 | decrease_confidence creator_coverage 0.2 |
| `seasonal_fluctuation` | sales_growth > 0.4 | 季节性波动需折扣处理增长信号 | cap_score sales_growth 0.5 |
| `market_trend_shift` | price_competition_index < 0.3 | 市场趋势转变时降低价格竞争信号 | decrease_confidence price_competition_index 0.2 |
| `pricing_issue` | price_competition_index < 0.4 | 定价偏离中位数时限制价格竞争得分 | cap_score price_competition_index 0.4 |
| `data_quality_doubt` | sales_growth > 0.5 | 数据质量存疑时降低增长信号置信度 | decrease_confidence sales_growth 0.3 |
| `manual_override` | sales_growth > 0.5 | 人工覆盖：限制该信号对排名的影响 | cap_score sales_growth 0.5 |

## Extraction Flow

```
Reject Reviews（action='reject'）
  ↓ group by reason_category
  ↓ for each category with count >= MIN_SUPPORT (5)
  ↓ support_rate = support_count / total_reviews >= 0.6
  ↓ match to MEMORY_PATTERN_RULES
  ↓ build ContextMemory with structural adjustment field
  ↓ persist
  ↓ status = 'active', validation = {state:'validated', validator:'rule'}
```

## Memory → Ranking Injection

```
Ranking Engine 启动
  ↓ queryActiveMemories(agentId)  →  active validated memories
  ↓ filter: not overridden
  ↓ extract adjustment.signal_name + action + magnitude
  ↓ RankingMemoryAdjustment[]
  ↓ applyMemoryAdjustments(score, signalsUsed, adjustments)
  ↓     decrease_confidence: score *= (1 - magnitude)
  ↓     increase_confidence: min(1, score * (1 + magnitude))
  ↓     cap_score:           min(magnitude, score)
  ↓     boost_score:         min(1, score + magnitude)
  ↓ 返回 adjusted ranking
```

前缀匹配（ADR-003）：调整的 signal_name 使用 base name（如 `gmv_growth`），排名引擎通过 `signalMatches` 函数匹配窗口化的信号名（`gmv_growth_7d` startsWith `gmv_growth_` → 匹配）。

## 四层认知模型（agentCMS 概念）

| Layer | 名称 | 特点 | 示例 |
|-------|------|------|------|
| 1 | Hot Context | 当前工作流/task 运行时 | 当前 session 的排名查询 |
| 2 | **Active Memory** | **Experience（本模块）** | 已验证的可执行经验 |
| 3 | Cold Knowledge | Knowledge 库 | SOP、案例、静态规则 |
| 4 | Execution Archive | 历史记录 | 检索用，不注入在线 |

注入优先级: **Active Memory > Hot Context derivative > Cold Knowledge > Archive summary**

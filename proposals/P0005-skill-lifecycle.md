# P0005: Skill Lifecycle（技能生命周期）

**状态**: Proposed（尚未实现）
**日期**: 2026-06-27
**来源**: agentCMS v2_workspace_architecture_spec.md, chat_history2

---

## 背景

在 AgentFabric 中，Skill 不是硬编码的逻辑，也不是简单的 Prompt 模板。Skill 是**经过验证的、持续演化的业务 SOP**——它从经验中提取、经人工审核确认、在生产中持续验证。

chat_history2 指出：`prompts/` 最终应该消失——因为 Skill 自己带 Prompt。Hermes 的 Skills Hub 已经提供了 SKILL.md 标准。AgentFabric 的 Skills 是**业务技能**，回答"在这个企业中，这类情况应该如何处理？"

## 决策

1. **Skill = Memory Pattern + Automation Rule + Validation History**
2. Skills 从 Experience 提取，经 Review Pipeline 验证
3. Skills 有版本号、成功率、影响指标
4. Skills 通过 MCP 暴露给 Hermes Runtime（而不是内嵌在 Prompt 里）
5. `prompts/` 目录吸收进 `skills/`（Prompt 是 Skill 的内部资产）

## Skill 数据模型（草案）

```typescript
interface Skill {
  skill_id: string;
  name: string;                    // e.g. '库存紧张时降低增长权重'
  version: number;                 // 1, 2, 3...
  status: 'active' | 'deprecated' | 'draft';
  domain: 'ecommerce' | 'finance' | string;

  // Business trigger
  conditions: SkillCondition[];    // 一组 signal_name + operator + value
  // e.g. [{ signal: 'stockout_risk', op: 'gt', value: 0.5 },
  //       { signal: 'gmv_growth', op: 'gt', value: 0.3 }]

  // Action
  action: SkillAction;             // boost_score / cap_score / decrease_confidence / flag_for_review
  // e.g. { type: 'decrease_confidence', target: 'gmv_growth', magnitude: 0.3 }

  // Provenance
  source_memory_id: string;        // 从哪条 Experience 提取
  submitted_by: 'agent' | 'human';
  submitted_at: string;

  // Review
  review_status: 'pending' | 'approved' | 'rejected' | 'modified';
  reviewed_by?: string;
  reviewed_at?: string;
  review_reason?: string;

  // Performance
  success_rate: number;            // 0-1 在生产中的正确率
  total_applications: number;      // 被触发的总次数
  last_applied_at?: string;
  impact_score: number;            // 对排名质量的提升幅度

  // Validation
  validations: ValidationRun[];   // 反事实验证记录
}

interface SkillCondition {
  signal_name: string;             // base name (e.g. 'stockout_risk')
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  value: number;
}

interface SkillAction {
  type: 'decrease_confidence' | 'increase_confidence' | 'cap_score' | 'boost_score' | 'flag_for_review';
  target_signal: string;
  magnitude: number;
}

interface ValidationRun {
  run_id: string;
  run_at: string;
  window_days: number;
  with_skill_score: number;        // 启用技能时的排名得分
  without_skill_score: number;     // 禁用技能时的排名得分（反事实基线）
  external_rank_comparison?: number; // 外部平台排名差异（JD rank vs agent rank）
  result: 'improved' | 'degraded' | 'no_change';
}
```

## Skill 生命周期

```
Experience（积累 ≥5 次 reject 同一模式）
  ↓  Memory Extraction
Pattern（MEMORY_PATTERN_RULES 映射）
  ↓  Skill Candidate 生成
SkillCandidate（submitted_by='agent', confidence=0.7）
  ↓  Human Review
Skill（review_status='approved', version=1）
  ↓  生产运行
Skill（total_applications++, success_rate 更新）
  ↓  Validation Run
如果 success_rate < 0.5 → Skill（status='deprecated'）
如果 success_rate ≥ 0.8 → Skill（version++, confidence 提升）
  ↓  Validation Dashboard
Operator 可查看 Skills 的准确率趋势
```

## Skill 与 Hermes Skills 的关系

- **Hermes Skills** 是 Runtime 层面的能力（"如何调用 terminal"、"如何读写文件"）
- **AgentFabric Skills** 是 Business 层面的能力（"库存紧张时如何调整排名权重"）

AgentFabric Skills 通过 MCP Server 暴露给 Hermes。Hermes 在规划阶段发现需要业务判断时，调用 AgentFabric 的 MCP tool → Skill 触发 → 返回调整后的决策。

## 优先级

Skills 是当前第二优先的未完成模块（排在 Business Context 之后）。没有 Skills 的业务循环缺少"自动化"这一步——发现 → 审核 → 学习 → **自动化** 的最后一环是缺失的。

# P0001: AgentFabric 产品定位

**状态**: Accepted
**日期**: 2026-06-27
**来源**: docs/PROJECT_REBOOT.md, philosophy.md, chat_history1

---

## 背景

agentCMS 在过去两个月探索了完整的 Agent Runtime 设计：Runtime、Workflow、Memory Engine、Planning、Agent Loop、Review、Context、Dashboard。这些工作有价值——让我们理解了企业 AI 系统应该如何运作。

但 AI 生态系统演进速度远超预期。现代 Runtime 平台（Hermes Agent、Claude Code、Codex、OpenHands）已经提供了 Runtime、Tool Use、Planning、Reflection、Hooks、MCP、Provider Management 的高质量实现。继续重建这些能力不再是可持续的长期策略。

## 决策

AgentFabric **不是** Agent Runtime。

AgentFabric 是构建于现代 Agent Runtime 平台之上的 **Business Workspace**。

## 边界

```
Foundation Models (Claude, GPT, DeepSeek, ...)
        │
        ▼
Hermes Agent Runtime (Python, subprocess)
        │
        ▼
AgentFabric Business Workspace (TypeScript + SQLite + vanilla JS SPA)
```

**Hermes 负责（绝不重建）**:
- Runtime、Provider、Hooks、MCP（客户端+服务端）、Tool Calling
- Runtime Memory、Agent Execution、Planning、Reflection
- 工作流引擎、子 agent、Cron、上下文压缩、凭证轮换

**AgentFabric 负责**:
- Business Context（业务上下文）
- Business Skills（业务技能——已验证的 SOP，带版本和成功率）
- Business Policies（业务规则——增长策略、风险策略、业务约束）
- Business Experience（业务经验——经过验证的知识，非运行时内存）
- Human Review（人工审核——结构化决策）
- Explainability（可解释性——每个结论都追溯到证据）
- Connectors（数据连接器——JD、Tmall、ERP、Webhook、MCP）
- Workspace UI（运营工作台——pages + widgets，非开发者调试控制台）

## 核心原则

1. **Runtime 可替换。** 业务逻辑绝不导入 Hermes 内部——只依赖 `HermesClient` 接口。明天换成 Codex 或 Claude Code，只需实现同一个接口。

2. **业务知识是长期资产。** 源代码不是产品。Runtime 不是产品。LLM 不是产品。经过验证的业务知识才是产品——每一次被验证的经验都应成为企业资产。

3. **验证后才能进入记忆。** 不是每一个 AI 输出都有资格成为记忆。验证方法：人工审核、KPI 评估、历史回放、多 Agent 审查、业务指标。

4. **技能是活的资产。** 技能不是硬编码的逻辑。技能是积累的业务经验，鼓励版本管理，需要审查，每次业务使用后都应变得更好。

5. **人工仍然是决策者。** AI 提议，人决策。人的反馈改善业务记忆，记忆改善技能，技能改善未来的 AI 行为。目标不是替代人，而是增强人。

6. **从技术分层到业务分层。** `src/` 已删除。每个目录都对应企业中一个真实角色、一项真实资产或一条真实业务流程。

## 目录对应企业角色

| 目录 | 企业里对应什么 |
|------|--------------|
| `connectors/` | 数据来源 |
| `analysis/metrics/` | 数据分析 |
| `analysis/decision/` | AI 决策 |
| `analysis/explainability/` | 可解释性 |
| `review/` | 人工审核 |
| `experience/` | 企业经验 |
| `skills/` | 企业 SOP |
| `policy/` | 企业制度 |
| `workspace/` | 员工工作台 |
| `knowledge/` | 企业知识 |

## 抛弃的旧命名

| 旧名称 | 新名称 | 原因 |
|--------|--------|------|
| `signal` | `metrics` | 运营说"指标"，而非"信号" |
| `ranking` | `decision` | AI 给出决策（含 priority + recommendation），而非仅排名 |
| `trace` | `explainability` | 运营看到的是可解释性，而非执行 trace |
| `memory` | `experience` | Memory 归 Hermes Runtime 所有；业务经验才是我们的资产 |
| `dashboard` | `workspace` | Dashboard 只是 workspace 中的一个 widget |
| `collectors` | `connectors` | 不仅是"采集"——JD、ERP、Webhook、MCP 都是数据连接器 |
| `composition.ts` | `orchestrator.ts` | 编排整个业务循环，而非"组合"几个 domain |

## 设计评审标准

今后每次设计评审，只问一个问题：

> "这个目录、模块或能力，在企业里对应的是哪个真实角色、哪项真实资产、或哪条真实业务流程？"

如果回答能落到 Runtime、模型能力或工程实现上 → 属于 Hermes 或其他 Runtime。
如果能落到企业角色/资产/流程上 → 属于 AgentFabric。

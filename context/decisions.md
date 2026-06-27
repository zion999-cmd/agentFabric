# 技术决策记录 (ADR)

## ADR-000: 项目初始化
- **日期**: 2026-06-26
- **状态**: Accepted
- **决策**: monorepo 结构，按 apps/shared/workspace 划分模块

## ADR-001: Reboot 架构 (信号命名 + 权重解析)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: signal_name = `${base}_${windowDays}d`; weights keyed by BASE name; ranking matches by prefix (matchComponent)
- **原因**: 比 agentCMS 的 window=field-but-name-fixed 方式更简洁

## ADR-002: exactOptionalPropertyTypes = ON
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: tsconfig 启用 exactOptionalPropertyTypes；可选属性通过条件展开传递

## ADR-003: ContextMemory 的结构化 adjustment 字段
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: ContextMemory 带有可选 `adjustment: RankingMemoryAdjustment` 字段，在提取时设置；ranking 通过前缀匹配 (base → windowed) 进行匹配
- **原因**: 修复 agentCMS 在注入时重新解析自然语言 statement 的差异

## ADR-004: Hermes 子进程契约 (顶层 -z oneshot)
- **日期**: 2026-06-27
- **状态**: Accepted
- **契约**: `hermes -z "<prompt>" [-m MODEL] [-t TOOLSETS] [--skills SKILLS] [--safe-mode]`

## ADR-005: 删除 src/ — 从技术分层到业务分层
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 完全删除 `src/`；所有业务逻辑位于 `apps/ecommerce/`
- **原因**: agentFabric 不是通用 SDK/框架，而是具体的 Business Workspace。不存在跨 App 的 "domain" — 每个 App 拥有自己的 business capabilities。

## ADR-006: signal → metrics, ranking → decision, trace → explainability, memory → experience
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 四个核心模块的命名从工程语言改为业务语言
- **原因**:
  - signal: 运营说 "指标" 而非 "信号"
  - ranking: AI 给出 Decision (含 priority + recommendation)，而非仅仅是 Ranking
  - trace: trace 是开发视角；运营看到的是 explainability (可解释性)
  - memory: Memory 已被 Hermes Runtime 占据；Business Experience 才是我们的资产

## ADR-007: 每目录对应企业真实角色
- **日期**: 2026-06-27
- **状态**: Accepted
- **原则**: 每个目录/模块必须能回答："在企业里对应哪个真实角色、哪项真实资产、或哪条真实业务流程？"
- **不符合**: 只落到 Runtime、模型能力或工程实现上的 → 属于 Hermes 或其他 Runtime

## ADR-008: 项目记忆系统 (Four-layer Context)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 采用四层 Context 作为 AgentFabric 自身的 Project Memory (Single Source of Truth)
  - Layer 1 (几乎不变): PROJECT.md + philosophy.md
  - Layer 2 (每次 dev 更新): context/current_state.md
  - Layer 3 (重要决策记录): context/decisions.md (本文件)
  - Layer 4 (每次 dev 自动生成): context/handoff.md
  - Machine-readable: context/status.json
  - Architecture view: context/architecture_snapshot.md
- **原因**: 不是为 ChatGPT 写的 context，而是全项目共享的 Single Source of Truth — ChatGPT、Claude Code、Codex、Hermes 都读同一套 Context

## ADR-009: Path aliases (#shared, #platform, #app)
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 使用 tsconfig paths + vitest resolve.alias 实现 `#shared/*`、`#platform/*`、`#app/*` 路径别名
- **原因**: 消除深度相对路径 (../../../../shared/...) 带来的脆弱性；所有文件无论深度如何都使用统一的别名路径

## ADR-010: UI 完全复刻 agentCMS V1
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: Workspace UI 完全复刻 agentCMS V1（Agent Workspace 布局），不做任何设计变更。HTML/CSS 逐字节复制，JS 适配 agentFabric API 端点。
- **原因**: 用户要求"先把旧项目 UI 完全复刻，完成后再告诉你怎么改"。V1 UI 经过 agentCMS 两个月迭代验证，是稳定的基线。后续设计变更在此基线上进行。

## ADR-011: 目录重命名（dashboard→workspace, collectors→connectors, composition→orchestrator）
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 三个目录重命名，反映业务语言而非工程语言
- **原因**: 见 [P0002](proposals/P0002-workspace-redesign.md)。dashboard 只是 workspace 中的 widget；connectors 不只是 collectors（还有 ERP、Webhook、MCP）；orchestrator 编排整个业务循环而非"组合"几个 domain。

## ADR-012: 项目记忆系统（Four-layer Context）
- **日期**: 2026-06-27
- **状态**: Accepted
- **决策**: 每次开发会话结束后，必须更新 context/{current_state, decisions, handoff, status.json, roadmap}。这些文件是项目的 Single Source of Truth，所有 agent（ChatGPT, Claude Code, Codex, Hermes）共用。
- **原因**: 见 [chat_history3](docs/chat_history3.txt)。不是为 ChatGPT 写的 context，而是项目自己的记忆系统。

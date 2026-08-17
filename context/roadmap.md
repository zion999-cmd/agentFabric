# 路线图

## Phase 1: 基础框架 ✅
- [x] 项目脚手架 + 共享 schemas + utils
- [x] SQLite 基础设施 (connection, schema v2, init, seed)
- [x] Hermes 客户端 seam (subprocess + stub)

## Phase 2: Business Capabilities ✅
- [x] **Metrics** — calculators, pipeline, weights, repository, façade
- [x] **Decision** — 3 profiles, scoring, explainability, memory-adjustment
- [x] **Explainability** — trust score, contradictions, builder
- [x] **Experience** — weight/decay, extraction (8 pattern rules), repository
- [x] **Review** — 10-category taxonomy, queue, feedback, knowledge promotion

## Phase 3: Connectors + Workspace ✅
- [x] **Connectors** — JD/Tmall normalizer, registry, auth, adapters
- [x] **Workspace UI** — V2 nav, Discover/Memory/Reviews/Products/Settings, Evidence Hub
- [x] **Platform** — Express 5 routes, CLI, data migration

## Phase 4: 架构重构 ✅
- [x] `src/` 删除 → apps/platform/shared 三层
- [x] 命名改为业务语言 (signal→metrics, ranking→decision, trace→explainability, memory→experience)
- [x] Path aliases (`#shared/`, `#platform/`, `#app/`)
- [x] Project Memory 系统 (context files)

## Phase 5: HermesAgent + Workspace Integration ✅
- [x] **Skills** — 5 business skills (collect_data, analyze_ranking, query_signals, query_evidence, general_question)
- [x] **Chat Endpoint** — 自然语言 → 意图分类 → Kernel → 响应
- [x] **Runtime HTTP API** — Kernel 通过 HTTP 可访问
- [x] **Workspace Runtime View** — 执行历史 + 详情 + Chat 接入

## Phase 6: Context Engine 🔜
- [ ] **Business Context** — 一等公民 (campaign, business objectives, seasonality, constraints, competitor snapshot)
- [ ] 每次 Decision 前自动 Load Business Context

## P0008 系列: World Model + Instruction Architecture 🔜
- [x] P0008.1 World Model Gap Map (6 Objects + Assertion Graph)
- [x] P0008.2 World Model Contract (epistemic ≠ temporal, CapabilityBinding relationship)
- [x] P0008.3 Agent Workspace & Hermes Session Integration
- [x] P0008.4 Shared Knowledge Layer + AGENTS.md (Fabric Agent Workspace Contract)
- [x] P0008.5 Minimal World + Knowledge Bootstrap E2E (Knowledge PASS, World consumption FAIL → gap 收敛为 "缺 Instruction Architecture")
- [x] **P0008.6 Instruction Architecture Audit** (Claudian archaeology + 5-layer Instruction Layers + ownership + classification)
- [ ] P0008.6 Proposal (若 Review 通过): routing/epistemic 规则落盘 + topology 对齐 + known-fact probe 复验

## P0009 系列: Real Product Vertical Slice ✅
- [x] P0009 Real Product Vertical Slice — Product Surface / Hermes Session / Fabric Workspace / Capability Runtime / JD Acquisition / Evidence 六面接线 + startup backfill
- [x] **P0009.1 Situation Producer / 今日工作** — deterministic detection (meaningful_change/ranking_attention/cross_signal) + idempotent dedup + 复用 P0007 persistence；真实 grounded Situation 落「今日工作」
- [ ] P0009 Final Browser Acceptance — Workspace 浏览器端到端验收（待模型稳定性）

## Phase 7: Skills + Workflows 🔮
- [ ] **Business Workflows** — 618, 双11, 新品上市, 日报/周报/月报 (不是 Runtime Workflow)

## Phase 7: 后续增强 🔮
- [x] Connectors CDP onboarding (Chrome debug-mode, JD session reuse, Playwright connectOverCDP) ✅ D0002
- [ ] Replay Simulator (counterfactual comparison, management report)
- [ ] MCP tool exposure (向 Hermes 暴露 business skills)
- [ ] 反馈驱动的信号重加权 (signal usefulness → 权重推荐)
- [ ] PDD connector

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

## Phase 7: Skills + Workflows 🔮
- [ ] **Business Workflows** — 618, 双11, 新品上市, 日报/周报/月报 (不是 Runtime Workflow)

## Phase 7: 后续增强 🔮
- [x] Connectors CDP onboarding (Chrome debug-mode, JD session reuse, Playwright connectOverCDP) ✅ D0002
- [ ] Replay Simulator (counterfactual comparison, management report)
- [ ] MCP tool exposure (向 Hermes 暴露 business skills)
- [ ] 反馈驱动的信号重加权 (signal usefulness → 权重推荐)
- [ ] PDD connector

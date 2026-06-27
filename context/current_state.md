# 当前状态

**版本**: v0.1.0 | **Hermes**: v0.17.0 | **测试**: 144 passed

## 已完成

- [x] 脚手架 + 共享 schemas (7 套) + utils (math/time/crypto)
- [x] SQLite 存储 (16 tables, schema v2, WAL, 默认权重种子)
- [x] **Metrics** — 计算器 (growth/risk/density/direction/confidence), pipeline [3,7,14]d, 9 信号/产品
- [x] **Decision** — 3 profiles, 5 组件评分, explainability + decision trace, memory-adjustment 数学
- [x] **Explainability** — trust score (两支), 7 contradictions 规则, builder
- [x] **Experience** — weight formula (final_score=0.40*conf+0.30*support+0.20*importance+0.10*freshness), 指数衰减, extraction (≥5 rejects, 8 MEMORY_PATTERN_RULES), structural adjustment 持久化
- [x] **Review** — 10 类 reason category taxonomy, 24h stale queue, feedback capture, knowledge promotion (approve→case, modify→rule, reject→rule), auto-promote
- [x] **Connectors** — JD/Tmall cross-platform normalizer (spec-based alias mapping), registry, auth profile loader
- [x] **Hermes Client** — real subprocess seam (`hermes -z`), stub client, AI summary 接入 composition
- [x] **Platform** — Express 5 (health/ranking/signals/reviews/memory/trace/workspace 路由), CLI (rank/signals/collect/db:init)
- [x] **Workspace UI** — V2 nav (Discover/Memory/Reviews/Products/Settings), Evidence Hub 右侧面板, vanilla JS
- [x] **Data Migration** — agentCMS 67 products + 668 orders → SQLite
- [x] **V3 Restructure** — `src/` 删除, apps/platform/shared 三层, `#app/` `#platform/` `#shared/` path aliases, 命名 reflect 业务语言 (signal→metrics, ranking→decision, trace→explainability, memory→experience)

## 进行中

_无_

## 下一步

- [ ] **Business Context** — 一等公民: campaign / business objectives / constraints / environment (这是整个 Workspace 最重要的未完成模块)
- [ ] **Skills** — 已验证的业务 SOP 含 version / success rate / impact
- [ ] Connectors CDP onboarding (Chrome debug-mode cookie harvest via CDP)
- [ ] Replay Simulator (时间序列 replay, counterfactual comparison, management report)
- [ ] MCP tool exposure (向 Hermes 暴露 business skills 作为 MCP 服务器)

## 阻塞

_无_

# 当前状态

**版本**: v0.1.0 | **Hermes**: v0.17.0 | **测试**: 144 passed

## 已完成

- [x] **Metrics** — 计算器 (growth/risk/density/direction/confidence), pipeline [3,7,14]d, 9 信号/产品
- [x] **Decision** — 3 profiles, 5 组件评分, explainability + decision trace, memory-adjustment
- [x] **Explainability** — trust score (两支), 7 contradictions 规则, builder
- [x] **Experience** — weight/decay formulas, extraction (8 MEMORY_PATTERN_RULES), structural adjustment
- [x] **Review** — 10 类 taxonomy, 24h queue, feedback, knowledge promotion
- [x] **Connectors** — JD/Tmall normalizer, registry, auth
- [x] **Hermes Client** — subprocess seam (`hermes -z` v0.17.0), stub client, AI summary
- [x] **Platform** — Express 5, SQLite (16 tables), CLI, data migration (67 products + 668 orders)
- [x] **Workspace UI** — agentCMS V1 完整复刻: 三栏布局, sidebar (发现视图+分析视图), inbox (统计卡片+发现列表+chat pin footer), 右侧面板 (运营/开发模式切换)
- [x] **右侧面板模式** — 运营模式: V1 AI Summary + Reasoning Steps + Tool Calls; 开发模式: Trace Panel (Decision Summary → Data Sources → Execution Status, 可展开 Skills/MCP/Memory/Steps/Validation)
- [x] **V3 Restructure** — src/ 删除, apps/platform/shared 三层, path aliases (#shared, #platform, #app)
- [x] **Project Memory 系统** — context/ (architecture_snapshot, status.json, current_state, decisions, handoff, roadmap)
- [x] **Proposals** — P0001-P0003.1 (产品定位, Workspace IA, Trust UI, Review Pipeline, Skill Lifecycle, Experience Model, UI Fix)

## 进行中

_无_

## 下一步

- [ ] **Business Context** — apps/ecommerce/context/ (campaign, business objectives, seasonality)
- [ ] **Skills Engine** — 从 Experience → Skill promotion pipeline
- [ ] **Connectors CDP onboarding** — Chrome debug-mode cookie harvest
- [ ] **Replay Simulator** — time-series replay, counterfactual comparison
- [ ] **MCP tool exposure** — 向 Hermes 暴露 business skills

## 阻塞

_无_

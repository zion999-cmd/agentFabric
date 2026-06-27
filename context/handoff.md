# 交接文档

## 本次会话 (2026-06-27 04:00)

### 新增
- **6 份提案** — proposals/P0001-P0006: 产品定位、Workspace 重设计、Context 架构、Review Pipeline、Skill 生命周期、Experience 模型 (718 行)
- **Project Memory 系统** — context/{architecture_snapshot.md, status.json, current_state.md, decisions.md, handoff.md, roadmap.md}，遵循 Four-layer Context (见 ADR-008)
- **开发规范** — CLAUDE.md §Development Specification: 每次会话结束后必须更新 5+ 个 context 文件
- **AgentCMS UI 复刻** — apps/ecommerce/workspace/ 中的 HTML/CSS/JS 完全复刻 agentCMS V1 (Agent Workspace 布局: header + sidebar + inbox + decision panel + chat)
- **4 个新 ADR** — ADR-010 (UI 复刻), ADR-011 (目录重命名), ADR-012 (项目记忆系统)

### 重构
- `dashboard/` → `workspace/` — Dashboard 只是 workspace 中一个 widget；Agent Workspace 才是产品
- `collectors/` → `connectors/` — 不只是采集 (JD)，还有 ERP、Webhook、MCP 等数据连接器
- `composition.ts` → `orchestrator.ts` — 编排整个业务循环 (Collect → Context → Metrics → Decision → Review → Experience → Skill)
- 所有 imports + docs + configs 更新完成 (#app/workspace, #app/connectors, #app/orchestrator)

### 删除
- 旧 apps/ecommerce/dashboard/ (3 files) — 被 workspace/ 替换
- 旧 apps/ecommerce/collectors/ 目录 — 重命名为 connectors/
- 旧 apps/ecommerce/analysis/composition.ts — 重命名为 orchestrator.ts
- 旧 workspace/ 占位目录 — 已清理

### 测试
- **144 passed** (14 files, contract + domain + unit + integration)
- Typecheck: clean (strict, exactOptionalPropertyTypes)
- Hermes: v0.17.0 confirmed, real subprocess AI summary working
- Dev server: 正常启动，/api/workspace/findings 返回 67 条数据

### 风险
- Chat 功能当前为 stub (Hermes 子进程 chat 模式未通，需确认 `--source tool` 不支持 chat 子命令)
- 部分 agentCMS API 端点无对应 agentFabric 实现 (shadow/dashboard, trace/replay) — Trends/Archive 视图已从侧边栏移除
- Business Context 模块尚未开始

### 建议下一步
1. 用户查看复刻的 UI，提出修改方向
2. **Business Context** — apps/ecommerce/context/ (campaign, business objectives, seasonality)
3. **Skills** — 从 Experience 驱动的自动化规则 (自带 Prompt, version, success rate)

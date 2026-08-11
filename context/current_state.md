# 当前状态

|**版本**: v0.2-phase2-workspace | **Hermes**: v0.18.0 | **测试**: 412/413 passed | **发现**: 70 APIs, 10 Business Contexts | **JD Evidence**: 594 files (Jan-Aug 2026)

## 已完成

- [x] **Phase 2 Agent Cognitive Workspace** — Human ↔ Agent ↔ Capability ↔ Evidence. Agent Session (主视图, UI state contract, Phase 3 接 HermesAgent), Capability Explorer (11 capabilities, domain filter, intent search), Evidence Viewer (provenance chain + evidence timeline). GET /api/capabilities, GET /api/evidence/:id. JS loaders 实现. 测试 412/413 pass. Tag: v0.2-phase2-workspace. 无 CBP 污染. ADR-030
- [x] **P0006.5.3 Capability Contract** — Schema (intent/inputs/outputs/provider), Generator (11 capabilities, 48 metrics, 8 domains), Registry (searchByIntent, findByMetric, findByDomain), CLI (generate-contract, describe-capability). Contract Artifact: generated/capability-contract.json. ADR-029
- [x] **P0006.2 Real Data Runtime Replay** — 验证完整闭环: Evidence Store (573 真实 CDP 文件) → Historical Acquire → Runtime Kernel (190 天逐日执行) → Signal (3,489 signals) → Workspace (Runtime Timeline). 修复 `parseAcquiredData` 证据数据包装 + `jd-schema.ts` SQL 分号. 0 errors, 全部真实 GMV 数据 (¥4,628~¥14,230/天). ADR-027
- [x] **P0006.2 Historical Replay Runtime** — Replay Runner (日期循环→kernel.execute), Historical Acquire (evidence store + mock fallback), POST /api/runtime/replay, Workspace Replay 面板. 零修改 Kernel/Signal/Evidence/Ranking/Memory
- [x] **P0006.1.1 Signal Observation Model Refactor** — 数据模型升级: Signal 两层模型 (Type/Observation 分离), `observed_at` 列 + 新 UNIQUE 约束 `(entity_type, entity_id, signal_name, window, observed_at)`. 三层时间轴 (Business/System/Execution). 回退小时后缀补丁, signal_name 恢复纯净类型名. Schema v3 migration
- [x] **P0006 HermesAgent & Workspace Integration** — 4 工作流: Skill Definitions (5 skills, pattern matching + HermesAgent 意图分类), Runtime HTTP Routes (kernel.execute via HTTP, execution history), Chat Endpoint (自然语言 → 意图 → 执行 → 响应, 完整 agent loop), Workspace Runtime View (执行历史 + 详情 + Chat 接入). 24 新测试, 零修改 Kernel/Connector/Orchestrator
- [x] **P0005.2 Discovery-Driven Connector Architecture** — 4 阶段: API Inventory (70 APIs→6 模块自动分类), Schema Evolution (SHA-256 hash, JD 升级自动感知), Indicator Dictionary (JDR key 自动解析→canonical metric), Business Context Generator (11 规则从字段名生成 Context, 程序员不再手写). P0005.1 零修改, 90 新测试
- [x] **P0005.3 Discovery Capability Generator** — 5 Phase: Capability Discovery → Evidence Analysis → Semantic Mapping → Blueprint Generation → Coverage Analysis. 6 模块, `generated/` 输出 5 个 JSON (687KB), CLI `generate-blueprint`, 37 新测试
- [x] **P0005.6.1 CLI Final Patch** — CLI 变为纯入口壳层: 移除所有直接业务逻辑调用 (acquireJdData, saveEvidence, normalizeSignal, SignalFacade.store). 新增 kernel.executeLiveCDP() + kernel.executeImport(). createEmptyBlueprint 支持无 Discovery 环境. CLI imports -60%
- [x] **P0005.6 Execution Convergence** — processDay() 完全删除. Live CDP 路径 → generateSignals + captureEvidence. cmdImportJd → signal-engine (blueprint fallback). 零 legacy path. 单条执行河流: CLI → Kernel → Binding → Connector → Evidence/Signal
- [x] **P0005.5 Runtime Convergence Layer** — 统一运行时收敛层: Runtime Kernel (createRuntimeKernel), Normalizer Resolver (3-layer: overrides→generated plan→JD_SPEC, 895 canonical vs old 16), Signal Engine (blueprint-driven signal生成), Evidence Orchestrator (blueprint-driven evidence), Runtime Executor (unified pipeline). CLI 改为 Kernel 入口. 35 新测试
- [x] **P0005.4 Connector Binding Layer** — generated/ 从 orphaned 变为 Connector 的 Single Source of Truth. 新模块 `binding/` (types, loader, planner, executor), JD connector 重构 (manifest 来自 blueprint, indicator-map 用 generated dict + overrides, normalizer 用 plan spec). 33 新测试
- [x] **ADR-019** — Connector 不得定义 Business Context. Context 从 Discovery 数据字段生成
- [x] **ADR-020** — Capability is data, not code. Connector 只执行 blueprint, 不定义能力
- [x] **Metrics** — 计算器 (growth/risk/density/direction/confidence), pipeline [3,7,14]d, 9 信号/产品
- [x] **Decision** — 3 profiles, 5 组件评分, explainability + decision trace, memory-adjustment
- [x] **Explainability** — trust score (两支), 7 contradictions 规则, builder
- [x] **Experience** — weight/decay formulas, extraction (8 MEMORY_PATTERN_RULES), structural adjustment
- [x] **Review** — 10 类 taxonomy, 24h queue, feedback, knowledge promotion
- [x] **Connectors** — JD/Tmall normalizer, registry, auth
- [x] **Hermes Client** — subprocess seam (`hermes -z` v0.17.0), stub client, AI summary
- [x] **Platform** — Express 5, SQLite (16 tables), CLI, data migration (67 products + 668 orders)
- [x] **Workspace UI** — agentCMS V1 完整复刻: 三栏布局, sidebar, inbox, 右侧面板 (运营/开发模式)
- [x] **V3 Restructure** — src/ 删除, apps/platform/shared 三层, path aliases (#shared, #platform, #app)
- [x] **Project Memory 系统** — context/ 全部文件 + mandatory update workflow
- [x] **Runtime Control Plane (P0004)** — RuntimeAdapter, ExecutionPlan, Registry, Router, HermesAdapter, 24 新测试
- [x] **JD Business Data Connector (P0005.1)** — Evidence Store, JD parser, CDP acquisition, CLI collect, manifest, 24 新测试. 完整链路: Acquisition → Evidence → Parse → Normalize → Business Context
- [x] **JD 商智功能文档抓取** — 34 个模块的完整用户手册 + 指标定义 + 资费说明, data/jd_shangzhi_features/ (3.1 MB)
|- [x] **D0002 JD Capability Discovery** — CDP 自动遍历 15 页面, 捕获 70 API 端点 (1,060 次调用), 生成能力矩阵, 7 业务上下文已验证, 1 被阻塞 (竞争分析需订阅). discovery/jd-capability/ (20 MB)
|- [x] **ADR-026: JD Persistence Layer** — `platform/storage/jd-schema.ts` (4 tables) + `jd-persistence.ts` (CDP → SQLite bridge). UPSERT 语义, 采集任务追踪, 指标时序存储. `init.ts` 集成 schema 应用. 修复 `historical-acquire.ts` 类型错误 (No `any` 规范)

## 进行中

_无_

## 下一步

待根据实际运行情况决定

## 阻塞

- [ ] **竞争分析模块** — 需 ¥8,856/年 数据尊享包订阅才能获取 API 数据
- [ ] **实时/流量/服务页面 API** — 跨子域 SPA 路由需特殊导航逻辑

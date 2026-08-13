# 当前状态

|**版本**: v0.2-p0008.6-audit | **Hermes**: v0.18.0 | **测试**: 489/491 passed | **真实 CDP**: ✅ 已验证 (2026-08-12: GMV=¥337.90) | **发现**: 70 APIs, 10 Business Contexts | **JD Evidence**: 594 files (Jan-Aug 2026)

## 已完成

- [x] **P0008.6 Instruction Architecture Audit** — Claudian archaeology → Fabric mapping → P0008.5 failure 五维解读 → 5-layer Instruction Layers → ownership boundary → operational capability classification. 核心结论: (1) Claudian 有 3 条指令轨道(repo AGENTS.md / runtime system prompt / user vault instruction)，orientation 在 system prompt 而非 AGENTS.md，agentFabric 必须反转到 workspace-root AGENTS.md；(2) Claudian 无 router/INDEX，INDEX 是 agentFabric 自己发明的；(3) P0008.5 World 消费失败根因 = world/ 只有 WRITE-side 指令、无 READ-side 指令，缺 orientation(subject)/routing/scope(operational)/navigation(pointer)/semantics(epistemic authority) 五环；(4) 4 个已验证行为全部是 Instruction+Navigation+Procedure，无一是 Runtime Skill 或 Fabric Capability。交付 `proposals/audits/p0008.6-claudian-instruction-architecture.md`。仅 audit，未改 workspace/未重跑 Blank Agent。ADR-033。

- [x] **P0008.5 Minimal World + Knowledge Bootstrap E2E** — 三条链验证 + 一个不对称收敛。✅ Exploration Artifact + World Contract → structured world/（Contract 清晰即可，非模型聪明）；✅ Human Document + Knowledge Governance → Shared Knowledge（semantic compilation 非格式转换）。⚠️ Blank Runtime consumption 不对称：Knowledge 继承成立，World 消费失败（known-fact 0/3）。逐层排除 Content Gap → INDEX 缺失（加了也 indexRead:false）→ world/→systems/ 命名（1/3 部分提升），收敛为**缺 Workspace-level Instruction Architecture**。ADR-032。

- [x] **P0008.4 Agent Shared Knowledge Layer** — Shared Knowledge 非 Wiki，是 "Raw Source → Agent semantic compilation → persistent Shared Knowledge"（借鉴 Karpathy LLM Wiki 维护 pattern）。四层 Context Environment（world/knowledge/situation/Hermes profile）绝不合并。AGENTS.md = Fabric Agent Workspace Contract（Hermes 原生加载，指向 KNOWLEDGE.md 不复制）。ownership: raw/ immutable provenance；knowledge/ = Agent 维护 Read Model（非 canonical truth）。诚实发现：Blank Hermes 加载 AGENTS.md 但 research 任务默认 web_search，缺"workspace 优先"规则。ADR-031。

- [x] **P0008.3 Agent Workspace & Runtime Integration** — FabricAgentWorkspace（authoritative state → runtime-facing 投影，deterministic/rebuildable，只写不读回）+ HermesSessionClient（speak /api/ws JSON-RPC，只接线不复现 session）+ Situation Chat Bridge（只接人↔Session）。Memory/Skill/SOUL 归 Hermes Profile。E2E PASS（session.create cwd=FabricWorkspace，模型自主 filesystem 读取）。ADR-030。

- [x] **P0008.2 Complete** — World Model Contract. 三层分离: World Object(6 types) / World Assertion(subject→predicate→object + epistemicStatus + temporalStatus) / Capability Binding(relationship 语义). epistemic(suspected/observed/verified) ≠ temporal(active/superseded/retired) 两个正交生命周期. evidenceRefs 是 reference interface(World Evidence semantics 未实现). 28 stress tests. 无 Builder/Query/Registry. ADR-029.

- [x] **P0008.1 Complete** — Contract Archaeology & Gap Map. 三组资产(discovery/jd_shangzhi_features/WorldExplorationTask)考古. 最大发现: Hermes 零 schema 独立产出全套 World primitive + epistemic 标记. 收敛 7→6 primitives(去掉 Entity/Concept). ADR-028.

- [x] **P0007.1 Complete** — Learning Context Contract. Situation/Case anchor, Observation/AgentActivity/Intervention/Action/Outcome reference placeholders. summary (not provenance). metricsSnapshot (derived, not authoritative). relatedActionIds (association, not causation). respondsToActivityIds (Case C). 17 contract tests. Runtime-neutral. No Hermes/JD private fields. Tag: v0.2-p0007.1-complete.

- [x] **P0007 Proposal** — Experience → Memory → Skill architecture. agentFabric: World → Learning Context; Runtime: Learning Context → Memory → Skill. 6 sub-proposals (P0007.1–7.6). Legacy P0007.3 archived. Key boundary: agentFabric 不实现 Memory Engine/Skill Generator. ADR-023.

- [x] **Phase 3 Complete** — HermesAgent Integration (3.1–3.4). CapabilityBridge → discover_capability skill → kernel.execute(real evidence) → SSE events → Agent Activity. Live CDP verified (2026-08-12: 14 APIs, GMV=¥337.90). chat.ts switched to mock:false. Tag: v0.2-phase3-complete. ADR-022.
- [x] **Phase 3.4 E2E Capability** — chat.ts: bridge.discover handler + auto-execute flow. CapabilityBridge → kernel.execute → real evidence → response. Live CDP: CL​I collect --mode live verified.
- [x] **Phase 3.3 Workspace Event Binding** — SSE endpoint (5 events, demo sequence), AgentSessionState model, loadAgentSession() rewrite, execution-level event slots.
- [x] **Phase 3.2 Hermes Capability Discovery** — CapabilityBridge (searchByIntent/getById/findByDomain), discover_capability skill registration, 13 contract tests.
- [x] **Phase 3.1 Runtime Kernel Contract** — ExecutionRequest + ExecutionEvent Zod schemas, 7 event types, Agent-agnostic contract. 20 contract tests. ADR-021. 无 Hermes/CDP/UI 修改.
- [x] **Phase 3 HermesAgent Integration Proposal** — workspace-v0.2-phase3-hermes-integration.md. 四个核心设计: (1) HermesAgent → CapabilityRegistry.searchByIntent() 能力选择, (2) Runtime Kernel 作为共享 Capability Execution Layer, (3) Observable Event Model 8 种事件类型, (4) POST /api/runtime/chat 异步 task 模型 + SSE 事件流. NOT Included: HermesAgent 内部实现, Skill/Memory 系统, MCP, 多轮对话.
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

- [ ] **P0008.6 Architecture Review** — 等待对 `proposals/audits/p0008.6-claudian-instruction-architecture.md` 的 Review。Audit 已按任务要求停在"只定义 ownership/representation，不实现"，下一步方向（是否补 routing/epistemic 到 AGENTS.md + WORLD_MODEL 落盘 + topology 对齐 + 重跑 3 known-fact probes）待 Review 拍板。

## 下一步

- 基于 P0008.6 Audit 决定是否创建正式 P0008.6 Proposal（含 Instruction Layers 的 canonical 定义 + routing/epistemic 规则形态 + 验收方案）
- 待决: scoped instruction 命名（统一 AGENTS.md vs 描述性名）、`systems/` vs `world/` 定案、dangling `contracts/WORLD_MODEL.md` 落盘、`capability/` vs `capabilities/` 对齐

## 阻塞

- [ ] **竞争分析模块** — 需 ¥8,856/年 数据尊享包订阅才能获取 API 数据
- [ ] **实时/流量/服务页面 API** — 跨子域 SPA 路由需特殊导航逻辑
- [ ] **P0008.6 依赖 Review 决策** — 未获 Review 前，不得修改 AGENTS.md / systems/ / knowledge/ / capability/，不得重跑 Blank Agent（P0008.6 NOT Included 边界）

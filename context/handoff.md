# 交接文档

## 本次会话 (2026-08-12) — P0007.1 Learning Context Contract

### P0007.1 Implementation

- `shared/schemas/learning-context.ts`: Situation/Case anchor + Observation + Agent Activity + Human Intervention + Action + Outcome schemas. Open/partial/mature lifecycle. Runtime-neutral.
- `tests/contract/learning-context.contract.ts`: 12 tests (situation, lifecycle, real JD evidence, intervention types, incremental enrichment)
- Real JD validation: context built from live CDP evidence (2026-08-12, GMV=¥337.90). No fake intervention/action/outcome.
- Tests: 456/458 pass (2 pre-existing failures)

### P0007 Restructure
Sub-proposals reordered: 7.1 Contract → 7.2 Grammar → 7.3 Domain Workspace → 7.4 Outcome → 7.5 Trust → 7.6 Hermes Loop. Architecture diagram updated with Situation/Case + Domain Workspace.

---

## 本次会话 (2026-08-12) — Phase 3 Complete + P0007 Proposal

### P0007 Architecture

新 P0007-Experience-Memory-Skill.md 创建。旧 P0007.3-memory-retrieval.md → proposals/archive/。

核心架构决策：
- agentFabric: World → Learning Context（不实现 Memory/Skill Engine）
- Runtime: Learning Context → Memory → Skill（HermesAgent 自有学习机制）
- Learning Context 是 Runtime-neutral 的成长接口
- 6 个子 Proposal (P0007.1–7.6)，逐层验证
- Trust 是横向能力，不是单一分数

---

## 本次会话 (2026-08-12) — Phase 3 Complete + Live CDP Verification + mock→real switch

### Phase 3 Closeout

Phase 3.1–3.4 全部完成。E2E 链路已验证：

```
CapabilityBridge.searchByIntent("分析最近30天流量")
  → traffic.overview (score: 22.0)
  → discover_capability skill → bridge.discover handler
  → kernel.execute({ mock: false }) → real evidence data
  → SSE event stream → Agent Activity panel
  → POST /api/chat → capability + execution → response
```

Live CDP 验证: CLI `collect jd --mode live --date 2026-08-12` → 14 API responses, GMV=¥337.90, orders=2, visitors=23.

chat.ts 已切换 mock:false — 全部使用真实 evidence 数据。

### Known Debt
- SSE demo sequence (Phase 4: connect to real HermesAgent task events)
- resetCapabilityBridge() test export in production module (low priority)

### Tag
v0.2-phase3-complete

---

## 本次会话 (2026-08-11) — Phase 2 Workspace + Proposal Taxonomy + Phase 3 Design + Phase 3.1

### Phase 3.1 Runtime Kernel Contract

- **文件**: `shared/schemas/execution.ts` + `tests/contract/execution.contract.ts` + `docs/runtime-kernel-contract.md`
- **范围**: 纯 Contract — 无 Hermes/CDP/UI 修改
- **内容**:
  - `ExecutionRequest`: { taskId, capability, inputs, context } — Agent 请求 Kernel 执行
  - `ExecutionEvent`: 7 种事件类型 (execution.started → execution.failed)
  - 20 contract validation tests — 全部通过
  - 事件描述执行状态，不描述模型思维 (无 thinking/reasoning)
  - Contract 是 Agent-agnostic — 任何 Agent Runtime 都可用
- **与 Capability Contract 关系**: Contract 定义 WHAT; Execution Contract 定义 HOW TO REQUEST
- **下一步**: Phase 3.2 Hermes Capability Discovery (searchByIntent bridge)

---

## 本次会话 (2026-08-11) — Phase 2 Workspace + Proposal Taxonomy + Phase 3 Design

### 做了什么

完成 P0006.5.3 Capability Contract 后，实现 Phase 2 Agent Cognitive Workspace（Human ↔ Agent ↔ Capability ↔ Evidence），规范化 proposals/ 目录命名体系，并创建 Phase 3 HermesAgent Integration 设计提案。

### Phase 3 Hermes Integration Proposal

- **文件**: `proposals/workspace-v0.2-phase3-hermes-integration.md`
- **格式**: Feature Proposal（非 P-number；日后可升级为 P0006.3）
- **核心设计**:
  1. HermesAgent → CapabilityRegistry.searchByIntent() → 选择能力（不执行采集）
  2. Runtime Kernel 作为 Capability Execution Layer（共享于所有 Agent Runtime）
  3. Observable Event Model: intent.resolved → capability.selected → execution.started → acquisition.* → evidence.created → execution.completed → response.ready
  4. POST /api/runtime/chat：异步 task 模型（SSE 事件流），不是同步 Chat API
- **Phase 2 vs Phase 3 关系**:
  - Phase 2: UI shell（static event slots + disabled input）
  - Phase 3: 接通 HermesAgent，UI 消费真实事件流
  - P0006.5.3: Capability Contract（Phase 3 HermesAgent 的查询入口）

### Phase 2 Workspace UI 实施

- **Agent Session**（主视图）: UI state contract 定义，5 个 observable event slots，"Runtime integration unavailable" 状态（Phase 3 接 HermesAgent）
- **Capability Explorer**: GET /api/capabilities → domain filter + intent search + capability cards（11 capabilities, 48 metrics, 8 domains）+ detail view
- **Evidence Viewer**: GET /api/evidence/:capabilityId → provenance chain（capability → discovery artifacts → evidence records → timeline）
- **Sidebar**: AGENT section（顶部）+ CAPABILITY section（新增），现有视图完整保留
- **Boot**: Agent Session 为默认首页
- **JS**: loadAgentSession / loadCapabilityExplorer / loadEvidenceViewer 三个 loader 实现
- **审计**: Phase-2-Implementation-Audit.md — 初始发现 3 个 undefined loader + 2 个 bug，全部修复
- **Tag**: v0.2-phase2-workspace
- **测试**: 412/413 pass（1 pre-existing coverage threshold）
- **事故防控**: 零 CBP/bridge 污染，零 Hermes 认知伪造，零 Phase 3 越界

### Proposal 命名规范化

- 17 个文件重命名：PascalCase→kebab-case，修复 typo（"Capalibity"→"capability"），修复截断（"Integrat"→"integration"），下划线→连字符，移除特殊字符（&）
- 1 个死链修复：`P0002-workspace-information-architecture.md` → `P0002-workspace-information-architecture.md`
- 创建 `proposals/README.md` — taxonomy, naming convention, examples, next available P numbers
- 更新 `context/decisions.md`（ADR-019: Proposal 命名规范）+ cross-reference 更新
- 更新 `context/current_state.md`（版本 v0.2-phase2-workspace, 新增完成项）

### 命名规则

- Architecture Proposal: `P{NNNN}[-{N}]-{kebab-case-description}.md`
- Feature/Phase Proposal: `{module}-v{version}-phase{N}-{description}.md`
- 全小写 kebab-case，只用连字符，不用下划线/特殊字符/PascalCase

### 下一步

Phase 3: HermesAgent Integration — 接通 POST /api/runtime/chat + 将 Agent Session 从 static shell 升级为实时 Agent 交互。

---

## 本次会话 (2026-08-09) — P0006.2 Real Data Replay Verification

### 做了什么（一句话）

用户要求验证"JD 是否可以用真实数据一天一天 runtime"。经全链路审计 (JD Connector → Blueprint → Runtime → Evidence Store → CDP) + 实际运行 190 天 full replay，确认闭环已存在且可用。修复 2 个 blocking bug 后，190/190 天全部成功，3,489 signals 含真实 GMV 数据。

### JD Historical Capability Report (审计结果)

**A. Direct Runtime Backfill: YES** ✅
- `kernel.execute({ date })` 支持逐日参数
- `runReplay({ from, to })` 日期循环调用 kernel.execute()
- Evidence store 有 573 个真实 CDP 文件 (2026-01-01 ~ 2026-07-09)

**B. Need Historical Connector: NO** (已有)
- `createHistoricalAcquire()` — evidence store → mock fallback
- 不需要新增架构层，现有历史采集+回放已完整

**C. Need CDP Historical Navigation: ALREADY EXISTS** ✅
- CDP client passive intercept — 修改 POST body date fields
- 支持 arbitrary date range via `fromDate`/`toDate`
- 不需要页面导航/日期选择器交互

### 修复的 Bug

1. **`jd-schema.ts` SQL 分号缺失** — `db.exec(STATEMENTS.join('\n'))` → `join(';\n')` (对齐 schema.ts 模式). 导致 `npm run db:init` 失败

2. **Evidence store 数据解析失败** — `parseAcquiredData()` 中 `asArray()` 将单对象 evidence 数据当作空数组处理, parser 永远返回 empty values. 修复: `const wrapped = Array.isArray(data) ? data : [data]`

### 验证数据

| 指标 | Before (Bug) | After (Fix) |
|------|-------------|-------------|
| 3天 replay signals | 3 (all value=0) | 64 (real GMV) |
| 190天 full replay | N/A | 190/190 completed, 3,489 signals |
| Evidence | 0 | 570 records |
| Errors | 3 | 0 |
| GMV 范围 | ¥0 | ¥4,628 ~ ¥14,230/天 |

### 已知限制

- `EnterpriseSignal.metrics` (gmv, orders, uv, cvr 等子字段) 未被 repository.toRow 持久化到 SQLite. Workspace 通过 `signal_value` 展示 GMV 功能正常
- Rankings 全部 uniform score (0.4648) — 与 replay 无关, 是 seed product/order 数据问题
- CDP live 采集需要 Chrome + 登录态 (手动步骤)
- Evidence store 方法标记为 "cdp" 但数据字段已 canonicalized (header.code→0, body.data.gmv, etc.) — 怀疑是 import 而非原生 CDP 采集

### 关键架构确认

```
JD 商智 → CDP (Chrome 登录态) → Evidence Store → Historical Acquire → Runtime Kernel → Signal → Workspace
```
这个闭环已完整验证通过。

### 风险

- **CDP Live 未重新验证** — 当前 evidence store 数据来自历史采集, 未确认 JD 商智 SPA 结构是否有变化
- **Hourly 信号来自 trend evidence** — evidence store 的 trend 数据包含 24 小时时间序列, 解析正确 → 61 hourly_traffic signals/天
- **Ranking 数据质量问题** — product-level computed signals 值为 0, 因 order 数据与 evidence 不对齐

### 建议下一步

1. **P0006.2 Workspace Timeline** — Runtime 页面显示 190 天执行历史 (当前 limit=20)
2. **补全 metrics persistence** — toRow/fromRow 添加 metrics 序列化
3. **重新 CDP 采集** — 用当前 JD 商智验证 CDP live 路径仍可用
4. **P0007 Memory / Replay Analysis** — 用 180 天真实 replay 数据分析 Ranking 稳定性 + Memory 价值

---

## 本次会话 (2026-07-09) — P0006 + P0006.1 + P0006.1.1

### 做了什么（一句话）

完成 HermesAgent & Workspace Integration（P0006）→ 通过 P0006.1 Product Readiness Checklist 发现 Signal 跨日期持久化缺陷（C1）→ 执行 P0006.1.1 Signal Observation Model Refactor 修复数据模型。

### 新增

**P0006 — HermesAgent & Workspace Integration** (4 files, ~755 lines)
1. `apps/ecommerce/skills/definitions.ts` — 5 business skills (collect_data, analyze_ranking, query_signals, query_evidence, general_question)
2. `apps/ecommerce/skills/registry.ts` — Intent matching (pattern + HermesAgent fallback) + response generation
3. `platform/server/routes/chat.ts` — Agent Loop: `POST /api/chat` (intent→dispatch→response), `GET /api/chat/skills`
4. `platform/server/routes/runtime.ts` — Kernel HTTP: `POST /api/runtime/collect`, `GET /api/runtime/executions`, `GET /api/runtime/executions/:date`, `GET /api/runtime/status`

**P0006.1.1 — Signal Observation Model Refactor** (8 files modified)
1. `shared/schemas/signal.ts` — SignalSchema +`observed_at: IsoDateString`
2. `platform/storage/schema.ts` — v3 migration: +observed_at column, 新 UNIQUE `(entity_type, entity_id, signal_name, window, observed_at)`; 从 signal_id 回填旧数据
3. `apps/ecommerce/connectors/normalizer.ts` — normalizeSignal: `timestamp→observed_at`
4. `apps/ecommerce/analysis/metrics/repository.ts` — toRow/fromRow +observed_at; storeSignals 新 UNIQUE; ORDER BY observed_at
5. `apps/ecommerce/analysis/metrics/pipeline.ts` — 计算信号使用 pipeline 时间作为 observed_at
6. `apps/ecommerce/runtime/kernel/runtime-signal-engine.ts` — **回退**小时后缀补丁 (`hourly_traffic_14`→`hourly_traffic`); 删除 extractHour()
7. `platform/server/routes/runtime.ts` — 使用 observed_at 分组执行历史
8. `platform/server/routes/chat.ts` — 使用 observed_at 分组日期

### 重构

- `platform/server/index.ts` — +2 imports (chatRouter, runtimeRouter), +2 route mounts
- `apps/ecommerce/workspace/index.html` — +Runtime sidebar + view container
- `apps/ecommerce/workspace/app.js` — +apiPost(), +loadRuntime(), +Chat 接入
- `tests/unit/runtime/kernel/signal-engine.test.ts` — signal_name 纯净类型断言; observed_at 唯一性断言

### 删除

- `runtime-signal-engine.ts`: extractHour() helper
- `runtime-signal-engine.ts`: signal_name mutation 逻辑 (`_14` 后缀)
- `runtime.ts`, `chat.ts`: extractDateFromSignalId() — 不再从 signal_id 提取日期

### 设计决策

- **ADR-024**: Agent Loop 由 agentFabric 拥有。HermesAgent (语言) + agentFabric (dispatch)。Skills as Data。
- **ADR-025**: Signal Observation Model — 三层时间轴 (Business: observed_at / System: ingested_at / Execution: pipeline_run_id)。Signal Type 与 Observation 两层分离。

### 测试 — 413 passed (389 existing + 24 P0006 new; 零净增)

### 风险

- Hermes 二进制不可用: Chat 使用 StubHermesClient，回复为 responseTemplate fallback 文本
- Workspace 7 处 placeholder 文案（加载态初始值，属正常 UI pattern）

### P0006.1 Readiness Report 结论

C1 (Signal 跨日期不持久化) 已通过 P0006.1.1 修复。验证: production DB 含 4 个日期的信号 (2026-06-27, 2026-07-04, 2026-07-05, 2026-07-09)。
Chat Agent Loop 完整闭环: intent=collect_data → kernel.execute() → 25 signals。
Hermes 不可用导致 reply 为 fallback 文本，不阻塞 Runtime 执行。

### 建议下一步

1. MCP Tool Exposure — 向 HermesAgent 暴露 skills 为 MCP tools
2. Chat 多轮对话 — Session 管理 + 消息历史
3. PDD Connector

## 本次会话 (2026-07-12) — JD Persistence Layer + Type Fix

### 做了什么（一句话）

建立 JD 数据持久化层（SQLite schema + persistence bridge），修复 `historical-acquire.ts` 类型错误，严格遵循 CLAUDE.md 规范（No `any`）。

### 新增

1. **`platform/storage/jd-schema.ts`** — 4 张 SQLite 表
   - `jd_raw_data` — 原始行数据（UPSERT by dataset_id + source_page + row_index + data_date）
   - `jd_collection_runs` — 采集任务追踪（日期范围、数据集、行数、状态）
   - `jd_dataset_metadata` — 数据集元数据预注册（productTop, summary, trend 等）
   - `jd_metric_timeseries` — 指标时序（UPSERT by dataset_id + entity_id + metric_name + data_date）

2. **`platform/storage/jd-persistence.ts`** — CDP 采集 → SQLite 桥接层
   - `extractRowsFromPayload()` — 从 API 响应体提取行数据
   - `extractMetricsFromRows()` — 从行数据提取数值指标
   - `persistJdData()` — 主持久化函数，接收 `AcquireResult` → 写入 SQLite

### 修改

| 文件 | 改动 |
|------|------|
| `platform/storage/init.ts` | +`applyJdSchema()` 调用，+`seedJdDatasets()` 调用 |
| `apps/ecommerce/connectors/jd/historical-acquire.ts` | 修复 `MockJdPayload` 类型转换（`as any` → `key in mock` 类型守卫） |

### 重构

- `jd-persistence.ts` 最初放在 `apps/ecommerce/connectors/jd/`，后移至 `platform/storage/`（基础设施层，非业务层）

### 设计决策

- **ADR-026**: JD Persistence Layer — 持久化层属于 platform/storage（基础设施），不属于 connectors（业务执行）
- **No `any` 规范**: `historical-acquire.ts` 类型修复使用 `key in mock` 类型守卫 + `keyof MockJdPayload`，严格遵守 CLAUDE.md "No `any` — use `unknown` and narrow"

### 测试

- `npm run typecheck` — 零错误通过
- 无新增测试文件（schema 和 persistence 逻辑由后续测试覆盖）

### 风险

- `jd-persistence.ts` 尚未被实际采集流程调用 — 需要 connector 层集成
- `jd_metric_timeseries` 的指标提取逻辑依赖 API 响应体结构，京东 API 变更时需同步更新

### 建议下一步

1. 集成 `persistJdData()` 到 `kernel.execute()` 或 `kernel.executeLiveCDP()` 管线
2. 编写 `jd-persistence.ts` 单元测试（行提取、指标提取、UPSERT 逻辑）
3. 编写 `jd-schema.ts` 集成测试（表结构验证、数据读写）

## 历次会话

### 上次会话 (2026-07-04) — P0005.6.1 CLI Final Patch

**CLI 变为纯入口壳层，所有业务逻辑移入 Kernel。** 这是 P0005.x 收敛的最后一块拼图。

### 背景

P0005.5 创建了 Runtime Kernel，P0005.6 删除了 `processDay()`。但验证审计发现仍有 2 个 bypass：
1. **Live CDP**: `acquireJdData()` 在 CLI 中直接调用，planner/executor 未参与
2. **Import-jd**: `saveEvidence()` 和 `SignalFacade.store()` 在 CLI 中直接调用，有 legacy fallback

P0005.6.1 的目标：CLI 不执行任何业务逻辑，只做 Kernel 调用入口。

### 新增

1. **`executeLiveCDPPipeline`** (runtime-executor.ts, ~90 行)
   - 多日 CDP 采集 + 逐日 signal/evidence 处理，全部在 kernel 内完成
   - Kernel 方法: `kernel.executeLiveCDP({ shopId, fromDate, toDate })`
   - 返回 `RuntimeLiveCDPResult`: success, totalSignals, totalEvidence, per-day results

2. **`executeImportPipeline`** (runtime-executor.ts, ~120 行)
   - 读取历史 JSON → 逐 record 保存 evidence (3 types) → 生成 signal
   - Blueprint 可用时走 signal-engine；否则走 legacy normalizeSignal + SignalFacade.store
   - Kernel 方法: `kernel.executeImport({ sourcePath })`
   - 返回 `RuntimeImportResult`: success, totalEvidence, totalSignals, recordCount

3. **`createEmptyBlueprint`** (runtime-executor.ts, ~30 行)
   - 创建合法的"空状态" BoundCapabilityModel
   - 所有 rules/signal_types/capture_rules 为空 → 各 pipeline 自动 fallback 到 legacy
   - 用于 import-jd 无 Discovery 数据的环境

### 重构

**`scripts/cli.ts`** — 从 20 imports 缩减到 6 imports:
- ❌ 删除: `acquireJdData`, `saveEvidence`, `normalizeSignal`, `generateSignals`, `captureEvidence`, `buildSpecFromBlueprint`, `INDICATOR_OVERRIDES`
- ✅ 保留: `createRuntimeKernel`, `createEmptyBlueprint`, `loadBlueprint`, `SignalFacade` (read-only in cmdSignals)
- Live CDP: 68 行 → 32 行 (kernel.executeLiveCDP)
- Import-jd: 60 行 → 22 行 (kernel.executeImport with empty blueprint fallback)

### 架构状态

```
Before (P0005.6):
CLI
 ├── kernel.execute()          ✅ mock only
 ├── acquireJdData()           ❌ live CDP bypass
 ├── generateSignals()         ⚠️ partial
 ├── captureEvidence()         ⚠️ partial
 ├── saveEvidence()            ❌ import-jd bypass
 └── SignalFacade.store()      ❌ import-jd bypass

After (P0005.6.1):
CLI
 ├── kernel.execute()          ✅ mock + single-day
 ├── kernel.executeLiveCDP()   ✅ multi-day CDP
 └── kernel.executeImport()    ✅ historical import
```

### 测试

- 387 tests 全部通过
- Typecheck 通过 (exactOptionalPropertyTypes strict)
- 无新增测试文件（逻辑从 CLI 移到 kernel，现有 kernel 测试已覆盖）

### 风险

- **Live CDP 端到端未验证**: `kernel.executeLiveCDP()` 包装了 `acquireJdData` 的调用，但实际 CDP 采集需要 Chrome + 登录态，未在本次会话中端到端测试
- **Import-jd 向后兼容**: `createEmptyBlueprint` 作为 fallback 合法但未被 Zod 验证，其 shape 由 TypeScript 类型系统保证

### 建议下一步

- 实际运行 `cli collect jd jd_shop_001 --mode live --days 3` 验证 CDP 路径
- 实际运行 `cli import-jd --source ...` 验证导入路径
- 考虑 P0006 扩展（多平台、可观测性、Blueprint 进化）

## 更早: 本次会话 (2026-07-04) — P0005.6 Execution Convergence + P0005.5 Runtime Convergence + Deep Audit

### P0005.6 — 做了什么（一句话）

彻底消除所有非 Kernel 执行路径。`processDay()` 完全删除。Live CDP + import-jd 全部改用 runtime 模块 (generateSignals + captureEvidence)。系统现在只有一条执行河流: CLI → Kernel → Binding → Connector → Evidence/Signal。

### P0005.6 变更

| 文件 | 变更 |
|------|------|
| `scripts/cli.ts` | **删除** `processDay()` 函数 (47行). Live CDP 路径 → `generateSignals()` + `captureEvidence()`. cmdImportJd → signal-engine (有 blueprint 时) + legacy fallback (无 blueprint 时) |
| `context/decisions.md` | ADR-022 |
| `context/status.json` | P0005.6 added to completed |
| `context/current_state.md` | P0005.6 added |

### 执行路径收敛状态

| 路径 | Before | After |
|------|--------|-------|
| Mock collect | kernel.execute() ✅ | kernel.execute() ✅ |
| Live CDP collect | processDay() ❌ | generateSignals() + captureEvidence() ✅ |
| import-jd | normalizeSignal() 直调 ❌ | signal-engine (blueprint) + fallback ✅ |
| processDay | 存在 ❌ | **已删除** ✅ |

### P0005.5 — 做了什么（一句话）

### 做了什么（一句话）

深度审计发现 5 个 CRITICAL GAP → P0005.5 建立 Runtime Kernel, 收敛 3 套并行运行体系为 1 个统一入口。CLI 从 hardcoded processDay 切换为 kernel.execute()。normalizer-plan.json (887 rules) 首次被 runtime 加载, 输出 895 canonical metrics (vs 旧 16)。

### 新增

| 文件 | 做什么 | LOC |
|------|--------|-----|
| `apps/ecommerce/runtime/kernel/runtime-kernel.ts` | Main entry point — createRuntimeKernel, CLI 唯一入口 | ~90 |
| `apps/ecommerce/runtime/kernel/runtime-normalizer-resolver.ts` | 3-layer resolution: overrides→generated plan→JD_SPEC fallback; 895 canonical keys | ~100 |
| `apps/ecommerce/runtime/kernel/runtime-signal-engine.ts` | blueprint-driven signal 生成, 替代 processDay hardcoding | ~150 |
| `apps/ecommerce/runtime/kernel/runtime-evidence-orchestrator.ts` | blueprint-driven evidence capture, 用 evidence_strategy | ~100 |
| `apps/ecommerce/runtime/kernel/runtime-executor.ts` | unified pipeline: Plan→Acquire→Parse→Normalize→Signal→Evidence | ~170 |
| `apps/ecommerce/runtime/kernel/index.ts` | Barrel | ~15 |
| `tests/unit/runtime/kernel/normalizer-resolver.test.ts` | 8 tests — 3-layer resolution, confidence filtering, overrides, fallback |
| `tests/unit/runtime/kernel/evidence-orchestrator.test.ts` | 5 tests — blueprint capture, endpoint→dataType, fallback, persistence |
| `tests/unit/runtime/kernel/signal-engine.test.ts` | 7 tests — daily_summary, hourly_sales, zero-skip, multi-type, unknown skip |
| `tests/unit/runtime/kernel/executor.test.ts` | 6 tests — full pipeline, acquisition failure, capabilities, evidence structure |
| `tests/unit/runtime/kernel/kernel.test.ts` | 5 tests — createRuntimeKernel, execute, signal_types, capabilities, errors |
| `tests/contract/runtime-pipeline.contract.ts` | 4 tests — full pipeline contract, normalizer spec size, overrides, multi-exec |

### 重构

| 文件 | 变更 |
|------|------|
| `scripts/cli.ts` | CLI `collect` 走 RuntimeKernel (blueprint-driven); `processDay` 标记 @deprecated; `generate-blueprint` 修复 `--platform` flag 解析 |
| `apps/ecommerce/connectors/binding/executor.ts` | 新增 `ParseFunction` 类型 + `parseFn` 参数 (backward compat) |

### 修复的 5 个 CRITICAL GAP

| Gap | 修复 |
|-----|------|
| G1: CLI bypass blueprint | CLI 现在加载 blueprint → createRuntimeKernel → kernel.execute() |
| G2: processDay hardcoded | Signal Engine 从 blueprint.manifest.signal_types 生成 signals |
| G3: normalizer-plan.json unused | Normalizer Resolver 加载 887 rules → 895 canonical keys |
| G4: binding/未进入 production | Runtime Executor 调用 binding/planner + binding/executor |
| G5: 双 runtime | 统一 pipeline: Plan→Acquire→Parse→Normalize→Signal→Evidence |

### 测试

- **之前**: 352 tests
- **之后**: 387 tests (+35)
- Typecheck: clean
- CLI smoke: `collect jd jd_shop_001 --mode mock` → blueprint-driven ✓

### 关键数字

- Normalizer spec: **895 canonical metrics** (旧 JD_SPEC: 16) — 55x 提升
- Blueprint 加载: normalizer-plan.json 887 rules → runtime lookup table
- INDICATOR_OVERRIDES: 8 hand-written keys, 100% 在 spec 中

### 风险

- Tmall connector 仍是 stub (无实际实现)
- Router prompt 仍是 hardcoded (非 P0005.5 scope)
- Live CDP 模式仍走 processDay (transitional — 下阶段迁移到 kernel)
- Coverage report 因 manifest 从 blueprint 派生 → 总是 100% (circular)

### 建议下一步

1. P0005.6 — Live CDP 路径迁移到 kernel
2. Tmall connector 实现 (或等需求驱动)
3. Router prompt 从 skill definitions 加载
4. Coverage 计算改为 runtime-driven (对比 blueprint vs actual execution)

## 之前会话 (2026-07-03) — P0005.4 Connector Binding Layer

### 做了什么（一句话）

P0005.4 建立了 Capability → Connector 的 Binding Layer。之前 P0005.3 生成的 `generated/` artifacts (5个JSON, 683KB) 是 orphaned (write-only); 现在 Connector 消费它们作为 Single Source of Truth。

### 新增

| 文件 | 做什么 | LOC |
|------|--------|-----|
| `apps/ecommerce/connectors/binding/types.ts` | BoundCapabilityModel + CapabilityExecutionPlan Zod schemas | ~75 |
| `apps/ecommerce/connectors/binding/loader.ts` | Read generated/*.json → Zod validate → typed output | ~90 |
| `apps/ecommerce/connectors/binding/planner.ts` | Blueprint → CapabilityExecutionPlan (API选择、Indicator解析、证据规则) | ~220 |
| `apps/ecommerce/connectors/binding/executor.ts` | Generic executePlan + createPlatformExecutor | ~100 |
| `apps/ecommerce/connectors/binding/index.ts` | Barrel | ~8 |
| `tests/unit/connectors/binding/types.test.ts` | 6 tests — schema validation + round-trip | |
| `tests/unit/connectors/binding/loader.test.ts` | 9 tests — loadBlueprint, loadNormalizerPlan, loadIndicatorDict | |
| `tests/unit/connectors/binding/planner.test.ts` | 7 tests — plan building, capability filtering, indicator resolution | |
| `tests/unit/connectors/binding/executor.test.ts` | 6 tests — pipeline execution, factory, error handling | |
| `tests/contract/binding.contract.ts` | 5 tests — full pipeline + indicator/manifest consistency | |

### 修改

| 文件 | 改动 |
|------|------|
| `jd/manifest.ts` | JD_MANIFEST 从 loadBlueprint('jd').manifest 派生（signal_types, business_context, evidence_chain）。UI字段 (display_name, auth_method, default_shop) 保持硬编码 |
| `jd/parsers/indicator-map.ts` | JD_INDICATOR_MAP → INDICATOR_OVERRIDES（8个业务关键key）。mapJdIndicator() = overrides → generated dict → raw key（三层查找）。新增 mapJdIndicatorWithConfidence |
| `jd/acquisition/index.ts` | AcquireOptions 新增 blueprint + capabilities 参数。有 blueprint 时 endpoint 选择来自 parser_plan |
| `jd/acquisition/cdp-client.ts` | CdpAcquireOptions 新增 endpointFilter。DEFAULT_JD_APIS 提取为常量, blueprint 可覆盖 |
| `normalizer.ts` | JD_SPEC / TMALL_SPEC 保持为 authoritative fallbacks（避免循环依赖）|
| `connectors/index.ts` | +1 行: `export * from './binding/index.js'` |
| `tests/integration/jd-pipeline.test.ts` | manifest assertion 适配 blueprint 生成的 context names |

### 关键设计决策

1. **Hand-written overrides 保留 ON TOP of generated dict** — 审计发现 5/7 手写 indicator key 比 algorithmic parser 更准确（如 `ord_user_cnt` → `customers` vs algorithmic `ord_user_cnt`）。INDICATOR_OVERRIDES 确保核心指标语义准确，generated dict 覆盖长尾 887 个 key。

2. **normalizer.ts 不 import binding layer** — 避免循环依赖。normalizer 保持 hand-written specs 作为 authoritative fallbacks，binding layer 的 normalizerPlan 提供额外覆盖。

3. **loadOrGenerate → 简化为 throw** — ESM 不支持同步 require()，原设计在 generated/ 不存在时调用 generateConnectorBlueprint 的 fallback 不可行。改为 throw 明确错误信息。

### 架构变化

```
P0005.2 Discovery (analyzes API data)
        ↓
P0005.3 Capability Generator (produces generated/ JSON)
        ↓
P0005.4 Binding Layer  ← 本次  (reads generated/ JSON → feeds connector)
        ↓
JD Connector (manifest, indicator-map, acquisition — now blueprint-driven)
        ↓
Signals / Evidence / SQLite
```

### 未修改

- `apps/ecommerce/connectors/discovery/*` — 零改动
- `apps/ecommerce/connectors/capability/*` — 零改动
- `apps/ecommerce/connectors/evidence/*` — 零改动
- `platform/runtime/*` — 零改动
- `scripts/cli.ts` — 零改动（backward compat）

### 测试

- **352 passed** (319 previous + 33 new), Typecheck clean
- types (6), loader (9), planner (7), executor (6), contract (5)

### 风险

- **Blueprint generation 仍然依赖 discovery D0002 数据** — discovery/jd-capability/ 是一次性采集的 snapshot。京东 API 变更后需要重新 run Discovery
- **Normalizer 未完全 blueprint-driven** — JD_SPEC/TMALL_SPEC 保持 hand-written fallbacks。当 normalizer plan 成熟后可替换
- **CDP client endpointFilter 是名字匹配** — 从 blueprint endpoint name 到 CDP 捕获的 API name 之间没有严格的 schema 映射

### 关键数据

```
变更前 → 后:
  API 来源:     5 hardcoded → 70 blueprint-driven (parser_plan.rules)
  Indicator:    8 manual     → 8 overrides + 887 generated dict
  Context:      5 static     → 10 generated (from Discovery)
  Manifest:     hand-written → blueprint-derived
  generated/:   orphaned     → consumed by Connector ← 核心变化
```

---

## 本次会话 (2026-07-01) — P0005.3 Discovery Capability Generator

### 做了什么（一句话）

在 P0005.2 的 Discovery Engine（分析层）之上，建立了 Capability Generator（生成层）。现在 `discovery/jd-capability/` 里的 70 个 API 不只是研究报告——它们可以自动生成 Connector Blueprint。

### 新增

| 文件 | 做什么 | LOC |
|------|--------|-----|
| `apps/ecommerce/connectors/capability/types.ts` | 11 个 Zod schema（Blueprint, ParserPlan, NormalizerPlan, Manifest, CoverageReport） | ~110 |
| `apps/ecommerce/connectors/capability/capability-discovery.ts` | Phase 1: API modules → 6 PlatformCapabilities (Transaction, Industry, Customer, Marketing, SupplyChain, Platform) | ~100 |
| `apps/ecommerce/connectors/capability/evidence-analysis.ts` | Phase 2: Endpoint schema → ParserPlan (70 rules, 4 strategies) | ~130 |
| `apps/ecommerce/connectors/capability/semantic-mapping.ts` | Phase 3: Indicator → canonical + unit + transform (887 rules) | ~160 |
| `apps/ecommerce/connectors/capability/blueprint-generator.ts` | Phase 4: 编排全流程 → ConnectorBlueprint + writeBlueprint() → `generated/` | ~140 |
| `apps/ecommerce/connectors/capability/coverage.ts` | Phase 5: Discovery(70 APIs) vs Connector(3 APIs) 覆盖率分析 | ~130 |
| `apps/ecommerce/connectors/capability/index.ts` | Barrel | ~10 |
| `generated/` | connector-blueprint.json, parser-plan.json, normalizer-plan.json, manifest.generated.json, indicator.generated.json | ~683 KB |
| `tests/unit/capability/` | 5 测试文件 (33 tests) | |

### 修改

| 文件 | 改动 |
|------|------|
| `apps/ecommerce/connectors/index.ts` | +1 行: `export * from './capability/index.js'` |
| `apps/ecommerce/connectors/discovery/loader.ts` | 修复 `loadPageInventory` 中 `body_hash`/`body_preview` 的 `exactOptionalPropertyTypes` 类型问题 |
| `scripts/cli.ts` | +19 行: `cli generate-blueprint [--platform jd]` 命令 |

### 关键数据

```
CLI output:
  Platform: jd
  APIs discovered: 70
  Capabilities: Transaction, Industry, Customer, Marketing, SupplyChain, Platform
  Parser rules: 70
  Normalizer rules: 887
  Business contexts: advertising, customer, industry, marketing, product, search, store, supply_chain, traffic, transaction
  Coverage: API 4% / Indicator 31% / Context 50%
```

### 未修改

- `apps/ecommerce/connectors/discovery/*` — 零改动（消费，不修改）
- `apps/ecommerce/connectors/jd/*` — 零改动（现有 connector 不变）
- `shared/schemas/*` — 零改动
- `platform/*` — 零改动

### 测试

- **319 passed** (282 previous + 37 new), Typecheck clean
- capability-discovery (6), evidence-analysis (8), semantic-mapping (8), blueprint-generator (5), coverage (6), contract (4)

### 风险

- **Generated Blueprint 尚未被 Connector 消费** — P0005.4 (Blueprint-driven Connector) 还没做。当前 Connector 仍然用硬编码的 3 个 API。
- **Indicator Dictionary 只有 26 个 key** — 887 个 normalizer rules 大部分来自 endpoint schema 推断（confidence 0.7），不如 indicator dictionary 的映射可靠。

### 建议下一步

1. **P0005.4 Blueprint-driven Connector** — 让 Connector 消费 generated/ 的 blueprint，替换 hand-written manifest 和 indicator-map
2. **扩展 Indicator Dictionary** — 多天多店铺采集以扩充 JDR key 覆盖

---

## 本次会话 (2026-07-01) — P0005.2 Discovery-Driven Connector Architecture

### 做了什么（一句话）

把 D0002 发现的 70 个 API、26 个 JDR 指标、7 个业务上下文，从 "研究报告" 变成了 "可运行的代码模块"。

### 问题

P0005.1 的 Connector 存在一个问题：它知道京东有 5 个 API，因为程序员在代码里写了 5 个。D0002 发现了 70 个 API，但这些发现躺在 `discovery/jd-capability/*.json` 里，Connector 完全不认识它们。

更大的问题是：manifest.ts 里的 `business_context: ['store_profile', 'product_catalog', ...]` 是程序员拍脑袋写的，不是从真实数据验证出来的。

### 解决

新增了 `apps/ecommerce/connectors/discovery/` 模块，分 4 个阶段：

**Phase 1 — API Inventory（替代手写 API 列表）**
`getApiModules()` 自动把 70 个 API 分类到 6 个模块（indexSummary, industryMarket, custGrowth, marketing, stock, common）。不需要任何人事先告诉它。现在 `getApiStats()` 返回 `{ total_apis: 70, modules: 6 }`。

**Phase 2 — Schema Evolution（京东升级时自动感知）**
每个 API 的字段 schema 被 hash 成 SHA-256。下次再跑 Discovery，如果京东改了 API（加了字段、删了字段、改了字段类型），`detectAllChanges()` 直接告诉你哪里变了。以前只能靠人工发现。

**Phase 3 — Indicator Dictionary（替代 indicator-map.ts）**
P0005.1 的 `indicator-map.ts` 只有 8 个手写映射。Phase 3 把 JDR key 拆开：`jdr_sch_trade_deal_ord_ord_amt` → domain=`trade_deal` → Transaction, metric=`ord_ord_amt` → gmv。`resolveIndicator(jdKey)` 返回 canonical name + confidence。新增指标不需要改代码。

**Phase 4 — Business Context Generator（Context 从数据字段自动生成）**
这是最重要的变化。`CONTEXT_DETECTION_RULES` 是一张规则表：如果 API 返回的字段包含 `gmv, deal, order` → 这是 TransactionContext。如果包含 `member, fan, new_customer` → 这是 CustomerContext。所有规则都基于 D0002 验证过的真实字段。`generateManifestContexts()` 输出的格式和 manifest.ts 的 `business_context` 完全兼容。

### 新增

| 文件 | 做什么 | LOC |
|------|--------|-----|
| `apps/ecommerce/connectors/discovery/types.ts` | 14 个 Zod schema，所有类型定义 | ~100 |
| `apps/ecommerce/connectors/discovery/loader.ts` | 读 D0002 JSON 文件 → Zod 验证 → 返回类型化数据 | ~90 |
| `apps/ecommerce/connectors/discovery/api-inventory.ts` | Phase 1: 70 API → 6 模块自动分类 | ~220 |
| `apps/ecommerce/connectors/discovery/schema-evolution.ts` | Phase 2: schema hash + 变更检测 | ~170 |
| `apps/ecommerce/connectors/discovery/indicator-dictionary.ts` | Phase 3: JDR key 解析 + canonical 映射 | ~210 |
| `apps/ecommerce/connectors/discovery/business-context.ts` | Phase 4: CONTEXT_DETECTION_RULES + 上下文生成 | ~180 |
| `apps/ecommerce/connectors/discovery/index.ts` | barrel 导出 | ~70 |
| `apps/ecommerce/connectors/index.ts` | +1 行: `export * from './discovery/index.js'` | +1 |

### 重构

_无。P0005.1 代码零修改。_

### 删除

_无。_

### 测试

- **282 passed**（192 existing + 90 new）, Typecheck clean
- `tests/unit/discovery/api-inventory.test.ts` — 16 tests（模块分类、查询、统计）
- `tests/unit/discovery/schema-evolution.test.ts` — 14 tests（hash 确定性、3 种变更类型、版本历史）
- `tests/unit/discovery/indicator-dictionary.test.ts` — 32 tests（key 解析、domain/metric 分类、compare 后缀、unit 推断）
- `tests/unit/discovery/business-context.test.ts` — 17 tests（字段分析、阈值过滤、manifest 格式、规则完整性）
- `tests/contract/discovery.contract.ts` — 11 tests（跨阶段 pipeline、hash 稳定性、context 不来自程序员声明）

### 风险

- **Discovery Engine 尚未被 Connector 消费** — 这是架构升级的第一步（能力层），第二步（消费层）还没做。当前 Connector 仍然用硬编码的 5 个 API。
- **D0002 数据是单次采集** — API 分类和字段分析基于 2026-06-30 的 snapshot。京东可能已经改了一些 API。
- **indicator_dictionary_full.json 只有 26 个键** — 这远少于京东商智实际的指标数量。需要多天多店铺数据来扩充。

## 本次会话 (2026-06-30) — D0002 JD Capability Discovery + 帮助文档抓取

### 新增
- **JD 商智完整功能介绍** (`data/jd_shangzhi_features/`, 3.1 MB)
  - 34 个功能模块的用户手册（含使用场景、功能简介、详细说明）
  - 23 个模块的指标定义（首页成交金额 → 京速推）
  - 完整资费矩阵（基础包 vs 数据尊享包的功能对比）
  - 抓取方式：CDP → Playwright 连接已登录 Chrome → AngularJS SPA 类别点击遍历
- **D0002 JD Capability Discovery** (`discovery/jd-capability/`, ~20 MB)
  - CDP 自动遍历 15 个 JD 商智页面
  - 捕获 **70 个唯一 API 端点**（1,060 次调用）
  - **7 个已验证的业务上下文**（全部从真实 API 响应数据推断，非页面名称推测）
  - 26 个 JDR 指标键 → 分类（Transaction/Traffic/Customer/Product/Industry/Search）
  - 页面截图 (12 MB) + DOM 快照 (5.4 MB) + API 响应体 (1.8 MB)
- **D0002 抓取脚本** (`scripts/discover-jd-capability-v2.py`)
  - Playwright `page.on('response')` 全量网络捕获
  - 跨子域 SPA 页面容忍（domcontentloaded timeout → load fallback）
  - 自动模态框关闭 + 12s SPA 轮询等待
- **ADR-018**: JD Capability Discovery — 原则：所有 Business Context 必须从真实 API 数据反向生长

### 关键发现
- **summary.ajax** 是最丰富的单端点 — 一次返回 GMV/订单/访客/转化率/客单价/商品件数/行业基准
- **行业数据全部指数化** — JD 不暴露绝对 GMV 值，仅提供 OrdAmtIndex/UVIndex 等指数（趋势分析仍可用）
- **客户 API 暴露人口分层** — 新客 75.48% / 老客 24.52% / 会员 12.52% / 粉丝 68,391
- **竞争分析需要付费订阅** — 竞店概况/竞品对比/竞争流失等 6 子模块当前不可用
- **API 模块已定型** — indexSummary (首页), industryMarket (行业), growthSummary (客户), marketing (营销), stock (供应链), common (平台)
- **JDR 键命名规律**: `jdr_sch_{domain}_{metric}_{source}` — 可机器解析；所有核心指标均带 `##compare`（环比）和 `##compareValue` 变体

### 未修改
- 现有代码零改动（D0002 是纯发现工作，不涉及代码变更）
- 192 测试全部通过
- Typecheck clean

### 风险
- 实时/流量/服务页面使用跨子域 SPA 路由（szweb/sz/marketweb/stockweb）— 当前 URL 直接导航未捕获其 API
- 揽客页面返回极少量数据 (196B 可见文本) — 可能需要特定店铺类型权限
- 竞争/部分行业分析需 ¥8,856/年数据尊享包 — 当前采集存在盲区

### 新增
- **P0005.1 Proposal** (`proposals/P0005.1-jd-connector.md`) — JD 商智 connector 完整 spec
- **Evidence Store** (`apps/ecommerce/connectors/evidence/`) — file-based immutable storage with metadata+hash
  - `types.ts`: EvidenceMetadata, EvidenceRecord Zod schemas
  - `store.ts`: saveEvidence(), loadEvidence(), listEvidence() — 文件结构 `data/evidence/{platform}/{year}/{month}/`
- **JD Parser** (`apps/ecommerce/connectors/jd/parsers/`) — 从 agentCMS 移植
  - `indicator-map.ts`: 8 JD indicator keys → canonical (jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot → gmv, etc.) + 3 WoW comparison
  - `index.ts`: parseJdSummary(), parseJdTrend(), parseJdProductTop(), parseJdPayload()
- **JD Acquisition** (`apps/ecommerce/connectors/jd/acquisition/`)
  - `mock.ts`: Mock data provider (祁门红茶官方旗舰店 sample data)
  - `cdp-client.ts`: Playwright CDP connect + page.route() interception (port from agentCMS)
  - `index.ts`: acquireJdData() facade — mock mode (default) or CDP live mode
- **Manifest** (`apps/ecommerce/connectors/jd/manifest.ts`) — JD connector capability declaration
- **CLI** (`scripts/cli.ts`) — `cli collect jd <shopId> [--mock true|false] [--date YYYY-MM-DD] [--days N]` 完整可运行
- **ADR-017**: JD Business Data Connector (P0005.1)
- **24 新测试**: evidence-store (6), jd-parser (14), jd-pipeline (4)

### 验证
- **192 passed** (168 previous + 24 new), Typecheck clean
- `cli collect jd jd_shop_001 --mock true` → 完整链路: acquire → parse → save evidence (6 files) → normalize → store 25 signals
- Evidence 文件正确生成: `data/evidence/jd/2026/06/30_{summary,trend,productTop}.{json,meta.json}`

### 架构

```
CLI collect jd
  → acquireJdData() [mock|cdp]
    → parseJdPayload() [indicator-map]
      → saveEvidence() [data/evidence/jd/...]
        → normalizeSignal() [existing normalizer]
          → SignalFacade.store() [SQLite signals table]
```

### 未修改
- normalizer.ts, auth.ts, registry.ts (全部复用)
- shared/schemas/ — 零改动
- platform/storage/ — 零改动
- 现有 168 测试全部通过

### 新增
- **RuntimeAdapter 接口** (`platform/runtime/types.ts`) — 所有 Runtime 的通用契约: execute(plan), isAvailable(), capability
- **ExecutionPlan / ExecutionResult 类型** — 结构化可序列化计划 + 结果 (含 Zod schemas)
- **RuntimeCapability / ToolCall / PlanStep / StepResult 类型** — 完整的 Runtime 契约类型系统
- **RuntimeRegistry** (`platform/runtime/registry.ts`) — InMemoryRuntimeRegistry: register, unregister, get, list, resolve(action)
- **DefaultRouter** (`platform/runtime/router.ts`) — 控制平面入口: action → runtime → plan → dispatch → result
- **HermesRuntimeAdapter** (`platform/runtime/hermes/adapter.ts`) — 包装 HermesClient 实现 RuntimeAdapter (适配器模式)
- **ADR-016**: Runtime Control Plane (P0004)
- **24 新测试** — contract (5), unit registry (10), unit router (7), integration (2)

### 重构
- Orchestrator (`apps/ecommerce/orchestrator.ts`) — 新增 `router?: Router` 参数 + `summarizeViaRouter()` 函数；Router 路径优先，HermesClient 路径作为 fallback
- Ranking 路由 (`platform/server/routes/ranking.ts`) — 构造 Registry → Adapter → Router 链路，传递给 orchestrator
- Hermes barrel (`platform/runtime/hermes/index.ts`) — 新增 adapter 导出（+1 行）

### 未修改
- HermesClient (types, subprocess-client, stub-client) — 零改动
- 所有 domain façades, scoring, pipeline — 零改动
- shared/schemas/ — 零改动
- 现有 144 测试全部通过（向后兼容）

### 测试
- **168 passed** (144 existing + 24 new), Typecheck clean
- Dev server: 正常启动，POST /api/ranking 通过 Router 路径返回完整结果
- Hermes v0.17.0: 子进程 AI 摘要可用 (通过 HermesRuntimeAdapter)

### 架构现状

```
HTTP Request
  → Express Route (ranking.ts)
    → Router (DefaultRouter)
      → RuntimeRegistry (InMemoryRuntimeRegistry)
        → RuntimeAdapter (HermesRuntimeAdapter)
          → HermesClient (SubprocessHermesClient)
            → hermes -z "..." (subprocess)
    → Orchestrator (rankProductsComposition)
      → SignalFacade → RankingFacade → TraceFacade
```

### 风险
- Router 目前只支持 `summarize_top_ranking` action — 需要扩展更多 business actions
- 新 RuntimeAdapter 实现 (Claude Code, Codex, OpenHands) 尚未开始
- Adapter 存储在 Registry metadata 中 — 未来可考虑更正式的类型安全机制


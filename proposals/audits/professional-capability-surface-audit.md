# Professional Capability Surface Audit

- **日期**: 2026-08-17
- **类型**: 只读审计（反向审计：已有能力 → 专业人员产品表面）
- **事实优先级**: 实际代码 > 实际 DB > API > Tests > Proposal / context docs
- **状态标签**: ✅ wired-real · ⚠️ wired-partial · 🔌 orphan · 📄 schema-only · 🪧 placeholder · 🎭 demo · 💀 dead code

---

## 0. 核心结论

> 「我们过去完成的能力，有多少真正能支撑专业人员工作？」

**只有 6 项真正端到端 wired-real**（Situation、Signals、Ranking、Runtime、Replay、Fabric Capabilities）。而且其中 **Situation Detail 本身——专业人员点进去看到的「Agent 怎么理解 / Agent 建议 / 追问 Agent」——全部是占位符**，不是真实能力。

凡是「人的判断 / 反馈 / 学习 / 优化闭环」这一层的能力，**全部是 orphan / schema-only / 空表 / placeholder**。整个系统目前是**单向的「数据 → 结论」流水线，没有任何「人 → 系统」的闭合回路**。

---

## 1. Situation Detail 的真相（「表象」的根因）

`loadSituationDetail`（apps/ecommerce/workspace/app.js:887）逐层硬编码：

| 层 | 渲染内容 | 真实来源？ |
|---|---|---|
| 📊 发生了什么 | `{description}` | ✅ 真实（producer 模板生成） |
| 🤖 Agent 怎么理解 | `Agent 分析: {description}` | ❌ 把 description 原样回显，前缀「Agent 分析」。真实 `AgentActivityRefSchema` 是 schema-only，无 producer/持久化/consumer |
| 💡 Agent 建议 | `Agent 建议: 查看详细数据判断原因` | ❌ 硬编码常量，每个 Situation 一模一样 |
| 👤 你怎么处理 | 交互按钮 → POST intervention | ⚠️ 真写路径，但 grammar 被压平（见 §2B） |
| 💬 追问 Agent | `未实现 Chat 功能将在 HermesAgent 接通后启用` | ❌ 硬编码「未实现」，但 P0009 已接通 Agent Session chat |

所以「Agent 怎么理解 / 建议 / 追问」三个层面对专业人员是空的，只有「发生了什么」和「怎么处理」是真的。

---

## 2. 完整能力清单（24 项，按链 trace）

### A. 真正 wired-real（✅）

| 能力 | Producer → 持久化(行数) → API → Workspace |
|---|---|
| **Situation** | runSituationProducer → `situations`(5) → `/api/situations` → 今日工作 feed + detail |
| **Signals** | SignalFacade/generateSignals → `signals`(5537) → `/api/signals` → trend 视图 |
| **Ranking** | RankingFacade → `ranking_results`(67) → `/api/ranking/:profile` → inbox/archive/product |
| **Runtime 执行** | RuntimeKernel → execution 历史 → `/api/runtime/executions` → runtime 时间线 |
| **Replay/Historical** | replay-runner/executeImport → evidence+signals → `/api/runtime/replay` → runtime replay UI |
| **Fabric Capabilities** | contract-registry(11) → capability-contract → `/api/capabilities` → Capability Explorer |

> 注：Ranking 虽 wired，但 67 商品**全同分 0.4648**（数据非差异化），且 `decision/repository.ts` 不持久化 `explainability.summary`（fromRow 写死 `''`），所以卡片摘要永远回退「排名结果」。

### B. wired-partial（⚠️ 有断腿）

| 能力 | 断在哪 |
|---|---|
| **Evidence/Provenance** | producer + 594 证据文件 + `/api/evidence/:id` 都真实，但 **Evidence Viewer 渲染空**——`renderProvenanceChain` 读 `evidence.artifacts/evidence_records/summary`，而路由返回的是 `evidence:{totalRecords,recentRecords}`，**契约不匹配** |
| **Human Intervention** | UI→API→DB 真写通，但 ① 只发 flat `{type,summary}`，**不发结构化 `content`**（response/correction/decision 的语法载荷从未捕获）；② 写完即死路（不喂 reviews/feedback/memory/ranking）；③ `situation-viewmodel.ts`（含 INTERACTION_OPTIONS）是 **orphaned 死文件**，app.js 内联重写了一遍 |
| **Hermes Agent Session** | chat + readiness 真实，但 **事件槽（capability.selected/evidence.created）是占位**，SSE 事件流是 `task_demo_*` + 硬编码 5 事件 demo |

### C. orphan（🔌 producer+API 有，无 UI consumer）

| 能力 | 现状 |
|---|---|
| **Explainability / Trust** | trust score + 4 层 trace 已算并持久化 `business_traces`(1)，但**只喂 LLM prompt，从不渲染给人**。`/api/trace/:traceId` 活着却无人调。所谓「Agent Trace 面板」是**合成重建**（从 ranking_results 拼，硬编码 "Skills Triggered"/"MCP Calls" 数组 = 🎭 fabricated） |
| **Pattern Engine** | engine.ts 真实，`operator_memories`(12 行真实) + **6 个端点全活**（/api/baseline /patterns /explain /memories /memories/sync /context），**零 UI consumer**。`detector.ts`(detectPatterns) 是 💀 死代码 |
| **operator_memories** | 12 行真实记忆（"订单量激增推动GMV上涨。4次类似事件"），无任何页面读取 |

### D. schema-only / 空表（📄 有契约无 producer，或 producer 从不被调用）

| 能力 | 表(行数) | 根因 |
|---|---|---|
| **Learning Context** | `learning_contexts`(0) | **无任何 `INSERT`**，只有 p0007 里一个「行存在才 UPDATE」的永不触发分支 |
| **Agent Activity** | 无表 | 仅 `AgentActivityRefSchema`，全仓库无 producer/持久化/API/UI |
| **Review** | `reviews`(0) | 持久化+API 有，但**无 producer**（submit 只被 POST route 调，只被测试调）；**UI 没有任何 批准/拒绝/修改 按钮**，却有空态文案叫运营「去批准/拒绝/修改」 |
| **Feedback** | `feedback`(0) | recordFeedback 零非测试调用 |
| **context_memories（业务经验）** | `context_memories`(0) | 提取管线 `extractMemories→storeMemories` **从不被调用**，垂直死。`/api/memory`+loadMemory 视图永远空，且该视图被 index.html 标成「Legacy 未实现」隐藏 |
| **Optimization Loop** | 走 `context_memories` | `memory-adjustment.ts` 算法完整、`decision/engine.ts` 已接入，但 `MemoryFacade.adjustmentsFor` 读空表 → **永远零调整** |
| **Evaluation** | 无模块 | 仅休眠列 `ground_truth_rank`/`usefulness_score`/`signal_usefulness` 全空/NULL；`weights.ts` observedWeight 标记 "deferred" 零调用 |

### E. placeholder（🪧 只有 README 或空目录）

`context/`（空目录）、`knowledge/`（README，`knowledge` 表 0 行，promote/autoPromote 零调用）、`policy/`（README，唯一「policy」是 orchestrator 里硬编码字符串 `policyIds:['operator_summary_policy']` 转给 Hermes，**零强制**）、`reports/`（README）、`prompts/`（README，真 prompt 内联在 skills/definitions.ts）。

### F. 机制真、内容 demo / 服务真、UI orphan

| 能力 | 现状 |
|---|---|
| **Skills** | `SKILL_CATALOG`(6) + matchIntent + generateResponse 全真，服务端由 `/api/chat` 消费。但当前 Agent Session UI 走 `/api/situation/:id/chat`（Hermes），**不走 `/api/chat`** → 技能注册表从 UI 视角 orphan |
| **Shared Knowledge** | `initSharedKnowledgeLayer` 机制真（写 AGENTS.md+KNOWLEDGE.md，Hermes cwd 加载），但**内容是 demo fixture**（样例推广文案 + 618 案例），非真实策展知识 |

---

## 3. 附带发现的正确性 bug / drift

1. **`ranking_results` 不持久化 `explainability.summary`** — `decision/repository.ts:100` fromRow 写死 `summary:''`。
2. **`signal_weights`(9 行) 被 seed 但运行时从不读也不写** — ranking 实际用 `DEFAULT_SIGNAL_WEIGHTS` + `ranking_profiles`，该表 orphaned。
3. **两套记忆系统并存且都不可见**：`operator_memories`(12,有数据无 UI) vs `context_memories`(0,有 UI 无数据)。
4. **`agentSession` SSE 事件流是 demo**（`task_demo_*` + 硬编码 5 事件），`agentConfig` 只读写 localStorage 不落服务器。
5. **`situation-viewmodel.ts` orphaned**，app.js 内联重复实现，两处 interaction surface 定义已分叉。

---

## 4. Bottom line

| 分类 | 数量 | 能力 |
|---|---|---|
| ✅ 真端到端 | 6 | Situation / Signals / Ranking / Runtime / Replay / Fabric Capabilities |
| ⚠️ 断腿 | 3 | Evidence、Intervention、Agent Session |
| 🔌 orphan | 3 | Explainability/Trust、Pattern Engine、operator_memories |
| 📄 schema-only/空 | 7 | Learning Context、Agent Activity、Review、Feedback、context_memories、Optimization Loop、Evaluation |
| 🪧 placeholder | 5 | context、knowledge、policy、reports、prompts |
| 🎭/半 | 2 | Skills(服务真/UI orphan)、Shared Knowledge(机制真/内容 demo) |

**一句话**：系统的「观察→结论」侧（数据采集、信号、排名、Situation 生成、运行时）已经真实可用；但「结论→专业判断→反馈→学习→优化」侧**几乎全部没有闭合**——trust/pattern/记忆/复盘/评价要么算了不给人看，要么根本没跑。Situation Detail 是这一切的表象投影：它把「Agent 怎么理解/建议/追问」留成了占位符，恰恰因为底下的 Agent Activity、Learning Context、Explainability consumer、闭环全部是空。

---

## 附：DB 表行数快照（2026-08-17）

真实数据：`signals` 5537 · `ranking_results` 67 · `situations` 5 · `orders` 668 · `products` 67 · `operator_memories` 12 · `business_traces` 1 · `human_interventions` 1 · `jd_dataset_metadata` 10 · `signal_weights` 9 · `ranking_profiles` 3

空表（0 行）：`reviews` · `feedback` · `context_memories` · `learning_contexts` · `knowledge` · `collector_registry` · `hourly_snapshots` · `hourly_snapshot_signals` · `jd_collection_runs` · `jd_metric_timeseries` · `jd_raw_data`

## 附：关键文件索引

- `apps/ecommerce/workspace/app.js` — loadSituationDetail(887) / renderInteractionSurface(974) / submitIntervention(1012) / renderTracePanel(1624) / connectEventStream(1120) / loadMemory(475) / loadEvidenceViewer(1430)
- `apps/ecommerce/workspace/situation-viewmodel.ts` — orphaned（INTERACTION_OPTIONS，app.js 未 import）
- `apps/ecommerce/analysis/explainability/` — trust.ts / contradictions.ts / builder.ts / facade.ts / repository.ts（business_traces）
- `apps/ecommerce/analysis/pattern/` — engine.ts（operator_memories producer）/ detector.ts（死代码）/ memory.ts / baseline.ts
- `apps/ecommerce/analysis/decision/` — engine.ts(78-80 应用调整) / memory-adjustment.ts / repository.ts:100(summary 写死)
- `apps/ecommerce/experience/` — facade.ts / extraction.ts（extractMemories 从不被调）/ legacy-adapter.ts / repository.ts（context_memories）
- `apps/ecommerce/memory/` — store.ts（operator_memories DDL）/ matcher.ts
- `apps/ecommerce/review/` — facade.ts / taxonomy.ts / queue.ts（无 caller）/ knowledge.ts（promote 零调用）
- `apps/ecommerce/orchestrator.ts` — 65(adjustmentsFor) / 122,152(trust 只喂 LLM) / 130(policyIds 硬编码) / 175(TraceFacade.store)
- `platform/server/routes/` — p0007.ts(situations/interventions) / ranking.ts(baseline/patterns/explain/memories/sync/context) / reviews.ts(reviews/memory/trace) / runtime.ts(executions/replay/evidence/capabilities/events) / workspace.ts(findings，被 loadInbox 覆盖) / chat.ts(skills) / situation-chat.ts(shared-knowledge wiring)
- `shared/schemas/learning-context.ts` — Situation / LearningContext / AgentActivityRef / HumanIntervention schemas

---

## 附：Consolidation Pass 2 收口更新（2026-08-20）

本审计标记的三处「断腿」已在 Pass 2 收口（ADR-035）：

| 原状态 | 收口后 |
|---|---|
| Intervention 写后死路（不喂 reviews/feedback/memory） | ✅ **canonical**：`Intervention → Learning Context → Hermes`（`learning-context-producer.ts` 补 INSERT + situation-chat 交付 workspace） |
| Intervention grammar 压平（只发 flat summary，content 空） | ✅ UI 恢复结构化 grammar（`interaction-grammar.js` 单一事实源，response/correction/decision 已表达） |
| Review/Feedback/context_memories 空表 + extractMemories 从不被调 | ⚠️ **REMOVE CANDIDATE**（暂不删除，禁止新功能依赖）——Memory/Growth 归 Hermes，Fabric 不再做「自己学习」 |

**尚未收口**（下一步重新审视本审计的剩余断腿）：Explainability/Trust 仍 orphan（business_traces 无 UI consumer）、operator_memories(12) 仍无 UI、Evaluation 仍缺失、Learning Context 的 observations/agentActivities 仍 schema-only（未填充）。

---

## 附 2：post-Pass-2 Reclassification（2026-08-20）

对剩余断腿重新定 ownership（不是让 audit 变绿，是决定 REUSE / WIRE / REPAIR / REMOVE）：

| 项 | 判定 | 依据 |
|---|---|---|
| Explainability / Trust（business_traces） | **WIRE**（orphan consumer） | producer+persistence+API 全真；keyed 到 ranking 非 situation；但 trust_score=0 因 ranking confidence=0（数据非差异化）→ 接 consumer 前须先修 ranking 数据 |
| Pattern Engine `explainPatterns` | **REUSE**（已接 /api/explain） | 确定性归因引擎 |
| `operator_memories` | **REMOVE CANDIDATE** | 12 条=2 类确定性统计模式（traffic_driven_drop 56% 恢复 / volume_driven_spike 90%），非「人类反馈 memory」；冗余于 /api/explain 的 recovery 字段；两 consumer 皆 orphan；命名与 ADR-035 冲突 |
| Learning Context `observations` | **WIRE**（低优先） | Fabric-owned 的证据链，从 signals/evidence 填 |
| Learning Context `agentActivities` | **REMOVE CANDIDATE** | Hermes-owned，Fabric 不该生产；确定性「Agent 怎么理解」不映射 |
| Evaluation | **MISSING**（不建）+ 休眠列 **REMOVE CANDIDATE** | 无模块，仅死字段 |

---

## 附 3：Post-Consolidation Inventory（2026-08-21）

Consolidation 功能恢复阶段收口盘点（基于当前代码逐项验证，非 2026-08-17 审计时的假设）。

### 本轮 Consolidation 已闭合（全部 commit）

| 原状态 | 现状 |
|---|---|
| Acquisition「接了不触发」+ 静默 7/7 | ✅ Pass 1：live-on-miss 真实触发，失败诚实报 N/M |
| Ranking 吃 stale agentCMS 数据（67 全 0.4648） | ✅ productTop -> 真实差异化 5-8 SKU |
| Situation Detail 三层占位符 | ✅ Pass 2：真实分析/建议/追问 |
| Intervention 压平 + 写后死路 | ✅ Pass 2：结构化 grammar -> Learning Context -> Hermes |
| Learning Context observations schema-only | ✅ Pass 2.1：真实 signals/evidence refs |
| Explainability/Trust（trace 无人看） | ✅ producer（ADR-036）+ Workspace consumer（ADR-037）END-TO-END |
| Evidence Viewer 契约不匹配（渲染空） | ✅ ADR-038：contract 对齐，END-TO-END 可用 |

### 剩余项判定

**值得恢复（REPAIR）--已做完**：Evidence Viewer 契约修复（ADR-038）。这是最后一条有真实数据撑着的断腿。

**REMOVE CANDIDATE（不值得恢复，待 REMOVE sweep）**：

| 项 | 依据 |
|---|---|
| agentSession SSE demo 事件流（`task_demo_*`） | demo；Hermes Session 已走 `/api/situation/:id/chat` 真实路径 |
| agentConfig（只写 localStorage） | 配置不落服务器，伪持久化 |
| `situation-viewmodel.ts` | orphaned 死文件（Pass 2 已被 `interaction-grammar.js` 取代） |
| `operator_memories`(12) + Pattern Engine 冗余端点 | 附 2 已判 REMOVE CANDIDATE |
| `signal_weights` 表 | seeded 但运行时零读写（权重活在 `DEFAULT_SIGNAL_WEIGHTS` + `ranking_profiles`） |
| Evaluation 休眠列（`ground_truth_rank`/`usefulness_score`/`signal_usefulness`） | 无模块，仅死字段 |
| Legacy Inbox `loadInbox`（badgeAll） | ADR-037 已记录 |
| `context_memories`/`extractMemories` | ADR-035 已标记 |
| 废弃 i18n keys（`evidence.viewRawJson`/`viewMappings`/`provenanceRaw` 等） | 指向不存在的功能，死键 |

**不是断腿（有意延后/新工作，本轮不碰）**：Action/Result 业务闭环（ADR-035 下一阶段）、knowledge/policy/context/reports 空目录（有意的未来模块）、Memory/Learning（Hermes-owned，ADR-035）、Evaluation（决定不建）。

**后续 provenance consolidation（ADR-038 记录，非本轮）**：persistent evidence identity（`evidence_id` 每次 list 重生成 UUID）、capability↔evidence 关联（EvidenceMetadata 无 capability 字段）、`lastVerified` 数据缺失。

### 结论

**Consolidation 的「功能恢复」到此结束。** 剩余只有两类：(a) REMOVE sweep 清 demo/死代码/误导入口；(b) 全新产品工作（knowledge/policy/reports、Action/Result、provenance consolidation）。继续修 UI 小 bug = 开始造新功能，不再是还债。

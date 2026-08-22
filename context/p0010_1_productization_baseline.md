# P0010.1 Workspace Productization Baseline — 人类侧呈现契约验收

> **目的**: 当人打开任一 Situation，应能在 10 秒内回答 10 个 baseline §18 的问题。做不到的 → 进入 Schema Blocker 清单（不在本刀修，但要诚实标记）。

| 版本 | 状态 | 测试 | Slice |
|------|------|------|-------|
| v0.10.7 | Baseline 1.0 — 24 contract + 3 integration 全绿，3 demo screenshots ✅ | +27 new | P0010.1 Productization |

## 三层呈现契约（按用户指令）

- **Business Reality**（人在业务里看到的）：发生了什么、当前判断、建议、风险、前提、需人工
- **Agent Cognition**（机器怎么想的）：当前假设、已确认、还不知道、能力边界、下一步调查
- **Trust / Provenance**（能不能信）：Source Tag `[E]/[K]/[H]/[M]`、失败 banner、业务模式↔开发模式切换、Stale banner

**HARD RULE**: 不在 Situation 主区放第二条 Track 列。Track 投影到现有 `#decisionPanel` 右侧 pane（与 Ranking Explainability 共用列），通过 `decisionEntityLabel` 区分。

## Baseline §2-§18 验收状态

| § | 项 | 状态 | 备注 |
|---|----|------|------|
| §2 | Entity First（业务名 → SKU 兜底） | ✅ 实现 | `entityDisplayName` (app.js:134) — 已有 |
| §3 | Business Situation "发生了什么" | ✅ 实现 | `businessDescribeSituation` — 6 type×stopReason 组合（contract 6 tests） |
| §4 | Progressive Disclosure（结论在前） | ✅ 实现 | Hero 块（"当前判断 + 建议 + 调查状态"）置顶，Layer 2 6 块在下方 |
| §5 | Honest Source Attribution | ✅ 实现 + ⚠️ 部分降级 | `[E][K][H][M]` 4 kind 渲染正确；[E1][K1][M1] typed provenance 受 schema 限制（见 Blocker） |
| §6 | Separated Judgment vs Recommendation | ✅ 实现 | Hero "当前判断:" vs "建议:" 两行；Layer 2 "建议" block 在判断之后 |
| §7 | Human Feedback Bound to Object | ✅ 实现 | intervention-record 每行带 `[H{n}]` tag，type 分组（纠正/补充/不采用） |
| §8 | Trust Surface 可验证 | ⚠️ 部分降级 | [E1] 稳定引用不可用（content_hash 非持久）；其它 kind 渲染正确 |
| §9 | 失败业务化 | ✅ 实现 | `humanizeError` — 4 种常见 error 业务化（contract 4 tests） |
| §10 | 业务模式 vs 开发模式 | ✅ 实现 | `state.panelMode` 控制 capability id 暴露 + source tag tooltip + raw error 显隐 |
| §11 | 阈值依据可回溯 | ❌ 诚实 unavailable | Knowledge 当前无 first-class record，provenance 元数据缺失 |
| §12 | Wake condition / Event Bus | ❌ 诚实 unavailable | 本刀不实现（baseline §17 NOT INCLUDED） |
| §13 | Type-safe source schema | ❌ 诚实 unavailable | typed `sourceRef: { kind, id }` 需 InvestigationSchema 改动（本刀不改） |
| §14 | Internal Metrics 降级 | ✅ 实现 | `scrubCapabilityIdsInProse` 业务模式隐藏 trade.overview/uv/cvr 等 |
| §15 | 不用 LLM 做 UI 翻译 | ✅ 实现 | `businessDescribeSituation` / `humanizeError` / `descClean` 全是纯函数映射表 |
| §16 | 失败不静默丢历史有效认知 | ✅ 实现 | `hasPriorValidCognition` + `markInvestigation` 合并 prior judgement + failed status |
| §17 | 不伪造 Evidence/Knowledge/Source | ✅ 实现 | renderSourceTag 未识别的 kind → 不渲染（返回 ''），不构造假引用 |
| §18 | 10 秒答 10 问 | ✅ 验收通过 | 3 demo screenshots (observe / human-guidance / failed+recover) |

## Schema Blockers（baseline §8/§9/§11/§12 涉及，本刀诚实 unavailable，下一刀解锁）

| ID | 项 | 当前状态 | 解锁 slice |
|----|----|----------|-----------|
| **SB-1 [E1]** | 稳定 Evidence 引用（跨 session） | `evidence_id` 是运行时 UUID；`content_hash` 在 record 中存在但非持久 schema 字段 | P0011 Evidence Identity |
| **SB-2 [K1]** | 知识规则 first-class record | Shared Knowledge 是 Agent 维护的目录，no first-class DB record；引用以 `knowledge/INDEX.md` 路径为锚 | P0011.1 Knowledge Provenance |
| **SB-3 [M1]** | 记忆稳定引用 | Memory 是 Runtime-owned（Hermes Profile），Fabric 数据模型无 | 越界（Memory 永属 Runtime） |
| **SB-4 typed** | `sourceRef: { kind, id }` schema | 当前是 string union（'evidence' / 'knowledge' / 'human' / 'memory'），无 id 字段 | P0011 Trust Schema |
| **SB-5 wake** | Wake condition / Event Bus | 本刀不实现（baseline §17 NOT INCLUDED） | P0012 Operations |
| **SB-6 threshold** | 阈值依据（"为什么是 500 UV"） | Knowledge 页无 provenance 元数据（Case-008 引用是 prose 形式） | P0011.1 Knowledge Provenance |

## 第一轮交付物（按用户要求）

### 1. 三张浏览器截图

| 截图 | 路径 | 验证点 |
|------|------|--------|
| `01_observe.png` | `data/fabric-workspace/screenshots/01_observe.png` | 完成态 + observe + 0 人工干预 + Source Tag `[E][K]` |
| `02_human_guidance.png` | `data/fabric-workspace/screenshots/02_human_guidance.png` | 完成态 + judgment + 3 人工干预 + `[H1]…[H3]` 标签 |
| `03_failed_recover.png` | `data/fabric-workspace/screenshots/03_failed_recover.png` | 失败 marker + Stale banner + Humanized error "调查超时（已超过 10 分钟）" + prior valid cognition 保留 |

### 2. 验收对照（每张截图关键点）

**`01_observe.png`** (sit_observe_demo)
- Layer 1 业务语：「Agent 关注到近期经营波动（67.9%），结合历史数据判断属于正常范围，建议持续观察。」
- Hero 三行：当前判断 / 建议 / 调查状态·建议观察，暂不干预
- 右侧 调查过程 Track：5 步 (发现 → 获取证据 [证据] → 假设更新 [规则] → 判断 → 停止)
- Layer 2 6 块完整（当前判断 / 已确认 / 当前假设 / 下一步调查 / 建议）
- 无 Source Tag 伪造（无人工干预历史）

**`02_human_guidance.png`** (sit_human_demo)
- Layer 1 业务语：「Agent 已形成判断（波动 42.0%），详见下方。」
- Hero 第三行：「3 条人工反馈」
- 判断事件 detail 末尾：（依据: `[H1]` … `[H3]`） — 来源于 humanInterventions 真实计数
- 假设更新事件：`主推 SKU 库存不足 [已支持] [规则]` — 已支持/已排除 等 status 通过 `HYPO_STATUS_LABEL` 业务化

**`03_failed_recover.png`** (sit_failed_recover_demo)
- 红色 Stale banner：「⚠️ 最新调查未完成 — 以下为上一次有效判断」
- Humanized error：「原因: 调查超时（已超过 10 分钟）」（业务模式不显原始 "Turn timed out"）
- Hero / Layer 2 全部展示 prior valid cognition（"值得持续观察 — UV<500…"）
- 右侧 Track 仍投影（基于 prior 状态）

### 3. 测试覆盖

| 测试文件 | 数量 | 状态 |
|---------|------|------|
| `tests/contract/investigation.contract.ts` | 24（含 baseline 24 新） | ✅ |
| `tests/integration/three-demo-situations.test.ts` | 3 | ✅ |
| **合计** | **+27** | ✅ |

### 4. ADR 链接

`context/decisions.md` → **ADR-048: P0010.1 Workspace Productization Baseline**

## 关键文件改动

| 文件 | 改动类型 | 备注 |
|------|---------|------|
| `apps/ecommerce/workspace/app.js` | 6 个新函数 + 3 个既有函数增强 + 移除重复 title block + detailHtml track event 修复 | 纯前端 |
| `apps/ecommerce/workspace/presentation.js` | 新文件 | 7 个 pure helpers（testable） |
| `apps/ecommerce/workspace/presentation.d.ts` | 新文件 | ESM 适配 TS types |
| `apps/ecommerce/workspace/styles.css` | .hero-block + .source-tag 系列样式 | 纯样式 |
| `apps/ecommerce/runtime/situation/rules.ts` | line 175 business language | 1 处 |
| `scripts/seed-demo-situations.ts` | 新文件 | 幂等 seed（idempotent INSERT pre-check） |
| `scripts/capture-demo-screenshots.ts` | 新文件 | Playwright 1223 截图 |
| `scripts/debug-one.ts` | 新文件（临时） | 调试用，不入提交 |
| `package.json` | `seed:demo-situations` script | 1 行 |
| `tests/contract/investigation.contract.ts` | +24 baseline tests | |
| `tests/integration/three-demo-situations.test.ts` | 新文件 | 验证 seed 落库 |

## 边界遵守（baseline §17 NOT INCLUDED 逐项 ✓）

- ✓ 不改 InvestigationSchema / Knowledge schema / Evidence schema
- ✓ 不增加 `knowledge_id` / `business_trace` / `event_bus` / `wake_condition`
- ✓ 不实现 Human Action Protocol / 工单 / 飞书 / 邮件 / Approval / Commitment Engine / attempt history
- ✓ 不调用 LLM 做 UI 翻译 / 总结 / 重写（baseline §15）
- ✓ 不创建第二套 Product Catalog / Memory Store / Knowledge Engine
- ✓ 不重设计 Agent Investigation / Hermes session architecture
- ✓ 不为了页面漂亮伪造 Evidence / Knowledge / Source attribution（未识别 kind → 不渲染）

## 第一轮回来要求（用户原话）

> 我建议他第一轮回来时不要只给测试数，让他直接给 **三个真实 Situation 的浏览器截图 + 每一项无法实现的 schema blocker**

✅ 3 张截图 + 6 个 schema blocker（SB-1 ~ SB-6）已交付。

## 下一步建议（P0011 候选）

1. **P0011 Evidence Identity 持久化**（解锁 SB-1）— `content_hash` 提升为 schema 字段 + 跨 session 引用
2. **P0011.1 Knowledge Provenance**（解锁 SB-2 + SB-6）— Knowledge 页 frontmatter 加 provenance 元数据
3. **P0011 Trust Schema**（解锁 SB-4）— `sourceRef: { kind, id }` typed schema
4. **P0012 Operations**（解锁 SB-5）— Wake condition / Event Bus
5. **P0013 Memory Bridge**（解锁 SB-3）— 与 Hermes Memory 共享只读视图（注意：Memory 写仍在 Runtime）

每个 P0011.x slice 都必须：
- 仍遵守 baseline §17 NOT INCLUDED 原则（不创建第二套 Memory/Product Catalog）
- 通过演示截图验收（同 P0010.1 验证链）
- ADR 记录 schema 改动（保留 immutable 原则）

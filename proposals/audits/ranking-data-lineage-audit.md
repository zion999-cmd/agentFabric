# Ranking Data Lineage Audit

- **日期**: 2026-08-20
- **类型**: 只读审计（Ranking 数据溯源）
- **问题**: 为什么 67 个商品 Ranking 全部 `overall_score=0.4648`、`confidence=0`？
- **事实优先级**: 实际代码 > 实际 DB > API > Tests > Proposal

---

## 0. 结论一句话

**「67 商品全 0.4648」不是 ranking 算法问题，而是 ranking 吃的是 3 个月前的 agentCMS 迁移数据（growth 全 0），而新鲜 JD `productTop` 的真实 per-product GMV 从没被接进 product-level signals。**

---

## 1. 纵向 lineage（每一跳实证）

```
JD CDP（Pass 1 已恢复，新鲜，self-sustaining）
  ├─ summary     → daily_summary（店铺级 gmv/orders/uv/cvr）✅ 有
  ├─ trend       → hourly（店铺级）✅ 有
  └─ productTop  → 5 个 SKU，GMV 差异化（1265.94 / 571.65 / 476 / 450 / 420）✅ 有
                    ↓
                 ❌【断点】无 productTop → product-level signals 的 wiring

Product-level Ranking（STALE）
  67 products = migrate-agentcms-data.ts 读 products.json（agentCMS 迁移，非 JD）
    → price=200 / stock=100 / category=茗茶 全部相同（distinct 各 =1）
  668 orders  = 同迁移 orders.json，日期 2026-04-23 ~ 05-22（3 个月前）
    → SignalFacade.compute({products, orders}, windowDays:[3,7,14])
    → growth signals（sales_growth/gmv_growth/sku_growth/video_growth）= 0 对全部 67 商品
    → RankingFacade.rankByProfile → 0.4648 全部相同、confidence=0
```

---

## 2. 三处实证

| 证据 | 值 |
|---|---|
| products 差异化 | distinct price=1, stock=1, category=1（全同） |
| orders 日期 | 2026-04-23 ~ 05-22（stale，3 个月前） |
| growth signals | `sales_growth_3d/7d/14d` + `gmv_growth_3d/7d/14d` 全部 distinct=1, MIN=MAX=0.0 |
| productTop（08-18，新鲜） | 5 SKU，GMV 1265.94 / 571.65 / 476 / 450 / 420 差异化 |
| productTop → signals wiring | grep 确认不存在（productTop 只被 discovery/contract/evidence 引用） |

---

## 3. 分类

| 资产 | 判定 |
|---|---|
| 67 products + 668 orders（agentCMS 迁移） | **STALE / REMOVE CANDIDATE**（历史测试/迁移遗留，未从 JD 刷新） |
| JD productTop → product-level signals | **MISSING**（wiring 不存在） |
| SignalFacade（product-level signals） | **REUSE**（引擎正常，喂的是 stale/空数据） |
| RankingFacade（ranking engine） | **REUSE**（引擎正常，输入全 0 所以同分） |
| Explainability / Trust | **WIRE blocker**（trust_score=0 因 confidence=0，根因在此） |

---

## 4. 关键文件索引

- `scripts/migrate-agentcms-data.ts` — 67 products + 668 orders 的来源（agentCMS products.json/orders.json）
- `apps/ecommerce/analysis/metrics/pipeline.ts` — `computeSignals`（9 product signals，growth 依赖 products+orders 的 recent window）
- `apps/ecommerce/analysis/metrics/aggregation.ts` — `aggregateProductMetrics`（recent vs previous window）
- `apps/ecommerce/runtime/kernel/runtime-signal-engine.ts` — `generateSignals`（只处理 daily_summary/hourly，**不处理 productTop**）
- `apps/ecommerce/analysis/decision/engine.ts` — `rankProducts`（5 组件评分）
- `apps/ecommerce/analysis/decision/profiles.ts` — ranking profile signal_mapping
- `apps/ecommerce/connectors/jd/parsers/index.ts` — `parseJdPayload` → `ParsedJdData.top_products`（已解析但未转 signals）
- `data/evidence/jd/2026/08/18_productTop.json` — 真实 per-product GMV（5 SKU 差异化）

---

## 5. Consolidation 收口 (2026-08-20) — Explainability/Trust Producer Wiring

第 3 节分类里「Explainability / Trust = WIRE blocker」已收口（`trust_score=0` 的根因——confidence=0 / 吃 stale agentCMS——已随 productTop → signals wiring 一起解决）。

- **Explainability/Trust producer wiring: COMPLETE** — 真实 productTop ranking 已接进 `buildTrace → business_traces`。`builder.ts#buildRankingTrace`（纯函数）+ `facade.ts#explainRanking`；backfill 在 `rankByProfile`+`RankingFacade.store` 后为**每个** ranking 生成并持久化 trace。
- **5 个 ranking 均有对应 current trace** — 每次 run 5 条，`ranking_id ↔ trace_id ↔ SKU` 一一对应，`/api/trace/:traceId` 可读（`TraceFacade.load` round-trip）。
- **trust 用真实 productTop input** — confidence=0.9 / coverage=0.2（单信号 `gmv_growth_1d` 只覆盖 growth 组件）→ `detectContradictions` Rule 5 `low_coverage` → `is_supported=false` → `trust_score=0.12`（>0，非 stale 的 0）。
- **Workspace consumer：仍未 WIRE** — 本轮只接 producer，下一刀才接消费端。
- **Trace history：append-only（本轮接受）** — `storeTrace` 纯 INSERT + `ranking_id` 每次 `rankProducts` 重生成 + backfill 每启动跑一次 → 每启动 +5 行 trace。
- **Known issue（非 bug，本轮不修）** — 旧 trace 的 `ranking_id` 在 `ranking_results` upsert 覆盖后成为 dangling reference；未来 Replay/Audit 需设计 ranking snapshot / retention policy。本轮不改 `TraceFacade.store` / `ranking_id` 生成 / DB unique constraint。

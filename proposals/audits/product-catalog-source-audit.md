# Product Catalog Canonical Source Audit

- **日期**: 2026-08-20
- **类型**: 只读审计（Product Catalog 数据溯源）
- **问题**: Fabric 已掌握的 JD 世界里，是否存在足以持续维护 canonical Product Catalog 的数据源？断在哪一跳？

---

## 0. 结论一句话

**存在。`getProductList`（商品列表）就是 canonical Product Catalog 源，P0005.1 当年就明确设计过 `product_catalog`。它断在 2 跳：① 不在 steady-state CDP 采集列表；② 不在 evidence 持久化 filter。**

---

## 1. products 67 行 = agentCMS 迁移遗留

| 项 | 值 |
|---|---|
| 来源 | `migrate-agentcms-data.ts` 读 `AGENTCMS_ROOT/data/products.json` |
| name | 67 distinct（部分真名「祁门红茶…」，部分裸 sku_id） |
| price / stock / category | **全同**（200 / 100 / 茗茶）—— placeholder 默认值 |
| 判定 | **STALE / REMOVE CANDIDATE**（price/stock/category 假；JD 真实商品 ~5-6 个，非 67） |

---

## 2. JD 商品 endpoint（真实 catalog 源）——全都有，只是没接

| endpoint | 语义 | response | parser | contract | CDP 验证 | 进 Runtime |
|---|---|---|---|---|---|---|
| **getProductList** | 商品列表（spu_id + proName + proPic + proUrl + sku 指标） | ✅ 26 字段 | ✅ 18 字段 aggregate | ✅「商品表现」cap | ✅ `首页_getProductList_...` | ❌ 不在 DEFAULT_JD_APIS |
| getProductAnalysisData | 商品经营分析（spu_id + proUrl） | ✅ 16 字段 | ✅ 5 字段 aggregate | ✅ | ✅ `首页_getProductAnalysisData_...` | ⚠️ 在 DEFAULT_JD_APIS 但被丢弃 |
| getProductListByChannel / getProductRankListDetail / getProductHead / shopGoodsList | 渠道商品/排名明细/商品头/店铺商品 | ✅ | ✅ | — | ✅ | ❌ |

`getProductList` 真实内容（6 条 = 店铺商品列表）：`spu_id + hb_spu_id + proName + proPic + proUrl + sku 指标(sku_qtty/brow_cnt/deal_rate)`。

---

## 3. productTop 语义 = Top-N observation，不是 catalog

- 2 字段（sku_id + gmv），contract 里是 `product_top5` 维度。
- **禁止用 5 SKU 覆盖 products 表** —— productTop 是「热销排行样本」，不是「商品全集」。

---

## 4. 历史设计：P0005.1 已经写过

`proposals/P0005.1-jd-connector.md`：
```
130: Products: 商品列表 (SKU + SPU)
194: 'product_catalog',  // 商品列表
```

---

## 5. 两个断点（都在 Runtime 接线，不在探索）

```
断点 ① 采集：DEFAULT_JD_APIS = ['summary','trend','productTop','getProductAnalysisData','getFlowAnalysisData']
             → getProductList 不在里面，steady-state CDP 不采它
断点 ② 持久化：createLocalFirstLiveAcquire 的 persistable filter 只留 summary/trend/productTop
             → getProductAnalysisData 采了也被丢弃；getProductList 即使采也会被丢
```

---

## 6. 分类

| 资产 | 判定 |
|---|---|
| `getProductList`（商品列表） | **REUSE + WIRE**——canonical catalog 源，response/parser/contract/design 全有，缺采集+持久化接线 |
| `getProductAnalysisData` | **REUSE + WIRE**——采了但被丢弃 |
| `productTop` | **REUSE**（Top-N observation，已接 ranking，**不是 catalog**） |
| products 67（agentCMS） | **REMOVE CANDIDATE**（stale + placeholder 字段 + 数量虚高） |

---

## 7. 关键文件索引

- `scripts/migrate-agentcms-data.ts` — 67 products 的来源（agentCMS）
- `generated/connector-blueprint.json` — parser_plan.rules（getProductList 18 字段 aggregate 等）
- `discovery/jd-capability/api_inventory.json` — getProductList 26 字段 response schema
- `discovery/jd-capability/api-responses/首页_getProductList_*.json` — 真实 CDP 捕获响应
- `apps/ecommerce/connectors/jd/acquisition/cdp-client.ts` — `DEFAULT_JD_APIS`（缺 getProductList）
- `apps/ecommerce/connectors/jd/historical-acquire.ts` — persistable filter（只留 summary/trend/productTop）
- `apps/ecommerce/connectors/jd/parsers/index.ts` — `parseJdPayload` → `ParsedJdData.top_products`（只解析 productTop，不解析 getProductList）
- `platform/storage/schema.ts` — products 表（price/stock/category NOT NULL）

---

## 附：Product Catalog Consolidation 最终结论（2026-08-20）

### 结论

- **getProductList canonical source 判断仍成立** —— 商品列表（SKU+SPU）确实是完整 Catalog 的正确数据源。
- **steady-state acquisition = BLOCKED: unstable SPA trigger** —— 正常页面交互只能触发 `requestType=tradeTop`，语义是 Top observation，不是完整 Catalog。
- **实测请求**：`POST indexSummary/analysis/getProductList.ajax`，body `{"proType":"spu","requestType":"tradeTop","dateType":"todayRealtime",...}` → 返回 **1 个 TOP 商品**（非 6 商品）。
- **禁止把 TOP1/TOP-N 当 canonical catalog**（它是排行样本）。
- **不继续猜测/构造未知 requestType**（discovery 只存 response 不存 request，无法得知 6 商品的 requestType；构造请求违反边界）。

### 代码状态

| 资产 | 状态 |
|---|---|
| nullable `products` schema（category/price/stock） | **REPAIR / KEEP** |
| `projectProductCatalog`（producer） | **KEEP / dormant**（等有可信 acquisition 再启用） |
| `getProductAnalysisData` Evidence persistence | **KEEP**（已落盘，是真实收益） |
| catalog refresh wiring（backfill 里 getProductList→products） | **已删除调用**（避免 inert 假闭环；只保留 producer） |
| `acquireJdProductList` | **REMOVED** |

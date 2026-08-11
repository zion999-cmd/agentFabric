# P0006 Data Acquisition Report

**Date**: 2026-08-11  
**Status**: Phase 1 Complete — Live CDP Verified (TransactionOverview), Multi-Page Discovery Done  
**Next**: Per-Page CDP Verification → Continuous Collection

---

## 1. Data Source Exploration

### 1.1 JD 商智 Platform Map

通过 `sources/jd_smart/blueprint.yaml`（人工维护的平台导航地图），已完整探索京东商智的页面结构：

| 页面 ID | 名称 | 数据状态 | 说明 |
|---------|------|---------|------|
| home | 首页 | ✅ 有数据 | 核心看板（GMV/订单/访客/转化率） |
| trade | 交易 | ✅ 有数据 | 交易概况/品牌构成/类目构成/渠道构成 |
| product | 商品 | ✅ 有数据 | 商品概况/动销SPU/热销商品榜 |
| traffic | 流量 | ✅ 有数据 | 流量概况/来源渠道/搜索分析/商品表现 |
| service | 体验 | ✅ 有数据 | 服务概览/店铺星级/服务运营 |
| industry | 市场 | ✅ 有数据 | 行业大盘/行业排行/品牌排行 |
| reports | 报表 | ✅ 有数据 | 下载中心/下载列表 |
| customer | 用户 | ❌ Popup | 以弹窗形式打开，不是独立页面 |
| marketing | 营销 | ❌ Popup | 以弹窗形式打开 |
| supply_chain | 供应链 | ❌ Popup | 以弹窗形式打开 |

**总计**: 10 个一级菜单 → 7 个有业务数据（366 个子菜单项）。

### 1.2 Discovery 资产

| 资产 | 路径 | 内容 |
|------|------|------|
| Blueprint YAML | `sources/jd_smart/blueprint.yaml` | 平台地图、数据集清单、指标发现、维度发现、关系推断 |
| Endpoint Catalog | `catalog/jd/endpoints.json` | 518 端点 × 15 页面的结构化目录（含 capability、source、validation、schema） |
| Capability Map | `catalog/jd/capability.md` | 按业务领域分组的可读能力地图 |
| D0002 Report | `discovery/jd-capability/` | 完整探索报告、页面截图、DOM 快照、指标字典 |

---

## 2. Data Acquisition Capabilities

### 2.1 CDP 采集链路

```
Chrome (--remote-debugging-port=9222)
    │
    ▼ playwright-core connectOverCDP()
    │
    ▼ page.route('**/szgateway.jd.com/**')  ← 拦截所有 JD API 调用
    │
    ▼ for each date: navigate → wait SPA polling → capture responses
    │
    ▼ JdApiResponse { header, body } → indicator-map.ts → canonical metrics
    │
    ▼ Evidence Store (data/evidence/jd/YYYY/MM/DD_type.json + .meta.json)
    │
    ▼ normalizer.ts → EnterpriseSignal → SQLite signals table
```

**关键能力**:
- 被动拦截（zero network modification）：不修改请求，只监听响应
- Hash 导航保持登录态：`page.goto('#/urlPath')` 而非完整 URL
- SPA 轮询等待 + reload 机制：解决页面空闲停止轮询的问题

### 2.2 页面导航能力

| 方法 | 工具 | 覆盖页面 | 状态 |
|------|------|---------|------|
| 首页被动拦截 | `cdp-client.ts` (TS) | 首页（indexSummary） | ✅ 已验证（GMV 对齐） |
| 顶层页面导航 | `cdp-client.ts → acquireJdMultiPage()` (TS) | 7 个 has_data 页面 | ⚠️ 仅首页有业务数据（其他页未点击子菜单） |
| 子菜单点击 + 全量采集 | `collect_jd_data.py` (Python) | 7 页面 × 子菜单 | ⚠️ 已采集 49 APIs 但未逐页验证 |

**关键限制**: JD 商智是 AngularJS SPA，首页自动轮询 indexSummary gateway。其他页面（交易/商品/流量/服务/行业）需要：
1. 导航到页面
2. 点击子菜单 tab（如"来源渠道"）
3. 等待对应 gateway API（如 `getFlowDetail`）触发

Python 脚本通过 playwright 点击交互处理了子菜单，TypeScript 版本尚未实现。

### 2.3 API Discovery 方法

```
D0002 (2026-06-30): Python playwright CDP → 全页面导航 → 被动捕获所有 szgateway API
    ↓
P0006.4 (2026-08-09): TypeScript CDP → 单页面拦截 → 4 API 已连接验证
    ↓
P0006.5 (2026-08-10): Python Full Discovery → 49 APIs captured across 7 pages
```

### 2.4 Raw Response → Canonical Schema

```
JD API Response (opaque JDR keys)
    │
    ▼ indicator-map.ts (17 hand-written overrides)
    │  jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot → gmv
    │  jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot → orders
    │  ... (17 keys total for core + comparison metrics)
    │
    ▼ Generated Dictionary (887 keys via algorithmic JDR parsing)
    │  Parses JDR key structure: jdr_sch_{domain}_{metric}_{aggregation}_{dataset}
    │  Contains canonical, unit, confidence fields
    │
    ▼ normalizer.ts (JD_SPEC / TMALL_SPEC)
    │  Final mapping: canonical name → EnterpriseSignal field
    │  Supports: gmv, orders, refunds, roi, uv, click_rate, cart_adds,
    │            ad_spend, ad_orders, cpa, cpc, ctr, cvr, impressions, clicks
    │
    ▼ EnterpriseSignal { signal_id, signal_type, metrics, confidence, ... }
```

**##compareValue Bug Fix (Critical)**: 发现 JDR 的 `##compareValue` 后缀 key（如 `…_snapshot##compareValue`）与基准指标 key（`…_snapshot`）映射到相同的 canonical name，导致比较值覆盖真实值。已添加唯一 canonical name 覆盖（`gmv_compare_value` 等）。

---

## 3. Data Assets

### 3.1 Evidence Store

```
data/evidence/jd/
├── 2026/01/   (daily: summary.json, trend.json, productTop.json)
├── 2026/02/
├── 2026/03/
├── 2026/04/
├── 2026/05/
├── 2026/06/
├── 2026/07/
└── 2026/08/

Total: 594 evidence files (data + meta pairs) across 8 months
       Each file: {DD}_{type}.json + companion {DD}_{type}.meta.json
```

**Evidence 类型**:
- `summary` — 每日核心指标（GMV/订单/访客/客户/转化率 + 环比）
- `trend` — 24 小时趋势（小时级 GMV 细分）
- `productTop` — Top 5 商品排行（SKU ID + GMV + 商品链接）

### 3.2 Capability 分类

按业务语义（非技术 URL）组织的 7 个 capability domains：

| Domain | APIs (catalog) | Live CDP | 代表指标 |
|--------|---------------|----------|---------|
| trade (交易) | 48 | ✅ 首页已验证 | gmv, orders, visitors, cvr |
| traffic (流量) | 20 | ⬜ | visitors, uv, pv, bounce_rate |
| product (商品) | 18 | ⬜ | sku_count, sku_gmv, sku_rank |
| customer (客户) | 20 | ⬜ | new_customers, repeat, members |
| marketing (营销) | 20 | ⬜ | ad_spend, roi, cpa |
| supply_chain (供应链) | 10 | ⬜ | stock_days, stockout_risk |
| platform (平台) | 8 | ⬜ | platform_params |

### 3.3 Endpoint 统计

| 类别 | 数量 | 说明 |
|------|------|------|
| 唯一业务 API（去重后） | ~70 | 每页 ~10 个独特端点 |
| Catalog 注册端点 | 518 | 含每页重复的基础设施 API |
| Python 已采集 | 49 | 7 页面全量子菜单 |
| TS 已验证对齐 | 3 | summary, trend, productTop |
| 未验证 | 46 | 已捕获但未与页面显示比对 |

---

## 4. Semantic Understanding

### 4.1 JD 原始字段命名解析

JDR（JD Raw）key 结构已解码：

```
jdr_sch_{domain}_{metric}_{aggregation}_{dataset}

Examples:
jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot
  → domain: trade, metric: deal_order_amount, aggregation: sum, dataset: deal_snapshot

jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg
  → domain: traffic, metric: browse_sku_page_count, aggregation: di (daily)

fo_jdr_sch_industry_deal_rate
  → prefix: fo (formula), domain: industry, metric: deal_rate
```

**后缀编码**:
- `##compare` — 环比百分比变化
- `##compareValue` — 环比绝对值（对比期数据）
- `##customProportion` — 自定义占比

### 4.2 Metric/Domain/Entity/Dimension 提取

**已识别 Metrics**（23 个，来自 blueprint.yaml）:
- 成交金额（跨 5 个数据集出现）→ canonical: `gmv`
- 访客数（跨 5 个数据集出现）→ canonical: `visitors`
- 成交单量（跨 3 个数据集出现）→ canonical: `orders`
- 成交商品件数（跨 2 个数据集出现）
- 成交转化率、商详访客数、引入成交金额等

**已识别 Domains**: trade, traffic, product, customer, marketing, supply_chain, platform

**已识别 Entities**: product, brand, channel, shop, keyword

**已识别 Dimensions**: date (日期筛选), query/reset (查询/重置按钮组)

**已推断关系**（24 个）:
- 指标重叠：9 个（如"成交金额出现在 ProductRanking/ChannelRanking/ShopRanking/BrandComposition/BrandRanking"）
- 维度层级：5 个（product/brand/channel/shop/keyword）
- 跨页指标：3 个（成交金额/访客数/商品信息在多个页面出现）
- 计算公式假设：4 个（CTR/CVR/AOV/Growth Rate）
- 数据依赖：3 个（如"商品表现依赖于商品信息和流量数据"）

### 4.3 已形成的统一业务概念

| 业务概念 | Canonical Name | 数据来源 |
|---------|---------------|---------|
| 成交金额 | `gmv` | 首页/交易/商品/流量/行业 |
| 成交订单数 | `orders` | 首页/交易 |
| 商品访客数 | `visitors` | 首页/流量 |
| 成交客户数 | `customers` | 首页/客户 |
| 成交转化率 | `conversion_rate` | 首页/商品 |
| 环比变化 | `*_compare_pct` | 所有指标 |
| 对比期值 | `*_compare_value` | 核心指标 |
| 小时 GMV | `gmv_hourly` | trend.ajax |
| Top 商品 | `sku_id/name/gmv` | productTop |

---

## 5. Provenance

### 5.1 Evidence 来源追踪

每条 evidence 记录包含两个维度的 provenance：

```
acquisition_method  (数据如何获取的 — 不可变)
  ├── cdp              — Live Chrome CDP 拦截
  ├── mock             — 模拟数据（mockJdPayload）
  ├── import-agentcms  — agentCMS JSON 批量导入
  └── unknown          — legacy 未记录

processing_method   (数据最近一次处理方式 — 可更新)
  ├── runtime          — 单日 kernel.execute() 管线
  ├── replay           — 多日 runReplay() 管线
  ├── import           — executeImportPipeline()
  └── none             — 原始采集，未处理
```

### 5.2 Live CDP vs Replay 区别

| 维度 | Live CDP | Replay |
|------|---------|--------|
| acquisition_method | `cdp` | `cdp`（原始采集方式不变） |
| processing_method | `runtime` | `replay` |
| 数据来源 | Chrome 实时拦截 | 从 evidence 文件重放 |
| 用途 | 日常新增数据 | 回填历史/重新处理 |
| 时间戳 | 采集时刻的 now() | 原始 acquired_at 不变 |

### 5.3 当前数据真实性状态

| 数据集 | 真实性 | 依据 |
|--------|--------|------|
| TransactionOverview | ✅ **已验证** | 2026-08-09 CDP GMV=¥4,634.40 与 JD 商智页面显示一致 |
| ProductPerformance | ⚠️ **已捕获未验证** | Python 已采集 getProductTop/getProductExpress，但未逐值与页面比对 |
| TrafficSource | ⚠️ **已捕获未验证** | getFlowDetail/getFlowSrcTop 已采集 |
| StoreServiceMetrics | ⚠️ **已捕获未验证** | getServiceSummary 已采集 |
| IndustryBenchmark | ⚠️ **已捕获未验证** | getBrandTable/brandTopv2 已采集 |
| AdvertisingPerformance | ⚠️ **需广告账户** | getAdSummaryAndTrend 已采集但可能为空 |
| Competition | ❌ **需付费** | ¥8,856/年 数据尊享包 |

---

## 6. Current Gaps & Next Steps

### 6.1 未验证页面

| 页面 | 状态 | 阻塞原因 |
|------|------|---------|
| 交易概况（trade detail） | ⬜ 未验证 | TS 未实现子菜单点击 |
| 流量概况/来源渠道（traffic） | ⬜ 未验证 | TS 未实现子菜单点击 |
| 商品概况（product） | ⬜ 未验证 | TS 未实现子菜单点击 |
| 服务概览（service） | ⬜ 未验证 | TS 未实现子菜单点击 |
| 行业大盘（industry） | ⬜ 未验证 | TS 未实现子菜单点击；数据是 indexed 非绝对值 |
| 客户总览（customer） | ⚠️ Popup | 弹窗形式，需特殊处理 |
| 营销概览（marketing） | ⚠️ Popup | 弹窗形式 |
| 竞争（competition） | ❌ 付费 | ¥8,856/年 |
| 广告（advertising） | ⚠️ 需账户 | 需开通广告账户 |

### 6.2 已知字段未解码

Python discovery 捕获了 49 个 API 响应中的 JDR 字段，但仅 17 个核心指标有手写 canonical 映射。剩下的 ~870 个字段通过生成的 indicator dictionary 进行算法解析，confidence 低于手写覆盖。

### 6.3 下一阶段建议

**P0006.1 — 逐页 CDP 验证**（priority: HIGH）
1. 流量页（traffic）：getFlowDetail + getFlowSrcTop → 与页面显示比对
2. 交易页（trade）：品牌构成/类目构成/渠道构成 → 与页面显示比对
3. 商品页（product）：getProductExpress + getProductList → 与页面显示比对

**P0006.2 — 子菜单交互**（priority: HIGH）
- TypeScript CDP client 实现子菜单点击 + tab 切换（参考 Python `collect_jd_data.py` 中的 playwright 交互模式）

**P0006.3 — 持续采集**（priority: MEDIUM）
- 不需要自动化 Chrome 启动/登录
- 人工启动 Chrome → Claude Code 执行每日 collect 即可
- 当前 `npm run cli -- collect jd jd_shop_001 --mode live --date YYYY-MM-DD` 已可用

**P0006.4 — 数据集文档补全**（priority: LOW）
- StoreServiceMetrics.md
- IndustryBenchmark.md
- 各数据集逐字段 JDR key → canonical 映射表

---

## Appendix: Key Files Reference

| 文件 | 作用 |
|------|------|
| `sources/jd_smart/blueprint.yaml` | 平台导航地图（人工维护） |
| `catalog/jd/endpoints.json` | 518 端点结构化目录 |
| `catalog/jd/capability.md` | 业务能力地图 |
| `discovery/jd-capability/` | D0002 完整探索资产 |
| `data/jd_full_discovery.json` | Python 49 API 全量快照（632KB） |
| `data/jd_live_data.json` | 历史快照 2026-07-13（607KB） |
| `data/evidence/jd/` | 594 evidence 文件（8 个月 × 3 类型） |
| `scripts/collect_jd_data.py` | Python CDP 全量采集 |
| `scripts/cli.ts` | TypeScript CLI（collect/discover/rank） |
| `apps/ecommerce/connectors/jd/acquisition/cdp-client.ts` | TS CDP 拦截核心 |
| `apps/ecommerce/connectors/jd/parsers/indicator-map.ts` | JDR → canonical 映射 |
| `apps/ecommerce/connectors/normalizer.ts` | Cross-platform signal normalizer |
| `apps/ecommerce/connectors/evidence/store.ts` | Evidence Store (immutable file-based) |
| `generated/indicator.generated.json` | 算法生成的指标字典 |

---

*此报告不涉及 P0007（运营理解、Pattern、Memory、Skill 生产）。P0007 以 P0006 数据资产为基础构建。*

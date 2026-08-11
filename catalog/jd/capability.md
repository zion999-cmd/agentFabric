# JD 商智 Capability Map v0.2.0

> D0002 Discovery → P0006.4 Live CDP → P0006.5.1 Semantic Classification  
> Updated: 2026-08-09  
> Source: Chrome CDP → jdsz.jd.com → API interception

## Capability Domains (Business-Semantic View)

Instead of page-by-page URL lists, capabilities are organized by **what business question they answer**:

```
jd-sz (京东商智)
├── trade           48 APIs  ✅ 1 page live-verified
│   ├── overview      (首页)         ✅ GMV, orders, visitors, cvr
│   ├── detail        (交易概况)      ⬜ refunds, revenue/customer
│   ├── industry      (大盘动态)      ⬜ indexed rank, market share
│   ├── competition   (竞店概况)      ⚠️ requires premium ¥8,856/yr
│   └── report        (我的报表)      ⬜ custom reports
│
├── traffic         20 APIs  ⬜
│   ├── overview      (流量概览)      ⬜ visitors, uv, pv, bounce
│   └── realtime      (实时总览)      ⬜ realtime GMV/orders/visitors
│
├── product         18 APIs  ⬜
│   ├── overview      (商品概况)      ⬜ SKU count, rank, turnover
│   └── selection     (智能选品)      ⬜ recommendations
│
├── customer        20 APIs  ⬜
│   ├── overview      (客户总览)      ⬜ new/repeat, members, fans
│   └── service       (服务分析)      ⬜ response, resolution, satisfaction
│
├── marketing       20 APIs  ⬜
│   ├── overview      (营销概览)      ⬜ ad spend, ROI, CPA
│   └── cart          (购物车营销)     ⬜ cart abandon/recovery
│
├── supply_chain    10 APIs  ⬜
│   └── inventory     (库存预警)      ⬜ stock days, stockout risk
│
└── platform         8 APIs  ⬜
    └── business      (业务专区)      ⬜ platform params
```

### Validation Status

| Domain | Live CDP | APIs Connected | Sample Metrics |
|--------|----------|---------------|----------------|
| trade.overview | ✅ P0006.4 | 3/70 | gmv, orders, visitors, customers, cvr |
| trade.detail | ⬜ | 0/48 | refunds, revenue/customer |
| trade.industry | ⬜ | 0/23 | indexed rank, market share |
| traffic.overview | ⬜ | 0/48 | visitors, uv, pv, bounce |
| product.overview | ⬜ | 0/48 | SKU count, rank |
| customer.overview | ⬜ | 0/33 | new/repeat, members |
| marketing.overview | ⬜ | 0/48 | ad spend, ROI |
| supply_chain.inventory | ⬜ | 0/44 | stock days, risk |
| trade.competition | ⚠️ Premium | 0/18 | locked |

### Machine-Readable Catalog

See `endpoints.json` for the full structured catalog with:
- `capability` path (e.g. `trade.overview`)
- `source` (discovered_by, discovered_at, evidence_path)
- `validation` (last_test, status, sample_metrics)
- `schema` (input_params, output_fields)

## Platform Overview

```
京东商智 (sz.jd.com / jdsz.jd.com)
├── 15 pages discovered
├── 70 unique API endpoints
├── 1,060 API calls captured
├── 5 pages verified with live data
└── 16 unique JDR indicators mapped
```

## Page → API → Metrics Map

### 1. 首页 (indexSummary) — ✅ Live CDP Verified

**URL**: `jdsz.jd.com/szweb/view/index/home.html`  
**Status**: Live data confirmed (P0006.4)  
**APIs**: 70 endpoints  
**Gateway**: `szgateway.jd.com/api/lowcode/indexSummary/`

| Endpoint | Type | Metrics | Connected |
|----------|------|---------|-----------|
| `summary.ajax` | aggregate | GMV, orders, visitors, customers, conversion_rate, WoW comparisons | ✅ P0006.4 |
| `trend.ajax` | time_series | 24h hourly GMV breakdown | ✅ P0006.4 |
| `productTop` | ranking | Top 5 products by GMV (sku_id, name, item_url) | ✅ P0006.4 |
| `getProductAnalysisData` | analysis | Product detail metrics | ⬜ Not yet |
| `getFlowAnalysisData` | analysis | Traffic source breakdown | ⬜ Not yet |
| `getProductList` | list | Full product catalog with metrics | ⬜ Not yet |
| `getChannelList` | list | Channel performance ranking | ⬜ Not yet |
| `getIndustryTopTable` | ranking | Industry benchmark comparison | ⬜ Not yet |
| `getShopStars` | score | Shop rating/star level | ⬜ Not yet |
| `getShopValueProposition` | score | Shop value proposition assessment | ⬜ Not yet |

**JDR Indicators** (raw → canonical):
```
jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot       → gmv
jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot      → orders
jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg → visitors
jdr_sch_user_deal_ord_user_cnt_sz_user_deal_snapshot        → customers
fo_jdr_sch_industry_deal_rate                                → conversion_rate
##compare variants                                            → WoW comparison
```

### 2. 行业-大盘动态 (industryMarket) — ⬜ Live Data

**APIs**: 23 endpoints  
**Gateway**: `szgateway.jd.com/api/lowcode/industryMarket/`  
**Key endpoints**: `getRealSummaryData`, `getRealSeriesData`, `getProductRankListDetail`, `getShopRankListDetail`  
**Note**: Industry data is indexed (not absolute values) — JD exposes OrdAmtIndex/UVIndex

### 3. 客户-客户总览 (custGrowth) — ⬜ Live Data

**APIs**: 33 endpoints  
**Gateway**: `szgateway.jd.com/api/lowcode/custGrowth/`  
**Key endpoints**: `summary`, `trend`, `shopAsset`, `shopGoodsList`, `audienceInfo`  
**Note**: Customer segmentation data — new/old customers, members, fans

### 4. 营销-营销概览 (marketing) — ⬜ Live Data

**APIs**: 48 endpoints  
**Gateway**: `szgateway.jd.com/api/lowcode/marketing/`  
**Key endpoints**: `overview`, `getMarketingActivityList`, `getMarketingTrend`

### 5. 供应链-库存预警 (stock) — ⬜ Live Data

**APIs**: 44 endpoints  
**Gateway**: `szgateway.jd.com/api/lowcode/stock/`  
**Key endpoints**: `getAlarmOverview`, `getHealthOverview`, `getIndicatorOverview`

### 6. 流量-流量概览 (traffic) — ⬜ Content Only

**APIs**: 48 endpoints  
**Status**: Page content captured, no live API data yet

### 7. 交易-交易概况 (transaction) — ⬜ Content Only

**APIs**: 48 endpoints  
**Status**: Page content captured, no live API data yet

### 8. 商品-商品概况 (product) — ⬜ Content Only

**APIs**: 48 endpoints

### 9. 实时-实时总览 (realtime) — ⬜ Content Only

**APIs**: 48 endpoints

### 10. 服务-服务分析 (service) — ⬜ Content Only

**APIs**: 48 endpoints

### 11. 竞争-竞店概况 (competition) — ⚠️ Requires Premium

**APIs**: 18 endpoints  
**Status**: Page content captured, but data requires ¥8,856/year 数据尊享包

### 12-15. 其他页面

- **揽客-购物车营销** — minimal data (18 endpoints, mostly empty responses)
- **智能工具-智能选品** — content present (8 endpoints)
- **报表-我的报表** — content present (8 endpoints)
- **业务专区** — content present (8 endpoints)

## Connected vs Discovered

```
Discovered: 70 APIs across 15 pages
Connected:  3 APIs (summary, trend, productTop) — 4.3%
Live CDP:   ✅ Verified (P0006.4)
```

## Capability Maturity

| Page | Live Data | API Connected | Metrics Mapped |
|------|-----------|---------------|----------------|
| 首页 | ✅ P0006.4 | 3/70 | 5 core + comparisons |
| 行业 | ✅ D0002 | 0/23 | ⬜ |
| 客户 | ✅ D0002 | 0/33 | ⬜ |
| 营销 | ✅ D0002 | 0/48 | ⬜ |
| 供应链 | ✅ D0002 | 0/44 | ⬜ |
| 流量 | ⬜ | 0/48 | ⬜ |
| 交易 | ⬜ | 0/48 | ⬜ |
| 商品 | ⬜ | 0/48 | ⬜ |
| 实时 | ⬜ | 0/48 | ⬜ |
| 服务 | ⬜ | 0/48 | ⬜ |
| 竞争 | ⚠️ Premium | 0/18 | ⬜ |

## Next: P0006.5 Validation

Priority order for live CDP verification:

1. **流量-流量概览** — traffic source data (highest value for explanation)
2. **客户-客户总览** — customer segmentation
3. **营销-营销概览** — campaign/ROI data
4. **供应链-库存预警** — inventory health

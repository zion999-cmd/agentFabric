# D0002 — JD Capability Discovery Report

> **Generated**: 2026-06-30 14:59 UTC  
> **Method**: CDP automated crawl of live 京东商智 SPA (`jdsz.jd.com`)  
> **Principle**: ALL conclusions from REAL API responses, never from page names

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Pages crawled | 15 |
| Pages with live API data | 5 |
| Unique API endpoints | 70 |
| Total API calls captured | 1060 |
| JDR indicator keys | 26 |
| Verified business contexts | 7 |
| Blocked (needs subscription) | 1 |

## Page Status

| Page | Status | APIs | JDR Keys |
|------|--------|------|----------|
| ✅ 首页 | data_present | 142 | 16 |
| 📄 实时-实时总览 | content_present | 102 | 0 |
| 📄 流量-流量概览 | content_present | 102 | 0 |
| 📄 商品-商品概况 | content_present | 102 | 0 |
| 📄 交易-交易概况 | content_present | 102 | 0 |
| 📄 服务-服务分析 | content_present | 102 | 0 |
| ✅ 营销-营销概览 | data_present | 102 | 0 |
| ✅ 供应链-库存预警 | data_present | 95 | 0 |
| ✅ 客户-客户总览 | data_present | 83 | 0 |
| ✅ 行业-大盘动态 | data_present | 66 | 0 |
| 📄 竞争-竞店概况 | content_present | 19 | 0 |
| ⚠️ 揽客-购物车营销 | minimal | 19 | 0 |
| 📄 报表-我的报表 | content_present | 8 | 0 |
| 📄 业务专区 | content_present | 8 | 0 |
| 📄 智能工具-智能选品 | content_present | 8 | 0 |

## API Modules Discovered

### common (平台) (55 endpoints)

- `audienceInfo` — 7 fields
- `commonParam` — 7 fields
- `conversionEffect` — 33 fields
- `dateRange` — 6 fields
- `diagnosis` — 16 fields
- `emergency` — 4 fields
- `getAnnouncement` — 10 fields
- `getCategory` — 6 fields
- `getChannelList` — 28 fields
- `getDefaultDt` — 4 fields
- `getDims` — 7 fields
- `getFlowAnalysisData` — 15 fields
- `getFlowHead` — 6 fields
- `getHomeBanner` — 13 fields
- `getHomeNotice` — 12 fields
- ... and 40 more

### industryMarket (行业) (2 endpoints)

- `getRealSeriesData` — 8 fields
- `getRealSummaryData` — 188 fields

### marketing (营销) (3 endpoints)

- `getMarketingActivityList` — 10 fields
- `getMarketingTrend` — 8 fields
- `overview` — 11 fields

### stock (供应链) (10 endpoints)

- `getAlarmOverview` — 16 fields
- `getAlarmStockOut` — 7 fields
- `getHealthOverview` — 15 fields
- `getIndicatorOverview` — 17 fields
- `getIndicatorSpotRateTrend` — 8 fields
- `getIndicatorTurnoverTrend` — 8 fields
- `getIndicatorUnsaleTrend` — 8 fields
- `getVenderCategory` — 11 fields
- `getVenderIndustry` — 4 fields
- `getVenderStore` — 5 fields

## Business Context Capability Matrix

The following contexts are VERIFIED from real API response data:

### Store (店铺)

Core store KPIs — GMV, orders, visitors, conversion

| Field | JD Key / Path |
|-------|---------------|
| GMV (元) | `jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot` |
| Orders (单) | `jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot` |
| Customers (人) | `jdr_sch_user_deal_ord_user_cnt_sz_user_deal_snapshot` |
| PV (次) | `jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg` |
| Items Sold (件) | `jdr_sch_trade_deal_ord_sku_qtty_sz_trade_deal_snapshot` |
| Conversion Rate (%) | `fo_jdr_sch_industry_deal_rate` |
| AOV (元) | `fo_jdr_sch_trade_deal_ord_amt_user_sz_trade_deal_snapshot` |
| SKU Traffic | `jdr_sch_traffic_brow_sku_cnt_jd_unified_attribution_sz` |

**APIs**: `summary.ajax`, `trend.ajax`, `shopLevel.ajax`, `targetState.ajax`

---

### Traffic (流量)

Traffic sources & channel analysis

| Field | JD Key / Path |
|-------|---------------|
| Channel Traffic | `jdr_sch_traffic_cha_last_field_src_rmad_sz_2` |
| Channel Conversion | `hb_fo_jdr_sch_fo_jdr_sch_traffic_intr_ord_cvr_deal_sz` |

**APIs**: `getFlowHead.ajax`, `getFlowAnalysisData.ajax`, `getChannelList.ajax`

---

### Product (商品)

Product rankings & analysis

| Field | JD Key / Path |
|-------|---------------|
| Top Products Ranking | `productTop → data[] per SKU` |
| Product GMV | `per-SKU gmv` |
| Product Image | `jdr_sch_sku_main_pic_address` |

**APIs**: `productTop.ajax`, `getProductAnalysisData.ajax`, `getProductList.ajax`

---

### Customer (客户)

Customer segmentation & growth

| Field | JD Key / Path |
|-------|---------------|
| New Customer Deal% | `summary.content.new.deal → 75.48%` |
| Old Customer Deal% | `summary.content.old.deal → 24.52%` |
| Member Deal% | `summary.content.member.deal → 12.52%` |
| Fans Count | `summary.content.fans.num → 68,391` |
| New Customers | `summary.content.new.num → 251,355` |
| Product Browse | `shopGoodsList.content[].browseCnt` |
| Product Add-to-Cart | `shopGoodsList.content[].addCartCnt` |
| Product GMV | `shopGoodsList.content[].gmv` |

**APIs**: `growthSummary/summary.ajax`, `growthSummary/shopGoodsList.ajax`, `growthSummary/audienceInfo.ajax`, `growthSummary/diagnosis.ajax`

---

### Industry (行业)

Industry benchmarks — INDEXED (JD hides absolute values)

| Field | JD Key / Path |
|-------|---------------|
| GMV Index | `OrdAmtIndex` |
| UV Index | `UVIndex` |
| PV Index | `PVIndex` |
| Orders Index | `OrdNumIndex` |
| Search Click Index | `SearchClickNumIndex` |
| AOV Index | `CustPriceAvgIndex` |
| Conversion Index | `ToOrdRateIndex` |
| Product Ranking | `getProductRankListDetail → content[]` |
| Shop Ranking | `getShopRankListDetail → content[]` |

**APIs**: `getRealSummaryData.ajax`, `getRealSeriesData.ajax`, `getProductRankListDetail.ajax`, `getShopRankListDetail.ajax`

---

### Marketing (营销)

Marketing campaign & promotion analysis

| Field | JD Key / Path |
|-------|---------------|
| Campaign List | `getMarketingActivityList` |
| Marketing Trend | `getMarketingTrend` |
| Overview | `overview` |

**APIs**: `overview.ajax`, `getMarketingTrend.ajax`, `getMarketingActivityList.ajax`

---

### Supply Chain (供应链)

Inventory health & supply chain diagnostics

| Field | JD Key / Path |
|-------|---------------|
| Inventory Alarm | `getAlarmOverview` |
| Stock Health | `getHealthOverview` |
| Spot Rate Trend | `getIndicatorSpotRateTrend` |
| Turnover Trend | `getIndicatorTurnoverTrend` |
| Unsaleable Trend | `getIndicatorUnsaleTrend` |

**APIs**: `getAlarmOverview.ajax`, `getHealthOverview.ajax`, `getIndicatorOverview.ajax`, `getIndicatorSpotRateTrend.ajax`, `getIndicatorTurnoverTrend.ajax`, `getIndicatorUnsaleTrend.ajax`

---

### Competition (竞争) 🔒

Competitor analysis — REQUIRES premium subscription

> ⚠️ Data尊享包 required. Help docs show: 竞店概况, 竞店对比, 竞品概况, 竞品对比, 竞争流失, 竞争配置

---

## API → Page Relationship Graph

Which pages call which APIs:

- `other/getProductRankListDetail.ajax` — 120 calls, 10,904,820B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +6 more
- `other/getShopRankListDetail.ajax` — 120 calls, 10,075,020B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +6 more
- `other/getRealSeriesData.ajax` — 90 calls, 1,259,910B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +6 more
- `other/getRealSummaryData.ajax` — 90 calls, 1,924,140B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +6 more
- `announcement/getAnnouncement.ajax` — 41 calls, 12,341B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `announcement/getLocalAnnouncement.ajax` — 41 calls, 1,845B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `other/shopAsset.ajax` — 36 calls, 13,860B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +5 more
- `common/getNewMenuTreeData.ajax` — 34 calls, 1,557,132B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `common/authCheck/lkActivityLists.ajax` — 24 calls, 2,976B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `getDefaultDt.ajax?tenantId=3/getDefaultDt.ajax` — 16 calls, 944B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +4 more
- `getPageInfo.ajax?menuCode=isvNew&path=%2Fszweb%2Fsz%2Fview%2Ffacilitator%2FsmartSelection.html/getPageInfo.ajax` — 15 calls, 28,455B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `other/list.ajax` — 15 calls, 1,290B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `other/table.ajax` — 15 calls, 1,290B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `attrAnalysis/getCategory.ajax` — 15 calls, 30,315B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `noOrderPrompt.ajax?level3menuCode=isvNew/noOrderPrompt.ajax` — 15 calls, 8,310B → 业务专区, 交易-交易概况, 供应链-库存预警, 商品-商品概况 +11 more
- `common/getUserIdentities.ajax` — 13 calls, 3,731B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `common/getMenuTree.ajax` — 13 calls, 602,953B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `common/getDims.ajax` — 13 calls, 2,291B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `common/getModelFunc.ajax` — 13 calls, 1,815B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `lowcode/common/commonParam.ajax` — 13 calls, 2,203B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `common/getPageFooter.ajax` — 13 calls, 4,394B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `lowcode/common/getSystemNotice.ajax` — 13 calls, 7,501B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `lowcode/common/getMenuNotice.ajax` — 13 calls, 1,612B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `lowcode/common/getWindowNotice.ajax` — 13 calls, 1,612B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +8 more
- `getPageInfo.ajax?menuCode=industryRealtimes&path=%2Fszweb%2Fsz%2Fview%2FindustryMarket%2FindustryRealTimeNew.html/getPageInfo.ajax` — 10 calls, 19,070B → 交易-交易概况, 供应链-库存预警, 商品-商品概况, 实时-实时总览 +6 more

## Key Findings

1. ✅ **summary.ajax is the richest single endpoint** — returns GMV, orders, visitors, conversion rate, AOV, items sold, industry benchmarks all in one call
2. ✅ **Industry data is INDEXED** — JD hides absolute values behind indices (OrdAmtIndex, UVIndex, etc.). Trend analysis still possible via index changes
3. ✅ **Customer API exposes demographic segments** — new/old/member/fan breakdown with deal shares and counts
4. ✅ **Supply chain APIs are fully accessible** — inventory health, alarms, turnover, spot rates all available
5. ⚠️ **Competition module requires 数据尊享包 (¥8,856/yr)** — 6 sub-modules inaccessible without premium
6. ⚠️ **Real-time/Traffic/Service pages use cross-subdomain SPA routing** — need special navigation logic to capture their APIs
7. ⚠️ **揽客 (Customer Acquisition) pages returned empty** — may need specific shop authorization
8. 📊 **JDR key naming pattern**: `jdr_sch_{domain}_{metric}_{source}` — machine-parseable
9. 📊 **All core metrics have ##compare (WoW) and ##compareValue variants** — built-in period comparison

## Next Actions

- [ ] **P0005.1-extend**: Extend CDP Connector to capture 行业/客户/营销/供应链 APIs (currently only 首页 APIs)
- [ ] **D0002.1**: Multi-day data collection to build complete JDR indicator map
- [ ] **D0002.2**: Re-crawl after 数据尊享包 subscription to unlock 竞争/完整行业 data
- [ ] **D0002.3**: Fix cross-subdomain SPA navigation to capture 实时/流量/服务 APIs
- [ ] **D0002.4**: Build JDR Key → Canonical Name auto-mapping engine

---

## Raw Assets

All discovery data in `discovery/jd-capability/`:

| File | Contents |
|------|----------|
| `D0002_JD_Capability_Report.md` | This report |
| `page_inventory.json` | 15 pages with status, URLs, text previews |
| `api_inventory.json` | 70 API endpoints with response field schemas |
| `indicator_dictionary_full.json` | 26 JDR indicator keys |
| `business_context_candidates.json` | API → Business Context mapping |
| `capability_matrix.json` | Page-API matrix |
| `screenshots/` | Full-page screenshots for each page |
| `dom/` | Full DOM snapshots (HTML) |
| `api-responses/` | All captured API response bodies |

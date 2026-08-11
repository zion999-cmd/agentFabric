# TransactionOverview

**Domain**: transaction  
**Grain**: daily (one row per day)  
**Source**: 首页 → summary.ajax (indexSummary module)  
**Acquisition**: CDP interception (verified: data matches JD 商智 page display)  

## Fields

| Field | JDR Key | Type | Description |
|-------|---------|------|-------------|
| `gmv` | `jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot` | currency (CNY) | 成交金额 |
| `orders` | `jdr_sch_trade_deal_ord_ord_qtty_sz_trade_deal_snapshot` | integer | 成交订单数 |
| `visitors` | `jdr_sch_traffic_brow_sku__page_cnt_traffic_plat_item_di_sz_bsg` | integer | 商品访客数 |
| `customers` | `jdr_sch_user_deal_ord_user_cnt_sz_user_deal_snapshot` | integer | 成交客户数 |
| `conversion_rate` | `fo_jdr_sch_industry_deal_rate` | percentage | 成交转化率 |
| `gmv_wow_pct` | `…##compare` (gmv) | percentage | GMV 环比变化 |
| `orders_wow_pct` | `…##compare` (orders) | percentage | 订单环比变化 |
| `visitors_wow_pct` | `…##compare` (visitors) | percentage | 访客环比变化 |

## Hourly Trend (trend.ajax)

| Field | JDR Key | Type | Description |
|-------|---------|------|-------------|
| `hour` | `dt` | datetime | 小时时间点 |
| `gmv_hourly` | `jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot` | currency | 小时 GMV |

24 rows per day. Non-zero values during business hours (8-22).

## Top Products (productTop)

| Field | JDR Key | Type | Description |
|-------|---------|------|-------------|
| `sku_id` | `sku_id` | string | SKU ID |
| `name` | `sku_id#name_cn` | string | 商品名称 |
| `gmv` | `jdr_sch_trade_deal_ord_ord_amt_sz_trade_deal_snapshot` | currency | 商品 GMV |
| `item_url` | `sku_id_item_url` | string | 商品链接 |

5 rows per day (Top 5 by GMV).

## Acquisition

```bash
npm run cli -- collect jd jd_shop_001 --mode live --date 2026-08-09
```

Output: 1 daily_summary signal + 12-24 hourly_traffic signals + evidence files.

## Verification

2026-08-09: CDP captured GMV=¥4,634.40, orders=25, visitors=448, CVR=5.58% — all match JD 商智 page display exactly.

# ProductPerformance

**Domain**: product  
**Grain**: daily  
**Source**: 商品页 → getProductTop, getProductExpress, getProductList, brandTopv2  
**Acquisition**: CDP (Python full discovery — requires sub-page navigation)  

## Available APIs

| API | Rows | Key Metrics |
|-----|------|-------------|
| `productTop` | 5 | Top 5 SKU by GMV |
| `getProductTop` | 5 | Traffic-attributed product ranking |
| `getProductExpress` | 8 | SKU performance snapshot (GMV, visitors, exposure, conversion) |
| `getProductList` | ? | Full product catalog with metrics |
| `brandTopv2` | 10 | Brand ranking by GMV/orders/traffic |
| `getGroupSummaryData` | 1 | Product group summary |
| `getGroupDetailSummaryData` | 1 | Detailed group breakdown |

## Key Fields (from getProductExpress)

| Field | JDR Key | Type |
|-------|---------|------|
| `gmv` | `jdr_sch_trade_deal_ord_ord_amt_*` | currency |
| `visitors` | `jdr_sch_traffic_brow_sku__page_cnt_*` | integer |
| `exposure` | `jdr_sch_traffic_exposure_*` | integer |
| `conversion` | `fo_jdr_sch_uv_value_sz` | ratio |
| `spu_detail_url` | `spuDetailPcUrl` | string |

## Acquisition

```bash
python3 scripts/collect_jd_data.py --cdp-port 9222 --output data/jd_full_discovery.json
```

Then extract product APIs from responses.

# TrafficSource

**Domain**: traffic  
**Grain**: daily  
**Source**: 流量页 → getFlowDetail, getFlowSrcTop, getFlowTrend  
**Acquisition**: CDP (Python full discovery)  

## Available APIs

| API | Rows | Key Metrics |
|-----|------|-------------|
| `getFlowDetail` | 5 | Traffic detail by source channel |
| `getFlowSrcTop` | 6 | Top traffic sources with attribution |
| `getFlowTrend` | 7 | 7-day traffic trend |
| `getFlowAnalysisData` | 1 | Traffic overview (may be empty) |

## Key Fields (from getFlowSrcTop)

| Field | JDR Key | Type |
|-------|---------|------|
| `channel_name` | `name` | string |
| `channel_rank` | `rank` | integer |
| `traffic_count` | `jdr_sch_traffic_brow_sku_cnt_jd_unified_attribution_sz` | integer |
| `traffic_wow` | `…##compare` | percentage |
| `traffic_share` | `…/…##customProportion` | percentage |
| `order_amount` | `jdr_sch_traffic_intr_ord_ord_amt_jd_unified_attribution_trade_deal_snapshot_sz` | currency |

## Acquisition

```bash
python3 scripts/collect_jd_data.py --cdp-port 9222 --output data/jd_full_discovery.json
```

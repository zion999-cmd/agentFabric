## Assertions

- jd_shangzhi `has_surface` jd_surface_trade_summary [verified] (evidence: ev_page_trade_summary)

- jd_surface_trade_summary `exposes_metric` jd_metric_gmv [verified] (evidence: ev_page_trade_summary)

- jd_metric_gmv `observable_by` szgateway.jd.com/api/lowcode/indexSummary/summary.ajax [verified] (evidence: ev_summary_response)

- jd_metric_gmv `observable_by` /szweb/api/trade/summary [suspected]

- jd_metric_gmv `supports_dimension` jd_dimension_time [verified] (evidence: ev_page_trade_summary)

- jd_surface_trade_summary `accessible_via` jd_feature_realtime_ranking [observed] (evidence: ev_feature_catalog)

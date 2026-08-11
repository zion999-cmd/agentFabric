# 京东商智 - 数据采集策略

## 采集方法

| 方法 | 描述 | 可靠性 |
|------|------|--------|
| CDP Browser | 通过 CDP 端口 9222 连接已有 Chrome 实例 | ✅ |
| XHR Capture | 从浏览器 DevTools 捕获 XHR 响应 | ✅ |
| CSV Export | 使用内置 CSV 导出功能 | ⚠️ 待验证 |
| DOM Extraction | 从渲染后的 DOM 中提取表格和指标数据 | ✅ |

## 推荐采集频率

| 数据集 | 频率 |
|--------|------|
| trade_summary | daily |
| product_performance | daily |
| traffic_source | daily |
| industry_trend | weekly |
| service_metrics | daily |

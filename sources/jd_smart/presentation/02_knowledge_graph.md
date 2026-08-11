# 京东商智 - 业务知识图谱

## 数据集总览

| 数据集ID | 名称 | 来源页面 | 粒度 | 行数 |
|----------|------|----------|------|------|
| ProductRanking | 热销商品排行榜 | 首页 | sku_day | 6 |
| ChannelRanking | 渠道排行 | 首页 | channel_day | 1 |
| ShopRanking | 店铺排行 | 首页 | shop_day | 1 |
| SalesTarget | 销售目标对比 | 首页 | month | 1 |
| BrandComposition | 品牌构成 | 交易 | brand_day | 3 |
| SearchKeyword | 搜索关键词 | 流量 | keyword_day | 6 |
| TrafficSource | 流量来源 | 流量 | product_day | 6 |
| ProductTrafficRanking | 商品流量排行 | 流量 | product_day | 9 |
| BrandRanking | 品牌排行 | 市场 | brand_day | 11 |
| ReportDownload | 报表下载列表 | 报表 | report | 2 |

## 数据集字段详情

### ProductRanking - 热销商品排行榜

| 字段 |
|------|
| 排名 |
| 商品信息 |
| 成交金额 |
| 访客数 |
| 成交转化率 |

### ChannelRanking - 渠道排行

| 字段 |
|------|
| 排名 |
| 渠道名称 |
| 引入成交金额 |
| 引入商详访客数 |
| 访客-成交转化率 |

### ShopRanking - 店铺排行

| 字段 |
|------|
| 排名 |
| 店铺 |
| 成交金额 |
| 访客数 |
| 成交单量 |

### SalesTarget - 销售目标对比

| 字段 |
|------|
| 月份 |
| 2025年销售额 |
| 2026年目标值 |
| 增长率 |
| 2026年销售额 |

### BrandComposition - 品牌构成

| 字段 |
|------|
| 品牌 |
| 成交金额 |
| 成交金额占比 |
| 成交商品件数 |
| 成交单量 |

### SearchKeyword - 搜索关键词

| 字段 |
|------|
| 关键词 |
| 引入访客数 |
| 引入成交金额 |

### TrafficSource - 流量来源

| 字段 |
|------|
| 商品信息 |
| 引入访客数 |
| 引入成交金额 |

### ProductTrafficRanking - 商品流量排行

| 字段 |
|------|
| 排名 |
| 商品信息 |
| 商品访客数 |
| 商品访客数占比 |
| 成交金额 |

### BrandRanking - 品牌排行

| 字段 |
|------|
| 排名 |
| 品牌名称 |
| 成交金额 |
| 成交单量 |
| 成交商品件数 |

### ReportDownload - 报表下载列表

| 字段 |
|------|
| 文件名称 |
| 来源类型 |
| 创建时间 |
| 下载状态 |
| 操作 |


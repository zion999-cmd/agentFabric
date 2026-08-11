# 京东商智 - 关系图谱

## 跨数据集指标重叠

| 共享指标 | 涉及数据集 | 置信度 |
|----------|-----------|--------|
| 成交金额 | ProductRanking, ChannelRanking, ShopRanking, BrandComposition, BrandRanking | 0.95 |
| 访客数 | ProductRanking, ShopRanking, SearchKeyword, TrafficSource, ProductTrafficRanking | 0.9 |
| 引入成交金额 | ChannelRanking, SearchKeyword, TrafficSource | 0.85 |
| 成交单量 | ShopRanking, BrandComposition, BrandRanking | 0.9 |
| 成交商品件数 | BrandComposition, BrandRanking | 0.9 |
| 商品访客数 | ProductTrafficRanking, ProductRanking | 0.85 |
| 商品访客数占比 | ProductTrafficRanking, ProductRanking | 0.8 |
| 转化率 | ChannelRanking, ProductRanking | 0.85 |
| 商详访客数 | ChannelRanking, ProductRanking | 0.8 |

## 业务实体层级

### 商品维度层级

- 实体类型: `product`
- 涉及数据集: ProductRanking, ProductTrafficRanking
- 置信度: 0.9

### 品牌维度层级

- 实体类型: `brand`
- 涉及数据集: BrandComposition, BrandRanking
- 置信度: 0.9

### 渠道维度层级

- 实体类型: `channel`
- 涉及数据集: ChannelRanking, SearchKeyword, TrafficSource
- 置信度: 0.85

### 店铺维度层级

- 实体类型: `shop`
- 涉及数据集: ShopRanking
- 置信度: 0.95

### 关键词维度层级

- 实体类型: `keyword`
- 涉及数据集: SearchKeyword
- 置信度: 0.9


## 指标计算假设

- **CTR = 点击数 / 曝光数**
  - 公式: `ctr = clicks / impressions`
  - 置信度: 0.7
- **转化率 = 成交单量 / 访客数**
  - 公式: `cvr = orders / visitors`
  - 置信度: 0.75
- **客单价 = 成交金额 / 成交单量**
  - 公式: `aov = gmv / orders`
  - 置信度: 0.8
- **增长率 = (本期 - 上期) / 上期**
  - 公式: `growth_rate = (current - previous) / previous`
  - 置信度: 0.9

# 京东商智 (JD Shangzhi) - World Discovery Artifact

> 探索日期：2026-08-13
> 目标店铺：祁门红茶官方旗舰店 (POP)
> 探索方式：CDP 浏览器自动化 + JavaScript 注入

---

## 1. 系统概述

### 1.1 系统身份
- **名称**: 京东商智 (JD Shangzhi)
- **类型**: 电商数据分析平台 (Business Intelligence)
- **目标用户**: 京东平台商家 (POP/自营)
- **域名**: `jdsz.jd.com`
- **技术架构**: SPA (Single Page Application), 基于 Vue/React 框架, 使用 ECharts 图表库

### 1.2 核心定位
商智是京东为商家提供的**一站式经营分析平台**，帮助商家监控店铺运营状态、分析用户行为、追踪流量来源、优化商品表现、监控竞争对手。

### 1.3 数据粒度
- **时间粒度**: 实时、天、周、月、自定义范围
- **对比维度**: 环比 (vs 上一周期)、同比 (vs 去年同期)
- **对比基准**: 同行同级均值、同行上级均值、相似店铺

---

## 2. 主要模块与页面结构

### 2.1 导航架构 (顶层)
```
首页 / 交易 / 商品 / 流量 / 用户 / 营销 / 体验 / 供应链 / 市场 / 报表
```

### 2.2 模块详情

#### 交易分析 (tradeAnalysis)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 交易概况 | `/szweb/view/tradeAnalysis/tradeSummary.html` | 成交金额、转化率、客单价等核心指标 |
| 订单明细 | `/szweb/view/tradeAnalysis/orderDetails.html` | 订单级别明细数据 |

**核心指标:**
- 成交金额 (GMV)
- 成交商品件数
- 成交客户数
- 成交单量
- 店铺成交转化率
- 加购商品件数/客户数
- 客单价
- 店铺浏览量/访客数
- 平均停留时长
- 加购转化率

**下钻维度:**
- 品牌构成
- 类目构成 (一级/二级类目)
- 渠道构成
- 地域构成 (省份/城市/城市级别)
- 新老客构成

---

#### 商品分析 (product)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 商品概况 | `/szweb/view/product/product360.html` | SPU/SKU 级别销售汇总 |
| 商品明细 | `/szweb/view/product/productDetail.html` | 商品级别明细列表 |
| 异常商品 | `/szweb/view/product/abnormal-product-temp.html` | 流量/转化异常商品预警 |
| 类目分析 | `/szweb/view/product/category-analyze-temp.html` | 按类目的销售分析 |
| 属性分析 | `/szweb/view/product/attr-analyze-temp.html` | 商品属性维度分析 |
| 单品监控 | `/szweb/view/product/single-product-monitor-temp.html` | 单个商品趋势追踪 |
| 新品分析 | `/szweb/view/product/new-product-analysis-temp.html` | 新上架商品表现 |
| 打标新品分析 | `/szweb/view/product/mark-new-product-temp.html` | 平台打标新品 |
| 预约商品分析 | `/szweb/view/product/order-product-temp.html` | 预约销售商品 |
| 预售商品分析 | `/szweb/view/product/presell-product-temp.html` | 预售商品表现 |

**核心指标:**
- 动销 SPU 数 / 动销率
- 加购 SPU 数
- 访问 SPU 数
- 上架 SPU 数
- 成交金额/件数/单量/客户数
- 成交转化率
- 客单价 / 件单价

**分析维度:**
- SPU (标准产品单位)
- SKU (库存单位)
- 渠道 (APP/Web)
- 品类
- 时间趋势

---

#### 流量分析 (flow)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 流量概况 | `/szweb/view/flow/flow-summary.html` | 全渠道流量汇总 |
| 流量来源 | `/szweb/view/view-source/view-flow.html` | 场域来源分析 |
| 实时访客 | `/szweb/view/flow/real-uv-temp.html` | 实时访客追踪 |
| 搜索数据概览 | `/squidweb/view/flow/searchOverview.html` | 搜索流量总览 |
| 商品排名定位 | `/squidweb/view/flow/rankLocation.html` | 搜索排名监控 |
| 实时搜索词 | `/szweb/view/flow/real-keyword-temp.html` | 实时热搜词 |
| 搜索词分析 | `/squidweb/view/flow/searchKeywordAnalysis.html` | 搜索词深度分析 |
| 推荐数据概况 | `/szweb/view/flow/recommend-summary-temp.html` | 推荐流量总览 |
| 推荐诊断 | `/szweb/view/flow/recommend-diagnosis-temp.html` | 推荐效果诊断 |
| 视频效果 | `/szweb/view/flow/video-effect-temp.html` | 视频内容效果 |

**流量结构:**
- **站内场域**: 搜索、频道、游戏、我的京东、推荐
- **站外渠道**: 社交媒体、外部广告等

**核心指标:**
- 进店访客数
- 进商详访客数
- 成交客户数
- 成交金额
- 商品浏览量
- 商品人均浏览量
- 平均停留时长
- UV 价值
- 客单价
- 商品曝光次数/人数

**搜索指标:**
- 搜索点击次数
- 搜索成交金额
- 关键词排名
- TOP5 关键词表现
- TOP5 商品表现

---

#### 用户分析 (customer/user)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 用户概况 | `/szweb/view/customer/cust-summarys-temp.html` | 消费者资产总览 |
| 用户洞察 | `/szweb/view/customer/cus-insight-temp.html` | 用户行为洞察 |
| 人群列表 | `/szweb/view/customer/audience-list-temp.html` | 人群包管理 |
| 触达记录 | `/szweb/view/customer/audience-reach-temp.html` | 营销触达历史 |
| 访客分析 | `/szweb/view/user/visitor-analysis-temp.html` | 访客行为分析 |
| 未购访客分析 | `/szweb/view/customer/customerpots-temp.html` | 未转化访客 |
| 新老客分析 | `/szweb/view/customer/customer-ords-temp.html` | 新老客对比 |
| 关注店铺用户概况 | `/szweb/view/customer/fans-summary-temp.html` | 粉丝总览 |
| 关注店铺用户特征 | `/szweb/view/customer/fans-feature-temp.html` | 粉丝画像 |
| 关注店铺用户质量 | `/szweb/view/customer/fans-quality-temp.html` | 粉丝价值 |
| Plus会员概况 | `/szweb/view/user/plus-member-summary-temp.html` | Plus 会员表现 |
| 会员权益效果 | `/szweb/view/user/member-benefits-temp.html` | 会员权益分析 |
| 会员概况 | `/szweb/view/customer/member-overview-temp.html` | 品牌会员总览 |
| 会员特征 | `/szweb/view/customer/member-feature-temp.html` | 会员画像 |
| 购物车营销 | `/szweb/view/venders/activity-lists-temp.html` | 购物车挽回活动 |
| 定向人群营销效果 | `/szweb/view/venders/activity-indexs-temp.html` | 营销活动效果 |
| 定向人群营销管理 | `/szweb/view/venders/analysis-lists-temp.html` | 营销活动管理 |

**消费者资产分层:**
```
可运营消费者资产 (267,501)
├── 潜在客户 (253,051) - 94.60%
│   ├── 进店 (9,339)
│   ├── 浏览商详 (8,653)
│   ├── 加购 (1,115)
│   └── 成交 (558)
└── 近30天新客 (558) - 0.21%
└── 365天存量客户 (13,892) - 5.19%
```

**转化漏斗:**
- 进店率: 3.68%
- 进店→浏览率: 92.65%
- 浏览→加购率: 12.89%
- 加购→成交率: 50.04%

---

#### 营销分析 (market)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 营销概览 | `/szweb/view/market/marketingtool-summary-temp.html` | 促销活动汇总 |
| 工具效果 | `/szweb/view/market/marketingtool-effect-temp.html` | 各促销工具效果 |
| 裂变优惠券 | `/szweb/view/market/coupon-share-overview-temp.html` | 分享券效果 |
| 店铺礼包 | `/szweb/view/market/shop-gift-overview-temp.html` | 店铺礼包效果 |
| 搭配购 | `/szweb/view/market/match-buy-temp.html` | 搭配销售效果 |
| 品牌购物卡 | `/szweb/view/market/brand-card-temp.html` | 购物卡效果 |
| 评价有礼 | `/szweb/view/market/rating-gift-reward-temp.html` | 好评返现效果 |
| 礼金促销 | `/szweb/view/market/gift-money-promotion-temp.html` | 礼金活动效果 |
| 膨胀金 | `/szweb/view/market/expansion-money-overview-temp.html` | 膨胀金效果 |
| 搭售活动分析 | `/szweb/view/market/bunding-sale-analysis-temp.html` | 搭售效果 |
| 活动分析 | `/szweb/view/market/promotion-analysis-temp.html` | 平台活动效果 |
| 活动对比 | `/szweb/view/market/promotion-compare-temp.html` | 活动横向对比 |
| 活动沉淀 | `/szweb/view/market/promotion-retention-temp.html` | 活动后留存 |
| 百亿补贴 | `/szweb/view/market/billionsubsidy-temp.html` | 百亿补贴表现 |
| 秒杀活动分析 | `/szweb/view/market/seckill-analysis-temp.html` | 秒杀活动效果 |
| 国补核销数据 | `/szweb/view/market/national-subsidy-temp.html` | 国家补贴核销 |
| 排行榜分析 | `/szweb/view/market/rank-analysis-temp.html` | 排行榜表现 |
| 试用分析 | `/szweb/view/market/trial-analysis-temp.html` | 试用活动效果 |
| 内容概览 | `/szweb/view/market/content-overview-temp.html` | 内容营销效果 |
| 内容明细 | `/szweb/view/market/content-detail-temp.html` | 内容详情 |
| 实时直播分析 | `/szweb/view/market/live-streaming-temp.html` | 直播带货效果 |
| 广告概况 | `/szweb/view/market/advert-summary.html` | 广告投放效果 |
| CPS联盟 | `/szweb/view/market/alliance-summary-temp.html` | CPS 联盟效果 |
| 共增营销 | `/szweb/view/market/gzyx-temp.html` | 共增营销效果 |

**核心指标:**
- 成交客户数
- 成交商品数
- 成交商品件数
- 成交金额
- 客单价 (ARPU)
- 新成交客户数
- 老成交客户数
- 成交老客占比

---

#### 体验分析 (service)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 服务概览 | `/szweb/view/service/service-summary.html` | 服务质量总览 |
| 店铺星级 | `/szweb/view/service/shop-experience-score.html` | 星级评分详情 |
| 售后分析 | `/szweb/view/service/after-sales-service-analysis-temp.html` | 售后处理分析 |
| 评价分析 | `/szweb/view/service/comment-analysis.html` | 商品评价分析 |
| 违规服务分析 | `/szweb/view/service/negative-service-temp.html` | 违规服务监控 |
| 售后考核 | `/szweb/view/service/after-sales-through-train-temp.html` | 售后考核指标 |
| 商品质量 | `/szweb/view/service/product-quality-temp.html` | 商品质量指标 |
| 物流履约 | `/szweb/view/service/logistics-quality-temp.html` | 物流履约表现 |
| 政企发票考核 | `/szweb/view/service/create-invoice-governance-temp.html` | 发票合规考核 |

**店铺星级构成:**
- 客服咨询 (权重 15%): 咚咚平均响应时长
- 物流履约 (权重 50%): 揽收率、配送时效、发货品退率
- 售后服务 (权重 20%): 售后时长、售后评价、平台介入率
- 商品体验 (权重 15%): 评价得分、品质退货率
- 附加项 (权重 10%): 金牌客服、运费险、复购率、价格力

**当前店铺星级**: 4.6 星 (体验得分 9.92)

---

#### 供应链分析 (inventory)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 库存预警 | `/szweb/view/inventory/Inventory-health-temp.html` | 库存健康度总览 |
| 布局诊断 | `/szweb/view/inventory/stock-diagnosis-temp.html` | 库存布局分析 |
| 入仓模拟 | `/szweb/view/inventory/in-store-temp.html` | 入仓效果模拟 |
| 库存分析 | `/szweb/view/inventory/supplys-temp.html` | 库存周转分析 |
| 库存诊断 | `/szweb/view/inventory/supplys-diagnosis-temp.html` | 库存问题诊断 |
| 配送分析 | `/szweb/view/inventory/deliverys-temp.html` | 配送效率分析 |

**核心指标:**
- 库存健康度评分
- 件数周转天数
- PV 现货率
- 畅销品现货率
- 滞销库存占比
- 不动销库存占比
- 缺货商品数
- 预估销售损失

---

#### 市场分析 (industry)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 行业大盘 | `/szweb/view/industry/industrySummary.html` | 行业整体表现 |
| 行业卖家 | `/szweb/view/industry/industry-shop-analysis-temp.html` | 行业内商家分析 |
| 店铺榜单 | `/szweb/view/industry/industry-shop-rank-temp.html` | 行业店铺排名 |
| 商品榜单 | `/szweb/view/industry/industry-product-rank-temp.html` | 行业商品排名 |
| 品牌榜单 | `/szweb/view/industry/industry-brand-rank-temp.html` | 行业品牌排名 |
| 品牌动态详情 | `/szweb/view/industry/brand-rank-detail-temp.html` | 品牌变化追踪 |
| 热门关键词 | `/squidweb/view/industry/hotKeywords.html` | 行业热搜词 |
| 关键词查询 | `/squidweb/view/industry/keywordQuery.html` | 关键词搜索排名 |
| 商机推荐 | `/szweb/view/industry/business-recommend.html/chance` | 商机发现 |
| 类目属性概况 | `/szweb/view/industry/attr-summary-temp.html` | 类目特征分析 |
| 类目属性详情 | `/szweb/view/industry/attr-detail-temp.html` | 属性维度详情 |
| 产品榜单 | `/szweb/view/industry/industry-product-temp.html` | 产品排行 |
| 产品详情 | `/szweb/view/industry/industry-product-detail-temp.html` | 单品行业表现 |
| 买家分析 | `/szweb/view/industry/deal-cust-analysis-temp.html` | 行业买家特征 |
| 实时竞店监控 | `/szweb/view/compete/compete-shop-monitor-temp.html` | 竞品实时监控 |
| 实时竞店配置 | `/szweb/view/compete/compete-shop-config-temp.html` | 竞品配置管理 |
| 竞店概况 | `/szweb/view/compete/compete-shop-overview-temp.html` | 竞品对比概览 |
| 竞店对比 | `/szweb/view/industry/competeShop.html` | 竞店详细对比 |
| 竞品对比 | `/szweb/view/industry/compete-product.html` | 竞品详细对比 |
| 竞品流失 | `/szweb/view/compete/compete-product-loss.html` | 竞品客户流失分析 |
| 竞品监控 | `/szweb/view/industry/compete-monitor.html` | 竞品监控配置 |

**行业数据:**
- 行业成交金额增幅
- 行业成交单量增幅
- 行业浏览量/访客数
- 搜索点击次数
- 成交客单价/转化率
- 行业品牌 TOP10
- 行业店铺 TOP100
- 行业商品 TOP200

---

#### 报表中心 (reports-center)
| 子页面 | URL | 功能描述 |
|--------|-----|----------|
| 下载中心 | `/szweb/view/reports-center/download-center.html` | 历史报表下载 |
| 推荐报表 | `/szweb/view/reports-center/recommend-report-temp.html` | 推荐报表模板 |
| 我的报表 | `/szweb/view/reports-center/my-report-temp.html` | 自定义报表 |

---

## 3. 业务对象与数据模型

### 3.1 核心实体

```
店铺 (Shop)
├── 基本信息
│   ├── 店铺名称: 祁门红茶官方旗舰店
│   ├── 店铺类型: POP (Platform Open Plan)
│   ├── 店铺链接: mall.jd.com/index-11855009.html
│   ├── 行业类目: 茗茶
│   └── 店铺星级: 4.6/5.0
│
├── 商品 (Product)
│   ├── SPU (Standard Product Unit)
│   │   └── 示例: 10023923194464
│   ├── SKU (Stock Keeping Unit)
│   │   └── 示例: 10072459153406
│   ├── 商品信息
│   │   ├── 标题
│   │   ├── 价格
│   │   ├── 分类
│   │   └── 属性
│   └── 商品表现指标
│       ├── 成交金额
│       ├── 成交件数
│       ├── 转化率
│       ├── 浏览量
│       ├── 访客数
│       └── UV价值
│
├── 订单 (Order)
│   ├── 订单ID
│   ├── 商品关联 (SPU/SKU)
│   ├── 订单金额
│   ├── 优惠金额
│   ├── 运费
│   ├── 下单时间
│   ├── 付款时间
│   └── 付款方式
│
├── 用户 (Customer)
│   ├── 访客
│   ├── 客户 (已成交)
│   ├── 潜在客户
│   ├── 新客/老客
│   ├── Plus 会员
│   ├── 品牌会员
│   └── 关注店铺用户
│
├── 流量 (Traffic)
│   ├── 来源渠道
│   │   ├── 搜索
│   │   ├── 频道
│   │   ├── 推荐
│   │   ├── 我的京东
│   │   └── 站外渠道
│   ├── 流量场域
│   └── 搜索关键词
│
└── 营销 (Marketing)
    ├── 促销活动
    ├── 优惠券
    ├── 会员权益
    └── 广告投放
```

### 3.2 数据粒度和时间范围

| 维度 | 粒度 | 范围 |
|------|------|------|
| 时间 | 实时/天/周/月 | 近7天、近30天、自定义 |
| 商品 | SPU → SKU | 全部/热销/异常 |
| 用户 | 访客 → 客户 | 新客/老客/会员 |
| 流量 | 渠道 → 场域 → 来源 | APP/Web |
| 地域 | 省份 → 城市 → 级别 | 全国 |
| 类目 | 一级 → 二级 → 三级 | 茗茶 |

### 3.3 对比分析能力

- **环比**: 与上一统计周期对比
- **同比**: 与去年同期对比
- **同行同级**: 与同行业同等级店铺对比
- **同行上级**: 与同行业上级店铺对比
- **相似店铺**: 与相似店铺对比

---

## 4. 数据约束与限制

### 4.1 数据更新延迟
- 实时数据: 分钟级更新
- 日报数据: 预计 14:00 前更新
- 行业数据: 部分维度仅支持离线查看

### 4.2 数据可见性限制
- 行业排名数据以区间形式展示 (如 "￥1万~￥2万")
- 部分竞品数据仅展示汇总统计
- 实时访客需开启 APP 端数据源

### 4.3 功能权限限制
- 部分高级功能需要订阅付费
- 人群包推送配额受限 (3000个/日，店铺10个/日)
- 客户运营诊断功能限时免费

---

## 5. 数据获取方式

### 5.1 已验证的方式
| 方式 | 状态 | 说明 |
|------|------|------|
| CDP 连接 | ✓ 可用 | `ws://localhost:9222/devtools/browser/{id}` |
| JavaScript 注入 | ✓ 可用 | `page.evaluate()` 执行任意 JS |
| 页面截图 | ✓ 可用 | `page.screenshot()` |
| DOM 爬取 | ✗ 受限 | SPA 页面，需等待 JS 渲染完成 |
| API 拦截 | 待探索 | 可通过 CDP Network 监听 |

### 5.2 可用的交互方式
- 页面导航: `page.goto(url)`
- 元素点击: `page.click(selector)`
- 输入框填写: `page.fill(selector, value)`
- 下拉选择: `page.select_option(selector, value)`
- 时间范围切换: 点击日期按钮
- 筛选条件应用: 点击"查询"按钮
- 数据下载: 点击"下载数据"按钮

### 5.3 数据导出
- 表格数据可导出 Excel/CSV
- 报表中心可下载历史报表 (保留30天，最多100份)

---

## 6. 未探索区域

### 6.1 待验证功能
- [ ] 实时大屏 (`realTime`)
- [ ] 智能工具 (`smartSelection`)
- [ ] 培训知识库 (`knowledgeCenter`)
- [ ] 业务专区 (`businessZone`)
- [ ] 个人中心设置

### 6.2 技术限制
- 用户分析页面加载较慢 (timeout 30s)
- 供应链页面加载较慢 (timeout 30s)
- 部分子页面内容为空 (如异常商品页)

### 6.3 潜在 API 端点
通过 URL 模式推测可能存在的 API:
- `/szweb/api/trade/summary`
- `/szweb/api/product/list`
- `/szweb/api/flow/source`
- `/szweb/api/customer/asset`
- `/szweb/api/market/promotion`
- `/szweb/api/service/score`
- `/szweb/api/inventory/health`
- `/szweb/api/industry/market`

---

## 7. 系统特征总结

### 7.1 设计特点
1. **模块化设计**: 10 大业务模块，每个模块下有多个子页面
2. **层级导航**: 顶部主导航 + 二级子菜单 + 三级功能页
3. **对比分析**: 所有指标支持多种对比维度
4. **可视化优先**: 大量使用图表 (ECharts SVG/Canvas)
5. **实时性**: 支持实时数据查看

### 7.2 数据特点
1. **全链路覆盖**: 从流量到转化到售后全流程
2. **多维交叉**: 商品×用户×渠道×时间多维分析
3. **行业基准**: 提供同行对比数据
4. **智能诊断**: 自动识别异常指标并给出建议

### 7.3 业务价值
1. **经营监控**: 实时掌握店铺核心指标
2. **问题诊断**: 自动识别流量/转化异常
3. **竞品分析**: 监控行业动态和竞争对手
4. **用户运营**: 精细化用户分层和触达
5. **库存管理**: 优化库存结构和周转效率

---

## 8. 证据文件清单

所有证据文件均位于本目录 (`/Users/bx/Workspace/WorldExplorationTask/`)

| 文件 | 说明 |
|------|------|
| `jdsz_home.png` | 首页截图 |
| `jdsz_交易分析.png` | 交易分析页截图 |
| `jdsz_商品分析.png` | 商品分析页截图 |
| `jdsz_流量分析.png` | 流量分析页截图 |
| `jdsz_营销分析.png` | 营销分析页截图 |
| `jdsz_体验分析.png` | 体验分析页截图 |
| `jdsz_市场分析.png` | 市场分析页截图 |
| `jdsz_用户分析.png` | 用户分析页截图 |
| `jdsz_供应链.png` | 供应链页截图 |
| `jdsz_订单明细.png` | 订单明细页截图 |
| `jdsz_商品明细.png` | 商品明细页截图 |
| `jdsz_流量来源.png` | 流量来源页截图 |
| `jdsz_实时访客.png` | 实时访客页截图 |
| `jdsz_店铺星级.png` | 店铺星级页截图 |
| `jdsz_售后分析.png` | 售后分析页截图 |
| `jdsz_行业卖家.png` | 行业卖家页截图 |
| `jdsz_all_pages.json` | 所有页面原始数据 |
| `jdsz_complete_data.json` | 完整探索数据 |
| `jdsz_world_discovery.json` | 系统元数据 |

---

## 9. 下一步探索建议

1. **API 逆向**: 通过 CDP Network 监听 XHR/Fetch 请求，提取 API 端点和数据结构
2. **实时数据**: 探索实时大屏和实时访客功能的完整数据流
3. **报表下载**: 测试数据导出功能和文件格式
4. **权限边界**: 探索不同店铺类型 (POP vs 自营) 的数据差异
5. **历史数据**: 测试最长历史数据回看范围
6. **智能功能**: 探索 AI 推荐和智能诊断的具体实现

---

*Artifact generated by Hermes Agent on 2026-08-13*
*Source: https://jdsz.jd.com/szweb/view/index/home.html*
*Location: /Users/bx/Workspace/WorldExplorationTask/*

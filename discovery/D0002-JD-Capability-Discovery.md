D0002 - JD Capability Discovery

Objective

利用已经完成的 CDP Connector，自动遍历京东商智全部页面，建立第一版 JD Capability Matrix。

目标不是保存业务数据，而是回答：

京东商智能提供哪些数据？

哪些数据可以稳定获取？

哪些页面调用哪些 API？

哪些 API 可以组成 Business Context？

输出目录

建议：

research/

    jd-capability/

        capability_matrix.json

        api_inventory.json

        page_inventory.json

        indicator_dictionary.json

        business_context_candidates.json

        screenshots/

        raw/


这不是产品数据。

这是研发资产。

以后永远有价值。

第一部分
页面发现

遍历所有菜单。

例如：

首页

实时

交易

商品

搜索

行业

流量

营销

广告

内容

客服

品牌

...


输出：

{
  "page":"实时概况",

  "url":"...",

  "apis":[...],

  "screenshot":"..."
}
第二部分
API Inventory

对于每个页面：

记录：

Request URL

Method

POST Body

Response Schema

Response Size

响应时间

是否分页

是否日期参数

是否店铺参数


例如：

{
    "api":"summary.ajax",

    "page":"首页",

    "params":[
        "date",
        "shopId"
    ],

    "responseFields":[
        "gmv",
        "orders",
        ...
    ]
}

以后：

如果：

京东升级：

马上知道。

第三部分
Indicator Dictionary

把所有：

jdr_xxxxx

全部统计出来。

例如：

jdr_trade_amt

↓

GMV

来源：

summary

单位：

元

最终：

{
    "canonical":"GMV",

    "jd_key":"jdr_xxx",

    "page":"首页",

    "api":"summary",

    "type":"currency"
}

以后：

Skill

只认识：

GMV

不认识：

jdr_sch_trade_xxxxxxxxx
第四部分
Capability Matrix

这是最重要的。

例如：

Business Data	JD	API	Status
GMV	✅	summary	Verified
Orders	✅	summary	Verified
Visitors	✅	summary	Verified
SKU Ranking	✅	productTop	Verified
Search Keywords	?	???	Unknown
ROI	?	???	Unknown
Customer Profile	?	???	Unknown
Industry Ranking	?	???	Unknown
Inventory	?	???	Unknown

注意：

Unknown

不是：

没有。

而是：

没发现。

第五部分
Business Context Candidate

自动分析：

哪些 API

可以组成：

Store Context

Traffic Context

Transaction Context

Product Context

Advertising Context

Customer Context

Industry Context

例如：

{
    "TransactionContext":[

        "GMV",

        "Orders",

        "Refund",

        "Customer",

        "Conversion"

    ]
}

不是最终模型。

只是：

Candidate。

第六部分
API Relationship Graph

例如：

实时

├── summary.ajax

├── trend.ajax

└── productTop.ajax

搜索

├── keyword.ajax

├── keywordTrend.ajax

└── keywordRank.ajax

广告

├── roi.ajax

├── campaign.ajax

└── creative.ajax

以后：

Connector

开发速度：

至少提升：

10倍。

第七部分
Evidence

所有：

API

都要：

Screenshot

↓

DOM

↓

Request

↓

Response

↓

Metadata

↓

Hash

全部保存。

以后：

任何解析：

都能：

Replay。

第八部分
最终输出

我建议最后生成一个：

JD Capability Report

===================

Pages

38

API

117

Indicators

684

Verified APIs

82

Candidate Context

Store

Traffic

Product

Transaction

Customer

Industry

Advertising

Search

Content

Unknown Pages

5

Authentication Required

2

Not Yet Parsed

17
我唯一希望 Claude Code 额外遵守的一条原则

不要根据页面名称推断业务能力。

例如：

页面：

搜索分析

不能：

直接：

Search Context

必须：

看到：

真实数据：

Keyword

Impression

CTR

Competition

才能：

生成：

Search Context。

所有 Business Context 必须由真实数据反向生长，不允许由 UI 名称正向推导。
// P0008.4 — minimal JD-domain fixtures.
// A few sample raw sources + seed knowledge pages to verify the mechanism.
// NOT a full corpus. Real material would be supplied by humans/external sources.

/** A sample raw source (platform reference) — immutable provenance material. */
export const RAW_PLATFORM_PROMOTION = `# 京东商智 2026 新推广产品说明

京东 2026 年推出"内容化推广"产品，支持商家在商品详情页投放短视频种草内容。

适用场景：新品冷启动、大促蓄水期。

计费方式：按曝光付费（CPM），不与成交强绑定。
`;

/** A sample raw source (marketing case) — immutable provenance material. */
export const RAW_MARKETING_CASE = `# 品牌A 618 大促复盘

品牌A 在 618 期间通过"直播 + 优惠券组合"将活动转化率提升 23%。

关键动作：
1. 预热期直播种草，积累加购
2. 爆发期发放限时优惠券
3. 返场期用"已加购未购买"人群定向召回
`;

/** A seed knowledge page (already compiled from RAW_PLATFORM_PROMOTION). */
export const SEED_PLATFORM_PAGE = `---
title: 京东内容化推广
type: platform_rule
domain: ecommerce
sources: [knowledge-sources/raw/platform-promotion.md]
created_at: 2026-08-13
updated_at: 2026-08-13
tags: [jd, promotion, content]
---

# 京东内容化推广

## 核心规则
京东 2026 推出"内容化推广"产品，支持商品详情页投放短视频种草内容。

## 适用场景
- 新品冷启动
- 大促蓄水期

## 计费方式
按曝光付费（CPM），不与成交强绑定。

## 交叉引用
- 相关：[[品牌A 618大促案例]]
`;

/** Seed knowledge index (the initial INDEX.md). */
export const SEED_INDEX = `# Knowledge Index

## Platform
- [[京东内容化推广]] — 京东 2026 内容化推广产品与适用场景

## Cases
（待编译）

## Operations
（待编译）

## Organization
（待编译）
`;

/** Seed maintenance log. */
export const SEED_LOG = `# Maintenance Log

## [2026-08-13] seed
- created knowledge layer structure
- seeded raw source: platform-promotion.md
- seeded compiled page: 京东内容化推广
`;

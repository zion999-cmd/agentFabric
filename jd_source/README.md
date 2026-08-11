# JD Smart BI — Source Runtime

agentFabric 数据入口层。当前开发阶段用 Claude Code + 脚本执行，后期由 Hermes 作为 Skill 调度。

## Architecture Role

```
agentCMS (过去)                    agentFabric (现在+未来)
─────────────────                  ─────────────────────
Python 脚本 = Runtime               Hermes = Runtime (决策/编排)
CDP 直连 = 唯一方式                  agentFabric = 业务能力层
数据存文件 = 终点                    数据 → Signal → Pattern → Memory
                                   Claude Code = 当前开发工具
                                   Skills/Tools = 未来 Hermes 调用的能力单元
```

## 当前工具集（v0.9）

### 全量发现 — Python

**文件**: `scripts/collect_jd_data.py`  
**契约**: 无输入 → 输出 `data/jd_full_discovery.json`（49 APIs，7 页）  
**依赖**: Chrome CDP 9222 + JD 商智登录 + Python playwright/pyyaml  
**未来角色**: `Skill: jd_smart.full_discovery`

```bash
python3 scripts/collect_jd_data.py --cdp-port 9222 --shop-id 11855009 --output data/jd_full_discovery.json
```

### 每日采集 — TypeScript

**文件**: `scripts/cli.ts` → `apps/ecommerce/connectors/jd/acquisition/cdp-client.ts`  
**契约**: 输入 date → 输出 Evidence + Signal (SQLite)  
**未来角色**: `Skill: jd_smart.daily_sync`

```bash
npm run cli -- collect jd jd_shop_001 --mode live --date 2026-08-09
```

### 数据验证状态

| 数据集 | 来源 | 验证方式 | 状态 |
|--------|------|---------|------|
| TransactionOverview | summary.ajax | CDP vs 页面显示 | ✅ GMV/orders/visitors/CVR 对齐 |
| ProductPerformance | getProductTop 等 | CDP 已捕获 | ⬜ 待页面比对 |
| TrafficSource | getFlowDetail 等 | CDP 已捕获 | ⬜ 待页面比对 |
| StoreServiceMetrics | getServiceSummary 等 | CDP 已捕获 | ⬜ 待页面比对 |
| IndustryBenchmark | brandTopv2 等 | CDP 已捕获 | ⬜ 待页面比对 |
| AdvertisingPerformance | getAdSummaryAndTrend | CDP 已捕获 | ⬜ 需广告账户 |

### 未来 Hermes Skill 映射

| 现在的代码 | 未来 Skill | 类型 |
|-----------|-----------|------|
| `collect_jd_data.py` | `jd_smart.full_discovery` | Source Adapter |
| `cli.ts collect --mode live` | `jd_smart.daily_sync` | Source Adapter |
| `cdp-client.ts` | `browser.cdp_intercept` | Tool/Capability |
| `blueprint.yaml` | `jd_smart.source_manifest` | Manifest |
| `indicator-map.ts` | `parser.jd_jdr_to_canonical` | Tool/Capability |

## 相关文件

```
jd_source/
├── README.md                       ← 本文档
├── acquisition_manifest.json       ← API 清单 + 数据集注册
└── datasets/
    ├── TransactionOverview.md       ← GMV/订单/访客/CVR（已验证）
    ├── ProductPerformance.md        ← 商品 SKU 排行/品牌
    └── TrafficSource.md            ← 流量来源/渠道

scripts/
├── collect_jd_data.py              ← Python 全量发现
├── cli.ts                          ← TS CLI（collect / discover / rank）

apps/ecommerce/connectors/jd/
├── acquisition/cdp-client.ts       ← CDP 拦截核心
├── parsers/indicator-map.ts        ← JDR → canonical 映射
├── blueprint.ts                    ← 平台页面地图加载器

sources/jd_smart/
└── blueprint.yaml                  ← JD 商智导航地图（人工维护）

data/
├── jd_full_discovery.json          ← Python 输出（最新）
└── jd_live_data.json               ← 历史快照 (2026-07-13)
```

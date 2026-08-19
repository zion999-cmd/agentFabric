# JD Acquisition Path Recovery Audit

- **日期**: 2026-08-19
- **类型**: 只读审计（Consolidation Pass 1.2）
- **范围**: CDP Exploration → endpoint/request/auth/parser discovery → reusable WebAPI definition → direct HTTP execution → normalize/Evidence → Signals/Ranking/Situation
- **边界**: 本轮只读，不改代码、不重构、不新增 service、不修 bug、不建 Browser Manager、不自动化登录

---

## 0. 结论一句话

**70 个 endpoint 是「名字 + 响应 schema + 观察到的 URL」，不是「可执行的 WebAPI catalog」——direct WebAPI 从未实现，`api_direct` 只是 schema 里的枚举，Runtime 自始至终只有 CDP 页面采集这一条路。**

---

## 1. 核心事实（恢复历史）

| 事实 | 证据 |
|---|---|
| **从未有 direct HTTP executor** | 全仓库 grep `fetch/axios/http.request` 到 JD API = **0**；grep `webapi/direct http/restful/httpClient` = **0** |
| **`api_direct` 是声明未实现** | 只存在于 `contract-types.ts:28`、`learning-context.ts:85`、`execution.ts:120` 的 enum；**无任何实现代码** |
| **auth 从未被显式捕获复用** | `manifest.ts:56` `auth_method: 'CDP cookie reuse (Chrome debug mode session)'`；acquisition_methods 只有 `['CDP', 'Mock']` |
| **git 里没有「被放弃的 direct 路径」** | acquisition/discovery/binding 目录只有 2 个 commit（176cac6 P0009、59f520e P0006.5.3），一直是 CDP |

---

## 2. 一个真实 endpoint 的纵向 trace（`summary` = traffic.overview 所需）

```
发现：D0002 CDP 探索 → page_inventory.json 观察到
   URL  https://szgateway.jd.com/api/lowcode/indexSummary/summary.ajax   ← 有（page_inventory.json）
   method  POST                                                          ← 有（CDP 代码里 postDataJSON 推断）
   body   { dateType:'todayRealtime', startDate, endDate, compare… }     ← 有（硬编码在 cdp-client.ts:351-357）
   header/cookie  user-mnp / user-mup / uuid + cookie                    ← ❌ 无（只在 CDP 拦截时由 SPA 自带透传）
   response schema  fields → parser                                      ← 有（api_inventory.json + blueprint parser_plan）
   direct executor                                                       ← ❌ 无
   曾 direct 调用成功                                                     ← ❌ 从未
```

**为什么 capability execution 没走 direct HTTP**：因为 direct HTTP 这条路**从不存在**。`acquireJdViaCDP` 的机制是 `page.route('**/szgateway.jd.com/api/lowcode/**')` 拦截 SPA 自己的轮询请求 → 改 POST body 的日期 → `route.continue()` 让 SPA 原生的 CSRF header + cookie 透传 → 抓 response。**URL 前缀是硬编码的，auth 是借 SPA 的活请求，不是从 Chrome 提取出来自己发。**

---

## 3. CDP 两种用途的区分

| 用途 | 现状 |
|---|---|
| **A. Exploration CDP**（发现未知 endpoint） | ✅ 已存在且合理——D0002 产物（discovery/jd-capability/ 三个 JSON + 114 个 response 文件） |
| **B. Steady-state acquisition**（已知 endpoint 直接取数） | ❌ **唯一实现仍是 CDP 拦截**（脆弱：依赖 SPA 在轮询 + 已登录 Chrome） |

---

## 4. 9222 的真实角色

- 现在 9222 是**双依赖**：exploration 和 steady-state acquisition 都走它（CDP 拦截）。
- direct WebAPI **若存在**，它只需要 9222/Chrome 做**一件事**：提取认证上下文（cookie + user-mnp/user-mup/uuid header），之后就能脱离页面直接 `fetch`。它需要的是「从 Chrome 读认证上下文」，不是「Chrome 本身」。
- 已知 API 调用在拿到认证上下文后**可以直接 HTTP 请求**（URL/method/body 都已掌握）。但**提取认证上下文这一步的代码不存在**。

---

## 5. 70 endpoints 分类

| 状态 | 数量 | 证据 |
|---|---|---|
| DISCOVERED | 70 | `api_inventory.json` 70 keys + `page_inventory.json` 观察到 URL |
| CONTRACTED（parser） | 57 | blueprint `parser_plan.rules`（name + strategy + fields_to_parse + field_mapping） |
| CONTRACTED（request def：URL/method/body/header） | **≈0** | URL 只在 page_inventory（未接线）；method/body 硬编码在 CDP 代码；header/cookie 无 |
| DIRECT-EXECUTABLE | **0** | 无 direct HTTP 代码 |
| VERIFIED（真实调用） | **5** | `DEFAULT_JD_APIS`（summary/trend/productTop/getProductAnalysisData/getFlowAnalysisData）——且是 CDP 拦截验证，非 direct HTTP |
| CAPABILITY-BOUND | 部分 | 11 个 canonical cap ↔ 6 module 靠 `inferModuleFromEndpoint` 启发式，非逐 endpoint 绑定 |
| EVIDENCE-BOUND | 3 | summary/trend/productTop（captureEvidence legacy fallback 落盘） |
| STALE/DRIFT | 1 处 | api-inventory 前缀 `…/api/lowcode/indexSummary/` vs CDP 代码 `…/api/lowcode/**` + 末段匹配 |

> **即：70 个是「名字」，只有 ~57 个有 parser 契约，~5 个被真实跑过（还是 CDP），0 个能 direct 执行。**

---

## 6. Current Runtime Map（架构事实 + 断点）

```
Unknown JD World
   ↓
[CDP Exploration — D0002，developer/Claude 驱动，9222]
   ↓
Discovery artifacts（api_inventory.json=70 endpoint+字段；page_inventory.json=URL；api-responses/=114 响应）
   ↓
[Blueprint 生成 — P0005.3，只携带 name + parser rules]
   ↓
connector-blueprint.json（parser_plan.rules：endpoint + fields_to_parse + strategy）
   ↓
【断点 ①】request definition（URL/method/body/header/auth）不在 blueprint，也不在 runtime 资产里
   ↓
acquireJdViaCDP（硬编码 URL 前缀 + 拦截 SPA 活请求 + 借 SPA auth）
   ↓
Fabric Capability（binding planner/executor → kernel.execute）
   ↓
Evidence（summary/trend/productTop 落盘）
   ↓
Signals → Ranking → Situation（Pass 1 已接线）
```

**两个真实断点**：

- **断点 ①（核心）**：D0002 发现的「世界知识」（URL/method/body）散落在 `page_inventory.json` 和硬编码 CDP 代码里，**没有沉淀成 runtime 可复用的 request definition**。blueprint 只装了「解析侧」，没装「请求侧」。
- **断点 ②**：没有 direct HTTP executor，`api_direct` 是空枚举。

---

## 7. REUSE / WIRE / REPAIR / MISSING

| 分类 | 内容 |
|---|---|
| **REUSE**（已有，该接回来） | ① `page_inventory.json` 的完整 URL（每 endpoint）；② CDP 代码里的请求体结构（dateType/startDate/endDate/compare）；③ blueprint 的 parser rules（已复用） |
| **WIRE**（存在但断开） | URL(page_inventory) → blueprint request def → 未接；`api_direct` 枚举 → executor → 未接 |
| **REPAIR**（实现漂移） | URL 前缀：api-inventory `…/lowcode/indexSummary/` vs CDP `…/lowcode/**` + 末段匹配 |
| **MISSING**（确认不存在的最小能力） | ① direct HTTP executor；② 「可复用 request definition」作为 runtime 资产；③ 从 Chrome 提取认证上下文（cookie + user-mnp/user-mup/uuid） |

---

## 8. DO NOT BUILD（本轮不做）

Browser Manager · 新 acquisition service · 新 capability system · 新 Evidence Store · scheduler · async job/SSE · 自动登录 · Hermes 新功能。

---

## 9. 收口

过去探索出的 JD 世界知识**沉淀了一半**——解析侧（endpoint 名 + 字段 schema）进了 blueprint 并被复用；**请求侧（URL/method/body/auth）没有沉淀成 runtime 资产**，所以 steady-state 只能退回「让 SPA 自己发请求、我们劫持」的 CDP 拦截。找到的缺口不是「再造一个 browser manager」，而是**一个很小的、把 page_inventory 的 URL + CDP 代码的 body + 从 Chrome 读一次 cookie/header 拼成一个 direct HTTP executor 的收口**。

---

## 附：关键文件索引

- `discovery/jd-capability/api_inventory.json` — 70 endpoint → 字段 schema（响应侧）
- `discovery/jd-capability/page_inventory.json` — page → 观察到的 API 调用（URL/status/headers/body_preview）
- `discovery/jd-capability/api-responses/` — 114 个捕获响应体
- `generated/connector-blueprint.json` — parser_plan.rules（endpoint + fields_to_parse + strategy，无 URL/method/body/header）
- `apps/ecommerce/connectors/discovery/api-inventory.ts` / `loader.ts` / `types.ts` — 发现数据加载 + 模块分类
- `apps/ecommerce/connectors/capability/evidence-analysis.ts` — response schema → ParserPlan（strategy 分类）
- `apps/ecommerce/connectors/jd/acquisition/cdp-client.ts` — `acquireJdViaCDP`（CDP 拦截，硬编码 URL 前缀 + 借 SPA auth）、`isCdpAvailable`、`isJdPageAvailable`
- `apps/ecommerce/connectors/jd/acquisition/index.ts` — `acquireJdData`（mock/CDP 分派）
- `apps/ecommerce/connectors/jd/manifest.ts` — `auth_method: 'CDP cookie reuse'`，acquisition_methods `['CDP','Mock']`
- `apps/ecommerce/connectors/binding/planner.ts` / `executor.ts` — blueprint → plan → acquireFn

---

## 附 2：Direct HTTP Hypothesis — REJECTED（JCap 实验证据）

**日期**: 2026-08-19（Consolidation Pass 1.2 Recovery 阶段）

### 实验

用已登录的 9222 Chrome session 提取 cookie，直接 `fetch` `szgateway.jd.com/api/lowcode/indexSummary/summary.ajax`（POST + 已知日期 body）：

| 请求头 | 结果 |
|---|---|
| 只带 cookie + referer + origin | `header.code = -402 不安全的请求` |
| 再加**伪造** user-mnp / user-mup / uuid | `header.code = -407 不安全的请求`（错误码变了 → 服务端在**校验**，不是只查存在） |

拦截 SPA 真实请求头，真相：

```
summary.ajax 真实请求头（每个请求都不同）:
  user-mnp  f977b908c1d899d8f8601aee42d203ef   ← 32位 hex，疑似 MD5(secret + user-mup)
  user-mup  1787140247294                        ← epoch ms 时间戳
  uuid      0b291c32-884c-4e82-8e31-2540082e6c4e ← 随机 UUID
```

### 结论

`user-mnp` / `user-mup` / `uuid` 是京东 **JCap 反爬**的「每请求动态 token」，由 SPA 的 JS 用内置 secret 现场生成。secret 在 JD 的压缩 JS 里，**从不在网络流量中出现**，所以 D0002 探索（只抓 response schema + URL）**永远不可能沉淀出 direct executable knowledge**。

- **Direct HTTP hypothesis = REJECTED**（对 JD 而言）。
- **JD canonical execution 保持 CDP / browser-mediated**（`acquireJdViaCDP` 让 SPA 自己生成合法 header，只改日期字段）——这不是技术债，而是 JCap 约束下的正解。
- 不复现 / 不研究 JCap（脆弱、易被 JD 轮换、属逆向反爬）。

### 遗留修正

Pass 1.2 期间曾尝试实现的 `direct-executor.ts`（generic direct-HTTP executor）已删除：HTTP 层正确但被 JCap 封死，对 JD 非能力。真正该补的仍是 Pass 1.1 的**最小 session lifecycle ownership**（Chrome/session/page readiness + 打开 JD 页面），而非 direct HTTP。

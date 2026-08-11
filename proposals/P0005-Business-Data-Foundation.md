P0005 - Business Data Foundation

Status: Proposed

目标：

建立 AgentFabric 的统一业务数据层，使所有 Runtime、Skill、Decision、Review 都建立在同一套 Business Data Pipeline 之上。

P0005 不开发任何业务分析能力。

只负责：

获取 → 保存 → 追踪 → 标准化。

Architecture
                Business Runtime
                      │
                      ▼
              Runtime Control Plane
                      │
                      ▼
              Business Data Pipeline
────────────────────────────────────────

     Acquisition
          │
          ▼
    Raw Evidence Store
          │
          ▼
      Normalization
          │
          ▼
    Business Context
          │
          ▼
     Evidence Chain

────────────────────────────────────────

Metrics
Decision
Review
Experience
Skills
Policy
P0005 完成范围
① Acquisition Layer

统一所有数据获取方式。

例如：

JD (Playwright)

Tmall (Playwright)

CSV

Excel

Webhook

MCP

Manual Upload

这里不要关心来源。

统一：

interface AcquisitionProvider {

    acquire()

}
② Raw Evidence Store

所有获取的数据：

永远保存。

例如：

evidence/

    jd/

        2026/

            06/

                traffic.json

                comments.json

                screenshot.png

                dom.html

注意：

不是为了以后分析。

而是：

为了：

Review

Audit

Replay

Training

③ Evidence Metadata

每一份数据：

必须带：

Source

Acquire Time

Acquire Method

Version

Operator

Runtime

Connector

Hash

以后：

所有 Review：

都可以追溯。

④ Normalizer

Raw Evidence

↓

Business Object

例如：

JD：

ROI:3.2

↓

AdvertisingROI

这里：

统一业务词汇。

而不是：

平台词汇。

⑤ Business Context Builder

不是：

数据库。

而是：

当前：

业务状态。

例如：

Store

Products

Traffic

Advertising

Inventory

Review

Context：

全部引用：

Evidence ID。

⑥ Evidence Chain

每一个：

Business Context

都必须知道：

来自：

哪份 Evidence。

例如：

AdvertisingROI

↓

Evidence

↓

JD

↓

Playwright

↓

Screenshot

↓

DOM

↓

Raw JSON

整个链路：

不可丢失。

P0005 不包括

不要开发：

Metrics

Decision

Skill

Experience

Review

全部不碰。

P0005.1

这个就是：

JD Business Data Connector

不是：

JD API。

也不是：

JD SDK。

而是：

JD 数据获取能力。

P0005.1：

建议只做：

JD

↓

登录

↓

采集

↓

Evidence

↓

Normalizer

↓

Business Context

整个链路跑通。

右侧：

必须能看到：

Business Context

↓

Evidence

↓

JD

↓

Playwright

↓

Screenshot

↓

Raw JSON

点击：

可以展开。

P0005.2

Tmall Connector

验证：

Business Context

是否真正：

平台无关。

P0005 完成标准

不是：

"成功采到京东数据。"

而是：

AgentFabric：

第一次拥有：

真实企业数据

↓

Evidence

↓

Business Context

完整生命周期。

我还想补充一个我认为会影响后面整个架构的小点

今天讨论以后，我觉得 connectors/ 这个目录定位还可以再明确一点。

它不应该只是：

JD
↓

Data

而应该是：

JD Workspace

├── acquisition/      // Playwright、登录、采集
├── parsers/          // DOM/JSON/CSV解析
├── evidence/         // 保存 Raw Evidence
├── normalizers/      // 转 Business Object
├── manifest.ts       // 能提供哪些业务能力
└── tests/

这样以后每个平台（京东、天猫、ERP、CRM）都是同一套结构。

所以我的建议是：

P0005：建立整个 Business Data Pipeline（架构与基础设施）。
P0005.1：迁移并重构 京东商智，验证这条 Pipeline。
P0005.2：接入 天猫，验证平台无关性。
P0005.3/P0005.4/P0005.5 等等其他数据平台.
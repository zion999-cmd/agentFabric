# P0009 Wiring/Capability Gap Audit

**Date**: 2026-08-16
**Type**: Wiring Audit only — no implementation, no code change, no P0009 revision
**Method**: 只读 repo HEAD (`0389853`)，追踪 9 个 segment 的真实代码接线。以代码为准，不以 Proposal/注释为准。

---

## 0. 结论先行

**P0009 的 `X` 真实存在，且比"缺一个 endpoint"更精确**：`Hermes Session → Fabric Capability` 之间**没有任何 execution boundary**。Hermes 能读 `capabilities/*.md`（知道有什么），但没有机制能调用（做到）。

同时还有一个**产品接线断点**：P0008.3 的 `Situation Chat → Hermes Session` 只是后端 route + 测试，**前端根本没调它**——前端 Agent Session 仍在调 legacy `/api/chat`（one-shot subprocess）。

所以 P0009 有两个真正的断点（不是 6 个）：
1. **前端没接 canonical path**（浏览器 → 仍走 legacy /api/chat）。
2. **Hermes 没有 execution capability**（session 内无法调用 Fabric capability）。

其余 segment（Runtime Kernel / JD CDP / Evidence Store）**已经存在且工作**，只需接线，无需重建。

---

## 1. Segment 表

| Segment | Existing Entry | Actually Works | Product Wired | Gap | Reuse |
|---|---|---:|---:|---|---|
| Browser → Situation Chat | `app.js:1724` `apiPost('/api/chat')`（legacy） | ✅ legacy 能跑（one-shot hermes） | ❌ 前端调 `/api/chat`，**不调** `/api/situation/:id/chat` | 前端 Agent Session 未接 canonical route | 复用 app.js Agent Session，改调 situation-chat |
| Situation Chat → Hermes Session | `situation-chat.ts` → `HermesSessionClient` → `session.create(cwd=workspace)` | ✅ P0008.3 + P0008.6 已验证 | ❌ 仅后端 route + 测试，无前端消费者 | route 存在但未被浏览器调用 | 原样复用 |
| **Hermes → Fabric Capability** | **无**（Hermes session 只有 filesystem + web_search 工具） | ❌ | ❌ | **主断点 `X`**：Hermes 能读 `capabilities/*.md`，但无工具/接口调用 Fabric execution | 复用 Hermes 原生工具/MCP 扩展机制接 Fabric entry |
| Capability → Runtime | `kernel.execute`（`POST /api/runtime/collect`，mock 默认）+ `capability-bridge`（legacy chat） | ✅ kernel 全链路工作（mock + CDP） | ⚠️ 只在 legacy chat / collect 用，不接 Hermes session | bridge 被 legacy chat 用，未接 session | 复用 kernel + bridge |
| Runtime → JD CDP | `kernel.execute({mock:false})` → `acquireJdData` → `acquireJdViaCDP(9222)` | ✅ 真实 CDP evidence 存在 | ⚠️ 仅 on-demand（`/api/runtime/discover` / CLI `--mode live`）；前端 collect 传 `mock:true` | CDP 不自动连接；需 live trigger | 原样复用 |
| JD → Evidence | `acquire` → `saveEvidence` → SQLite | ✅ | ✅（`/api/evidence/:capId` 消费） | 无（工作） | 原样复用 |
| **Evidence → Hermes** | **无**（Hermes 无法触发 acquisition，拿不到 evidenceRef） | ❌ | ❌ | Hermes 需能从 execution 结果拿到 evidence 并 grounded | 需在 execution boundary 内回传 evidenceRef |
| Hermes → Browser | `situation-chat.ts` 返回 `{sessionId, reply}`（message.delta/complete） | ✅ | ❌（route 未接前端） | reply 返回机制在，但前端不消费 | 复用 reply 返回 |
| Activity/Evidence → UI | `GET /api/evidence/:capId`（真实）+ `GET /api/runtime/events/:taskId`（**SSE demo**） | ⚠️ evidence GET 真实；SSE 是硬编码 demo（`ev_001`/`endpointsCaptured:7`） | ⚠️ Evidence Hub 真实；Agent Activity SSE 是假的 | SSE demo 需换成真实 execution event 绑定 | 复用 Evidence Hub；替换 demo SSE |

---

## 2. 两条链

### CURRENT（以代码为准）

```text
Browser Agent Session (app.js:1724)
  → POST /api/chat (legacy)
    → createHermesClient() = hermes -z one-shot SUBPROCESS（非 session）
    → matchIntent + dispatch + createCapabilityBridge().searchByIntent
    → (若 discover) kernel.execute(capability)   ← 唯一一条 Hermes→capability 的连线，但走 one-shot，非 session
  → reply（无 session continuity）

[P0008.3 situation-chat route 存在，但浏览器从不调用]

Runtime（独立于 Hermes session）:
  → POST /api/runtime/collect（mock:true 默认）/ discover（CDP）
  → kernel.execute → acquireJdData(mock|cdp:9222) → parse → signal → saveEvidence
  → Evidence Store (SQLite)

Hermes Session (P0008.3, cwd=workspace):
  → filesystem + web_search 工具
  → 能读 systems/ knowledge/ capabilities/*.md
  → 不能调用 capability（无 execution tool）
```

**断点**：`Browser` 到不了 `Hermes Session`（走 legacy）；`Hermes Session` 到不了 `Capability`（无 execution boundary）。

### TARGET（P0009）

```text
Browser
  → Situation Chat (POST /api/situation/:id/chat)      [rewire app.js]
    → Hermes Session (cwd = Fabric Workspace)          [reuse P0008.3]
      → 读 systems/ knowledge/ capabilities/            [reuse P0008.6]
      → 选 capability
      → Fabric execution boundary (NEW)                 [主补]
        → Capability Binding → Runtime Kernel            [reuse]
          → acquireJdData({mock:false}) → JD CDP 9222   [reuse]
            → Evidence Store                             [reuse]
      → 拿到 evidenceRef → grounded response            [主补]
    → reply → Browser (Situation Chat)
  → Agent Activity + Evidence Viewer                    [real events，替换 demo SSE]
```

---

## 3. 三个真实 Gap（按严重度）

1. **Hermes → Fabric Capability（主 `X`）**：Hermes 没有 execution capability。P0008.6 的 `capabilities/*.md` 解决"知道"，P0009 需补"能调用"。现成机制是 Hermes 原生工具/MCP 扩展（暴露 Fabric execution entry 为 Hermes 可调用工具）。**不得用 Prompt 模拟 execution**（P0009 已明确）。

2. **前端未接 canonical path**：`app.js` 仍在调 legacy `/api/chat`（one-shot subprocess），从未调 `/api/situation/:id/chat`。P0008.3 的 session path 只是后端 route。需把 Agent Session 前端改调 canonical route。

3. **CDP 非自动/按需连接 + 前端 collect 传 mock**：CDP 只在 `/api/runtime/discover` / CLI `--mode live` 触发；前端 `collect` 传 `mock:true`；SSE 是 demo。P0009 需：真实 live 触发 + 真实 readiness（"CDP connected/unavailable"）而非假装。

**已经工作、只接线不重建**：Runtime Kernel、CapabilityRegistry/Binding、JD CDP acquisition、Evidence Store、Evidence provenance route。

---

## 4. 给 P0009 修订的一句话

P0009 的实际工作量 = **前端改调 situation-chat + 新增一个 Hermes execution boundary（暴露 Fabric Runtime 为 Hermes 工具）+ 真实 readiness/event 绑定**。Runtime/JD/Evidence 全复用，无需重建。

---

*Wiring Audit 完成。未改代码、未补接口、未设计模块、未改 P0009 Proposal。停止，等待你修订 P0009。*

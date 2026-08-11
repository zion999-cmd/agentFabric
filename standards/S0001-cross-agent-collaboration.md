# S0001 - Cross-Agent Collaboration Standard（跨 Agent 协作标准）

**Status**: Active | **Version**: 1.0

## Vision

AgentFabric 不属于任何 Runtime。AgentFabric 也不属于任何 LLM Provider。

AgentFabric 是所有 Agent 共享的 **Business Workspace**。

所有 Agent 应共享 **Project State**，而不是 Conversation。

---

## 十项原则

### 第一原则：Single Source of Truth

任何 Agent 不得依赖 Chat History / Session / Memory 作为项目唯一依据。

必须读取 `context/` 下的文件：
- `current_state.md`
- `handoff.md`
- `decisions.md`
- `roadmap.md`

所有 Agent 共享同一份项目状态。

### 第二原则：Proposal Driven Development

任何开发必须来源于 Proposal。禁止 Agent 自行发散开发。

流程：
```
Discovery → Proposal → Accepted → Development → Review → Close
```

Proposal 一旦 Accepted，立即冻结。

### 第三原则：Runtime Agnostic

任何 Agent 不得依赖 Claude、Codex、Hermes、OpenAI、Gemini 或任何 Provider。

所有 Runtime 仅通过 **Runtime Adapter** 接入。

### 第四原则：Conversation is Temporary

聊天只是推理，不是项目。Agent 不得把聊天历史作为长期资产。

长期资产只有：**Proposal / ADR / Discovery / Context**。

### 第五原则：Structured Context

所有 Agent 必须读取：Project / Current State / Architecture / Decisions / Roadmap。

而不是几十万字聊天记录。

### 第六原则：Immutable Proposal

Proposal Accepted 后不得修改。新增需求只能通过 **New Proposal / ADR / Discovery**。

### 第七原则：Discovery First

任何新想法先进入 Discovery。经过验证才能成为 Proposal。

### 第八原则：Evidence First

所有 Decision 必须能够追溯：
```
Decision → Business Context → Evidence → Raw Evidence
```

禁止黑盒。

### 第九原则：Business First

Agent 只负责 Business。Runtime 只负责 Execution。不得混合。

例如：Skill / Review / Policy / Experience 属于 Business，不是 Runtime。

### 第十原则：Evolution

所有 Agent 的目标不是完成任务，而是帮助 Business 持续成长。

每一次 Review、Skill、Experience 都是 **Business Evolution**。

---

## Agent 职责规范

### ChatGPT（Product Manager / Architect）

**职责**：Proposal / Discovery / Review / Planning / Evolution / Architecture

**禁止**：直接修改已 Accepted Proposal。

### Claude Code（Implementation）

**职责**：Implementation / Refactor / Testing / Context Update / Architecture Compliance

每次开发完成必须更新：
- `current_state.md`
- `handoff.md`
- `decisions.md`（如有新 ADR）
- `status.json`

### Runtime（Hermes / Codex / Claude / Gemini / ...）

**职责**：Execution / Tool / Skill / MCP / Loop / Review / Hook

**禁止**：保存 Business Knowledge。

---

## Workspace 规范

Workspace 永远保存：Proposal / Discovery / ADR / Experience / Review / Evidence / Business Context。

Runtime 只是临时访客。

---

## Communication Protocol

### ChatGPT → Runtime
- 只允许：Proposal / Review / Architecture / ADR / Discovery
- 禁止：直接复制聊天记录

### Runtime → ChatGPT
- 只允许：`current_state.md` / `handoff.md` / `decisions.md` / `status.json`
- 禁止：整个 Session

---

## Project State

任何 Agent 进入项目，第一步必须 **同步 Project State**，而不是恢复 Conversation。

---

## Philosophy

- Agent 不共享聊天。Agent 共享项目。
- **Project State 高于 Conversation。**
- **Business 高于 Runtime。**
- **Evidence 高于 Memory。**
- **Evolution 高于 Automation。**

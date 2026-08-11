# P0004: Runtime Control Plane

Status: Proposed

Date: 2026-06-29

---

# Objective

Define the execution contract between AgentFabric and external Agent Runtime platforms.

Runtime (Hermes / Codex / Claude Code / OpenHands) is responsible for execution.

AgentFabric is responsible for business decisions.

AgentFabric never implements Runtime.

---

# Runtime Boundary

Foundation Model
        │
        ▼
Runtime
(Hermes / Codex / Claude Code)
        │
        ▼
AgentFabric Control Plane
        │
        ▼
Business Workspace

---

# Runtime Responsibilities

Runtime is responsible for:

- Tool Calling
- MCP
- Hooks
- Planning
- Reflection
- Context Compression
- Runtime Memory
- Agent Execution
- Retry
- Parallel Execution
- Provider Management

These capabilities are never reimplemented inside AgentFabric.

---

# AgentFabric Responsibilities

AgentFabric is responsible for:

Business Context

Business Skills

Business Policies

Business Experience

Business Knowledge

Business Review

Explainability

Workspace

Business Decision

Runtime Orchestration

---

# Execution Contract

AgentFabric never asks Runtime to "solve business".

AgentFabric sends an Execution Plan.

Runtime executes.

Runtime returns:

- Result
- Trace
- Tool Calls
- Confidence
- Logs

AgentFabric evaluates.

---

# Runtime Rule

Runtime must never:

- select business skill
- modify execution plan
- replace policy
- change execution order

Runtime executes only.

---

# Router

Every request enters Router first.

Router decides:

- Skill
- Policy
- Context
- Runtime
- Execution Plan

Only Router communicates with Runtime.

---

# Execution Flow

User

↓

Business Context

↓

Router

↓

Execution Plan

↓

Runtime

↓

Tools / MCP

↓

Trace

↓

Review

↓

Experience

↓

Skills

↓

Policy

↓

Decision

---

# Runtime Independence

AgentFabric depends only on Runtime Adapter.

Never depends on Runtime implementation.

Supported Runtime:

- Hermes
- Claude Code
- Codex
- OpenHands
- Future Runtime

Replacing Runtime should never change business logic.

---

# Success Criteria

Business logic is completely independent from Runtime.

Every Runtime executes the same Execution Plan.

Business knowledge remains unchanged when Runtime changes.

AgentFabric controls business.

Runtime performs execution.

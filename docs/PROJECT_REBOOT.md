# AgentFabric Project Reboot

## Background

Over the past two months, the original **agentCMS** project(/Users/bx/Workspace/agentCMS) explored the design of a complete Agent Runtime, including:

* Runtime
* Workflow
* Memory Engine
* Planning
* Agent Loop
* Review
* Context
* Dashboard

This work was valuable because it allowed us to understand how enterprise AI systems should operate.

However, the AI ecosystem has evolved much faster than expected.

Modern runtimes such as:

* Hermes Agent
* Claude Code
* Codex
* OpenHands
* OpenClaw

already provide high-quality implementations of:

* Runtime
* Tool Use
* Planning
* Reflection
* Hooks
* MCP
* Provider Management
* Runtime Memory

Rebuilding these capabilities is no longer a sustainable long-term strategy.

---

# New Product Position

AgentFabric is **NOT** another Agent Runtime.

AgentFabric is a **Business Workspace** built on top of modern Agent Runtime platforms.

Hermes Agent is responsible for:

* Runtime
* Provider
* Hooks
* MCP
* Tool Calling
* Runtime Memory
* Agent Execution

AgentFabric is responsible for:

* Business Context
* Business Skills
* Business Policies
* Business Memory
* Human Review
* Business Workspace
* Enterprise Knowledge

The Runtime is replaceable.

Business Intelligence is the long-term asset.

---

# Migration Strategy

The existing project located at:

```
/Users/bx/Workspace/agentCMS
```

will become the source repository for reusable business assets.

The new development workspace is:

```
/Users/bx/Workspace/agentFabric
```

Only components that belong to the Business Workspace layer should be migrated.

---

# Components to Keep

The following components should be migrated (after refactoring if necessary):

## Dashboard

Business Workspace UI

NOT Runtime Console.

---

## Collector

Business Data Collectors

Example:

* JD
* Taobao
* PDD

---

## Business Analysis

Ranking

Trend

Replay

Risk Detection

Growth Opportunity

Business Report

---

## Review

Human Review

Approval

Replay

Feedback

Business Validation

---

## Skills

Business Skills

NOT Runtime Skills.

Examples:

* Hot Product Discovery
* Inventory Warning
* ROI Analysis
* Competitor Analysis

---

## Policies

Business Rules

Examples:

* Growth Strategy
* Risk Strategy
* Business Constraints

---

## Memory

Enterprise Experience

Only validated business knowledge enters Memory.

NOT Runtime Memory.

---

## Knowledge

Industry Knowledge

Business Documents

Historical Reports

Competition Knowledge

---

## Workspace UI

Operator-facing Business Workspace.

NOT Runtime Debug Console.

---

# Components NOT to Migrate

The following modules should remain inside Hermes Agent or be removed entirely.

* Runtime
* Planner
* Workflow Engine
* Agent Loop
* Memory Engine
* Provider
* Hook Manager
* MCP Runtime
* Execution Engine
* Runtime Scheduler

If Hermes already provides a capability, AgentFabric should never duplicate it.

---

# Repository Philosophy

Hermes answers:

> How does AI work?

AgentFabric answers:

> How should AI work inside this business?

---

# Architecture

```
Foundation Models
        │
        ▼
Hermes Agent Runtime
        │
        ▼
AgentFabric
        │
        ├── Business Workspace
        ├── Business Skill
        ├── Business Memory
        ├── Business Policy
        ├── Human Review
        ├── Knowledge
        └── Business Apps
```

---

# First Application

The first Business App is:

```
apps/ecommerce/
```

Its goal is to build an Enterprise E-Commerce Workspace.

Capabilities include:

* Product Analysis
* Growth Discovery
* Risk Detection
* Business Reports
* Human Review
* Skill Evolution
* Business Memory

---

# Long-term Vision

Future applications may include:

```
apps/

    ecommerce/

    finance/

    legal/

    hr/

    manufacturing/

    healthcare/

    education/
```

Every application owns its own:

* Skill
* Memory
* Policy
* Context
* Review
* Knowledge

while sharing the same Hermes Runtime.

---

# Migration Principle

Never migrate code directly.

Always migrate concepts.

Each module should be re-evaluated under the new Business Workspace architecture before being implemented.

---

# Final Goal

Build Enterprise Business Workspaces rather than Agent Runtimes.

AgentFabric should become the layer where enterprise knowledge continuously evolves while remaining independent of any specific Agent Runtime.


# AgentFabric Engineering Philosophy

Version 1.0

---

# Core Principle

AgentFabric is not developed by Feature Driven Development.

AgentFabric is developed by Loop Driven Development.

Business Loop is the product.

Features are only interfaces of the Loop.

---

# 1. Runtime Is Infrastructure

Runtime is replaceable.

Hermes.

Codex.

Claude Code.

OpenHands.

Future Runtime.

AgentFabric never owns Runtime.

AgentFabric owns Business.

---

# 2. Business Is The Product

Source code is not the product.

LLM is not the product.

Runtime is not the product.

Business Knowledge is the product.

Business Experience is the product.

Business Skills are the product.

Business Policies are the product.

---

# 3. Every Module Must Represent Business

Every directory must correspond to:

- business asset
- business role
- business process

Never organize code by technical abstraction.

Bad:

domains/

core/

engine/

service/

manager/

Good:

skills/

experience/

review/

policy/

knowledge/

workspace/

---

# 4. Loop Before Feature

Never ask:

"What feature should we build?"

Always ask:

"What business loop becomes complete?"

Priority:

Business Loop

↓

Data Flow

↓

Contract

↓

Workspace

↓

Widget

---

# 5. Workspace Is A Window

Workspace does not create business.

Workspace visualizes business.

Workspace never owns data.

Workspace never owns decision.

Workspace never owns memory.

Workspace displays them.

---

# 6. Explainability Is Mandatory

Every decision must answer:

What happened?

Why?

Which data?

Which tools?

Which Skills?

Which Policies?

What confidence?

Which review?

Every decision must be traceable.

---

# 7. Human Owns Business

AI proposes.

Human approves.

Business Experience grows.

Skills improve.

Policy evolves.

Human always owns business.

---

# 8. Validation Creates Experience

Raw AI output is never Experience.

Experience only exists after validation.

Validation may come from:

Human Review

Business KPI

Replay

Multiple Agent Agreement

Only validated knowledge becomes Experience.

---

# 9. Skills Are Living Assets

Skill is not code.

Skill is business capability.

Skill has:

Version

Owner

Success Rate

History

Review

Confidence

Retirement

Skills continuously evolve.

---

# 10. Policy Controls Business

Policy defines boundaries.

Skill defines execution.

Runtime performs execution.

Policy always has higher priority than Skill.

---

# 11. Runtime Never Owns Business

Runtime executes.

Router decides.

Policy constrains.

Review validates.

Experience remembers.

Workspace explains.

Business always belongs to AgentFabric.

---

# 12. Single Source of Truth

Every Agent reads the same project memory.

ChatGPT.

Claude Code.

Hermes.

Codex.

Future Agents.

No duplicated project knowledge.

No duplicated architecture.

No duplicated decisions.

---

# 13. Build Contracts Before Code

Before implementing any module:

Define:

Contract

Input

Output

Responsibility

Ownership

Only then write code.

---

# 14. Confidence Builds Trust

Trust is not a feature.

Trust emerges from transparency.

Every execution exposes:

Decision

Reason

Evidence

Tool Calls

Trace

Confidence

Review

The system never asks users to trust AI.

The system enables users to verify AI.

---

# 15. Long-Term Goal

AgentFabric becomes the Business Operating Layer above all Agent Runtime platforms.

Runtime evolves.

Models evolve.

Providers evolve.

Business knowledge remains.

That is the permanent asset.
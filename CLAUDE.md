# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Identity

agentFabric builds **Business Workspaces** on top of Hermes Agent Runtime. We do NOT build runtime. Hermes handles execution (planning, tool calling, reflection, MCP). agentFabric handles business intelligence (context, skills, policies, memory, review, knowledge).

## Architecture

```
Foundation Models (Claude, GPT, DeepSeek, ...)
        │
        ▼
Hermes Agent Runtime (Python, /Users/bx/Workspace/hermes-agent)
        │  subprocess
        ▼
agentFabric (TypeScript + SQLite)
  └── Business Workspace (operator-facing)
       ├── Business Skills (validated rules that evolve)
       ├── Business Memory / Experience (validated knowledge, not runtime memory)
       ├── Human Review (structured decisions)
       ├── Explainability (every conclusion traces to evidence)
       ├── Connectors (business data acquisition)
       └── Agent Workspace UI (vanilla JS SPA)
```

## Directory Layout (V3)

```
agentFabric/
├── apps/ecommerce/         # The Business Workspace (all business logic lives here)
│   ├── analysis/           # Business analysis capabilities
│   │   ├── decision/       # Ranking engine → positioning as Decision (beyond just ranking: priority, recommendation)
│   │   ├── metrics/        # Business metrics computation (was: signal — operators say "indicators", not "signals")
│   │   ├── explainability/ # Why-did-the-system-say-this (was: trace — operators see explainability, not traces)
│   │   └── composition.ts  # Orchestration: wires metrics → decision → explainability (no business formulas)
│   ├── experience/         # Validated business experience (was: memory — Memory is owned by Hermes Runtime)
│   │                       #   ContextMemory records, extraction rules, weight/decay formulas
│   ├── review/             # Human review + feedback + knowledge promotion
│   ├── connectors/         # Business data connectors (JD, Tmall, ERP, Webhook, MCP — future)
│   ├── workspace/          # Agent Workspace SPA (vanilla JS, pages + widgets, Evidence Hub)
│   ├── skills/             # Business skill definitions (prompts live here as business context)
│   ├── policy/             # Business rules (growth strategy, risk strategy, constraints)
│   ├── knowledge/          # Industry knowledge (cold/static library — distinct from active experience)
│   └── reports/            # Business report builders (management-facing)
├── platform/               # Shared infrastructure (the Workspace substrate, not business logic)
│   ├── runtime/hermes/     # Hermes Agent Runtime client (thin replaceable subprocess seam)
│   ├── server/             # Express HTTP server + routes
│   └── storage/            # SQLite (connection, schema, init, product repository)
├── shared/                 # Cross-App shared modules (zero business logic)
│   ├── schemas/            # Zod schemas + TypeScript types (all external boundary validation)
│   └── utils/              # Pure functions: math, time, crypto (no dependencies)
├── scripts/                # CLI entry + one-shot migration scripts
├── tests/                  # contract/, domain/, unit/, integration/, fixtures/
├── context/                # Project context, decisions, roadmap
└── docs/                   # External documentation
```

## Key Concept: No `src/`

agentFabric is NOT a generic SDK or framework. It is a **concrete Business Workspace**.
Every business module (metrics, decision, explainability, experience, review) is **100%
ecommerce-specific** — it computes GMV, CTR, CVR, ROI, stock, price, sales. A future
`apps/finance/` would have entirely different metrics (cashflow, margin, AR). There is
no such thing as a "domain" that is shared across apps — only the business capabilities
each app chooses to implement.

This is a **business layering**, not a technical layering.

## Import Conventions

Path aliases (tsconfig paths + vitest resolve.alias):

| Alias | Resolves to |
|-------|------------|
| `#shared/*` | `shared/*` |
| `#platform/*` | `platform/*` |
| `#app/*` | `apps/ecommerce/*` |

Tests import via `#shared/*`, `#platform/*`, `#app/*`. Workspace UI (vanilla JS) is not
covered by aliases.

## Development

```bash
npm install              # Install dependencies
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run dev              # Start dev server (tsx watch platform/server/index.ts)
npm test                 # Run all tests (vitest run)
npm run db:init          # Initialize SQLite database
npm run migrate:agentcms # Migrate agentCMS sample data
npm run cli -- rank      # Run ranking via CLI
```

## Tech Stack

- **Runtime**: Node.js + TypeScript (ES modules)
- **Server**: Express 5
- **Database**: SQLite via better-sqlite3 (WAL mode)
- **Validation**: Zod (parse external inputs, infer types)
- **Testing**: Vitest
- **Frontend**: Vanilla JS SPA (no framework)
- **Agent Runtime**: Hermes (Python, called via subprocess)

## Key Design Principles

1. **Never rebuild Runtime.** Hermes provides execution. agentFabric provides business context.
2. **Business first.** Every feature answers: "What business value does this create?"
3. **Human-in-the-loop.** All important decisions remain reviewable.
4. **Explainability.** Every AI conclusion explains why, based on what, using which data.
5. **Context over Prompt.** Structured business context, not longer prompts.
6. **Memory over Conversation.** Validated knowledge is the long-term asset.
7. **Evolution over Perfection.** Small improvements accumulated over time.
8. **Runtime is replaceable.** Business logic never imports Hermes internals — only the `HermesClient` interface.
9. **Every directory maps to a real enterprise role.** When adding a new module, ask: "Who in the business does this serve? What real asset does this represent?" If the answer is only "Runtime" or "Model capability", it belongs to Hermes.

> These principles derive from [philosophy.md](philosophy.md) (design philosophy — what & why)
> and [engineering_philosophy.md](engineering_philosophy.md) (engineering philosophy — how we build).
> Both are required reading for every contributor.

## Engineering Philosophy (from engineering_philosophy.md)

These principles govern **how** we build, not just what we build. They are the engineering
manifesto — every PR, code review, and architectural decision must align with them.

### Loop Driven Development (not Feature Driven)

The **Business Loop** is the product. Features are only interfaces of the Loop.

Never ask: "What feature should we build?"
Always ask: "What business loop becomes complete?"

Priority order: **Business Loop → Data Flow → Contract → Workspace → Widget**

### Build Contracts Before Code

Before implementing any module, define: Contract, Input, Output, Responsibility, Ownership.
Only then write code.

### Every Module Must Represent Business

Every directory must correspond to a business asset, business role, or business process.
Never organize code by technical abstraction (`domains/`, `core/`, `engine/`, `service/`, `manager/`).
Only by business capability (`skills/`, `experience/`, `review/`, `policy/`, `knowledge/`, `workspace/`).

### Workspace Is A Window

Workspace does not create business — it visualizes business. Workspace never owns data,
decision, or memory. Workspace displays them.

### Runtime Never Owns Business

Runtime executes. Router decides. Policy constrains. Review validates. Experience remembers.
Workspace explains. Business always belongs to AgentFabric.

### Policy Controls Business

Policy defines boundaries. Skill defines execution. Runtime performs execution.
Policy always has higher priority than Skill.

### Validation Creates Experience

Raw AI output is never Experience. Experience only exists after validation (Human Review,
Business KPI, Replay, Multiple Agent Agreement). Only validated knowledge becomes Experience.

### Skills Are Living Assets

Skill is not code — skill is business capability. Every skill has: Version, Owner,
Success Rate, History, Review, Confidence, Retirement. Skills continuously evolve.

### Single Source of Truth

Every Agent (ChatGPT, Claude Code, Hermes, Codex, future agents) reads the same project
memory. No duplicated project knowledge. No duplicated architecture. No duplicated decisions.

### Confidence Builds Trust

Trust is not a feature — it emerges from transparency. Every execution exposes: Decision,
Reason, Evidence, Tool Calls, Trace, Confidence, Review. The system never asks users to
trust AI. The system enables users to verify AI.

## Development Specification: Project Memory Maintenance

The `context/` directory is AgentFabric's **own Project Memory** — the Single Source of
Truth for the entire project. Every agent (Claude Code, ChatGPT, Codex, Hermes) reads
from the same files. These are NOT "ChatGPT context" — they are the project's long-term
memory asset.

### Mandatory: After Every Development Session

At the end of every feature / fix / restructure session, you MUST update:

| File | Priority | Action |
|------|----------|--------|
| `context/current_state.md` | ⭐⭐⭐⭐⭐ | Update **版本** (bump if needed), **已完成** (mark done items), **进行中** (start new items), **下一步** (reorder), **阻塞** (add/clear) |
| `context/decisions.md` | ⭐⭐⭐⭐⭐ | Add new ADR entries for every architectural decision, naming change, or design tradeoff. Include: date, status, decision, reasoning. |
| `context/handoff.md` | ⭐⭐⭐⭐⭐ | Write 500-1000 word session summary: **新增**, **重构**, **删除**, **测试** (count + pass/fail), **风险**, **建议下一步** |
| `context/status.json` | ⭐⭐⭐⭐☆ | Bump `version`, update `completed[]` / `developing[]` / `next[]`, update `tests` count, `hermes` version |
| `context/roadmap.md` | ⭐⭐⭐☆☆ | Check off completed phases, add new items discovered during the session |

### When Presenting to the User

After updating these files, present ONLY the following to the user (1000-3000 字 total):

1. `context/current_state.md` (always)
2. `context/handoff.md` (always)
3. `context/decisions.md` (only if new ADRs added)

### Project Memory File Purposes

| File | Answers | Changes |
|------|---------|---------|
| `PROJECT.md` + `philosophy.md` + `engineering_philosophy.md` | What is this? Why does it exist? How do we build it? Boundary? | Almost never |
| `context/current_state.md` | What's done? What's in progress? What's blocked? | Every session |
| `context/decisions.md` | WHY was this designed this way? | Per decision |
| `context/handoff.md` | What happened this session? What should I know? | Every session |
| `context/roadmap.md` | Where are we going? | Per phase |
| `context/status.json` | Machine-readable snapshot (for Dashboard, other agents) | Every session |
| `context/architecture_snapshot.md` | One-line flow: Hermes → Platform → Workspace → capabilities | When architecture changes |

### Architecture Snapshot Convention

`context/architecture_snapshot.md` uses a **flow diagram**, NOT a file tree:

```
Hermes Runtime
  ↓
Platform (runtime/ server/ storage/)
  ↓
Ecommerce Workspace
  ├── Connectors → Metrics → Decision → Explainability
  ├── Review → Experience → Skills → Policy
  └── Context → Workspace
```

Update this file only when the architecture changes (module added/removed/renamed).

## Migration Rule

> Never migrate code directly. Always migrate concepts.

When porting a module from agentCMS (`/Users/bx/Workspace/agentCMS`):
1. Understand the business concept it represents
2. Re-evaluate under Business Workspace architecture
3. Implement with SQLite repository, Zod validation, and explicit types
4. Test at 80%+ coverage

## File Standards

- Max 800 lines per file (split into sub-modules if needed)
- Max 50 lines per function
- Immutable data patterns (spread, never mutate)
- Explicit return types on all exported functions
- Zod validation on all external inputs
- No `any` — use `unknown` and narrow
- No `console.log` in production code

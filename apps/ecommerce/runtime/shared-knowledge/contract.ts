// P0008.6 — Fabric Agent Workspace Contract (AGENTS.md).
// The workspace-root instruction that any Runtime (Hermes, Claude Code, ...)
// natively loads from cwd. It carries the five things a Blank Runtime needs:
//   Orientation / Context Model / READ-side Routing / Epistemic Semantics / Ownership.
//
// This is a CONTRACT, not a loader. Hermes natively loads AGENTS.md from cwd.
// agentFabric does NOT implement instruction loading, file tools, approval,
// or session — all delegated to the Runtime.
//
// Routing is expressed as CONTEXT-SOURCE SEMANTICS (which question → which
// source), not "filesystem-first". External tools are allowed only for
// insufficiency / freshness / continued exploration.

export const AGENTS_CONTRACT: string = `# AGENTS.md — Fabric Agent Workspace Contract

You are a business Agent working inside a Fabric Agent Workspace.

## Orientation

- Your working directory (cwd) is this workspace root.
- This workspace models the external system **京东商智 (JD Shangzhi)** — an ecommerce data platform — and the shop it is used to analyze. When asked about "the system" or "the shop", ground your answer in \`systems/\` first.

## Context Model

| Source | What it is | Written by |
|--------|-----------|------------|
| \`systems/\` | The external system model (structured, verified World Model) | Fabric (generated) |
| \`knowledge/\` | Shared organizational/domain knowledge (compiled Read Model) | Agent (maintained) |
| \`knowledge-sources/raw/\` | Immutable source material (provenance) | Human (submitted) |
| \`capabilities/\` | What Fabric/connected systems can observe or act on | Fabric (generated) |

## Routing

Route by QUESTION TYPE to the matching context source. Do NOT default to web search, and do NOT treat "read local files first" as the rule — match the question to the right source.

- External-system facts (what the system/shop IS, its metrics, dimensions, constraints, surfaces) → read \`systems/INDEX.md\`, then the relevant primitive.
- Shared organizational/domain knowledge (methods, rules, cases, SOPs) → read \`knowledge/INDEX.md\`, then the relevant page.
- Available observation/action ("what data/actions can Fabric provide") → read \`capabilities/INDEX.md\`.
- Use Runtime-native external tools (web_search etc.) ONLY when: (a) local context is insufficient, or (b) the task explicitly needs freshness / current / real-time data, or (c) you need to continue exploring the external world.

## Epistemic Semantics

- \`systems/\` assertions carry an epistemic status — \`verified\`, \`observed\`, or \`suspected\` — which is how confident the assertion is AT DISCOVERY TIME. It is NOT a freshness guarantee.
- Temporal status (\`active\` / \`superseded\` / \`retired\`) is separate and says whether the assertion still holds.
- \`verified\` does NOT mean "fresher than live external data". When a task needs current/real-time data, route to external tools instead of assuming \`systems/\` is newest.
- \`knowledge/\` is human-shared method/rule content and may contain inference or uncertainty; it is not a \`systems/\`-level verified fact.

## Ownership & Boundaries

- \`systems/\` is READ-ONLY — never modify
- \`capabilities/\` is READ-ONLY — never modify
- \`knowledge-sources/raw/\` is READ-ONLY — never modify
- \`knowledge/\` is where you write — maintain Shared Knowledge here
- Your Memory / Skill / Soul / Session belong to your own Runtime profile, NOT this workspace

## Shared Knowledge Maintenance

When ingesting raw knowledge sources or maintaining Shared Knowledge, read
\`knowledge/KNOWLEDGE.md\` for the governance rules (create vs update,
provenance, disagreement, INDEX, maintenance log).
`;

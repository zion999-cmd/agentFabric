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
- Operational / live business data (the shop's actual current metrics — traffic, sales, orders, stock) → read \`capabilities/INDEX.md\`, then execute the matching capability via the Runtime's native tool discovery (see "Capability Execution").
- Use Runtime-native external tools (web_search etc.) ONLY when: (a) local context is insufficient, or (b) the task needs freshness / current / real-time data about the external world (general facts, news, market), or (c) you need to continue exploring the external world.

## Capability Execution

\`capabilities/\` describes the operational capabilities Fabric currently provides. When the task needs live / current operational data or to perform a business operation, do NOT reconstruct it from internal storage.

- \`systems/\` and \`knowledge/\` provide CONTEXT (what the system is, its dimensions, methods, rules) — they are not a substitute for live operational data.
- Internal implementation storage (e.g. agentFabric's SQLite database under \`data/\`) is NOT a data source for answering business questions. Do not read it directly to reconstruct business data.
- Read \`capabilities/INDEX.md\` to understand which operational capabilities are available.
- To actually EXECUTE a capability, use the Runtime's native tool-discovery mechanism to locate the executable tool that corresponds to that capability. Do not assume a hard-coded tool name, and do not fall back to reading internal storage.
- In this Hermes Runtime, that native discovery flow is: \`tool_search\` (find the tool) → \`tool_describe\` (load its argument schema) → \`tool_call\` (execute). Use it to discover and invoke the Fabric execution tool for the capability you need.
- The Evidence returned by capability execution is the authoritative basis for this operational observation.
- An existing Fabric capability is not replaced by external web search. Use web / external tools only for information the workspace/capabilities cannot provide, or when the task explicitly needs external-world freshness.

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

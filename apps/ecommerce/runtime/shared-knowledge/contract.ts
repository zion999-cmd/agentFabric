// P0008.4 — Fabric Agent Workspace Contract (AGENTS.md).
// The workspace-root instruction that any Runtime (Hermes, Claude Code, ...)
// natively loads from cwd. It describes workspace topology, source taxonomy,
// context semantics, ownership, and read/write boundaries — and points the
// Runtime to knowledge/KNOWLEDGE.md for Shared Knowledge maintenance rules.
//
// This is a CONTRACT, not a loader. Hermes natively loads AGENTS.md from cwd.
// agentFabric does NOT implement instruction loading, file tools, approval,
// or session — all delegated to the Runtime.

export const AGENTS_CONTRACT: string = `# AGENTS.md — Fabric Agent Workspace Contract

You are a business Agent working inside a Fabric Agent Workspace.

## Workspace Topology (UNIQUE — do not nest)

- \`AGENTS.md\`                — this contract (workspace root)
- \`world/\`                    — the external world model (READ-ONLY, structured)
- \`capabilities/\`             — how the Agent can OBSERVE the world
- \`knowledge/\`                — Shared Knowledge (Agent-maintained)
  - \`KNOWLEDGE.md\`            — governance for Shared Knowledge maintenance
  - \`INDEX.md\`                — navigation entry
- \`knowledge-sources/raw/\`    — immutable raw knowledge sources (READ-ONLY)

**\`knowledge-sources/\` lives ONLY at the workspace root. It must NOT be nested
under \`knowledge/\`. There is exactly one \`knowledge-sources/raw/\` directory.**

## Source Taxonomy (two DISTINCT kinds of source material)

Do not confuse these two:

1. **World Exploration Artifacts** — the raw exploration output of an external
   system (screenshots, page maps, API captures, discovery notes). These are
   source material for CONSTRUCTING \`world/\`. They are NOT Shared Knowledge raw.

2. **Human / External Knowledge Sources** — documents humans supplied
   (marketing cases, platform rules, SOPs, industry reports). These go into
   \`knowledge-sources/raw/\` and are compiled into \`knowledge/\`.

A "raw artifact" is NOT automatically a "knowledge raw source". Raw describes the
knowledge-ingestion lifecycle, not a dump for all unprocessed files.

## Context Semantics

- \`world/\` = what the external world IS (structured, verified World Model)
- \`knowledge/\` = what humans have shared (compiled, Agent-maintained Read Model)
- \`knowledge-sources/raw/\` = human/external knowledge source material (provenance, immutable)
- \`capabilities/\` = how to observe the world (Capability descriptions/bindings)

## Source Immutability (Source → Derived, NOT Source → Move)

Sources are immutable. You READ a source and DERIVE context from it. You do NOT
move, delete, or modify the source to "turn it into" context.

- World Exploration Artifacts stay as-is; you READ them and DERIVE \`world/\`.
- Human/External documents stay as-is under \`knowledge-sources/raw/\`; you READ
  them and DERIVE \`knowledge/\`.

Never relocate source files into the derived directories.

## Ownership & Boundaries

- \`world/\` is READ-ONLY — never modify
- \`knowledge-sources/raw/\` is READ-ONLY — never modify
- \`knowledge/\` is where you write — maintain Shared Knowledge here
- Your Memory / Skill / Soul belong to your own Runtime profile, NOT this workspace

## Shared Knowledge Maintenance

When ingesting raw knowledge sources or maintaining Shared Knowledge, read
\`knowledge/KNOWLEDGE.md\` for the governance rules (create vs update,
provenance, disagreement, INDEX, maintenance log).

## World Model Construction

When constructing \`world/\` from World Exploration Artifacts, read
\`contracts/WORLD_MODEL.md\` for the World Object / Assertion structure
(system / surface / feature / metric / dimension / constraint, plus assertions
with epistemic status and evidence references).
`;

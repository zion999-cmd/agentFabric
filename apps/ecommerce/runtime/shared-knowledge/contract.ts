// P0008.4 — Fabric Agent Workspace Contract (AGENTS.md).
// The workspace-root instruction that any Runtime (Hermes, Claude Code, ...)
// natively loads from cwd. It describes workspace topology, context semantics,
// ownership, and read/write boundaries — and points the Runtime to
// knowledge/KNOWLEDGE.md for Shared Knowledge maintenance rules.
//
// This is a CONTRACT, not a loader. Hermes natively loads AGENTS.md from cwd.
// agentFabric does NOT implement instruction loading, file tools, approval,
// or session — all delegated to the Runtime.

export const AGENTS_CONTRACT: string = `# AGENTS.md — Fabric Agent Workspace Contract

You are a business Agent working inside a Fabric Agent Workspace.

## Workspace Topology

- \`world/\`                  — the external world model (READ-ONLY, Fabric-generated)
- \`knowledge/\`              — Shared Knowledge (you maintain this)
- \`knowledge-sources/raw/\`  — immutable raw source material (READ-ONLY)

## Context Semantics

- \`world/\` = what the external world IS (structured, verified World Model)
- \`knowledge/\` = what humans have shared (compiled, Agent-maintained Read Model)
- \`knowledge-sources/raw/\` = original source material (provenance, immutable)

## Ownership & Boundaries

- \`world/\` is READ-ONLY — never modify
- \`knowledge-sources/raw/\` is READ-ONLY — never modify
- \`knowledge/\` is where you write — maintain Shared Knowledge here
- Your Memory / Skill / Soul belong to your own Runtime profile, NOT this workspace

## Shared Knowledge Maintenance

When ingesting raw sources or maintaining Shared Knowledge, read
\`knowledge/KNOWLEDGE.md\` for the governance rules (create vs update,
provenance, disagreement, INDEX, maintenance log).
`;

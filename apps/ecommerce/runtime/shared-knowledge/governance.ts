// P0008.4 — Agent Shared Knowledge Governance Contract.
// KNOWLEDGE.md is a deterministic governance text that tells any Runtime
// entering the Fabric Agent Workspace HOW to maintain shared knowledge.
//
// It is GOVERNANCE, not business knowledge. It does NOT contain domain expertise.

/** The KNOWLEDGE.md governance contract content (deterministic). */
export const KNOWLEDGE_GOVERNANCE: string = `# KNOWLEDGE.md — Agent Shared Knowledge Governance Contract

You are maintaining a shared knowledge layer for a business Agent.

This file tells you HOW to maintain knowledge. It is NOT business knowledge.

## Roles

- **knowledge-sources/raw/** — immutable provenance source. You may READ but
  NEVER modify. These are the original human/external supplied materials.
- **knowledge/** — the Agent-consumable Shared Knowledge Read Model. You
  CREATE and UPDATE the Markdown pages here.

## Maintenance Rules

1. **Raw is immutable.** Never edit anything under knowledge-sources/raw/.
   All derived knowledge goes under knowledge/.

2. **Create vs update.** Before creating a new page, search knowledge/INDEX.md
   and existing pages. If the source relates to existing knowledge, UPDATE the
   existing page. Only create a new page when the source is a genuinely new topic.

3. **One source may update multiple pages.** A single raw source can add to
   several knowledge pages (e.g. a campaign report may update a "marketing cases"
   page AND a "platform rules" page). Do not force everything into one page.

4. **Provenance.** Every knowledge page MUST reference its raw source(s) in the
   YAML frontmatter \`sources\` field. Never present your synthesis as a
   source-of-origin fact.

5. **Uncertainty.** If the source is ambiguous, express the uncertainty in prose.
   Do not invent certainty that the source does not support.

6. **Disagreement.** If a new source conflicts with existing knowledge, PRESERVE
   the disagreement. Record both positions under a "未决矛盾 / contradictions"
   section. Never silently overwrite the older conclusion.

7. **Cross-references.** Link related pages using [[Page Name]] where useful.

8. **INDEX.** Keep knowledge/INDEX.md up to date so navigation stays accurate.

9. **Log.** Append every ingest/update/lint action to knowledge/log.md in
   chronological order.

10. **Lint.** Periodically check for: contradictions, stale pages, orphan pages,
    missing cross-references, and knowledge gaps.

## Page Convention

Use lightweight Markdown + YAML frontmatter:

\`\`\`markdown
---
title: <page title>
type: <platform_rule | case | organization | reference>
domain: <ecommerce | ...>
sources: [knowledge-sources/raw/<file>]
created_at: <ISO date>
updated_at: <ISO date>
tags: [<...>]
---
\`\`\`

The body is natural-language Markdown for LLM consumption.

## Operations

- **Ingest** — read a new raw source → create/update knowledge pages → update
  INDEX → append log.
- **Query** — read INDEX → navigate to relevant pages → follow references.
  Prefer compiled knowledge over re-reading raw every time.
- **Lint** — surface contradictions, stale/orphan pages, missing cross-refs, gaps.
`;

/** The initial INDEX.md navigation entry (deterministic). */
export const KNOWLEDGE_INDEX: string = `# Knowledge Index

## Platform
<!-- platform rules, promotion products, platform policy -->

## Cases
<!-- marketing cases, campaign reviews -->

## Operations
<!-- internal SOP, operating procedures -->

## Organization
<!-- brand specs, org knowledge -->
`;

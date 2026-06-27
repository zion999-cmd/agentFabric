# Industry Knowledge

Curated enterprise knowledge assets that survive runtime replacement.

## Content types
- Historical reports (business conclusions + trust scores over time).
- Competition knowledge (benchmarks, market intelligence).
- Business documents (playbooks, category strategies, pricing guidelines).

## Difference from Business Memory
- **Knowledge** is the cold/static library (SOPs, cases, static rules).
- **Memory** is the active/decayed/validated/injectable layer that adjusts
  live ranking decisions.

## Source
Knowledge enters the system through:
1. Manual onboarding (upload a playbook / strategy doc).
2. Feedback promotion (approved results → cases, modified/rejected → rules).
3. System extraction (aggregated patterns passing the auto-promote gate).

See `src/domains/review/knowledge.ts` for the promotion logic.

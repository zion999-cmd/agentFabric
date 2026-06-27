# Business Prompt Templates

Structured business context for Hermes one-shot turns — NOT longer prompts.
Each template is a function that takes the current business state (ranking,
signals, memories, reviews) and produces a focused, context-rich prompt string.

Templates are **not** stored in LLM prompts. They are **structured business
context** that the composition layer passes to Hermes via the thin client seam.

## Categories
- `ranking_summary` — summarize the top-ranked product for an operator.
- `risk_alert` — draft a risk alert message given a contradiction set.
- `memory_candidate` — propose a memory pattern for human review.

## Convention
Each prompt template:
1. States the business question (not a role-play persona).
2. Lists the structured evidence (codes, not prose).
3. Asks for a specific output format (one sentence, one recommendation).

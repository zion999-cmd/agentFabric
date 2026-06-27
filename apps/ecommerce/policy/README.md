# Business Policies

Business rules that constrain how AI operates within this workspace.

## Categories
- **Growth Strategy** — rules about when to amplify vs dampen growth signals.
- **Risk Strategy** — risk tolerance thresholds and alert escalation.
- **Business Constraints** — regulatory, contractual, or platform constraints.

## Format
Each policy is a TypeScript module exporting a set of predicate functions
(mapping `{ signals, rankings, memories } -> boolean`) and associated
action recommendations. Policies are consulted by the composition layer
before delegating to Hermes.

Policies are **validated business rules**, not inline prompt instructions.
They evolve via the Human Review → Memory → Skill pipeline.

# Business Reports

Management-facing analysis produced by the composition layer.

## Report types
- **Ranking Report** — top-N products per profile with strenghts/risks/decision trace.
- **Risk Report** — products flagged by contradictions or high risk scores.
- **Memory Report** — active memory inventory with tier classification and age.
- **Growth Discovery Report** — products with breakout growth signals in the last N days.
- **Validation Report** — skill accuracy over time, counterfactual ranking comparisons.

## Convention
Report builders are pure functions over domain façade outputs. They do NOT
import data sources directly — they receive `RankingResult[]` / `Signal[]` /
`ContextMemory[]` from the composition layer and produce formatted output.

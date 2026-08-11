Full System Consistency + Code Reality Audit (ADR + Implementation)
🧠 Task

You are a principal engineer auditing a full-stack evolving system (agentFabric).

This audit is NOT theoretical.

You MUST verify:

whether the architecture described in ADRs is actually implemented in real code

📦 Scope

You must analyze BOTH:

1. Architecture Layer (Intent)
P0001 → P0005.4 ADR documents
current_state.md
status.json
handoff.md
2. Code Layer (Reality)

Scan full codebase, especially:

apps/
platform/
shared/
connectors/
discovery/
capability/
runtime/
generated/
scripts/
tests/
🔍 Core Audit Dimensions
1. 🧭 ADR → Code Mapping Consistency

For EACH major ADR phase:

P0001–P0005.4

Verify:

Is it fully implemented?
Partially implemented?
Or only documented (no code)?

Return mapping:

ADR → implementation status

Example categories:

✅ Fully implemented
⚠️ Partially implemented
❌ Not implemented (design only)
🧪 Stub/mock only
2. 🧱 Stub / Placeholder Detection (CRITICAL)

You MUST detect:

TODO implementations
mock data used in production paths
fake adapters (Hermes stub, CDP mock, etc.)
“generated but unused” artifacts
dead code paths
disabled logic branches

Specifically check:

runtime adapters
capability execution
blueprint usage
discovery output consumption
3. 🔁 Data Flow Reality Check

Compare REAL execution flow vs ADR design:

Expected flow:

Discovery → Generator → Runtime → Connector → Execution Engine

Check if actual code matches:

Are all stages executed?
Are any stages bypassed?
Are some stages only logged but not used?
Are generated/ artifacts actually consumed?
4. 📦 Generated Artifact Consumption Check

Inspect:

generated/

Verify:

Are JSON outputs actually imported?
Or just written and ignored?
Is runtime using them or still hardcoded logic?

Return:

% consumed
% orphaned
% partially used
5. 🔌 Connector Reality Audit

Check connectors:

JD connector
Tmall connector (if exists)
any other platform connectors

Verify:

Are they still hardcoded?
Are they runtime-driven?
Are they blueprint-driven (P0005.4 intent)?
Or still P0005.1 style?
6. ⚙️ Runtime Execution Reality

Check runtime layer:

Does it actually execute blueprints?
Or just wrap old logic?
Is ExecutionPlan truly used?
Or only defined but not enforced?
7. 🧠 Logic Duplication Detection

Find duplicated logic across:

discovery
capability
runtime
connector
platform

Examples:

indicator mapping repeated in multiple layers
API routing duplicated
normalization logic duplicated
8. 🧪 Test vs Reality Alignment

Verify:

Do tests reflect real architecture?
Or are they testing mocked/stubbed behavior?
Are tests validating generated pipeline or hardcoded logic?
9. 🚨 Architectural Drift Detection

Detect:

ADR says blueprint-driven
code still hardcoded
runtime says generic execution
connector still domain-aware

Return drift map:

intent → implementation mismatch
📊 Output Format
A. System Implementation Score
ADR coverage score (0–100)
Code alignment score (0–100)
Stub ratio (%)
Hardcoded logic ratio (%)
B. ADR → Code Mapping Table
ADR Phase	Status	Evidence
P0005.4 Runtime	⚠️ Partial	uses adapter but bypasses blueprint
P0005.3 Generator	✅	generates files
P0005.2 Discovery	✅	full pipeline
...	...	...
C. Stub / Fake Implementation Report

List:

file
type (mock/stub/placeholder)
severity
impact
D. Orphaned Artifacts

List:

generated files not consumed
unused modules
dead pipelines
E. Architecture Drift Summary

Explain:

where system behavior diverges from ADR intent

F. Final Verdict

Answer clearly:

Is this system REAL architecture-driven or PARTIALLY simulated architecture?

🚫 Constraints
Do NOT redesign system
Do NOT propose new architecture
Do NOT refactor code
Only evaluate truth vs intent
🎯 Goal

Ensure:

The system is not only well-designed on paper, but actually implemented in reality.


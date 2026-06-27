# Current Architecture

```
Hermes Runtime (Python, subprocess)
  ↓
Platform (runtime/ server/ storage/)
  ↓
Ecommerce Workspace (apps/ecommerce/)
  ├── Connectors    →  JD / Tmall / ERP / Webhook / …
  ├── Context       →  campaign / business / environment
  ├── Metrics       →  GMV, CTR, CVR, ROI, stock, sales
  ├── Decision      →  ranking, priority, recommendation
  ├── Explainability→  why this decision, based on what
  ├── Review        →  human approval / rejection / modification
  ├── Experience    →  validated business experience (NOT runtime memory)
  ├── Skills        →  business SOPs with version & success rate
  ├── Policy        →  business rules (growth, risk, constraints)
  ├── Knowledge     →  cold/durable knowledge library
  ├── Reports       →  management-facing reports
  └── Workspace     →  operator-facing Agent Workspace (pages + widgets)
```

Shared layer: `shared/` (schemas, utils) — cross-app, zero business logic.

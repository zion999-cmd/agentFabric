# Current Architecture

```
Hermes Runtime (Python, subprocess)
  ↓
Platform (runtime/ server/ storage/)
  ↓
Ecommerce Workspace (apps/ecommerce/)
  ├── Runtime       →  Kernel (unified execution entry point) P0005.5
  ├── Connectors    →  JD / Tmall / ERP / Webhook / …
  ├── Context       →  campaign / business / environment
  ├── Metrics       →  GMV, CTR, CVR, ROI, stock, sales
  ├── Decision      →  ranking, priority, recommendation
  ├── Explainability→  why this decision, based on what
  ├── Review        →  human approval / rejection / modification
  ├── Experience    →  validated business experience (NOT runtime memory)
  ├── Skills        →  business skill definitions + registry P0006
  ├── Policy        →  business rules (growth, risk, constraints)
  ├── Knowledge     →  cold/durable knowledge library
  ├── Reports       →  management-facing reports
  └── Workspace     →  operator-facing Agent Workspace + Chat P0006

Platform (platform/)
  ├── runtime/hermes/   →  HermesClient seam + HermesRuntimeAdapter
  ├── server/routes/    →  HTTP API: health, ranking, signals, reviews, memory, trace, workspace, chat P0006, runtime P0006
  └── storage/          →  SQLite connection + repositories
```

Shared layer: `shared/` (schemas, utils) — cross-app, zero business logic.

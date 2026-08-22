// P0010.1 REPAIR-5 — expose Output / WorkItem labels from the schema
// (shared/schemas/output.ts) to the vanilla-JS Workspace, which cannot
// import TypeScript directly.
//
// This file MUST stay in 1:1 sync with `shared/schemas/output.ts` —
// `WORK_ITEM_STATUS_LABEL` and `WORK_ITEM_TYPE_LABEL` — and the
// vitest contract test `tests/contract/output-labels-sync.test.ts`
// asserts that automatically.
//
// Rationale for the mirror (not a duplicate schema):
//   - The Workspace is a vanilla-JS SPA; it cannot import .ts at runtime.
//   - The labels are *display* constants, not validation logic; the
//     schema keeps them as the single source of truth.
//   - The contract test catches drift on every CI run.

window.WORK_ITEM_STATUS_LABEL = Object.freeze({
  ready: '待交付',
  delivered: '已交付',
  acknowledged: '已确认',
  closed: '已关闭',
});

window.WORK_ITEM_TYPE_LABEL = Object.freeze({
  recommendation: '建议',
  analysis: '分析',
  work_item: '工作项',
  report: '报告',
});

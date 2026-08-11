# Proposal Taxonomy & Naming Convention

**Version**: 1.0.0  
**Effective**: 2026-08-11

---

## 1. Taxonomy

agentFabric 使用两类 Proposal：

### Architecture Proposal (P-numbered)

定义系统架构决策、跨模块设计、平台边界。每个 P-numbered proposal 在 `context/decisions.md` 中有对应的 ADR entry。

```
P{NNNN}[-{N}]-{kebab-case-description}.md
```

| 元素 | 格式 | 示例 |
|------|------|------|
| Prefix | `P` + 4-digit sequential number | `P0005` |
| Sub-proposal | `.N` after prefix | `P0005.1` |
| Sub-sub | `.N.N` | `P0005.6.1` |
| Description | lowercase kebab-case | `jd-connector` |
| Extension | `.md` | `.md` |

### Feature / Phase Proposal (version-phase)

定义特定模块的版本化开发阶段。不分配 P 编号——它们属于模块实现，不属于架构决策。

```
{module}-v{version}-phase{N}-{description}.md
```

| 元素 | 格式 | 示例 |
|------|------|------|
| Module | lowercase kebab-case | `workspace` |
| Version | `v{major}.{minor}` | `v0.2` |
| Phase | `phase{N}` | `phase2` |
| Description | lowercase kebab-case | `ui-design` |

### Expansion Layer (P000x)

`P000x` 是保留前缀，用于"系统扩展层"提案——这些是未来能力规划，尚未分配具体 P 编号。当扩展层进入实施时，应分配正式 P 编号并移出 P000x 命名空间。

### Design Review (unclassified)

单个模块或数据模型的设计审查，不属于架构决策。使用 `{module}-{description}.md` 或分配 Feature Proposal 格式。

---

## 2. Naming Rules

### Mandatory

1. **All lowercase**. No PascalCase, camelCase, UPPERCASE in description.
2. **Hyphens only**. No underscores (`_`), no ampersands (`&`), no spaces.
3. **No special characters**. Only `[a-z0-9.-]`.
4. **No truncation**. Description must be complete, not cut off mid-word.
5. **English only** in filename.

### Prefix Assignment

| Type | Prefix | When |
|------|--------|------|
| Architecture decision | `P0001`–`P0099` | Cross-module system design |
| Connector design | `P0005.N` | New platform connector |
| Runtime design | `P0004.N` | Runtime control plane extensions |
| Workspace UI | `P0003.N` | UI system design |
| Data foundation | `P0005.N` | Capability / pipeline / schema |
| Agent integration | `P0006.N` | HermesAgent / Workspace integration |
| Operator intelligence | `P0007.N` | Pattern / Memory / Skill |
| Future expansion | `P000x.N` | Reserved — assign P number on implementation |
| Module phase | `{module}-v{ver}-phase{N}` | Feature-level phased development |

### Next Available P Numbers

| Prefix | Next | Current |
|--------|------|---------|
| `P0001` | 1 | P0001 ✅ |
| `P0002` | 1 | P0002 ✅ |
| `P0003` | 2 | P0003 ✅, P0003.1 ✅ |
| `P0004` | 1 | P0004 ✅ |
| `P0005` | 7 | P0005 ✅, P0005.1-6 ✅, P0005.6.1 ✅ |
| `P0006` | 3 | P0006 ✅, P0006.1 ✅, P0006.2 ✅ |
| `P0007` | 1 | P0007.3 ✅ (P0007, P0007.1, P0007.2 not yet written) |
| `P0008` | — | Available |
| `P000x` | 5 | P000x ✅, P000x.1-4 ✅ |

---

## 3. Examples

```
✅ P0005.1-jd-connector.md
✅ P0006.2-historical-replay-runtime.md
✅ workspace-v0.2-phase2-ui-design.md
✅ P0003.1-ui-fix-right-panel-redesign.md
✅ P000x.1-multi-connector-expansion.md

❌ P0005-Business-Data-Foundation.md          (PascalCase)
❌ P0005.4-Capalibity-Runtime-Layer.md        (typo: "Capalibity")
❌ P0006-HermesAgent-Workspace-Integrat.md    (truncated: "Integrat")
❌ P000x.2-Observability_Runtime-Trace.md     (underscore)
❌ P0003.1-UI-Fix-&-Right-Panel.md            (special char &)
```

---

## 4. Creating a New Proposal

1. Determine type: Architecture (P-number) or Feature (module-phase)
2. If Architecture: use next available P number in the domain
3. Format description as lowercase kebab-case
4. Add ADR entry in `context/decisions.md` (Architecture only)
5. Update `proposals/README.md` next-available-numbers table
6. Reference other proposals by their exact filename

---

## 5. Current Inventory (2026-08-11)

```
proposals/
├── P0001-agentfabric-reposition.md
├── P0002-workspace-information-architecture.md
├── P0003-trust-ui-system.md
├── P0003.1-ui-fix-right-panel-redesign.md
├── P0004-runtime-control-plane.md
├── P0005-business-data-foundation.md
├── P0005.1-jd-connector.md
├── P0005.2-discovery-driven-connector-architecture.md
├── P0005.3-discovery-capability-generator.md
├── P0005.4-capability-runtime-layer.md
├── P0005.5-runtime-convergence-layer.md
├── P0005.6-execution-convergence-legacy-collapse-layer.md
├── P0005.6.1-cli-final-patch.md
├── P0006-hermes-agent-workspace-integration.md
├── P0006.1-product-readiness-checklist.md
├── P0006.2-historical-replay-runtime.md
├── P0007.3-memory-retrieval.md
├── P000x-system-expansion-layer.md
├── P000x.1-multi-connector-expansion.md
├── P000x.2-observability-runtime-trace-layer.md
├── P000x.3-multi-connector-federation-layer.md
├── P000x.4-cross-platform-semantic-normalization-layer.md
├── signal-persistence-design-review.md
├── workspace-v0.2-phase2-ui-design.md
└── README.md                                 ← this file
```

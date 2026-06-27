# E-Commerce Data Collectors

Business data collectors that ingest platform merchant metrics (JD / Tmall / future PDD)
and emit a normalized signal stream downstream ranking/memory/skill engines consume.

> Observation only. No automated actions.

## Collector contract

A collector is a function that fetches platform metrics and emits an array of
`SignalCollectorInput` records (defined in `src/shared/schemas/signal.ts`). Each record
carries: `signal_id`, `source` (platform), `shop_id`, `signal_type`, `timestamp`, `metrics`
(canonical bundle), `confidence`, `priority`. The output is Zod-validated, then passed
through `normalizeSignal()` which maps platform-specific field names into the canonical
`EnterpriseSignalPayload` and persists an `EnterpriseSignal` + hourly snapshot.

The 5 enterprise signal types: `hourly_sales`, `hourly_traffic`, `daily_summary`,
`campaign_performance`, `anomaly_alert`.

## Cross-platform normalization

Platform field aliases map to canonical metrics (`gmv`, `orders`, `uv`, `roi`, ...):

| Canonical | JD aliases | Tmall aliases |
|-----------|-----------|---------------|
| `gmv` | `totalGMV`, `turnover` | `tradeAmt`, `payAmt` |
| `orders` | `orderCount`, `totalOrders` | `payOrdCnt` |
| `uv` | `uniqueVisitors` | `uvCnt` |
| `roi` | `productionRatio` | `rol` |

To add PDD: define `normalizePddMetrics()` with PDD's native aliases, add `'pdd'` to
`SignalSourcePlatformSchema`, and register a PDD adapter.

## Auth / credentials

Platform auth profiles are harvested from a manually-logged-in Chrome session via the
Chrome DevTools Protocol (CDP) and stored as `AuthProfile` JSON at
`.collector-auth/{platform}.json` (cookie-header reuse). The TS adapter starts from a
cached/raw platform payload for the reboot; full CDP onboarding is the follow-up below.

## Onboarding (CDP cookie harvest) — follow-up

The agentCMS reference implementation provides:

- `onboard.sh` — launches Chrome in debug mode (`--remote-debugging-port=9222`) with a
  dedicated user-data dir, opens the platform login URL, waits for a human login.
- `onboard_extract.ts` — connects over CDP, harvests cookies per platform domain list,
  persists an `AuthProfile` (`cookies`, `cookieHeader`).
- `jd_historical_api.ts` — attaches to a logged-in tab, intercepts
  `szgateway.jd.com/api/lowcode/indexSummary/**` POSTs, rewrites only the 4 date fields
  (`startDate`/`endDate`/`compareStartDate`/`compareEndDate`) while preserving CSRF headers,
  to backfill 30 days of historical data.

These scripts are NOT ported verbatim (CDP plumbing is runtime mechanics). The business
concept — extract shop overview / trends / top_products / channel_analysis / competitors —
is preserved in `adapters.ts`; the cookie-header reuse seam is in `auth.ts`.

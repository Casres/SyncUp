# EXPLORE Cron + Billing — Phase C Handoff

**Completed:** 2026-05-24  
**Agent:** Lead Manager (direct — sub-agent blocked by permission sandbox)

---

## What Was Built

| File | Action | Summary |
|---|---|---|
| `src/workers/explorePrewarm.worker.ts` | **CREATED** | node-cron pre-warmer; serialized per-city getFeed calls |
| `src/workers/exploreFeatured.hook.ts` | **CREATED** | Identity stub for future B2B featured listings |
| `src/infra/gcp-billing-alerts.tf` | **CREATED** | Terraform: 3 billing budgets ($25/$50/$100, notify-only, Places-only) |
| `src/infra/gcp-billing-alerts.README.md` | **CREATED** | Manual gcloud fallback + prerequisites |
| `src/server.ts` | **MODIFIED** | Starts pre-warmer after listen, production only |
| `src/services/explore.service.ts` | **MODIFIED** | Calls `exploreFeaturedHook` after merge, before cache write |
| `src/config/env.ts` | **MODIFIED** | Added `EXPLORE_PREWARM_CITIES`, `EXPLORE_PREWARM_CRON`, `GCP_*` vars |

---

## Cron Cadence

| Var | Default | Description |
|---|---|---|
| `EXPLORE_PREWARM_CRON` | `0 */2 * * *` | Every 2 hours |
| `EXPLORE_PREWARM_CITIES` | `nyc,sf,la,chi,sea,atx` | 6 city centroids |

Runs per day: 12 sweeps × 6 cities = 72 upstream requests (36 Eventbrite + 36 Places).

**Tradeoff:** TTL 600 s (10 min) vs cron every 2 hours means the cache goes cold between sweeps for popular city centroids. Pre-warming guarantees a warm cache within the first 10 minutes of a 2-hour window; the remaining ~110 minutes rely on user-traffic re-warming. Increase cron frequency if cold-miss rate becomes unacceptable — at the cost of more upstream quota consumption.

---

## Cache Writeback Path

Pre-warmer calls `exploreService.getFeed(lat, lng, 'all', 0)` → service checks `exploreCache.getFeed` (miss on cold start) → fetches both APIs → `exploreFeaturedHook(merged)` → `exploreCache.setFeed(lat, lng, 'all', withFeatured)`. Same key schema as request-path writes. No separate write path.

---

## Featured Hook

`exploreFeaturedHook` (identity today) is called inside `exploreService.getFeed` after the dedup+sort merge and before the cache write. When the Featured agent ships it will:
1. Query the `Featured` table for the lat/lng bucket + current time window.
2. Mark matching `ExploreVenue.isFeatured = true`.
3. Reorder so featured items appear first.
4. Log an impression event per featured item shown.

`ExploreVenue.isFeatured` already exists on the type — the hook simply flips it from `false` to `true` for qualifying venues.

---

## GCP Billing Alerts

Three `google_billing_budget` Terraform resources: $25 / $50 / $100. All:
- `spend_basis = CURRENT_SPEND`
- `threshold_percent = 1.0` (100% of the budget amount)
- `disable_default_iam_recipients = false` (GCP built-in billing emails stay active)
- Filter: `services/places.googleapis.com` only — Eventbrite is NOT on GCP

**Notify-only guaranteed:** no `auto_disable_project_on_threshold` in the resource. Alerts email / Pub/Sub only.

**Manual fallback:** `gcp-billing-alerts.README.md` documents the equivalent `gcloud billing budgets create` commands.

---

## Open Items

- **Eventbrite billing:** tracked separately in the Eventbrite dashboard (eventbrite.com) — not through GCP. Flag to DevOps to set up Eventbrite usage alerts independently.
- **Featured agent:** the `exploreFeaturedHook` stub is the wire-in point. When the Featured agent ships, it replaces `return venues` with the DB query + reorder + impression logging. Do NOT extend the stub — the Featured agent owns the full implementation.
- **Observability:** consider adding a Prometheus/Datadog counter for `servedFrom: 'cache' | 'live'` to measure cache hit rate after pre-warmer ships. Currently logged implicitly via `explore.controller.ts` 502 error logs for live-fetch failures.
- **tsc:** confirmed clean (zero errors) after all Phase C changes.

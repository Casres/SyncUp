# EXPLORE Cache + Rate-Limit — Phase B Handoff

**Completed:** 2026-05-24  
**Agent:** Lead Manager (direct — sub-agent blocked by permission sandbox)

---

## What Was Built

| File | Action | Summary |
|---|---|---|
| `src/services/exploreCache.ts` | **CREATED** | Typed Redis cache module with `getFeed / setFeed / getDetail / setDetail` |
| `src/services/explore.service.ts` | **MODIFIED** | Replaced all inline Redis calls with `exploreCache.*`; removed `safeRedisGet`, `safeRedisSet`, `feedKey`, `detailKey`, `bucket`, `FEED_TTL`, `DETAIL_TTL`, `redis` import |
| `src/middleware/exploreRateLimit.ts` | **MODIFIED** | Added burst sub-budget (5 req/60s) and `X-RateLimit-*` headers; lowered hour default to 20 |
| `src/config/env.ts` | **MODIFIED** | `EXPLORE_RATE_LIMIT` default 30 → 20; added `EXPLORE_RATE_LIMIT_BURST` (5) and `EXPLORE_CACHE_TTL_SECONDS` (600) |

---

## Cache Module Surface

```ts
// src/services/exploreCache.ts
exploreCache.getFeed(lat, lng, category)    → Promise<ExploreVenue[] | null>
exploreCache.setFeed(lat, lng, category, venues)  → Promise<void>
exploreCache.getDetail(id)                 → Promise<ExploreVenue | null>
exploreCache.setDetail(id, venue)          → Promise<void>
```

Discriminated key union:

```ts
type ExploreCacheKey =
  | { kind: 'feed'; lat: number; lng: number; category: ExploreCategory }
  | { kind: 'detail'; id: string };
```

---

## Cache Key Continuity (No Cold-Start Guarantee)

The serialized keys are byte-for-byte identical to the previous inline helpers:

| Key | Format | TTL |
|---|---|---|
| Feed | `explore:feed:{bucket(lat)}:{bucket(lng)}:{category}` | `env.EXPLORE_CACHE_TTL_SECONDS` (default 600 s) |
| Detail | `explore:detail:{id}` | 1800 s (hardcoded) |

`bucket()` rounds to 2 dp — same as the old `feedKey` helper, same as mobile-side bucketing.

---

## TTL Contract

- Feed TTL: `env.EXPLORE_CACHE_TTL_SECONDS` (default 600, override-able). Originally-spec'd 600–900 range was for the abandoned city-based model — that range does not apply here.
- Detail TTL: hardcoded 1800 s — long-tail single-venue lookups don't benefit from per-env tuning.

---

## Service Refactor Confirmation

Removed from `explore.service.ts`: `safeRedisGet`, `safeRedisSet`, `feedKey`, `detailKey`, `bucket`, `FEED_TTL`, `DETAIL_TTL`, direct `redis` import.

Control flow and fail-open semantics are preserved — `exploreCache.*` helpers swallow Redis errors and return null / no-op.

---

## Rate-Limit Semantics

| Counter | Key | Limit | Window |
|---|---|---|---|
| Hourly | `explore:rate:{userId}:hour` | `EXPLORE_RATE_LIMIT` = 20 | 3600 s |
| Burst | `explore:rate:{userId}:burst` | `EXPLORE_RATE_LIMIT_BURST` = 5 | 60 s |

Scope: `/explore/feed` only. `/explore/:id` (detail) remains unthrottled — cache hit rate is high and volume is low.

---

## Headers Emitted on Every `/explore/feed` Response

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: <remaining hourly>
X-RateLimit-Reset: <unix seconds when hour bucket refills>
Retry-After: <seconds>     (on 429 only)
```

---

## 429 Payload Shape

Both deny reasons share the same shape; mobile branches on `reason`:

```json
{
  "error": "Explore burst limit exceeded",
  "reason": "burst_quota",
  "retryAfterSeconds": 60,
  "limit": 5
}
// or
{
  "error": "Explore rate limit exceeded",
  "reason": "hour_quota",
  "retryAfterSeconds": <remaining>,
  "limit": 20
}
```

---

## Atomicity Note

`INCR` followed by conditional `EXPIRE` on first hit. Well-known race window: a request landing immediately after key expiry but before the `EXPIRE` lands sees one over-count. Acceptable for a rate-limit bucket — never an outage.

---

## Fail-Open Confirmation

- Cache module: all helpers return `null` / no-op on Redis error — live fetch is the fallback.
- Rate-limit middleware: Redis error → log warn → pass through. Availability over enforcement.

---

## Open Items for Phase C

- Pre-warmer should call `exploreService.getFeed(lat, lng, category, 0)` so cache writes flow through `exploreCache.setFeed` with the same key schema. No separate write path needed.
- `tsc --noEmit` confirmed clean (zero errors) after all Phase B changes.

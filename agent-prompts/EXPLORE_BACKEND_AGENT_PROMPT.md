> ⚠️ **PARTIAL SUPERSESSION — READ BEFORE SPAWNING SUB-AGENTS.**
>
> - **Phase A (Gateway)** — SUPERSEDED. The gateway was already shipped in commit `bb9a7e6` on 2026-05-22 (mixed-scope "GAP 3 + monorepo catch-up" commit). Existing files on disk:
>   - `src/services/explore.service.ts` (wired through `/explore/*` routes)
>   - `src/services/eventbrite.client.ts` + `src/services/googlePlaces.client.ts`
>   - `src/controllers/explore.controller.ts` + `src/routes/explore.routes.ts` (registered at `/explore` in `app.ts`)
>   - `src/types/explore.types.ts` (uses `ExploreCategory` / `ExploreSource` / `ExploreVenue` model — NOT the `ExploreCity` / `ExploreFeed` model this prompt describes)
>
>   The Step 3 Wave 1 Phase A agent didn't know this and wrote a parallel rewrite under `src/clients/`. Those orphan files were deleted on 2026-05-23 cleanup.
>
> - **Phase B (Cache + Rate-Limit)** — PARTIAL. `src/middleware/exploreRateLimit.ts` exists (committed `bb9a7e6`) but: defaults to 30 req/hr instead of spec's 20, lacks the 5-burst/60s sub-budget, emits only `Retry-After` (no `X-RateLimit-*`), and **is not registered anywhere**. `RedisExploreCache` does not exist. Before respawning Phase B, this prompt's Phase B section needs editing — it assumes the `ExploreCachePort` interface from the now-deleted `src/clients/_types.ts`. Either re-introduce that interface into `src/types/explore.types.ts` or redesign the cache contract to fit the existing model.
>
> - **Phase C (Cron + Billing)** — STILL PENDING in full. The `src/workers/` directory doesn't exist yet.
>
> **Net effect:** if you re-run this coordinator naively, the Phase A sub-agent will produce another parallel rewrite. Spawn only Phase B (after updating its section) and Phase C.
>
> ---

# Backend — Explore (Eventbrite + Google Places) Coordinator Prompt

> **You are the Backend / Explore Coordinator.** This is a multi-phase build. Read this entire document, then **spawn the three sub-agents listed below** rather than executing the work yourself. This prompt defines the split, the dependency graph between sub-agents, and the complete spec each sub-agent needs.
>
> If you are reading this *as* one of the sub-agents (Gateway, Cache+RateLimit, or Cron+Billing), jump straight to the section bearing your name — that section is self-contained and includes everything you need.

---

## Recommendation: Split Into 3 Sub-Agents

A single Explore agent would do ~3 days of work in series: write two external API client wrappers, design service interfaces, implement Redis cache + rate limit middleware, set up a cron worker, configure GCP billing alerts, and stub the Featured-listings hook. Three of these scopes have minimal overlap and distinct test surfaces. Splitting them parallelizes ~50% of the work and isolates failure modes.

**Recommended split:**

| Sub-agent | Owns | Depends on |
|---|---|---|
| **EXPLORE Gateway** (Phase A) | Eventbrite + Google Places client wrappers, service layer, route group `/explore/*`, response shapes, error normalisation | Nothing in this slice — runs immediately |
| **EXPLORE Cache + Rate-Limit** (Phase B) | Redis cache wrapper (TTL 10–15min) consumed by the Gateway service, per-user rate-limit Fastify preHandler (20 Explore feed loads / hr) | Phase A's `ExploreCacheKey` and `ExploreRouteScope` exports — can be drafted from this prompt in parallel, plugged in once Phase A lands |
| **EXPLORE Cron + Billing** (Phase C) | BullMQ-or-node-cron pre-warming worker for popular cities, Google Cloud billing-alert Terraform/CLI definitions, Featured-listings hook stub | Phase A's service layer (calls `exploreService.fetchEventsForCity(...)`); Phase B's cache (so pre-warming actually fills the cache) |

**Spawn order for the Lead Manager / Orchestrator:**

```
Wave 1 (parallel):
  ├── Phase A — EXPLORE Gateway
  └── Phase B — EXPLORE Cache + Rate-Limit  (designed against the contract in this prompt; final wire-in waits for Phase A)

Wave 2 (after Phase A + Phase B COMPLETE):
  └── Phase C — EXPLORE Cron + Billing
```

Each sub-agent writes its own HANDOFF.md (paths listed below). Each sub-agent must independently pass `tsc --noEmit` before handing off.

**Sub-agent HANDOFF paths:**

- Phase A: `social-calendar-api/src/routes/EXPLORE_GATEWAY_HANDOFF.md`
- Phase B: `social-calendar-api/src/middleware/EXPLORE_CACHE_RATELIMIT_HANDOFF.md`
- Phase C: `social-calendar-api/src/workers/EXPLORE_CRON_BILLING_HANDOFF.md`

---

## Shared Context (Read Before Any Phase Begins)

You are working inside `social-calendar-api/`. The following backend work is complete and must not be modified by any of the three sub-agents:

| Agent | Output | Key files |
|---|---|---|
| Schema / Migrations | `schema.prisma` + RLS migrations | `social-calendar-api/prisma/` |
| Auth (Clerk) | Per-request Prisma transaction; `request.user` + `request.prismaTransaction` | `src/middleware/auth.middleware.ts`, `src/middleware/AUTH_HANDOFF.md` |
| Events Domain | Route / controller / service / repository pattern to replicate | `src/routes/EVENTS_HANDOFF.md` |
| Friends Domain | Same pattern | `src/routes/FRIENDS_HANDOFF.md` |
| Groups Domain | Same pattern | `src/routes/GROUPS_HANDOFF.md` |
| Backend Cleanup | Dual Prisma client (`prisma` migration owner / `prismaApp` runtime); `GET /health` | `src/BACKEND_CLEANUP_HANDOFF.md` |
| Socket.io Layer | Fastify decorated with `io`; `src/types/socket.types.ts` | `src/sockets/SOCKETIO_HANDOFF.md` |
| DevOps — docker-compose | Redis service container reachable via `REDIS_URL` | `docker-compose.yml`, `.env.example` |

**Every sub-agent must read these before writing any code:**

- `social-calendar-api/CLAUDE.md` — architecture rules, locked decisions, folder structure
- `src/middleware/AUTH_HANDOFF.md` — transaction + RLS contract (Explore routes still use `request.user.id` for rate-limit keys and Featured-listings logging; Explore routes do NOT hit the per-request Prisma transaction since their data source is external)
- `src/routes/EVENTS_HANDOFF.md` — the reference Route → Controller → Service → Repository pattern (Explore replaces the Repository layer with `ExploreCacheStore` + `ExternalClient`s, but the layering rule still applies)
- `src/config/env.ts` — current Zod schema (each phase adds env fields; coordinate via the table below)
- `src/config/prisma.ts` — dual-client setup
- `src/config/redis.ts` — ioredis singleton (created by the Socket.io agent; if missing, Phase B creates it)
- `src/app.ts` — how route groups, plugins, and preHandlers are registered
- `LEAD_MANAGER.md` — open decisions log, especially Decision #3 (RLS) and the Architecture Rules block in CLAUDE.md
- `social-calendar-mobile/src/api/index.ts` (read-only) — the mobile API surface that will eventually consume `/explore/*`

---

## Non-Negotiable Contracts (Apply to All Three Phases)

These rules are locked. Sub-agents do not deviate.

### 1. No client-direct calls to Eventbrite or Google Places in production

The mobile app NEVER holds an Eventbrite or Google Places API key. Every external request goes through `social-calendar-api`. This is a hard rule for three reasons: (a) API keys cannot ship in client bundles, (b) the cache is server-side and needs a single egress point, (c) the per-user rate limit cannot be enforced from the client.

If a sub-agent finds an existing mobile call hitting `eventbriteapis.com` or `maps.googleapis.com` directly, flag it in HANDOFF — do not fix it (that's the mobile API agent's job).

### 2. Architecture direction is strict (CLAUDE.md)

```
Routes → Controllers → Services → (Repositories | ExternalClients) → Database | External APIs
```

For Explore, "Repositories" are replaced by:
- `ExploreCacheStore` (Redis read/write — Phase B)
- `EventbriteClient` and `GooglePlacesClient` (Phase A)

Business logic — including "is this request inside the rate limit?", "should I serve cache or refetch?", "merge Eventbrite + Places into a unified Explore feed shape" — lives in `explore.service.ts`. Controllers handle HTTP only. No layer skips another.

### 3. TypeScript strict — no `any`

Every external API response is typed. Use Zod to validate the upstream payload before passing it into the service layer; an Eventbrite schema change must surface as a Zod parse error at the seam, not as silent garbage downstream.

### 4. Every Explore route is auth-gated

Explore is behind Clerk JWT like every other route. The auth middleware runs first; `request.user.id` is available to all Explore controllers. (Even though Explore data is not user-owned, the rate limit and Featured-listings audit hook are keyed by user.)

### 5. Secrets via Zod-validated env only

API keys and billing alert tokens flow through `src/config/env.ts`. Refuse to boot on missing vars. Never hardcode keys, never check them into git, never read `process.env.X` outside `env.ts`.

### 6. Cost discipline is a requirement, not a nice-to-have

The cache + rate limit + billing alerts exist because Eventbrite and Google Places bill per call and per QPS. Every PR that bypasses the cache or rate limit is a P0 cost regression. Treat the cache layer as authoritative — controllers ask the service, the service asks the cache, the cache asks the external client. There is no other code path to the external APIs.

---

## Env Var Coordination Table

Each phase adds env fields to `src/config/env.ts`. To avoid merge conflicts, each phase adds its OWN block in a clearly-labelled section. The Zod schema accepts all of them.

| Var | Phase | Purpose | Required? |
|---|---|---|---|
| `EVENTBRITE_API_TOKEN` | A | Eventbrite private token (server-side OAuth bearer) | yes |
| `EVENTBRITE_API_BASE` | A | Default `https://www.eventbriteapi.com/v3` — overridable for tests | yes (with default) |
| `GOOGLE_PLACES_API_KEY` | A | Google Places (New) API key, server-side restricted | yes |
| `GOOGLE_PLACES_API_BASE` | A | Default `https://places.googleapis.com/v1` — overridable for tests | yes (with default) |
| `EXPLORE_CACHE_TTL_SECONDS` | B | Cache TTL, default `900` (15min). MUST be between 600 and 900 inclusive (10–15min spec). | yes (with default) |
| `EXPLORE_RATE_LIMIT_PER_HOUR` | B | Default `20`. Per-user, per-route-scope (Explore feed). | yes (with default) |
| `EXPLORE_RATE_LIMIT_BURST` | B | Default `5`. Burst allowance over a 60-sec window inside the hourly budget. | yes (with default) |
| `EXPLORE_PREWARM_CITIES` | C | Comma-separated list of city IDs/slugs to pre-warm, e.g. `nyc,sf,la,chi`. Default `nyc,sf,la,chi,sea,atx`. | yes (with default) |
| `EXPLORE_PREWARM_CRON` | C | Cron expression, default `0 */2 * * *` (every 2 hours). MUST line up with cache TTL so cache is always fresh on user request. | yes (with default) |
| `GCP_PROJECT_ID` | C | Used only by the billing-alert IaC step | optional in dev, required in production |
| `GCP_BILLING_ACCOUNT_ID` | C | Used only by the billing-alert IaC step | optional in dev, required in production |
| `GCP_BILLING_ALERT_THRESHOLDS_USD` | C | Default `25,50,100` — comma-separated. MUST contain exactly these three values in the prod environment. | yes (with default) |

When a sub-agent adds its block, add a header comment:

```ts
// ── EXPLORE Phase A — Eventbrite + Google Places clients ─────────────
EVENTBRITE_API_TOKEN: z.string().min(1),
EVENTBRITE_API_BASE: z.string().url().default('https://www.eventbriteapi.com/v3'),
// ... etc
```

---

## Shared Folder Layout

Files created across all three phases:

```
src/
├── routes/
│   └── explore.routes.ts                    ← Phase A
├── controllers/
│   └── explore.controller.ts                ← Phase A
├── services/
│   └── explore.service.ts                   ← Phase A (Phase B + C extend via injection)
├── clients/
│   ├── eventbrite.client.ts                 ← Phase A
│   ├── googlePlaces.client.ts               ← Phase A
│   └── _types.ts                            ← Phase A (shared types like ExploreCity, ExploreEvent, ExplorePlace)
├── cache/
│   └── exploreCache.ts                      ← Phase B (the Redis wrapper used by explore.service)
├── middleware/
│   ├── exploreRateLimit.middleware.ts       ← Phase B
│   └── EXPLORE_CACHE_RATELIMIT_HANDOFF.md   ← Phase B
├── workers/
│   ├── explorePrewarm.worker.ts             ← Phase C
│   ├── exploreFeatured.hook.ts              ← Phase C (Featured-listings stub)
│   └── EXPLORE_CRON_BILLING_HANDOFF.md      ← Phase C
├── infra/
│   ├── gcp-billing-alerts.tf                ← Phase C (Terraform)
│   └── gcp-billing-alerts.README.md         ← Phase C (manual gcloud fallback)
└── routes/
    └── EXPLORE_GATEWAY_HANDOFF.md           ← Phase A
```

Phase A creates `src/clients/`, `src/services/explore.service.ts`, the routes/controller, and exports stable interfaces for Phase B + C to import.

---

# PHASE A — EXPLORE Gateway

> **You are the Backend / EXPLORE Gateway sub-agent.** Read the Shared Context, Non-Negotiable Contracts, and Env Var Coordination Table sections above. Then execute this phase exactly.

## Goal

Build the route group that mediates ALL Eventbrite + Google Places traffic. Output is a working `/explore/*` API behind Clerk auth. The cache layer (Phase B) and pre-warm worker (Phase C) plug in via clearly-named extension points — do not implement them yourself.

## Files to Create

```
src/clients/_types.ts
src/clients/eventbrite.client.ts
src/clients/googlePlaces.client.ts
src/services/explore.service.ts
src/controllers/explore.controller.ts
src/routes/explore.routes.ts
src/routes/EXPLORE_GATEWAY_HANDOFF.md     ← write last
```

Add the Phase A env block to `src/config/env.ts`. Register the route group in `src/app.ts` after existing route registrations:

```ts
await app.register(exploreRoutes, { prefix: '/explore' });
```

## Endpoint Specification

All endpoints live under `/explore` prefix. All require auth (the global preHandler handles this; nothing extra to wire on the routes themselves).

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/explore/events` | List Eventbrite events near a city. Query: `?city=string` (required), `?categoryId=string` (optional), `?startDate=ISO8601` (optional, defaults to today), `?endDate=ISO8601` (optional, defaults to +30d), `?limit=number` (1–50, default 25), `?cursor=string` (opaque pagination token from previous response). Returns the unified `ExploreEvent[]` shape — never raw Eventbrite. | 200, 400, 502 |
| `GET` | `/explore/places` | List Google Places near a location. Query: `?lat=number` (required), `?lng=number` (required), `?radiusMeters=number` (default 5000, max 50000), `?includedTypes=string` (comma-separated Place types, default `bar,restaurant,night_club,cafe`), `?limit=number` (1–20, default 10). Returns unified `ExplorePlace[]`. | 200, 400, 502 |
| `GET` | `/explore/cities` | Static list of pre-warmed cities (read from `EXPLORE_PREWARM_CITIES`). Used by mobile to render a city picker. | 200 |
| `GET` | `/explore/feed` | Unified Explore feed for a city: top events + top places merged, sorted by relevance. Query: `?city=string` (required), `?limit=number` (default 20). This is the high-volume endpoint that user actions hit on the mobile Explore tab. | 200, 400, 429, 502 |

**`429 Too Many Requests`** on `/explore/feed` only — emitted by the Phase B rate-limit preHandler. Other routes are not rate-limited at this layer (the underlying upstream calls share the same cache, so direct-hit-by-cache requests are essentially free).

## Unified Response Shapes (Create in `src/clients/_types.ts`)

These are the public shapes returned by `/explore/*`. They MUST be the API surface — mobile code must never see raw Eventbrite or Places JSON.

```ts
export interface ExploreCity {
  id: string;          // 'nyc' | 'sf' | ...
  name: string;        // 'New York City'
  centroid: { lat: number; lng: number };
  defaultRadiusMeters: number;
}

export interface ExploreEvent {
  source: 'eventbrite';
  externalId: string;          // Eventbrite event id
  title: string;
  description: string | null;
  startsAtIso: string;
  endsAtIso: string | null;
  venue: { name: string | null; city: string | null; lat: number | null; lng: number | null };
  url: string;                 // Eventbrite-hosted page (the only acceptable outbound link)
  imageUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  category: string | null;     // normalized Eventbrite category slug
  isFeatured: false;           // Phase C may flip to true via exploreFeatured.hook
}

export interface ExplorePlace {
  source: 'google_places';
  externalId: string;          // Google place id
  name: string;
  primaryType: string | null;  // e.g. 'bar', 'cafe'
  address: string | null;
  location: { lat: number; lng: number };
  rating: number | null;       // 0–5
  userRatingCount: number | null;
  priceLevel: 0 | 1 | 2 | 3 | 4 | null;
  openNow: boolean | null;
  websiteUrl: string | null;
  googleMapsUrl: string;
  isFeatured: false;           // Phase C may flip to true
}

export interface ExploreFeed {
  city: ExploreCity;
  events: ExploreEvent[];
  places: ExplorePlace[];
  cachedAt: string;            // ISO timestamp — when the underlying upstream call was made
  servedFrom: 'cache' | 'live';
}

export interface ExploreEventsPage {
  events: ExploreEvent[];
  nextCursor: string | null;
}

export interface ExplorePlacesPage {
  places: ExplorePlace[];
}
```

Plus extension points for Phase B + C to import:

```ts
// Cache key schema — Phase B implements the cache against this contract.
export type ExploreCacheKey =
  | { kind: 'events'; city: string; categoryId: string | null; startDate: string; endDate: string; cursor: string | null; limit: number }
  | { kind: 'places'; lat: number; lng: number; radiusMeters: number; includedTypes: string; limit: number }
  | { kind: 'feed';   city: string; limit: number };

// Serializer used by both Phase A reads and Phase C pre-warm writes.
// Implementation lives in Phase B's exploreCache.ts.
export function exploreCacheKeyToString(key: ExploreCacheKey): string;

// Route scope — the rate-limit preHandler uses this to key the rate-limit bucket.
export type ExploreRouteScope = 'feed' | 'events' | 'places' | 'cities';
```

Export the type unions; export `exploreCacheKeyToString` as a `declare` stub if Phase B hasn't shipped yet (Phase A's service calls it through the cache interface — see below).

## External Client Specifications

### `src/clients/eventbrite.client.ts`

A thin wrapper around `fetch` (or `undici`) for Eventbrite v3 API. NO third-party Eventbrite SDK — the official one is unmaintained.

Public surface:

```ts
export interface EventbriteSearchParams {
  cityId: string;          // mapped from ExploreCity.id to Eventbrite's location.address
  categoryId?: string;
  startDateIso: string;
  endDateIso: string;
  limit: number;
  cursor: string | null;   // Eventbrite's continuation token
}

export class EventbriteClient {
  constructor(opts: { token: string; baseUrl: string; fetchImpl?: typeof fetch });
  async searchEvents(params: EventbriteSearchParams): Promise<ExploreEventsPage>;
}

// Thrown errors:
export class EventbriteUpstreamError extends Error { /* HTTP status, upstream message */ }
export class EventbriteRateLimitError extends EventbriteUpstreamError { /* 429 */ }
export class EventbriteAuthError extends EventbriteUpstreamError { /* 401/403 */ }
```

Inside `searchEvents`:
1. Build the Eventbrite request URL (`/events/search/` is deprecated — use `/destination/events/` or the current canonical endpoint as of the API docs at boot time; flag if the endpoint is unclear).
2. Send the request with `Authorization: Bearer ${token}`.
3. Validate the response body with a Zod schema (`eventbriteEventResponseSchema`).
4. Map every raw event into the unified `ExploreEvent` shape. Missing fields → `null` (NEVER `undefined`).
5. Translate HTTP failures into the typed error classes. `429` → `EventbriteRateLimitError`. `401`/`403` → `EventbriteAuthError`. Other non-2xx → `EventbriteUpstreamError`.

### `src/clients/googlePlaces.client.ts`

Wraps the Google Places (New) API. Use `X-Goog-Api-Key` header for auth and a `X-Goog-FieldMask` header for response shaping (Places New requires explicit field masks).

```ts
export interface GooglePlacesSearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];   // e.g. ['bar', 'restaurant']
  limit: number;
}

export class GooglePlacesClient {
  constructor(opts: { apiKey: string; baseUrl: string; fetchImpl?: typeof fetch });
  async searchNearby(params: GooglePlacesSearchParams): Promise<ExplorePlacesPage>;
}

export class GooglePlacesUpstreamError extends Error {}
export class GooglePlacesQuotaError extends GooglePlacesUpstreamError {}
export class GooglePlacesAuthError extends GooglePlacesUpstreamError {}
```

Use the `places:searchNearby` POST endpoint. Field mask should request only the fields needed to populate `ExplorePlace`:

```
places.id,places.displayName,places.primaryType,places.formattedAddress,
places.location,places.rating,places.userRatingCount,places.priceLevel,
places.regularOpeningHours.openNow,places.websiteUri,places.googleMapsUri
```

Translating field-mask fields out of the payload is mechanical — the Zod schema declares the same nested shape. Do not request fields you don't use; Places New bills per field mask category.

## Service Specification (`src/services/explore.service.ts`)

`ExploreService` is the only place that decides "cache or live". Constructor takes injectable clients + cache:

```ts
export interface ExploreCachePort {
  get<T>(key: ExploreCacheKey): Promise<T | null>;
  set<T>(key: ExploreCacheKey, value: T, ttlSeconds: number): Promise<void>;
}

export interface ExploreServiceDeps {
  eventbrite:    EventbriteClient;
  googlePlaces:  GooglePlacesClient;
  cache:         ExploreCachePort;    // Phase B provides the real impl; Phase A ships a NoopCache fallback for dev-only
  cities:        ExploreCity[];       // read from EXPLORE_PREWARM_CITIES at boot
  ttlSeconds:    number;              // env: EXPLORE_CACHE_TTL_SECONDS
  featuredHook?: (raw: ExploreFeed) => Promise<ExploreFeed>;  // Phase C plugs in here; Phase A defaults to identity
}

export class ExploreService {
  constructor(private deps: ExploreServiceDeps);
  fetchEvents(params: { city: string; categoryId?: string; startDate?: string; endDate?: string; limit: number; cursor: string | null; }): Promise<ExploreEventsPage>;
  fetchPlaces(params: { lat: number; lng: number; radiusMeters: number; includedTypes: string[]; limit: number }): Promise<ExplorePlacesPage>;
  fetchCities(): ExploreCity[];
  fetchFeed(params: { city: string; limit: number }): Promise<ExploreFeed>;
}
```

`fetchFeed` is the cache-most-important path — it fans out to `fetchEvents` and `fetchPlaces`, merges, runs the optional `featuredHook` to mark Featured items (Phase C), tags the response with `servedFrom: 'cache' | 'live'` and a `cachedAt` timestamp, and returns. The cache key for `feed` is one composite key — never store `feed` as a derived view of cached sub-keys.

### `NoopCachePort` (Phase A ships this)

So Phase A can run end-to-end before Phase B lands:

```ts
export class NoopCachePort implements ExploreCachePort {
  async get() { return null; }
  async set() { /* no-op */ }
}
```

`src/app.ts` wires `ExploreService` with `NoopCachePort` during Phase A. Phase B swaps in the real Redis-backed implementation.

### Pagination

Eventbrite uses continuation tokens; expose them through `nextCursor` opaquely. Mobile sends back the same opaque string. NEVER expose the upstream pagination format.

Places New does not natively paginate the nearby-search endpoint — for Phase A, return up to `limit` and stop. Document this asymmetry in HANDOFF.

## Controller Specification (`src/controllers/explore.controller.ts`)

Standard pattern — read `EVENTS_HANDOFF.md` for the reference shape. Zod validate query params, call the service, map service errors to HTTP:

| Error class | HTTP status |
|---|---|
| `ZodError` (validation) | 400 |
| `EventbriteRateLimitError` / `GooglePlacesQuotaError` | 502 (upstream rate limit — NOT 429; our 429 is reserved for our own rate limit) |
| `EventbriteAuthError` / `GooglePlacesAuthError` | 502 (mis-configured key — alert in logs) |
| `EventbriteUpstreamError` / `GooglePlacesUpstreamError` | 502 |
| Anything unexpected | 500 |

Log every 502 with the upstream status, the request URL with the API key redacted, and `request.user.id`. The Cron worker (Phase C) reads these log lines to track upstream health.

## Domain Error Classes (in service)

```ts
ExploreInvalidQueryError      // 400 — controller catches and returns Zod issue list
ExploreUpstreamError          // 502 — wraps client errors above
ExploreCityNotFoundError      // 400 — caller passed a city not in EXPLORE_PREWARM_CITIES
```

## What NOT to Build in Phase A

- The Redis cache implementation — Phase B
- The per-user rate-limit preHandler — Phase B
- The cron pre-warm worker — Phase C
- The Featured listings logic itself — only the `featuredHook` injection slot. Phase C provides the implementation.
- Any GCP billing IaC — Phase C
- Any change to existing domain routes (events, friends, groups) or their schemas
- A direct mobile-side SDK — that's the mobile API agent's job; Phase A only exposes the HTTP routes

## Phase A Handoff Document

Write `src/routes/EXPLORE_GATEWAY_HANDOFF.md`:

1. **What was built** — files table, endpoints table
2. **Unified response shapes** — repeat the `ExploreEvent` / `ExplorePlace` / `ExploreFeed` interfaces verbatim so Phase B + C have a single source of truth
3. **Extension points** — exact names of: `ExploreCachePort`, `ExploreCacheKey`, `exploreCacheKeyToString`, `ExploreRouteScope`, `ExploreServiceDeps.featuredHook`, `NoopCachePort`
4. **Eventbrite endpoint chosen** — which `/destination/events/` or `/events/search/` variant, and the API version observed at build time
5. **Places New field mask** — exact mask string used (so Phase C can verify billing line items)
6. **Pagination asymmetry** — note that Eventbrite paginates and Places does not
7. **Open items for Phase B** — confirm the `EXPLORE_CACHE_TTL_SECONDS` default of 900 is what was actually plumbed; confirm `app.ts` wires `NoopCachePort` so Phase B knows what to swap
8. **Open items for Phase C** — confirm `featuredHook` defaults to identity; document the `cachedAt` field shape so the pre-warmer knows what to overwrite

## Phase A Final Checklist

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] `/explore/events`, `/explore/places`, `/explore/cities`, `/explore/feed` all registered and behind auth
- [ ] Zod validates BOTH the inbound query params AND the outbound upstream response bodies
- [ ] Mobile never sees raw Eventbrite or Places JSON — only the unified shapes
- [ ] `NoopCachePort` is wired in `src/app.ts` so the gateway runs end-to-end without Phase B
- [ ] All upstream errors collapse to typed classes; controller maps them to HTTP per the table
- [ ] `EXPLORE_GATEWAY_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for EXPLORE Gateway → `COMPLETE (date)`

---

# PHASE B — EXPLORE Cache + Rate-Limit

> **You are the Backend / EXPLORE Cache + Rate-Limit sub-agent.** Read the Shared Context, Non-Negotiable Contracts, and Env Var Coordination Table sections above. Then execute this phase exactly. Phase A's existing on-disk surface (NOT the Phase A section of this prompt — that section is SUPERSEDED, see the PARTIAL SUPERSESSION header at the top of this file) is your source of truth for the cache + rate-limit contracts to implement.
>
> **REDESIGNED 2026-05-23 to fit the actual Phase A on-disk types.** The original Phase B section assumed an `ExploreCachePort` interface that lived in the now-deleted `src/clients/_types.ts` plus a `feed | events | places` discriminated cache key with city-based / lat-lng / type-list shapes. That model was abandoned; the shipped service uses `ExploreCategory` / `ExploreSource` / `ExploreVenue` from `src/types/explore.types.ts` and a `feed | detail` cache keyed by bucketed `(lat, lng, category)` for feed and `id` for detail. This section is rewritten to match what is actually on disk.

## What's already on disk (Phase A)

You are NOT building from a blank slate. Read these before writing code:

- `src/types/explore.types.ts` — `ExploreCategory`, `ExploreSource`, `ExploreVenue`. **The canonical Explore types.** Do not introduce parallel `ExploreEvent` / `ExplorePlace` / `ExploreFeed` types.
- `src/services/explore.service.ts` — the existing `exploreService` const object (NOT a class). Cache reads/writes are currently INLINE via `safeRedisGet` / `safeRedisSet` helpers at the bottom of the file. Returns `ExploreFeedPage = { venues: ExploreVenue[], nextCursor: number | null }`. Has two cache keys today:
  - `explore:feed:{bucketedLat}:{bucketedLng}:{category}` — TTL `600` s (10 min)
  - `explore:detail:{id}` — TTL `1800` s (30 min)
  - GPS bucketing: lat/lng rounded to 2 decimals (~1.1 km), aligned with the mobile client's own bucketing in `social-calendar-mobile/src/api/explore.ts`.
- `src/services/eventbrite.client.ts` + `src/services/googlePlaces.client.ts` — clients live alongside the service, NOT in `src/clients/`. Do not move them.
- `src/middleware/exploreRateLimit.ts` — the existing preHandler. Already wired in `src/routes/explore.routes.ts` as `preHandler: [exploreRateLimit]` on `GET /feed`. The LEAD_MANAGER row 302 line "(d) not registered as a preHandler" was incorrect — the middleware IS wired; only the deviations listed below remain.
- `src/config/env.ts` — already declares `EXPLORE_RATE_LIMIT` (currently default 30 — spec wants 20) and `EXPLORE_RADIUS_METRES`. Does NOT yet declare `EXPLORE_CACHE_TTL_SECONDS` or `EXPLORE_RATE_LIMIT_BURST`.

## Goal

Three narrow deliverables — all match the shipped Phase A model:

1. **Extract the inline cache calls** out of `explore.service.ts` into a typed module at `src/services/exploreCache.ts`. Service stops calling `safeRedisGet`/`safeRedisSet` directly; instead calls `exploreCache.getFeed / setFeed / getDetail / setDetail`. Redis failures stay non-fatal (the service's existing fail-open behaviour is correct — preserve it).
2. **Fix the rate-limit deviations** in `src/middleware/exploreRateLimit.ts`:
   - Default limit `20` req/hr (down from 30) — change `EXPLORE_RATE_LIMIT` default in `env.ts`.
   - Add a `5` req / 60-sec burst sub-budget inside the hourly window.
   - Emit `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on every `/feed` response (both allowed and denied).
   - Preserve the existing `Retry-After` header and fail-open Redis-error behaviour.
3. **No new wiring** — the middleware is already attached to `/feed` in `explore.routes.ts`. Cache extraction is a pure refactor that does not change `app.ts` or routes.

## Files to Create / Modify

```
src/services/exploreCache.ts                           ← CREATE (typed cache module)
src/services/explore.service.ts                        ← MODIFY (replace inline cache helpers with module calls; keep fail-open semantics)
src/middleware/exploreRateLimit.ts                     ← MODIFY (add burst budget + X-RateLimit headers)
src/config/env.ts                                      ← MODIFY (lower EXPLORE_RATE_LIMIT default to 20; add EXPLORE_RATE_LIMIT_BURST default 5; add EXPLORE_CACHE_TTL_SECONDS default 600)
src/middleware/EXPLORE_CACHE_RATELIMIT_HANDOFF.md      ← CREATE (write last)
```

Do NOT modify:
- `src/types/explore.types.ts` (the type contract is locked by Phase A)
- `src/services/eventbrite.client.ts` / `googlePlaces.client.ts`
- `src/controllers/explore.controller.ts`
- `src/routes/explore.routes.ts` (the preHandler is already attached)
- `src/app.ts`

## `src/services/exploreCache.ts`

A typed wrapper around `redis` that mirrors the cache keys the service already uses. Discriminated key union keeps callsites strict; the module owns the serialization rules.

```ts
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import type { ExploreCategory, ExploreVenue } from '../types/explore.types.js';
import type { ExploreFeedPage } from './explore.service.js'; // or hoist the type here

/**
 * Discriminated cache key. The serializer in `cacheKeyToString` produces the
 * SAME Redis keys the previous inline implementation used, so an in-place
 * refactor does not cold-start the cache:
 *   explore:feed:{lat2}:{lng2}:{category}   (feed-page payload, TTL 600s)
 *   explore:detail:{id}                      (single venue payload, TTL 1800s)
 */
export type ExploreCacheKey =
  | { kind: 'feed'; lat: number; lng: number; category: ExploreCategory }
  | { kind: 'detail'; id: string };

export const EXPLORE_FEED_TTL = 600;     // seconds — matches mobile staleTime
export const EXPLORE_DETAIL_TTL = 1800;  // seconds — matches mobile detail staleTime

/** Round to 2 dp — ~1.1 km bucketing. Matches mobile-side bucketing. */
function bucket(v: number): number {
  return Math.round(v * 100) / 100;
}

export function cacheKeyToString(key: ExploreCacheKey): string {
  switch (key.kind) {
    case 'feed':
      return `explore:feed:${bucket(key.lat)}:${bucket(key.lng)}:${key.category}`;
    case 'detail':
      return `explore:detail:${key.id}`;
  }
}

// ── Fail-open helpers (preserve existing service behaviour) ───────────────

async function safeGet(key: string): Promise<string | null> {
  try { return await redis.get(key); } catch { return null; }
}

async function safeSet(key: string, value: string, ttl: number): Promise<void> {
  try { await redis.set(key, value, 'EX', ttl); } catch { /* fail-open */ }
}

// ── Public surface ─────────────────────────────────────────────────────────

export const exploreCache = {
  async getFeed(lat: number, lng: number, category: ExploreCategory): Promise<ExploreVenue[] | null> {
    const raw = await safeGet(cacheKeyToString({ kind: 'feed', lat, lng, category }));
    if (!raw) return null;
    try { return JSON.parse(raw) as ExploreVenue[]; } catch { return null; }
  },

  async setFeed(lat: number, lng: number, category: ExploreCategory, venues: ExploreVenue[]): Promise<void> {
    const ttl = env.EXPLORE_CACHE_TTL_SECONDS ?? EXPLORE_FEED_TTL;
    await safeSet(cacheKeyToString({ kind: 'feed', lat, lng, category }), JSON.stringify(venues), ttl);
  },

  async getDetail(id: string): Promise<ExploreVenue | null> {
    const raw = await safeGet(cacheKeyToString({ kind: 'detail', id }));
    if (!raw) return null;
    try { return JSON.parse(raw) as ExploreVenue; } catch { return null; }
  },

  async setDetail(id: string, venue: ExploreVenue): Promise<void> {
    await safeSet(cacheKeyToString({ kind: 'detail', id }), JSON.stringify(venue), EXPLORE_DETAIL_TTL);
  },
};
```

**Critical invariants — do not deviate:**

- The serialized keys MUST match the existing inline keys verbatim (`explore:feed:{lat2}:{lng2}:{category}` and `explore:detail:{id}`). A key-shape change cold-starts the cache and burns upstream budget unnecessarily.
- The TTL contract stays as-is: feed=600s, detail=1800s. The original (superseded) prompt mandated a 600–900s range — ignore that range, it was tied to the abandoned city-based model. `EXPLORE_CACHE_TTL_SECONDS` becomes an env override on the feed TTL only (detail stays hardcoded at 1800s — long-tail single-venue lookups don't need tuning).
- Redis errors stay non-fatal. The service must keep returning live results when Redis is down.

## `src/services/explore.service.ts` — refactor

Replace the inline `safeRedisGet` / `safeRedisSet` helpers and the `feedKey` / `detailKey` helpers with calls into `exploreCache`. The control flow stays identical:

```ts
// BEFORE
const cached = await safeRedisGet(cacheKey);
if (cached) {
  const all = JSON.parse(cached) as ExploreVenue[];
  return paginate(all, cursor);
}
// ... live fetch + merge ...
await safeRedisSet(cacheKey, JSON.stringify(merged), FEED_TTL);

// AFTER
const cached = await exploreCache.getFeed(lat, lng, category);
if (cached) return paginate(cached, cursor);
// ... live fetch + merge ...
await exploreCache.setFeed(lat, lng, category, merged);
```

Remove the now-dead `FEED_TTL`, `DETAIL_TTL`, `bucket`, `feedKey`, `detailKey`, `safeRedisGet`, `safeRedisSet` from `explore.service.ts`. They live in `exploreCache.ts` now. Keep `PAGE_SIZE`, `byDistance`, `dedup`, `paginate`, and `ExploreFeedPage` in the service.

Do the same for `getDetail` — replace inline cache reads/writes with `exploreCache.getDetail(id)` / `exploreCache.setDetail(id, venue)`. The "check the 'all' feed cache as a second-level lookup" step (current step 2) should now call `exploreCache.getFeed(lat, lng, 'all')`.

## `src/middleware/exploreRateLimit.ts` — additions

The existing fixed-window hourly counter stays. Add a parallel 60-second burst counter and the three `X-RateLimit-*` headers. The existing fail-open behaviour on Redis errors is correct — preserve it.

```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const HOUR_WINDOW_SECONDS = 3_600;
const BURST_WINDOW_SECONDS = 60;

const hourKey  = (uid: string) => `explore:rate:${uid}:hour`;
const burstKey = (uid: string) => `explore:rate:${uid}:burst`;

async function incrWithTtl(key: string, ttl: number): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttl);
  return count;
}

export async function exploreRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.user.id;
  const limit  = env.EXPLORE_RATE_LIMIT;        // default 20
  const burst  = env.EXPLORE_RATE_LIMIT_BURST;  // default 5

  let hourCount: number;
  let burstCount: number;
  try {
    [hourCount, burstCount] = await Promise.all([
      incrWithTtl(hourKey(userId),  HOUR_WINDOW_SECONDS),
      incrWithTtl(burstKey(userId), BURST_WINDOW_SECONDS),
    ]);
  } catch (err) {
    request.log.warn({ err }, 'exploreRateLimit: Redis error — passing through');
    return; // fail-open
  }

  // Always emit rate-limit headers (even on allowed responses) so clients can
  // self-throttle. Reset is unix seconds at which the hour bucket refills.
  let hourTtl = HOUR_WINDOW_SECONDS;
  try {
    const r = await redis.ttl(hourKey(userId));
    if (r > 0) hourTtl = r;
  } catch { /* best-effort */ }
  const resetsAt = Math.floor(Date.now() / 1000) + hourTtl;

  reply.header('X-RateLimit-Limit', String(limit));
  reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - hourCount)));
  reply.header('X-RateLimit-Reset', String(resetsAt));

  // Burst quota deny — short Retry-After (≤60s)
  if (burstCount > burst) {
    return reply
      .code(429)
      .header('Retry-After', String(BURST_WINDOW_SECONDS))
      .send({
        error: 'Explore burst limit exceeded',
        reason: 'burst_quota',
        retryAfterSeconds: BURST_WINDOW_SECONDS,
        limit: burst,
      });
  }

  // Hour quota deny — long Retry-After (= remaining hour TTL)
  if (hourCount > limit) {
    return reply
      .code(429)
      .header('Retry-After', String(hourTtl))
      .send({
        error: 'Explore rate limit exceeded',
        reason: 'hour_quota',
        retryAfterSeconds: hourTtl,
        limit,
      });
  }
}
```

Two failure modes are different on purpose:
- **Hour quota exceeded** → `reason: 'hour_quota'`, long `Retry-After` (up to 1 hour).
- **Burst quota exceeded** → `reason: 'burst_quota'`, short `Retry-After` (≤60 seconds).

Mobile can show different UI: "Try again in a minute" vs. "Try again in an hour".

## `src/config/env.ts` — modifications

Lower `EXPLORE_RATE_LIMIT` default to `20`. Add two new fields. Preserve existing fields and order — surgical edit only.

```ts
// Per-user feed rate limit (requests / hour). Default 20 (lowered from 30 to match Decision spec).
EXPLORE_RATE_LIMIT: z.coerce.number().int().positive().default(20),

// Burst allowance inside the hourly window (requests / 60 s). Default 5.
EXPLORE_RATE_LIMIT_BURST: z.coerce.number().int().positive().default(5),

// Explore feed cache TTL (seconds). Default 600 (10 min) — matches mobile staleTime.
EXPLORE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
```

## What NOT to Build in Phase B

- Pre-warming logic — Phase C.
- Featured-listings logic — Phase C. (The slot in `explore.service.ts`'s feed merge — `const featuredVenues: ExploreVenue[] = []` — stays empty in Phase B.)
- A new key-versioning prefix (`explore:v1:` etc.) — the existing keys already work and are aligned with mobile. Changing the prefix cold-starts the cache.
- A user-facing endpoint to inspect a user's current rate-limit usage — out of scope; defer.
- An in-process LRU on top of Redis — premature; flag if you think it's needed.
- A dependency-injection refactor of `exploreService` into a class with a constructor — the existing const-object pattern is the convention in this codebase (matches `eventsService`, `friendsService`, `groupsService`). Stay consistent.
- Any change to `ExploreCategory` / `ExploreSource` / `ExploreVenue` — the type contract is locked.
- Any change to `app.ts` or `explore.routes.ts` — wiring is complete.

## Phase B Handoff Document

Write `src/middleware/EXPLORE_CACHE_RATELIMIT_HANDOFF.md`:

1. **What was built** — files table (new `src/services/exploreCache.ts`, modified service + middleware + env).
2. **Cache module surface** — `exploreCache.getFeed / setFeed / getDetail / setDetail`. Repeat the discriminated key shape so future agents see it at a glance.
3. **Cache key continuity** — confirm the serialized keys (`explore:feed:{lat2}:{lng2}:{category}`, `explore:detail:{id}`) match the previous inline keys byte-for-byte. This is the no-cold-start guarantee.
4. **TTL contract** — feed TTL is `env.EXPLORE_CACHE_TTL_SECONDS` (default 600, override-able). Detail TTL is hardcoded `1800`. Note that the originally-spec'd 600–900 range was for the abandoned city-based model and no longer applies; flag this divergence for the Lead Manager.
5. **Service refactor** — confirm `safeRedisGet` / `safeRedisSet` / `feedKey` / `detailKey` are removed from `explore.service.ts`; control flow and fail-open semantics preserved.
6. **Rate limit semantics** — quota table: `EXPLORE_RATE_LIMIT=20/hr`, `EXPLORE_RATE_LIMIT_BURST=5/60s`. Scope is `/feed` only — `/explore/:id` (detail) remains unthrottled (cache hit rate ≥95%, low volume).
7. **Headers emitted** — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on every `/feed` response; `Retry-After` on 429.
8. **429 payload shape** — both deny reasons share `{ error, reason, retryAfterSeconds, limit }`; mobile branches on `reason`.
9. **Atomicity choice** — `INCR` followed by conditional `EXPIRE` on first hit. Document the well-known race window: a request landing immediately after key expiry but before the next `EXPIRE` lands could see one over-count. Acceptable for a rate-limit bucket; never an outage.
10. **Fail-open behaviour** — confirm both the cache module and the middleware pass through on Redis errors. Availability over enforcement.
11. **Open items for Phase C** — pre-warmer should call `exploreService.getFeed(lat, lng, category, 0)` so writes flow through `exploreCache.setFeed` with the same key schema. No separate write path.

## Phase B Final Checklist

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] `src/services/exploreCache.ts` exists and is the ONLY module that calls `redis.get` / `redis.set` for Explore cache reads/writes
- [ ] `cacheKeyToString` produces the SAME Redis keys as the previous inline `feedKey`/`detailKey` — verified by grep or by side-by-side comparison
- [ ] `explore.service.ts` no longer contains `safeRedisGet`, `safeRedisSet`, `feedKey`, `detailKey`, or any direct `redis.*` call
- [ ] `EXPLORE_RATE_LIMIT` default is `20` in `env.ts`
- [ ] `EXPLORE_RATE_LIMIT_BURST` declared with default `5`
- [ ] `EXPLORE_CACHE_TTL_SECONDS` declared with default `600`
- [ ] `/explore/feed` returns 429 with `Retry-After` and `reason` (`hour_quota` or `burst_quota`) on quota exceed
- [ ] `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers present on every `/explore/feed` response (allowed AND denied)
- [ ] Redis errors do not break the request — both cache and rate-limit fail open
- [ ] `ExploreCategory` / `ExploreSource` / `ExploreVenue` unchanged
- [ ] `src/app.ts` and `src/routes/explore.routes.ts` unchanged
- [ ] `EXPLORE_CACHE_RATELIMIT_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for EXPLORE Cache + Rate-Limit → `COMPLETE (date)`

---

# PHASE C — EXPLORE Cron + Billing + Featured Hook

> **You are the Backend / EXPLORE Cron + Billing sub-agent.** Read the Shared Context, Non-Negotiable Contracts, and Env Var Coordination Table sections above. Phases A and B are complete — their HANDOFF files are your source of truth.

## Goal

Three small deliverables, each independent:

1. A pre-warmer worker that, on a cron schedule, calls `ExploreService.fetchFeed(...)` for every city in `EXPLORE_PREWARM_CITIES` so cache is always warm on user request.
2. Google Cloud billing alerts at $25 / $50 / $100 (notify only — never auto-shutdown). Delivered as Terraform IaC plus a manual `gcloud` fallback README.
3. The Featured-listings hook stub — a function injected into `ExploreService.featuredHook` that today is a no-op identity function and will later (B2B revenue layer, separate agent) be wired to a database-backed Featured table.

## Files to Create

```
src/workers/explorePrewarm.worker.ts
src/workers/exploreFeatured.hook.ts
src/infra/gcp-billing-alerts.tf
src/infra/gcp-billing-alerts.README.md
src/workers/EXPLORE_CRON_BILLING_HANDOFF.md     ← write last
```

Add the Phase C env block to `src/config/env.ts`. Modify `src/server.ts` (only) to start the worker after `app.listen()` in production:

```ts
if (env.NODE_ENV === 'production') {
  startExplorePrewarmWorker(exploreService);
}
```

Wire `exploreFeatured.hook.ts` into `app.ts`'s `ExploreService` construction as the `featuredHook`.

## `src/workers/explorePrewarm.worker.ts`

Cron-driven pre-warming. Use `node-cron` (lightweight, no Redis dep beyond what we already have) — install if absent:

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

Public surface:

```ts
import cron from 'node-cron';
import { env } from '../config/env.js';
import type { ExploreService } from '../services/explore.service.js';

export function startExplorePrewarmWorker(service: ExploreService) {
  if (!cron.validate(env.EXPLORE_PREWARM_CRON)) {
    throw new Error(`Invalid EXPLORE_PREWARM_CRON: ${env.EXPLORE_PREWARM_CRON}`);
  }

  const task = cron.schedule(env.EXPLORE_PREWARM_CRON, async () => {
    const startedAt = Date.now();
    const cities = service.fetchCities();
    let ok = 0, failed = 0;

    for (const city of cities) {
      try {
        // Pre-warm BOTH the feed cache and the underlying events cache.
        // Limit matches the typical mobile request — keeps cache keys aligned.
        await service.fetchFeed({ city: city.id, limit: 20 });
        ok++;
      } catch (err) {
        failed++;
        // structured log — no PII, log upstream message and city id
        console.error('[explore-prewarm] city failed', { cityId: city.id, err: String(err) });
      }
    }
    console.log('[explore-prewarm] complete', { ms: Date.now() - startedAt, ok, failed });
  });

  task.start();
  return task;
}

export function stopExplorePrewarmWorker(task: ReturnType<typeof cron.schedule>) {
  task.stop();
}
```

**Required behaviour:**
- Cron expression MUST yield a runtime cadence ≤ the cache TTL. With TTL 900s (15min) and default cron `0 */2 * * *` (every 2 hours), cache will go cold between runs — that's intentional: pre-warm covers popular city queries; less-popular queries miss and pay the upstream cost. Document this tradeoff.
- Pre-warming uses the same `ExploreService` instance as request handlers, so it writes through to `RedisExploreCache` automatically.
- One city at a time, serialized — do not parallelize the upstream calls. Eventbrite + Places both have per-key QPS limits; serial pre-warm respects them.

## `src/workers/exploreFeatured.hook.ts`

The Featured-listings injection point. For now, identity:

```ts
import type { ExploreFeed } from '../clients/_types.js';

/**
 * Featured-listings hook.
 *
 * Stub for the future B2B revenue layer:
 *   Featured listings are paid placements (events or places) that surface
 *   at the top of the Explore feed for a city. Tracked in a Featured table
 *   created by a separate agent.
 *
 * Today: identity. Returns the feed unchanged.
 *
 * When the Featured agent ships, this hook will:
 *   1. Query the `Featured` table for the city + current time window.
 *   2. Mark matching ExploreEvent / ExplorePlace items with `isFeatured: true`.
 *   3. Reorder so featured items appear first (preserving relative order within featured/non-featured).
 *   4. Log an impression event per featured item shown.
 *
 * Do NOT extend this stub. Hook is intentionally minimal so the Featured
 * agent owns the full implementation.
 */
export async function exploreFeaturedHook(feed: ExploreFeed): Promise<ExploreFeed> {
  return feed;
}
```

Wire into `src/app.ts`:

```ts
import { exploreFeaturedHook } from './workers/exploreFeatured.hook.js';
// ...
const exploreService = new ExploreService({
  ...deps,
  cache: exploreCache,
  featuredHook: exploreFeaturedHook,
});
```

## `src/infra/gcp-billing-alerts.tf`

Terraform definitions for three billing budget alerts on the GCP billing account that hosts the Google Places API key.

```hcl
# GCP Billing Alerts for EXPLORE (Google Places API consumption)
#
# Three thresholds: $25, $50, $100 monthly spend.
# All three NOTIFY ONLY — they never auto-disable the project or revoke the key.
# Christian wires the SNS / Pub/Sub topic to email or Slack out-of-band.
#
# Apply manually from social-calendar-api/src/infra/ when GCP credentials are available:
#   terraform init
#   terraform apply -var="billing_account_id=$GCP_BILLING_ACCOUNT_ID" \
#                   -var="project_id=$GCP_PROJECT_ID"

variable "billing_account_id" {
  description = "GCP billing account ID hosting the Places API key"
  type        = string
}

variable "project_id" {
  description = "GCP project ID for the Places API key"
  type        = string
}

variable "notification_channel_ids" {
  description = "Notification channels (email / pubsub) to receive alerts. Configure separately."
  type        = list(string)
  default     = []
}

locals {
  thresholds_usd = [25, 50, 100]
}

resource "google_billing_budget" "explore_places" {
  for_each       = toset([for t in local.thresholds_usd : tostring(t)])
  billing_account = var.billing_account_id
  display_name    = "EXPLORE Places - $${each.value} alert"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    services = ["services/places.googleapis.com"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = each.value
    }
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = var.notification_channel_ids
    disable_default_iam_recipients   = false
  }
}
```

## `src/infra/gcp-billing-alerts.README.md`

Manual `gcloud` fallback for environments without Terraform:

```markdown
# GCP Billing Alerts — Manual gcloud Fallback

Apply this if Terraform isn't available in the deploy environment. Configures
three Places API spend alerts at $25 / $50 / $100 with notify-only behaviour.

## Prerequisites

- `gcloud` authenticated with billing-account-admin role
- `BILLING_ACCOUNT_ID`, `PROJECT_ID`, and a notification channel set up via the Cloud Console

## Apply

[gcloud commands here — Phase C agent writes the actual gcloud calls based on the official `gcloud billing budgets create` docs at execution time. Do not hardcode flags that may have changed; verify against `gcloud beta billing budgets --help` before authoring]

## Verify

```
gcloud billing budgets list --billing-account=$BILLING_ACCOUNT_ID
```

Expect three budgets named `EXPLORE Places - $25 alert`, `EXPLORE Places - $50 alert`, `EXPLORE Places - $100 alert`.

## Never

- Never set `auto_disable_on_threshold: true` — these alerts NOTIFY only. An auto-disable would take Explore offline and is not what we want.
- Never include Eventbrite in this budget filter — Eventbrite bills separately (its own dashboard at eventbrite.com), not through GCP.
```

## What NOT to Build in Phase C

- The Featured-listings backend itself — a separate agent owns that table, the admin endpoints to manage paid placements, and the impression logging
- A web admin UI for managing pre-warm cities — defer to a future Internal Admin agent
- An Eventbrite billing alert — Eventbrite isn't on GCP; its quota lives in the Eventbrite dashboard. Add a note in HANDOFF.
- Distributed-cron infrastructure (BullMQ, Temporal, etc.) — `node-cron` is sufficient at this scale. Flag if traffic ever requires it.
- Any change to Phase A or Phase B files beyond the documented wire-up points (one line in `app.ts` for `featuredHook`, one line in `server.ts` for `startExplorePrewarmWorker`).

## Phase C Handoff Document

Write `src/workers/EXPLORE_CRON_BILLING_HANDOFF.md`:

1. **What was built** — files table
2. **Cron cadence** — exact cron expression, expected runs per day, pre-warmed cities list
3. **Cache writeback path** — confirm pre-warm writes go through `ExploreService.fetchFeed → RedisExploreCache.set` with the same key schema Phase B documented
4. **Featured hook** — confirm it's identity for now; document the future contract precisely so the Featured agent can implement against it
5. **GCP billing alerts** — confirm three thresholds ($25 / $50 / $100), notify-only, Places-only filter; note that Eventbrite billing is out-of-scope and must be tracked separately
6. **Manual fallback** — confirm the README exists for environments without Terraform
7. **Open items** — Eventbrite billing alerting story; future Featured agent dependency; observability (do we want a Prometheus metric for cache hit rate from `servedFrom`?)

## Phase C Final Checklist

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] `node-cron` installed; `EXPLORE_PREWARM_CRON` validated at boot
- [ ] Worker starts only in `NODE_ENV === 'production'` (do NOT pre-warm in dev/test — burns budget)
- [ ] Pre-warmer serializes per-city upstream calls (no parallel hammer of Eventbrite/Places)
- [ ] `exploreFeaturedHook` is identity and wired into `ExploreService`
- [ ] Terraform file present with three thresholds, notify-only, Places-only filter
- [ ] README documents the manual gcloud fallback
- [ ] No auto-disable behaviour anywhere — alerts notify only
- [ ] `EXPLORE_CRON_BILLING_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for EXPLORE Cron + Billing → `COMPLETE (date)`

---

## Coordinator Final Verification

Once all three phases COMPLETE, the Coordinator (or Lead Manager) verifies the integrated outcome:

- [ ] `curl -H 'Authorization: Bearer …' http://localhost:3000/explore/feed?city=nyc` returns a populated feed
- [ ] Repeated identical requests within 15min show `servedFrom: 'cache'` after the first
- [ ] 21st call within an hour returns HTTP 429 with `Retry-After`
- [ ] Cron worker logs `[explore-prewarm] complete` every 2 hours in production
- [ ] Terraform `plan` produces three budget resources (no apply required in dev)
- [ ] `tsc --noEmit` passes in `social-calendar-api/` end-to-end
- [ ] All three HANDOFF.md files exist and cross-reference correctly
- [ ] `LEAD_MANAGER.md` Progress Tracker rows for all three EXPLORE sub-agents → `COMPLETE (date)`

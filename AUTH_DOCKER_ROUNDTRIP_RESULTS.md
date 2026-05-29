# AUTH_DOCKER_ROUNDTRIP_RESULTS

**Date:** 2026-05-29  
**Commit:** `5f30e3a` — fix(rls): resolve INSERT...RETURNING snapshot isolation bug for Event and SocialGroup creation  
**Branch:** main

---

## Summary

All 7 validation steps completed. The RLS INSERT…RETURNING fix is confirmed working
end-to-end in the live Docker stack.

---

## Step Results

### Step 1 — Stack health ✅

```
syncup-api-1       Up (port 3000)
syncup-postgres-1  Up, healthy (port 5432)
syncup-redis-1     Up, healthy (port 6379)
```

### Step 2 — GET /health ✅

```
HTTP 200
{"status":"ok"}
```

### Step 3 — Clerk JWT round-trip ✅

Auth obtained by creating a server-side session via `POST /v1/sessions` (Clerk BAPI),
then minting a JWT with `POST /v1/sessions/{id}/tokens`.

| Endpoint | Method | Result |
|---|---|---|
| `/events` | GET | 200 |
| `/friends` | GET | 200 |
| `/groups` | GET | 200 |
| `/events` | **POST** | **201** — RLS fix confirmed (was 500/42501 before) |
| `/groups` | **POST** | **201** — RLS fix confirmed (was 500/42501 before) |
| `/availability/me` | GET | 404 — route not implemented yet (expected) |

No-token → `401 "Missing or malformed Authorization header"`  
Invalid token → `401 "Invalid or expired token"`

### Step 4 — Explore cache / Redis TTL ✅

Two requests to `GET /explore/feed?lat=40.7128&lng=-74.0060` both returned 200.

Redis key after two requests:
```
explore:feed:40.71:-74.01:all   TTL: 586s  (≈ 600s EXPLORE_CACHE_TTL_SECONDS default)
```

Cache is written and TTL is correct.

### Step 5 — Rate-limit (429 at burst > 5 req/60s) ✅

Burst limit = 5 req/60s (`EXPLORE_RATE_LIMIT_BURST` default). Counter was at 2 from
Step 4. Sent 8 more requests:

```
Request 1 → 200
Request 2 → 200
Request 3 → 200
Request 4 → 429  ← burst counter hit 6, exceeds limit of 5
Request 5 → 429
Request 6 → 429
Request 7 → 429
Request 8 → 429
```

429 response body: `{"error":"Explore burst limit exceeded","reason":"burst_quota","retryAfterSeconds":60,"limit":5}`

### Step 6 — npm test ✅

```
Test Suites: 4 passed, 4 total
Tests:       8 todo, 19 passed, 27 total
Time:        ~0.8 s
```

All 4 suites (health, events, friends, groups) pass. The 8 `test.todo` entries are
pre-existing deferred items (invite endpoints, co-host management, EventException
handling) — none are regressions.

### Step 7 — Teardown ✅

Stack brought down and rebuilt cleanly. `docker-compose.yml` updated to forward
`CLOUDINARY_*` env vars (was missing; caused boot failure on first restart). Root
`.env` updated to include Cloudinary credentials alongside Clerk key.

---

## RLS Fix — What Was Resolved

**Root cause:** Prisma always appends `RETURNING` to `INSERT`. PostgreSQL evaluates the
`SELECT` policy as a `WITH CHECK` for `INSERT…RETURNING`. The original `SELECT` policies
for `Event`, `SocialGroup`, and `SocialGroupMember` delegated to `SECURITY DEFINER`
helper functions that do secondary `SELECT`s on the same table. Those secondary
`SELECT`s use a snapshot taken *before* the `INSERT` row entered the heap, so they
return `FALSE` and the insert is rejected with `42501`.

**Fix:** Inline a direct column comparison in the `USING` clause of each affected `SELECT`
policy instead of calling a helper that re-queries the table:

| Table | Policy | Fix |
|---|---|---|
| `Event` | `event_select_participant` | Inline `"creatorId" = current_app_user_id()` |
| `SocialGroup` | `socialgroup_select_member` | Add `creatorId` column; inline `"creatorId" = current_app_user_id()` |
| `SocialGroupMember` | `socialgroupmember_select_co_member` | Inline `"userId" = current_app_user_id()` |

Migrations:
- `20260529000001_fix_event_select_policy_insert_returning`
- `20260529000002_add_social_group_creator_id`

---

## Incidental Fix

`docker-compose.yml` was missing `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` in the `api.environment` block. The `env.ts` validator
requires all three at boot — the container crashed on restart until these were added.
Fix: added the three vars to `docker-compose.yml` (referenced from root `.env`).

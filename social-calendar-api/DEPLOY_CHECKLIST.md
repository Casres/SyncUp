# SyncUp API — Production Deploy Checklist

This document is the source of truth for getting the SyncUp API into production on Railway. It enumerates every gate that must clear before the first deploy and every step that must be repeated on subsequent deploys.

> **Intended audience:** Christian (Director). Every agent's infra work is finished; this checklist is the manual handoff.

> **Last reviewed:** 2026-05-04 (post Backend Cleanup + Friends + Groups + Socket.io + Jest + R7 design lock).

---

## What this deploy includes

| Area | Status |
|---|---|
| Auth (Clerk) — JWT verify, user upsert, RLS transaction wrapper | ✅ Live |
| Events domain (5 endpoints) | ✅ Live |
| Friends + Friend-groups domains (18 endpoints) | ✅ Live |
| Groups domain (20 endpoints) | ✅ Live |
| Socket.io real-time (12 events live + 3 stubbed `// TODO` for future) | ✅ Live |
| Health endpoint (`GET /health`) | ✅ Live |
| Dual Prisma client (RLS engaged via `DATABASE_URL_APP`) | ✅ Live |
| Jest + Supertest test suite (3 domains, `/health` sanity) | ✅ Live |
| Webhook handler (`POST /webhooks/clerk` with Svix signature verify) | ✅ Live |

**NOT in this deploy** (future work, all stubbed with `// TODO` markers):
- Event invite endpoints (`POST /events/:id/invites`, `PATCH /events/:id/invites/:inviteId`)
- Availability service (`UserAvailability` CRUD + cache-invalidation socket emit)
- Notifications service (push channel, R7-4/R7-5 rules ready)
- Cloudinary media uploads

---

## Before the FIRST deploy — one-time setup

### 1. Provision services on Railway

- [ ] Create a new Railway project named `syncup`.
- [ ] Add a **Postgres** plugin. Railway provisions one role with full privileges — that becomes the `syncup_migrate` role.
- [ ] Add a **Redis** plugin.
- [ ] Connect the Git repository. **Set the service root to `/` (monorepo root), NOT `social-calendar-api/`.**
  - **Why:** SyncUp is an npm workspace. The authoritative `package-lock.json` lives at the monorepo root and includes every transitive dependency for the API (`socket.io`, `ioredis`, `jest`, etc.). `npm ci` from a workspace child cannot resolve workspace deps, so Railway must build from the root. `railway.toml` lives at the monorepo root and tells Railway exactly what to do — `npm ci` then `npm --workspace=social-calendar-api run build`.
- [ ] Builder: leave as default **NIXPACKS** (matches `railway.toml`). The local `Dockerfile` is for `docker-compose` dev only — Railway will not use it.

### 2. Create the second Postgres role (`syncup_app`)

Railway provisions only the migration owner. We need a non-owner role for runtime so RLS engages on every per-request transaction. Run this once against the production Postgres instance via Railway's web console (Postgres plugin → Data tab → Query):

```sql
CREATE ROLE syncup_app LOGIN PASSWORD '<choose-a-strong-password>';

GRANT CONNECT ON DATABASE railway TO syncup_app;
GRANT USAGE   ON SCHEMA public    TO syncup_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO syncup_app;
GRANT USAGE,  SELECT                  ON ALL SEQUENCES IN SCHEMA public TO syncup_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO syncup_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE,  SELECT                  ON SEQUENCES TO syncup_app;
```

Run this **after** the first `prisma migrate deploy` so the tables already exist (otherwise the GRANTs grant on nothing). Order:
1. First deploy runs and applies `_init` + `_rls_policies` migrations.
2. Run the SQL above.
3. Restart the service so the runtime PrismaClient picks up `DATABASE_URL_APP` against a role that now has table privileges.

> Replace `railway` with the actual database name if Railway uses something different — check the Postgres plugin's `DATABASE_URL`.

The contract for these two roles is documented in `prisma/HANDOFF.md` and `src/BACKEND_CLEANUP_HANDOFF.md`.

### 3. **DELETE THE SEED FILE** (Decision #4 — hard requirement)

Per Lead Manager Decision #4, the local-dev seed file MUST be removed before any production deploy. This is a hard gate.

Run from the monorepo root:

```bash
rm social-calendar-api/prisma/seed.ts
```

Then edit `social-calendar-api/package.json`:

```diff
   "scripts": {
     "dev": "tsx watch --env-file=.env src/server.ts",
     "build": "tsc",
     "start": "node dist/server.js",
     "test": "jest",
     "test:watch": "jest --watch",
     "test:coverage": "jest --coverage",
     "prisma:generate": "prisma generate",
     "prisma:migrate": "prisma migrate dev",
-    "prisma:seed": "prisma db seed"
+
   },
-  "prisma": {
-    "seed": "tsx prisma/seed.ts"
-  },
   "dependencies": {
```

Commit:

```bash
git add social-calendar-api/package.json social-calendar-api/prisma/
git commit -m "chore(deploy): remove dev seed before prod deploy"
```

### 4. Set environment variables

In Railway → API service → Variables, set every value below. **The service refuses to boot if any required var is missing** (enforced by `src/config/env.ts` Zod schema).

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres plugin → `DATABASE_URL` (default Railway value) | Migration owner. Bypasses RLS. Used by `prisma migrate deploy` and the connect-time user lookup in auth + webhook. |
| `DATABASE_URL_APP` | Construct manually | Same host/port/db as `DATABASE_URL`, but with `syncup_app:<password>` instead of the Railway-provided role. The Fastify per-request transaction reads this. RLS applies. |
| `REDIS_URL` | Redis plugin → `REDIS_URL` | Used for presence tracking + future caching. |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys (production instance) | Backend SDK key. |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Endpoint → Signing Secret | After step 6. Svix signature verification for `/webhooks/clerk`. |
| `PORT` | `8080` (or whatever Railway exposes) | Railway sets this automatically; verify. |
| `NODE_ENV` | `production` | |

### 5. Configure Clerk webhooks

- [ ] In Clerk Dashboard → Webhooks → Add Endpoint.
- [ ] URL: `https://<api-host>/webhooks/clerk` (Railway provides the host after first deploy).
- [ ] Events: subscribe to `user.created` and `user.updated`.
- [ ] Copy the Signing Secret into the `CLERK_WEBHOOK_SECRET` variable from step 4.
- [ ] Send a test event from the Clerk Dashboard → confirm the API returns 200.

### 6. First deploy — bootstrap sequence

The order matters because `syncup_app` doesn't exist yet:

- [ ] Push the seed-removal commit to `main` (or trigger a manual deploy in Railway).
- [ ] **Deploy will fail at app boot** because `DATABASE_URL_APP` either isn't set or points at a role without table privileges. That's expected — keep going.
- [ ] Watch logs: confirm `prisma migrate deploy` ran successfully (`_init` + `_rls_policies` applied). The migrations created the tables.
- [ ] Now run the SQL from step 2 to create `syncup_app` and grant table privileges.
- [ ] Construct `DATABASE_URL_APP` and add it to Railway env vars (step 4).
- [ ] Trigger a redeploy (or just restart the service). This time boot should complete.
- [ ] Hit `https://<api-host>/health` — expect `200 { "status": "ok" }`.
- [ ] Run a smoke test: send a Clerk-authenticated request to `GET /events` (expect 200, empty array).

### 7. Post-first-deploy verification

- [ ] `GET /health` → 200
- [ ] Clerk webhook test event → 200
- [ ] Send a real Clerk JWT to `GET /events` → 200 + empty array (proves auth middleware + RLS transaction work)
- [ ] Check Railway logs for any "RLS policy violation" warnings during the first authenticated request — they should not appear

---

## Every subsequent deploy

- [ ] Confirm seed entries are still removed from `package.json`.
- [ ] Confirm `prisma/seed.ts` is still absent.
- [ ] Confirm `prisma/migrations/` contains all expected migrations.
- [ ] Push to `main`. Railway runs `buildCommand` then `startCommand`.
- [ ] Hit `/health` post-deploy.

---

## Required environment variables (full list)

```
DATABASE_URL=postgresql://syncup_migrate:...@<host>:5432/railway
DATABASE_URL_APP=postgresql://syncup_app:...@<host>:5432/railway
REDIS_URL=redis://...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
PORT=8080
NODE_ENV=production
```

---

## Resolved items (previously open)

| # | Item | Resolution |
|---|---|---|
| 1 | `/health` route did not exist | Added by Backend Cleanup agent (2026-05-04). `src/routes/health.routes.ts` registered before auth middleware. |
| 2 | `DATABASE_URL_APP` not yet read by the application | Resolved by Backend Cleanup agent (2026-05-04). Dual Prisma client (`prisma` for migration owner / `prismaApp` for app role) now wired; auth middleware's per-request `$transaction` runs on `prismaApp`. |
| 3 | Migrations bundled into Docker image | Documented as intended — `prisma migrate deploy` runs at boot. |
| 4 | Build artifact path mismatch (`tsc` was outputting `dist/src/server.js` but start commands referenced `dist/server.js`) | Fixed 2026-05-04. `tsconfig.json` `rootDir` set to `./src`; `prisma/seed.ts` excluded from tsc build (was being compiled into prod artifact, which violates the seed-deletion gate). Build now produces `dist/server.js` directly. |
| 5 | API workspace had a stale `package-lock.json` missing `socket.io`, `ioredis`, `jest`, `supertest` | Fixed 2026-05-04. Stale `social-calendar-api/package-lock.json` deleted; the root `package-lock.json` is now the single source of truth. Railway service root must be `/` so `npm ci` reads the root lockfile. |
| 6 | `railway.toml` lived inside `social-calendar-api/` (Railway wouldn't find it when service root = `/`) | Fixed 2026-05-04. Moved to monorepo root; build/start commands updated to use `npm --workspace=social-calendar-api ...` form. |

## Still-open items

| # | Item | Owner | Severity |
|---|---|---|---|
| 1 | No `lint` script — CI step is a no-op | Lead Manager / DevOps | Low (style enforcement only) |
| 2 | Cloudinary media uploads not wired | Backend / future agent | Medium (needed for cover art + avatars) |
| 3 | Push notifications not wired (R7-5 rule is ready for whoever wires it) | Backend / future agent | Medium (defers richer engagement) |
| 4 | Event invite endpoints stubbed only — Socket.io has `// TODO` emit sites waiting | Backend / future agent | Medium (invites depend on it; current event creation auto-organises creator only) |
| 5 | Availability service stubbed — Socket.io has `availability:updated` `// TODO` waiting | Backend / future agent | Medium (Step 2/3 of Create Event Flow consume the API stub today; needs real backend before swap-in) |

None of the still-open items block a staging deploy. Items 2–5 block "feature complete" but the app is functional without them.

---

## Production credentials Christian must supply

- Railway project ownership (or shared seat for whoever runs deploys)
- Postgres `syncup_app` password (chosen during step 2)
- Clerk production `CLERK_SECRET_KEY`
- Clerk webhook `CLERK_WEBHOOK_SECRET`

The Lead Manager / agents do not provision any of these.

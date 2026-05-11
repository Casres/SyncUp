# Backend — Cleanup Agent Handoff

**Agent:** Backend / Cleanup
**Completed:** 2026-05-04
**Per:** `LEAD_MANAGER.md` → Backend → Auth follow-up rows.

---

## What was changed

| File | Change |
|---|---|
| `src/routes/health.routes.ts` | **CREATED.** Exports `healthRoutes(app)` plugin that registers `GET /health` returning `{ status: 'ok' }` with HTTP 200. |
| `src/app.ts` | Replaced inline `app.get('/health', ...)` with `await app.register(healthRoutes)`. Registered before `webhooksRoutes` and `authPlugin` so the global preHandler does not run for it. Imports the new module. |
| `src/config/env.ts` | Added required Zod field `DATABASE_URL_APP: z.string().min(1)` directly after `DATABASE_URL`. Server still exits with non-zero on missing env. |
| `src/config/prisma.ts` | Split the single `PrismaClient` singleton into two named exports: `prisma` (uses `DATABASE_URL`, migration owner, RLS-bypassing) and `prismaApp` (uses `DATABASE_URL_APP`, restricted role, RLS-enforced). Both pass `datasources.db.url` explicitly and keep the env-aware `log` levels. |
| `src/middleware/auth.middleware.ts` | Imports both `prisma` and `prismaApp`. The pre-transaction user upsert in `resolveUser` still runs on `prisma` (chicken-and-egg: no `current_user_id` set yet — must bypass RLS). The per-request `$transaction(...)` now runs on `prismaApp` so `SET LOCAL app.current_user_id` and the subsequent `request.prismaTransaction` queries hit RLS-enforced policies. |

---

## Verification

- `npx tsc --noEmit` from `social-calendar-api/` exits with **zero errors and zero output**. Verified at handoff.
- `GET /health` is registered **before** the auth plugin in `src/app.ts` — the global `preHandler` never runs against it.
- `auth.middleware.ts` `SKIP_PREFIXES` already lists `/health` as belt-and-braces — no change needed.
- `grep -r "from.*config/prisma" src/ --include="*.ts"` returns only:
  - `src/middleware/auth.middleware.ts` — imports both `prisma` and `prismaApp` (correct).
  - `src/controllers/webhooks.controller.ts` — imports `prisma` only (correct: webhook upserts must bypass RLS).

  No domain code imports the singleton directly.

---

## Open items found

**None for the cleanup scope.** The two follow-up items the cleanup agent was created to resolve are now done:

- `GET /health` route is wired and unauthenticated. Railway's `healthcheckPath = "/health"` will succeed on next deploy.
- Prisma client is split. `prismaApp` connects via `DATABASE_URL_APP` (the restricted role provisioned by DevOps in `docker-compose.yml` + `docker/postgres/init.sql`) so RLS policies are now actually enforced at runtime. The migration-owner `prisma` client is reserved for the auth-time user upsert and the Clerk webhook upsert.

Note for downstream agents: as of this handoff, the only files in `src/` that import the Prisma singleton are `src/middleware/auth.middleware.ts` and `src/controllers/webhooks.controller.ts`. Any future PR that adds a third `from '../config/prisma'` import outside an auth- or webhook-specific code path is a bug — the domain code must use `request.prismaTransaction` instead.

---

## Contract for downstream agents

**Friends Domain and Groups Domain agents may now start.** They must use `request.prismaTransaction` for all queries — that client is the RLS-enforced `prismaApp` transaction opened by the auth middleware, and it carries `app.current_user_id` so Postgres RLS policies resolve correctly. The `prisma` singleton (migration owner) is reserved for auth-time user upsert and the Clerk webhook handler only — do not import it from any domain file. Repositories should accept the per-request client as a parameter (see `src/repositories/events.repository.ts` and the `Db` type it exports for the established pattern).

# Backend — Cleanup Agent Prompt

> **You are the Backend Cleanup agent.** Read this entire document before writing a single line of code. Your job is two surgical fixes and nothing else. Do not touch anything outside this list.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-api/`. The following is complete and must not be touched:

| Agent | Key files |
|---|---|
| Schema / Migrations | `prisma/schema.prisma`, `prisma/migrations/` |
| Auth (Clerk) | `src/middleware/auth.middleware.ts`, `src/config/clerk.ts`, `src/routes/webhooks.routes.ts`, `src/app.ts` |
| Events Domain | `src/routes/events.routes.ts`, `src/controllers/events.controller.ts`, `src/services/events.service.ts`, `src/repositories/events.repository.ts` |

**Read before writing any code:**
- `src/middleware/AUTH_HANDOFF.md` — understand the full auth + transaction contract
- `src/routes/EVENTS_HANDOFF.md` — understand the Prisma dual-client open item (item #6)
- `src/config/env.ts` — current env schema (you will add one field)
- `src/config/prisma.ts` — current Prisma singleton (you will split it into two clients)
- `src/middleware/auth.middleware.ts` — understand which client it uses for upsert vs. transaction

---

## Fix 1 — `GET /health` Route

### What

Add an unauthenticated `GET /health` endpoint that returns `{ "status": "ok" }` with HTTP 200.

### Why

`railway.toml` declares `healthcheckPath = "/health"`. The auth middleware already skips the `/health` prefix (check `auth.middleware.ts` to confirm — do not add another skip if it's already there). Until this route exists Railway will fail its health checks and restart-loop after every deploy.

### Where

Create `src/routes/health.routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });
}
```

Register it in `src/app.ts` **before** the auth middleware registration:

```ts
await app.register(healthRoutes); // no prefix — route is exactly /health
```

Import from the correct path. Do not prefix it with `/health` in the register call — the route itself already includes `/health` in the path string.

### Checklist

- [ ] Route returns `{ status: "ok" }` with HTTP 200
- [ ] Route is NOT behind the auth middleware (test by checking auth.middleware.ts skips `/health`)
- [ ] Registered in `src/app.ts` before the auth preHandler

---

## Fix 2 — Dual Prisma Client (`DATABASE_URL` vs `DATABASE_URL_APP`)

### What

Split the single `PrismaClient` singleton into two:

- `prisma` — uses `DATABASE_URL` (migration owner, bypasses RLS). Used only for: auth-time user upsert, webhook handler upsert.
- `prismaApp` — uses `DATABASE_URL_APP` (app role, subject to RLS). Used for: the per-request `$transaction(...)` in the auth middleware.

### Why

The auth middleware opens a per-request transaction and sets `app.current_user_id` so Postgres RLS policies can enforce row-level security. But `PrismaClient` currently reads `DATABASE_URL`, which connects as the migration owner — a role that bypasses RLS entirely. Until `prismaApp` uses `DATABASE_URL_APP` (the restricted app role), RLS is never actually enforced at runtime.

DevOps has already provisioned the two-role Postgres setup in `docker-compose.yml` and `docker/postgres/init.sql`. `DATABASE_URL_APP` is documented in `.env.example`. This fix is the last step to actually wire it up.

### Step 1 — Add `DATABASE_URL_APP` to `src/config/env.ts`

Add one field to the Zod schema:

```ts
DATABASE_URL_APP: z.string().min(1),
```

Place it directly after `DATABASE_URL`. The server already exits on missing env vars — this is zero additional work.

### Step 2 — Update `src/config/prisma.ts`

Replace the current single-client file with two exported clients:

```ts
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Migration-owner client — bypasses RLS. Use ONLY for:
//   1. Auth-time user upsert (chicken-and-egg: no current_user_id yet)
//   2. Webhook handler upserts
// Do NOT use this client anywhere else.
export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

// App-role client — subject to RLS. Use for ALL per-request transactions.
// This is what gets passed into request.prismaTransaction via auth.middleware.ts.
export const prismaApp = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL_APP } },
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
```

### Step 3 — Update `src/middleware/auth.middleware.ts`

Find the line that opens the per-request transaction. It currently calls `prisma.$transaction(...)`. Change it to call `prismaApp.$transaction(...)` instead.

The user upsert that runs before the transaction (step 3 in the auth middleware flow) must stay on `prisma` — do not change that call.

Import `prismaApp` from `../config/prisma.js` alongside the existing `prisma` import.

### Step 4 — Verify no other files import the singleton for domain queries

Run:
```bash
grep -r "from.*config/prisma" src/ --include="*.ts"
```

Any file other than `auth.middleware.ts` and `webhooks.controller.ts` that imports `prisma` directly is a bug — domain code must use `request.prismaTransaction`. If you find any, flag them in your HANDOFF but do not fix them (that's the domain agent's responsibility).

### Checklist

- [ ] `env.ts` has `DATABASE_URL_APP` as a required field
- [ ] `prisma.ts` exports both `prisma` (DATABASE_URL) and `prismaApp` (DATABASE_URL_APP)
- [ ] `auth.middleware.ts` opens its per-request transaction on `prismaApp`
- [ ] `auth.middleware.ts` still uses `prisma` for the user upsert
- [ ] `tsc --noEmit` passes in `social-calendar-api/`
- [ ] No domain files import `prisma` singleton directly (or findings are noted in HANDOFF)

---

## Files to Create or Modify

```
src/routes/health.routes.ts          ← CREATE
src/config/env.ts                    ← MODIFY (add DATABASE_URL_APP)
src/config/prisma.ts                 ← MODIFY (split into two clients)
src/middleware/auth.middleware.ts     ← MODIFY (swap $transaction client)
src/app.ts                           ← MODIFY (register health route)
src/BACKEND_CLEANUP_HANDOFF.md       ← CREATE (write this last)
```

Do not create or modify any other files.

---

## Handoff Document

When all changes are done and `tsc --noEmit` passes clean, write `src/BACKEND_CLEANUP_HANDOFF.md`:

1. **What was changed** — table of files and what changed in each
2. **Verification** — confirm `tsc --noEmit` passed, confirm health route is unauthenticated
3. **Open items** — any domain files found importing the singleton directly (list them for the domain agents to fix)
4. **Contract for downstream agents** — one paragraph: "Friends Domain and Groups Domain agents may now start. They must use `request.prismaTransaction` for all queries. The `prisma` singleton (migration owner) is reserved for auth and webhooks only."

---

## Final Checklist

- [ ] `tsc --noEmit` passes with zero errors
- [ ] Health route registered before auth middleware in `src/app.ts`
- [ ] `DATABASE_URL_APP` in `env.ts` Zod schema
- [ ] `prismaApp` exported from `prisma.ts`, used in `auth.middleware.ts` for the transaction
- [ ] `BACKEND_CLEANUP_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Backend Cleanup row → `COMPLETE (date)`

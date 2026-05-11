# Backend — Schema / Migrations Agent Handoff

**Agent:** Backend / Schema / Migrations
**Completed:** 2026-05-02
**Per:** `LEAD_MANAGER.md` → Backend → Schema / Migrations row, start notes verified 2026-05-02.

---

## What was built

### 1. Schema changes (`prisma/schema.prisma`)
Added `deletedAt DateTime?` to four models per Decision #2 (soft deletes):

| Model       | Line |
|-------------|-----:|
| `User`        |   83 |
| `Friendship`  |  110 |
| `SocialGroup` |  182 |
| `Event`       |  224 |

No other schema changes. `prisma format` and `prisma validate` both pass.

### 2. Baseline migration (`prisma/migrations/20260502201744_init/migration.sql`)
Generated via `prisma migrate diff --from-empty --to-schema-datamodel`.
- 18 tables, 9 enums, all unique constraints, indexes, and foreign keys.
- `deletedAt` columns present on User / Friendship / SocialGroup / Event.
- Verified drift-free against the schema.

### 3. RLS migration (`prisma/migrations/20260502201745_rls_policies/migration.sql`)
Per Decision #3 (Postgres RLS).

- Helper function: `current_app_user_id()` — reads `current_setting('app.current_user_id', true)`, returns `text` or `NULL`.
- `ENABLE ROW LEVEL SECURITY` on all 18 tables.
- Per-table policies covering SELECT / INSERT / UPDATE / DELETE keyed off ownership and group membership. See file header for the full design rationale.

**RLS scope:** "who can see what" only. Soft-delete filtering (`deletedAt IS NULL`) is the service/repository layer's job, not RLS's.

### 4. `prisma/migrations/migration_lock.toml`
Declares `provider = "postgresql"` so Prisma recognises the migrations directory as a managed migration history.

### 5. Prisma Client regenerated
`prisma generate` ran cleanly. Types in `node_modules/@prisma/client` now reflect the soft-delete fields. Downstream domain agents (Auth, Events, Friends, Groups) can import as normal.

---

## Not yet executed against a live DB

`prisma migrate dev` was **not** run because no Postgres instance is reachable on `localhost:5432` — the DevOps `docker-compose` agent hasn't shipped yet. Two consequences:

1. The migration files are authored but not applied. Once Postgres is up, the first invocation of `prisma migrate dev` will detect both migrations as pending and apply them in timestamp order: init → rls_policies. No manual intervention needed.
2. There is no `_prisma_migrations` history row yet, so anyone running this against a populated DB (e.g. an existing dev environment) would need `prisma migrate resolve --applied <name>` per migration. Not relevant for a fresh dev DB.

---

## Runtime contract for the Auth (Clerk) agent — READ THIS

The RLS policies depend on a session variable that **the auth middleware must set on every request**:

```ts
// Inside the auth middleware, after Clerk verification, before any query:
await prisma.$executeRawUnsafe(
  `SET LOCAL app.current_user_id = $1`,
  request.user.id,           // the User.id resolved from clerkId
);
```

Constraints:
- `SET LOCAL` only persists for the current transaction. Every request must run inside `prisma.$transaction(async (tx) => { ... })` for the policies to apply.
- If the variable is never set, `current_app_user_id()` returns `NULL` and **all policies fail** — the role will see no rows. This is intentional: forgetting to set the var fails closed.
- Pgbouncer in transaction-pool mode would break `SET LOCAL` only if it pools across transactions. Session-pool or transaction-pool with `prisma.$transaction` is fine.

---

## Runtime contract for the DevOps Manager — READ THIS

Two database roles are needed:

| Role | Used by | RLS behaviour |
|---|---|---|
| Migration owner (e.g. `syncup_migrate`) | `prisma migrate deploy` in CI/Railway | Owns the tables → bypasses RLS by default. Migrations and admin tooling work normally. |
| App runtime role (e.g. `syncup_app`) | Fastify server's `PrismaClient` | Non-owner. RLS applies. |

DevOps work to add when provisioning Postgres:

```sql
CREATE ROLE syncup_app LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE syncup TO syncup_app;
GRANT USAGE ON SCHEMA public TO syncup_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO syncup_app;
GRANT USAGE,  SELECT                  ON ALL SEQUENCES IN SCHEMA public TO syncup_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO syncup_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                  ON SEQUENCES TO syncup_app;
```

Two `DATABASE_URL`s should exist in the env:
- `DATABASE_URL` — owner role, used by Prisma CLI and migrations.
- `DATABASE_URL` (runtime) or a separate var — app role, used by the running Fastify process.

Currently `social-calendar-api/.env` only declares one `DATABASE_URL`. **Decision needed from Lead Manager / DevOps**: introduce a second var (e.g. `DATABASE_URL_APP`) or reuse one connection string. I left this alone to avoid scope creep; it's documented here so it doesn't get lost.

---

## Cross-section issue surfaced

`social-calendar-api/CLAUDE.md` (dated 2026-04-26) directly contradicts the Lead Manager's locked decisions:

- It says **"Hard deletes — no `deletedAt` soft-delete pattern"** — contradicts Decision #2.
- It says **"No Postgres row-level security policies"** — contradicts Decision #3.

The Schema agent updated the file to match the Lead Manager's locked decisions (Christian authorised forward progress on flagged questions). Diff:

- Replaced the "Hard deletes" paragraph with a "Soft deletes" paragraph naming the four models.
- Replaced the "Auth enforcement — Service layer only … No Postgres row-level security policies" paragraph with the locked RLS-as-defence-in-depth design and the runtime contract above.

This change is in the same commit as the schema/migrations work.

---

## Open items the Lead Manager should track

1. **Seed data is out of date with Decision #4.** The current `prisma/seed.ts` is the minimal 2-user / 1-event seed. The locked spec calls for the full extended seed (3–5 users + friendships + co-host event + recurring with exceptions + RSVP spread + closed poll, etc.). Not in this agent's scope — flagging for assignment.
2. **Two `DATABASE_URL`s** (see DevOps section above) — needs a Lead Manager call.
3. **Cascade rules for hard deletes of related records** (e.g. when an Event is hard-deleted by a creator, what happens to invites? `RESTRICT` is the current default in the migration). The CLAUDE.md previously punted on this. Now that we're soft-deleting Events, the cascade question is mostly deferred — but anything not on the soft-delete list (poll votes, notifications, session data) still needs explicit cascade rules. Domain agents should confirm before writing delete endpoints.
4. **Seed file deletion gate.** Decision #4 requires `prisma/seed.ts` and the `prisma.seed` entry in `package.json` to be removed before any production deploy. Worth wiring into the DevOps Railway Deploy agent's checklist.

---

## Suggested next agent

**Backend / Auth (Clerk).** Now unblocked. Inputs available:
- Final `schema.prisma` with `deletedAt` on the four models.
- Generated Prisma client.
- Runtime contract for `SET LOCAL app.current_user_id` documented above.
- `current_app_user_id()` helper in the database.

The Auth agent should:
1. Build the Clerk JWT verification middleware.
2. Add the Clerk user-sync webhook handler.
3. Wire `SET LOCAL app.current_user_id` into the per-request transaction lifecycle so RLS engages.
4. Augment `FastifyRequest` with the resolved `User` (per CLAUDE.md's `src/types/fastify.d.ts`).

After Auth ships, Events / Friends / Groups domain agents can run in parallel.

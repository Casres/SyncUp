# DevOps — Jest / Supertest Agent Handoff

**Agent:** DevOps / Jest + Supertest
**Completed:** 2026-05-04
**Per:** `LEAD_MANAGER.md` → DevOps → Jest / Supertest row.

---

## 1. What was built

| File | Role |
|---|---|
| `jest.config.ts` | `preset: ts-jest`, `testEnvironment: node`, `maxWorkers: 1`, `testTimeout: 15s`, `setupFilesAfterEnv: ['./__tests__/setup/jest-setup.ts']`, `globalSetup` / `globalTeardown` wired, `moduleNameMapper` rewrites `.js` → source for NodeNext-style relative imports, ts-jest transform overrides `module: NodeNext` → `CommonJS` for the test transpile so `jest.mock()` hoisting works. |
| `__tests__/setup/global-setup.ts` | Stand-alone process; logs readiness. Migrations are owned by CI / docker-compose, not the test runner. |
| `__tests__/setup/global-teardown.ts` | Stand-alone process; logs completion. Per-file `afterAll` already releases the connection pool. |
| `__tests__/setup/jest-setup.ts` | Mocks `@clerk/backend.verifyToken` (Pattern A) + sets `process.env` defaults so `src/config/env.ts` doesn't `process.exit(1)` if the developer's local `.env` is missing the new `DATABASE_URL_APP` / `CLERK_WEBHOOK_SECRET` vars. |
| `__tests__/setup/app-factory.ts` | Caches a singleton Fastify instance built via `buildApp()` from `src/app.ts`. `getApp()` calls `app.ready()` but never `app.listen()` — supertest hits `app.server` directly. `closeApp()` releases the connection pool. |
| `__tests__/setup/db-helpers.ts` | `truncateAll()` + `disconnectTestDb()` + `testPrisma` export. Uses the migration-owner role (`DATABASE_URL`) which bypasses RLS. |
| `__tests__/setup/auth-helpers.ts` | `TEST_CLERK_USER_ID`, `TEST_USER_SEED`, `authHeader()` — token value is irrelevant because Clerk is mocked. |
| `__tests__/health/health.test.ts` | One passing smoke test against `GET /health` (no auth required). |
| `__tests__/events/events.test.ts` | 7 representative tests + 4 `test.todo` for deferred features. |
| `__tests__/friends/friends.test.ts` | 5 representative tests + 2 `test.todo` for deferred features. |
| `__tests__/groups/groups.test.ts` | 6 representative tests + 2 `test.todo` for deferred features. |
| `package.json` | `"test": "jest"`, `"test:watch": "jest --watch"`, `"test:coverage": "jest --coverage"` — the previous `--if-present` no-op was already replaced by the prior partial run. |

Dev dependencies installed (already present from the partial run, verified to land in `package.json`):
`jest@^30`, `ts-jest@^29.4`, `supertest@^7.2`, `@types/jest@^30`, `@types/supertest@^7.2`. Hoisted to the monorepo root via npm workspaces — `npx jest` resolves through `node_modules/.bin/jest` from the workspace root.

---

## 2. How to run

```bash
# From social-calendar-api/
npm test                                    # full suite
npm run test:watch                          # watch mode
npm run test:coverage                       # with coverage

# Single domain (Jest 30 syntax — note plural):
npx jest --testPathPatterns="events"
npx jest --testPathPatterns="friends"
npx jest --testPathPatterns="groups"
npx jest --testPathPatterns="health"
```

Heads-up: Jest 30 renamed `--testPathPattern` (singular) → `--testPathPatterns` (plural). The old flag is rejected at parse time.

In CI: `.github/workflows/ci.yml` provisions postgres + redis service containers, runs `prisma migrate deploy`, and then `npm test`. The whole suite is expected to pass against that infrastructure.

Locally without Postgres running: only `health.test.ts` will pass. The three domain suites bootstrap correctly (Fastify builds, Clerk mock fires, supertest connects to the in-process server) and then fail with `PrismaClientInitializationError: Can't reach database server at localhost:5432` once they call `truncateAll()` in `beforeAll`. This is the documented acceptance state — see §9 below.

To run domain tests locally, start the docker-compose stack from the monorepo root: `docker compose up -d postgres redis` then `npm run prisma:migrate --workspace=social-calendar-api`.

---

## 3. Clerk mock pattern

**Pattern A — verifyToken imported directly from `@clerk/backend`.**

Evidence (line 8 of `src/middleware/auth.middleware.ts`):

```ts
import { verifyToken } from '@clerk/backend';
```

Used in the preHandler at line 91:

```ts
claims = (await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })) as ClerkClaims;
```

The mock in `jest-setup.ts` therefore replaces the named export:

```ts
jest.mock('@clerk/backend', () => {
  const actual = jest.requireActual('@clerk/backend') as Record<string, unknown>;
  return {
    ...actual,
    verifyToken: jest.fn(async () => ({ sub: 'test_clerk_user_id' })),
  };
});
```

`...actual` preserves the rest of the SDK (e.g. `JwtPayload` types are pure-types and not affected, but if a future utility from `@clerk/backend` is imported the actual export still resolves). The mock is hoisted by ts-jest, so it intercepts every `import { verifyToken } from '@clerk/backend'` resolved anywhere in the module graph.

If a test wants a different identity:

```ts
import { verifyToken } from '@clerk/backend';
(verifyToken as jest.Mock).mockResolvedValueOnce({ sub: 'other_clerk_id' });
```

If `auth.middleware.ts` is ever refactored to use `createClerkClient(...).verifyToken(...)` instead of the standalone import, this mock breaks silently — the auth middleware will fall through to the real Clerk API and tests will hang or 401. Guard rails in `__tests__/setup/jest-setup.ts` comments call this out.

---

## 4. DB truncation

### Final TRUNCATE table list

Verified 1:1 against `prisma/schema.prisma` (no `@@map` directives, all model names map to PascalCase Postgres tables):

```
PollVote
PollOption
GroupPoll
SuggestionVote
EventSuggestion
SocialGroupMember
SocialGroup
FriendGroupMember
FriendGroup
AvailabilityBlock
FriendshipLabel
Friendship
EventInvite
EventOrganiser
EventException
UserAvailability
Event
User
```

18 tables total — matches the 18 Prisma models.

### Child-before-parent rationale

`TRUNCATE … RESTART IDENTITY CASCADE` makes the FK chain irrelevant in practice — Postgres clears children automatically when their parent is truncated. We list children first as defence in depth: if `CASCADE` is ever removed (e.g. for performance or audit reasons) the explicit ordering still works without rewriting the list.

### Why `DATABASE_URL`, not `DATABASE_URL_APP`

Two reasons:

1. **TRUNCATE privilege.** The app role (`syncup_app`, configured via `docker/postgres/init.sql`) does not own the tables and therefore cannot TRUNCATE them. Only the migration-owner role (`syncup_owner`) has that grant.

2. **RLS visibility.** Even if the app role could TRUNCATE, RLS policies would only let it see — and therefore only delete — rows belonging to the current `app.current_user_id`. Test cleanup must be deterministic and full; using the migration-owner role (which bypasses RLS by default) guarantees that every test starts from an empty schema.

The same client (`testPrisma` exported from `db-helpers.ts`) is used for direct row inserts in `beforeAll` (e.g. pre-creating the second user for friend-request tests) — those inserts also need to bypass RLS because `app.current_user_id` is not set in the test setup phase.

---

## 5. App factory

**`buildApp()` was pre-existing.** No refactor required.

`src/app.ts` already exports `export async function buildApp(): Promise<FastifyInstance>` (added by the Auth agent during their handoff). The factory registers, in order:

1. `healthRoutes` (before auth — health is public)
2. `webhooksRoutes` (raw-body parser + Svix verification, no Clerk JWT)
3. `authPlugin` (global preHandler — skips `/webhooks/*` and `/health`)
4. `eventsRoutes`, `friendsRoutes`, `friendGroupsRoutes`, `groupsRoutes` (all auth-required)

`src/server.ts` was NOT touched in this run — the Socket.io agent's earlier change (init `Socket.io` after `app.listen()`) is preserved. Tests do not call `app.listen()`, so `request.server.io` is `undefined`; controllers that pass `io` through to services tolerate this (services accept `io?` and skip the emit) — this is documented in `__tests__/setup/app-factory.ts` header comment.

---

## 6. `test.todo` inventory

8 todos total across the three domain suites.

### Events (`__tests__/events/events.test.ts`) — 4 todos

| Todo | Open item it tracks |
|---|---|
| `POST /events/:id/invites` | EVENTS_HANDOFF §1 — invite endpoints not yet implemented |
| `PATCH /events/:id/invites/:inviteId` | EVENTS_HANDOFF §1 — RSVP not yet implemented |
| `POST /events/:id/organisers` | EVENTS_HANDOFF §2 — co-host management not yet implemented |
| `POST /events/:id/exceptions` | EVENTS_HANDOFF §3 — `EventException` endpoints not yet implemented |

### Friends (`__tests__/friends/friends.test.ts`) — 2 todos

| Todo | Open item it tracks |
|---|---|
| `GET /friends/requests/outgoing` | FRIENDS_HANDOFF §5 — outgoing-requests endpoint deferred |
| `POST /friend-groups` | Friend-groups domain has its own future test suite (routes exist under `/friend-groups`, separate from `/friends`) |

### Groups (`__tests__/groups/groups.test.ts`) — 2 todos

| Todo | Open item it tracks |
|---|---|
| `PUT /groups/:id/polls/:pollId/vote` | GROUPS_HANDOFF §9 — single-select switch endpoint deferred |
| `POST /groups/:id/suggestions/:suggestionId/vote` | Suggestion voting requires an `Event.allowSuggestionVoting=true` parent — full exercise left for a domain author who can build the cross-domain fixture cleanly |

---

## 7. CI notes

`.github/workflows/ci.yml` (per LEAD_MANAGER §283) already provisions:

- Postgres service container
- Redis service container
- Two-role provisioning (`syncup_owner` + `syncup_app`)
- `prisma migrate deploy` before the test step

**Missing env vars in CI:** none discovered. The test step inherits `DATABASE_URL`, `DATABASE_URL_APP`, `REDIS_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` from the workflow's env block. `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` can be any non-empty string in CI because (a) Clerk is mocked at the SDK level by `jest-setup.ts` and (b) webhooks are not exercised by the integration tests.

If a future test adds webhook coverage, real-world `CLERK_WEBHOOK_SECRET` (or a deterministic test secret) will be required because `webhooksRoutes` uses `svix` to verify signatures and that runs against real crypto.

**Local-dev `.env` is also missing `DATABASE_URL_APP` and `CLERK_WEBHOOK_SECRET`** — `social-calendar-api/.env` was last updated for the single-role setup. The Auth/RLS rollout extended `env.ts` to require both. `jest-setup.ts` injects sensible defaults so the test suite boots regardless; the dev server (`npm run dev`) will still complain on startup until the developer's `.env` is updated. Flag for a small follow-up to refresh `.env.example` (currently also missing `DATABASE_URL_APP`).

---

## 8. Open items for domain agents / future test authors

1. **Events list response is wrapped: `{ events: [...] }`, NOT a bare array.** EVENTS_HANDOFF.md §"Response shape" describes the per-row shape but doesn't explicitly call out the list-wrapper. Tests assume `res.body.events`. If a domain agent ever flattens the wrapper, the events test must be updated.

2. **Friends list / requests are also wrapped: `{ friends: [...] }`, `{ requests: [...] }`.** Same caveat.

3. **Groups list / members / polls / suggestions are wrapped: `{ groups }`, `{ members }`, `{ polls }`, `{ suggestions }`.** Same caveat.

4. **Vote endpoints return 201 with NO body.** `POST /groups/:id/polls/:pollId/options/:optionId/vote` and `POST /groups/:id/suggestions/:suggestionId/vote` reply with `reply.code(201).send()` — `res.body` is `{}`. Don't assert on shape, only on status.

5. **Friendship `accept` flow needs the test caller to be the *receiver*.** The Clerk mock is fixed to `TEST_CLERK_USER_ID`, so the only way to exercise PATCH `/friends/requests/:id { action: "accept" }` is to seed the PENDING row directly via `testPrisma.friendship.create(...)` with `initiatorId: friendUserId, receiverId: callerUserId`. Demonstrated in `friends.test.ts`.

6. **Soft-delete tombstone collisions on re-running the request flow.** Once a `Friendship(initiatorId=A, receiverId=B)` is soft-deleted, FRIENDS_HANDOFF §"Decisions" pins the behaviour to 409 — no re-insert. If you re-use the same two users across multiple test cases, `truncateAll()` in `beforeAll` resets the schema, but tests within a single `describe` must either use a fresh pair or `testPrisma.friendship.deleteMany(...)` first (the existing `friends.test.ts` does this defensively before the accept-flow test).

7. **Last-admin guard is real.** Adding `removeMember` tests where the caller is the only ADMIN will return 400 with `"A group must have at least one admin."` — see GROUPS_HANDOFF §"Last-admin guard". Future tests should either promote a second member to ADMIN first or expect the 400.

8. **`EventSuggestion` voting against an `Event` with `allowSuggestionVoting: false` returns 403** even if the user is a group member. Tests against `POST /groups/:id/suggestions/:suggestionId/vote` need to pre-create an Event with `allowSuggestionVoting: true` (or with `eventId: null` on the suggestion) — left as `test.todo` here; a future Suggestions agent or domain test author should pick this up.

9. **`auth.middleware.ts` opens a per-request transaction that times out after 30s.** Long-running test scenarios (file uploads, bulk inserts) could hit the timeout. Default `testTimeout: 15s` is set generously but is still under the tx timeout — fine.

10. **Fastify's request logger fires inside tests** (`logger: true` in `buildApp()`). Output is noisy but useful when a test fails. To silence: pass `logger: false` to `buildApp()` via a parameter — out of scope for this run because that requires a `buildApp()` signature change, which the prompt forbids beyond the single permitted refactor (and `buildApp()` was pre-existing).

11. **`TEST_USER_SEED` does not include `email`.** Earlier scaffolding had `email: 'testuser@syncup.test'` but `User.email` does not exist in the schema (the User model has `username`, `displayName`, etc. — no `email` column). Auth-helpers reflects the real schema.

---

## Verification

- `npx tsc --noEmit` from `social-calendar-api/` — **zero errors, zero output.**
- `npx jest --testPathPatterns="events"` — boots the app factory, app reaches `ready()`, mocked Clerk fires correctly. Suite then fails with `PrismaClientInitializationError: Can't reach database server at localhost:5432` (Postgres not running locally — expected). No TypeScript / import errors.
- `npx jest --testPathPatterns="health"` — **1 passed / 1 total** (DB-free smoke test).
- `npx jest --listTests` — discovers all 4 test files: `events`, `friends`, `groups`, `health`.

In CI (with the docker-compose stack and `prisma migrate deploy` already run), the full suite is expected to pass. The 8 `test.todo` entries surface as "todo" rather than "failed" or "skipped" so the LEAD_MANAGER can grep the ledger to see what is and isn't covered.

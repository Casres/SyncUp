# DevOps — Jest / Supertest Agent Prompt

> **You are the DevOps agent responsible for Jest + Supertest test infrastructure for the SyncUp backend.** Read this entire document before writing a single line of code. Your job is to set up the test runner and write one representative integration test per domain — you do NOT write a comprehensive test suite, and you do NOT modify any existing domain code (with one exception noted in Step 8).

---

## Context: What Has Already Been Built

All backend agents are complete before you start. Read their handoffs in this order:

| Agent | Handoff file | What you need from it |
|---|---|---|
| Backend Cleanup | `src/BACKEND_CLEANUP_HANDOFF.md` | Dual Prisma client setup; `prisma` vs `prismaApp` distinction |
| Auth (Clerk) | `src/middleware/AUTH_HANDOFF.md` | How `request.user` and `request.prismaTransaction` are attached; which Clerk import is used; health route skip |
| Events Domain | `src/routes/EVENTS_HANDOFF.md` | Route paths, request shapes, response shapes, open items |
| Friends Domain | `src/routes/FRIENDS_HANDOFF.md` | Route paths, friendship states, response shapes, open items |
| Groups Domain | `src/routes/GROUPS_HANDOFF.md` | Route paths, poll/suggestion/membership shapes, open items |
| Socket.io Layer | `src/sockets/SOCKETIO_HANDOFF.md` | Any notes for test authors |

**Also read:**
- `social-calendar-api/CLAUDE.md` — architecture rules (non-negotiable)
- `social-calendar-api/prisma/schema.prisma` — model names you will reference when truncating between test runs
- `social-calendar-api/src/app.ts` — understand how the Fastify app is built; determine if it exports a factory function or a started instance
- `social-calendar-api/src/middleware/auth.middleware.ts` — read the exact Clerk import before writing the mock
- `social-calendar-api/tsconfig.json` — check for path aliases that must be mirrored in `jest.config.ts`

---

## Core Rules

From `CLAUDE.md`, these are locked and non-negotiable:

```
Business logic lives in Services. Controllers handle HTTP only.
All DB access goes through request.prismaTransaction — not the singleton.
```

For testing specifically:

- **Tests must hit a real database.** Do not mock the Prisma client or bypass the database layer.
- **Clerk JWT verification must be mocked.** Tests cannot call Clerk's API. Mock `verifyToken` (or `createClerkClient`) at the module level so the auth middleware's user-upsert and RLS transaction still run against the real DB — only the JWT signature check is bypassed.
- **Each test file owns its own cleanup.** Truncate relevant tables in `beforeAll` or `afterEach` as appropriate. Do not rely on test-run order.
- **Do not modify domain code, route handlers, services, or repositories** — except the one permitted change in Step 8 (app factory refactor). If a test requires a route that does not yet exist, mark it with `test.todo(...)`.
- **Run tests serially.** Parallel workers share the same database — set `maxWorkers: 1` in jest config to prevent race conditions.

---

## Step 1 — Install Dependencies

```bash
cd social-calendar-api
npm install --save-dev jest ts-jest supertest @types/jest @types/supertest
```

Verify that `tsx` is already in `devDependencies` (likely used for the dev server). If not, add it:

```bash
npm install --save-dev tsx
```

---

## Step 2 — `jest.config.ts`

Create `social-calendar-api/jest.config.ts`:

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Mirror any path aliases from tsconfig.json here:
  moduleNameMapper: {
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
    // Read tsconfig.json paths before filling this in.
  },
  globalSetup: './__tests__/setup/global-setup.ts',
  globalTeardown: './__tests__/setup/global-teardown.ts',
  setupFilesAfterFramework: ['./__tests__/setup/jest-setup.ts'],
  testTimeout: 15000, // Integration tests are slower — give them room
  maxWorkers: 1,     // Serial execution — multiple workers share the same DB
};

export default config;
```

> **Note on `setupFilesAfterFramework`:** If `ts-jest` reports an unrecognised key, check the jest version in `package.json`. The key may be `setupFilesAfterFramework` (Jest 27+) or the older `setupTestFrameworkScriptFile`. Verify against `node_modules/jest-config/build/Defaults.js` or the installed jest docs if there is a type error.

---

## Step 3 — Update `package.json` Test Scripts

In `social-calendar-api/package.json`, locate the `"scripts"` block. The `"test"` script currently contains `--if-present` (a no-op placeholder left by the GitHub Actions agent). Replace it:

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

Surgical edit — do not touch any other scripts.

---

## Step 4 — Create the `__tests__/` Folder Structure

```
social-calendar-api/
  __tests__/
    setup/
      global-setup.ts       ← runs once before all test files (separate global process)
      global-teardown.ts    ← runs once after all test files (separate global process)
      jest-setup.ts         ← runs before each test file; installs Clerk mock
      app-factory.ts        ← builds + caches a Fastify app instance for supertest
      db-helpers.ts         ← truncate helpers using the migration-owner client
      auth-helpers.ts       ← test auth header + test user constants
    events/
      events.test.ts        ← representative integration tests for Events domain
    friends/
      friends.test.ts       ← representative integration tests for Friends domain
    groups/
      groups.test.ts        ← representative integration tests for Groups domain
```

---

## Step 5 — `setup/global-setup.ts`

```ts
// global-setup.ts
// Runs once before all test suites in a separate Node.js process.
// jest globals (jest.fn, etc.) are NOT available here.
// Use only for one-time global initialization.

export default async function globalSetup() {
  // In CI: `prisma migrate deploy` runs before the test step (see .github/workflows/ci.yml).
  // In local dev: the developer is expected to have run `prisma migrate dev`.
  // No migration work needed here.
  console.log('[test] Global setup: ready');
}
```

---

## Step 6 — `setup/global-teardown.ts`

```ts
// global-teardown.ts
// Runs once after all test suites in a separate Node.js process.

export default async function globalTeardown() {
  console.log('[test] Global teardown: complete');
}
```

---

## Step 7 — `setup/jest-setup.ts`

This file is loaded by `setupFilesAfterFramework` and runs before **each test file** in the test environment (jest globals are available here).

> **IMPORTANT:** Before writing this file, read `src/middleware/auth.middleware.ts` and find the exact import used to call Clerk. The mock must mirror the actual import shape. Two common patterns are shown below — use the one that matches.

```ts
// jest-setup.ts
// Mocks Clerk JWT verification globally.
// The auth middleware still runs fully — user upsert (against real DB),
// per-request transaction open, and RLS config — but JWT signature
// verification is replaced with a no-op that returns our test user's sub.

// Pattern A: if auth.middleware.ts calls `verifyToken` imported directly from '@clerk/backend'
jest.mock('@clerk/backend', () => ({
  ...jest.requireActual('@clerk/backend'),
  verifyToken: jest.fn().mockResolvedValue({
    sub: 'test_clerk_user_id',
  }),
}));

// Pattern B: if auth.middleware.ts calls `createClerkClient(...).verifyToken(...)`
// jest.mock('@clerk/backend', () => ({
//   ...jest.requireActual('@clerk/backend'),
//   createClerkClient: jest.fn().mockReturnValue({
//     verifyToken: jest.fn().mockResolvedValue({ sub: 'test_clerk_user_id' }),
//   }),
// }));

// Use whichever pattern matches the actual import in auth.middleware.ts. Delete the other.
```

---

## Step 8 — `setup/app-factory.ts`

Supertest needs a Fastify app instance that has been built but **not** started with `app.listen()`. Read `src/app.ts` before writing this file.

**If `src/app.ts` already exports a factory function** (e.g. `export async function buildApp()`), import and use it directly.

**If `src/app.ts` exports the app instance at module scope** (e.g. `const app = fastify(); ... export default app`), you must refactor it into a factory function. This is the one permitted modification to existing code:

```ts
// Before (typical module-scope pattern):
const app = fastify({ ... });
app.register(...);
export default app;

// After (factory pattern):
export async function buildApp() {
  const app = fastify({ ... });
  await app.register(...);
  return app;
}
```

Do not change any plugin registrations, route registrations, or middleware — wrap them in the function, nothing else. Update `src/server.ts` to call `buildApp()` if it currently imports the instance directly.

Once the factory exists, write `__tests__/setup/app-factory.ts`:

```ts
import type { FastifyInstance } from 'fastify';

// Singleton: build once, reuse across all tests in a run.
// Each test file calls closeApp() in its afterAll so the connection is released cleanly.
let _app: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (_app) return _app;
  const { buildApp } = await import('../../src/app.js');
  _app = await buildApp();
  await _app.ready();
  return _app;
}

export async function closeApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
}
```

---

## Step 9 — `setup/db-helpers.ts`

```ts
// db-helpers.ts
// Truncation helpers for resetting DB state between test suites.
// Uses DATABASE_URL (migration-owner client) so RLS does not restrict the truncate.
// TRUNCATE ... RESTART IDENTITY CASCADE handles FK-constrained child tables.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

export async function truncateAll(): Promise<void> {
  // Table names must match the @@map values (or default Prisma table naming) in schema.prisma.
  // Read schema.prisma and adjust this list — add any tables that are missing,
  // keep the order child-before-parent to avoid FK violations.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "PollVote",
      "PollOption",
      "Poll",
      "GroupSuggestionVote",
      "GroupSuggestion",
      "SocialGroupMember",
      "SocialGroup",
      "FriendGroupMember",
      "FriendGroup",
      "AvailabilityBlock",
      "UserAvailability",
      "EventInvite",
      "EventOrganiser",
      "EventException",
      "Event",
      "Friendship",
      "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}

// Expose the client for direct inserts in test setup (e.g. pre-creating a test user).
export { prisma as testPrisma };
```

> **Verify table names:** Run `npx prisma db pull --print` (dry run) or simply read `schema.prisma` and cross-reference any `@@map("...")` directives. Fix the TRUNCATE list to match exactly before running tests.

---

## Step 10 — `setup/auth-helpers.ts`

```ts
// auth-helpers.ts
// Constants and helpers for test authentication.
// Since jest-setup.ts mocks Clerk to accept any token with sub = 'test_clerk_user_id',
// any non-empty Bearer token works. The middleware will upsert the test user on first use.

export const TEST_CLERK_USER_ID = 'test_clerk_user_id';

export const TEST_USER_SEED = {
  clerkId: TEST_CLERK_USER_ID,
  email: 'testuser@syncup.test',
  username: 'testuser',
  displayName: 'Test User',
};

export function authHeader(): { Authorization: string } {
  return { Authorization: 'Bearer test-token-for-jest' };
}
```

---

## Step 11 — Example Integration Tests

Write one test file per domain. The goal is to verify the infrastructure works end-to-end and give domain engineers a clear template — **not** to achieve full coverage.

### `events/events.test.ts`

```ts
import supertest from 'supertest';
import { getApp, closeApp } from '../setup/app-factory';
import { truncateAll, testPrisma } from '../setup/db-helpers';
import { authHeader, TEST_USER_SEED } from '../setup/auth-helpers';

describe('Events domain — integration', () => {
  let app: Awaited<ReturnType<typeof getApp>>;

  beforeAll(async () => {
    app = await getApp();
    await truncateAll();
    // Pre-insert the test user so the auth middleware's upsert finds an existing row.
    // (The upsert is idempotent — this just avoids a redundant INSERT on every request.)
    await testPrisma.user.create({ data: TEST_USER_SEED });
  });

  afterAll(async () => {
    await truncateAll();
    await closeApp();
  });

  // ── GET /events ────────────────────────────────────────────────────────────

  describe('GET /events', () => {
    it('returns 200 with an array (empty when no events exist)', async () => {
      const res = await supertest(app.server)
        .get('/events')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── POST /events ───────────────────────────────────────────────────────────

  describe('POST /events', () => {
    it('creates an event and returns 201 with the event object', async () => {
      const res = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'Jest Test Event',
          startTime: new Date(Date.now() + 86_400_000).toISOString(), // +1 day
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
          isPublic: false,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Jest Test Event' });
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 when no auth header is provided', async () => {
      const res = await supertest(app.server)
        .post('/events')
        .send({ title: 'Unauthorized' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /events/:id ────────────────────────────────────────────────────────

  describe('GET /events/:id', () => {
    it('returns 404 for a non-existent event ID', async () => {
      const res = await supertest(app.server)
        .get('/events/00000000-0000-0000-0000-000000000000')
        .set(authHeader());

      expect(res.status).toBe(404);
    });

    it('returns 200 with the event when the caller is an organiser', async () => {
      const create = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'Lookup Test',
          startTime: new Date(Date.now() + 86_400_000).toISOString(),
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
          isPublic: false,
        });

      const res = await supertest(app.server)
        .get(`/events/${create.body.id}`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(create.body.id);
    });
  });

  // ── DELETE /events/:id ─────────────────────────────────────────────────────

  describe('DELETE /events/:id', () => {
    it('soft-deletes an event and returns 204', async () => {
      const create = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'To Be Deleted',
          startTime: new Date(Date.now() + 86_400_000).toISOString(),
          endTime: new Date(Date.now() + 90_000_000).toISOString(),
          isPublic: false,
        });

      const del = await supertest(app.server)
        .delete(`/events/${create.body.id}`)
        .set(authHeader());

      expect(del.status).toBe(204);

      // Verify the event is no longer returned in the listing
      const list = await supertest(app.server).get('/events').set(authHeader());
      const found = list.body.find((e: { id: string }) => e.id === create.body.id);
      expect(found).toBeUndefined();
    });
  });
});
```

---

### `friends/friends.test.ts`

Read `FRIENDS_HANDOFF.md` carefully before writing this file. Use the exact route paths and request shapes documented there. Include at minimum:

- `GET /friends` (or the listing endpoint) — returns 200 with an array
- Sending a friend request — returns 201 with the friendship object
- Accepting a friend request — returns 200 with updated status
- `GET /friends/:id` — returns 404 for a non-existent friendship
- Any endpoint not yet implemented: mark with `test.todo('reason')`

**Two-user requirement:** Friend request tests need two users. Create a second user directly via `testPrisma.user.create(...)` in `beforeAll`. Send the request as `TEST_CLERK_USER_ID` targeting the second user's ID.

---

### `groups/groups.test.ts`

Read `GROUPS_HANDOFF.md` carefully before writing this file. Include at minimum:

- `GET /groups` — returns 200 with an array
- `POST /groups` — creates a group
- `POST /groups/:id/members` — adds a member (requires a second test user)
- `POST /groups/:id/polls` — creates a poll
- Voting endpoint — casts a vote on a poll option
- Any endpoint not yet implemented: mark with `test.todo('reason')`

---

## Step 12 — Health Route Sanity Check

Verify the health route works without auth (this was built by the Backend Cleanup agent):

```ts
// Add this to a standalone test or confirm manually:
const res = await supertest(app.server).get('/health');
expect(res.status).toBe(200);
expect(res.body).toEqual({ status: 'ok' });
```

If the health route is missing, flag it in your HANDOFF — do not add the route yourself (that was Backend Cleanup's job).

---

## Step 13 — Verify the Suite Boots

Before finalising, run:

```bash
cd social-calendar-api
npx jest --testPathPattern="events" --verbose
```

If the database is not running locally, you will see a connection error — that is expected. The suite must at least **boot** (app factory builds, Fastify reaches `ready()`) and report a connection error, not a TypeScript or import error. Fix any boot failures before writing the HANDOFF.

In CI, the postgres and redis service containers defined in `.github/workflows/ci.yml` will be available, and the full suite should pass.

---

## What NOT to Build

- Comprehensive test coverage — examples only; one representative test per endpoint group
- Unit tests for services, repositories, or utilities — integration tests only
- Socket.io integration tests (a different agent or future work)
- Test tooling for the frontend — that belongs to the Frontend section
- Any changes to domain routes, services, repositories, or controllers outside the permitted `buildApp()` refactor

---

## Handoff Document

When all code is done and `tsc --noEmit` passes, write `social-calendar-api/JEST_HANDOFF.md`:

1. **What was built** — table of files created and each file's role
2. **How to run** — `npm test`, `npm run test:coverage`, and how to run a single domain (`--testPathPattern`)
3. **Clerk mock pattern** — which pattern (A or B) was used in `jest-setup.ts` and why
4. **DB truncation** — table order used, and the reason for using `DATABASE_URL` (not `DATABASE_URL_APP`) for test cleanup
5. **App factory** — whether `buildApp()` already existed or was added; any changes to `src/app.ts` or `src/server.ts`
6. **`test.todo` inventory** — list of skipped tests and the open item / missing route each corresponds to
7. **CI notes** — confirm all required env vars are already in `.github/workflows/ci.yml`; list any that are missing
8. **Open items for domain agents** — anything a future test author should know (e.g. a route that doesn't match the HANDOFF.md docs, an unexpected response shape, an edge case that failed)

---

## Final Checklist

- [ ] `jest`, `ts-jest`, `supertest`, `@types/jest`, `@types/supertest` installed
- [ ] `jest.config.ts` created with `preset: 'ts-jest'`, `maxWorkers: 1`, correct `setupFilesAfterFramework`
- [ ] `package.json` `"test"` script updated from no-op to `jest`
- [ ] All 5 setup files created under `__tests__/setup/`
- [ ] `jest-setup.ts` Clerk mock mirrors the exact import shape used in `auth.middleware.ts`
- [ ] `db-helpers.ts` TRUNCATE list matches actual schema table names (verified against `schema.prisma`)
- [ ] `src/app.ts` exports `buildApp()` factory — added if it was missing; `src/server.ts` updated accordingly
- [ ] `events.test.ts`, `friends.test.ts`, `groups.test.ts` all created with representative tests
- [ ] `test.todo(...)` used for any route that does not yet exist
- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] `npx jest` boots the app and reaches the DB step (connection error is acceptable; type or import errors are not)
- [ ] `JEST_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Jest / Supertest row → `COMPLETE (date)`

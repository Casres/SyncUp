/**
 * jest-setup.ts
 *
 * Loaded by `setupFilesAfterEnv` — runs in the test environment before
 * every test file. Jest globals are available here.
 *
 * Two responsibilities:
 *
 * 1. Provide default environment variables so `src/config/env.ts` (which
 *    calls `process.exit(1)` on missing vars) doesn't kill the test
 *    process. CI sets these explicitly via `.github/workflows/ci.yml`;
 *    a developer running locally can override via shell env. The
 *    defaults below match the `docker-compose` two-role provisioning
 *    in `docker/postgres/init.sql`.
 *
 * 2. Mock Clerk JWT verification globally. The auth middleware
 *    (`src/middleware/auth.middleware.ts`) imports `verifyToken`
 *    directly from `@clerk/backend` (Pattern A in the prompt). We
 *    replace it with a stub that resolves to
 *    `{ sub: TEST_CLERK_USER_ID }` so the middleware's user upsert +
 *    per-request RLS transaction still run against the real database —
 *    only the JWT signature check is bypassed.
 *
 * If a test wants a different user, override per-call:
 *   import { verifyToken } from '@clerk/backend';
 *   (verifyToken as jest.Mock).mockResolvedValueOnce({ sub: 'other_user' });
 *
 * The `jest.mock` factory is hoisted to the top of the file by ts-jest,
 * so it runs BEFORE any `import` of `@clerk/backend` resolves anywhere
 * in the module graph (including the auth middleware).
 */

// Env defaults — only set if not already provided. Must run before any
// import of `src/config/env.ts` (which is reached transitively through
// the app factory). `setupFilesAfterEnv` runs in the test file's
// module-load phase, before the test body's dynamic import of the app.
process.env.DATABASE_URL ??=
  'postgresql://syncup_owner:syncup_owner_password@localhost:5432/syncup';
process.env.DATABASE_URL_APP ??=
  'postgresql://syncup_app:syncup_app_password@localhost:5432/syncup';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.CLERK_SECRET_KEY ??= 'sk_test_jest_placeholder';
process.env.CLERK_WEBHOOK_SECRET ??= 'whsec_jest_placeholder';
process.env.NODE_ENV ??= 'test';

jest.mock('@clerk/backend', () => {
  const actual = jest.requireActual('@clerk/backend') as Record<string, unknown>;
  return {
    ...actual,
    verifyToken: jest.fn(async () => ({ sub: 'test_clerk_user_id' })),
  };
});

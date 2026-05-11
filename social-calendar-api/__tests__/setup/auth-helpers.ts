/**
 * auth-helpers.ts
 *
 * Constants and helpers for test authentication.
 *
 * Since `jest-setup.ts` mocks Clerk's `verifyToken` to return
 * `{ sub: TEST_CLERK_USER_ID }` regardless of input, ANY non-empty
 * Bearer token is accepted by the auth middleware in tests. The
 * middleware will then upsert a `User` row with the seeded clerkId on
 * first request — but every test file pre-creates the user via
 * `testPrisma.user.create(TEST_USER_SEED)` in its `beforeAll` so the
 * upsert is a no-op (`update: {}`) rather than an INSERT on every
 * request.
 *
 * Two-user tests (friend requests, group memberships) need a SECOND
 * User row. Create it directly with `testPrisma` and use its `id` in
 * the request payload — there is no second authenticated identity in
 * play, so no second token is needed.
 */
export const TEST_CLERK_USER_ID = 'test_clerk_user_id';

export const TEST_USER_SEED = {
  clerkId: TEST_CLERK_USER_ID,
  username: 'testuser',
  displayName: 'Test User',
} as const;

/**
 * Returns a Bearer Authorization header. Token value is irrelevant —
 * the Clerk verifier is mocked at the module level. We use a sentinel
 * literal string ("test-token-for-jest") so a curious greppin developer
 * can find every test request.
 */
export function authHeader(): { Authorization: string } {
  return { Authorization: 'Bearer test-token-for-jest' };
}

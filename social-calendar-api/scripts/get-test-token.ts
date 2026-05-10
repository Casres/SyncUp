/**
 * get-test-token.ts — print a Clerk session JWT to stdout.
 *
 * Used by the GAP 6 / Docker round-trip prompt and any future integration
 * tests that need to hit the API with a real Bearer token. Invoked as:
 *
 *   cd social-calendar-api && npx tsx scripts/get-test-token.ts
 *
 * or with a captured token:
 *
 *   TOKEN=$(npx tsx scripts/get-test-token.ts)
 *
 * The script:
 *   1. Reuses the first user in the Clerk dev instance, OR creates one if
 *      none exist (with a deterministic test username/email).
 *   2. Creates a fresh server-side session.
 *   3. Fetches the default-template session JWT.
 *   4. Prints ONLY the token to stdout — every other diagnostic goes to
 *      stderr — so command substitution (`$()`) captures the JWT cleanly.
 */

import { createClerkClient } from '@clerk/backend';

const SECRET_KEY = process.env['CLERK_SECRET_KEY'];

if (!SECRET_KEY || SECRET_KEY === 'sk_test_placeholder' || SECRET_KEY === 'sk_test_replace_me') {
  console.error(
    'CLERK_SECRET_KEY is missing or set to a placeholder. Export a real ' +
      'sk_test_… value before running this script.',
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: SECRET_KEY });

async function getOrCreateTestUser(): Promise<string> {
  const list = await clerk.users.getUserList({ limit: 1 });
  if (list.data.length > 0) {
    const user = list.data[0]!;
    console.error(`Reusing existing user ${user.id} (${user.username ?? '<no-username>'})`);
    return user.id;
  }

  console.error('No users found — creating a fresh test user');
  const created = await clerk.users.createUser({
    emailAddress: ['syncup-test+clerk_test@example.com'],
    password: 'SyncUp-Test-Pass-2026!',
    username: 'syncup_test_user',
    skipPasswordChecks: true,
  });
  console.error(`Created user ${created.id}`);
  return created.id;
}

async function main(): Promise<void> {
  const userId = await getOrCreateTestUser();

  // Create a fresh session for this user. `createSession` is a Clerk
  // backend-only API — it does not go through any sign-in challenge.
  const session = await clerk.sessions.createSession({ userId });
  console.error(`Created session ${session.id}`);

  // Default JWT template for backend verification.
  const tokenResp = await clerk.sessions.getToken(session.id);

  // The SDK returns { jwt: string } in 1.x and a string in some older
  // versions. Normalize.
  const jwt =
    typeof tokenResp === 'string'
      ? tokenResp
      : (tokenResp as { jwt?: string }).jwt;

  if (!jwt || typeof jwt !== 'string') {
    console.error('Unexpected token response shape:', tokenResp);
    process.exit(1);
  }

  // ONLY the token goes to stdout — keeps `$(npx tsx …)` clean.
  process.stdout.write(jwt);
}

main().catch((err) => {
  console.error('get-test-token failed:', err);
  process.exit(1);
});

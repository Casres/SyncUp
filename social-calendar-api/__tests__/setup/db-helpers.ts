/**
 * db-helpers.ts
 *
 * Truncation + direct-insert helpers for resetting DB state between test
 * suites.
 *
 * Why `DATABASE_URL` (not `DATABASE_URL_APP`):
 *   The migration-owner role bypasses RLS by default. The app role
 *   (`syncup_app`) cannot TRUNCATE because (a) it doesn't own the
 *   tables, and (b) RLS would filter rows on a per-user basis even if
 *   it had the privilege — meaning a test cleanup running as the app
 *   role would only delete rows visible to the current `app.current_user_id`,
 *   not all rows. Using the migration-owner client guarantees a
 *   deterministic, full reset between tests.
 *
 * Why `TRUNCATE ... RESTART IDENTITY CASCADE`:
 *   Cascade lets us drop the entire dependency tree in a single
 *   statement without manually ordering 14 child tables. RESTART
 *   IDENTITY resets sequences (irrelevant for cuid PKs but harmless).
 *
 * Table list verified against `prisma/schema.prisma` — all model names
 * map 1:1 to PascalCase Postgres tables (no `@@map` directives in the
 * schema). The order child-before-parent is preserved as a defensive
 * fallback in case CASCADE behaviour ever changes; functionally CASCADE
 * makes the order moot.
 */
import { PrismaClient } from '@prisma/client';

// Build the migration-owner client once per worker. With `maxWorkers: 1`
// only a single client exists for the whole test run.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// All 16 Prisma models that map to writable Postgres tables.
// Children listed before parents as defence in depth (CASCADE handles it).
const TRUNCATE_TABLES = [
  'PollVote',
  'PollOption',
  'GroupPoll',
  'SuggestionVote',
  'EventSuggestion',
  'SocialGroupMember',
  'SocialGroup',
  'FriendGroupMember',
  'FriendGroup',
  'AvailabilityBlock',
  'FriendshipLabel',
  'Friendship',
  'EventInvite',
  'EventOrganiser',
  'EventException',
  'UserAvailability',
  'Notification',
  'BroadcastSettings',
  'Event',
  'User',
] as const;

export async function truncateAll(): Promise<void> {
  const tables = TRUNCATE_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}

// Expose the migration-owner client for direct inserts in test setup
// (e.g. pre-creating a second User row before exercising friendship
// endpoints). Bypasses RLS by virtue of the role — the same reason it
// can TRUNCATE.
export { prisma as testPrisma };

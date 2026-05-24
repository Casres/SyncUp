# Backend — Seed Rebuild Agent Prompt

> **You are the Backend / Seed Rebuild agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — replace `prisma/seed.ts` with a complete extended seed that satisfies the Seed Data Spec locked as Decision #4 in `LEAD_MANAGER.md`. You do not modify the schema, you do not add migrations, you do not add new prisma scripts to `package.json`.

---

## Critical Reminder — Read This First

The seed file is **development-only** and **must be deleted before any production deploy**. This is a hard requirement from Decision #4 in `LEAD_MANAGER.md`. Your seed file must contain a prominent header comment to that effect (exact wording specified in the "Mandatory file header" section below), and your HANDOFF must reiterate the deletion gate for the DevOps Railway Deploy agent's checklist.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-api/`. The following backend work is complete and must not be touched:

| Agent | Output | Key files |
|---|---|---|
| Schema / Migrations | `schema.prisma` with all 18 models + RLS migrations + `deletedAt` on User/Event/Friendship/SocialGroup | `social-calendar-api/prisma/` |
| Auth (Clerk) | Per-request user upsert + RLS transaction | `src/middleware/auth.middleware.ts` |
| Events Domain | Event/EventOrganiser/EventException/EventInvite write patterns | `src/routes/EVENTS_HANDOFF.md` |
| Friends Domain | Friendship/FriendshipLabel/AvailabilityBlock/FriendGroup write patterns | `src/routes/FRIENDS_HANDOFF.md` |
| Groups Domain | SocialGroup/SocialGroupMember/GroupPoll/PollOption/PollVote/EventSuggestion/SuggestionVote write patterns | `src/routes/GROUPS_HANDOFF.md` |
| Backend Cleanup | Dual Prisma client (`prisma` = migration owner, `prismaApp` = restricted role) | `src/BACKEND_CLEANUP_HANDOFF.md` |

**Read these files before writing any code:**

- `social-calendar-api/CLAUDE.md` — Decisions Made section, especially Decision #4 (Seed data) at the top of the "Decisions Made" block. Confirms the extended seed spec is locked.
- `social-calendar-api/prisma/schema.prisma` — every model, enum, relation, and unique constraint. Your seed writes to ALL of: `User`, `Friendship`, `FriendshipLabel`, `AvailabilityBlock`, `SocialGroup`, `SocialGroupMember`, `Event`, `EventOrganiser`, `EventException`, `EventInvite`, `GroupPoll`, `PollOption`, `PollVote`, `EventSuggestion`. (You do NOT write `UserAvailability`, `SuggestionVote`, or `FriendGroup` — see "Out of Scope" below.)
- `social-calendar-api/prisma/seed.ts` — the current 2-user/1-event minimal seed. You are replacing this file in its entirety.
- `social-calendar-api/prisma/HANDOFF.md` — note the runtime contract; you do NOT need RLS for seeding (you connect as the migration owner via `DATABASE_URL`).
- `LEAD_MANAGER.md` — Decision #4 ("Seed Data Spec") and the seed-deletion gate.
- `social-calendar-api/package.json` — confirm there is a `prisma.seed` entry pointing to `prisma/seed.ts` (or `ts-node prisma/seed.ts` / `tsx prisma/seed.ts`). If absent, flag in HANDOFF — do not add it (that's DevOps).
- `social-calendar-mobile/src/mocks/MOCKS_HANDOFF.md` — read the user table and event table. Your seed should align in spirit with the mock data the frontend already uses for dev — same archetypes (no-availability friend, blocked friend, co-host event, recurring with exceptions, closed poll). You do NOT have to use the same IDs, but using the same usernames and event titles makes manual cross-stack testing easier; flag if you diverge.

---

## Non-Negotiable Contracts

These rules are locked. Do not deviate.

### 1. Idempotent — runs cleanly multiple times

`prisma db seed` may be invoked repeatedly during development. Every write MUST use `upsert` keyed on a deterministic external identifier (`clerkId` for users, an explicit seeded `id` for everything else). Re-running the seed is a no-op for unchanged rows.

```ts
// ✅ correct — deterministic, repeatable
await prisma.user.upsert({
  where: { clerkId: 'seed_clerk_alice' },
  update: { displayName: 'Alice Anderson' },
  create: { clerkId: 'seed_clerk_alice', username: 'alice', displayName: 'Alice Anderson' },
});

// ❌ wrong — non-deterministic; creates duplicates on re-run
await prisma.user.create({ data: { clerkId: `seed_${Math.random()}`, ... } });
```

### 2. Use the migration-owner Prisma client (`DATABASE_URL`), not `prismaApp`

The seed bypasses RLS because it has to insert rows for many users simultaneously. The migration-owner role owns the tables and is exempt from RLS — this is the correct role for seeding. Instantiate a fresh `PrismaClient()` at the top of the file (it reads `DATABASE_URL` automatically). Do NOT import `prisma` or `prismaApp` from `src/config/prisma.ts` — the seed must be runnable standalone via `prisma db seed`, with no dependency on the running app.

### 3. Single `await prisma.$transaction([...])` wrapper for atomicity, OR sequential `await` calls

You may either (a) wrap related writes in a Prisma interactive transaction (`prisma.$transaction(async (tx) => ...)`) or (b) execute sequentially with `await` — both are acceptable. Prefer sequential `await` with stable seed IDs for readability; transactions are only required for related writes that MUST commit together (e.g., creating an Event + its CREATOR EventOrganiser row).

### 4. TypeScript strict — no `any`

Import enums from `@prisma/client` (`FriendshipStatus`, `SocialGroupRole`, `EventOrganiserRole`, `EventExceptionType`, `InviteStatus`, `Recurrence`). No string-literal enum values — use the enum members.

### 5. Deterministic IDs for non-`User` rows

Use seeded string literals like `'seed-event-1'`, `'seed-group-1'`, `'seed-poll-closed'`. Prefix every seed ID with `seed-` so a future audit query (`SELECT * FROM "Event" WHERE id LIKE 'seed-%'`) can identify and remove all seed data in one pass. Users use `clerkId` as the upsert key, not a seeded ID (since `User.id` is `cuid()`-generated and the auth middleware does the upsert by `clerkId` in production).

### 6. Dates are relative to seed runtime via helpers

Hardcoded calendar dates (`new Date('2026-05-10...')`) go stale fast. Use a helper:

```ts
const NOW = new Date();
function daysFromNow(d: number, hours = 0): Date {
  const t = new Date(NOW);
  t.setDate(t.getDate() + d);
  t.setHours(hours, 0, 0, 0);
  return t;
}
```

The "past event" is `daysFromNow(-7)`; the "upcoming event" is `daysFromNow(+7)`; the recurring event's first instance is `daysFromNow(-14)` with weekly recurrence, etc. Mirrors the `isoOffset()` pattern the Mock Data Layer agent established for the frontend.

### 7. No data outside the spec

Decision #4 is the closed list. Do not invent extra users, events, friendships, or polls "for completeness." Every row in the database after `prisma db seed` must be traceable to a bullet in the spec below.

---

## Mandatory File Header

The very top of the new `prisma/seed.ts` MUST be this exact comment block (copy verbatim):

```ts
/**
 * ============================================================================
 *  SyncUp — Development Seed Data
 * ============================================================================
 *
 *  ⚠️  DELETE THIS FILE BEFORE PRODUCTION DEPLOY  ⚠️
 *
 *  This file populates the database with development-only fixture data.
 *  It must NEVER run against a production database.
 *
 *  Per LEAD_MANAGER.md Decision #4 (Seed Data Spec, locked 2026-05-02):
 *  - This file (prisma/seed.ts) MUST be removed before any production deploy.
 *  - The `prisma.seed` entry in package.json MUST be removed at the same time.
 *  - The DevOps Railway Deploy checklist (DEPLOY_CHECKLIST.md) gates on both.
 *
 *  How to identify seed rows for a manual purge:
 *      SELECT * FROM "Event"        WHERE id LIKE 'seed-%';
 *      SELECT * FROM "SocialGroup"  WHERE id LIKE 'seed-%';
 *      SELECT * FROM "User"         WHERE "clerkId" LIKE 'seed_clerk_%';
 *      ... (every seed row uses the 'seed-' / 'seed_clerk_' prefix.)
 *
 *  How to run (development only):
 *      cd social-calendar-api
 *      npx prisma db seed
 *
 *  Spec source of truth: LEAD_MANAGER.md → "Seed Data Spec (Decision #4)"
 * ============================================================================
 */
```

Do not abbreviate, paraphrase, or "improve" this header. It is the load-bearing reminder.

---

## Seed Data Spec — Decision #4 (Exact)

Build exactly the following. Every bullet is required.

### Users (5 total, all upsert by `clerkId`)

| `clerkId` | `username` | `displayName` | Role in seed |
|---|---|---|---|
| `seed_clerk_alice`   | `alice`   | Alice Anderson | The primary "logged-in" perspective; creator of the upcoming event; ADMIN of seed group #1; co-host of one event (NOT creator); has populated availability. |
| `seed_clerk_bob`     | `bob`     | Bob Brown      | Friend (BFF label). Receives upcoming event invite (RSVP: ACCEPTED). |
| `seed_clerk_carol`   | `carol`   | Carol Chen     | Friend (coworker label). Receives upcoming event invite (RSVP: MAYBE). NO availability set at all — tests "unknown" state. |
| `seed_clerk_dan`     | `dan`     | Dan Davies     | Friend (family label). Receives upcoming event invite (RSVP: DECLINED). Has blocked their availability from Alice via `AvailabilityBlock`. |
| `seed_clerk_eve`     | `eve`     | Eve Edwards    | PENDING incoming friend request to Alice (initiator: Eve, receiver: Alice). Member of seed group #2 (where Alice is also a regular member, not admin). Creator of seed group #2. |

All five users get default values for the boolean notif fields (omit; the schema defaults handle it). `bio`, `avatarUrl` are nullable; you may include short bios for Alice/Bob/Eve, leave Carol/Dan with `null`.

### Friendships (`Friendship` + `FriendshipLabel`)

| Initiator | Receiver | `status` | Alice's label | Other party's label |
|---|---|---|---|---|
| Alice | Bob   | `ACCEPTED` | `'BFF'`      | `'friend'`   |
| Alice | Carol | `ACCEPTED` | `'coworker'` | `'coworker'` |
| Alice | Dan   | `ACCEPTED` | `'family'`   | `'family'`   |
| Eve   | Alice | `PENDING`  | (no label — pending)  | (no label) |

`FriendshipLabel` is owned per-party. For each ACCEPTED friendship, create TWO `FriendshipLabel` rows — one with `ownerId = Alice.id` and the label from Alice's column, one with `ownerId = otherParty.id` and the label from their column. The `@@unique([friendshipId, ownerId])` constraint enforces one label per owner per friendship.

Deterministic IDs:
- `friendship-alice-bob`, `friendship-alice-carol`, `friendship-alice-dan`, `friendship-eve-alice`
- `label-alice-friendship-bob`, `label-bob-friendship-alice` (and so on for each label row)

### AvailabilityBlock

One row:

```
blocker: Dan      blocked: Alice      (Dan has hidden their availability from Alice)
```

Deterministic ID: `block-dan-alice`. `@@unique([blockerId, blockedId])` is the upsert key.

### SocialGroups

Two groups, both upserted by `id`:

**Seed Group 1 — `seed-group-1` "Weekend Crew"**
- `description`: `'Whoever's free this weekend.'`
- `avatarUrl`: null
- Members (via atomic write — group create + member creates in one transaction):
  - Alice — `role: ADMIN` — `id: seed-member-1-alice`
  - Bob   — `role: MEMBER` — `id: seed-member-1-bob`
  - Carol — `role: MEMBER` — `id: seed-member-1-carol`
  - Dan   — `role: MEMBER` — `id: seed-member-1-dan`

**Seed Group 2 — `seed-group-2` "Book Club"**
- `description`: `'Monthly meets — TBD on each book.'`
- `avatarUrl`: null
- Members:
  - Eve   — `role: ADMIN`  — `id: seed-member-2-eve` (creator)
  - Alice — `role: MEMBER` — `id: seed-member-2-alice` (Alice is a regular member here — verifies admin controls are hidden for her on this group)

Use the schema's `@@unique([socialGroupId, userId])` as the upsert key for `SocialGroupMember`.

### Events

Four events, all upserted by `id`:

**Seed Event 1 — `seed-event-upcoming` "Rooftop Dinner"**
- `creatorId`: Alice
- `startsAt`: `daysFromNow(+7, 19)`  (7 days from now, 7pm)
- `endsAt`:   `daysFromNow(+7, 22)`
- `location`: `'5th Ave Rooftop'`
- `description`: `'Bring a dish to share.'`
- `recurrence`: `Recurrence.NONE`
- `allowSuggestionVoting`: `false`
- `EventOrganiser` row: `seed-org-upcoming-alice-creator` — Alice, role `CREATOR`. Write in same transaction as the Event.
- `EventInvite` rows (4) — write each as `upsert` keyed by `@@unique([eventId, recipientId])`:
  - Bob   → status `ACCEPTED`   — `id: seed-invite-upcoming-bob`
  - Carol → status `MAYBE`      — `id: seed-invite-upcoming-carol`
  - Dan   → status `DECLINED`   — `id: seed-invite-upcoming-dan`
  - Eve   → status `PENDING`    — `id: seed-invite-upcoming-eve` (the "no response yet" case)

This single event satisfies the "full spread of RSVP states" requirement.

**Seed Event 2 — `seed-event-past` "Coffee Catchup"**
- `creatorId`: Alice
- `startsAt`: `daysFromNow(-7, 10)` (7 days ago, 10am)
- `endsAt`:   `daysFromNow(-7, 11)`
- `location`: `'Bow Bridge, Central Park'`
- `recurrence`: `Recurrence.NONE`
- `EventOrganiser`: `seed-org-past-alice-creator` — Alice CREATOR
- `EventInvite`: Bob → `ACCEPTED` (`id: seed-invite-past-bob`)

**Seed Event 3 — `seed-event-recurring` "Weekly Standup"**
- `creatorId`: Eve
- `startsAt`: `daysFromNow(-14, 9)` (template anchor — 2 weeks ago, 9am)
- `endsAt`:   `daysFromNow(-14, 10)`
- `location`: `'Zoom'`
- `recurrence`: `Recurrence.WEEKLY`
- `recurrenceRuleRaw`: `null` (the enum is enough — recurrenceRuleRaw is for RRULE strings only)
- `EventOrganiser`: `seed-org-recurring-eve-creator` — Eve CREATOR
- `EventInvite`: Alice → `ACCEPTED` (`id: seed-invite-recurring-alice`)
- **`EventException` rows (two)** — upsert keyed by `@@unique([eventId, originalDate])`:
  1. `seed-exception-recurring-cancelled`:
     - `originalDate`: `daysFromNow(0, 9)` (today's instance — would have been the third occurrence)
     - `type`: `EventExceptionType.CANCELLED`
     - all override fields null (cancellation needs no field overrides)
  2. `seed-exception-recurring-rescheduled`:
     - `originalDate`: `daysFromNow(+7, 9)` (next week's instance)
     - `type`: `EventExceptionType.RESCHEDULED`
     - `startsAt`: `daysFromNow(+8, 14)` (moved to next-day 2pm)
     - `endsAt`:   `daysFromNow(+8, 15)`
     - `title`, `description`, `location`: null (inherit from parent)

This event satisfies the "recurring event with at least one cancelled exception and one rescheduled exception" requirement.

**Seed Event 4 — `seed-event-cohost` "Trivia Night"**
- `creatorId`: Bob (not Alice)
- `startsAt`: `daysFromNow(+14, 20)` (2 weeks from now, 8pm)
- `endsAt`:   `daysFromNow(+14, 22)`
- `location`: `'The Brass Tap'`
- `recurrence`: `Recurrence.NONE`
- `EventOrganiser` rows (two — both atomic with the Event create):
  - `seed-org-cohost-bob-creator`: Bob, role `CREATOR`
  - `seed-org-cohost-alice-cohost`: Alice, role `CO_HOST`
- `EventInvite` rows:
  - Carol → `PENDING` (`id: seed-invite-cohost-carol`)
  - Dan   → `PENDING` (`id: seed-invite-cohost-dan`)

This event satisfies the "one event where the seed user (Alice) is a co-host, not the creator" requirement.

### GroupPoll + PollOption + PollVote (Closed poll with results)

One closed poll in `seed-group-1`:

**`seed-poll-closed` "Where should we eat after?"**
- `socialGroupId`: `seed-group-1`
- `eventId`: `seed-event-upcoming` (poll is tied to the rooftop dinner)
- `createdById`: Alice
- `question`: `'Where should we eat after?'`
- `closedAt`: `daysFromNow(-1)` (closed yesterday)

**PollOptions (3 options):**
- `seed-poll-closed-option-1` — `'Pizza place on 6th'` — `order: 0`
- `seed-poll-closed-option-2` — `'Taco truck'` — `order: 1`
- `seed-poll-closed-option-3` — `'Skip food, more drinks'` — `order: 2`

**PollVotes (deterministic IDs, upsert by `@@unique([pollOptionId, userId])`):**
- Option 1 (Pizza): voted by Alice, Bob → 2 votes
- Option 2 (Taco):  voted by Carol     → 1 vote
- Option 3 (Skip):  voted by Dan       → 1 vote

`PollVote` IDs: `seed-vote-closed-pizza-alice`, `seed-vote-closed-pizza-bob`, `seed-vote-closed-taco-carol`, `seed-vote-closed-skip-dan`.

This single poll satisfies the "closed poll with results already in" requirement.

### EventSuggestion

One suggestion in `seed-group-1` (no votes — `allowSuggestionVoting=false` on the linked event):

**`seed-suggestion-1` "Move dinner to Friday?"**
- `socialGroupId`: `seed-group-1`
- `eventId`: `seed-event-upcoming`
- `suggestedById`: Bob
- `title`: `'Move dinner to Friday?'`
- `description`: `'Saturday is packed.'`
- `proposedDate`: `daysFromNow(+6, 19)`

This satisfies the "one suggestion inside the group" baseline. We do NOT seed `SuggestionVote` rows — `seed-event-upcoming` has `allowSuggestionVoting: false` so suggestion voting is gated off (test path).

---

## Out of Scope (Do NOT Seed)

- `UserAvailability` rows — the calendar windows model. The "varied availability patterns across users" line in Decision #4 refers to the FRONTEND mock data (`src/mocks/availability.ts`), which is independent of this seed. The backend availability domain service has not shipped yet — flag in HANDOFF that when it does, this seed should grow to include `UserAvailability` rows for Alice (populated 30-day window), Bob (sparse), Carol (none — already represented by absence), and Eve (sparse). For now, the backend has no availability data; that's intentional.
- `FriendGroup` and `FriendGroupMember` — the private bulk-invite list. Not in Decision #4; leave it for a future seed extension.
- `SuggestionVote` — see EventSuggestion section above; the seeded event has voting disabled.
- Notifications — there is no Notification table yet.
- Any soft-deleted tombstones (rows with `deletedAt` set) — leave that to integration tests.

---

## Files to Create / Modify

```
prisma/seed.ts                            ← REPLACE (whole-file rewrite — `Write` tool overwrite is fine)
prisma/SEED_HANDOFF.md                    ← CREATE (write last)
```

Do not modify:
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `package.json` (the `prisma.seed` entry should already exist — if missing, flag in HANDOFF, do not add)
- Any file under `src/`

---

## Suggested Code Structure

```ts
/** [mandatory file header — see above] */

import { PrismaClient, FriendshipStatus, SocialGroupRole, EventOrganiserRole, EventExceptionType, InviteStatus, Recurrence } from '@prisma/client';

const prisma = new PrismaClient();

const NOW = new Date();
function daysFromNow(d: number, hours = 0): Date {
  const t = new Date(NOW);
  t.setDate(t.getDate() + d);
  t.setHours(hours, 0, 0, 0);
  return t;
}

// 1. Users
async function seedUsers() { /* 5 upserts by clerkId, return ID map */ }

// 2. Friendships + Labels
async function seedFriendships(userIds: Record<string, string>) { /* 4 friendships + 6 labels */ }

// 3. AvailabilityBlock
async function seedAvailabilityBlocks(userIds: Record<string, string>) { /* 1 block */ }

// 4. SocialGroups + Members (atomic per group via $transaction)
async function seedSocialGroups(userIds: Record<string, string>) { /* 2 groups + 6 member rows */ }

// 5. Events + Organisers + Invites + Exceptions
async function seedEvents(userIds: Record<string, string>) { /* 4 events */ }

// 6. Polls + Options + Votes
async function seedPolls(userIds: Record<string, string>) { /* 1 closed poll + 3 options + 4 votes */ }

// 7. Suggestions
async function seedSuggestions(userIds: Record<string, string>) { /* 1 suggestion */ }

async function main() {
  console.log('🌱 [seed] starting');
  const userIds = await seedUsers();
  await seedFriendships(userIds);
  await seedAvailabilityBlocks(userIds);
  await seedSocialGroups(userIds);
  await seedEvents(userIds);
  await seedPolls(userIds);
  await seedSuggestions(userIds);
  console.log('🌱 [seed] complete');
  console.log('   primary user: alice (clerkId=seed_clerk_alice)');
  console.log('   try: GET /events/seed-event-upcoming');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

Implementing every helper function exactly to the spec above is the bulk of the work. Each helper takes a `Record<string, string>` of user IDs keyed by username so downstream helpers don't have to re-query.

---

## What NOT to Build

- Tests for the seed — the seed exists for dev convenience; integration tests own their own truncate-and-recreate cycle (per `JEST_HANDOFF.md`).
- A "reset" script that purges the seed — Decision #4's deletion gate is a manual checklist item, not a runtime command. Add the SQL hints into the file header (already in the mandatory header above) and stop.
- Auth (`User.deletedAt` etc.) edge cases beyond Decision #4.
- Cross-cutting refactoring of any existing service code to make seeding easier — the seed is self-contained, uses raw Prisma writes, and does not import from `src/`.
- Localization / i18n of the seed strings — English-only is fine for dev.
- Photos / avatars / cover images — `avatarUrl` may be `null` everywhere; mobile renders the letter fallback.

---

## Verification

Before writing the HANDOFF:

1. `cd social-calendar-api && npx tsc --noEmit` passes with zero errors.
2. With Postgres running locally and migrations applied, `npx prisma db seed` runs to completion without error.
3. Re-running `npx prisma db seed` is a no-op (no duplicates, no errors). This is the idempotency check.
4. Quick spot-checks (via `psql` or Prisma Studio):
   - `SELECT count(*) FROM "User";` → 5
   - `SELECT count(*) FROM "Friendship";` → 4
   - `SELECT count(*) FROM "FriendshipLabel";` → 6 (3 accepted friendships × 2 labels each = 6; the pending Eve→Alice has no labels)
   - `SELECT count(*) FROM "AvailabilityBlock";` → 1
   - `SELECT count(*) FROM "SocialGroup";` → 2
   - `SELECT count(*) FROM "SocialGroupMember";` → 6
   - `SELECT count(*) FROM "Event";` → 4
   - `SELECT count(*) FROM "EventOrganiser";` → 5 (1 for past, 1 for upcoming, 1 for recurring, 2 for co-host)
   - `SELECT count(*) FROM "EventInvite";` → 7 (4 upcoming + 1 past + 1 recurring + 2 co-host)
   - `SELECT count(*) FROM "EventException";` → 2
   - `SELECT count(*) FROM "GroupPoll";` → 1
   - `SELECT count(*) FROM "PollOption";` → 3
   - `SELECT count(*) FROM "PollVote";` → 4
   - `SELECT count(*) FROM "EventSuggestion";` → 1
   - `SELECT count(*) FROM "SuggestionVote";` → 0

If Postgres is not reachable in your environment, document that in HANDOFF with "schema-validated only — DB run pending Postgres availability" and flag for Lead Manager.

---

## Handoff Document

When all code is done, `tsc --noEmit` passes, and the seed runs idempotently (or is schema-validated where DB is unreachable), write `prisma/SEED_HANDOFF.md`:

1. **What was built** — confirm `prisma/seed.ts` was rewritten end-to-end; row-count table from the Verification section above
2. **Mandatory header confirmation** — confirm the production-deletion warning block is present at the top of `prisma/seed.ts` verbatim
3. **Deletion gate reminder** — reiterate that the file + `package.json prisma.seed` entry MUST be deleted before any production deploy. The DevOps Railway Deploy agent's `DEPLOY_CHECKLIST.md` already gates on this — confirm it still does, or flag if it doesn't.
4. **Idempotency verification** — confirm a second `prisma db seed` invocation produced no duplicates and no errors
5. **Decisions made** — every place you had to choose between two reasonable interpretations of the spec (e.g., should the "PENDING incoming friend request" have labels? No, because labels are typically only meaningful post-acceptance — flag if Friends Domain disagrees.)
6. **Out-of-scope items flagged** — restate the `UserAvailability` deferral, the `FriendGroup` deferral, the `SuggestionVote` empty-state rationale
7. **Cross-stack alignment** — note whether your usernames/handles match `social-calendar-mobile/src/mocks/users.ts` (the mobile seed uses `me`, `sasha`, `marcus`, `priya`, `jordan`; the backend seed uses `alice`, `bob`, `carol`, `dan`, `eve`). If divergent, that is intentional — flag for the Lead Manager. A future alignment ticket can reconcile.
8. **Open items for the Lead Manager** — when the Availability domain service ships, this seed should grow to include `UserAvailability` rows; flag a follow-up. When the Notifications service ships, same.

---

## Final Checklist

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] `prisma/seed.ts` opens with the mandatory production-deletion header block, verbatim
- [ ] All 5 users seeded with the exact `clerkId`s, usernames, and roles in the spec
- [ ] All 4 friendships seeded with the correct `status` and the correct label rows (6 total)
- [ ] 1 AvailabilityBlock seeded (Dan blocks Alice)
- [ ] 2 SocialGroups seeded with members in the exact role assignments (Alice ADMIN of group 1, regular MEMBER of group 2)
- [ ] 4 Events seeded with correct creators, organisers, and invites
- [ ] Recurring event has exactly 2 `EventException` rows (1 CANCELLED + 1 RESCHEDULED)
- [ ] Co-host event has 2 `EventOrganiser` rows (CREATOR + CO_HOST)
- [ ] Upcoming event RSVPs span ACCEPTED / MAYBE / DECLINED / PENDING — one of each
- [ ] 1 closed poll with 3 options and 4 votes seeded
- [ ] 1 suggestion seeded (no votes)
- [ ] Every non-User row uses a `seed-`-prefixed ID; every User uses a `seed_clerk_`-prefixed clerkId
- [ ] No imports from `src/` in `prisma/seed.ts` — the seed is standalone
- [ ] Re-running `prisma db seed` is a no-op (idempotency verified, or schema-validated if DB unreachable)
- [ ] `SEED_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for Seed Rebuild → `COMPLETE (date)` with explicit note that file deletion is still gated on the DevOps deploy checklist

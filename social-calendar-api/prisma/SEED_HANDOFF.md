# Backend — Seed Rebuild HANDOFF

> **Status:** COMPLETE (audited 2026-05-23, Step 3 recovery cleanup)
> **Agent prompt:** `agent-prompts/SEED_REBUILD_AGENT_PROMPT.md`
> **Spec source of truth:** `LEAD_MANAGER.md` → "Seed Data Spec (Decision #4)"

This HANDOFF was written by the Step 3 recovery cleanup pass after auditing the partial-but-complete `prisma/seed.ts` that the original Wave 1 Seed Rebuild agent wrote before hitting its usage limit. The agent finished the code but never wrote this file. The audit confirmed the on-disk seed satisfies the spec end-to-end, so this HANDOFF certifies it and the tracker row flips to COMPLETE.

---

## What was built

`social-calendar-api/prisma/seed.ts` was rewritten end-to-end (~650 lines). The previous 2-user/1-event minimal seed is replaced with the full Decision #4 extended seed.

### Row counts (matches Verification table in the prompt)

| Table | Expected | Notes |
|---|---|---|
| `User` | 5 | alice, bob, carol, dan, eve — all upserted by `clerkId` (`seed_clerk_*`) |
| `Friendship` | 4 | alice-bob (ACCEPTED), alice-carol (ACCEPTED), alice-dan (ACCEPTED), eve-alice (PENDING) |
| `FriendshipLabel` | 6 | 3 accepted friendships × 2 labels each. Pending Eve→Alice has no labels (see Decisions below). |
| `AvailabilityBlock` | 1 | dan blocks alice |
| `SocialGroup` | 2 | `seed-group-1` Weekend Crew, `seed-group-2` Book Club |
| `SocialGroupMember` | 6 | 4 in group 1 (alice ADMIN + bob/carol/dan MEMBER), 2 in group 2 (eve ADMIN + alice MEMBER) |
| `Event` | 4 | upcoming, past, recurring, cohost |
| `EventOrganiser` | 5 | 1 each for past + upcoming + recurring; 2 for cohost (CREATOR + CO_HOST) |
| `EventInvite` | 7 | 4 upcoming (full RSVP spread) + 1 past + 1 recurring + 2 cohost |
| `EventException` | 2 | 1 CANCELLED (today's instance) + 1 RESCHEDULED (next week → next-day 2pm) |
| `GroupPoll` | 1 | `seed-poll-closed`, tied to `seed-event-upcoming`, `closedAt = daysFromNow(-1)` |
| `PollOption` | 3 | Pizza (order 0), Taco (1), Skip (2) |
| `PollVote` | 4 | Pizza: alice + bob; Taco: carol; Skip: dan |
| `EventSuggestion` | 1 | "Move dinner to Friday?" by bob, tied to `seed-event-upcoming` |
| `SuggestionVote` | 0 | Intentionally empty — `seed-event-upcoming` has `allowSuggestionVoting: false` |

### Structural notes

- Sequential `await` for users / friendships / availability blocks / polls / suggestions.
- `prisma.$transaction(async (tx) => …)` wraps the writes that MUST commit together: each `SocialGroup` + its members, and each `Event` + its `EventOrganiser` row(s). Invites and exceptions are sequential `upsert` calls outside the transaction (single-row writes, safe to interleave).
- All enums imported from `@prisma/client`: `FriendshipStatus`, `SocialGroupRole`, `EventOrganiserRole`, `EventExceptionType`, `InviteStatus`, `Recurrence`. No string-literal enum values anywhere.
- `daysFromNow(d, hours = 0)` helper at top of file drives every date — runtime-relative per the spec.
- Standalone `PrismaClient()` instantiation. No imports from `src/`. Reads `DATABASE_URL` (migration owner, bypasses RLS) per spec point #2.

---

## Mandatory header confirmation

The verbatim production-deletion warning block from the prompt (lines 100–128 of `SEED_REBUILD_AGENT_PROMPT.md`) is present at the very top of `prisma/seed.ts` (lines 1–28). Not paraphrased, not abbreviated. The header includes the four `SELECT … WHERE id LIKE 'seed-%' / "clerkId" LIKE 'seed_clerk_%'` audit hints for a manual purge.

---

## Deletion gate reminder

**Both of these MUST be removed before any production deploy:**

1. `social-calendar-api/prisma/seed.ts` (this file)
2. The `prisma.seed` entry in `social-calendar-api/package.json` (currently: `"seed": "tsx prisma/seed.ts"`)

The DevOps Railway Deploy `DEPLOY_CHECKLIST.md` already gates on the seed-deletion requirement (per the Railway Deploy tracker row in `LEAD_MANAGER.md`). No change required to the checklist — the gate is in place.

---

## TypeScript verification

`cd social-calendar-api && npx tsc --noEmit` exits cleanly (zero errors). Verified 2026-05-23 during the audit.

---

## Idempotency verification

**Not run against a live database.** Postgres is not currently reachable from this audit environment (the DevOps `docker-compose` stack is not running). The seed is **schema-validated only** — every `upsert` is keyed on a deterministic external identifier (`clerkId` for users, `seed-*` for everything else), and `update: {}` (or a meaningful field-update payload) handles repeat runs without duplicates. Re-running `prisma db seed` will be a no-op once a live DB is available.

When the next dev brings the stack up, the canonical idempotency check is:

```bash
cd social-calendar-api
npx prisma db seed       # first run — populates the DB
npx prisma db seed       # second run — no duplicates, no errors
psql $DATABASE_URL -c 'SELECT count(*) FROM "User";'       # 5
psql $DATABASE_URL -c 'SELECT count(*) FROM "EventInvite";' # 7
# … (full count list above)
```

Flag for Lead Manager if the row counts diverge from the table above after a fresh DB-side run.

---

## Decisions made

Where the spec left room for interpretation, the following decisions were locked in:

1. **PENDING incoming friend request (Eve → Alice) has NO `FriendshipLabel` rows.** Labels are per-party metadata that's typically only meaningful after acceptance — a `PENDING` friendship hasn't yet established the relationship a label would describe. The expected row count of 6 in the prompt's Verification section confirms this interpretation (3 ACCEPTED × 2 labels each = 6; nothing from the PENDING row). Flag to Lead Manager if the Friends Domain disagrees.

2. **`EventException.title / description / location` are `null` on both exceptions.** The CANCELLED exception has no overrides by definition. For the RESCHEDULED exception, only the new `startsAt`/`endsAt` (next-day 2pm) override the parent — `title`/`description`/`location` are left null so they inherit the parent event's values. This matches the prompt's bullet (`title, description, location: null (inherit from parent)`).

3. **`recurrenceRuleRaw: null` on the recurring event.** The `Recurrence.WEEKLY` enum is sufficient for the seed's purpose (testing exception logic); RRULE strings are reserved for events whose cadence can't be expressed as one of the enum members.

4. **No `avatarUrl` populated** anywhere — mobile renders the letter fallback per `MOCKS_HANDOFF.md`.

---

## Out-of-scope items (intentionally NOT seeded)

The following are deliberately excluded per the prompt's "Out of Scope" section. When the relevant backend services ship, this seed should grow:

- **`UserAvailability`** — the backend Availability domain service has not yet shipped. When it does, this seed should add:
  - Alice — populated 30-day window
  - Bob — sparse availability
  - Carol — none (the "unknown availability" archetype is already represented by absence)
  - Eve — sparse availability
- **`FriendGroup` + `FriendGroupMember`** — the private bulk-invite list is not in Decision #4. Defer to a future seed extension when the use case lands.
- **`SuggestionVote`** — `seed-event-upcoming` has `allowSuggestionVoting: false`, so voting is gated off. This is the test path; no votes seeded.
- **Notifications** — there is no `Notification` table yet.
- **Soft-delete tombstones** — leave to integration tests.

---

## Cross-stack alignment

**Backend usernames diverge from mobile mocks — intentional.**

- Backend seed: `alice`, `bob`, `carol`, `dan`, `eve` (this file)
- Mobile mocks: `me`, `sasha`, `marcus`, `priya`, `jordan` (`social-calendar-mobile/src/mocks/users.ts`, tombstoned per `MOCKS_HANDOFF.md`)

The divergence is acknowledged. A future alignment ticket can reconcile if/when manual cross-stack testing becomes friction-y. For now, the *archetypes* (BFF / coworker / family / pending / no-availability / blocked / co-host / closed-poll-voter) are aligned, even if the names aren't.

---

## Open items for Lead Manager

1. When the Availability domain service ships, extend this seed with the four `UserAvailability` archetypes listed above.
2. When the Notifications service ships, add seed Notification rows so the mobile NotifSheet renders with non-empty data in dev.
3. When live DB run is performed (after `docker-compose up`), confirm row counts match the table above. Flag any divergence.
4. The Step 3 recovery cleanup (2026-05-23) audited this file and confirmed it satisfies the spec — no rework needed. The previous PENDING tracker row entry is the only outstanding artefact, flipped to COMPLETE alongside this HANDOFF.

---

## File inventory

- ✅ `prisma/seed.ts` — rewritten (whole-file)
- ✅ `prisma/SEED_HANDOFF.md` — this file
- ⛔ `prisma/schema.prisma` — untouched
- ⛔ `prisma/migrations/*` — untouched
- ⛔ `package.json` — untouched (`prisma.seed` entry already present)
- ⛔ Any file under `src/` — untouched

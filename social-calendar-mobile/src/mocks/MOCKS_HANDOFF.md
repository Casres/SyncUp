# Mock Data Layer — Handoff

**Status:** COMPLETE (2026-05-04)
**Owner:** Frontend / Mock Data Layer agent
**Next agent:** API Stub Layer (`src/api/`)

---

## 1. What was built

8 files under `social-calendar-mobile/src/mocks/`:

| File | Exports |
|---|---|
| `users.ts` | `MOCK_ME`, `MOCK_USERS`, `MOCK_USERS_BY_ID` |
| `friendships.ts` | `MOCK_FRIENDS`, `MOCK_PENDING_REQUESTS`, `MOCK_FRIEND_LABELS`, `MOCK_AVAILABILITY_BLOCKS` |
| `friendTypes.ts` | `MOCK_FRIEND_TYPES` |
| `events.ts` | `MOCK_EVENT_UPCOMING`, `MOCK_EVENT_PAST`, `MOCK_EVENT_RECURRING`, `MOCK_EVENT_COHOST`, `MOCK_EVENTS`, `MOCK_EVENT_ORGANISERS`, `MOCK_EVENT_RECURRENCE`, `MOCK_RSVPS` (+ `EventOrganiser`, `EventRecurrence`, `EventExceptionEntry`, `EventOrganiserRole` types) |
| `groups.ts` | `MOCK_GROUP_ADMIN`, `MOCK_GROUP_MEMBER`, `MOCK_SOCIAL_GROUPS`, `MOCK_GROUP_MEMBERS`, `MOCK_POLL_CLOSED`, `MOCK_POLL_ACTIVE`, `MOCK_POLLS`, `MOCK_POLLS_BY_GROUP`, `MOCK_SUGGESTIONS`, `MOCK_SUGGESTIONS_BY_GROUP` |
| `availability.ts` | `isoOffset`, `MOCK_MY_AVAILABILITY`, `MOCK_SASHA_AVAILABILITY`, `MOCK_MARCUS_AVAILABILITY`, `MOCK_PRIYA_AVAILABILITY`, `MOCK_JORDAN_AVAILABILITY`, `MOCK_TOMAS_AVAILABILITY`, `MOCK_AVAILABILITY`, `MOCK_BROADCAST_SETTINGS` |
| `notifications.ts` | `MOCK_NOTIFICATIONS` (placeholder — Round 6) |
| `index.ts` | Barrel export of all of the above |

`npx tsc --noEmit` passes with **zero errors**.

All records are typed against the `TYPES.ts` shapes (no `as` widening; explicit `User[]`, `Friend[]`, `Event[]`, etc. annotations or per-row `satisfies`).

---

## 2. User reference table

| id | name | handle | role in seed |
|---|---|---|---|
| `me` | Ben Rivera | `@ben` | Logged-in user. Host on event-1 / event-2 / event-3, co-host on event-4. Admin of group-1, member of group-2. |
| `user-2` | Sasha Kim | `@sasha` | **Has NO availability set** — absent from `MOCK_AVAILABILITY` entirely (tests "unknown" state on Step 3). BFF (`ft-1`). |
| `user-3` | Marcus Chen | `@marcus` | **Availability blocked from 'me'** — has data in `MOCK_MARCUS_AVAILABILITY` but `MOCK_AVAILABILITY_BLOCKS` lists `{ blockerId: 'user-3', blockedId: 'me' }`. Coworker label. |
| `user-4` | Priya Osei | `@priya` | Family label. **Creator of event-4**, with 'me' as co-host. Admin of group-2. |
| `user-5` | Jordan Lake | `@jordan` | **Pending incoming friend request to 'me'** — present in `MOCK_PENDING_REQUESTS`, NOT in `MOCK_FRIENDS`. |
| `user-6` | Tomás Reyes | `@tomas` | BFF (`ft-1`). Used to round out the RSVP roster on event-1. |

---

## 3. Event reference table

| id | title | iso (vs today) | host | special properties |
|---|---|---|---|---|
| `event-1` | Rooftop Dinner | `isoOffset(7)` | `me` | **Upcoming.** Day is `'busy'` in `MOCK_MY_AVAILABILITY` → triggers Step 3 wire-back danger banner. **Full RSVP spread:** me=yes, user-2=maybe, user-3=no, user-4=null (no response), user-6=yes. |
| `event-2` | Birthday Karaoke | `isoOffset(-21)` | `me` | **Past.** All attendees responded; closed. |
| `event-3` | Tuesday Run Club | `isoOffset(2)` | `me` | **Recurring** (WEEKLY). `MOCK_EVENT_RECURRENCE['event-3'].exceptions` contains: cancelled @ today+9, rescheduled @ today+16 → today+17 7:30am. |
| `event-4` | Sunday Long Brunch | `isoOffset(12)` | `user-4` | **'me' is co-host, not host.** `MOCK_EVENT_ORGANISERS` has `{ eventId: 'event-4', userId: 'me', role: 'COHOST' }`. |

---

## 4. Wire-back dependency (Step 3 danger banner)

Confirmed:

```
MOCK_EVENT_UPCOMING.id              === 'event-1'
MOCK_EVENT_UPCOMING.iso             === isoOffset(7)
MOCK_MY_AVAILABILITY[isoOffset(7)]  === 'busy'
∴ MOCK_MY_AVAILABILITY[MOCK_EVENT_UPCOMING.iso] === 'busy'
```

Both sides use the same `isoOffset()` helper, so the equality is invariant under "what day is today" — the wire-back fires regardless of when the agent runs. The API Stub Layer should pass this state straight through; Step 3 of the Create Event flow consults `AvailabilityEntry[eventIso]` and renders the dangerSoft banner on `'busy'` (Hard Rule 17).

---

## 5. Assumptions / inferred shapes the API Stub Layer should know about

`TYPES.ts` is the source of truth, but a few runtime concepts surface in mock data without a corresponding TYPES.ts shape. The Stub Layer should adopt these shapes verbatim (they are exported from `events.ts` and `friendships.ts`):

1. **`EventOrganiser`** — `{ eventId; userId; role: 'CREATOR' | 'COHOST' }`. TYPES.ts only carries `Event.hostId`; co-host membership requires a join. Mirrors the backend's `EventOrganiser` table (see Backend Events Domain handoff at `social-calendar-api/src/routes/EVENTS_HANDOFF.md`). Exposed as `MOCK_EVENT_ORGANISERS`.

2. **`EventRecurrence`** — `{ rule: 'DAILY' | 'WEEKLY' | 'MONTHLY'; until?; exceptions: EventExceptionEntry[] }`. TYPES.ts has no recurrence field. `EventExceptionEntry` is a discriminated union of `{ type: 'cancelled' }` and `{ type: 'rescheduled', newDate, newStartAt?, newEndAt? }`. Exposed as `MOCK_EVENT_RECURRENCE`, keyed by event id.

3. **`AvailabilityBlock`** — `{ blockerId: string; blockedId: string }`. There is no shape for this in TYPES.ts. The API Stub Layer should treat the presence of a row in `MOCK_AVAILABILITY_BLOCKS` as authoritative: a `getAvailability(blockedId)` call from `blockerId`'s perspective must return forbidden / empty regardless of what `MOCK_AVAILABILITY[blockedId]` contains.

4. **Poll closed-ness derived from `closesAt`** — TYPES.ts `Poll` has no `closed` boolean. `MOCK_POLL_CLOSED.closesAt` is `today−2 18:00`; `MOCK_POLL_ACTIVE.closesAt` is `today+5 23:59`. The Stub Layer should derive `closed = closesAt != null && new Date(closesAt) < new Date()`.

5. **Friend label catalog** — `MOCK_FRIEND_LABELS` is exported as a `[{ id, label }]` table. `Friend.category` stores the `id`. This catalog is mock-only — it isn't in TYPES.ts and isn't a backend entity (the backend stores the label directly on `Friendship` per its schema). Treat it as a UI hint table.

6. **`EventOrganiser` for events 1–3 lists 'me' as CREATOR explicitly** — the Stub Layer should NOT also derive a CREATOR row from `Event.hostId` to avoid duplicates. Always source organisers from `MOCK_EVENT_ORGANISERS`.

7. **`MOCK_RSVPS` duplicates `Event.rsvps`** — the array form is a convenience for screens that iterate (Attendees, RSVP sheet). The map form on `Event.rsvps` is the canonical write target; if the Stub Layer mutates one it must mirror to the other.

---

## 6. Final-checklist trace

- [x] `npx tsc --noEmit` passes with zero errors
- [x] All mock records satisfy their corresponding TYPES.ts type
- [x] `MOCK_MY_AVAILABILITY[isoOffset(7)] === 'busy'` — confirmed (matches `MOCK_EVENT_UPCOMING.iso`)
- [x] Sasha (user-2) has no entry in `MOCK_AVAILABILITY` (empty/unknown state)
- [x] `MOCK_AVAILABILITY_BLOCKS` includes `{ blockerId: 'user-3', blockedId: 'me' }`
- [x] One pending friend request — `MOCK_PENDING_REQUESTS[0]` is user-5 with `status: 'pending'`
- [x] One event where 'me' is co-host — `event-4`, with explicit `MOCK_EVENT_ORGANISERS` row
- [x] One recurring event with cancelled + rescheduled exceptions — `event-3` via `MOCK_EVENT_RECURRENCE`
- [x] RSVP spread on `event-1`: yes / maybe / no / null across me / user-2 / user-3 / user-4 (+ a fifth: user-6=yes)
- [x] One closed poll (`poll-1`, `closesAt = today-2`) and one active poll (`poll-2`)
- [x] One group where 'me' is admin (`group-1`) and one where 'me' is member (`group-2`)
- [x] All date values use `isoOffset()` — no hardcoded calendar dates
- [x] `src/mocks/index.ts` barrel exports everything

---

## 7. Suggested next agent

**API Stub Layer** (`src/api/`). Wraps these constants in async functions (200–500ms simulated delay) that match the eventual REST contract from `social-calendar-api/`. Read this file plus `src/mocks/index.ts` exports.

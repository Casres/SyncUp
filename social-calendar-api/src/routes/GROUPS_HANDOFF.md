# Backend — Groups Domain Agent Handoff

**Agent:** Backend / Groups Domain
**Completed:** 2026-05-04
**Per:** `LEAD_MANAGER.md` → Backend → Groups Domain row.

---

## What was built

| File | Role |
|---|---|
| `src/repositories/groups.repository.ts` | tx-aware data access for `SocialGroup`, `SocialGroupMember`, `GroupPoll`, `PollOption`, `PollVote`, `EventSuggestion`, `SuggestionVote`. All `SocialGroup` reads filter `deletedAt: null`. Atomic group-create nested write. Cascade helpers for poll + suggestion deletion. Type-safe Prisma selects via `satisfies` + `Prisma.<Model>GetPayload`. Imports `Db` from `_types.ts`. |
| `src/services/groups.service.ts` | All business logic: 404-vs-403 disambiguation, ADMIN gates, last-admin guard, atomic creator-membership, suggestion-voting check against `Event.allowSuggestionVoting`, poll-closed guards, response shapers. Domain errors enumerated below. |
| `src/controllers/groups.controller.ts` | HTTP only. Zod validation for all bodies / params / query strings. Maps domain errors to status codes. Single `handleError` helper to keep handlers tight. |
| `src/routes/groups.routes.ts` | 18 routes registered under `/groups`. |
| `src/app.ts` | `await app.register(groupsRoutes, { prefix: '/groups' })` after Friends/Events. |

`_types.ts` was created by the Friends agent during this build; per coordination protocol I switched both `groups.repository.ts` and `groups.service.ts` to import `Db` from `./_types.js` / `../repositories/_types.js` rather than continuing to re-import it from `events.repository.ts`. Events still re-exports `Db` for back-compat.

---

## Endpoint reference

All paths are prefixed with `/groups`.

### Social Groups — Core CRUD

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/` | — | 200 | Lists groups the caller is a member of. Each row includes `memberCount` + `viewerRole`. RLS also restricts to member groups; the explicit `members.some` filter lets us reuse the same query for the count + role projection. Soft-deleted groups excluded. |
| `GET` | `/:id` | — | 200, 403, 404 | Group details for a member. Returns 404 if missing/soft-deleted/RLS-hidden, 403 if visible-but-not-a-member (defensive — RLS would normally hide it and surface 404). Includes `memberCount` + `viewerRole`. |
| `POST` | `/` | `{ name*, description?, avatarUrl? }` | 201 | Atomic via Prisma nested write inside `request.prismaTransaction`: SocialGroup row + creator's SocialGroupMember (role: ADMIN) materialise together. Caller's `viewerRole` will always be `ADMIN`. |
| `PATCH` | `/:id` | any subset of `{ name, description, avatarUrl }` (description / avatarUrl nullable) | 200, 400, 403, 404 | ADMIN only. Soft-delete safety filter via `updateMany`. |
| `DELETE` | `/:id` | — | 204, 403, 404 | Soft delete (`deletedAt = now()`). ADMIN only. Member rows are intentionally left in place — they become unreachable once the group is hidden by `deletedAt: null` filtering. |

**Group response shape** (`GET /:id`, `GET /`, `POST /`, `PATCH /:id`):

```ts
{
  id, name, description, avatarUrl, createdAt, updatedAt,
  memberCount: number,
  viewerRole: 'ADMIN' | 'MEMBER',
}
```

### Members

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/:id/members` | — | 200, 403, 404 | Members + public profiles. Caller must be a member. |
| `POST` | `/:id/members` | `{ userId* }` | 201, 400, 403, 404, 409 | ADMIN only. 409 if already a member. New member is added with role `MEMBER`. |
| `DELETE` | `/:id/members/:userId` | — | 204, 400, 403, 404 | ADMIN can remove anyone; non-ADMIN can only self-leave. Last-admin guard returns 400 with `"A group must have at least one admin."`. No-op (still 204) if user wasn't a member. |
| `PATCH` | `/:id/members/:userId` | `{ role }` | 200, 400, 403, 404 | ADMIN only. Trivial role no-op short-circuits the last-admin check. Demoting the only ADMIN returns 400. |

**Member response shape:**

```ts
{
  id, socialGroupId, userId, role, joinedAt,
  user: { id, username, displayName, avatarUrl },
}
```

### Polls

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/:id/polls` | `?open=true` | 200, 403, 404 | Lists polls in the group, ordered by `createdAt desc`. `?open=true` filters to `closedAt: null`. Any member. |
| `POST` | `/:id/polls` | `{ question*, options* (2..10), eventId? }` | 201, 400, 403, 404 | Any member. Options stored as `PollOption` rows with `order` = array index. |
| `PATCH` | `/:id/polls/:pollId` | — | 200, 400, 403, 404 | Closes a poll (`closedAt = now()`). Cannot re-open (already closed → 400 via `PollClosedError`). Poll creator or group ADMIN. |
| `DELETE` | `/:id/polls/:pollId` | — | 204, 403, 404 | Hard delete. Cascade order in the same transaction: `PollVote` → `PollOption` → `GroupPoll`. Poll creator or group ADMIN. |

**Poll response shape:**

```ts
{
  id, socialGroupId, eventId, question, closedAt, createdAt,
  createdBy: { id, username, displayName, avatarUrl },
  options: [
    { id, text, order, voteCount: number, viewerHasVoted: boolean }
  ],
  totalVotes: number,
}
```

### Poll Votes

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `POST` | `/:id/polls/:pollId/options/:optionId/vote` | — | 201, 400, 403, 404, 409 | One vote per (option, user). 409 if already voted on this option. 400 if poll closed. |
| `DELETE` | `/:id/polls/:pollId/options/:optionId/vote` | — | 204, 400, 403, 404 | Idempotent — 204 even if no vote existed. 400 if poll closed (matches the spec's "Reject if poll is closed"). |

### Suggestions

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/:id/suggestions` | — | 200, 403, 404 | Lists suggestions ordered by `createdAt desc`. Includes `upvotes`, `downvotes`, `viewerVote`. Any member. |
| `POST` | `/:id/suggestions` | `{ title*, description?, proposedDate?, eventId? }` | 201, 400, 403, 404 | Any member. `proposedDate` accepts ISO 8601 strings (Zod coerces). |
| `DELETE` | `/:id/suggestions/:suggestionId` | — | 204, 403, 404 | Hard delete. Cascade `SuggestionVote` → `EventSuggestion` in the same transaction. Creator or group ADMIN. |

**Suggestion response shape:**

```ts
{
  id, socialGroupId, eventId, title, description, proposedDate, createdAt,
  suggestedBy: { id, username, displayName, avatarUrl },
  upvotes: number,
  downvotes: number,
  viewerVote: 'UP' | 'DOWN' | null,
}
```

### Suggestion Votes

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `POST` | `/:id/suggestions/:suggestionId/vote` | `{ value: 'UP' \| 'DOWN' }` | 201, 400, 403, 404 | Upserts on `@@unique([suggestionId, userId])` — atomic vote-change. If `eventId` is set on the suggestion AND that event is reachable AND `allowSuggestionVoting === false`, returns 403. |
| `DELETE` | `/:id/suggestions/:suggestionId/vote` | — | 204, 403, 404 | Idempotent — 204 even if no vote existed. |

---

## Domain errors

Defined in `src/services/groups.service.ts`:

| Error | Mapped to | When |
|---|---|---|
| `SocialGroupNotFoundError` | 404 | Group missing, soft-deleted, or RLS-hidden |
| `SocialGroupForbiddenError` | 403 | Member required / ADMIN required and the caller isn't |
| `SocialGroupLastAdminError` | 400 | Last ADMIN tried to leave or get demoted |
| `SocialGroupMemberAlreadyExistsError` | 409 | Add-member when membership row already present |
| `PollNotFoundError` | 404 | Poll id doesn't belong to the group |
| `PollClosedError` | 400 | Vote on / re-close a closed poll |
| `PollOptionNotFoundError` | 404 | Option id doesn't belong to the poll |
| `PollVoteAlreadyExistsError` | 409 | Voting twice on the same option |
| `SuggestionNotFoundError` | 404 | Suggestion id doesn't belong to the group |
| `SuggestionVotingDisabledError` | 403 | `Event.allowSuggestionVoting === false` for the suggestion's tied event |

`SocialGroupForbiddenError` covers two service-layer cases (not a member; member but not ADMIN). The error message includes the group id; the controller flattens to a generic `"Forbidden"` body to avoid leaking which case applied — still distinguishable through traffic patterns but doesn't hand attackers a free oracle.

---

## Decisions made

### `_types.ts` adoption mid-flight
The coordination note told me to skip creating `_types.ts` if it didn't exist when I started. It didn't, so my repo + service initially imported `Db` from `events.repository.ts`. The Friends Domain agent created `_types.ts` while I was working. After my code was written and `tsc` was clean, I re-pointed both imports to `_types.ts` (the canonical source) and re-verified `tsc`. Events still re-exports `Db`, so back-compat holds.

### `assertMember` returns the membership row
I considered three patterns for the per-handler permission check (a separate `requireMember` middleware decorator, a service-layer `assertMember`, RLS-only). Went with `assertMember` inside the service for two reasons:
1. We need the role anyway for the ADMIN gate — a single fetch covers both checks, no second round trip.
2. Keeps the controller dumb: one `try { … } catch (handleError) { … }` block per handler. No middleware wiring per route.

The function disambiguates 404 vs 403 by falling back to `findRawById` when the membership row is missing, even though in production RLS will hide non-member groups so both outcomes surface as 404. The explicit branch survives if RLS is ever loosened or if a future ADMIN-tier-bypass policy is added.

### Atomic group creation via Prisma nested write
`SocialGroup.create({ data: { …, members: { create: { userId, role: ADMIN } } }, … })` issues a single statement batch inside the per-request transaction. Both rows commit together. No need to wrap in a manual `$transaction` — `request.prismaTransaction` IS the transaction.

### Poll + suggestion cascade in service-layer order
The schema doesn't define DB-level cascades on `PollVote → PollOption → GroupPoll` or `SuggestionVote → EventSuggestion`. Service layer enforces the order:
1. `pollVote.deleteMany({ where: { pollOption: { pollId } } })`
2. `pollOption.deleteMany({ where: { pollId } })`
3. `groupPoll.delete({ where: { id: pollId } })`

All three statements execute on `request.prismaTransaction`, so they share the same atomic envelope. If step 3 fails (RLS denies), Postgres rolls back steps 1 and 2.

### Suggestion vote upsert
`upsert` on `@@unique([suggestionId, userId])` collapses the "first-time vote" and "change my vote" paths into one statement. The unique constraint is the upsert key. No read-then-write race window.

### `allowSuggestionVoting` check is tolerant of missing events
If the suggestion's `eventId` points at an event that's been soft-deleted or RLS-hidden, `findEventVotingFlag` returns null. I treat null as "no restriction" — voting proceeds. Rationale: the gating signal is unreachable, the suggestion still exists in the group, and locking voting because we can't read the event would surprise users for an entirely separate reason. If product wants a stricter "fail closed" stance, this is a one-line change in `voteOnSuggestion`.

### `viewerHasVoted` and `viewerVote` derived in-memory
Both are computed by iterating the included `votes` relation rather than running a separate "did this user vote" query per row. This adds a small per-row payload (one row per vote) but eliminates the N+1 I'd otherwise have on the list endpoints. For a poll with thousands of votes this could become heavy — flag for performance review later.

### `?open=true` is the only filter on the polls list
Spec said "optional `?open=true` to filter to unclosed polls only." I parsed it as a literal string `'true'` (Zod `z.literal('true')`) rather than `z.coerce.boolean()` because Fastify query params are strings and `coerce.boolean('false')` evaluates to `true` in JS. Anything other than `'true'` returns all polls. `?open=false` is intentionally indistinguishable from omitting the filter.

### Last-admin guard short-circuits on no-op role updates
`PATCH /:id/members/:userId { role: 'ADMIN' }` against a user already ADMIN returns the existing row without running the admin-count check. This avoids spurious last-admin errors when the API client retries an idempotent PATCH.

### Soft-delete leaves member rows behind
Per the spec: "Does NOT cascade-delete members — soft-deleted groups are hidden from reads by `deletedAt: null` filtering; member rows become orphaned but are harmless." Confirmed implementation matches. If the data model gains a per-user "groups I'm in" inverse query that bypasses the SocialGroup RLS, those orphaned rows could resurface — flag for the future hard-delete sweeper agent.

---

## Open items for the Lead Manager

1. **`_types.ts` consolidation isn't done.** Both Friends and Groups now use it for `Db`. The next step is to lift `publicProfileSelect` (currently duplicated across Events, Friends, and Groups) into `_types.ts` (or a sibling like `_selects.ts`). I left mine inline to avoid a write race with the Friends agent — the consolidation should be a one-shot Lead-managed PR after both this and Friends have shipped. Affects: Events, Friends, Groups.

2. **Soft-deleted SocialGroups leak orphaned children.** Member rows, polls, suggestions, votes all FK back to `SocialGroup` and remain accessible via direct PK lookup if a future endpoint forgets the soft-delete filter. RLS on `SocialGroupMember` etc. relies on the parent group's policy chain — if any policy is loosened the orphans become reachable. Hard-delete sweeper agent will need to cascade-clean these.

3. **`Event.allowSuggestionVoting` check is tolerant.** When the tied event is RLS-hidden or soft-deleted, voting on its suggestion is allowed (treat the gate as unreachable → unrestricted). If product wants fail-closed semantics, `groupsService.voteOnSuggestion` is the only place to change.

4. **No notification side-effects on add-member, role-change, or suggestion creation.** Spec explicitly punts notifications to the future Notifications service. The events the Socket.io agent will likely care about are: group created, group updated, member added, member removed, member role changed, poll created, poll closed, poll vote, suggestion created, suggestion vote. None are emitted today.

5. **Poll list response can grow fast.** `votes: { select: { userId: true } }` is included on every option to compute `viewerHasVoted`. For polls with thousands of votes this gets heavy. Acceptable for v1; consider switching to a `$queryRaw` aggregate or a `WHERE votes.userId = $1` subselect if the JSON payload starts dominating list-endpoint latency.

6. **Suggestion vote payload similarly returns the full `votes` relation** (with `userId` + `value`) per suggestion for the same `viewerVote` reason. Same caveat applies — flag if a single group accumulates thousands of suggestions.

7. **`viewerCanEdit` / `viewerIsAdmin` are not denormalised on responses.** Frontend should derive: `viewerRole === 'ADMIN'` for group-edit, and per-poll `createdBy.id === currentUser.id || group.viewerRole === 'ADMIN'` for poll-edit. If React Query selectors get noisy we can add denormalised flags later.

8. **Suggestion DELETE doesn't take an `eventId` argument** even though `EventSuggestion.eventId` is nullable. Permission check is purely "creator or ADMIN" — the linked event's organisers cannot delete a suggestion attached to their event. If product wants event organisers to be able to clear suggestions off their event, that's a service-layer addition (look up `Event.organisers` from the suggestion's `eventId`, treat any organiser as a permitted deleter).

9. **No `PUT`-style "set my vote and overwrite" endpoint for poll votes.** Spec is `POST` (cast) + `DELETE` (un-vote) per option. Multi-select voting therefore takes N writes. Fine for the v1 UX. If a "single-select switch" UX gets approved later, add a `PUT /:id/polls/:pollId/vote` that takes `{ optionId }` and atomically deletes other votes by this user for this poll.

10. **All endpoints under `/groups` are wired in `src/app.ts`** alongside the Friends agent's `/friends` and `/friend-groups` registrations. Confirmed file is in the expected post-merge state.

---

## Verification

- `npx tsc --noEmit` from `social-calendar-api/` exits **zero** with no output. Verified at handoff.
- All 18 endpoints registered (5 group CRUD + 4 member + 4 poll + 2 poll-vote + 3 suggestion + 2 suggestion-vote = **20 routes** — see endpoint table; the spec counts `vote` POST + DELETE as one row each in some places but they're separate handlers).
- Every repository read on `SocialGroup` includes `deletedAt: null`. Verified by `grep -n "socialGroup\.\(findFirst\|findMany\|update\)" src/repositories/groups.repository.ts` against the file.
- No `import.*from.*config/prisma` anywhere in the new files. All DB access is via `db: Db` parameters carrying `request.prismaTransaction`.
- No `any` in the new files (a few `unknown` in `handleError`, narrowed via `instanceof`).

---

## Suggested next agents

- **Backend / Socket.io Layer** — unblocked once Friends Domain handoff also lands. Will need event payload shapes for the events listed in open item #4 above.
- **DevOps / Jest + Supertest** — unblocked once Friends + Groups handoffs both land. Useful integration tests to add early: atomic group creation, last-admin guard on demote/leave, suggestion-vote upsert (cast → change → delete), poll cascade delete.
- **Lead Manager / Repo cleanup PR** — extract `publicProfileSelect` into `_types.ts` (or `_selects.ts`) and delete the duplicates from `events.repository.ts`, `groups.repository.ts`, and the Friends repo files. Single PR, no behaviour change.

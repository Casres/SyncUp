# Backend — Events Domain Agent Handoff

**Agent:** Backend / Events Domain
**Completed:** 2026-05-04
**Per:** `LEAD_MANAGER.md` → Backend → Events Domain row.

---

## What was built

| File | Role |
|---|---|
| `src/repositories/events.repository.ts` | tx-aware `Db` type, `findById`, `list`, `create`, `update`, `softDelete`, `findOrganiser`. All reads filter `deletedAt: null`. Exports the `eventInclude` shape that downstream agents can reuse. |
| `src/services/events.service.ts` | Business logic. Domain errors: `EventNotFoundError`, `EventForbiddenError`, `EventDateRangeError`. Organiser-gate for update/delete. Date-range invariant on create + post-merge on update. |
| `src/controllers/events.controller.ts` | HTTP only. Zod validation for body/params/query. Maps domain errors to 400/403/404. |
| `src/routes/events.routes.ts` | 5 routes: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`. |
| `src/app.ts` | `await app.register(eventsRoutes, { prefix: '/events' })` after auth plugin. |

---

## Endpoint reference

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/events` | `?from=ISO`, `?to=ISO`, `?limit=1..100` | 200, 400 | Lists events visible to the caller (RLS filters by creator/organiser/invitee). Filters by `startsAt` if `from`/`to` provided. Default `limit=50`, max `100`. |
| `GET` | `/events/:id` | — | 200, 404 | RLS hides events the caller can't see → 404. |
| `POST` | `/events` | `title*, description?, location?, startsAt*, endsAt*, recurrence?, recurrenceRuleRaw?, allowSuggestionVoting?` | 201, 400 | Creator becomes `EventOrganiser` with role `CREATOR` atomically. RLS pins `creatorId = current user`. |
| `PATCH` | `/events/:id` | any subset of create body (nullable for description / location / recurrenceRuleRaw) | 200, 400, 403, 404 | Caller must be an organiser (creator or co-host). Date-range invariant enforced post-merge. |
| `DELETE` | `/events/:id` | — | 204, 403, 404 | Soft delete (`deletedAt = now()`). Organisers (creator + co-hosts) only — see "Decision: who can delete". |

Response shape for GET/POST/PATCH:

```ts
{
  id, creatorId, title, description, location, startsAt, endsAt,
  recurrence, recurrenceRuleRaw, allowSuggestionVoting,
  createdAt, updatedAt, deletedAt,
  creator: { id, username, displayName, avatarUrl },
  organisers: [{ id, role, user: { id, username, displayName, avatarUrl } }],
  invites: [{ id, status, friendGroupId, recipient: { id, username, displayName, avatarUrl } }],
}
```

The list endpoint omits `invites` for response-size reasons.

---

## Decisions made

### "Organisers only" for delete (not just creator)
The spec said `DELETE /:id` is "organisers only". The locked Postgres RLS policy `event_delete_creator` is creator-only. **Soft delete goes through `UPDATE deletedAt`, not `DELETE`,** so the relevant RLS policy is `event_modify_organiser` — which permits both creator and co-hosts. Service layer enforces "is an organiser" via `EventOrganiser` lookup, matching the spec.

If hard delete is added later (post-grace-period purge job, etc.), it will hit `event_delete_creator` and require creator-only. Document then.

### `findById` uses `findFirst`, not `findUnique`
Prisma 5's `findUnique` only accepts unique-key fields in `where`, so it can't combine `id` with `deletedAt: null`. `findFirst` on the indexed `id` is identical in cost.

### `update` and `softDelete` use `updateMany` for the soft-delete safety filter
Same root cause — `update`'s `where` is unique-only. `updateMany` accepts `{ id, deletedAt: null }` and returns a count we can use as a truthy check. After `update`, the service re-fetches via `findById` to return the merged row.

### Date-range invariant
`endsAt >= startsAt`. Same instant is allowed (a 0-duration event is valid for "all-day at point X" use cases). Enforced in `eventsService.create` and post-merge in `eventsService.update`.

### Recurrence is accepted but not expanded
The schema fields `recurrence` (enum) and `recurrenceRuleRaw` (RRULE string) are pass-through. There is no `EventException` handling and no instance expansion — both are deferred per the spec. A client that creates a `WEEKLY` event today gets a single Event row that the calendar must expand client-side until the recurring-events agent ships.

### `creator` cannot be reassigned
The PATCH body schema doesn't accept `creatorId`. Reassigning the creator is a high-blast-radius operation (changes RLS visibility, organiser implications) and isn't in scope for this slice.

### `currentUser` does not appear in responses
Responses don't echo back something like `viewerCanEdit`. Frontend should derive that from the `organisers` array (`organisers.some(o => o.user.id === currentUserId)`). Adds a denormalised field later if React Query selectors get noisy.

### Public profile select is duplicated, not shared
The user fields exposed in event responses (`id`, `username`, `displayName`, `avatarUrl`) are inlined as a `publicProfileSelect` in `events.repository.ts`. When the Friends and Groups agents land, we'll likely want a shared helper at `src/lib/userSelects.ts` — defer that consolidation until at least two domains repeat the pattern.

---

## Open items the Lead Manager should track

1. **No invite management endpoints.** A creator can make an event but can't invite anyone yet — `EventInvite` rows are read-only in this slice (visible in GET responses). The Friends agent or a dedicated Invites agent should add `POST /events/:id/invites`, `PATCH /events/:id/invites/:inviteId` (RSVP), `DELETE …`. RLS policies for `EventInvite` are already in place (`eventinvite_insert_organiser`, `eventinvite_update_recipient_or_organiser`, etc.).
2. **No co-host management endpoints.** Similarly, the creator can't promote anyone to `CO_HOST` yet. `EventOrganiser` writes are gated by `eventorganiser_modify_creator` (creator-only) — the Events agent could add this, but it's a separate concern from the core CRUD slice.
3. **`EventException` deferred.** The schema supports cancelled / rescheduled / modified instances of recurring events but no controller exists. Calendar UI will see only the master Event until this lands.
4. **No pagination beyond `limit`.** The list endpoint has `from`/`to`/`limit` but no cursor. For a calendar view (date-bounded queries), this is fine. If we add a "show me everything" view, add cursor pagination.
5. **`request.prismaTransaction` is the contract; auth middleware must continue to honour it.** Any future change to the auth middleware that breaks this assumption will silently break all RLS — the tests for this will need to assert it.
6. **Runtime DB role.** The service is correct against the Auth contract. It will work today (single-role) and once DevOps' two-role setup is wired in (`DATABASE_URL_APP`). No code change needed in the events domain when that switches over.
7. **`recurrenceRuleRaw` is unvalidated.** Capped at 2000 chars. The recurring-events agent should validate it parses as a real RRULE before persisting.
8. **Soft-deleted events are still referenced.** `EventInvite.eventId`, `EventException.eventId`, `EventSuggestion.eventId` all FK to Event. Soft-delete leaves these rows orphaned (still pointing at the soft-deleted Event). Reads filter via the Event RLS policy + `deletedAt: null`. If a hard-delete sweeper job is added, it must cascade or the FK constraints will block.

---

## How downstream agents should plug in

```ts
// In another domain, e.g. Groups:
import { eventsRepository } from '../repositories/events.repository.js';

// Re-use the publicProfileSelect pattern. Reuse Db type.
import type { Db } from '../repositories/events.repository.js';
```

`Db` is exported from `events.repository.ts` for now. When Friends/Groups land, move it to `src/repositories/_types.ts` (or similar) and re-export from each domain repo.

---

## Suggested next agents

- **Backend / Friends Domain** — same pattern, FriendshipLabel + AvailabilityBlock work.
- **Backend / Groups Domain** — same pattern, SocialGroup + members + (deferred) polls.
- **Backend / Invites slice** — could be folded into either of the above or stand alone.
- **DevOps / `DATABASE_URL_APP` switchover** — small backend change in `src/config/prisma.ts` to actually engage RLS in production.

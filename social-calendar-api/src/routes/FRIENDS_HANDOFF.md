# Backend — Friends Domain Agent Handoff

**Agent:** Backend / Friends Domain
**Completed:** 2026-05-04
**Per:** `LEAD_MANAGER.md` → Backend → Friends Domain row.

---

## What was built

| File | Role |
|---|---|
| `src/repositories/_types.ts` | **NEW.** Lifted the `Db` type out of `events.repository.ts`. Single source of truth for `Omit<PrismaClient, ITXClientDenyList> \| PrismaClient`. The Events repo re-exports `Db` from this module to preserve its existing public surface. |
| `src/repositories/events.repository.ts` | **MODIFIED.** Imports `Db` from `_types.ts` and re-exports it (`export type { Db };`) so `events.service.ts` and any external import of `Db` from this path keep working. No behaviour change. |
| `src/repositories/friends.repository.ts` | **NEW.** tx-aware repo for `Friendship`, `FriendshipLabel`, `AvailabilityBlock`. All `Friendship` reads include `deletedAt: null`. Exposes `friendshipInclude` / `availabilityBlockInclude` shapes via `Prisma.<Model>GetPayload<…>` helper types. |
| `src/services/friends.service.ts` | **NEW.** Business logic + domain errors. Resolves the "other user" (`friend`) and the caller's label inside the service so controllers stay thin. Handles duplicate detection, soft-delete tombstone semantics, and Prisma `P2002` race conditions. |
| `src/controllers/friends.controller.ts` | **NEW.** HTTP layer. Zod validation for body / params / query. Maps domain errors to 400/403/404/409. |
| `src/routes/friends.routes.ts` | **NEW.** Wires up 11 routes under `/friends` (friendships + labels + blocks). Static segments (`/requests`, `/blocks`) are registered before `/:id` parameter routes for routing clarity. |
| `src/repositories/friendGroups.repository.ts` | **NEW.** tx-aware repo for `FriendGroup` and `FriendGroupMember`. Member listing resolves `User` profiles in a second query because `FriendGroupMember` has no relation to `User` in the schema (see Decisions §6). Exposes `_count.members` for the list endpoint. |
| `src/services/friendGroups.service.ts` | **NEW.** Owner-gate on every mutation. Cascades `FriendGroupMember` rows in the same per-request transaction on group delete. |
| `src/controllers/friendGroups.controller.ts` | **NEW.** Zod validation + standard error mapping. |
| `src/routes/friendGroups.routes.ts` | **NEW.** Wires up 7 routes under `/friend-groups`. |
| `src/app.ts` | **MODIFIED.** Imports `friendsRoutes` and `friendGroupsRoutes` and registers them after the auth plugin under the `/friends` and `/friend-groups` prefixes respectively. The pre-existing `groupsRoutes` registration (added by the Groups Domain agent in parallel) is left untouched. |

---

## Endpoint reference

### Friendships (`/friends`)

| Method | Path | Body / Query | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/friends` | `?label=string?` | 200, 400 | Lists ACCEPTED friendships involving the caller. Optional `label` filter applies to the **caller's own** `FriendshipLabel` entries (never the other party's). Response is `{ friends: FriendshipResponse[] }`. |
| `GET` | `/friends/requests` | — | 200 | Lists PENDING friendships where the caller is the receiver. Response is `{ requests: FriendshipResponse[] }`. |
| `POST` | `/friends/requests` | `{ recipientId: string }` | 201, 400, 409 | Creates a PENDING friendship with the caller as initiator. Rejects self-requests (400). Rejects duplicates in either direction including soft-deleted tombstones (409). Catches `P2002` races and surfaces as 409. |
| `PATCH` | `/friends/requests/:id` | `{ action: "accept" \| "decline" }` | 200, 400, 403, 404 | Receiver-only. `accept` → ACCEPTED (returns the shaped friendship). `decline` → soft-delete (returns `{ id, status: "DECLINED" }`). 400 if friendship is not in `PENDING`. |
| `PATCH` | `/friends/:id/block` | — | 200, 403, 404 | Either party may set the friendship to BLOCKED. Returns the shaped friendship. |
| `DELETE` | `/friends/:id` | — | 204, 403, 404 | Either party may unfriend. Soft-delete (`deletedAt = now()`). |

### Friendship labels (`/friends/:id/label`)

| Method | Path | Body | Status codes | Behaviour |
|---|---|---|---|---|
| `PUT` | `/friends/:id/label` | `{ label: string }` (1–50 chars) | 200, 400, 403, 404 | Upserts the caller's label on the unique key `(friendshipId, ownerId)`. |
| `DELETE` | `/friends/:id/label` | — | 204, 403, 404 | Removes the caller's label. Idempotent — 204 even when no label existed. 404 if the friendship itself doesn't exist. |

### Availability blocks (`/friends/blocks`)

| Method | Path | Body | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/friends/blocks` | — | 200 | Lists `AvailabilityBlock` rows where `blockerId = current user`. Includes the blocked user's public profile. Response: `{ blocks: AvailabilityBlockResponse[] }`. |
| `POST` | `/friends/blocks` | `{ userId: string }` | 201, 400, 409 | Block a user's availability. Rejects self-blocks (400). Returns 409 if already blocked. Catches `P2002` races. |
| `DELETE` | `/friends/blocks/:userId` | — | 204 | Idempotent unblock. Always 204 whether or not a row was deleted. |

### Friend Groups (`/friend-groups`)

| Method | Path | Body | Status codes | Behaviour |
|---|---|---|---|---|
| `GET` | `/friend-groups` | — | 200 | Lists groups owned by the caller. Each group includes `memberCount` (no member identities). Response: `{ groups: FriendGroupResponse[] }`. |
| `POST` | `/friend-groups` | `{ name: string }` (1–100 chars) | 201, 400 | Create a new group. |
| `PATCH` | `/friend-groups/:id` | `{ name: string }` (1–100 chars) | 200, 400, 403, 404 | Rename. Owner-only. |
| `DELETE` | `/friend-groups/:id` | — | 204, 403, 404 | Cascade-delete. Members are deleted first, then the group, both via the per-request transaction client (atomic). |
| `GET` | `/friend-groups/:id/members` | — | 200, 403, 404 | Owner-only. Returns `{ members: PublicProfile[] }`. |
| `POST` | `/friend-groups/:id/members` | `{ userId: string }` | 201, 400, 403, 404, 409 | Owner-only. Returns `{ membershipId, userId }`. Returns 409 on duplicate. |
| `DELETE` | `/friend-groups/:id/members/:userId` | — | 204, 403, 404 | Owner-only. Idempotent — 204 whether or not the member existed. |

### Response shapes

```ts
type FriendshipResponse = {
  id: string;
  initiatorId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: Date;
  updatedAt: Date;
  friend: { id: string; username: string; displayName: string; avatarUrl: string | null };
  label?: string; // caller's label, if set
};

type AvailabilityBlockResponse = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
  blocked: { id: string; username: string; displayName: string; avatarUrl: string | null };
};

type FriendGroupResponse = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number; // _count.members — never the member list
};
```

**Endpoint count:** 11 friend / label / block routes + 7 friend-group routes = **18 endpoints total**.

---

## Decisions made

### `Db` type extracted to `src/repositories/_types.ts`

The Events agent's handoff suggested moving `Db` to a shared location once a second domain repeated the pattern. Done. `events.repository.ts` re-exports `Db` from the new module (`export type { Db };`) so any caller that imported `Db` from `events.repository.ts` keeps working unchanged. New repos (Friends, Groups) import `Db` directly from `_types.ts`. The Groups Domain agent — which ran in parallel — independently wrote `_types.ts` to the same shape; the file we both produced is identical.

### "Other user" derivation lives in the service

Per the spec: friendship responses derive `friend` from the caller's perspective (initiator vs receiver). This is done in `friendsService` via the private `shapeFriendship(...)` helper, never in the controller. The same helper resolves the caller's label out of the included `labels[]` array.

### Soft-deleted Friendship re-request → blocked with 409

Per the spec's "Implementation decision #2", a soft-deleted Friendship row remains as a tombstone, and `@@unique([initiatorId, receiverId])` would block a re-insert in the same direction. The service runs `findBetweenUsers(...)` — which intentionally ignores `deletedAt` — and returns 409 with the message *"A previous friendship between these users was deleted; reuse is blocked until that record is purged"*. **Flagged for Lead Manager review** (UX call): a future hard-delete sweeper or an explicit "restore" path could change this, but the current behaviour is conservative.

### Decline → soft-delete, response shape

`PATCH /friends/requests/:id` with `action: "decline"` soft-deletes the friendship and returns `{ id, status: "DECLINED" }` rather than a 204 or the soft-deleted row. `DECLINED` is a *response-only* sentinel — it does NOT exist in `FriendshipStatus` enum, which is `PENDING | ACCEPTED | BLOCKED`. This avoids having to expose a soft-deleted Friendship payload while still giving the client a distinguishable success signal vs accept.

### `block` only allowed by a party — not the BLOCKED-only-when-not-deleted check

`PATCH /friends/:id/block` doesn't reject already-blocked friendships — it's idempotent, sets status to `BLOCKED` again. The spec says "A blocked relationship cannot be accepted — it must be deleted first." Accept is gated by `status === PENDING`, so this is automatically enforced via `FriendshipInvalidStateError` (400) on the accept path.

### Service-layer state guard on accept/decline

`respondToRequest` rejects with 400 (`FriendshipInvalidStateError`) if the friendship is not in `PENDING` (e.g. someone tries to "accept" something already accepted, or to accept a `BLOCKED` row). The receiver-only check (403) happens before the state check.

### `findBetweenUsers` ignores `deletedAt` on purpose

This single repository method — the only one in `friends.repository.ts` that does NOT filter by `deletedAt: null` — is documented inline with the rationale: the service needs to know about tombstones to enforce the no-re-request rule. Every other `Friendship` read filters soft-deletes.

### Race-condition handling: catch `Prisma.PrismaClientKnownRequestError` `P2002`

The findThenInsert pattern between `findBetweenUsers` / `findBlock` and `create` / `createBlock` has a TOCTOU race when two requests fire concurrently. We catch Prisma's `P2002` (unique-constraint) error and re-throw as the domain error so the controller surfaces 409 cleanly.

### `updateMany` for soft-delete-safe writes

Same pattern as the Events domain. Prisma 5's `update` only accepts unique fields in `where`, so we use `updateMany({ where: { id, deletedAt: null }, ... })` for `updateStatus` and `softDelete`. Returns `count === 0` → null → caller surfaces 404.

### `FriendGroupMember` has no `User` relation in the schema

The schema defines `FriendGroupMember.userId` as a plain column with no `@relation` to `User`. (See `prisma/schema.prisma` lines 163–171.) This means we cannot `include: { user: true }` on a Prisma query against `friendGroupMember`. The `listMembers` repo method runs a second query against `User` filtered by `userId IN (...)` and joins in memory. Both queries share the per-request transaction client, so the read is consistent. **Flagged for Lead Manager review**: adding a real `@relation` would be a schema change (out of scope here) but would make this cleaner. Defer until / unless this query becomes a hot path.

### `FriendGroup` cascade on delete

`FriendGroupMember` FK does not have `onDelete: Cascade`. Per the spec, the service layer deletes child rows first (`friendGroupMember.deleteMany({ where: { friendGroupId } })`) then the parent `friendGroup.delete(...)`. Both writes go through `request.prismaTransaction`, so the auth middleware's outer `$transaction` rolls them back together if either fails.

### Owner-only gate is checked in the service even though RLS already enforces it

`friendgroup_owner_only` and `friendgroupmember_owner_only` already restrict to `ownerId = current_app_user_id()` at the DB level. The service still does an explicit `findById` + `ownerId === currentUserId` check before mutating so we get a clean **403** response when a non-owner pokes at an existing group, rather than an opaque "row not updated / RLS hid it" 404 with no explanation. This matches the discipline used by the Events domain in its `findOrganiser` gate.

### `publicProfileSelect` is duplicated again

Now in three places: `events.repository.ts`, `friends.repository.ts`, `friendGroups.repository.ts`, plus the new Groups domain. **Flagged for the Lead Manager**: consolidate into `src/lib/userSelects.ts` (or extend `src/repositories/_types.ts`) once Groups + Friends have both shipped. Doing it now risks a merge conflict with the parallel Groups agent's work — defer to a small follow-up.

### Routes file ordering

Fastify's router handles `/requests` vs `/:id` correctly regardless of registration order, but for human readability the static-segment routes (`/requests`, `/blocks`) are registered first.

---

## Open items the Lead Manager should track

1. **Soft-deleted Friendship re-request UX.** Current behaviour returns 409 with a "previous friendship was deleted" message. If product wants a "restore" or "re-send" UX, two options:
   - Hard-delete the tombstone before allowing re-insert (loses audit trail).
   - Move the unique constraint to a partial index `WHERE deletedAt IS NULL` (schema change → migration → cross-agent coordination).
   Defer until product weighs in.

2. **`publicProfileSelect` consolidation.** Now duplicated across three+ repos. Suggest a small follow-up agent (`Backend / userSelects consolidation`) once the Groups + Friends domains have both landed in `main`. Trivial change, but I deliberately did not attempt it inside this slice to avoid a merge conflict with the parallel Groups Domain agent.

3. **`FriendGroupMember` ↔ `User` relation missing in schema.** The `listMembers` path resolves member profiles via a separate `user.findMany({ where: { id: { in: ... } } })` because the schema defines no relation. Adding a `@relation` would let us use `include: { user: true }`. Schema-change ticket, out of scope here.

4. **Notifications.** The spec says "the added user does NOT know they've been added — do not notify" (group members) and "do not notify" the receiver of a friend request. We comply by not emitting anything. The Notifications service does not yet exist; when it lands, it must respect this — friend-request acceptance might trigger a notification to the *initiator* (out of scope to decide here).

5. **No "outgoing requests" endpoint.** The spec only defines `GET /friends/requests` (incoming). If the mobile app needs a list of the caller's outgoing PENDING requests it will need a new route — `GET /friends/requests/outgoing` — or the existing list endpoint can grow a `?direction=outgoing` query param. Trivially additive against the existing repo (`list({ status: PENDING, currentUserId, ... })` already filters by either-side).

6. **Race on duplicate friend-request creation.** `findBetweenUsers` then `create` is not transactionally atomic against another concurrent request. We catch `P2002` and surface 409, which is the right behaviour. Documented for completeness — no action needed.

7. **`/friends` list pagination.** Currently capped at no limit and ordered by `updatedAt DESC`. For early product launch this is fine. If a user accumulates hundreds of friends, add cursor pagination — same shape the Events domain will need eventually.

8. **`AvailabilityBlock` and `Friendship` are intentionally independent** (per spec). A user can block someone who isn't their friend; unblocking does not change friendship state. Keep the two domains decoupled — `UserAvailability` (the agent that reads availability windows) must consult `AvailabilityBlock` separately when computing visibility for a given viewer.

9. **`AvailabilityBlockAlreadyExistsError` was kept as the spec-required name.** The spec also lists `AvailabilityBlockAlreadyExistsError` under `friendGroups.service.ts` errors (alongside the Friend Group ones). I implemented it where the actual logic lives — `friends.service.ts` — since the `POST /friends/blocks` route is in the friends controller. The name and 409 mapping are unchanged. No cross-domain leak.

---

## Cross-section flags for the Lead Manager

- **`_types.ts` was extracted by both this agent and the parallel Groups Domain agent** independently to the same content. No merge conflict materialised because both runs produced byte-identical files. If a future review wants the file removed or renamed, both domain repos need to be updated together.
- **`src/app.ts` was edited by both this agent and the parallel Groups Domain agent.** The final file registers `eventsRoutes`, `friendsRoutes`, `friendGroupsRoutes`, and `groupsRoutes` — confirmed via post-merge `tsc --noEmit` (zero errors).
- **`publicProfileSelect` triplication** — see Open items #2 above.
- **`FriendGroupMember.user` relation missing** — see Open items #3 above.

---

## Verification

- `npx tsc --noEmit` from `social-calendar-api/` — **zero errors, zero output**. Verified at handoff.
- All 18 endpoints registered under `/friends` and `/friend-groups`.
- Every `Friendship` read includes `deletedAt: null` (verified by grep across `friends.repository.ts`).
- Every repository method takes `db: Db` as its first parameter — no domain code imports the singleton `prisma` or `prismaApp`.
- No cross-domain imports — `friends.repository.ts` and `friendGroups.repository.ts` import only from `@prisma/client` and `./_types.js`.

---

## How downstream agents should plug in

```ts
// Re-use the Db type from the shared module:
import type { Db } from '../repositories/_types.js';

// Or, equivalently (for backwards-compat):
import type { Db } from '../repositories/events.repository.js';
```

Domain code MUST use `request.prismaTransaction` for all DB access. The Friends domain controllers do this consistently; the Groups Domain agent (parallel) does the same.

---

## Suggested next agents

- **Backend / Groups Domain** — already running in parallel. No coordination needed beyond the shared `_types.ts` and `src/app.ts` edits noted above.
- **Backend / Invites slice** — `EventInvite` CRUD; FriendGroup blast-invite expansion can now hook into `friendGroupsRepository.listMembers` to enumerate recipients. The audit-trail field `EventInvite.friendGroupId` is already wired in the schema.
- **Backend / userSelects consolidation** — small follow-up to dedupe the `publicProfileSelect` shape across repos.
- **Backend / UserAvailability** — must consult `AvailabilityBlock` (via `friendsRepository.findBlock(...)` or a similar lookup) when computing visibility for a viewer.

# Backend — Friends Domain Agent Prompt

> **You are the Backend / Friends Domain agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — do not build anything not listed here.

---

## Context: What Has Already Been Built

You are working inside a Node.js + Fastify + TypeScript API at `social-calendar-api/`. The following backend work is **complete and must not be touched**:

| Agent | Output | Key files |
|---|---|---|
| Schema / Migrations | `schema.prisma` with all 18 models + `deletedAt` on `User`, `Event`, `Friendship`, `SocialGroup`; baseline migration + RLS migration | `social-calendar-api/prisma/` |
| Auth (Clerk) | Global Fastify preHandler that verifies Clerk JWT, upserts the `User` row, opens a per-request Prisma transaction, sets `app.current_user_id` for RLS, attaches `request.user` and `request.prismaTransaction` to every request | `src/middleware/auth.middleware.ts`, `src/middleware/AUTH_HANDOFF.md` |
| Events Domain | 5 CRUD endpoints. The repo / service / controller / route pattern you must replicate. | `src/repositories/events.repository.ts`, `src/services/events.service.ts`, `src/controllers/events.controller.ts`, `src/routes/events.routes.ts`, `src/routes/EVENTS_HANDOFF.md` |

**Read these files before writing any code:**
- `social-calendar-api/CLAUDE.md` — architecture rules, tech stack, folder structure, locked decisions
- `social-calendar-api/src/middleware/AUTH_HANDOFF.md` — the transaction + RLS contract every domain agent must follow
- `social-calendar-api/src/routes/EVENTS_HANDOFF.md` — the reference implementation and its decisions
- `social-calendar-api/src/repositories/events.repository.ts` — the `Db` type and pattern to replicate
- `social-calendar-api/src/services/events.service.ts` — the service error pattern to replicate
- `social-calendar-api/src/controllers/events.controller.ts` — Zod validation + error mapping pattern
- `social-calendar-api/src/routes/events.routes.ts` — route registration pattern
- `social-calendar-api/src/app.ts` — how to register new route groups

---

## Non-Negotiable Contracts

These rules are locked. Do not deviate from them.

### 1. Always use `request.prismaTransaction`

```ts
// ✅ correct — RLS sees app.current_user_id
await request.prismaTransaction.friendship.findMany(...)

// ❌ wrong — singleton has no app.current_user_id; RLS denies everything
import { prisma } from '../config/prisma.js';
await prisma.friendship.findMany(...)
```

Repositories accept the transaction client as a `db: Db` parameter. Controllers pass `request.prismaTransaction` through the service to the repo. The `Db` type is defined in `events.repository.ts` — re-export it from there or move it to `src/repositories/_types.ts` and re-export from both. Do NOT duplicate the type definition.

### 2. Soft-delete filtering on `Friendship`

`Friendship` carries `deletedAt DateTime?`. Every read must include `deletedAt: null` in the `where` clause. RLS does **not** enforce this — the repository layer does.

`FriendshipLabel`, `AvailabilityBlock`, `FriendGroup`, and `FriendGroupMember` have no `deletedAt` — they use hard deletes.

### 3. Architecture direction is strict

```
Routes → Controllers → Services → Repositories → Database
```

Business logic lives exclusively in Services. Controllers handle HTTP only (parse, call service, map errors, return). No layer skips another. See `CLAUDE.md`.

### 4. Type-safe Prisma selects

Use `satisfies Prisma.<Model>Select` / `Prisma.<Model>Include` for include/select shapes, and `Prisma.<Model>GetPayload<{ include: typeof … }>` for inferred return types. No `any`.

### 5. Register the new routes in `src/app.ts`

After the existing `eventsRoutes` registration, add:
```ts
await app.register(friendsRoutes,      { prefix: '/friends' });
await app.register(friendGroupsRoutes, { prefix: '/friend-groups' });
```

---

## Schema Refresher — Models Owned by This Agent

Paste these from `prisma/schema.prisma` for reference (do not modify the schema):

```
Friendship        — id, initiatorId, receiverId, status (PENDING|ACCEPTED|BLOCKED), createdAt, updatedAt, deletedAt
FriendshipLabel   — id, friendshipId, ownerId, label  @@unique([friendshipId, ownerId])
AvailabilityBlock — id, blockerId, blockedId, createdAt  @@unique([blockerId, blockedId])
FriendGroup       — id, ownerId, name, createdAt, updatedAt
FriendGroupMember — id, friendGroupId, userId  @@unique([friendGroupId, userId])
```

**Important schema facts:**
- `Friendship` has `@@unique([initiatorId, receiverId])`. "Either party can find me" means a list query must check BOTH columns. For example: `WHERE initiatorId = X OR receiverId = X`.
- `FriendshipLabel` is owned per-user per-friendship. A can label B "coworker" while B labels A "friend". Labels are not shared or visible to the other party.
- `AvailabilityBlock` is one-directional. Hiding availability from someone is NOT the same as blocking or unfriending. The blocked user must not know they are blocked.
- `FriendGroup` is private to its owner. Members do not know they are in it — do not expose group membership info to anyone other than the owner.

---

## RLS Policies That Apply to This Domain

The RLS migration (`prisma/migrations/20260502201745_rls_policies/migration.sql`) already defines these policies. You do not need to create them. But you must understand them so your service layer aligns:

| Table | Policy | Effect |
|---|---|---|
| `Friendship` | `friendship_select_party` | Both initiator and receiver can SELECT their own friendships |
| `Friendship` | `friendship_insert_initiator` | Only the current user can INSERT with themselves as initiator |
| `Friendship` | `friendship_update_party` | Either party can UPDATE (accepting/declining) |
| `Friendship` | `friendship_delete_party` | Either party can DELETE (hard delete path — but we soft-delete, so this hits UPDATE via `deletedAt`) |
| `FriendshipLabel` | `friendshiplabel_owner_only` | Full CRUD only for ownerId = current user |
| `AvailabilityBlock` | `availabilityblock_blocker_only` | Full CRUD only for blockerId = current user. Blocked user sees nothing. |
| `FriendGroup` | `friendgroup_owner_only` | Full CRUD only for ownerId = current user |
| `FriendGroupMember` | `friendgroupmember_owner_only` | Full CRUD only for users who own the parent FriendGroup |

---

## Files to Create

Do not scaffold anything outside this list. Create each file only when it is needed.

```
src/repositories/friends.repository.ts
src/services/friends.service.ts
src/controllers/friends.controller.ts
src/routes/friends.routes.ts

src/repositories/friendGroups.repository.ts
src/services/friendGroups.service.ts
src/controllers/friendGroups.controller.ts
src/routes/friendGroups.routes.ts

src/routes/FRIENDS_HANDOFF.md     ← write this last, after all code is done
```

Do **not** create a `availability.routes.ts` or `availability.service.ts` — `AvailabilityBlock` (blocking visibility from a specific user) is scoped to the Friends domain in this agent. `UserAvailability` (calendar windows) is a separate domain, not in scope for this agent.

---

## Endpoint Specification

### Friendships (`/friends`)

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/friends` | List accepted friends of the caller. Optional `?label=` filter by the caller's label. Friendship `status` must be `ACCEPTED` and `deletedAt` must be null. Include the other user's public profile. | 200, 400 |
| `GET` | `/friends/requests` | List incoming friend requests where `receiverId = current user` and `status = PENDING` and `deletedAt = null`. Include initiator's public profile. | 200 |
| `POST` | `/friends/requests` | Send a friend request. Body: `{ recipientId: string }`. Creates a `Friendship` with `initiatorId = current user`, `status = PENDING`. Rejects self-requests. Rejects duplicate (check for existing non-deleted friendship in either direction). | 201, 400, 409 |
| `PATCH` | `/friends/requests/:id` | Accept or decline a friend request. Body: `{ action: "accept" \| "decline" }`. Only the receiver may call this. `accept` → `status = ACCEPTED`. `decline` → soft-delete (`deletedAt = now()`). | 200, 400, 403, 404 |
| `PATCH` | `/friends/:id/block` | Block a friend or a pending request. Caller must be a party to the friendship. Sets `status = BLOCKED`. A blocked relationship cannot be accepted — it must be deleted first. | 200, 403, 404 |
| `DELETE` | `/friends/:id` | Unfriend: soft-delete the `Friendship` (`deletedAt = now()`). Caller must be a party to the friendship. | 204, 403, 404 |

**Friendship response shape:**
```ts
{
  id, initiatorId, receiverId, status, createdAt, updatedAt,
  // "the other user" — derive from current user's perspective
  friend: { id, username, displayName, avatarUrl },
  // caller's label, if set
  label?: string,
}
```

For listing, derive `friend` dynamically: if `initiatorId === currentUserId`, `friend` is the receiver; otherwise `friend` is the initiator. The service layer should resolve this — do not push this logic into the controller.

---

### Friendship Labels (`/friends/:id/label`)

| Method | Path | Description | Status codes |
|---|---|---|---|
| `PUT` | `/friends/:id/label` | Set or replace the caller's label for friendship `id`. Body: `{ label: string }`. Must be a party to the friendship. Upsert on `@@unique([friendshipId, ownerId])`. Label max length: 50 chars. | 200, 400, 403, 404 |
| `DELETE` | `/friends/:id/label` | Remove the caller's label for friendship `id`. No-op if label doesn't exist (return 204 regardless). | 204, 403, 404 |

---

### Availability Blocks (`/friends/blocks`)

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/friends/blocks` | List all `AvailabilityBlock` rows where `blockerId = current user`. Include blocked user's public profile. | 200 |
| `POST` | `/friends/blocks` | Block a user's availability. Body: `{ userId: string }`. Creates `AvailabilityBlock` with `blockerId = current user`. Reject self-blocks. Reject duplicates (return 409 if already blocked). | 201, 400, 409 |
| `DELETE` | `/friends/blocks/:userId` | Unblock. Hard-delete the `AvailabilityBlock` where `blockerId = current user` and `blockedId = :userId`. No-op if not found (return 204). | 204 |

---

### Friend Groups (`/friend-groups`)

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/friend-groups` | List all `FriendGroup` rows owned by the current user. Include member count (not member identities — see note below). | 200 |
| `POST` | `/friend-groups` | Create a new FriendGroup. Body: `{ name: string }`. Name max 100 chars. | 201, 400 |
| `PATCH` | `/friend-groups/:id` | Rename a FriendGroup. Body: `{ name: string }`. Owner only. | 200, 400, 403, 404 |
| `DELETE` | `/friend-groups/:id` | Delete a FriendGroup and all its `FriendGroupMember` rows. Owner only. Cascade the member rows in the same transaction. | 204, 403, 404 |
| `GET` | `/friend-groups/:id/members` | List members (their public profiles). Owner only. | 200, 403, 404 |
| `POST` | `/friend-groups/:id/members` | Add a member. Body: `{ userId: string }`. Owner only. Reject duplicates (409). The added user does NOT know they've been added — do not notify. | 201, 400, 403, 404, 409 |
| `DELETE` | `/friend-groups/:id/members/:userId` | Remove a member. Owner only. No-op if not a member (return 204). | 204, 403, 404 |

**FriendGroup response shape for list/create/patch:**
```ts
{
  id, ownerId, name, createdAt, updatedAt,
  memberCount: number,   // _count.members — not the member list itself
}
```

The `GET /friend-groups/:id/members` endpoint returns:
```ts
{
  members: [{ id, username, displayName, avatarUrl }]
}
```

**Important:** The list endpoint returns `memberCount`, not the member list, to avoid leaking "who is in group X" information if the caller re-uses the group for non-invite purposes. Members are only returned when explicitly requested via the dedicated `/members` sub-route.

---

## Domain Error Classes

Define these in the respective service files, following the Events agent pattern:

```ts
// friends.service.ts
FriendshipNotFoundError
FriendshipForbiddenError
FriendshipAlreadyExistsError   // 409 — duplicate request or already friends
FriendshipSelfError             // 400 — cannot friend yourself

// friendGroups.service.ts
FriendGroupNotFoundError
FriendGroupForbiddenError
FriendGroupMemberAlreadyExistsError  // 409
AvailabilityBlockAlreadyExistsError  // 409
```

---

## Key Implementation Decisions to Make and Document

These are not answered for you — make a reasonable call, document it in the handoff, and flag any that might need Lead Manager review.

1. **Friendship uniqueness direction:** `@@unique([initiatorId, receiverId])` means only one of `(A→B)` or `(B→A)` can exist. When checking for duplicates on `POST /friends/requests`, query for both `(initiatorId=A, receiverId=B)` AND `(initiatorId=B, receiverId=A)` before inserting. A 409 must cover both cases.

2. **Soft-deleted Friendship re-request:** If a friendship was soft-deleted, can the same pair try again? Reasonable answer: yes — soft-deleted rows are tombstones, a new `POST /friends/requests` should be allowed to insert a new row (the old row remains for audit). Since `@@unique([initiatorId, receiverId])` would block a re-insert in the same direction, the new request must either go in the reverse direction or require the old tombstone to be hard-deleted first. **Chosen approach:** require the deleted row to not exist before inserting. If a soft-deleted row exists in either direction, return 409 with a message indicating the relationship was recently deleted. Flag this for Lead Manager review — it's a UX call.

3. **`updateMany` for soft-delete and status updates:** Same root cause as Events — Prisma `update` only accepts unique-key fields in `where`. Use `updateMany({ where: { id, deletedAt: null } })` for Friendship updates. Check `result.count === 0` → 404 or 403 depending on prior findFirst result.

4. **`publicProfileSelect` duplication:** The Events domain already has this select shape in `events.repository.ts`. Both domains now repeat it. Flag in your handoff that these should be consolidated into `src/repositories/_types.ts` or `src/lib/userSelects.ts` after Groups lands. Do not do the consolidation now — it risks breaking the Events domain.

5. **FriendGroup member cascade on delete:** `FriendGroupMember` rows have no cascade on their FK in the schema (default `RESTRICT` in the migration). Delete all `FriendGroupMember` rows first in the same transaction, then delete the `FriendGroup`. Both writes go through `request.prismaTransaction` so they're atomic.

6. **AvailabilityBlock and Friendship are independent:** A user does not need to be a friend to block someone's availability, and blocking availability does not change friendship status. Keep the two repositories completely separate.

---

## What NOT to Build (Explicitly Out of Scope)

- `UserAvailability` (calendar windows, scheduling) — separate agent
- Event invite management — Events agent or a dedicated Invites agent
- User search / profile endpoints — Users domain agent
- Notifications on friend request — Notifications service (not yet built)
- Real-time presence or socket events — Socket.io agent (after all domain agents are done)
- Any changes to `schema.prisma` or existing migrations

---

## Handoff Document

When all code is done and `tsc --noEmit` passes clean, write `src/routes/FRIENDS_HANDOFF.md` following the same structure as `EVENTS_HANDOFF.md`:

1. **What was built** — table of files and their roles
2. **Endpoint reference** — method, path, body/query, status codes, behaviour summary
3. **Decisions made** — every non-obvious choice and why
4. **Open items for the Lead Manager** — anything deferred, anything that needs a cross-section decision, anything the Groups agent or Socket.io agent must know
5. **Suggested next agents** — Groups Domain (same contract) and any remaining open items

---

## Final Checklist Before Handing Off

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] All new routes are registered in `src/app.ts`
- [ ] Every repository method accepts `db: Db` and never imports the singleton directly
- [ ] Every read on `Friendship` includes `deletedAt: null`
- [ ] `FriendGroup` delete cascades `FriendGroupMember` rows in the same transaction
- [ ] The "other user" (`friend`) in friendship responses is derived in the service, not the controller
- [ ] No cross-domain imports (friends repo does not import from events repo, etc.)
- [ ] `FRIENDS_HANDOFF.md` is written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Friends Domain row → `COMPLETE (date)`

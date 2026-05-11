# Backend — Groups Domain Agent Prompt

> **You are the Backend / Groups Domain agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — do not build anything not listed here.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-api/`. The following is complete and must not be touched:

| Agent | Output | Key files |
|---|---|---|
| Schema / Migrations | `schema.prisma` with all 18 models; baseline + RLS migrations | `social-calendar-api/prisma/` |
| Auth (Clerk) | Global Fastify preHandler — verifies Clerk JWT, upserts User, opens per-request Prisma transaction with RLS, attaches `request.user` and `request.prismaTransaction` | `src/middleware/auth.middleware.ts`, `src/middleware/AUTH_HANDOFF.md` |
| Events Domain | 5 CRUD endpoints. The repo/service/controller/route pattern you must replicate. | `src/routes/EVENTS_HANDOFF.md` |
| Backend Cleanup | `GET /health` route; dual Prisma client (`prisma` = migration owner, `prismaApp` = app role). `request.prismaTransaction` now correctly engages RLS. | `src/BACKEND_CLEANUP_HANDOFF.md` |

**Read these files before writing any code:**
- `social-calendar-api/CLAUDE.md` — architecture rules, locked decisions
- `src/middleware/AUTH_HANDOFF.md` — the transaction + RLS contract
- `src/routes/EVENTS_HANDOFF.md` — reference implementation and decisions to follow
- `src/repositories/events.repository.ts` — the `Db` type and pattern to replicate
- `src/services/events.service.ts` — service error pattern
- `src/controllers/events.controller.ts` — Zod validation + error mapping pattern
- `src/app.ts` — how to register new route groups
- `src/BACKEND_CLEANUP_HANDOFF.md` — confirm dual-client setup is in place before starting

---

## Non-Negotiable Contracts

### 1. Always use `request.prismaTransaction`

```ts
// ✅ correct — RLS sees app.current_user_id
await request.prismaTransaction.socialGroup.findMany(...)

// ❌ wrong — singleton bypasses RLS
import { prisma } from '../config/prisma.js';
await prisma.socialGroup.findMany(...)
```

Repositories accept the transaction client as `db: Db`. The `Db` type is defined in `events.repository.ts` — import it from there or from `src/repositories/_types.ts` if it has been extracted. Do NOT redefine it.

### 2. Soft-delete filtering on `SocialGroup`

`SocialGroup` carries `deletedAt DateTime?`. Every read must include `deletedAt: null` in the `where` clause. RLS does not enforce this — the repository layer does.

`SocialGroupMember`, `GroupPoll`, `PollOption`, `PollVote`, `EventSuggestion`, and `SuggestionVote` have no `deletedAt` — hard deletes only.

### 3. Architecture direction is strict

```
Routes → Controllers → Services → Repositories → Database
```

Business logic lives exclusively in Services. Controllers handle HTTP only. No layer skips another.

### 4. Type-safe Prisma selects

Use `satisfies Prisma.<Model>Select` / `Prisma.<Model>Include` for shapes, and `Prisma.<Model>GetPayload<{ include: typeof … }>` for inferred return types. No `any`.

### 5. Register new routes in `src/app.ts`

After existing route registrations, add:
```ts
await app.register(groupsRoutes, { prefix: '/groups' });
```

---

## Schema — Models Owned by This Agent

```
SocialGroup       — id, name, description?, avatarUrl?, createdAt, updatedAt, deletedAt
SocialGroupMember — id, socialGroupId, userId, role (ADMIN|MEMBER), joinedAt
                    @@unique([socialGroupId, userId])

GroupPoll         — id, socialGroupId, eventId?, createdById, question, closedAt?, createdAt
PollOption        — id, pollId, text, order
PollVote          — id, pollOptionId, userId  @@unique([pollOptionId, userId])

EventSuggestion   — id, socialGroupId, eventId?, suggestedById, title, description?, proposedDate?, createdAt
SuggestionVote    — id, suggestionId, userId, value (UP|DOWN)  @@unique([suggestionId, userId])
```

**Important schema facts:**
- `SocialGroup` has NO `creatorId` field. The creator is tracked as the first `SocialGroupMember` row with `role = ADMIN`, written atomically at creation time.
- `SocialGroup` has NO `isPublic` field. All groups are treated as invite-only — membership determines visibility.
- `GroupPoll` has an optional `eventId` — a poll can be tied to a specific event or be group-general.
- `EventSuggestion` also has an optional `eventId`. When `eventId` is set and that event has `allowSuggestionVoting = false`, votes on that suggestion must be rejected at the service layer.
- `PollVote.@@unique([pollOptionId, userId])` means one vote per user per option. A user can vote on multiple options in the same poll (multi-select). This is intentional.
- `SuggestionVote.@@unique([suggestionId, userId])` means one vote per user per suggestion (not per value). Changing your vote means updating the existing row, not inserting a new one.

---

## RLS Policies That Apply to This Domain

The RLS migration already defines these. You do not write them — you must understand them so your service layer produces the right HTTP responses.

| Table | Policy | Effect |
|---|---|---|
| `SocialGroup` | `socialgroup_member_select` | Only members can SELECT a group |
| `SocialGroup` | `socialgroup_admin_modify` | Only ADMINs can UPDATE or soft-DELETE |
| `SocialGroupMember` | `socialgroupmember_member_select` | Members can see other members of groups they belong to |
| `SocialGroupMember` | `socialgroupmember_admin_insert` | Only ADMINs can add members |
| `SocialGroupMember` | `socialgroupmember_admin_delete` | Only ADMINs can remove members (self-leave is also allowed — check this in service layer) |
| `GroupPoll` | `grouppoll_member_select` | Any member can see polls in their group |
| `GroupPoll` | `grouppoll_member_insert` | Any member can create a poll |
| `GroupPoll` | `grouppoll_creator_or_admin_modify` | Only the poll creator or a group ADMIN can close/delete |
| `PollVote` | `pollvote_member_vote` | Any member can vote (insert/delete their own vote) |
| `EventSuggestion` | `eventsuggestion_member_all` | Any member can create, read, and vote on suggestions |
| `SuggestionVote` | `suggestionvote_owner_modify` | A user can only modify their own vote |

When RLS blocks an operation, the query returns no rows (for SELECT) or affects 0 rows (for UPDATE/DELETE). Your service must interpret `count === 0` as 403 (forbidden) or 404 (not found) depending on whether a prior `findFirst` confirmed the row exists.

---

## Files to Create

Create only these files:

```
src/repositories/groups.repository.ts
src/services/groups.service.ts
src/controllers/groups.controller.ts
src/routes/groups.routes.ts

src/routes/GROUPS_HANDOFF.md     ← write this last, after all code is done
```

---

## Endpoint Specification

All endpoints live under the `/groups` prefix registered in `src/app.ts`.

### Social Groups — Core CRUD

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/groups` | List all groups the caller is a member of. Include member count and the caller's role. Filter `deletedAt: null`. | 200 |
| `GET` | `/groups/:id` | Get group details. Caller must be a member (RLS enforces, returns 404 if not). Include member count and caller's role. | 200, 404 |
| `POST` | `/groups` | Create a group. Body: `{ name: string, description?: string, avatarUrl?: string }`. Atomically: create the `SocialGroup` row and create the first `SocialGroupMember` row with `role = ADMIN` for the caller. Both writes in the same `request.prismaTransaction`. | 201, 400 |
| `PATCH` | `/groups/:id` | Update group details. Body: any subset of `{ name, description, avatarUrl }`. ADMIN only. | 200, 400, 403, 404 |
| `DELETE` | `/groups/:id` | Soft-delete the group (`deletedAt = now()`). ADMIN only. Does NOT cascade-delete members — soft-deleted groups are hidden from reads by `deletedAt: null` filtering; member rows become orphaned but are harmless. | 204, 403, 404 |

**Group response shape (GET /groups and GET /groups/:id):**
```ts
{
  id, name, description, avatarUrl, createdAt, updatedAt,
  memberCount: number,
  viewerRole: 'ADMIN' | 'MEMBER',
}
```

---

### Members

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/groups/:id/members` | List members with their public profiles and roles. Caller must be a member. | 200, 403, 404 |
| `POST` | `/groups/:id/members` | Add a member. Body: `{ userId: string }`. ADMIN only. Reject if already a member (409). The added user does NOT receive a notification from this agent — that's the notifications service. | 201, 400, 403, 404, 409 |
| `DELETE` | `/groups/:id/members/:userId` | Remove a member. ADMIN can remove anyone. A non-ADMIN can only remove themselves (self-leave). If the last ADMIN leaves, reject with 400 and message "A group must have at least one admin." No-op if user is not a member (return 204). | 204, 400, 403, 404 |
| `PATCH` | `/groups/:id/members/:userId` | Change a member's role. Body: `{ role: 'ADMIN' | 'MEMBER' }`. ADMIN only. Cannot demote yourself if you are the only ADMIN (return 400). | 200, 400, 403, 404 |

**Member response shape:**
```ts
{
  id, socialGroupId, userId, role, joinedAt,
  user: { id, username, displayName, avatarUrl },
}
```

---

### Polls

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/groups/:id/polls` | List polls in the group. Include options with vote counts. Any member. Optional `?open=true` to filter to unclosed polls only. | 200, 403, 404 |
| `POST` | `/groups/:id/polls` | Create a poll. Body: `{ question: string, options: string[], eventId?: string }`. `options` must have 2–10 items. Options are stored as `PollOption` rows with `order` = array index. Any group member. | 201, 400, 403, 404 |
| `PATCH` | `/groups/:id/polls/:pollId` | Close a poll (`closedAt = now()`). Cannot re-open a closed poll. Poll creator or group ADMIN only. | 200, 403, 404 |
| `DELETE` | `/groups/:id/polls/:pollId` | Delete a poll and all its options and votes (hard delete, cascade in service layer). Poll creator or group ADMIN only. | 204, 403, 404 |

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

`viewerHasVoted` per option is derived by checking if a `PollVote` row exists for `{ pollOptionId: option.id, userId: currentUserId }`.

---

### Poll Votes

| Method | Path | Description | Status codes |
|---|---|---|---|
| `POST` | `/groups/:id/polls/:pollId/options/:optionId/vote` | Cast a vote on a specific option. One vote per user per option — reject if already voted on this option (409). Reject if poll is closed (400). Any member. | 201, 400, 403, 404, 409 |
| `DELETE` | `/groups/:id/polls/:pollId/options/:optionId/vote` | Remove the caller's vote on a specific option. No-op if not voted (return 204). Reject if poll is closed (400). | 204, 400, 403, 404 |

---

### Suggestions

| Method | Path | Description | Status codes |
|---|---|---|---|
| `GET` | `/groups/:id/suggestions` | List event suggestions in the group. Include vote totals and viewer's vote. Any member. | 200, 403, 404 |
| `POST` | `/groups/:id/suggestions` | Create a suggestion. Body: `{ title: string, description?: string, proposedDate?: ISO8601, eventId?: string }`. Any member. | 201, 400, 403, 404 |
| `DELETE` | `/groups/:id/suggestions/:suggestionId` | Delete a suggestion and its votes (hard delete). Suggestion creator or group ADMIN only. | 204, 403, 404 |

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

---

### Suggestion Votes

| Method | Path | Description | Status codes |
|---|---|---|---|
| `POST` | `/groups/:id/suggestions/:suggestionId/vote` | Cast or change a vote. Body: `{ value: 'UP' \| 'DOWN' }`. If the user has already voted with a different value, update the existing row (upsert on `@@unique([suggestionId, userId])`). If `eventId` is set on the suggestion and that event has `allowSuggestionVoting = false`, reject with 403. Any group member. | 201, 400, 403, 404 |
| `DELETE` | `/groups/:id/suggestions/:suggestionId/vote` | Remove the caller's vote. No-op if no vote exists (return 204). | 204, 403, 404 |

---

## Domain Error Classes

Define these in the service file:

```ts
// groups.service.ts
SocialGroupNotFoundError
SocialGroupForbiddenError          // caller is not a member or not ADMIN when required
SocialGroupLastAdminError          // cannot remove/demote the last ADMIN
SocialGroupMemberAlreadyExistsError  // 409
PollNotFoundError
PollClosedError                    // 400 — cannot vote on or re-open a closed poll
PollOptionNotFoundError
SuggestionNotFoundError
SuggestionVotingDisabledError      // 403 — event.allowSuggestionVoting is false
```

---

## Key Implementation Decisions to Make and Document

1. **Creator identity for SocialGroup:** There is no `creatorId` on `SocialGroup`. The creator is the first `ADMIN` member row written atomically at creation. When you need to identify "who created this group" for display purposes, join to `SocialGroupMember` where `role = ADMIN` and `joinedAt` is earliest. Flag if this becomes noisy.

2. **Atomic group creation:** `POST /groups` must create the `SocialGroup` row AND the creator's `SocialGroupMember` row (role: ADMIN) in a single `request.prismaTransaction` call. Both inserts must succeed or neither does.

3. **Cascade on poll delete:** `PollOption` rows and `PollVote` rows have no DB-level cascade on the schema. When deleting a poll, delete in this order within the same transaction: `PollVote` rows for all options → `PollOption` rows → `GroupPoll` row.

4. **Suggestion vote upsert:** Use `prisma.suggestionVote.upsert` on `@@unique([suggestionId, userId])` to handle the "change your vote" case atomically. The unique constraint is the upsert key.

5. **`publicProfileSelect` consolidation:** By now three domains (Events, Friends, Groups) all repeat the same user shape `{ id, username, displayName, avatarUrl }`. After this agent ships, the Lead Manager should consolidate into `src/repositories/_types.ts`. Flag this in your HANDOFF but do not do the consolidation yourself — it risks breaking existing domains.

6. **Member self-leave guard:** `DELETE /groups/:id/members/:userId` where `:userId === currentUser.id` is self-leave, allowed for non-ADMINs. For ADMINs, only allow self-leave if another ADMIN exists. Check `count of ADMIN members > 1` before allowing.

7. **`viewerHasVoted` and `viewerVote`:** These require one extra query per poll/suggestion list (or a sub-select). Use Prisma's `_count` and a filtered relation to avoid N+1. For polls, include `votes: { where: { pollOption: { pollId: pollId } } }` on the current user's angle, or use a raw `$queryRaw` if the shape is too awkward.

---

## What NOT to Build

- `UserAvailability` (calendar windows) — separate agent
- `FriendGroup` or `FriendGroupMember` — already built by the Friends Domain agent
- `EventOrganiser` management (co-host promotion) — Events domain
- `EventInvite` management — Events domain or dedicated Invites agent
- Real-time socket events — Socket.io agent (after all domain agents complete)
- Notifications on group invite — Notifications service (not yet built)
- Any changes to `schema.prisma` or existing migrations

---

## Handoff Document

When all code is done and `tsc --noEmit` passes clean, write `src/routes/GROUPS_HANDOFF.md`:

1. **What was built** — table of files and their roles
2. **Endpoint reference** — method, path, body/query, status codes, behaviour
3. **Decisions made** — every non-obvious choice and why
4. **Open items for the Lead Manager** — deferred work, cross-section flags, anything Socket.io or Jest agents must know
5. **Suggested next agents** — Socket.io Layer (now unblocked if Friends is also done)

---

## Final Checklist

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] All new routes registered in `src/app.ts` under `/groups` prefix
- [ ] Every repository method accepts `db: Db` and never imports the singleton directly
- [ ] Every read on `SocialGroup` includes `deletedAt: null`
- [ ] Group creation atomically writes `SocialGroup` + first `SocialGroupMember` (ADMIN)
- [ ] Poll delete cascades options and votes in the same transaction
- [ ] Last-admin guard on member remove and role demote
- [ ] Suggestion vote upsert handles value change correctly
- [ ] `allowSuggestionVoting` check before writing a `SuggestionVote`
- [ ] `GROUPS_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Groups Domain row → `COMPLETE (date)`

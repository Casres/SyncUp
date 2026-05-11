# Backend — Socket.io Layer Agent Handoff

**Agent:** Backend / Socket.io Layer
**Completed:** 2026-05-04
**Per:** `LEAD_MANAGER.md` → Backend → Socket.io Layer row.

---

## What was built

| File | Role |
|---|---|
| `src/sockets/index.ts` | **NEW.** Socket.io server initialiser. Clerk JWT auth middleware (verifies token at connect time, looks up the `User` row via the migration-owner `prisma` client, attaches it to `socket.data.user`). Registers every domain's handlers on the `connection` event. Returns the typed `Server` instance to be decorated onto Fastify. |
| `src/sockets/presence.socket.ts` | **NEW.** Presence tracking. Writes directly to Redis with the `presence:{userId}` key + 60s TTL. Joins each socket to its `user:{userId}` room. Emits `presence:update` to the user's accepted-friend rooms on connect, `presence:join`, `presence:leave`, and `disconnect`. The friend lookup runs via `prismaApp.$transaction` with `set_config('app.current_user_id', ...)` so RLS gates apply. |
| `src/sockets/events.socket.ts` | **NEW.** No client→server events. Documentation of where the Events service emits `event:updated` and where the future Invites agent should emit `event:invite:received` / `event:invite:rsvp`. |
| `src/sockets/friends.socket.ts` | **NEW.** No client→server events. Documentation of where the Friends service emits `friend:request:received` and `friend:request:accepted`. |
| `src/sockets/groups.socket.ts` | **NEW.** Implements `group:join` and `group:leave` client→server handlers. `group:join` validates membership via `prismaApp.$transaction` with RLS context before calling `socket.join('group:{groupId}')`. Silent failure on non-member joins (does not leak group existence). |
| `src/sockets/availability.socket.ts` | **NEW.** No client→server events. Stub-only with explicit `// TODO` for the future availability service to emit `availability:updated`. |
| `src/config/redis.ts` | **NEW.** `ioredis` singleton (`lazyConnect: true`, `maxRetriesPerRequest: 3`). Used only by the presence socket today. |
| `src/types/socket.types.ts` | **NEW.** Typed event map (`ServerToClientEvents`, `ClientToServerEvents`, `InterServerEvents`, `SocketData`). Payload types (`EventPayload`, `InvitePayload`, `FriendshipPayload`, `PollPayload`, `SuggestionPayload`, `MemberPayload`, `AvailabilityBlockPayload`, `EventExceptionPayload`, `PublicProfile`) mirror the REST response shapes documented in `EVENTS_HANDOFF.md`, `FRIENDS_HANDOFF.md`, `GROUPS_HANDOFF.md` exactly — Date fields are pre-stringified to ISO so the wire shape is byte-identical to the REST JSON output. |
| `src/types/fastify.d.ts` | **MODIFIED.** Added `interface FastifyInstance { io: SocketIOServer<...> }` so services receive the typed server through `request.server.io`. The existing `FastifyRequest` augmentations are unchanged. |
| `src/server.ts` | **MODIFIED.** After `app.listen({...})`, calls `initSocketServer(app)` and then `app.decorate('io', io)`. |
| `src/services/events.service.ts` | **MODIFIED.** Added optional `io?: Server<...>` parameter to `update(...)`. Emits `event:updated` to every organiser + every accepted invitee's user-room after the Prisma write succeeds. New helpers `toEventPayload` and `audienceFor` are pure derivations — no extra query. |
| `src/services/friends.service.ts` | **MODIFIED.** Added optional `io?: Server<...>` parameter to `sendRequest(...)` and `respondToRequest(...)`. Emits `friend:request:received` to the recipient's user-room on send; emits `friend:request:accepted` to the initiator's user-room when `action === 'accept'`. Added `toFriendshipPayload(...)` helper that re-shapes the friendship from the recipient's perspective so `friend` is always the OTHER party. |
| `src/services/groups.service.ts` | **MODIFIED.** Added optional `io?: Server<...>` parameter to `addMember`, `removeMember`, `createPoll`, `closePoll`, `voteOnPollOption`, `removePollVote`, `createSuggestion`, `voteOnSuggestion`, `removeSuggestionVote`. Each emits to the `group:{groupId}` room. Added wire-format converters (`pollToPayload`, `suggestionToPayload`, `memberToPayload`) and a `countVotes` helper. The vote endpoints re-fetch the affected poll/suggestion to compute the new totals so the broadcast payload is accurate. |
| `src/controllers/events.controller.ts` | **MODIFIED.** `update` handler passes `request.server.io` through to `eventsService.update(...)`. No other handler changed. |
| `src/controllers/friends.controller.ts` | **MODIFIED.** `sendRequest` and `respondToRequest` pass `request.server.io` through. |
| `src/controllers/groups.controller.ts` | **MODIFIED.** Nine handlers (the ones that map to socket-emitting service methods) pass `request.server.io` through. |
| `package.json` (backend workspace) | **MODIFIED.** Added `socket.io ^4.8.3` and `ioredis ^5.10.1`. |

No new repository files. No domain queries inside socket handlers (the only Prisma calls are presence's friend lookup and `group:join`'s membership check — both go through `prismaApp` with RLS context).

---

## Verification

- `cd social-calendar-api && npx tsc --noEmit` — **zero errors, zero output**. Verified at handoff (printed `TSC_OK` from a chained verification).
- Fastify `interface FastifyInstance { io: SocketIOServer<...> }` augmentation compiles; `request.server.io` is typed everywhere it's referenced.
- Auth middleware on Socket.io: verifies Clerk JWT via `verifyToken` from `@clerk/backend`. Looks up `User` via the `prisma` (migration-owner) client because no `app.current_user_id` is set on a brand-new socket connection.
- `group:join` membership check: runs inside `prismaApp.$transaction` with `set_config('app.current_user_id', ...)`; RLS hides non-member rows so the lookup returns null and `socket.join` is skipped silently.
- Presence writes: every reachable code path uses `redis.set(...)` / `redis.del(...)` directly. No service layer involved.
- All 5 domain handlers wired in `index.ts`: `registerPresenceHandlers`, `registerEventsHandlers`, `registerFriendsHandlers`, `registerGroupsHandlers`, `registerAvailabilityHandlers`.

---

## Event map (full)

### Server → Client

| Event | Audience (room) | Payload | Triggered by |
|---|---|---|---|
| `presence:update` | `user:{friendId}` for every accepted friend of the affected user | `{ userId, status: 'online' \| 'offline' }` | Socket connect, `presence:join`, `presence:leave`, disconnect |
| `event:updated` | `user:{organiserId}` (creator + co-hosts) + `user:{recipientId}` for every ACCEPTED invitee | `{ eventId, event: EventPayload }` | `eventsService.update(...)` after the Prisma write |
| `event:invite:received` | `user:{recipientId}` | `{ invite: InvitePayload }` | **TODO (Invites agent)** — hook in `POST /events/:id/invites` |
| `event:invite:rsvp` | `user:{organiserId}` for every organiser | `{ eventId, inviteId, status }` | **TODO (Invites agent)** — hook in `PATCH /events/:id/invites/:inviteId` |
| `friend:request:received` | `user:{recipientId}` | `{ friendship: FriendshipPayload }` | `friendsService.sendRequest(...)` after the Prisma write |
| `friend:request:accepted` | `user:{initiatorId}` | `{ friendship: FriendshipPayload }` | `friendsService.respondToRequest(...)` when `action === 'accept'` |
| `group:poll:created` | `group:{groupId}` | `{ groupId, poll: PollPayload }` | `groupsService.createPoll(...)` |
| `group:poll:closed` | `group:{groupId}` | `{ groupId, pollId }` | `groupsService.closePoll(...)` |
| `group:poll:vote` | `group:{groupId}` | `{ groupId, pollId, optionId, voteCount }` | `groupsService.voteOnPollOption(...)` and `removePollVote(...)` (both fire) |
| `group:suggestion:created` | `group:{groupId}` | `{ groupId, suggestion: SuggestionPayload }` | `groupsService.createSuggestion(...)` |
| `group:suggestion:vote` | `group:{groupId}` | `{ groupId, suggestionId, upvotes, downvotes }` | `groupsService.voteOnSuggestion(...)` and `removeSuggestionVote(...)` (both fire) |
| `group:member:added` | `group:{groupId}` | `{ groupId, member: MemberPayload }` | `groupsService.addMember(...)` |
| `group:member:removed` | `group:{groupId}` | `{ groupId, userId }` | `groupsService.removeMember(...)` (only when count > 0) |
| `availability:updated` | `user:{friendId}` for friends of affected user (minus those with an `AvailabilityBlock`) | `{ userId }` | **TODO (Availability service agent)** |

**Total events: 14** (12 wired today + 3 TODO call sites for future agents).

### Client → Server

| Event | Behaviour |
|---|---|
| `presence:join` | Refreshes the Redis presence record (TTL 60s) and re-emits `presence:update { status: 'online' }` to friends. The `userId` in the payload is informational — the server always trusts `socket.data.user.id`. |
| `presence:leave` | Clears the Redis presence record and emits `presence:update { status: 'offline' }` to friends. |
| `group:join` | Validates membership via `prismaApp.$transaction` with RLS context. On success, joins the socket to `group:{groupId}`. On failure (non-member, group missing, RLS-hidden), silent no-op. |
| `group:leave` | Calls `socket.leave('group:{groupId}')` unconditionally. |

---

## How services call `io.emit` (Option A pattern)

Per the agent prompt, we adopted **Option A**: each service method that should push notifications takes an optional `io?: Server<...>` parameter as its last argument. After the Prisma write succeeds, the service computes the target room(s) and emits.

The controller plumbs `request.server.io` through:

```ts
// src/controllers/events.controller.ts
const event = await eventsService.update(
  request.prismaTransaction,
  params.data.id,
  request.user.id,
  body.data,
  request.server.io,   // ← decorated in src/server.ts after app.listen()
);
```

```ts
// src/services/events.service.ts
async update(db, id, userId, input, io?) {
  // ...validation + Prisma write...
  if (io) {
    const payload = toEventPayload(updated);
    for (const recipientId of audienceFor(updated)) {
      io.to(`user:${recipientId}`).emit('event:updated', { eventId, event: payload });
    }
  }
  return updated;
}
```

**Why Option A over an EventEmitter:**
- The service already has the data + the Prisma row — no extra hop.
- `io` is optional, so unit tests can call the service without standing up a Socket.io server.
- No new module to bootstrap.

**Wire format note:** Socket payloads pre-stringify `Date` fields to ISO so the JSON emitted over the socket is byte-identical to the REST JSON response. The frontend can hydrate either with the same parser.

**Audience derivation note:** For `event:updated`, the audience (organisers + accepted invitees) is computed in-memory from the Prisma row's included relations (`event.organisers[].user.id` + `event.invites[].recipient.id` filtered by `status === ACCEPTED`). No extra query.

---

## Presence Redis key schema

```
presence:{userId}  →  JSON { socketId, connectedAt }   TTL: 60s
```

- **Set on:** socket `connection` (initial), every `presence:join` heartbeat.
- **Cleared on:** `presence:leave`, socket `disconnect`.
- **TTL:** 60 seconds. Clients should send `presence:join` every 30–45 seconds to refresh; if a connection drops without a clean disconnect, the key auto-expires.
- **Best-effort:** Redis errors (network, etc.) are swallowed — the socket still works, just without an online indicator. Same for the friend lookup that drives the `presence:update` audience.
- **Trust model:** the server always uses `socket.data.user.id` (set by the auth middleware) as the source of truth — never anything from the client payload — so a malicious client cannot spoof presence for another user.

---

## Stub call sites (`// TODO` comments left for future agents)

Searchable via `grep -rn "TODO" src/sockets/`:

1. **`src/sockets/events.socket.ts`** — comment block listing the two Invites push points:
   - `event:invite:received` (target `user:{recipientId}`) — triggered by `POST /events/:id/invites` when the Invites agent ships.
   - `event:invite:rsvp` (target `user:{organiserId}` for every organiser) — triggered by `PATCH /events/:id/invites/:inviteId`.

   Suggested service signatures (from the comment):
   ```
   invitesService.create(db, io, eventId, recipientIds[]) → InvitePayload[]
   invitesService.respond(db, io, inviteId, status) → void
   ```

2. **`src/sockets/availability.socket.ts`** — entire file is a stub. The future Availability service must emit `availability:updated { userId }` from create / update / delete methods. Audience: accepted friends of the affected user, MINUS anyone in `AvailabilityBlock` with `blockedId === userId`. Recommended service signatures (from the comment):
   ```
   availabilityService.create(db, io, userId, input) → UserAvailabilityRow
   availabilityService.update(db, io, userId, id, input) → UserAvailabilityRow
   availabilityService.delete(db, io, userId, id) → void
   ```

3. **`src/sockets/friends.socket.ts`** and **`src/sockets/events.socket.ts`** — both files contain doc comments listing every emit point already wired. No code-action TODOs in either.

---

## Open items (for the Lead Manager + Jest agent)

1. **No Redis adapter for horizontal scaling.** A single `Server` instance handles every connection — emits to a room reach only sockets connected to THIS process. When DevOps adds a second API node, install `@socket.io/redis-adapter` and pass it into the `Server` constructor. The `InterServerEvents` interface in `socket.types.ts` is reserved for that day. **Not a blocker for v1.**

2. **CORS is `origin: '*'`.** React Native does not send a browser `Origin` header so this is safe today. Tighten when a web client lands.

3. **Disconnect dual-emit.** Both `presence.socket.ts` and `index.ts` register `disconnect` handlers — `presence` clears Redis + emits `presence:update`, `index` only logs. Order: presence's handler runs first (it's registered first in the connection callback), index's runs after. No conflict, both are intentional.

4. **`presence:update` re-emits "online" on every `presence:join`.** Acceptable for v1 — the frontend can de-dupe. If volume becomes a problem, the heartbeat path can read a "previously emitted" flag from the Redis record and only re-emit on a status change.

5. **`group:poll:vote` and `group:suggestion:vote` re-fetch after the write.** The repository's `findPollById` / `findSuggestionById` includes the relations needed to compute the new vote totals. This costs one extra round-trip per vote — acceptable for v1, flag if `group:{groupId}` rooms become hot. A `$queryRaw` aggregate would be a single statement.

6. **`event:updated` audience** intentionally excludes invitees with `status` other than `ACCEPTED`. PENDING / DECLINED / MAYBE invitees do NOT receive update pushes. If the Invites agent wants to broaden this (e.g. notify PENDING invitees of a date change), update `audienceFor(...)` in `events.service.ts`.

7. **Soft-deleted friendships still tracked for presence.** The `getFriendUserIds` helper filters `deletedAt: null` and `status: ACCEPTED`. A soft-deleted (decline / unfriend) friendship is correctly excluded — the user goes back to "stranger" status and stops receiving presence updates from the other party.

8. **Jest / Supertest considerations:**
   - Socket.io tests need a test server bound to a random port. Use `socket.io-client` with `auth: { token: '<test-jwt>' }`.
   - The auth middleware needs Clerk's `verifyToken` to be mocked at the module boundary (or use a `JEST_TEST_BYPASS_AUTH=1` flag — out of scope here).
   - For service-level emit tests, the `io?` parameter is optional — pass a mock with `to(room) → { emit(event, payload) }`. Easier than stubbing the real `Server`.
   - Multi-client scenarios (e.g. presence emission to friends) are easier to validate with two `socket.io-client` instances connected to the same test server.

---

## Frontend contract

`src/types/socket.types.ts` is the source of truth for the Socket.io event map. The mobile app (`social-calendar-mobile/`) MUST mirror this file. When a payload shape changes:

1. Update `socket.types.ts` here.
2. Mirror the change to the mobile workspace's equivalent file.
3. Audit all `io.emit(...)` call sites in services — TypeScript will error on any that drift.

Per `CLAUDE.md`: socket events update React Query's cache directly on the frontend. They do NOT write to Zustand. A typical handler:

```ts
socket.on('event:updated', ({ eventId, event }) => {
  queryClient.setQueryData(['event', eventId], event);
});

socket.on('group:poll:vote', ({ groupId, pollId, optionId, voteCount }) => {
  queryClient.setQueryData(['group', groupId, 'polls'], (old) =>
    /* ...patch the option's voteCount in the list... */
  );
});
```

For room-scoped events, the mobile client should call `socket.emit('group:join', { groupId })` whenever a group screen mounts and `socket.emit('group:leave', { groupId })` on unmount. Presence (`presence:join`) should fire on app foreground and every 30s while the app is foregrounded.

---

## How downstream agents plug in

### Invites agent (next)

```ts
// src/services/invites.service.ts (does not exist yet)
async create(db: Db, eventId: string, recipientIds: string[], io?: IoServer) {
  const invites = await invitesRepository.createMany(db, eventId, recipientIds);
  if (io) {
    for (const inv of invites) {
      io.to(`user:${inv.recipientId}`).emit('event:invite:received', {
        invite: toInvitePayload(inv),
      });
    }
  }
  return invites;
}

async respond(db: Db, inviteId: string, userId: string, status: InviteStatus, io?: IoServer) {
  const updated = await invitesRepository.update(db, inviteId, status);
  if (io) {
    // Notify every organiser of the parent event
    for (const organiser of updated.event.organisers) {
      io.to(`user:${organiser.userId}`).emit('event:invite:rsvp', {
        eventId: updated.eventId,
        inviteId: updated.id,
        status: updated.status,
      });
    }
  }
  return updated;
}
```

### Availability service agent (next)

```ts
// src/services/availability.service.ts (does not exist yet)
async create(db: Db, userId: string, input, io?: IoServer) {
  const row = await availabilityRepository.create(db, userId, input);
  if (io) {
    const friendIds = await getRelevantFriendIds(db, userId);  // filters out blockers
    for (const friendId of friendIds) {
      io.to(`user:${friendId}`).emit('availability:updated', { userId });
    }
  }
  return row;
}
```

The `getRelevantFriendIds` helper is the new one to write — it joins `Friendship` (status: ACCEPTED) with `AvailabilityBlock` (excluding rows where `blockerId` is the friend AND `blockedId` is the affected user).

---

## Suggested next agents

- **Backend / Invites domain** — straight Option A wiring, two push events. See "How downstream agents plug in" above.
- **Backend / Availability service** — build the CRUD + plug into `availability:updated`.
- **DevOps / Jest + Supertest infrastructure** — socket tests should be in scope per "Open items #8".
- **Frontend / Socket client wiring** — mirror `socket.types.ts` into the mobile app, build a React Query / socket bridge that calls `setQueryData` on every push.

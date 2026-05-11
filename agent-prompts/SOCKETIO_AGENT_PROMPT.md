# Backend — Socket.io Layer Agent Prompt

> **You are the Backend / Socket.io Layer agent.** Read this entire document before writing a single line of code. Your job is to wire up real-time events by calling existing services — you do NOT write business logic, you do NOT modify the database schema, and you do NOT touch any existing domain code.

---

## Context: What Has Already Been Built

All domain agents are complete before you start. Read their handoffs first:

| Agent | Handoff file | What you need from it |
|---|---|---|
| Auth (Clerk) | `src/middleware/AUTH_HANDOFF.md` | How `request.user` is attached; the `Db` type pattern |
| Events Domain | `src/routes/EVENTS_HANDOFF.md` | Event shape, organiser/invite relationships |
| Friends Domain | `src/routes/FRIENDS_HANDOFF.md` | Friendship status, availability block structure |
| Groups Domain | `src/routes/GROUPS_HANDOFF.md` | SocialGroup membership, polls, suggestions |
| Backend Cleanup | `src/BACKEND_CLEANUP_HANDOFF.md` | Dual Prisma client setup — `prisma` vs `prismaApp` |

**Also read:**
- `social-calendar-api/CLAUDE.md` — architecture rules (Socket handlers call Services, no business logic in handlers, presence writes directly to Redis)
- `src/config/redis.ts` — the ioredis singleton (if it exists; create it if not)

---

## Core Rules — Read These First

From `CLAUDE.md`, these are locked and non-negotiable:

```
Socket handlers may call Services. They do not contain business logic.
Presence tracking writes directly to Redis — not through the repository layer.
On the frontend, socket events update React Query's cache directly. They do not write to Zustand.
```

This means:
- Every meaningful action a socket handler performs must go through an existing Service method
- Presence (online/offline/typing) is the one exception — write to Redis directly
- You do not add any new service methods unless they are purely presence-related
- You do not add any new Prisma queries directly in socket handlers

---

## Setup — Socket.io Server

### Install dependencies (if not already installed)

```bash
cd social-calendar-api
npm install socket.io
npm install --save-dev @types/socket.io  # if needed — check if types are bundled
```

### Create `src/config/redis.ts` (if it does not exist)

```ts
import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});
```

### Create `src/types/socket.types.ts`

This file defines the typed Socket.io event map. It must be kept in sync with the frontend (noted in `CLAUDE.md`). Define the events you implement here — the frontend team will mirror them.

```ts
export interface ServerToClientEvents {
  // Presence
  'presence:update': (data: { userId: string; status: 'online' | 'offline' }) => void;

  // Events
  'event:updated': (data: { eventId: string; event: EventPayload }) => void;
  'event:invite:received': (data: { invite: InvitePayload }) => void;
  'event:invite:rsvp': (data: { eventId: string; inviteId: string; status: string }) => void;

  // Friends
  'friend:request:received': (data: { friendship: FriendshipPayload }) => void;
  'friend:request:accepted': (data: { friendship: FriendshipPayload }) => void;

  // Groups
  'group:poll:created': (data: { groupId: string; poll: PollPayload }) => void;
  'group:poll:closed': (data: { groupId: string; pollId: string }) => void;
  'group:poll:vote': (data: { groupId: string; pollId: string; optionId: string; voteCount: number }) => void;
  'group:suggestion:created': (data: { groupId: string; suggestion: SuggestionPayload }) => void;
  'group:suggestion:vote': (data: { groupId: string; suggestionId: string; upvotes: number; downvotes: number }) => void;
  'group:member:added': (data: { groupId: string; member: MemberPayload }) => void;
  'group:member:removed': (data: { groupId: string; userId: string }) => void;

  // Availability
  'availability:updated': (data: { userId: string }) => void;
}

export interface ClientToServerEvents {
  'presence:join': (data: { userId: string }) => void;
  'presence:leave': (data: { userId: string }) => void;
  'group:join': (data: { groupId: string }) => void;
  'group:leave': (data: { groupId: string }) => void;
}

// Define payload types to match what domain agents return
// Use the same field names as the REST API responses — do not diverge
export type EventPayload = { /* mirror GET /events/:id response shape */ };
export type InvitePayload = { /* mirror EventInvite shape from EVENTS_HANDOFF.md */ };
export type FriendshipPayload = { /* mirror Friendship response shape from FRIENDS_HANDOFF.md */ };
export type PollPayload = { /* mirror poll response shape from GROUPS_HANDOFF.md */ };
export type SuggestionPayload = { /* mirror suggestion response shape from GROUPS_HANDOFF.md */ };
export type MemberPayload = { /* mirror member response shape from GROUPS_HANDOFF.md */ };
```

Fill in the payload types by reading the actual response shapes documented in each domain's HANDOFF.md. Match them exactly — the frontend will expect the same shape.

---

## Folder Structure to Create

```
src/sockets/
  index.ts               ← Socket.io server init + auth middleware
  presence.socket.ts     ← online/offline, Redis presence
  events.socket.ts       ← event update + invite real-time push
  friends.socket.ts      ← friend request real-time push
  groups.socket.ts       ← polls, suggestions, membership real-time push
  availability.socket.ts ← availability change invalidation push

src/config/redis.ts      ← ioredis singleton (create if missing)
src/types/socket.types.ts ← typed event map
src/sockets/SOCKETIO_HANDOFF.md ← write last
```

---

## `src/sockets/index.ts` — Server Initialization

```ts
import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket.types.js';
import { registerPresenceHandlers } from './presence.socket.js';
import { registerEventsHandlers } from './events.socket.js';
import { registerFriendsHandlers } from './friends.socket.js';
import { registerGroupsHandlers } from './groups.socket.js';
import { registerAvailabilityHandlers } from './availability.socket.js';
import { verifyToken } from '@clerk/backend';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';  // migration-owner client — for user lookup at connect time

export function initSocketServer(fastify: FastifyInstance) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Auth middleware — verify Clerk JWT on every socket connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));

    try {
      const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      const user = await prisma.user.findUnique({
        where: { clerkId: claims.sub },
        select: { id: true, username: true, displayName: true },
      });
      if (!user) return next(new Error('User not found'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    registerPresenceHandlers(io, socket);
    registerEventsHandlers(io, socket);
    registerFriendsHandlers(io, socket);
    registerGroupsHandlers(io, socket);
    registerAvailabilityHandlers(io, socket);
  });

  return io;
}
```

Call `initSocketServer(app)` in `src/server.ts` after `app.listen(...)`.

---

## Presence (`presence.socket.ts`)

Presence is the one place where you write directly to Redis without going through a service.

**On connect:** Store `userId → socketId` in Redis with a short TTL (30s, refreshed by heartbeat). Emit `presence:update` to relevant rooms.

**On `presence:join`:** Add socket to a user-specific room (`user:${userId}`). Emit `presence:update { userId, status: 'online' }` to friends.

**On `presence:leave` / `disconnect`:** Remove from Redis. Emit `presence:update { userId, status: 'offline' }` to friends.

**Redis key pattern:**
```
presence:{userId}  →  JSON { socketId, connectedAt }  TTL: 60s
```

Emit presence updates only to users who are friends with the affected user. To determine who to notify, use the `prismaApp` client (NOT the singleton) to query accepted friendships. Import `prismaApp` from `../config/prisma.js`.

---

## Events Socket (`events.socket.ts`)

Socket.io does not replace the REST API for event CRUD. It supplements it by pushing notifications after REST mutations.

These are **outbound-only emissions** — the socket server listens for internal signals (via `io.emit` or an EventEmitter from the service layer) and pushes to connected clients. There are no client→server events for event CRUD.

**How to wire push notifications from REST endpoints:**

Option A (recommended) — emit directly from the existing service methods after the transaction commits. Add an optional `io` parameter to service methods that should push.

Option B — use a Node.js `EventEmitter` singleton that services emit on, and socket handlers subscribe to.

Choose Option A for simplicity. The service layer already has access to the data needed — just add an optional `io?: Server` parameter and emit after the Prisma operation succeeds.

**Events to emit:**

| Trigger | Event name | Room | Payload |
|---|---|---|---|
| Event updated (PATCH) | `event:updated` | All event organisers + accepted invitees | `{ eventId, event }` |
| Invite created (POST /events/:id/invites — when it exists) | `event:invite:received` | Recipient's user room | `{ invite }` |
| RSVP updated | `event:invite:rsvp` | Event organisers | `{ eventId, inviteId, status }` |

Note: Invite endpoints do not exist yet (flagged in EVENTS_HANDOFF.md). Wire the socket emission point as a stub/comment so the Invites agent knows where to call `io.emit(...)`.

---

## Friends Socket (`friends.socket.ts`)

**Events to emit:**

| Trigger | Event name | Room | Payload |
|---|---|---|---|
| Friend request sent | `friend:request:received` | Recipient's user room | `{ friendship }` |
| Friend request accepted | `friend:request:accepted` | Initiator's user room | `{ friendship }` |

Wire these into the Friends service methods the same way as Events — optional `io` parameter.

---

## Groups Socket (`groups.socket.ts`)

**Room strategy:** Each `SocialGroup` gets its own Socket.io room: `group:${groupId}`. Clients join with `group:join` and leave with `group:leave`. The server validates that the joining user is a member of the group before allowing the join.

**Events to emit:**

| Trigger | Event name | Room | Payload |
|---|---|---|---|
| Poll created | `group:poll:created` | `group:${groupId}` | `{ groupId, poll }` |
| Poll closed | `group:poll:closed` | `group:${groupId}` | `{ groupId, pollId }` |
| Vote cast/removed | `group:poll:vote` | `group:${groupId}` | `{ groupId, pollId, optionId, voteCount }` |
| Suggestion created | `group:suggestion:created` | `group:${groupId}` | `{ groupId, suggestion }` |
| Suggestion voted | `group:suggestion:vote` | `group:${groupId}` | `{ groupId, suggestionId, upvotes, downvotes }` |
| Member added | `group:member:added` | `group:${groupId}` | `{ groupId, member }` |
| Member removed | `group:member:removed` | `group:${groupId}` | `{ groupId, userId }` |

**`group:join` handler:**
```ts
socket.on('group:join', async ({ groupId }) => {
  // Verify caller is a member before joining the room
  const membership = await prismaApp.socialGroupMember.findUnique({
    where: { socialGroupId_userId: { socialGroupId: groupId, userId: socket.data.user.id } },
  });
  if (membership) socket.join(`group:${groupId}`);
});
```

---

## Availability Socket (`availability.socket.ts`)

When a user's availability changes (a `UserAvailability` row is created, updated, or deleted), push a cache-invalidation signal to friends who have the inviting screen open.

**Event to emit:**

| Trigger | Event name | Room | Payload |
|---|---|---|---|
| UserAvailability write | `availability:updated` | Relevant friends' user rooms | `{ userId }` |

Keep the payload minimal — just the `userId`. The frontend re-fetches the full availability data via the REST API. This avoids embedding stale data in the socket event.

Wire the emission into the availability service layer (which doesn't exist yet — stub the call site with a comment: `// TODO: emit availability:updated when this service is built`).

---

## Register Socket.io in `src/server.ts`

```ts
import { initSocketServer } from './sockets/index.js';

// After app.listen():
const io = initSocketServer(app);
```

Store `io` on the Fastify instance if services need to emit from REST handlers:
```ts
// In src/app.ts or server.ts:
fastify.decorate('io', io);
// In src/types/fastify.d.ts:
import type { Server } from 'socket.io';
declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}
```

Then services can call `fastify.io.to(...).emit(...)`.

---

## What NOT to Build

- Any new REST endpoints — this agent is socket-only
- Business logic inside socket handlers — call existing services
- New Prisma schema changes
- The availability CRUD service (a separate future agent) — stub the call site only
- The invites REST endpoints (a separate future agent) — stub the call site only
- Frontend socket client code — that belongs to the Frontend agents

---

## Handoff Document

When all code is done and `tsc --noEmit` passes, write `src/sockets/SOCKETIO_HANDOFF.md`:

1. **What was built** — file table with roles
2. **Event map reference** — all ServerToClientEvents and ClientToServerEvents with payload shapes
3. **How services call `io.emit`** — the pattern used (Option A/B and why)
4. **Presence Redis key schema** — exact key pattern and TTL
5. **Stub call sites** — list of `// TODO` comments left in code for future agents (availability service, invites)
6. **Open items** — anything the Jest/Supertest agent needs to know when writing integration tests
7. **Frontend contract** — note that `src/types/socket.types.ts` must be mirrored in the mobile app

---

## Final Checklist

- [ ] `tsc --noEmit` passes with zero errors in `social-calendar-api/`
- [ ] Socket.io server initialized in `src/server.ts` after `app.listen()`
- [ ] Auth middleware on Socket.io verifies Clerk JWT at connect time
- [ ] Presence writes to Redis directly, not through a service
- [ ] Group room join validates membership before allowing `socket.join()`
- [ ] All domain socket files created and registered in `src/sockets/index.ts`
- [ ] `src/types/socket.types.ts` created with fully typed event map
- [ ] `src/config/redis.ts` exists (created or already existed)
- [ ] Stub call sites left for availability service and invites (with `// TODO` comments)
- [ ] `SOCKETIO_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Socket.io Layer row → `COMPLETE (date)`

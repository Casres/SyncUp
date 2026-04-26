# SyncUp — Claude Code Context

This file is the source of truth for Claude Code. Read it fully before writing any code.

---

## Project Overview

SyncUp is a cross-platform (iOS + Android) social calendar app. It lets users share availability, invite friends to events, manage groups, and vote on group plans in real time.

**Frontend:** React Native + Expo (TypeScript)
**Backend:** Node.js + Fastify (TypeScript) — this is what we are building now.

---

## Current Status

Planning and design are complete. The frontend prototype is built and running against typed mock data in `src/api/`. We are now implementing the backend one vertical slice at a time.

**Do not scaffold every folder at once. Create a file only when it is needed for the current slice.**

---

## What We Are Building Now — First Slice: `GET /events/:id`

Create exactly these files, in this order:

1. `prisma/schema.prisma` — full v2 schema (see section below)
2. `src/config/env.ts` — Zod-validated environment variables
3. `src/config/prisma.ts` — PrismaClient singleton
4. `src/server.ts` — Fastify instance, register plugins, listen
5. `src/app.ts` — plugin registration
6. `src/repositories/events.repository.ts` — Prisma query for fetching a single event
7. `src/services/events.service.ts` — business logic layer for events
8. `src/controllers/events.controller.ts` — parse request, call service, return response
9. `src/routes/events.routes.ts` — wire up `GET /events/:id`

Once this works end-to-end, swap the corresponding mock function in the frontend's `src/api/events.ts` to call the real endpoint.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Fastify |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / Presence | Redis (ioredis) |
| Auth | Clerk |
| Media | Cloudinary |
| Real-time | Socket.io |
| Env validation | Zod |
| Testing | Jest + Supertest |
| Containerization | Docker + docker-compose |

---

## Architecture Rules — LOCKED, DO NOT CHANGE

Dependency direction is strictly one-way:

```
Routes → Controllers → Services → Repositories → Database
```

- Services never import from Controllers.
- Repositories never import from Services.
- No layer skips another layer.
- Business logic belongs exclusively in Services.
- Controllers handle HTTP only — parse the request, call the service, shape the response.
- Socket handlers may call Services. They do not contain business logic.
- Presence tracking writes directly to Redis — not through the repository layer.
- On the frontend, socket events update React Query's cache directly. They do not write to Zustand.

---

## State Management Rules — LOCKED, DO NOT CHANGE

- If data comes from the API, it lives in **React Query**. No exceptions.
- If data never touches the network, it lives in **Zustand**. No exceptions.
- Never store API response data manually in Zustand.

---

## Folder Structure — Backend (`social-calendar-api/`)

```
prisma/
  schema.prisma         # Source of truth: all models + relations
  migrations/           # Auto-generated
  seed.ts               # Dev seed

src/
  server.ts             # Fastify instance, register plugins, listen
  app.ts                # Plugin registration: routes, auth, cors

  routes/
    index.ts            # Registers all route groups
    events.routes.ts
    users.routes.ts
    friends.routes.ts
    groups.routes.ts
    invites.routes.ts
    availability.routes.ts

  controllers/
    events.controller.ts
    users.controller.ts
    friends.controller.ts
    groups.controller.ts
    invites.controller.ts

  services/
    events.service.ts
    users.service.ts
    friends.service.ts
    groups.service.ts
    invites.service.ts
    availability.service.ts
    notifications.service.ts
    media.service.ts

  repositories/
    events.repository.ts
    users.repository.ts
    friends.repository.ts
    groups.repository.ts
    invites.repository.ts

  sockets/
    index.ts
    availability.socket.ts
    invites.socket.ts
    polls.socket.ts
    presence.socket.ts

  middleware/
    auth.middleware.ts
    error.middleware.ts
    rateLimit.middleware.ts

  config/
    env.ts              # Zod-validated env vars — server refuses to boot if any are missing
    prisma.ts           # PrismaClient singleton
    redis.ts            # ioredis singleton
    clerk.ts            # Clerk SDK init
    cloudinary.ts       # Cloudinary SDK init

  types/
    fastify.d.ts        # Augment FastifyRequest with user
    socket.types.ts     # Typed Socket.io event map — must stay in sync with frontend
    api.types.ts        # Request body + response schemas

  utils/
    logger.ts           # Pino logger wrapper
    errors.ts           # AppError class, HTTP error helpers
    date.ts             # Overlap detection, timezone utils

  __tests__/
    unit/               # Services + utils in isolation
    integration/        # Supertest against real Fastify instance
```

---

## Prisma Schema — v2 (Full)

Place this at `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum FriendshipStatus {
  PENDING
  ACCEPTED
  BLOCKED
}

enum SocialGroupRole {
  ADMIN
  MEMBER
}

enum EventOrganiserRole {
  CREATOR
  CO_HOST
}

enum EventExceptionType {
  CANCELLED
  RESCHEDULED
  MODIFIED
}

enum InviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  MAYBE
}

enum NotifChannel {
  PUSH
  EMAIL
  NONE
}

enum Recurrence {
  NONE
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

enum AvailabilityGranularity {
  DAY
  WEEK
  MONTH
}

enum SuggestionVoteValue {
  UP
  DOWN
}

// ─── Models ──────────────────────────────────────────────────────────────────

model User {
  id          String  @id @default(cuid())
  clerkId     String  @unique
  username    String  @unique
  displayName String
  avatarUrl   String?
  bio         String?

  // Global notification defaults — overridden per-invite or per-availability-window
  notifEventInvite  Boolean @default(true)
  notifAvailability Boolean @default(true)
  notifGroupUpdates Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  friendshipsInitiated Friendship[]        @relation("FriendshipInitiator")
  friendshipsReceived  Friendship[]        @relation("FriendshipReceiver")
  friendshipLabels     FriendshipLabel[]
  availabilityBlocks   AvailabilityBlock[] @relation("AvailabilityBlocker")
  blockedByUsers       AvailabilityBlock[] @relation("AvailabilityBlocked")
  friendGroupsOwned    FriendGroup[]
  socialGroups         SocialGroupMember[]
  eventsCreated        Event[]
  eventOrganiserRoles  EventOrganiser[]
  eventInvites         EventInvite[]
  userAvailability     UserAvailability[]
  pollsCreated         GroupPoll[]
  pollVotes            PollVote[]
  eventSuggestions     EventSuggestion[]
  suggestionVotes      SuggestionVote[]
}

model Friendship {
  id          String           @id @default(cuid())
  initiatorId String
  receiverId  String
  status      FriendshipStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  initiator User              @relation("FriendshipInitiator", fields: [initiatorId], references: [id])
  receiver  User              @relation("FriendshipReceiver", fields: [receiverId], references: [id])
  labels    FriendshipLabel[]

  @@unique([initiatorId, receiverId])
}

// Each user labels the other independently.
// A can call B a "coworker" while B calls A a "friend". Labels are not shared.
model FriendshipLabel {
  id           String @id @default(cuid())
  friendshipId String
  ownerId      String
  label        String

  friendship Friendship @relation(fields: [friendshipId], references: [id])
  owner      User       @relation(fields: [ownerId], references: [id])

  @@unique([friendshipId, ownerId])
}

// One-directional. Hiding availability from someone is not the same as blocking or unfriending.
// Every service method that fetches availability for a viewer must check this table first.
model AvailabilityBlock {
  id        String @id @default(cuid())
  blockerId String
  blockedId String

  createdAt DateTime @default(now())

  blocker User @relation("AvailabilityBlocker", fields: [blockerId], references: [id])
  blocked User @relation("AvailabilityBlocked", fields: [blockedId], references: [id])

  @@unique([blockerId, blockedId])
}

// Private to owner. Members cannot see they are in it.
// Used only for bulk-inviting convenience — service layer expands to individual EventInvite rows.
model FriendGroup {
  id      String @id @default(cuid())
  ownerId String
  name    String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner        User                @relation(fields: [ownerId], references: [id])
  members      FriendGroupMember[]
  eventInvites EventInvite[]
}

model FriendGroupMember {
  id            String @id @default(cuid())
  friendGroupId String
  userId        String

  friendGroup FriendGroup @relation(fields: [friendGroupId], references: [id])

  @@unique([friendGroupId, userId])
}

// Shared group with roles. Drives polls and suggestions.
model SocialGroup {
  id          String  @id @default(cuid())
  name        String
  description String?
  avatarUrl   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     SocialGroupMember[]
  polls       GroupPoll[]
  suggestions EventSuggestion[]
}

model SocialGroupMember {
  id            String          @id @default(cuid())
  socialGroupId String
  userId        String
  role          SocialGroupRole @default(MEMBER)

  joinedAt DateTime @default(now())

  socialGroup SocialGroup @relation(fields: [socialGroupId], references: [id])
  user        User        @relation(fields: [userId], references: [id])

  @@unique([socialGroupId, userId])
}

model Event {
  id          String  @id @default(cuid())
  // creatorId is denormalised for fast list queries without an extra join.
  // The creator always gets a CREATOR row in EventOrganiser, written atomically at creation time.
  creatorId   String
  title       String
  description String?
  location    String?
  startsAt    DateTime
  endsAt      DateTime

  // recurrence covers common cases. recurrenceRuleRaw stores a full RRULE string for complex patterns.
  // This means complex recurrence can be supported later via rrule.js without a migration.
  recurrence        Recurrence @default(NONE)
  recurrenceRuleRaw String?

  // Checked at the service layer before persisting a SuggestionVote. No DB constraint across tables.
  allowSuggestionVoting Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  creator     User              @relation(fields: [creatorId], references: [id])
  organisers  EventOrganiser[]
  exceptions  EventException[]
  invites     EventInvite[]
  suggestions EventSuggestion[]
}

model EventOrganiser {
  id      String             @id @default(cuid())
  eventId String
  userId  String
  role    EventOrganiserRole

  event Event @relation(fields: [eventId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([eventId, userId])
}

// One Event row is the recurrence template. Exceptions are tracked here.
// originalDate is always the date the instance WOULD have occurred per the recurrence rule — not the rescheduled date.
// Override fields are nullable — null means inherit from the parent Event.
// Calendar rendering: expand RRULE into instances, left-join EventException on originalDate to apply overrides.
model EventException {
  id           String             @id @default(cuid())
  eventId      String
  originalDate DateTime
  type         EventExceptionType

  // Nullable overrides — null means inherit from parent
  title       String?
  description String?
  location    String?
  startsAt    DateTime?
  endsAt      DateTime?

  createdAt DateTime @default(now())

  event Event @relation(fields: [eventId], references: [id])

  @@unique([eventId, originalDate])
}

model EventInvite {
  id          String       @id @default(cuid())
  eventId     String
  recipientId String
  status      InviteStatus @default(PENDING)

  // Audit trail: which FriendGroup blast spawned this invite.
  // @@unique([eventId, recipientId]) makes FriendGroup expansion idempotent (safe to upsert).
  friendGroupId String?

  // Per-invite notification channel override. Falls back to UserAvailability.notifOnChange, then User global defaults.
  notifChannel NotifChannel?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  event       Event        @relation(fields: [eventId], references: [id])
  recipient   User         @relation(fields: [recipientId], references: [id])
  friendGroup FriendGroup? @relation(fields: [friendGroupId], references: [id])

  @@unique([eventId, recipientId])
}

// Source of truth for availability. Redis caches current + upcoming windows per userId for the real-time invite screen.
// Overlapping windows are allowed — service layer resolves conflicts by preferring the most specific granularity: DAY > WEEK > MONTH.
// No DB constraint prevents overlaps — enforced in code.
model UserAvailability {
  id          String                  @id @default(cuid())
  userId      String
  windowStart DateTime
  windowEnd   DateTime
  granularity AvailabilityGranularity

  // Per-window notification override. Falls back to User global defaults.
  notifOnChange Boolean      @default(false)
  notifChannel  NotifChannel?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId, windowStart])
  @@index([windowStart, windowEnd])
}

// Any group member can create a poll. createdById is for attribution and so poll creators can close/delete their own polls.
model GroupPoll {
  id            String    @id @default(cuid())
  socialGroupId String
  eventId       String?
  createdById   String
  question      String
  closedAt      DateTime?

  createdAt DateTime @default(now())

  socialGroup SocialGroup  @relation(fields: [socialGroupId], references: [id])
  createdBy   User         @relation(fields: [createdById], references: [id])
  options     PollOption[]
}

model PollOption {
  id     String @id @default(cuid())
  pollId String
  text   String
  order  Int

  poll  GroupPoll  @relation(fields: [pollId], references: [id])
  votes PollVote[]
}

model PollVote {
  id           String @id @default(cuid())
  pollOptionId String
  userId       String

  pollOption PollOption @relation(fields: [pollOptionId], references: [id])
  user       User       @relation(fields: [userId], references: [id])

  @@unique([pollOptionId, userId])
}

model EventSuggestion {
  id            String    @id @default(cuid())
  socialGroupId String
  eventId       String?
  suggestedById String
  title         String
  description   String?
  proposedDate  DateTime?

  createdAt DateTime @default(now())

  socialGroup SocialGroup      @relation(fields: [socialGroupId], references: [id])
  event       Event?           @relation(fields: [eventId], references: [id])
  suggestedBy User             @relation(fields: [suggestedById], references: [id])
  votes       SuggestionVote[]
}

// allowSuggestionVoting on Event is checked at the service layer before writing a vote.
model SuggestionVote {
  id           String              @id @default(cuid())
  suggestionId String
  userId       String
  value        SuggestionVoteValue

  suggestion EventSuggestion @relation(fields: [suggestionId], references: [id])
  user       User            @relation(fields: [userId], references: [id])

  @@unique([suggestionId, userId])
}
```

---

## Key Schema Design Decisions

These were answered during the planning phase and must not be relitigated.

**Friendship labels** — Each user labels the other independently. `category` was removed from `Friendship` and extracted into `FriendshipLabel`. `@@unique([friendshipId, ownerId])` enforces one label per user per friendship.

**Overlapping availability** — Overlapping windows are allowed. The service layer resolves conflicts at query time by preferring the most specific granularity: `DAY > WEEK > MONTH`. No DB constraint.

**Recurring event exceptions** — One `Event` row is the template. `EventException` tracks per-instance overrides. `originalDate` is always the date the instance would have occurred, not the rescheduled date. Null override fields inherit from the parent.

**Co-hosts** — `EventOrganiser` table with `CREATOR | CO_HOST` roles. Creator row is written atomically at event creation. `creatorId` is denormalised on `Event` for fast list queries.

**Availability blocking** — `AvailabilityBlock` is intentionally separate from `Friendship`. Hiding availability from someone is not the same as blocking or unfriending them.

**Suggestion voting** — `allowSuggestionVoting` on `Event` is checked at the service layer. `@@unique([suggestionId, userId])` on `SuggestionVote`.

**Guest list visibility** — No schema change needed. Derived by querying `EventInvite` filtered by `eventId`. Visibility enforced at the service/controller layer by checking the requesting user has an accepted invite.

**FriendGroup blast invites** — Service layer expands members into individual `EventInvite` rows. `friendGroupId` on `EventInvite` is the audit trail. `@@unique([eventId, recipientId])` makes the expansion idempotent.

**Notification preferences** — Three levels resolved top-down: (1) per-invite `notifChannel`, (2) per-availability-window `notifOnChange`, (3) user global defaults.

**Redis + PostgreSQL for availability** — `UserAvailability` in PostgreSQL is source of truth. Redis caches current and upcoming windows per `userId` for the real-time invite screen. Socket.io pushes cache invalidation events on every `UserAvailability` write.

---

## Environment Variables

Required at startup. The server must refuse to boot if any are missing (enforced in `src/config/env.ts` via Zod).

```
DATABASE_URL=
REDIS_URL=
CLERK_SECRET_KEY=
PORT=3000
NODE_ENV=development
```

---

## Decisions Still Open (Do Not Guess — Ask Before Implementing)

- Soft delete strategy — do users, events, or friendships need `deletedAt` instead of hard deletes?
- Row-level security — Postgres RLS policies, or all auth enforced purely at the service layer via Clerk?
- Seed data — what is the minimum seed needed to stand up a local dev environment?
- Migration strategy — `prisma migrate dev` locally + `prisma migrate deploy` in CI, or different?

---

## Notes

- `socket.types.ts` must be kept in sync between frontend and backend. A payload change on one side must be reflected on the other immediately.
- Prisma generates TypeScript types from `schema.prisma`. These flow into repositories and API response types. A schema change will surface type errors everywhere it breaks something — do not suppress them.
- TypeScript is used across the entire stack. No `any` without justification.

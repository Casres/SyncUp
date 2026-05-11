# SyncUp — Project Tracker

_Last updated: 2026-05-02_

A cross-platform social calendar app (iOS & Android). This file tracks what has been built, what is pending, and decisions that are still open.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native + Expo + TypeScript |
| Navigation | React Navigation |
| Animations | Reanimated 2 + Gesture Handler |
| Server state | React Query |
| Local state | Zustand |
| Backend | Node.js + Fastify 5.x + TypeScript |
| Database | PostgreSQL + Prisma |
| Cache / Presence | Redis |
| Real-time | Socket.io |
| Auth | Clerk |
| Media | Cloudinary |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |
| Hosting | Railway / Render |
| Mobile builds | EAS Build |

---

## Architecture Rules (Locked)

- **React Query** owns all server data. No exceptions.
- **Zustand** owns local UI state only. Never holds API response data.
- Backend layers flow one direction only: **Routes → Controllers → Services → Repositories → Database**
- Business logic lives exclusively in Services. Controllers handle HTTP only.
- Socket handlers may call Services. They do not contain business logic themselves.
- Presence tracking writes directly to Redis — not through the repository layer.
- `socket.types.ts` must be kept in sync between frontend and backend.
- Any Clerk-authenticated HTTP endpoint must use `authenticateClerkRequest` from `src/lib/clerk.ts`. The lower-level primitives (`extractBearerToken`, `verifyClerkToken`, `replyWithClerkVerificationFailure`) are exported as escape hatches but must not be combined ad-hoc — that's what the orchestrator exists to prevent.

---

## Completed ✅

### Planning & Architecture
- [x] Tech stack confirmed
- [x] Folder structure mapped for both frontend and backend
- [x] State management rules decided and locked into project instructions
- [x] Build order decided (frontend and backend in parallel)
- [x] Monorepo vs separate repos discussed (monorepo recommended, not yet finalized)

### Database Schema
- [x] Full Prisma schema designed (v2) — `social-calendar-api/prisma/schema.prisma`
- [x] All 18 models defined: `User`, `Friendship`, `FriendshipLabel`, `AvailabilityBlock`, `FriendGroup`, `FriendGroupMember`, `SocialGroup`, `SocialGroupMember`, `Event`, `EventOrganiser`, `EventException`, `EventInvite`, `UserAvailability`, `GroupPoll`, `PollOption`, `PollVote`, `EventSuggestion`, `SuggestionVote`
- [x] All enums defined: `FriendshipStatus`, `SocialGroupRole`, `EventOrganiserRole`, `EventExceptionType`, `InviteStatus`, `NotifChannel`, `Recurrence`, `AvailabilityGranularity`, `SuggestionVoteValue`

### Product Decisions Made (Schema Phase)
- [x] Friendship labels are per-user and independent (A can label B "coworker" while B labels A "friend")
- [x] Overlapping availability windows allowed — service resolves by specificity: DAY > WEEK > MONTH
- [x] Recurring events use one `Event` row as template + `EventException` rows for per-instance overrides
- [x] Co-hosts supported via `EventOrganiser` table (`CREATOR` / `CO_HOST` roles)
- [x] Availability visibility blocking is one-directional and separate from friendship blocking
- [x] Suggestion voting is opt-in per event via `allowSuggestionVoting` boolean; service layer enforces
- [x] Any group member can create a poll
- [x] Guest list visible to any accepted invitee; enforced at service layer, no schema change needed

### Backend — Infrastructure
- [x] Project scaffolded (`social-calendar-api/`)
- [x] TypeScript + Fastify 5.x configured (`tsconfig.json`)
- [x] Environment config with validation (`src/config/env.ts`)
- [x] Prisma singleton client (`src/config/prisma.ts`)
- [x] Clerk auth helper module (`src/lib/clerk.ts`) — singleton Clerk client, `extractBearerToken`, `verifyClerkToken` (pure, returns discriminated result), `replyWithClerkVerificationFailure` (centralizes status code + error messages + log levels), and the `authenticateClerkRequest` orchestrator that bundles all three for the canonical authenticated-endpoint flow
- [x] Auth plugin — uses `authenticateClerkRequest` orchestrator, then performs the local Prisma user lookup specific to `requireAuth` (`src/plugins/auth.ts`)
- [x] Fastify type augmentation for `request.user` (`src/types/fastify.d.ts`)
- [x] App factory (`src/app.ts`)
- [x] Server entry point (`src/server.ts`)

### Backend — Users Domain
- [x] `users.repository.ts` — findById, findByClerkId, findPublicByUsername, create, update
- [x] `users.service.ts` — provision, getById, getByClerkId, getPublicByUsername, updateProfile
- [x] `users.controller.ts` — provision, getMe, updateMe, getByUsername (with Zod validation)
- [x] `users.routes.ts` — `POST /users`, `GET /users/me`, `PATCH /users/me`, `GET /users/:username`

### Backend — Events Domain (Stub)
- [x] `events.repository.ts` — findById
- [x] `events.service.ts` — getById
- [x] `events.controller.ts` — getById
- [x] `events.routes.ts` — `GET /events/:id` (protected by `requireAuth` preHandler)

### Local Dev
- [x] Seed data — two test users + one event (`prisma/seed.ts`)
- [x] `.env` file with placeholder values for local dev (`DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`, `PORT`, `NODE_ENV`)
- [x] Dev script auto-loads `.env` via `--env-file` flag in `package.json` (`tsx watch --env-file=.env src/server.ts`)
- [x] Smoke-tested unauthenticated 401 path on `GET /events/:id` end to end (server boots, `requireAuth` fires, returns `401 Missing or malformed Authorization header`)
- [x] `REMINDERS.md` at project root — quick-paste context block for future chats

---

## In Progress 🔄

_Nothing currently marked as actively in progress._

---

## To Do 📋

### Open Decisions (resolve before implementing affected areas)
- [ ] **Soft delete strategy** — do Users, Events, or Friendships need `deletedAt` instead of hard deletes?
- [ ] **Row-level security** — Postgres RLS policies, or auth enforced purely at the service layer via Clerk?
- [ ] **Migration strategy** — `prisma migrate dev` locally + `prisma migrate deploy` in CI, or different flow?
- [ ] **Monorepo** — finalize monorepo vs separate repos; if monorepo, set up `packages/shared` for shared types

### Backend — Events Domain (full implementation)
- [ ] Create event (with atomic `EventOrganiser` CREATOR row)
- [ ] Update event
- [ ] Delete event
- [ ] List events (by creator, by invitee)
- [ ] Recurring event expansion (RRULE parsing via `rrule.js`)
- [ ] Event exceptions — create, modify, cancel a single instance
- [ ] Co-host management — add / remove co-hosts

### Backend — Friendships Domain
- [ ] Send friend request
- [ ] Accept / decline friend request
- [ ] Block a user (friendship-level)
- [ ] Remove friend
- [ ] List friends (with status filtering)
- [ ] Friendship labels — create, update, delete label

### Backend — Friend Groups Domain
- [ ] Create friend group
- [ ] Add / remove members
- [ ] Delete friend group
- [ ] List own friend groups

### Backend — Social Groups Domain
- [ ] Create social group
- [ ] Invite members / join group
- [ ] Update group (admin only)
- [ ] Remove member / leave group
- [ ] Delete group (admin only)
- [ ] List groups for a user

### Backend — Availability Domain
- [ ] Set availability window
- [ ] Update availability window
- [ ] Delete availability window
- [ ] List own availability
- [ ] View a friend's availability (with `AvailabilityBlock` check)
- [ ] Block / unblock a friend's view of your availability

### Backend — Event Invites Domain
- [ ] Send individual invite
- [ ] Bulk invite via FriendGroup (expand to individual `EventInvite` rows — idempotent upsert)
- [ ] Respond to invite (accept / decline / maybe)
- [ ] List invites for an event (guest list — restricted to accepted invitees)
- [ ] List invites for a user (inbox)
- [ ] Notification channel override per invite

### Backend — Group Polls Domain
- [ ] Create poll (any group member)
- [ ] Add poll options
- [ ] Vote on a poll option
- [ ] Close / delete a poll (creator only)
- [ ] List polls for a group

### Backend — Event Suggestions Domain
- [ ] Create suggestion in a group
- [ ] Up/down vote a suggestion (check `allowSuggestionVoting` at service layer)
- [ ] Convert suggestion to event
- [ ] List suggestions for a group

### Backend — Real-Time (Socket.io)
- [ ] Socket.io server setup
- [ ] Clerk JWT auth handshake for socket connections
- [ ] Presence tracking (write to Redis, not through repository layer)
- [ ] Real-time invite notifications
- [ ] Availability change push + React Query cache invalidation events
- [ ] Group poll update events
- [ ] `socket.types.ts` shared type definitions

### Backend — Infrastructure
- [ ] Redis client singleton (`src/config/redis.ts`)
- [ ] Cloudinary client singleton (`src/config/cloudinary.ts`)
- [ ] Media upload endpoint (avatar images)
- [ ] Rate limiting middleware
- [ ] Global error handling middleware
- [ ] Docker + `docker-compose.yml` for local dev (Postgres + Redis)
- [ ] `prisma/seed.ts` — **delete before production** (also remove `prisma.seed` from `package.json`)

### Backend — Testing
- [ ] Jest + Supertest setup
- [ ] Integration tests for Users domain
- [ ] Integration tests for Events domain
- [ ] Integration tests for Friendships domain
- [ ] Integration tests for remaining domains

### Frontend (React Native + Expo) — Not Started
- [ ] Project scaffold (`social-calendar-app/`)
- [ ] Expo Router file-based routing setup
- [ ] React Navigation configuration
- [ ] React Query + Zustand setup
- [ ] Clerk auth integration (sign-up, sign-in, session)
- [ ] User provisioning flow (username + display name on first login)
- [ ] Calendar screen
- [ ] Event detail screen
- [ ] Create / edit event screen
- [ ] Friends list screen
- [ ] Friend profile screen
- [ ] Social groups screen
- [ ] Group detail screen
- [ ] Availability screen (set / edit windows)
- [ ] Invite inbox
- [ ] Notifications
- [ ] Socket.io client + presence hooks
- [ ] Push notification registration (Expo push tokens)
- [ ] Animations (Reanimated 2 + Gesture Handler)
- [ ] Avatar upload (Cloudinary)

### DevOps
- [ ] GitHub Actions CI pipeline (lint, type-check, test)
- [ ] EAS Build configuration for iOS + Android
- [ ] Railway / Render deployment setup
- [ ] Environment variable management for staging + production

---

## Reminders

- **Seed data** (`prisma/seed.ts` + `prisma.seed` entry in `package.json`) must be deleted before production deployment.
- Any change to `socket.types.ts` must be reflected on both frontend and backend immediately.
- Every service method that fetches availability for a viewer must check `AvailabilityBlock` first.
- Overlapping availability windows are resolved in code (DAY > WEEK > MONTH) — there is no DB constraint.
- `creatorId` on `Event` is denormalized intentionally — always write the corresponding `EventOrganiser` CREATOR row atomically at creation time.

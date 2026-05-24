# SyncUp — Project Tracker

_Last updated: 2026-05-24_

A cross-platform social calendar app (iOS & Android). High-level summary of build state. **For the agent-by-agent ground truth see `LEAD_MANAGER.md`.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native 0.83.6 + Expo ~55.0.20 + TypeScript 5.9.2 |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) |
| Animations | Reanimated 4.2.1 + Gesture Handler ~2.30.0 |
| Server state | @tanstack/react-query v5 |
| Local state | React local state (useState/useReducer) + draftStore for create-event flow |
| Backend | Node.js + Fastify 5.x + TypeScript |
| Database | PostgreSQL + Prisma 5.22 |
| Cache / Presence | Redis (ioredis 5.10) |
| Real-time | Socket.io 4.8 |
| Auth | Clerk (@clerk/clerk-expo on mobile, @clerk/backend on api) |
| Media | Cloudinary (not yet wired) |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |
| Hosting | Railway |
| Mobile builds | EAS Build |

---

## Architecture Rules (Locked)

- **React Query** owns all server data. No exceptions.
- **No Zustand.** Local UI state uses `useState`/`useReducer`; create-event flow uses `draftStore` (a single local context, not a global store). Never copy API response data into any global store.
- Backend layers flow one direction only: **Routes → Controllers → Services → Repositories → Database**
- Business logic lives exclusively in Services. Controllers handle HTTP only.
- Socket handlers may call Services; they do not contain business logic themselves.
- Presence tracking writes directly to Redis — not through the repository layer.
- `src/types/socket.types.ts` is the source of truth — mobile mirrors it.
- Per-request Prisma transaction with `set_config('app.current_user_id', …)` engages Postgres RLS on every authenticated request via `prismaApp` (the restricted-role client). The migration-owner client `prisma` is reserved for auth upsert and the Clerk webhook.

---

## Build State Summary (2026-05-24)

### Backend — Done ✅

| Domain | Status |
|---|---|
| Schema / Migrations | All 18 entities + soft-delete on User/Event/Friendship/SocialGroup + RLS migration |
| Auth (Clerk) | Global preHandler, per-request Prisma transaction, webhook sync |
| Events Domain | 5 endpoints, atomic CREATOR organiser write, soft-delete |
| Friends Domain | 18 endpoints (friendships, labels, availability blocks, friend-groups) |
| Groups Domain | 20 endpoints (groups, members, polls, suggestions, votes) |
| Backend Cleanup | Dual Prisma client, `GET /health`, `DATABASE_URL_APP` |
| Socket.io Layer | 14 socket events across presence/events/friends/groups/availability |
| EXPLORE Gateway (Phase A) | `/explore/*` routes + Eventbrite + Google Places clients, behind auth |
| Seed Rebuild | Full Decision #4 extended seed (5 users, 4 events, RSVP spread, closed poll) — **must be deleted before production** |

### Backend — Pending 📋

| Domain | Status | Prompt |
|---|---|---|
| EXPLORE Cache + Rate-Limit (Phase B) | PARTIAL — rate-limit middleware wired but with deviations (default 30 not 20, no burst budget, no X-RateLimit-* headers); cache is inline, not modular | `agent-prompts/EXPLORE_BACKEND_AGENT_PROMPT.md` (Phase B section — REDESIGNED 2026-05-23 to fit on-disk types) |
| EXPLORE Cron + Billing (Phase C) | PENDING — pre-warmer cron, GCP billing alerts ($25/$50/$100 notify-only), Featured-listings hook stub | `agent-prompts/EXPLORE_BACKEND_AGENT_PROMPT.md` (Phase C section) |
| Availability Domain | Not yet specced — pending socket TODO at `src/sockets/availability.socket.ts` | — |
| Invites Domain (incremental) | Pending socket TODOs at `src/sockets/events.socket.ts` | — |
| Notifications service | Not yet built | — |

### Frontend — Done ✅

| Layer | Status |
|---|---|
| Theme / Tokens | Colors, typography, spacing, radii, motion, haptics |
| Component Library | 63 components across foundation/polish/eventFlow/social/profile/emptyStates |
| Navigation | Root native-stack + Tabs + CreateEventModal sibling, custom TabBar with Ionicons |
| Mock Data Layer | **Tombstoned 2026-05-21** — 8 seed files deleted, `index.ts` empty exports for compile-time compat; app renders zero-data empty states everywhere |
| API Stub Layer | 9 files, React Query 5.100.9, Clerk wiring via `_client.ts` `useApiFetch()` |
| Screens | 16 screens / 7 flows |
| GAP 6 — NotifSheet nav wiring (R12-1) | COMPLETE |
| GAP 7 — NotifSheet velocity gesture (R13-1) | COMPLETE |
| GAP 8 — NotifSheet offline state (R13-2) | COMPLETE |
| GAP 9 — BroadcastToast queued prop (R13-3) | COMPLETE |
| GAP 10 — AudiencePickerSheet zero-friend state (R13-4) | COMPLETE |
| GAP 2 — Search overlay (R8-1..R8-7) | COMPLETE |
| GAP 1 — Onboarding stack (R9-1..R9-10) | COMPLETE (Welcome + Sign-Up Steps 1–6 + Sign-In + Forgot-Password) |
| TweaksPanel absence audit (R14-1) | Verified — zero refs in mobile codebase |

### Frontend — Pending 📋

| Surface | Status | Prompt |
|---|---|---|
| Onboarding R15-7..R15-13 | PENDING — post-Step-6 tail (PushPermissionGate · FriendFind Decision/Matches/NoWorries · YoureIn), R15-11 ContactsDeniedAffordance, R15-13 first-run empty-state copy gating; needs `expo-notifications` + `expo-contacts` | `agent-prompts/ONBOARDING_AGENT_PROMPT.md` |
| AttendeesSheet R15-1..R15-6 | PENDING — R15-1 row-tap → QuickProfileSheet, R15-2 friend variant, R15-3 RSVP grouping w/ HOSTS pinned, R15-4 magnifier reveal, R15-5 sticky chip filter bar, R15-6 offline state mirroring NotifSheet; wires SearchOverlay PEOPLE row tap | `agent-prompts/ATTENDEES_SHEET_AGENT_PROMPT.md` |

### DevOps — Done ✅

| Item | Status |
|---|---|
| Docker / docker-compose | Multi-stage Dockerfile + api/postgres/redis services + two-role DB init via `docker/postgres/init.sql` |
| GitHub Actions | Lint, type-check, test with postgres + redis service containers + `prisma migrate deploy` |
| EAS Build Config | dev/preview/prod profiles, bundle ID `tech.casillas.syncup` |
| Railway Deploy | `railway.toml` + `DEPLOY_CHECKLIST.md` — pending Christian connecting Railway project |
| Jest / Supertest | Infra + 3 domain test suites + 8 `test.todo` items |

---

## Step Status

| Step | What | Status |
|---|---|---|
| Step 1 | Initial scaffolding + schema | DONE |
| Step 2 | Backend domains + frontend scaffold + screens | DONE |
| Step 3 | Wave 1 orchestration (Seed Rebuild, EXPLORE Phase A, GAPs, Mocks tombstone, R15 prep) | DONE — partial in-flight when prior session hit usage limit; recovery cleanup committed 2026-05-23 in `90972f9` |
| **Step 4** | **Orchestrator chat (NEW Claude Code terminal) spawns the remaining four agents: EXPLORE Phase B → EXPLORE Phase C → Onboarding R15 + AttendeesSheet R15 in parallel** | **READY TO START** |

**Step 4 ground state:** working tree clean, tracker accurate, orchestrator prompt indexed with all five remaining prompt files + their dependencies + HANDOFF locations. See `agent-prompts/ORCHESTRATOR_PROMPT.md`.

---

## Open Decisions Log

All previously-open decisions are now locked. See `LEAD_MANAGER.md` → Open Decisions Log (#1–#11) for full history. Summary:

- Monorepo (#1) — locked monorepo
- Soft deletes (#2) — locked on Users/Events/Friendships/SocialGroups
- Row-level security (#3) — locked Postgres RLS via `set_config` per request
- Seed data scope (#4) — locked, extended spec, **deletion before prod required**
- Migration strategy (#5) — `prisma migrate dev` locally, `prisma migrate deploy` in CI/Railway
- Availability Hub layout (#6) — Option C inline collapse
- Quicksets (#7) — user-extensible, 4 built-ins permanent
- BroadcastToast review action (#8) — no
- Friend Types nesting (#9) — no, disjoint membership
- AdminBar scroll collapse (#10) — no, pinned
- Stale notifications (#11) — auto-purge at 30 days + Clear all + swipe Dismiss

---

## Production Deletion Gate

Before any production deploy:

1. Delete `social-calendar-api/prisma/seed.ts`
2. Remove the `"seed"` entry from `social-calendar-api/package.json` `prisma` block
3. Delete `social-calendar-mobile/src/mocks/index.ts` once every consumer in `src/api/*` is rewired to a live backend endpoint
4. Verify no `TweaksPanel` references in `social-calendar-mobile/`
5. Provide Railway env vars per `social-calendar-api/DEPLOY_CHECKLIST.md`

These are tracked as gates in DEPLOY_CHECKLIST.md.

---

## Reminders

- **Seed file (`prisma/seed.ts`) + `prisma.seed` in `package.json`** must be deleted before production.
- **`src/mocks/index.ts`** tombstone can be deleted once all `src/api/*.ts` stubs hit a real backend endpoint.
- Any change to `src/types/socket.types.ts` (backend) must be mirrored in `social-calendar-mobile/src/types/`.
- Every service method that fetches availability for a viewer must check `AvailabilityBlock` first.
- Overlapping availability windows are resolved in code (DAY > WEEK > MONTH) — no DB constraint.
- `creatorId` on `Event` is denormalized — always write the corresponding `EventOrganiser` CREATOR row atomically at creation time.
- `_types.ts` (publicProfileSelect) is triplicated across Events/Friends/Groups repos — Lead-managed consolidation PR still pending.

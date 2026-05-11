# SyncUp — Lead Manager Coordination Document

> **Purpose:** This document is the operating manual for the Lead Manager agent. It defines what each section manager owns, the build order, how agents hand off to each other, and what must escalate to the Director (Christian) before any work proceeds.

---

## Hierarchy

```
Director (Christian)
    └── Lead Manager
            ├── Design Manager
            ├── Frontend Manager
            ├── Backend Manager
            └── DevOps Manager
                    └── [Task Agents per section]
```

**Lead Manager's job:** Own the build order. Unblock agents when their dependencies clear. Synthesize progress across sections. Escalate to Christian when a decision crosses section boundaries or affects project scope. Never make big-picture calls autonomously.

---

## Section Ownership

### Design Manager
**Owns:** The 6-round Claude Design playbook. All visual decisions. The Anchor Document. The Round 6 handoff bundle (7 output files).

**Does not own:** Implementation of the design system in code — that belongs to Frontend.

**Agents:**
| Agent | Input | Output |
|---|---|---|
| R1 — Design System | Brief from playbook | Anchor Document v1 + design system reference page |
| R2 — Core Event Flow | Anchor v1 | Anchor v2 + Home → Create → Invite → Detail → RSVP flow |
| R3 — Social Layer | Anchor v2 | Anchor v3 + Friends + Groups screens |
| R4 — Profile & Availability | Anchor v3 | Anchor v4 + Profile + Settings + Availability Editor |
| R5 — Polish Pass | Anchor v4 + full canvas | Anchor v5 + polished prototype + polish summary report |
| R6 — Handoff Export | Anchor v5 + full canvas | `ANCHOR.md`, `TOKENS.ts`, `TYPES.ts`, `COMPONENTS.md`, `SCREENS.md`, `NAVIGATION.md`, `COWORK_INSTRUCTIONS.md` |

**Sequential constraint:** Each round requires the previous round's Anchor Document as input. Rounds cannot run in parallel.

---

### Frontend Manager
**Owns:** React Native / Expo / TypeScript implementation. React Query for all server state. Zustand for local UI state only. Reanimated 2 animations. All screen files. Navigation structure. Mock data layer. API stub layer.

**Does not own:** Design decisions. Backend endpoints. Infrastructure.

**Hard rule:** API response data is never stored manually in Zustand. If a Frontend agent proposes this, reject it and flag to Lead Manager.

**Agents:**
| Agent | Depends on | Output |
|---|---|---|
| Theme / Tokens | R1 anchor (color + type tokens) | `src/theme/` — colors, typography, spacing, radii, motion, haptics |
| Component Library | R6 handoff (`COMPONENTS.md`, `TOKENS.ts`) | `src/components/` — all presentational components, no data fetching |
| Navigation Setup | R6 handoff (`NAVIGATION.md`) | `src/navigation/` — typed React Navigation stack |
| Mock Data Layer | R6 handoff (`TYPES.ts`, sample data) | `src/mocks/` — typed constants |
| API Stub Layer | Mock Data Layer complete | `src/api/` — typed async functions returning mock data with 200–500ms delay |
| Screens | All above complete | `src/screens/` — one screen at a time, using components + API stubs |

**Partial start rule:** Theme/Tokens can begin as soon as R1 anchor is locked, without waiting for R6. Everything else waits for the full R6 handoff bundle.

**Mobile workspace folder (confirmed 2026-05-02):** Scaffold the React Native app into `social-calendar-mobile/` at the monorepo root. This matches the workspace entry in the root `package.json`. The empty `mobile/` folder can be deleted.

---

### Backend Manager
**Owns:** Node.js + Fastify + TypeScript API. Prisma schema and migrations. Redis (caching, presence, sessions). Socket.io real-time layer. Clerk JWT middleware. Cloudinary integration. Layered architecture: Routes → Controllers → Services → Repositories → Database.

**Does not own:** Frontend state management. Design. Infrastructure provisioning (DevOps owns that).

**Hard rule:** Business logic lives exclusively in Services. Controllers handle HTTP only. Socket handlers call Services — they do not contain business logic. Presence writes directly to Redis, not through the repository layer.

**Agents:**
| Agent | Depends on | Output |
|---|---|---|
| Schema / Migrations | Prisma schema (already drafted) | Finalised `schema.prisma` + `prisma migrate dev` baseline |
| Auth (Clerk) | Schema complete | Clerk JWT middleware, user sync webhook handler |
| Events Domain | Schema + Auth complete | Events routes, controllers, services, repositories |
| Friends Domain | Schema + Auth complete | Friendships, labels, availability blocks |
| Groups Domain | Schema + Auth complete | FriendGroups + SocialGroups + polls + suggestions |
| Socket.io Layer | All domain agents complete | Real-time handlers calling existing services |

**Can run in parallel with Design** — backend does not depend on the design playbook.

**Schema/Migrations agent start notes (verified 2026-05-02):**
- `schema.prisma` exists and is complete — all 18 entities, relations, and indexes are in place
- Two things are missing and must be added before running `prisma migrate dev`:
  1. `deletedAt DateTime?` on `User`, `Event`, `Friendship`, and `SocialGroup` (Decision #2 — soft deletes)
  2. RLS policies — do not live in `schema.prisma`; must be written as a raw SQL migration file after the baseline migration runs
- Do not alter any other part of the schema — it has been reviewed and approved

**Open decisions blocking backend start** (see Escalation section below).

---

### DevOps Manager
**Owns:** Docker + docker-compose local dev environment. GitHub Actions CI/CD pipeline (lint, test, build on every push). EAS Build configuration for iOS and Android. Railway / Render deployment. Jest + Supertest test infrastructure setup.

**Does not own:** Writing the actual tests (that belongs to the domain agent that owns the feature). Deployment credentials (Christian holds those).

**Agents:**
| Agent | Depends on | Output |
|---|---|---|
| Docker Setup | Nothing — can start immediately | `Dockerfile`, `.dockerignore` |
| docker-compose | Docker complete | `docker-compose.yml` (API + PostgreSQL + Redis) |
| GitHub Actions | docker-compose complete | `.github/workflows/` — lint, test, build |
| EAS Build Config | Nothing — can start immediately | `eas.json`, `app.json` build profiles |
| Railway Deploy | GitHub Actions complete | Deploy config, environment variable documentation |
| Jest / Supertest | Backend domain agents complete | Test runner setup, example integration tests per domain |

**Can run in parallel with Design and Backend from day one.**

---

## Build Order

```
Day 0 (can start immediately, no dependencies):
  ├── Design: Round 1
  ├── Backend: Schema / Migrations
  └── DevOps: Docker + EAS Build Config

After Round 1 anchor locked:
  └── Frontend: Theme / Tokens (early start on color + type tokens only)

After Schema complete:
  ├── Backend: Auth (Clerk)
  └── DevOps: docker-compose

After Auth complete:
  └── Backend: Events, Friends, Groups (can run in parallel)

After docker-compose complete:
  └── DevOps: GitHub Actions

After Design Round 1–5 complete:
  └── Design: Round 6 (Handoff Export)

After Round 6 handoff bundle complete:
  ├── Frontend: Component Library
  ├── Frontend: Navigation Setup
  └── Frontend: Mock Data Layer

After Mock Data Layer complete:
  └── Frontend: API Stub Layer

After API Stub Layer complete:
  └── Frontend: Screens (one flow at a time, sequential)

After all Backend domain agents complete:
  └── Backend: Socket.io Layer
  └── DevOps: Jest / Supertest

After GitHub Actions complete:
  └── DevOps: Railway Deploy
```

---

## Agent Communication Protocol

Agents do not send messages to each other directly. All handoffs are file-based. The Lead Manager reads outputs and constructs the input context for the next agent.

**Standard handoff format:**

Each agent, when it completes a task, produces:
1. Its primary output file(s) — code, documents, config
2. A short `HANDOFF.md` note in its output directory containing:
   - What was built
   - Any assumptions made that another section should know about
   - Any blockers or open questions that couldn't be resolved autonomously
   - Suggested next agent to activate

The Lead Manager reads all `HANDOFF.md` files after each agent completes, updates the build order status, and activates the next eligible agent with the correct context.

**Shared context files (always in scope for all agents):**
- `LEAD_MANAGER.md` (this file) — hierarchy, ownership, escalation rules
- `ARCHITECTURE.md` — architectural rules, non-negotiable
- `DATABASE_SCHEMA_SESSION.md` — schema decisions and rationale
- Design Anchor Document (latest version) — visual system
- Round 6 handoff bundle (once available) — implementation spec

---

## Escalation Criteria

### Stays within a section (agent resolves autonomously)
- Implementation detail choices within a domain (e.g. how to structure a service method)
- Minor UI layout choices within the locked design system
- Test case design for a specific endpoint
- Docker configuration choices

### Escalates to Lead Manager (cross-section or dependency risk)
- A data shape defined by the Backend agent differs from what the Frontend agent is building against
- A Design decision from a later round contradicts something locked in an earlier round
- An agent cannot proceed because a dependency from another section is blocked or unclear
- DevOps discovers a configuration that requires a backend environment variable that hasn't been defined yet

### Escalates directly to Christian (Director)
These are hard stops. The Lead Manager does not make these calls.

1. **Monorepo decision** — currently unresolved. Recommendation is monorepo for shared TypeScript types, but this affects repository structure, tooling, and CI setup. Decision needed before Frontend and Backend agents write their first files.

2. **Soft delete strategy** — do users, events, and friendships use `deletedAt` (soft delete) or hard deletes? This affects schema migrations, repository queries, and GDPR compliance posture.

3. **Row-level security** — will Postgres RLS policies be used, or is auth enforced purely at the service layer via Clerk? This affects every repository query pattern.

4. **Seed data scope** — minimum seed needed for local dev environment. Christian flagged this as something to decide before production (seed file must be deleted before prod deploy).

5. **Any design direction change** — if a Design agent proposes deviating from a locked aesthetic decision (e.g. introducing skeleton screens, changing the spinner pattern, adding a bottom tab bar), this must come to Christian before the change is made.

6. **Scope changes** — if any agent surfaces a feature or capability not in the playbook or planning docs, it should be raised as a scope question, not built autonomously.

7. **Production credentials** — deployment keys, Clerk production keys, Railway/Render environment secrets. Lead Manager documents what's needed; Christian provides them.

---

## Open Decisions Log

Track decisions that are pending Director input. Lead Manager updates this table as decisions are made.

| # | Decision | Blocking | Status |
|---|---|---|---|
| 1 | Monorepo vs separate repos | Frontend + Backend start | **Locked — monorepo** |
| 2 | Soft delete strategy | Schema/Migrations agent | **Locked — soft deletes on Users, Events, Friendships, SocialGroups. Hard deletes on poll votes, notifications, session data** |
| 3 | Row-level security approach | All Backend domain agents | **Locked — Postgres RLS policies** |
| 4 | Seed data scope | Schema/Migrations agent | **Locked — see full seed spec below** |
| 5 | Migration strategy (dev vs CI) | DevOps: GitHub Actions | **Locked — `prisma migrate dev` locally, `prisma migrate deploy` in CI and Railway** |
| 6 | Availability Hub layout | Frontend: Screens — Flow 6 (Availability Editor) | **Locked 2026-05-04 — Option C (inline collapse). Calendar is the primary surface; broadcast rules tuck under it and expand on tap.** Director re-confirmed when Flow 6 was about to start. |
| 7 | Quicksets — user-extensible or fixed library? | Frontend: AvailabilityEditor + QuicksetGrid | **Locked 2026-05-04 (R7-1 in `ANCHOR-DESIGN.txt`) — User-extensible. The 4 built-in presets (`weekends-free` / `weekdays-5pm` / `next30-maybe` / `clear-month`) are permanent and cannot be deleted; users CAN save additional custom Quicksets. Save/name flow ships in a future round; until then, QuicksetGrid renders only the 4 built-ins. Grid must NEVER be hard-coded fixed-length-4.** |
| 8 | BroadcastToast — recipient review tap-action? | Frontend: BroadcastToast component | **Locked 2026-05-04 (R7-2) — No. Toast contains exactly: state dot · title · sub · Undo pill · close X. Toast body is NOT tappable. Broadcast Settings is the SINGLE editor for audience. Never add "Tap to review" affordance, recipient avatar stack, or chevron-to-edit.** |
| 9 | Friend Types — nested / overlapping membership? | Frontend: FriendType data shape, FilterChipRowMulti, AudiencePickerSheet | **Locked 2026-05-04 (R7-3) — No. One friend belongs to exactly ONE FriendType. Assigning a friend to a new type REMOVES them from any previous type. `FriendType.members[]` is disjoint across types. AudiencePickerSheet (mode='types') is non-compound. FilterChipRowMulti computes UNION (never INTERSECTION).** |
| 10 | Group Detail AdminBar — collapse on scroll? | Frontend: GroupDetailScreen, AdminBar | **Locked 2026-05-04 (R7-6) — No. AdminBar stays pinned; does not collapse, fade, shrink, or auto-hide on scroll. Visibility is binary on role only.** |
| 11 | Stale notifications — auto-purge or keep forever? | Frontend: NotifSheet (future), Backend: Notifications service (future) | **Locked 2026-05-04 (R7-4) — Auto-purge at 30 days on next sheet open. EARLIER bucket caps at 30 days. Manual "Clear all" pill in NotifSheet header (single-tap, NOT TwoTapDestructive); fires `warning` haptic + A11yLive announces "Activity cleared". Per-card left-swipe Dismiss handles one-off cases. Push copy = in-app copy verbatim, no "New activity from" / "SyncUp:" prefix (R7-5). Documented as JSDoc on `src/mocks/notifications.ts` for the future Notifications agent.** |

### Seed Data Spec (Decision #4)

**Baseline:**
- 3–5 fake users with varied profiles
- Friendships between them covering all categories: friend, coworker, family, BFF
- Events: one past, one upcoming, one recurring
- One social group with those users as members
- Varied availability patterns across users
- One active poll and one suggestion inside the group

**Extended (all approved):**
- One friend with no availability set at all — tests "unknown" state on the invite screen
- One friend who has blocked their availability from the seed user — tests availability blocking logic
- One event where the seed user is a co-host, not the creator — tests co-host permission paths
- One recurring event with at least one cancelled exception and one rescheduled exception — tests the most complex schema logic
- One event with a full spread of RSVP states: yes, maybe, no, and no response yet
- One social group where the seed user is a regular member, not admin — verifies admin controls are correctly hidden
- One closed poll with results already in — tests results display, not just voting UI

**Production rule:** Seed file must be deleted before any production deploy. This is a hard requirement.

---

## Progress Tracker

Lead Manager updates this as agents complete work.

| Section | Agent | Status |
|---|---|---|
| Backend | Schema / Migrations | **COMPLETE (2026-05-02)** — schema.prisma updated with `deletedAt` on User/Event/Friendship/SocialGroup; baseline migration `_init` + RLS migration `_rls_policies` authored; Prisma client regenerated. Migrations not yet applied — Postgres unavailable until DevOps `docker-compose` ships. See `social-calendar-api/prisma/HANDOFF.md` for the runtime contract Auth + DevOps must follow. |
| Backend | Auth (Clerk) | **COMPLETE (2026-05-03)** — global auth preHandler verifies Clerk JWT, auto-upserts the User row, opens a per-request Prisma transaction with `set_config('app.current_user_id', …, true)` for RLS, attaches `request.user` and `request.prismaTransaction`. Webhook handler at `POST /webhooks/clerk` with Svix verification syncs `user.created`/`user.updated`. Type-checks clean. Legacy domain scaffolding deleted — next agent starts clean. See `social-calendar-api/src/middleware/AUTH_HANDOFF.md`. |
| Backend | Events Domain | **COMPLETE (2026-05-04)** — 5 endpoints (`GET /events`, `GET /events/:id`, `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`). Repo/service/controller layers strict, all DB access via `request.prismaTransaction`, all reads filter `deletedAt: null`. POST atomically creates the CREATOR `EventOrganiser` row. Soft delete restricted to organisers (creator + co-hosts). Type-checks clean. Open items (invite/co-host management, EventException, etc.) listed in `src/routes/EVENTS_HANDOFF.md`. |
| Backend | Backend Cleanup | **COMPLETE (2026-05-04)** — `GET /health` route wired via `src/routes/health.routes.ts` and registered before auth middleware (Railway healthcheck unblocked). Prisma client split into `prisma` (DATABASE_URL, migration owner, RLS-bypass — auth upsert + webhook only) and `prismaApp` (DATABASE_URL_APP, restricted role) with auth middleware's per-request `$transaction` now running on `prismaApp` so RLS engages. `DATABASE_URL_APP` added to `env.ts` Zod schema. Type-checks clean. See `social-calendar-api/src/BACKEND_CLEANUP_HANDOFF.md`. |
| Backend | Friends Domain | **COMPLETE (2026-05-04)** — 18 endpoints across `/friends` (friendships, labels, availability blocks) and `/friend-groups` (groups + members). All reads filter `deletedAt: null`; group delete cascades members atomically; `Db` type lifted to shared `src/repositories/_types.ts`. Type-checks clean. Cross-section flags: (1) `_types.ts` and `src/app.ts` were co-edited with the parallel Groups Domain agent — both produced compatible output and post-merge tsc is green; (2) `publicProfileSelect` is now triplicated across Events/Friends/Groups repos and should be consolidated in a follow-up; (3) `FriendGroupMember.user` relation is missing in the schema (member listing uses a second User query) — schema-change ticket if it ever becomes a hot path; (4) soft-deleted Friendship re-request currently 409s — UX call deferred. See `social-calendar-api/src/routes/FRIENDS_HANDOFF.md`. |
| Backend | Groups Domain | **COMPLETE (2026-05-04)** — 20 endpoints under `/groups` (5 group CRUD, 4 member, 4 poll, 2 poll-vote, 3 suggestion, 2 suggestion-vote). Atomic group creation via Prisma nested write; last-admin guard on member remove + role demote; poll-delete cascades `PollVote → PollOption → GroupPoll` in the request transaction; suggestion vote uses `upsert` for atomic vote-change; `Event.allowSuggestionVoting` enforced before persisting a `SuggestionVote`; all `SocialGroup` reads filter `deletedAt: null`. Type-checks clean. Cross-section flags: (1) `_types.ts` was created mid-flight by the parallel Friends agent — Groups now imports `Db` from it (post-merge tsc is green); (2) `publicProfileSelect` is triplicated across Events/Friends/Groups repos — Lead-managed consolidation PR still pending; (3) `allowSuggestionVoting` check is tolerant of RLS-hidden / soft-deleted events (treats unreachable gate as unrestricted) — flag if product wants fail-closed semantics; (4) no notification side-effects emitted (group/poll/suggestion lifecycle events) — Notifications + Socket.io agents will need the event payloads listed in the handoff. See `social-calendar-api/src/routes/GROUPS_HANDOFF.md`. |
| Backend | Socket.io Layer | **COMPLETE (2026-05-04)** — 14 socket events wired (12 live + 2 invites TODO + 1 availability TODO) across presence/events/friends/groups/availability domains; Option A pattern adds optional `io?: Server` to 11 service methods (events.update; friends.sendRequest, respondToRequest; groups.addMember, removeMember, createPoll, closePoll, voteOnPollOption, removePollVote, createSuggestion, voteOnSuggestion, removeSuggestionVote) so emits fire after the per-request Prisma write; Clerk JWT verified at socket connect via `prisma` (migration owner) lookup, RLS-aware presence + `group:join` membership check use `prismaApp` with `set_config('app.current_user_id', ...)`; presence writes direct to Redis (`presence:{userId}` JSON, TTL 60s) and emits only to accepted-friend rooms; Fastify decorated with `io` so controllers pass `request.server.io` through; type-checks clean. TODO call sites for downstream agents: (a) `src/sockets/events.socket.ts` — Invites agent should emit `event:invite:received` from `POST /events/:id/invites` and `event:invite:rsvp` from `PATCH /events/:id/invites/:inviteId`; (b) `src/sockets/availability.socket.ts` — Availability service agent should emit `availability:updated { userId }` after every `UserAvailability` create/update/delete to friends minus those in `AvailabilityBlock`. Frontend contract: `src/types/socket.types.ts` is the source of truth; mobile must mirror it and update React Query cache on push (no Zustand writes). See `social-calendar-api/src/sockets/SOCKETIO_HANDOFF.md`. |
| Design | Round 1 — Design System | COMPLETE (Design System.html + Home v2 - Merged.html) |
| Design | Round 2 — Core Event Flow | COMPLETE (Create Event Flow.html) |
| Design | Round 3 — Social Layer | COMPLETE (Friends & Groups.html) |
| Design | Round 4 — Profile & Availability | COMPLETE (Profile & Availability.html) |
| Design | Round 5 — Polish Pass | COMPLETE (Polish & States.html) |
| Design | Round 6 — Notifications & Activity | COMPLETE — bonus round beyond original playbook (Notifications & Activity.html) |
| Design | Full Prototype | COMPLETE — SyncUp Prototype.html (all 5 tabs, interactive, light + dark) |
| Design | Formal Handoff Export (7 files) | **COMPLETE (2026-05-04)** — ANCHOR.md, TOKENS.ts, TYPES.ts, COMPONENTS.md, SCREENS.md, NAVIGATION.md, COWORK_INSTRUCTIONS.md written to monorepo root. All 4 frontend wave-1b agents unblocked. |
| Frontend | Theme / Tokens | **COMPLETE (2026-05-04)** — `src/theme/{colors,typography,spacing,radii,motion,haptics,index}.ts` + `THEME_HANDOFF.md`; `tsc --noEmit` clean. Open: app shell must load Manrope + JetBrains Mono via `expo-font` (incl. weight variants); dark palette ready but not yet wired to `useColorScheme`. |
| Frontend | Component Library | **COMPLETE (2026-05-04)** — 63 components total across 6 categories (foundation 11, polish 8, eventFlow 7, social 15, profile 13, emptyStates 9), barrel exposed at `social-calendar-mobile/src/components/index.ts`, `tsc --noEmit` clean. Inferred prop shapes the Screens agent must mirror: `EventCard.myRsvp`, `PollRow.myVote`, `SuggestionRow.{authorName, upvotedByMe}`, parent-resolved `CategoryBadge.{label, tint}` (NOT category id), `AdminInviteRow` + `AudiencePickerSheet` use `resolveCategoryLabel`/`resolveCategoryTint` resolvers, `RSVPSheet`/`AudiencePickerSheet` are `visible`-driven (parent owns modal-sheet presentation), `MonthGrid.setDay` parent owns Hard-Rule-14 delete-on-clear mapping, `BroadcastToast` fires no haptic on its own (H-3), `TOAST_POSITION_DEFAULTS` lives once in `polish/ErrorToast.tsx` and is re-exported by `profile/BroadcastToast.tsx`. See `social-calendar-mobile/src/components/COMPONENTS_HANDOFF.md`. |
| Frontend | Navigation Setup | **COMPLETE (2026-05-04)** — Root `native-stack` mounts `Tabs` + `CreateEventModal` (fullScreenModal) as siblings; 4 stack navigators (Home/Friends/Groups/Profile) + custom 5-tab `TabBar.tsx` with Ionicons (single icon set), `TAB_BAR_HEIGHT = 83` exported for toast docking; center "Create" tab is a press-interceptor (two-layer guard: `tabPress.preventDefault()` in TabBar + `<Tab.Screen listeners>` in RootNavigator) that calls `navigation.getParent()?.navigate('CreateEventModal')` — never focuses a screen; `light` haptic on tab change, `medium` on Create press; `CoverPickerSheet` and `AudiencePickerSheet` use `presentation: 'formSheet'` with grab handle; `App.tsx` wires `GestureHandlerRootView` → `SafeAreaProvider` → `NavigationContainer` → `RootNavigator`; 18 stub screens in `src/screens/`; `tsc --noEmit` clean for all navigation/screen/App files. Flagged: pre-existing tsc error in `src/components/foundation/FormField.tsx` (Components agent's `onBlur`/`onFocus` types vs RN 0.83's `BlurEvent`/`FocusEvent`). See `src/navigation/NAVIGATION_HANDOFF.md`. |
| Frontend | Mock Data Layer | **COMPLETE (2026-05-04)** — 8 files in `social-calendar-mobile/src/mocks/` (6 users, 4 friends + 1 pending + 1 availability block, 4 friend types, 4 events incl. recurring with cancelled+rescheduled exceptions and one co-host, 2 social groups, 2 polls, 1 suggestion, 30-day `MOCK_MY_AVAILABILITY` with `isoOffset(7)='busy'` wire-back invariant); tsc clean. Inferred shapes for API Stub Layer: `EventOrganiser`, `EventRecurrence`/`EventExceptionEntry`, `AvailabilityBlock`, poll closed-ness derived from `closesAt`. See `social-calendar-mobile/src/mocks/MOCKS_HANDOFF.md`. |
| Frontend | API Stub Layer | **COMPLETE (2026-05-04)** — 9 files in `social-calendar-mobile/src/api/`; @tanstack/react-query 5.100.9; getFriendAvailability('user-3') throws FORBIDDEN, submitRSVP throws SERVER_ERROR ~10%; optimistic updates on RSVP/availability/broadcast; App.tsx wraps the navigation tree in <QueryClientProvider>. See `social-calendar-mobile/src/api/API_STUB_HANDOFF.md`. |
| Frontend | Screens | **COMPLETE (2026-05-04)** — All 7 flows / 16 screens built (Home, EventDetail; Step1/2/3/Confirm; FriendsList/AddFriend/FriendProfile/FriendTypesManager; GroupsList/CreateGroup/GroupDetail/CoverPickerSheet; ProfileSettings; AvailabilityEditor — Option C inline collapse per Decision #6; BroadcastSettings/AudiencePickerSheet). Type-checks clean. Open items in `social-calendar-mobile/src/screens/SCREENS_HANDOFF.md` (OfflineBar wiring, edit profile sheet, MiniMap tiles, QR scanner camera, AdminBar invite picker route — all stub-phase deferrals, not blockers). R7-1/2/3/6 applied to component+screen layer 2026-05-04; R7-4/5 documented as JSDoc on src/mocks/notifications.ts for future Notifications agent. |
| DevOps | Docker Setup | **COMPLETE (2026-05-03)** — multi-stage Dockerfile + .dockerignore in `social-calendar-api/`. |
| DevOps | docker-compose | **COMPLETE (2026-05-03)** — root `docker-compose.yml` with api/postgres/redis. Two-role DB setup via `docker/postgres/init.sql` resolving the open item from `prisma/HANDOFF.md`. Root `.env.example` shipped. |
| DevOps | GitHub Actions | **COMPLETE (2026-05-03)** — `.github/workflows/ci.yml` with lint, type-check, test (postgres + redis service containers + two-role provisioning + `prisma migrate deploy`). Lint/test currently no-op via `--if-present`. |
| DevOps | EAS Build Config | **COMPLETE (2026-05-03)** — `social-calendar-mobile/eas.json` (development/preview/production profiles) + `app.json` (bundle IDs `tech.casillas.syncup`, runtimeVersion policy `appVersion`). |
| DevOps | Railway Deploy | **COMPLETE — pending credentials from Christian (2026-05-03)** — `social-calendar-api/railway.toml` + `DEPLOY_CHECKLIST.md` (env vars, two-role SQL, seed deletion gate). Cannot test until Christian connects the Railway project. |
| DevOps | Jest / Supertest | **COMPLETE (2026-05-04)** — Jest + Supertest infra installed; jest.config.ts + 6 setup files + 3 domain test suites (events / friends / groups) + /health sanity. 8 test.todo items for flagged endpoints. App factory: pre-existing (added by Auth agent). Type-checks clean; suite boots. See `social-calendar-api/JEST_HANDOFF.md`. |
| Backend | Auth follow-up — `GET /health` route | **COMPLETE (2026-05-04)** — resolved by Backend Cleanup agent. `src/routes/health.routes.ts` registers an unauthenticated `GET /health` returning `{ status: "ok" }` before the auth plugin in `src/app.ts`. See `social-calendar-api/src/BACKEND_CLEANUP_HANDOFF.md`. |
| Backend | Prisma client must read `DATABASE_URL_APP` at runtime | **COMPLETE (2026-05-04)** — resolved by Backend Cleanup agent. `src/config/prisma.ts` now exports `prisma` (DATABASE_URL, migration owner — auth upsert + webhook only) and `prismaApp` (DATABASE_URL_APP, restricted role); auth middleware's per-request `$transaction` runs on `prismaApp` so RLS engages. `DATABASE_URL_APP` is a required Zod field in `env.ts`. See `social-calendar-api/src/BACKEND_CLEANUP_HANDOFF.md`. |

### Resolved Design Questions (Round 7 — `ANCHOR-DESIGN.txt`, locked 2026-05-04)

All 5 previously-open design questions are now Director-locked. Source of truth: `ANCHOR-DESIGN.txt` lines 833–869 (R7-1 through R7-6). Tracked in the Open Decisions Log as Decisions #7–#11. Summary:

| Q | Question | Answer | Rule |
|---|---|---|---|
| 1 | Quicksets extensibility | User-extensible (save flow ships later; 4 built-ins permanent now) | R7-1 |
| 2 | BroadcastToast tap-to-review | No — toast stays simple, Broadcast Settings is the only editor | R7-2 |
| 3 | Friend Types nesting | No — disjoint membership; UNION semantics in multi-select | R7-3 |
| 4 | AdminBar scroll-collapse | No — pinned, binary on role only | R7-6 |
| 5 | Stale notifications | Auto-purge at 30 days + manual Clear all + per-card swipe | R7-4 |
| (bonus) | Push copy format | Push string = in-app copy verbatim | R7-5 |

### Availability Hub Layout (Decision #6 — Locked 2026-05-04)

**Locked: Option C — Inline collapse** (broadcast rules tucked under the calendar; tap to expand). Re-confirmed by Christian on 2026-05-04 when Flow 6 (Availability Editor) was about to start. Flow 6 may now proceed.

| Option | Label | Description |
|---|---|---|
| A | Single scroll | Calendar + broadcast block stacked, one continuous scroll |
| B | Top tabs | Segmented control flips between "Set availability" / "Broadcast rules" |
| **C** | **Inline collapse ← LOCKED** | Broadcast rules tucked under the calendar; tap to expand |

---

*This document is the Lead Manager's source of truth. Update it after every agent handoff.*

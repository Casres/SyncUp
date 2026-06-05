# SyncUp — Claude Code Instructions

## Start here

Read these two files before touching any code:

1. `ANCHOR-DESIGN.txt` — the complete design spec (v3.5). Every locked rule lives here. All component anatomy, interaction behavior, animation curves, haptics, nav graph, and edge cases.
2. `FRONTEND-HANDOFF.txt` — maps the spec to code. Lists the 10 build gaps in priority order with exact file paths, rule references, and implementation notes.

Do not start building until you have read both in full.

## State management rules (hard — do not deviate)

- If data comes from the API → React Query. No exceptions.
- If data never touches the network → local component state (useState / useReducer) or draftStore for the create-event flow.
- There is no Zustand in this project. Do not add it.
- Never copy API response data into any global store.

## Tech stack

- React Native 0.83.6 via Expo ~55.0.20
- TypeScript 5.9.2 (strict)
- React Navigation v7 (native-stack + bottom-tabs)
- react-native-reanimated 4.2.1
- react-native-gesture-handler ~2.30.0
- expo-haptics via `useHaptic()` in src/theme/haptics.ts
- @tanstack/react-query v5

## Project structure

```
social-calendar-mobile/
├── App.tsx                    Root entry; wraps QueryClientProvider
└── src/
    ├── api/                   React Query hooks + query keys
    ├── theme/                 Design tokens (colors, typography, spacing, motion, haptics)
    ├── mocks/                 Seed data for dev + tests
    ├── navigation/            RootNavigator, tab stacks, types
    ├── components/            foundation/ polish/ eventFlow/ profile/ social/ emptyStates/
    └── screens/               home/ events/ create/ friends/ groups/ profile/
```

## Build gaps — priority order

All 10 are fully specced in ANCHOR-DESIGN.txt. Build in this order:

1. **GAP 6** — NotifSheet navigation wiring (R12-1) — highest priority for backend integration
2. **GAP 3** — AttendeesSheet (R10, R11)
3. **GAP 4** — QuickProfileSheet (R12-5, R12-6)
4. **GAP 5** — QuicksetNameSheet (R12-2 through R12-4)
5. **GAP 2** — Search overlay (R8-1 through R8-7)
6. **GAP 7** — NotifSheet gesture upgrade (R13-1)
7. **GAP 8** — NotifSheet offline state (R13-2)
8. **GAP 9** — BroadcastToast queued prop (R13-3)
9. **GAP 10** — AudiencePickerSheet zero-friend state (R13-4)
10. **GAP 1** — Onboarding stack (R9-1 through R9-10)

See FRONTEND-HANDOFF.txt for full implementation detail on each gap.

## Non-negotiable rules (quick ref — full spec in ANCHOR-DESIGN.txt)

- Haptics: only 6 types via `useHaptic()` — never call `expo-haptics` directly
- Loading states: spinner only — no skeletons, no shimmer
- Destructive actions: always TwoTapDestructive — no confirmation modals
- Tab bar order is locked — never change it
- NotifSheet has exactly 2 detents: peek (44%) and full (88%)
- TweaksPanel (R14-1) is prototype HTML only — never ship in production
- Search is a full-screen overlay, not a tab or screen
- AdminBar on Group Detail is always pinned — never collapses
- Design tokens only — never hardcode hex values, use src/theme/colors.ts

## Seed data reminder

⚠️ `src/mocks/` seed file must be deleted before production. Do not ship mock data.

## Round 16 (Friend Profile · QuickProfileSheet drill) — LOCKED 2026-05-25

Friend Profile is now fully specced (R16-1 through R16-11 in ANCHOR-DESIGN.txt). The previously deferred mutual-friend-avatar tap resolves to a STACKED QuickProfileSheet (depth-1 cap per R16-3), not a deep push to Friend Profile.

If you're picking up where this round left off, the relevant code lives in:
- `src/screens/friends/FriendProfileScreen.tsx` — overflow trigger, action row, mutation wiring
- `src/components/social/FriendProfileOverflowMenu.tsx` — Remove / Block / Report
- `src/components/social/QuickProfileSheet.tsx` — `depth`, `onMutualFriendTap`, `currentUserId` props
- `src/components/polish/InfoToast.tsx` — DM + Report stub feedback
- `src/api/friends.ts` — `useRemoveFriend`, `useBlockUser`

DM and Report ship as stubs (toast-only) per R16-9.

> **STATUS UPDATE (2026-06-04, R18):** **DM is now PROMOTED to a real flow** — `FriendProfileScreen` navigates to the live `MessageThread` (messaging shipped in R18, merged via PR #1). The former `DM_STUB_COPY` string is now only an error-toast fallback ("Couldn't open the chat. Try again."), not "coming soon" copy. **Report remains a stub** (no report pipeline yet). The R16-2026-06-02 decision below is preserved as the historical record; the DM half is superseded.

**Stub decision — 2026-06-02 (historical; DM half superseded — see status update above):** both stubs are intentionally KEPT this round, not promoted and not cut.
- **DM** stays a stub. No DM backend domain exists; building a real DM flow is a separate scoped task, deferred to a future round.
- **Report** stays a stub. It's a safety/flag affordance — cutting it would remove the only path to report someone from a profile with nothing replacing it, so the stub is retained until a real report pipeline is built.

This is a conscious extension of the R16-9 "one major round" clock, not a silent breach. The clock resets to the next major round. When either is promoted: DM → new agent task (no backend yet); Report → wire `handleReportConfirm` to a real endpoint. Stub copy + wiring live in `FriendProfileScreen.tsx` (`DM_STUB_COPY`, `REPORT_CONFIRM_COPY`, `handleDmStub`, `handleReportConfirm`) and `InfoToast.tsx`.

## Session of 2026-06-02 (Backend round-trip wave) — LOCKED

The Notifications, Availability, and EventInvite domains are all live on `main` and verified end-to-end by the round-trip test (`./scripts/notif-avail-invites-roundtrip.sh` runs 26/0).

If you're picking up where this round left off, three things are locked and must not be regressed:

1. **Cross-user notification dispatch routes through the migration-owner Prisma client.** `notificationsRepository.create` uses `prisma` (not `prismaApp`) so the recipient-row INSERT bypasses RLS. Service-layer checks (only organizers can send invites, etc.) gate WHO can dispatch. The INSERT policy was also loosened to `current_app_user_id() IS NOT NULL` as defence-in-depth. See `4bf999b` and migration `20260601000001`.
2. **`availabilityService.getFriend` requires an accepted friendship before returning the map.** Block check fires first, friendship check fires second, then the map returns. The mobile contract `ApiError('FORBIDDEN', ...)` → "Availability private" is preserved. See `5bcdb23`.
3. **The Event SELECT policy's invitee leg inlines an `EventInvite EXISTS (...)` clause** instead of calling the `app_is_event_invitee` SECURITY DEFINER helper. Same snapshot-isolation pattern that bit `event_select_participant` in `5f30e3a`, applied to the invitee branch. See `e77ec29` and migration `20260601000002`.

Relevant code:
- `social-calendar-api/src/repositories/notifications.repository.ts` — dispatch path
- `social-calendar-api/src/services/availability.service.ts` — getFriend gate
- `social-calendar-api/src/repositories/friends.repository.ts` — `hasAcceptedFriendship` helper
- `social-calendar-api/prisma/migrations/20260601000001_fix_notification_insert_rls/`
- `social-calendar-api/prisma/migrations/20260601000002_fix_invitee_event_visibility/`
- `social-calendar-api/src/repositories/_userSelects.ts` — `publicProfileSelect` consolidated here (was duplicated across 4 repos)
- `scripts/notif-avail-invites-roundtrip.sh` — re-run after any change touching these domains; expect 26/0

The mobile mocks tombstone (`social-calendar-mobile/src/mocks/index.ts`) is intentionally kept in place — 17 consumers still import from it. See `BUILD-CHECKLIST.md` for the consumer table and the priority unblock (ship `useFriendTypes()` + `useFriendLabels()` React Query hooks to kill 6 consumers in one PR).

**`prisma-augment.d.ts` removed (2026-06-02).** The temporary type shim is gone. It had invented bespoke row-type names (`NotificationModel` / `BroadcastSettingsModel` / `UserAvailabilityModel`) that the repos imported from `@prisma/client`; those were refactored to the real generated names (`Notification` / `BroadcastSettings` / `UserAvailability`) in `notifications.repository.ts`, `availability.repository.ts`, and `notifications.service.ts`. Consequence: **the generated Prisma client is now the only source of these types — run `npm run prisma:generate` (in `social-calendar-api`) after a fresh checkout or schema change before `tsc`/`npm run build`.** The Dockerfile already runs `npx prisma generate` (L33). Without a generated client you'll see `TS2305: Module '@prisma/client' has no exported member 'AvailState'` (and similar) — that's a missing generate, not a code regression.

## Session of 2026-06-04 (R18 messaging build) — MERGED to `main`

The messaging system (1:1 DM · group chat · event chat) is built end-to-end —
backend + mobile code complete, both workspaces `tsc` green, `social-calendar-api`
`npm run build` green. **MERGED to `main` 2026-06-04 via PR #1 (merge commit
`a62668a`); the `r18-messaging-build` branch has been deleted.** Verified live:
migrate-deploy applied + `scripts/messaging-roundtrip.sh` runs **31/31, 0 fail,
re-runnable** against the docker stack. Full status lives in `R18-PLAN.md`
"Build notes". Do not regress these:

1. **All messaging WRITES route through the migration-owner `prisma` client**
   (`conversations.repository.ts` `…Owner` methods), NOT `prismaApp`. They are
   cross-user by nature; routing them through the owner client bypasses RLS so
   the INSERT…RETURNING never re-evaluates a SELECT policy — the snapshot bug
   from `5f30e3a` / `20260601000002` cannot recur on the write path. App-client
   READS are gated by inline-EXISTS SELECT policies.
2. **`ConversationParticipant` SELECT is own-rows-only** (`userId =
   current_app_user_id()`). A co-participant-visibility policy would query
   `ConversationParticipant` from within its own policy → "infinite recursion in
   policy". Co-participants are hydrated via the gated owner-client
   `listParticipantsForConversationsOwner` after a service membership check.
3. **Group chat auto-creates via `friendGroups.service`** (create → seed owner;
   addMember → add participant). NO public group-chat route (D4). **Event chat**
   is the deliberate host action `POST /events/:id/chat` (organiser-only).
4. **Message notifications dispatch as `NotifType.GROUP_ACTIVITY`** (no dedicated
   MESSAGE type) with a `conversationId`/`conversationType`/`linkedEventId`
   routing hint in the payload; the mobile NotifSheet `group_activity` case
   routes to the thread when `conversationId` is present (M4).

Relevant code:
- `social-calendar-api/src/{repositories,services,controllers,routes}/conversations.*`
- `social-calendar-api/src/sockets/chat.socket.ts`, `src/workers/eventChatArchival.worker.ts`
- `social-calendar-api/prisma/migrations/20260603000001_messaging/`
- `social-calendar-mobile/src/api/conversations.{ts,types.ts}`
- `social-calendar-mobile/src/components/messaging/*`, `src/screens/{friends/Messages*,events/EventChat}*`
- `scripts/messaging-roundtrip.sh` — re-run after any change touching these domains (needs docker + Clerk creds); expect 31/31. The messaging migration is NOT auto-applied at boot — run `docker compose exec api npx prisma migrate deploy` after `docker compose up -d --build`.
- `social-calendar-mobile/src/realtime/*` — the realtime socket client (see follow-up (a)).

**Deferred (open follow-ups):** (a) realtime socket CLIENT on mobile — ✅ BUILT
2026-06-04 in `social-calendar-mobile/src/realtime/` (`socket.io-client`, first on
mobile): `RealtimeProvider` (in `App.tsx`) owns the Clerk-bound socket + global
`chat:message:new`/`chat:conversation:new` → React Query; `useChatRoom` does
per-thread join/leave + the `chat:typing` relay feeding `ChatThreadView`'s
`TypingDots`. Pushes update the RQ cache only; typing is local state. `tsc` green;
NOT yet run against a live socket server (gated on the docker stack). (b) R17-1
Friends·Groups·Messages top-level carousel — ✅ BUILT 2026-06-04: `FriendsListScreen`
hosts a 3-way `SegmentedSwitcher` + `SegmentCarousel` (swipe, wraps both ways);
Groups=`GroupsPane`, Messages=`InboxPane`, both segments (not routes). `GroupsTab`/
`GroupsStack` retired, group screens moved into `FriendsStack`; Friends pane keeps a
pinned BFF chip + inline-expand pending banner. On branch `r17-friends-carousel`
(PR #2, draft into `main`); `tsc` green; device QA in progress (first iPhone-17-sim
run 2026-06-04 found+fixed the API shape bug in (e), full swipe QA still pending).
(e) **API list-envelope shape mismatch — ✅ FIXED 2026-06-04 (commit `6c3b22b`, branch
`r17-friends-carousel`).** The first live mobile run surfaced a pre-existing bug: the
backend wraps list responses (`{ friends }`, `{ requests }`, `{ groups }`, `{ polls }`,
`{ suggestions }`) but five mobile fetchers (`getFriends`/`getFriendRequests` in
`api/friends.ts`, `getGroups`/`getGroupPolls`/`getGroupSuggestions` in `api/groups.ts`)
cast to bare arrays → runtime `x.filter is not a function` on first render against the
real API (was masked before because the app had only run on mocks). Fixed all five to
unwrap defensively (`Array.isArray(res) ? res : res?.key ?? []`). `getFriendTypes`,
`useInbox`, `events`, `notifications` already unwrapped; no `blocks`/`members` list
fetchers exist. NB after such a fix a **full reload** is needed — React Query caches the
bad shape across fast-refresh. When adding a new list endpoint, mirror the backend
envelope in the fetcher.
(c) migrate-deploy ✅ + `messaging-roundtrip.sh` ✅ 31/31 (2026-06-04). The run found
+ fixed a real bug: group-chat auto-create silently failed because the FriendGroup
was written in the uncommitted per-request app-client tx while the chat insert ran on
a separate owner-client connection (FK `linkedGroupId` had no visible target → P2003,
swallowed). Fix: `friendGroupsRepository.createWithGroupChatOwner` creates group + GROUP
conversation + owner participant in ONE owner-client `$transaction`. Two
`messaging-roundtrip.sh` assertions also fixed (friends-list shape; deterministic
group-conversation selection by `linkedGroupId`). CI: the Test job was pre-existing red
on `main` because `ci.yml` omitted the `CLOUDINARY_*` vars `env.ts` requires at import
(`process.exit(1)` before any test); fixed by adding them as GitHub repo secrets and
wiring them into the Test job env. (d) DM + Report R16-9 stub clock: DM is now PROMOTED
(real); Report stays a stub.

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

**Stub decision — 2026-06-02:** both stubs are intentionally KEPT this round, not promoted and not cut.
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

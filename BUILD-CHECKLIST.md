# SyncUp — Build Checklist (Pre-Testing)

Last updated: 2026-06-04 (R18: messaging build — branch `r18-messaging-build`)

---

## Recently completed (2026-06-04 — R18: messaging build)

Messaging (DM · group · event chat) shipped end-to-end. Both workspaces `tsc`
green; `social-calendar-api` `npm run build` green. Branch `r18-messaging-build`
pushed to `origin`.

- [x] **Backend domain** — `Conversation`/`Message`/`ConversationParticipant`
  models + `ConversationType` enum; migration `20260603000001_messaging`.
  Repo/service/routes/controller at `/conversations` + `POST /events/:id/chat`.
  Group chat auto-created via `friendGroups.service` (D4); event chat host-enabled.
- [x] **RLS** — writes route through the migration-owner `prisma` client (bypass
  RLS → INSERT…RETURNING never re-evaluates a SELECT policy, sidestepping the
  `5f30e3a`-class bug); reads use inline-EXISTS; `ConversationParticipant` SELECT
  own-rows-only with co-participant hydration via gated owner-client methods.
- [x] **Realtime (server)** — `chat.socket.ts` (join/leave + typing relay);
  emits `chat:message:new` / `chat:conversation:new` / `chat:typing`.
- [x] **Archival worker** — `eventChatArchival.worker.ts` sets `archivedAt =
  endsAt+48h` for one-time event chats; inbox is a plain `archivedAt IS NULL` filter.
- [x] **Round-trip script** — `scripts/messaging-roundtrip.sh` (all 3 types,
  participant-gating 403, non-organiser 403, unread counts, archived exclusion).
- [x] **Mobile** — `conversations.ts`/`.types.ts` hooks; `components/messaging/*`
  + `EmptyMessages`; MessagesScreen/MessageThreadScreen/EventChatScreen + nav.
  DM promoted from R16-9 stub → real (R17-9). NotifSheet M4 routing.
- [ ] **PENDING — migrate-deploy + run `scripts/messaging-roundtrip.sh`** (needs
  `docker compose up` + Clerk creds). `npx prisma generate` already run locally.
- [ ] **PENDING — realtime socket client on mobile** (none exists for any domain).
- [ ] **PENDING — R17-1 Friends·Groups·Messages carousel consolidation.**

---

## Recently completed (2026-06-02 — Wave 5: API stub live-path wiring)

- [x] **`events.ts` live paths wired** — All 6 fetch/mutate functions now call the real backend when `isApiConfigured()` is true. Key changes:
  - `BackendEvent` / `BackendOrganiser` / `BackendInvite` / `BackendPublicProfile` wire types added inline (using actual Prisma field names `username` / `displayName`).
  - `inviteStatusToRsvp()` converter: `ACCEPTED→'yes'`, `DECLINED→'no'`, `MAYBE→'maybe'`, `PENDING→null`.
  - `toMobileEvent(raw, currentUserId?)` mapper: `creatorId→hostId`, `organisers→coHostIds`, `startsAt→startAt/iso`, `endsAt→endAt`, `invites→inviteeIds+rsvps`. Current user's RSVP entry aliased under both their actual Clerk userId AND `'me'` to preserve the `event.rsvps['me']` screen convention.
  - `getEvents` unwraps the `{ events: [] }` list wrapper.
  - `createEvent` maps draft to backend schema (`startAt→startsAt`, strips `glyph`/`price`/`groupId`/`geo`) and sends `inviteeIds` as a separate `POST /events/:id/invites`.
  - `updateEvent` translates `startAt/endAt → startsAt/endsAt`, drops client-only fields.
  - `getRSVPs` fetches the event and extracts from `invites[]` (no standalone `/rsvps` route on backend).
  - `submitRSVP` uses the new `POST /events/:id/rsvp` convenience endpoint.
  - Hooks (`useEvents`, `useEvent`, `useUpdateEvent`, `useSubmitRSVP`) pass `userId` from `useAuth()` into mappers for the `'me'` alias. Mock fallback path preserved for `!isApiConfigured()`.

- [x] **Backend: `POST /events/:id/rsvp` convenience endpoint** — Mobile callers do not need to know their `inviteId`; backend resolves it from `(eventId, request.user.id)`.
  - `events.repository.ts` — `findInviteForRecipient(db, eventId, recipientId)` helper added.
  - `events.service.ts` — `rsvp()` method resolves the invite then delegates to `respondToInvite` (preserves socket fan-out + RSVP notification dispatch).
  - `events.controller.ts` — `rsvp` handler added.
  - `events.routes.ts` — `POST /:id/rsvp` registered before the parameterized invite routes.

- [x] **Backend: notification dispatch payloads enriched** — Actor profile data (name, handle/username, initial) now denormalized into the stored payload at dispatch time so the mobile NotifSheet can render cards without a secondary user lookup. Both dispatch sites in `events.service.ts` updated:
  - RSVP notifications: `actorName`, `actorHandle`, `actorInitial` sourced from `updated.recipient` (already loaded via `eventInclude`).
  - Event-invite notifications: `actorName`, `actorInitial` sourced from `event.organisers.find(o => o.user.id === userId)`.

- [x] **`notifications.ts` live paths wired** — Previously mock-only. Now calls real backend:
  - `BackendNotif` wire type + `BACKEND_TYPE_MAP` for `SCREAMING_SNAKE → lowercase_snake` type conversion.
  - `toMobileNotif()` mapper; RSVP `rsvpStatus` re-mapped `ACCEPTED/DECLINED/MAYBE → 'yes'/'no'/'maybe'`.
  - `getNotifications` calls `GET /notifications`, unwraps `{ notifications }`, maps and filters unknown types.
  - **Three new mutations added:** `useMarkNotifRead`, `useMarkAllNotifsRead`, `useDismissNotif` — all with optimistic cache updates. Exported from `src/api/index.ts` automatically.
  - `staleTime: 60_000` preserved.
  - ⚠️ Note: `GROUP_INVITE` type is currently dispatched for both event invites and future group invites (backend convention, locked). Event-invite rows have `eventId`/`eventName` in the payload; true group-invite rows will have `groupId`/`groupName` when that domain is wired.

Both `tsc --noEmit` (mobile + API) clean after all changes.

---

## Recently completed (2026-06-02 — Wave 4: mock-tombstone hooks)

- [x] **`useFriendTypes()` + `useFriendLabels()` hooks + mutations** — `useFriendTypes`, `useFriendLabels`, `useCreateFriendType`, `useDeleteFriendType` added to `src/api/friends.ts`. Backend `friendGroups.repository.ts` / `friendGroups.service.ts` updated to include `memberIds: string[]` inline (Prisma `members: { select: { userId: true } }`). `queryKeys.friends.types()` key added. Both `tsc --noEmit` (mobile + API) clean. Mock consumer count: **17 → 12**.

  Screens fully freed of mock imports (MOCK_FRIEND_TYPES + MOCK_FRIEND_LABELS removed):
  - `FriendTypesManagerScreen`, `FriendProfileScreen`, `FriendsListScreen`, `AudiencePickerSheetScreen`, `Step3Screen`

  Screens partially cleaned (MOCK_FRIEND_TYPES removed; MOCK_FRIENDS remains for friends-name lookup — clears when `src/api/friends.ts` stub wires to live `/friends`):
  - `BroadcastSettingsScreen`, `AvailabilityEditorScreen`

---

## Recently completed (2026-06-02 — Wave 2 round-trip verified)

- [x] **Live backend round-trip — 26/0 PASS** — Migrations `20260601000001` + `20260601000002` applied; `./scripts/notif-avail-invites-roundtrip.sh` ran end-to-end against the docker compose stack and posted 26 passes / 0 fails. Covers full notification create→read→mute→read-all→dismiss chain (with cross-user dispatch), availability self GET/PUT/PATCH + FORBIDDEN gate + broadcasts GET/PUT, invite send/accept/rescind chain, and regression smoke on events/friends/groups. Green snapshot captured at `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` (commit `5e523b4`); script-side read-all expectation fixed in `6a35299`. Confirms all three backend bug fixes (`4bf999b`, `5bcdb23`, `e77ec29`) are live and correct.

## Recently completed (2026-06-02 — Wave 3 finisher)

- [x] **`publicProfileSelect` consolidation** — constant extracted from 4 repositories into `social-calendar-api/src/repositories/_userSelects.ts`. Pattern matches the existing `_types.ts` shared module. Kept `satisfies Prisma.UserSelect` so literal types survive for `typeof publicProfileSelect` derivations. Committed `c6ee094`.
- [x] **GCP billing alerts runbook drafted** — `social-calendar-api/src/infra/GCP_BILLING_ALERTS_RUNBOOK.md` covers prereqs (env vars, perms, notification channel), Path A (`terraform init/plan/apply`), Path B (gcloud fallback), verification, teardown, and cost expectations. Existing `gcp-billing-alerts.README.md` now points at the runbook. **Apply not yet run** — awaiting user with GCP credentials. Committed `5489a29`.
- [x] **Mocks tombstone audit** — 17 consumers still import from `../mocks` (7 api stubs + 10 screens/components). Tombstone stays in place; full consumer table documented below under "Mocks tombstone — remaining consumers". Committed `50046f4`.

## Recently completed (2026-06-01 — backend round-trip bug fixes)

- [x] **Notification cross-user dispatch fix** — `notifications.repository.ts` now routes cross-user notification INSERTs through the migration-owner Prisma client so the RLS app-user context doesn't reject writes destined for the recipient's row. New migration `20260601000001_fix_notification_insert_rls`. Committed `4bf999b`, merged via `736217b`.
- [x] **Availability privacy fix** — `availability.service.ts` `getFriend()` now requires an accepted friendship in addition to the existing FORBIDDEN gate, closing the bug where any authenticated user could read any other user's availability. Committed `5bcdb23`, merged via `736217b`.
- [x] **Invitee event visibility fix** — inlined an `EventInvite EXISTS` clause into the `Event` SELECT RLS policy so invited users (who are not yet attendees) can read the event they were invited to, unblocking PATCH/DELETE on `/events/:id/invites/:inviteId`. New migration `20260601000002_fix_invitee_event_visibility`. Committed `e77ec29`, merged via `736217b`.
- [x] **Round-trip script hardening** — three follow-up script fixes (`3690052`, `99ae4bd`, `7523e5d`, `23e7c64`) corrected the round-trip's Clerk token mint, event-create contract, recipient ID resolution, and empty-body Content-Type handling. Initial run captured at `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` (18/22) — re-run needed after the three backend fixes above to confirm 22/22.

## Recently completed (2026-05-30)

- [x] **Friend Profile screen** — `social-calendar-mobile/src/screens/friends/FriendProfileScreen.tsx` ships R16-1..R16-11. Route `FriendProfile` registered in `FriendsStack` with `{ friendId: string }` params. Overflow menu (Remove/Block/Report), `useRemoveFriend` + `useBlockUser` mutations, Make Plans + DM action row, DM/Report stubs via `InfoToast` per R16-9. Mutual-friend avatar tap stacks a depth-1 QuickProfileSheet per R16-3 (does NOT deep-push to Friend Profile).
- [x] **Tab bar reconciliation** — Decision LOCKED: `Home · Explore · Create(+) · Friends · Profile`. Spec rewritten to match shipped code (ANCHOR-DESIGN.txt R6-6, Hard Rule 23, and the "TAB BAR IA (LOCKED)" section all updated). NotifSheet stays a root-level overlay opened from the Home FlowHeader bell — intentionally NOT a tab. GroupsTab is registered for cross-tab navigation but hidden from the bar.
- [x] **Cloudinary signed avatar upload** — Backend sign endpoint (`POST /uploads/avatar/sign`), mobile `expo-image-picker` integration, upload flow in `YoureInScreen`, and `avatarUrl` PATCH all shipped. `RingAvatar` updated to render `<Image>` when `photoUrl` is provided. Committed `4363529`.
- [x] **Railway deploy** — API live at `syncup-production-bfb4.up.railway.app`. Postgres + Redis online. Clerk webhook configured. Cloudinary env vars set on Railway service.
- [x] **Native dev build** — `expo-dev-client` + `expo-image-picker` pinned to SDK 55 via `npx expo install`. `ios/` and `android/` added to `.gitignore`. `npx expo run:ios` compiles successfully.
- [x] **Clerk signup wiring** — `SignUpStep1Screen` now calls `signUp.create()` + `prepareVerification()`. `SignUpStep2Screen` calls `attemptVerification()` with the real OTP. `YoureInScreen.onGo` calls `setActive({ session: signUp.createdSessionId })` before the avatar upload so `getToken()` returns a valid JWT. `SignUpStep3Screen` wires name into `signUp.update()`.
- [x] **RLS INSERT…RETURNING fix** — Inlined `"creatorId" = current_app_user_id()` directly into the `event_select_participant` USING clause, removing the recursive SELECT that caused false RLS rejections on `INSERT…RETURNING`. Committed `5f30e3a`.
- [x] **ts-node added to api devDeps** — `jest.config.ts` requires `ts-node` to parse; it was missing, breaking CI. Fixed in `2518abf`.
- [x] **Accidental expo deps removed from api** — `expo-dev-client` + `expo-image-picker` were incorrectly added to `social-calendar-api/package.json` during a wrong-directory `expo install`. Cleaned up in `2518abf`.
- [x] **Backend — Notifications domain** — shipped on Wave 1 backend branch, merged at `d8f18af`. Full 4-file stack (`src/services/notifications.service.ts`, `repositories/notifications.repository.ts`, `controllers/notifications.controller.ts`, `routes/notifications.routes.ts`) + new `src/sockets/notifications.socket.ts` registered in `sockets/index.ts`. REST: `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `DELETE /notifications/:id`, `POST /notifications/:id/mute`. Emits `notif:new` / `notif:dismissed`. New migration `20260525000001_notif_avail_broadcast` adds `Notification` + `BroadcastSettings` tables, `AvailState` + `NotifType` + `BroadcastAudienceMode` enums, plus RLS policies.
- [x] **Backend — Availability domain** — shipped on Wave 1 backend branch, merged at `d8f18af`. Full 4-file stack mounted at `/availability`, wired to the existing `availability.socket.ts` for live broadcasts. REST: `GET /availability/me`, `PUT /availability/me/:date`, `PATCH /availability/me`, `GET /availability/:userId` (FORBIDDEN on non-shared per the FriendProfileScreen contract). Same migration adds `state` column on `UserAvailability` + unique `(userId, windowStart, granularity)` index.
- [x] **Backend — Invites endpoints** — shipped folded into existing Events domain (placement option a) on Wave 1 backend branch, merged at `d8f18af`. See `src/routes/EVENTS_HANDOFF.md` for the rationale (EventInvite is intrinsically event-scoped; organiser-gating + event-id resolution would duplicate in a standalone module).
- [x] **Frontend — availability path renames** — Mobile `src/api/availability.ts` URL strings updated to match the backend's `/availability/*` prefix. Hook names, query keys, response shapes unchanged. Cherry-picked at `85fa595`.
- [x] **Frontend — `FriendFindMatchesScreen` error toast** — Add-friend mutation `onError` now fires `ErrorToast` with retry. Mirrors the `FriendProfileScreen` pattern (`errorToastVisible` + `lastFailed` local state, no Zustand). Cherry-picked at `57cb560`.

---

## Frontend — Wiring & Integration

- [x] **Cloudinary media upload** — COMPLETE. See "Recently completed" above.
- [x] **Clerk `setActive` in `YoureInScreen`** — COMPLETE. See "Recently completed" above.
- [x] **`FriendFindMatchesScreen` error toast** — COMPLETE. See "Recently completed" above.

(Path note: onboarding screens live at `src/screens/auth/*`, not `src/screens/auth/onboarding/*`. Earlier drafts of this file used the nested path — corrected here.)

---

## Infrastructure & Deployment

- [x] **Live backend round-trip test** — VERIFIED 26/0 on 2026-06-02. See "Recently completed (Wave 2 verified)" above. Current results snapshot at `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` (commit `5e523b4`); re-run with `./scripts/notif-avail-invites-roundtrip.sh` after any backend change touching notifications/availability/invites.
- [x] **Railway project connection** — DONE 2026-05-28. API live at `syncup-production-bfb4.up.railway.app`. All env vars set including `DATABASE_URL_APP` (manual construction with `syncup_app` role) and `NIXPACKS_NODE_VERSION=22`.
- [x] **GCP Billing Alerts** — ✅ APPLIED 2026-06-03. Full GCP stack provisioned from scratch (SyncUp had no GCP project before): project `syncup-prod-8412`, billing acct `016726-8F7807-EEE435` (opened via $10 prepay), Places API (New) + `billingbudgets.googleapis.com` enabled, Places-restricted API key created and set as `GOOGLE_PLACES_API_KEY` on the Railway API service, then `terraform apply` created 3 notify-only budgets ($25/$50/$100, Places-only, no auto-disable). The `.tf` now carries a `provider "google"` block (`user_project_override=true`, `billing_project=var.project_id`) — required to avoid a 403 SERVICE_DISABLED quota-project routing error on apply. Runbook: `GCP_BILLING_ALERTS_RUNBOOK.md`; first-timer guide: `APPLY-QUICKSTART.md`.

---

## Code Cleanup (do last, before production)

- [x] **Delete seed file** — DONE 2026-05-28. `prisma/seed.ts` deleted + `prisma:seed` script + `prisma.seed` config block removed from `package.json`.
- [x] **`publicProfileSelect` consolidation** — DONE 2026-06-02. See "Recently completed" above.
- [x] **Delete mocks tombstone** — **DONE (verified 2026-06-04).** `src/mocks/` is gone (untracked/deleted) and **zero** files import from it; `friends.ts` is fully live-wired. The tables below are kept as a historical record of the rewiring effort but no longer track open work. Only remnant: `SearchOverlay.tsx` holds a *local* hardcoded `MOCK_PEOPLE` array — wiring it needs a `GET /users/search` endpoint that does not yet exist (a scoped feature + contract decision, not a tombstone consumer). A few stale `src/mocks/...` references survive in code comments/docstrings only.

### Mocks tombstone — remaining consumers (updated 2026-06-02 after Wave 5)

API stubs — **live path wired** but mock import retained for `!isApiConfigured()` fallback:

| File | Status | Symbols imported (fallback only) |
|---|---|---|
| `src/api/events.ts` | ✅ **Live path wired (Wave 5)** | `MOCK_EVENTS`, `MOCK_EVENT_ORGANISERS`, `MOCK_RSVPS`, type `EventOrganiser` |
| `src/api/notifications.ts` | ✅ **Live path wired (Wave 5)** | `MOCK_NOTIFICATIONS` |
| `src/api/friends.ts` | ⏳ Mock-backed | `MOCK_FRIENDS`, `MOCK_PENDING_REQUESTS`, `MOCK_USERS_BY_ID` |
| `src/api/availability.ts` | ⏳ Mock-backed | `MOCK_AVAILABILITY`, `MOCK_AVAILABILITY_BLOCKS`, `MOCK_BROADCAST_SETTINGS`, `MOCK_MY_AVAILABILITY`, `MOCK_SASHA_AVAILABILITY` |
| `src/api/profile.ts` | ⏳ Mock-backed | `MOCK_ME` |
| `src/api/groups.ts` | ⏳ Mock-backed | `MOCK_POLLS_BY_GROUP`, `MOCK_SOCIAL_GROUPS`, `MOCK_SUGGESTIONS_BY_GROUP` |
| `src/api/explore.ts` | ⏳ Mock-backed | `MOCK_EXPLORE_VENUES` |

Screens / components reading mocks directly (should consume the React Query hook instead):

| File | Symbols imported |
|---|---|
| `src/screens/profile/BroadcastSettingsScreen.tsx` | `MOCK_FRIENDS` |
| `src/screens/profile/AvailabilityEditorScreen.tsx` | `MOCK_FRIENDS` |
| `src/screens/groups/GroupDetailScreen.tsx` | `MOCK_USERS_BY_ID` |
| `src/screens/events/EventDetailScreen.tsx` | `MOCK_USERS_BY_ID` |

**~~Next priority: Wire `src/api/friends.ts` → live `GET /friends`~~ — DONE.** `friends.ts` (and the screen consumers above) no longer import mocks; the directory is deleted. This line is left struck-through for history only.
| `src/components/social/SearchOverlay.tsx` | `MOCK_EVENTS`, `MOCK_FRIENDS`, `MOCK_SOCIAL_GROUPS` |

Observation: The `MOCK_FRIEND_TYPES` / `MOCK_FRIEND_LABELS` long pole is cleared (Wave 4). **The new long pole is `MOCK_FRIENDS`** — it blocks BroadcastSettingsScreen, AvailabilityEditorScreen, and SearchOverlay. Wiring `src/api/friends.ts` → live `GET /friends` endpoint kills 3 screen consumers and unblocks `src/api/friends.ts` itself (which still holds `MOCK_FRIENDS`, `MOCK_PENDING_REQUESTS`, `MOCK_USERS_BY_ID`). After that, `events.ts` → `notifications.ts` → remaining stubs.

When the last consumer is rewired:
1. `rm social-calendar-mobile/src/mocks/index.ts`
2. `rm social-calendar-mobile/src/mocks/MOCKS_HANDOFF.md`
3. `rmdir social-calendar-mobile/src/mocks`
4. Confirm `tsc --noEmit` clean and remove this section.

---

## Notes

- Read `ANCHOR-DESIGN.txt` and `FRONTEND-HANDOFF.txt` before touching any frontend gap.
- State management rules are hard: API data → React Query. Local data → `useState` / `draftStore`. No Zustand.
- Never hardcode hex values — use `src/theme/colors.ts`.
- Never call `expo-haptics` directly — use `useHaptic()` from `src/theme/haptics.ts`.
- `TweaksPanel` (R14-1) is prototype HTML only — must never appear in production build.
- DM and Report buttons on Friend Profile are toast-only stubs (R16-9). Promote them to real flows or remove the buttons within one major round — do not leave "coming soon" copy in production longer than that.

---

## Known follow-ups (not blocking ship, but tracked)

- ~~**`useFriendTypes()` / `useFriendLabels()` React Query hooks**~~ — **DONE 2026-06-02.** Hooks shipped in `src/api/friends.ts`; `useCreateFriendType` + `useDeleteFriendType` mutations wired. Backend `/friend-groups` list now returns `memberIds: string[]` inline. 5 screens fully freed of mock imports (FriendTypesManagerScreen, FriendProfileScreen, FriendsListScreen, AudiencePickerSheetScreen, Step3Screen); BroadcastSettings + AvailabilityEditor still import `MOCK_FRIENDS` for the friends-name path in `audienceLabel`/`formatSummary` — they will clear when `src/api/friends.ts` stub is wired to the live endpoint.
- **Rewire remaining `src/api/*.ts` stubs** — 7 API stubs still import from `../mocks` (see audit table above). Each needs to switch from a mock import to an `authedFetch` call against the live backend. Order of priority probably tracks user-facing impact: `events.ts` → `notifications.ts` → `availability.ts` → `friends.ts` → `groups.ts` → `profile.ts` → `explore.ts`.
- ~~**GCP billing alerts apply**~~ — **DONE 2026-06-03.** Applied end-to-end (see Infra/Ops section above): project `syncup-prod-8412` + billing acct `016726-8F7807-EEE435` provisioned from scratch, Places key wired into Railway, 3 notify-only budgets live. `.tf` gained a `provider "google"` block (`user_project_override`/`billing_project`) to fix the apply-time 403.
- ~~**`prisma-augment.d.ts` shim**~~ — **DELETED 2026-06-02.** Not a clean one-file delete as originally assumed: the shim didn't just declare the new enums, it also invented bespoke row-type names (`NotificationModel`, `BroadcastSettingsModel`, `UserAvailabilityModel`) that the repos imported from `@prisma/client` — names `prisma generate` never produces (it emits `Notification`, `BroadcastSettings`, `UserAvailability`). Refactored those imports/usages to the real names in `notifications.repository.ts`, `availability.repository.ts`, `notifications.service.ts`, then deleted the shim. `tsc --noEmit` verified 0 errors against the real generated Prisma surface. **Note:** `tsc` now requires the generated client — run `npm run prisma:generate` after a fresh checkout (Dockerfile L33 already does this); without it you'll see `TS2305: has no exported member 'AvailState'` etc.
- **Promote DM and Report on Friend Profile** — R16-9 toast-only stubs ("coming soon" copy). Either ship the real flows or remove the buttons within one major round.

# SyncUp — Build Checklist (Pre-Testing)

Last updated: 2026-06-02

---

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

- [~] **Live backend round-trip test** — PARTIAL: fix branch (`fix/backend-roundtrip-bugs`) merged at `736217b`, awaiting host re-run for 22/0 verification. Initial run captured 18/22 in `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md`; the 4 failures map 1:1 to the three backend fixes that have since landed on main. Two new migrations (`20260601000001_fix_notification_insert_rls`, `20260601000002_fix_invitee_event_visibility`) must be applied to the local Postgres before re-running:
  ```bash
  docker compose exec api npx prisma migrate deploy
  ./scripts/notif-avail-invites-roundtrip.sh
  ```
  Expected: `22 passed, 0 failed`. Once green, delete `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` (it's the stale pre-fix snapshot).
- [x] **Railway project connection** — DONE 2026-05-28. API live at `syncup-production-bfb4.up.railway.app`. All env vars set including `DATABASE_URL_APP` (manual construction with `syncup_app` role) and `NIXPACKS_NODE_VERSION=22`.
- [~] **GCP Billing Alerts** — DOCS READY: full apply runbook at `social-calendar-api/src/infra/GCP_BILLING_ALERTS_RUNBOOK.md`. Terraform at `gcp-billing-alerts.tf` defines three notify-only budgets ($25 / $50 / $100 monthly, Places API only). Awaiting host `terraform apply` (or the gcloud Path B fallback) with `GCP_PROJECT_ID` + `GCP_BILLING_ACCOUNT_ID` set. Optional pre-launch hardening — can defer until traffic shape is known.

---

## Code Cleanup (do last, before production)

- [x] **Delete seed file** — DONE 2026-05-28. `prisma/seed.ts` deleted + `prisma:seed` script + `prisma.seed` config block removed from `package.json`.
- [x] **`publicProfileSelect` consolidation** — DONE 2026-06-02. See "Recently completed" above.
- [~] **Delete mocks tombstone** — audited 2026-06-02 by Wave 3 finisher. **17 consumers still import from `../mocks`** (7 api stubs, 10 screens/components). Tombstone stays in place; deletion deferred until each consumer is rewired to a live endpoint. See "Mocks tombstone — remaining consumers" below.

### Mocks tombstone — remaining consumers (audit 2026-06-02)

API stubs still mock-backed (replace each with `authedFetch` + drop the mock import):

| File | Symbols imported |
|---|---|
| `src/api/notifications.ts` | `MOCK_NOTIFICATIONS` |
| `src/api/availability.ts` | `MOCK_AVAILABILITY`, `MOCK_AVAILABILITY_BLOCKS`, `MOCK_BROADCAST_SETTINGS`, `MOCK_MY_AVAILABILITY`, `MOCK_SASHA_AVAILABILITY` |
| `src/api/profile.ts` | `MOCK_ME` |
| `src/api/groups.ts` | `MOCK_POLLS_BY_GROUP`, `MOCK_SOCIAL_GROUPS`, `MOCK_SUGGESTIONS_BY_GROUP` |
| `src/api/friends.ts` | `MOCK_FRIENDS`, `MOCK_PENDING_REQUESTS`, `MOCK_USERS_BY_ID` |
| `src/api/events.ts` | `MOCK_EVENTS`, `MOCK_EVENT_ORGANISERS`, `MOCK_RSVPS`, type `EventOrganiser` |
| `src/api/explore.ts` | `MOCK_EXPLORE_VENUES` |

Screens / components reading mocks directly (should consume the React Query hook instead — most need a hook to exist before they can be cleaned):

| File | Symbols imported |
|---|---|
| `src/screens/profile/BroadcastSettingsScreen.tsx` | `MOCK_FRIENDS`, `MOCK_FRIEND_TYPES` |
| `src/screens/profile/AudiencePickerSheetScreen.tsx` | `MOCK_FRIEND_LABELS`, `MOCK_FRIEND_TYPES` |
| `src/screens/profile/AvailabilityEditorScreen.tsx` | `MOCK_FRIENDS`, `MOCK_FRIEND_TYPES` |
| `src/screens/friends/FriendsListScreen.tsx` | `MOCK_FRIEND_LABELS`, `MOCK_FRIEND_TYPES` |
| `src/screens/friends/FriendTypesManagerScreen.tsx` | `MOCK_FRIEND_TYPES` |
| `src/screens/friends/FriendProfileScreen.tsx` | `MOCK_FRIEND_LABELS`, `MOCK_FRIEND_TYPES` |
| `src/screens/groups/GroupDetailScreen.tsx` | `MOCK_USERS_BY_ID` |
| `src/screens/events/EventDetailScreen.tsx` | `MOCK_USERS_BY_ID` |
| `src/screens/create/Step3Screen.tsx` | `MOCK_FRIEND_TYPES` |
| `src/components/social/SearchOverlay.tsx` | `MOCK_EVENTS`, `MOCK_FRIENDS`, `MOCK_SOCIAL_GROUPS` |

Observation: `MOCK_FRIEND_LABELS` and `MOCK_FRIEND_TYPES` are the long pole — 6 screens still hard-read them because no React Query hook exists for friend-types/labels yet. Adding `useFriendTypes()` + `useFriendLabels()` (or merging into `useFriends`) unlocks half the deletions in a single PR.

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

- **Host re-run of round-trip script** — see Infrastructure section above. Single command after `prisma migrate deploy`.
- **`npx prisma generate` on macOS host** — required before booting the dev server so the real Prisma client picks up the new `Notification`, `BroadcastSettings`, and `UserAvailability.state` shapes from migration `20260525000001`. After that, `src/types/prisma-augment.d.ts` (a temporary shim added by the backend agent so `tsc --noEmit` stays green) can be removed.
- **AvailabilityBlock RLS** — backend agent flagged: the friend-availability FORBIDDEN gate calls `findBlock(viewerId, blockerId)` to check whether the viewer is the *blocked* party. If existing RLS only grants SELECT on `AvailabilityBlock` to the blocker, the lookup won't see the row. Verify against the RLS policies migration; patch if needed. (May already be addressed by `5bcdb23` — re-confirm during the round-trip re-run.)
- **`useFriendTypes()` / `useFriendLabels()` React Query hooks** — adding these unlocks deletion of 6 mocks consumers in a single PR (see mocks audit above).
- **Stale round-trip results doc** — delete `NOTIF_AVAIL_INVITES_ROUNDTRIP_RESULTS.md` once the re-run captures the new 22/22 result. The current contents reflect the pre-fix state and will mislead anyone reading it.
- **GCP billing alerts apply** — runbook ready; one `terraform apply` away. Pre-launch hardening, not a blocker.

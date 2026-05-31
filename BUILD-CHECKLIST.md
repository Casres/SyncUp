# SyncUp — Build Checklist (Pre-Testing)

Last updated: 2026-05-30

---

## Recently completed (2026-05-30)

- [x] **Friend Profile screen** — `social-calendar-mobile/src/screens/friends/FriendProfileScreen.tsx` ships R16-1..R16-11. Route `FriendProfile` registered in `FriendsStack` with `{ friendId: string }` params. Overflow menu (Remove/Block/Report), `useRemoveFriend` + `useBlockUser` mutations, Make Plans + DM action row, DM/Report stubs via `InfoToast` per R16-9. Mutual-friend avatar tap stacks a depth-1 QuickProfileSheet per R16-3 (does NOT deep-push to Friend Profile).
- [x] **Tab bar reconciliation** — Decision LOCKED: `Home · Explore · Create(+) · Friends · Profile`. Spec rewritten to match shipped code (ANCHOR-DESIGN.txt R6-6, Hard Rule 23, and the "TAB BAR IA (LOCKED)" section all updated). NotifSheet stays a root-level overlay opened from the Home FlowHeader bell — intentionally NOT a tab. GroupsTab is registered for cross-tab navigation but hidden from the bar.
- [x] **Cloudinary signed avatar upload** — Backend sign endpoint (`POST /uploads/avatar/sign`), mobile `expo-image-picker` integration, upload flow in `YoureInScreen`, and `avatarUrl` PATCH all shipped. `RingAvatar` updated to render `<Image>` when `photoUrl` is provided. Committed `4363529`.
- [x] **Railway deploy** — API live at `syncup-production-bfb4.up.railway.app`. Postgres + Redis online. Clerk webhook configured. Cloudinary env vars set on Railway service.
- [x] **Native dev build** — `expo-dev-client` + `expo-image-picker` pinned to SDK 55 via `npx expo install`. `ios/` and `android/` added to `.gitignore`. `npx expo run:ios` compiles successfully.
- [x] **Clerk signup wiring** — `SignUpStep1Screen` now calls `signUp.create()` + `prepareVerification()`. `SignUpStep2Screen` calls `attemptVerification()` with the real OTP. `YoureInScreen.onGo` calls `setActive({ session: signUp.createdSessionId })` before the avatar upload so `getToken()` returns a valid JWT. `SignUpStep3Screen` wires name into `signUp.update()`. Changes committed (uncommitted as of 2026-05-30 — push before testing).
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

- [~] **Live backend round-trip test** — auth-side round-trip captured in `AUTH_DOCKER_ROUNDTRIP_RESULTS.md` (commit `4cbabea`). Outstanding: extend the run to cover the newly-merged `/notifications`, `/availability`, and Invites endpoints. Verify Clerk JWT verification, Redis TTLs, and rate limiting hold under the new surfaces. Requires `npx prisma generate` on host first so the dev server boots with the new models.
- [x] **Railway project connection** — DONE 2026-05-28. API live at `syncup-production-bfb4.up.railway.app`. All env vars set including `DATABASE_URL_APP` (manual construction with `syncup_app` role) and `NIXPACKS_NODE_VERSION=22`.
- [ ] **GCP Billing Alerts** — Terraform is written at `social-calendar-api/src/infra/gcp-billing-alerts.tf`. Apply with `GCP_PROJECT_ID` + `GCP_BILLING_ACCOUNT_ID`. Manual gcloud fallback documented in `gcp-billing-alerts.README.md`.

---

## Code Cleanup (do last, before production)

- [x] **Delete seed file** — DONE 2026-05-28. `prisma/seed.ts` deleted + `prisma:seed` script + `prisma.seed` config block removed from `package.json`.
- [ ] **Delete mocks tombstone** — remove `social-calendar-mobile/src/mocks/index.ts` once all `src/api/*.ts` stubs are hitting a live backend.
- [ ] **`publicProfileSelect` consolidation** — constant is duplicated across **4** repositories: `src/repositories/events.repository.ts:8`, `friendGroups.repository.ts:8`, `friends.repository.ts:10`, and `groups.repository.ts:10`. Extract to a shared location (e.g. `src/repositories/_shared/userSelects.ts`) and import everywhere.

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

- **`npx prisma generate` on macOS host** — required before booting the dev server so the real Prisma client picks up the new `Notification`, `BroadcastSettings`, and `UserAvailability.state` shapes from migration `20260525000001`. After that, `src/types/prisma-augment.d.ts` (a temporary shim added by the backend agent so `tsc --noEmit` stays green) can be removed.
- **AvailabilityBlock RLS** — backend agent flagged: the friend-availability FORBIDDEN gate calls `findBlock(viewerId, blockerId)` to check whether the viewer is the *blocked* party. If existing RLS only grants SELECT on `AvailabilityBlock` to the blocker, the lookup won't see the row. Verify against the RLS policies migration; patch if needed.

# SyncUp — Build Checklist (Pre-Testing)

Last updated: 2026-05-25 (post-Round 16 lock)

---

## Recently completed (locked 2026-05-25)

- [x] **Friend Profile screen** — `social-calendar-mobile/src/screens/friends/FriendProfileScreen.tsx` ships R16-1..R16-11. Route `FriendProfile` registered in `FriendsStack` with `{ friendId: string }` params. Overflow menu (Remove/Block/Report), `useRemoveFriend` + `useBlockUser` mutations, Make Plans + DM action row, DM/Report stubs via `InfoToast` per R16-9. Mutual-friend avatar tap stacks a depth-1 QuickProfileSheet per R16-3 (does NOT deep-push to Friend Profile).
- [x] **Tab bar reconciliation** — Decision LOCKED: `Home · Explore · Create(+) · Friends · Profile`. Spec rewritten to match shipped code (ANCHOR-DESIGN.txt R6-6, Hard Rule 23, and the "TAB BAR IA (LOCKED)" section all updated). NotifSheet stays a root-level overlay opened from the Home FlowHeader bell — intentionally NOT a tab. GroupsTab is registered for cross-tab navigation but hidden from the bar.

---

## Backend — New Domains (nothing written yet)

- [ ] **Notifications service** — create `notifications.service.ts`, `notifications.repository.ts`, `notifications.controller.ts`, `notifications.routes.ts`. Wire into `src/app.ts`. Socket layer is already stubbed and waiting for this. Highest priority — blocks real-time UX across the whole app.
- [ ] **Availability domain service** — `availability.socket.ts` stub exists but has no backing REST layer. Create `availability.service.ts`, `availability.repository.ts`, `availability.controller.ts`, `availability.routes.ts`. Wire into `src/app.ts`.
- [ ] **Invites incremental endpoints** — pending in project tracker, not yet specced or built. Add to Events domain or create a dedicated Invites route module. Coordinate with socket layer in `events.socket.ts`.

---

## Frontend — Wiring & Integration

- [ ] **Cloudinary media upload** — `social-calendar-mobile/src/screens/auth/SignUpStep5Screen.tsx:33-34` has a TODO for `expo-image-picker.launchImageLibraryAsync` + post-Clerk upload. There is no `AvatarUploadWell` component in the codebase today; the screen uses an inline upload affordance. Wire Cloudinary SDK upload, return URL back to the form field, and persist to the profile after `setActive`.
- [ ] **Clerk `setActive` in `YoureInScreen`** — `social-calendar-mobile/src/screens/auth/YoureInScreen.tsx:82` has a TODO comment. Replace stub with real `setActive({ session })` call to hand off to `RootNavigator`.
- [ ] **`FriendFindMatchesScreen` error toast** — `social-calendar-mobile/src/screens/auth/FriendFindMatchesScreen.tsx:48` has a TODO. Wire the add-friend mutation error path to fire `ErrorToast`.

(Path note: onboarding screens live at `src/screens/auth/*`, not `src/screens/auth/onboarding/*`. Earlier drafts of this file used the nested path — corrected here.)

---

## Infrastructure & Deployment

- [ ] **Live backend round-trip test** — run `docker compose up -d`, exercise `/explore` and all auth-gated endpoints. Verify Clerk JWT verification, Redis TTLs, and rate limiting end-to-end. First real test against a live backend. *Depends on the three Backend domain services above — defer until at least Notifications + Availability ship, otherwise the auth-gated endpoint coverage is incomplete.*
- [ ] **Railway project connection** — `railway.toml` and `social-calendar-api/DEPLOY_CHECKLIST.md` are ready. Connect Railway project and provide all required env vars (`DATABASE_URL`, `DATABASE_URL_APP`, `REDIS_URL`, `CLERK_SECRET_KEY`, etc.).
- [ ] **GCP Billing Alerts** — Terraform is written at `social-calendar-api/src/infra/gcp-billing-alerts.tf`. Apply with `GCP_PROJECT_ID` + `GCP_BILLING_ACCOUNT_ID`. Manual gcloud fallback documented in `gcp-billing-alerts.README.md`.

---

## Code Cleanup (do last, before production)

- [ ] **Delete seed file** — remove `social-calendar-api/prisma/seed.ts` and the `prisma.seed` entry in `package.json`. Must not ship to production.
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

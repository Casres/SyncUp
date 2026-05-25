# SyncUp — GAP Build Progress
Last updated: 2026-05-11

## How to use this file
Paste this file into a new conversation along with CLAUDE.md to resume
without losing context. Always update this file after each GAP completes.

---

## Project snapshot

- **Repo:** github.com/Casres/SyncUp (private)
- **Stack:** React Native 0.83.6 / Expo ~55.0.20 / TypeScript 5.9.2 strict
- **Mobile root:** `social-calendar-mobile/`
- **API root:** `social-calendar-api/` (Fastify + Prisma + Postgres + Redis)
- **Source of truth:** `ANCHOR-DESIGN.txt`, `FRONTEND-HANDOFF.txt`, `CLAUDE.md`
- **State rules:** API data → React Query. UI-only state → useState/useReducer. No Zustand.

---

## Infrastructure status

| Service | Status |
|---------|--------|
| Docker (Postgres, Redis, Fastify) | Torn down — run `docker compose up -d` from repo root to restore |
| RLS bug (`/events` → 200) | ✅ Fixed — SECURITY DEFINER migration applied |
| GitHub remote | ✅ Connected — `origin https://github.com/Casres/SyncUp.git` |

---

## GAP build queue

| Priority | GAP | Description | Status |
|----------|-----|-------------|--------|
| 1 | GAP 6 | NotifSheet + all 8 card types + nav wiring (R12-1, R13-1, R13-2) | ✅ Complete — committed `134e708` |
| 2 | GAP 3 | AttendeesSheet (R10, R11) | ✅ Complete — committed `bb9a7e6` |
| 3 | GAP 4 | QuickProfileSheet (R12-5, R12-6) | ✅ Complete — committed (see log) |
| 4 | GAP 5 | QuicksetNameSheet (R12-2 through R12-4) | ✅ Complete — committed (see log) |
| 5 | GAP 9 | BroadcastToast `queued` prop (R13-3) | ✅ Complete — see commit log |
| 6 | GAP 10 | AudiencePickerSheet zero-friend state (R13-4) | ✅ Complete — see commit log |
| 7 | GAP 2 | Search overlay (R8-1 through R8-7) | ✅ Complete — see commit log |
| 8 | GAP 1 | Onboarding stack (R9-1 through R9-10) | ✅ Complete — see commit log |

---

## Claude Code prompt files

Each GAP has a prompt file in the repo root. Same process every time:
open Claude Code → paste the file contents → let it run.

| File | GAP | Status |
|------|-----|--------|
| `CLAUDE-CODE-PROMPT-GAP6-DOCKER.md` | GAP 6 + Docker | ✅ Used |
| `CLAUDE-CODE-PROMPT-GAP3.md` | GAP 3 | ✅ Used |
| `CLAUDE-CODE-PROMPT-GAP4.md` | GAP 4 | ✅ Used |
| `CLAUDE-CODE-PROMPT-GAP5.md` | GAP 5 | ✅ Used |
| `gaps/GAP-09-broadcast-toast-queued.md` | GAP 9 | ⏳ Run via EXECUTE-GAPS.md |
| `gaps/GAP-10-audience-picker-zero-state.md` | GAP 10 | ⏳ Run via EXECUTE-GAPS.md |
| `gaps/GAP-02-search-overlay.md` | GAP 2 | ⏳ Run via EXECUTE-GAPS.md |
| `gaps/GAP-01-onboarding.md` | GAP 1 | ⏳ Run via EXECUTE-GAPS.md |
| *(to be written)* | GAP 2 | ⏳ |

---

## Key architectural facts

- **NotifSheet** is a root-level overlay, not a nav screen. Controlled via `NotifSheetContext` (openPeek / openFull / dismiss).
- **Tab bar (LOCKED 2026-05-25):** `Home · Explore · Create(+) · Friends · Profile`. Spec rewritten to match shipped code; the earlier Broadcast/Activity proposal is dead. NotifSheet stays a root-level overlay opened from the Home FlowHeader bell — it is intentionally NOT a tab. See ANCHOR-DESIGN.txt → "TAB BAR IA (LOCKED)" + R6-6 + Hard Rule 23.
- **Haptics:** `useHaptic()` only — never call expo-haptics directly. 6 types: light · medium · heavy · success · warning · error.
- **Destructive actions:** always TwoTapDestructive — no confirmation modals, no single-tap deletes.
- **Loading states:** Spinner only — no skeletons, no shimmer.
- **Friend Profile (LOCKED 2026-05-25):** FriendProfileScreen.tsx is shipped per Round 16 (R16-1..R16-11). Route `FriendProfile` lives in FriendsStack with `{ friendId: string }` params. QuickProfileSheet mutual-friend avatar tap stacks a depth-1 QuickProfileSheet (NOT a deep push to Friend Profile, per R16-3). DM and Report are toast-only stubs per R16-9 — promote or remove within one major round.
- **`coHostIds: string[]`** was missing from the Event type in TYPES.ts — added as part of GAP 3 build.

---

## Pre-production reminders (not urgent)

- Delete `src/mocks/` seed files before shipping
- Discuss Explore API scaling (Eventbrite + Google Places rate limits) before production
- Wire Clerk `getToken()` across all query functions once `@clerk/clerk-expo` lands

---

## How to write the next GAP prompt

1. Read `ANCHOR-DESIGN.txt` sections for the relevant spec rules
2. Read `FRONTEND-HANDOFF.txt` for the GAP detail and file paths
3. Check what already exists in the codebase (components, types, mocks)
4. Note any type gaps (like the missing coHostIds in GAP 3)
5. Write the prompt to `CLAUDE-CODE-PROMPT-GAP{N}.md` in the repo root
6. Paste into Claude Code and let it run
7. After Claude Code finishes, update this file

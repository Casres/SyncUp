# SyncUp — Claude Code Instructions

## Start here

Read these two files before touching any code:

1. `ANCHOR-DESIGN.txt` — the complete design spec (v3.4). Every locked rule lives here. All component anatomy, interaction behavior, animation curves, haptics, nav graph, and edge cases.
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

## Deferred — do not build yet

QuickProfileSheet mutual friend avatar tap → Friend Profile. Spec is incomplete. Stub as a no-op (no haptic, no navigation) until Friend Profile is fully designed.

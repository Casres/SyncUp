# Component Library — Handoff

> Frontend / Component Library agent. Output of the resumed build on
> 2026-05-04 — `npx tsc --noEmit` is clean.

---

## What Was Built

63 presentational components across 6 categories, all imported from a single
barrel: `src/components/index.ts`.

### Foundation — `src/components/foundation/` (11)

| File | Component | One-liner |
|------|-----------|-----------|
| `FlowHeader.tsx`     | `FlowHeader`     | Screen header — back chevron + title + right slot |
| `PillBtn.tsx`        | `PillBtn`        | Primary/ghost/destructive pill button (44pt at md) |
| `FormField.tsx`      | `FormField`      | Labeled text input with error state |
| `Field.tsx`          | `Field`          | Lower-level labeled-surface wrapper |
| `RingAvatar.tsx`     | `RingAvatar`     | Circular avatar with availability ring (Hard Rule 4) |
| `Overline.tsx`       | `Overline`       | Mono uppercase 10/600 label |
| `SectionHeader.tsx`  | `SectionHeader`  | Section title + 28pt trailing slot for inline spinner |
| `Toggle.tsx`         | `Toggle`         | iOS-style switch (medium haptic on flip) |
| `MiniMap.tsx`        | `MiniMap`        | Static map preview behind event location card |
| `PriceSelector.tsx`  | `PriceSelector`  | +/- price stepper |
| `ProgressBar.tsx`    | `ProgressBar`    | 3-step Create Event Flow progress indicator |

### Polish — `src/components/polish/` (8)

| File | Component | One-liner |
|------|-----------|-----------|
| `Spinner.tsx`         | `Spinner`         | THE only loading affordance (R5-2). Two-arc SVG, 4 sizes |
| `LoadingOverlay.tsx`  | `LoadingOverlay`  | Full-screen Spinner + optional caption |
| `ButtonLoading.tsx`   | `ButtonLoading`   | Inline button loading state |
| `ErrorState.tsx`      | `ErrorState`      | 4 presets (network/server/notFound/permission) |
| `ErrorToast.tsx`      | `ErrorToast`      | Docked error toast (canonical `TOAST_POSITION_DEFAULTS`) |
| `OfflineBar.tsx`      | `OfflineBar`      | Slim offline indicator (R5-7 triple) |
| `A11yLive.tsx`        | `A11yLive`        | Invisible screen-reader live region |
| `StaggerList.tsx`     | `StaggerList`     | List wrapper with stagger entrance + reduce-motion |

### Event Flow — `src/components/eventFlow/` (7)

| File | Component | One-liner |
|------|-----------|-----------|
| `AvailabilitySummaryBar.tsx` | `AvailabilitySummaryBar` | Banded availability viz (Hard Rule 1) |
| `FilterChipRow.tsx`          | `FilterChipRow`          | Single-select filter chip carousel (44pt hit) |
| `EventCard.tsx`              | `EventCard`              | Home feed event card |
| `ConfirmCard.tsx`            | `ConfirmCard`            | Post-creation confirm summary card |
| `RSVPSheet.tsx`              | `RSVPSheet`              | Bottom sheet for RSVP (Yes / Maybe / No) |
| `Step3BusyBanner.tsx`        | `Step3BusyBanner`        | Danger banner for Step 3 wire-back (busy day) |
| `Step3AvailChip.tsx`         | `Step3AvailChip`         | Subtle status overline chip for free/maybe day |

### Social — `src/components/social/` (15)

| File | Component | One-liner |
|------|-----------|-----------|
| `SegmentedSwitcher.tsx`   | `SegmentedSwitcher`   | 2/3-up sunken-track switcher |
| `CoverArt.tsx`            | `CoverArt`            | Group cover artwork — deterministic glyph from cover.id (no gradients per Hard Rule 3) |
| `QRArt.tsx`               | `QRArt`               | QR code display card with shadowAccent |
| `CategoryBadge.tsx`       | `CategoryBadge`       | Friend category badge (color dot + label) |
| `PrivateBadge.tsx`        | `PrivateBadge`        | Lock + "Private" (use sparingly — Hard Rule 11) |
| `PollRow.tsx`             | `PollRow`             | Poll option row with vote bar |
| `SuggestionRow.tsx`       | `SuggestionRow`       | Lightbulb + author + idea + upvote |
| `AdminBar.tsx`            | `AdminBar`            | Admin invite/settings bar (Hard Rule 9–10) |
| `AdminInviteRow.tsx`      | `AdminInviteRow`      | Friend row in admin invite flow |
| `TwoTapDestructive.tsx`   | `TwoTapDestructive`   | Arm → confirm destructive (Hard Rule 7, 600ms gate) |
| `PlanningModeToggle.tsx`  | `PlanningModeToggle`  | Casual / Planning toggle (medium haptic) |
| `FilterChipRowMulti.tsx`  | `FilterChipRowMulti`  | Multi-select chip carousel |
| `FGTabBar.tsx`            | `FGTabBar`            | Friends/Groups module bottom tab bar (4 tabs) |
| `TabPills.tsx`            | `TabPills`            | Pill-style tabs (Group Detail) |
| `EmptyStateBlock.tsx`     | `EmptyStateBlock`     | Generic empty state (anatomy compliant) |

### Profile & Availability — `src/components/profile/` (13)

| File | Component | One-liner |
|------|-----------|-----------|
| `SettingsRow.tsx`         | `SettingsRow`         | Renders `<View>` (NOT `<Pressable>`) when `onPress` undefined — Hard Rule 16 |
| `SettingsGroup.tsx`       | `SettingsGroup`       | Titled card containing SettingsRow children |
| `ThemePicker.tsx`         | `ThemePicker`         | 3-up Light/Dark/System picker (light haptic) |
| `AvailDot.tsx`            | `AvailDot`            | 8px state dot (null → dashed ring) |
| `StatTile.tsx`            | `StatTile`            | 20/800 stat number + overline label |
| `BroadcastToast.tsx`      | `BroadcastToast`      | Floating toast (Hard Rule 13: state dot leading marker) |
| `AudienceSwitcher.tsx`    | `AudienceSwitcher`    | Everyone/Friends/Types sub-switcher |
| `AudiencePickerSheet.tsx` | `AudiencePickerSheet` | Bottom sheet for picking friends OR types |
| `MonthGrid.tsx`           | `MonthGrid`           | 7-col grid with PanResponder drag-paint |
| `WeekView.tsx`            | `WeekView`            | 7 stacked rows for the anchor week |
| `DayView.tsx`             | `DayView`             | Day chevron + 4-option availability selector |
| `BrushPicker.tsx`         | `BrushPicker`         | 4-up Free/Maybe/Not/Clear brush selector |
| `QuicksetGrid.tsx`        | `QuicksetGrid`        | 2×2 quickset buttons with 1600ms applied confirm |

### Empty States — `src/components/emptyStates/` (9)

All compose `EmptyStateBlock` with the canonical 56×56 illustration tile,
≤6-word headline, ≤14-word body, verb-first ≤3-word CTA. NEVER a photo,
emoji, or 3D render.

| File | Component | Headline / CTA |
|------|-----------|----------------|
| `EmptyHome.tsx`          | `EmptyHome`          | "No plans today" / "Plan something" (today/week/month) |
| `EmptyFriends.tsx`       | `EmptyFriends`       | "No friends yet" / "Add one" + "Share QR" |
| `EmptyGroups.tsx`        | `EmptyGroups`        | "No groups yet" / "Create one" |
| `EmptySearch.tsx`        | `EmptySearch`        | "Nothing matched" / "Invite by handle" |
| `EmptyAvailability.tsx`  | `EmptyAvailability`  | "Set your first day" / "Try a Quickset" |
| `EmptyAttendees.tsx`     | `EmptyAttendees`     | "No invites sent" / "Add invitees" |
| `EmptyPolls.tsx`         | `EmptyPolls`         | "No polls yet" / "Start a poll" |
| `EmptySuggestions.tsx`   | `EmptySuggestions`   | "No ideas yet" / "Suggest one" |
| `EmptyMutualEvents.tsx`  | `EmptyMutualEvents`  | "Nothing planned together" / "Plan an event" |

---

## Inferred Prop Shapes — for the Screens Agent

These weren't explicit in the spec but were necessary to keep components
purely presentational. The Screens agent should be aware so its data plumbing
matches:

1. **`EventCard.myRsvp?: RSVPStatus`** — the local user's RSVP for the event,
   drives the trailing AvailDot + label. Optional; absent → no RSVP row.
2. **`RSVPSheet`** props — `{ visible, value, onChange, onClose }`. `visible`
   controls render; the navigator-backed sheet route still owns presentation.
   `value: RSVPStatus`, `onChange: (next: 'yes' | 'maybe' | 'no') => void`.
3. **`Step3BusyBanner`** — `{ iso, onAction?, actionLabel? }`. The banner shows
   the conflict ISO; parent owns the "pick another day" / "override" flow.
4. **`Step3AvailChip`** — `{ status: 'free' | 'maybe', label? }`. `'busy'`
   should never be passed here; use `Step3BusyBanner` instead.
5. **`CategoryBadge`** — accepts `{ label, tint? }`, NOT a category id. The
   parent resolves the id → label/color from `FRIEND_CATEGORIES`.
6. **`AdminInviteRow.resolveCategoryLabel?(id) => string`** /
   **`resolveCategoryTint?(id) => string | undefined`** — same pattern. The
   row keeps a `Friend` reference but the parent injects category resolvers.
7. **`AudiencePickerSheet`** — accepts both `friends?: Friend[]` and
   `types?: FriendType[]` regardless of `mode`; only the matching list is
   rendered. Parent owns the modal-sheet presentation context (overlay,
   dismiss-on-tap-outside, rubber-band) — this component just renders the
   visible body when `visible`. Adds `onDone` separate from `onClose` so the
   parent can distinguish confirm vs cancel.
8. **`SuggestionRow`** — accepts `{ authorName, upvotedByMe, ... }`. The
   `Suggestion` type carries `authorId` only; parent resolves the name and
   the per-user upvote-state from the upvotes array.
9. **`PollRow.myVote?: string | null`** — option id of the local user's
   vote, drives the highlight. Independent of the poll's `voters` array.
10. **`ConfirmCard`** receives a `Draft`, NOT an `Event` — Confirm renders
    before persistence. Date/time/glyph derived from draft fields.
11. **`MonthGrid`** — props match the spec exactly; parent owns the
    `dragging` flag so multiple grids (theoretical) stay coordinated. The
    component fires `setDay(iso)` for both tap-to-set and drag-paint enter;
    Hard Rule 14 (delete on clear) lives in the parent's `setDay` mapper.
12. **`DayView.onChoose?: (choice) => void`** — optional callback in addition
    to `setDay(iso)`, giving the parent the explicit brush choice without
    inferring it from current state. Useful for analytics + last-brush
    memory.
13. **`QuicksetGrid.onApply(q)`** — fires synchronously before the 1600ms
    "Applied" UI feedback. Parent's mutator runs in that same tick. The
    grid fires `medium` (apply) + `success` (confirmation) haptics; parent
    must NOT also fire on Quickset apply or it stacks.
14. **`BroadcastToast`** does NOT fire a haptic on its own (H-3: never on
    auto-fired inbound broadcasts). The parent fires `medium` once before
    showing the toast for outbound user-initiated broadcasts. `onDismiss`
    fires both for the auto-dismiss timer (3200ms) and the close button.
15. **`TwoTapDestructive`** auto-reverts to default after 3000ms with no
    second tap; commit is gated on a 600ms minimum since arm. Both
    behaviors are internal — parent only sees `onConfirm()` once.
16. **`FGTabBar`** — `value: 'home' | 'friends' | 'groups' | 'profile'`.
    Per the ANCHOR open question, the Profile tab should now route to
    Profile & Settings; the parent screen decides routing.
17. **`PlanningMode`** type is exported as `'casual' | 'planning'` from
    `social/PlanningModeToggle.tsx` — re-exported from the barrel.
18. **`FilterChip` interface** is the single source of truth for both
    `FilterChipRow` and `FilterChipRowMulti`. Re-exported from
    `eventFlow/FilterChipRow.tsx` (and the barrel).

---

## Toast Position — Canonical Constant

Both `BroadcastToast` and `ErrorToast` use `position: 'absolute'` with
`bottom: 24, left: 14, right: 14`. The constant lives ONCE in
`src/components/polish/ErrorToast.tsx` as
`export const TOAST_POSITION_DEFAULTS`. `BroadcastToast` re-exports the same
constant so callers can `import { TOAST_POSITION_DEFAULTS } from
'../../components'` from either side. Don't duplicate the values.

The Navigation agent's `TabBar.tsx` exports `TAB_BAR_HEIGHT = 83`. Screens
that need to dock a toast above the tab bar should compose:
`{ ...TOAST_POSITION_DEFAULTS, bottom: TAB_BAR_HEIGHT + 24 }`.

---

## Font Loading Dependency

The typography tokens reference family names `Manrope` (sans) and
`JetBrainsMono` (mono). The app shell (`App.tsx` / a font-loading layer)
MUST load these via `expo-font` BEFORE any component renders. Without the
fonts loaded:

- Mono overlines and handle text fall back to system mono → the 1.6 letter-
  spacing reads loose.
- Manrope weights 500/600/700/800 may collapse to whatever's available →
  visual hierarchy disappears.

This is also flagged in `THEME_HANDOFF.md` and `NAVIGATION_HANDOFF.md`. No
component change is required when fonts are loaded — they read families by
string name.

---

## Open Items — for Cross-Section Review

1. **`CoverArt`** renders a deterministic glyph composition (cover-id hash →
   color tier + initial). Hard Rule 3 forbids generic gradients. If the
   Director wants real bundled artwork, a sprite mapping or asset path
   resolution layer is the next step — owned by Design or a follow-up
   asset-bundling agent.
2. **`QRArt`** renders a QR-shaped tile from a payload hash, NOT a real QR
   encoder. The Screens agent may swap in a real encoder (e.g.
   `react-native-qrcode-svg`) without changing the component's prop
   surface — `{ payload, size }` would still suffice.
3. **`FormField`** has a pre-existing TS-level mismatch flagged in the
   Navigation handoff (RN 0.83 `BlurEvent`/`FocusEvent` vs the original
   handler types). `tsc --noEmit` is currently clean — no further action
   needed here unless RN bumps cause regression.
4. **MiniMap** is included but renders a token-tinted placeholder; if the
   Screens agent wants real Apple/Google static maps, that's a separate
   integration.

---

## Verification

- `npx tsc --noEmit` from `social-calendar-mobile/` returns 0 errors.
- The 2 pre-existing AvailDot import errors are resolved by
  `src/components/profile/AvailDot.tsx`.
- All icon-only buttons carry `accessibilityLabel`.
- All toasts carry `accessibilityLiveRegion` (polite for broadcast,
  assertive for error).
- `SettingsRow` renders `<View>` when `onPress` is undefined.
- `TwoTapDestructive` enforces ARM_MIN_MS = 600 / ARM_TIMEOUT_MS = 3000.
- Empty state anatomy: 56×56 tile, max-width 280, 32px outer padding,
  10–14px inter-row gap (12px applied).

---

## Suggested Next Agent

**Screens agent.** The component library + barrel are ready. Screens import
from `'../../components'`. The Mock Data Layer + API Stub Layer + Navigation
Setup are all complete, so Screens can begin immediately.

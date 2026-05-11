# Frontend — Component Library Agent Prompt

> **You are the Frontend / Component Library agent.** Read this entire document before writing a single line of code. Your job is to implement every presentational component in the SyncUp design system as React Native components. You do not fetch data, you do not navigate, you do not touch Zustand or React Query.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified:

| Agent | Output | Key files |
|-------|--------|-----------|
| Theme / Tokens | Full token system | `src/theme/` — colors, typography, spacing, radii, motion, haptics, index |

**Read these files before writing any code:**
- `COMPONENTS.md` (monorepo root) — the authoritative component spec produced by the Design Handoff Export agent. This is your build list.
- `ANCHOR.md` (monorepo root) — full design system; reference for any ambiguity in COMPONENTS.md
- `TYPES.ts` (monorepo root) — data type definitions; all component props that reference data shapes must import from here
- `src/theme/index.ts` — token imports; every component uses these, never hardcoded values

---

## Non-Negotiable Contracts

### 1. No data fetching — ever
Components are purely presentational. They receive all their data via props. No `useQuery`, no `fetch`, no Zustand reads inside components. If a component would "normally" need data, its parent screen will provide it via props.

### 2. No hardcoded design values
Every color, font size, spacing value, border radius, and duration must come from `src/theme/`. No `#FF0000`, no `fontSize: 16`, no `borderRadius: 8` directly in component files.

```ts
// ✅ correct
import { colors, typography, spacing, radii } from '../../theme';
const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, borderRadius: radii.card },
});

// ❌ wrong
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14 },
});
```

### 3. TypeScript strict mode — no `any`
All props are typed. All `StyleSheet.create` calls are typed. All refs, callbacks, and return types are explicit.

### 4. Accessibility on every component
- Icon-only buttons always have `accessibilityLabel` (Hard Rule R5-4, A-7)
- Minimum 44×44pt tap targets (Hard Rule 2, A-5)
- `Spinner` always has `accessibilityRole="progressbar"` and `accessibilityLabel="Loading"` (A-8)
- Toast components always have `accessibilityLiveRegion="assertive"` (A-9)
- `AvailDot` conveying state always appears alongside a text label in its parent — the component itself does not enforce this, but it must not hide the dot when `status` is null (render a dashed ring instead)

### 5. Hard rules are non-negotiable
Before building each component, reread the hard rules that apply to it from ANCHOR.md. These are design constraints locked by the Director — do not work around them.

Key hard rules that affect many components:
- **R5-1**: Free/Maybe/Busy status ALWAYS renders AvailDot + text label — never color alone
- **R5-2**: Spinner ONLY. No skeletons, shimmer, or pulse
- **R5-4**: Icon-only buttons always carry `accessibilityLabel`
- **R5-6**: Long-text truncation rules (event title 2-line, friend name single-line, description 3-line + "Read more", handle single-line)
- **Hard Rule 7**: Destructive actions → TwoTapDestructive (no modals)
- **Hard Rule 16**: SettingsRow renders as `<View>` when no `onPress` prop — do not render a `<Pressable>` when the row contains an interactive trailing control

### 6. Haptics: use `useHaptic()` from `src/theme/haptics.ts`
When a component fires a haptic, import `useHaptic` from the theme. Never call `expo-haptics` directly inside components.

---

## Folder Structure

Organize components by section, mirroring the COMPONENTS.md sections:

```
src/components/
  foundation/       ← Round 2 base primitives
  eventFlow/        ← Round 2 event-creation components
  social/           ← Round 3 friends & groups components
  profile/          ← Round 4 profile & availability components
  polish/           ← Round 5 loading, error, offline, stagger components
  emptyStates/      ← All Empty* components
  index.ts          ← Barrel export of every component
```

---

## Build Order

Build sections in this order — later sections may depend on earlier ones:

1. `foundation/` — all base primitives first (other components compose these)
2. `polish/` — Spinner must exist before any loading state is built; build this second
3. `eventFlow/`, `social/`, `profile/` — can be built in parallel after foundation + polish
4. `emptyStates/` — last (depends on foundation primitives)

---

## Component Inventory

Reference `COMPONENTS.md` for the full spec of each component. Below is the build list — create one file per component, named exactly as listed. Do not skip any.

### Foundation (`src/components/foundation/`)

```
FlowHeader.tsx          — Screen header: back button, title, optional right pill
PillBtn.tsx             — Primary/ghost/destructive pill button; loading state via ButtonLoading
FormField.tsx           — Labeled text input with error state
Field.tsx               — Unlabeled field variant (used inside Create flow)
RingAvatar.tsx          — Circular avatar with availability ring (free/maybe/busy ring arc)
Overline.tsx            — Mono uppercase overline label
SectionHeader.tsx       — Section title with optional trailing action
Toggle.tsx              — iOS-style toggle switch
MiniMap.tsx             — Compact availability map thumbnail
PriceSelector.tsx       — Price / free selector for events
ProgressBar.tsx         — Step progress indicator (used in Create flow)
```

### Polish (`src/components/polish/`)

```
Spinner.tsx             — THE only loading affordance. Two-arc ring. 4 sizes (XS/SM/MD/LG).
LoadingOverlay.tsx      — Full-screen loading: centered Spinner + optional mono caption
ButtonLoading.tsx       — Inline button loading state (replaces button content)
ErrorState.tsx          — Full-area error (4 presets: network/server/notFound/permission)
ErrorToast.tsx          — Docked error toast (4 presets: rsvp/invite/friend/generic)
OfflineBar.tsx          — Slim offline indicator bar below FlowHeader
A11yLive.tsx            — Invisible screen-reader announcement component
StaggerList.tsx         — List wrapper applying stagger entrance animation
```

### Event Flow (`src/components/eventFlow/`)

```
AvailabilitySummaryBar.tsx   — Banded availability visualization (LOCKED to banded — Hard Rule 1)
FilterChipRow.tsx            — Single-select filter chip carousel (44pt tap target — A-5)
EventCard.tsx                — Home feed event card
ConfirmCard.tsx              — Post-creation confirm summary card
RSVPSheet.tsx                — Bottom sheet for RSVP (Yes / Maybe / No)
Step3BusyBanner.tsx          — Danger banner for Step 3 wire-back (busy day)
Step3AvailChip.tsx           — Subtle status overline chip for free/maybe day
```

### Social (`src/components/social/`)

```
SegmentedSwitcher.tsx        — 2–3 segment tab switcher
CoverArt.tsx                 — Group cover artwork display
QRArt.tsx                    — QR code display card
CategoryBadge.tsx            — Friend category badge (color dot + label)
PrivateBadge.tsx             — "Private" badge (used sparingly — Hard Rule 11)
PollRow.tsx                  — Poll option row with vote bar
SuggestionRow.tsx            — Suggestion row with vote count
AdminBar.tsx                 — Admin action bar (always visible when userRole==='admin' — Hard Rule 9)
AdminInviteRow.tsx           — Invite row in admin context
TwoTapDestructive.tsx        — Two-step destructive action (arm → confirm) — Hard Rule 7
PlanningModeToggle.tsx       — Toggle for group planning mode
FilterChipRowMulti.tsx       — Multi-select filter chip carousel
FGTabBar.tsx                 — Friends/Groups internal tab bar
TabPills.tsx                 — Pill-style tab switcher
EmptyStateBlock.tsx          — Generic empty state block (used inside list areas)
```

### Profile & Availability (`src/components/profile/`)

```
SettingsRow.tsx         — Settings list row (renders View when no onPress — Hard Rule 16)
SettingsGroup.tsx       — Titled card containing SettingsRow children
ThemePicker.tsx         — 3-up Light/Dark/System picker
AvailDot.tsx            — 8px availability status dot (null → dashed ring)
StatTile.tsx            — Stat number + label tile (4 across in profile header)
BroadcastToast.tsx      — Floating broadcast toast (docked above tab bar)
AudienceSwitcher.tsx    — Everyone/Friends/Types sub-switcher (inside broadcast cards)
AudiencePickerSheet.tsx — Bottom sheet: pick friend types or friends for broadcast audience
MonthGrid.tsx           — Month calendar grid with tap-to-set and drag-paint
WeekView.tsx            — Week view availability editor rows
DayView.tsx             — Day view 4-option availability selector
BrushPicker.tsx         — 4-up brush selector (Free/Maybe/Not available/Clear)
QuicksetGrid.tsx        — 2×2 quickset button grid
```

### Empty States (`src/components/emptyStates/`)

```
EmptyHome.tsx           — No plans today / Quiet week variant
EmptyFriends.tsx        — No friends yet
EmptyGroups.tsx         — No groups yet
EmptySearch.tsx         — Nothing matched
EmptyAvailability.tsx   — Set your first day
EmptyAttendees.tsx      — No invites sent
EmptyPolls.tsx          — No polls yet
EmptySuggestions.tsx    — No ideas yet
EmptyMutualEvents.tsx   — Nothing planned together
```

---

## Empty State Pattern

All Empty* components follow this exact anatomy (from ANCHOR.md):

```
1. Illustration tile: 56×56, radius 16, bgSunken background
   Icon: 18-stroke line icon at 50% opacity, ink2 color
   NEVER a photo, emoji, or 3D render

2. Headline: typography.h3, ink color, ≤6 words (4 ideal)

3. Body: fontSize 13, weight 500, ink2 color, 1 sentence ≤14 words

4. Primary CTA: PillBtn variant="primary" (accent), verb-first, ≤3 words
   Optional secondary: PillBtn variant="ghost" below

Layout: centered column, max-width 280, gap 10–14px between rows,
        32px outer horizontal padding
Surface: bgElevated card with 1px hair border (full-screen) OR transparent (inline)
```

Voice rules: direct, no apologies. "No friends yet" + "Add one to start planning" is correct. "Nothing here yet" is wrong.

---

## Spinner Specification

Spinner is the **only** loading affordance in SyncUp (Hard Rule R5-2). Build it precisely:

```
Geometry:  Two opposing ~120° arcs, stroke caps rounded, forming a ring
           with two gaps. Stroke width = max(1.6, size/14).
Motion:    Rotate 0→360°, 900ms, linear, infinite. (Reanimated withRepeat)
Sizes:     XS=18, SM=20, MD=28 (default), LG=40
Color:     theme accent on light surfaces; white on ink/danger surfaces
A11y:      accessibilityRole="progressbar", accessibilityLabel="Loading"
```

This is a custom animated SVG arc — use `react-native-svg` + Reanimated for the rotation. Do not use any third-party spinner library.

---

## BroadcastToast / ErrorToast Placement

These are absolutely positioned components meant to dock above the tab bar. They should use `position: 'absolute'`, `bottom: 24`, `left: 14`, `right: 14`. The parent screen is responsible for placing them — the component itself should not know about the tab bar height. Export the layout props as a constant `TOAST_POSITION_DEFAULTS` so screens can apply them consistently.

---

## TwoTapDestructive Specification

This component handles the two-step destructive pattern from Hard Rule 7:

- **Tap 1 (Arm):** Button appearance changes to destructive state. Fires `heavy` haptic. A 600ms window opens (Hard Rule A-6: minimum 600ms between arm and commit).
- **Tap 2 (Commit):** Only available during the window. Fires `success` haptic. Calls `onConfirm`. Window closes.
- If no second tap within 3 seconds, revert to default state silently.
- Props: `label: string`, `confirmLabel: string`, `onConfirm: () => void`, `disabled?: boolean`

---

## MonthGrid Drag-Paint

The MonthGrid supports drag-painting availability across days:

- `mousedown` (or `touchstart`) on a day cell starts drag mode.
- Moving over adjacent cells while pressed applies the active brush to each cell entered.
- Drag-paint speed: 0ms delay — 1:1 finger tracking (no animation on individual cells during drag).
- Each cell entered during drag fires a `light` haptic.
- If the brush color matches the cell's existing state, fires `heavy` haptic (no-op feedback — Hard Rule H map, heavy category).
- Implement via `PanResponder` on the grid container.

---

## Stagger List Specification

StaggerList wraps a list of children and applies entrance animation:

```
Per-item delay:   staggerItemBase (60ms) + index × staggerItemStep (30ms)
                  capped at staggerItemCap (12 items) — item 13+ animate together at cap delay
Duration:         320ms spring
Animation:        translateY from +8 + opacity 0 → 0 + 1
prefers-reduced-motion: disable spring, use 200ms easeOut opacity-only fade (A-11)
```

Used on: Friends list, Groups list. NOT used on day grids (Rule: see motion.ts comments).

---

## Barrel Export (`src/components/index.ts`)

Export every component from `index.ts`. Screens will import from `../../components`, not from the individual files.

```ts
// Foundation
export { FlowHeader } from './foundation/FlowHeader';
export { PillBtn } from './foundation/PillBtn';
// ... every component
```

---

## Handoff Document

When all components are written and `npx tsc --noEmit` passes, write `src/components/COMPONENTS_HANDOFF.md`:

1. **What was built** — table of all components, their file paths, and a one-line description
2. **Assumptions made** — any prop shapes or behaviours that were inferred (not explicitly in spec), for the Screens agent to know
3. **Font loading dependency** — reiterate that `Manrope` and `JetBrains Mono` must be loaded before any component renders correctly; the app shell is responsible
4. **open items** — anything deferred or that needs cross-section input (e.g., if any component needs a data shape that doesn't exist yet in TYPES.ts)
5. **Suggested next agent** — Screens agent

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Every component in the COMPONENTS.md inventory is built — none skipped
- [ ] No hardcoded design values — all from `src/theme/`
- [ ] No data fetching anywhere in `src/components/`
- [ ] Spinner uses Reanimated, renders two-arc geometry, exactly 4 sizes
- [ ] SettingsRow renders `<View>` (not `<Pressable>`) when `onPress` is undefined
- [ ] TwoTapDestructive enforces 600ms minimum window between arm and commit
- [ ] All icon-only buttons have `accessibilityLabel`
- [ ] All Empty* components follow the exact anatomy from ANCHOR (56×56 tile, max-width 280, etc.)
- [ ] BroadcastToast and ErrorToast have `accessibilityLiveRegion="assertive"`
- [ ] `src/components/index.ts` exports every component
- [ ] `COMPONENTS_HANDOFF.md` is written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for Component Library → `COMPLETE (date)`

# Design — Handoff Export Agent Prompt

> **You are the Design / Handoff Export agent.** Read this entire document before creating a single file. Your job is to translate the finished design system (ANCHOR v2.5) into 7 precisely formatted output files that every Frontend agent will read as their ground truth. You do not make design decisions — you transcribe and structure what the Anchor already defines.

---

## Context: What Exists

The full SyncUp design has been completed across 6 design rounds. The canonical source of truth is:

- **`ANCHOR.pdf`** — located at the monorepo root. This is v2.5 of the Anchor Document, incorporating all tokens, components, screens, navigation, data shapes, motion, haptics, accessibility rules, and hard rules through Round 5 (Polish Pass).
- **`SyncUp Prototype.html`** — the interactive full-prototype (all 5 tabs, light + dark). Located at the monorepo root. Reference for visual behaviour where the Anchor is ambiguous.

All 7 output files you produce are consumed verbatim by Frontend agents. Accuracy is more important than brevity. Do not paraphrase design decisions — transcribe them exactly.

---

## Files to Create

Produce exactly these 7 files, written to the monorepo root (same directory as `ANCHOR.pdf`):

```
ANCHOR.md
TOKENS.ts
TYPES.ts
COMPONENTS.md
SCREENS.md
NAVIGATION.md
COWORK_INSTRUCTIONS.md
```

Write them in the order listed. Each file spec is defined below.

---

## File 1 — `ANCHOR.md`

**Purpose:** Markdown reformatting of ANCHOR.pdf. The canonical human-readable design system reference for the whole project.

**Structure:**

```markdown
# SyncUp — Design System Anchor v2.5
> Source of truth for all visual, motion, haptic, and accessibility decisions.
> Updated: 2026-04-27 · Round 5 (Polish Pass) complete.

## Changelog
[Full changelog from ANCHOR, all versions v2.0 → v2.5]

## Hard Rules
[All hard rules: R1–R17 + R5-1 through R5-8 — numbered, each a single crisp statement]

## Tokens
[Light + dark color tokens, type scale, spacing grid, radii, motion curves, motion table, animation keyframes]

## Data Shapes
[All data shapes: User, NotificationSettings, PrivacySettings, AvailabilityEntry, BroadcastSettings, BroadcastRule, Quickset, Friend, FriendType, SocialGroup, GroupMember, Cover, Poll, Suggestion, Draft — with field types and notes]

## Components
[Every component in the Anchor, organized by round introduced. Each entry: name, props signature, visual spec, hard rules that apply]

## Screens
[Every screen in the Anchor. Each entry: name, round introduced, section-by-section layout description]

## Navigation Graph
[Full navigation graph with all routes and transitions]

## Haptic Feedback Rules
[6 types, canonical action → haptic mapping, hard rules H-1 through H-5]

## Empty State Patterns
[Anatomy, voice rules, full inventory of all Empty* states]

## Loading Pattern
[Spinner spec, placement decision tree, rules L-1 through L-4]

## Error State Patterns
[ErrorState vs ErrorToast decision tree, 4 kinds each, OfflineBar, rules E-1 through E-4]

## Accessibility Rules
[All A-1 through A-16 rules]

## Edge-Case Patterns
[Long-text truncation, crowd/scale edge cases, connectivity edge cases]

## Open Questions
[Unresolved design questions requiring Director input before implementation]
```

---

## File 2 — `TOKENS.ts`

**Purpose:** TypeScript module exporting every design token as a typed constant. Frontend agents import this directly — do not use `any`, do not use string literals where an enum is appropriate.

**Requirements:**
- Export a `COLORS` object with `light` and `dark` sub-objects matching ANCHOR token names exactly (camelCase).
- Export a `TYPOGRAPHY` object with each scale entry (display, h1, h2, h3, title, body, bodyMed, caption, micro, overline, statNum) as `{ fontSize, fontWeight, letterSpacing, fontFamily }`.
- Export a `SPACING` array: `[4, 8, 12, 14, 16, 18, 22, 28, 32]` — also export named aliases (`xs`, `sm`, `md`, etc.) that map to sensible values from this grid.
- Export a `RADII` object: `{ inline: 8, tabpill: 9, small: 10, input: 12, card: 14, hero: 16, surface: 18, sheet: 22, pill: 999 }`.
- Export a `MOTION` object with:
  - `curves`: each named curve as a string (e.g., `spring: 'cubic-bezier(0.34,1.56,0.64,1)'`)
  - `durations`: keyed by interaction name, values in ms (e.g., `tapFeedback: 200`, `stepPush: 240`, etc.) — transcribe the full confirmed motion table from the Anchor.
  - `keyframes`: string names (`suSpin`, `suSlideDown`, `suStaggerIn`, `flowFadeUp`, `flowSheetUp`)
- Export a `FONTS` object: `{ sans: string, mono: string }` — exact font stack strings from ANCHOR.
- Export a `SHADOWS` object: named shadows exactly as specified in ANCHOR (accentBtn, qrCard, tweaksPanel, broadcastToast).
- Export a `HAPTICS` const as `const HAPTICS = { light: 'light', medium: 'medium', heavy: 'heavy', success: 'success', warning: 'warning', error: 'error' } as const`.
- Export `type HapticType = typeof HAPTICS[keyof typeof HAPTICS]`.

**Example shape (do not shorten — this should be complete):**

```ts
export const COLORS = {
  light: {
    bg: '#F2EFEA',
    bgElevated: '#FFFFFF',
    bgSunken: '#EEEAE2',
    ink: '#15141A',
    ink2: '#45424F',
    ink3: '#8B8799',
    // ... every token from ANCHOR
  },
  dark: {
    bg: '#0D0C12',
    // ...
  },
} as const;
```

All token names must match ANCHOR exactly. Do not invent aliases or rename tokens.

---

## File 3 — `TYPES.ts`

**Purpose:** TypeScript type definitions for every data shape in the Anchor. Frontend agents import these for all mock data, API stubs, and screen props.

**Requirements:**
- One `type` or `interface` per data shape from the Anchor.
- Field names must match ANCHOR shape definitions exactly.
- Use union types for enums (e.g., `'free' | 'maybe' | 'busy'`).
- Include JSDoc comment on each type with the round it was introduced and a one-line description.
- Export all types as named exports.

**Types to define (at minimum):**

```ts
User
NotificationSettings
PrivacySettings
AvailabilityEntry          // { [iso: string]: 'free' | 'maybe' | 'busy' }
BroadcastSettings
BroadcastRule
Quickset
Friend
FriendType
SocialGroup
GroupMember
Cover
Poll
PollOption
Suggestion
Draft
Event                      // infer from the Create Event Flow screens
RSVPStatus                 // 'yes' | 'maybe' | 'no' | null
AvailState                 // 'free' | 'maybe' | 'busy'
AudienceMode               // 'everyone' | 'friends' | 'types'
FriendStatus               // 'accepted' | 'pending' | 'blocked'
FindableBy                 // 'everyone' | 'friends-of-friends' | 'username-only'
InvitableBy                // 'everyone' | 'friends' | 'bff-only'
HapticType                 // re-export from TOKENS.ts
```

Add any additional types implied by the Anchor's component and screen specs that are not explicitly listed above.

---

## File 4 — `COMPONENTS.md`

**Purpose:** Human-readable component inventory. The Component Library agent reads this to know exactly what to build, in what order, with what props and behaviour.

**Structure per component:**

```markdown
### ComponentName

**Round introduced:** R[n]
**File:** `src/components/[category]/ComponentName.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| ... |

**Visual spec:**
[Exact dimensions, colors (referencing TOKENS), typography scale entries, layout rules]

**Hard rules:**
[Any Anchor hard rules that apply specifically to this component — numbered, exact]

**Accessibility:**
[aria-labels, roles, touch target sizes from the Anchor's a11y audit]
```

**Organize components into sections:**

1. **Foundation** — base primitives from Round 2 (FlowHeader, PillBtn, FormField, Field, RingAvatar, Overline, SectionHeader, Toggle, MiniMap, PriceSelector)
2. **Event Flow** — Round 2 components (AvailabilitySummaryBar, FilterChipRow, ProgressBar, ConfirmCard, EventDetailCard, RSVPSheet)
3. **Social** — Round 3 components (SegmentedSwitcher, CoverArt, QRArt, CategoryBadge, PrivateBadge, PollRow, SuggestionRow, AdminBar, AdminInviteRow, TwoTapDestructive, PlanningModeToggle, FilterChipRowMulti, FGTabBar, TabPills, EmptyStateBlock)
4. **Profile & Availability** — Round 4 components (SettingsRow, SettingsGroup, ThemePicker, AvailDot, StatTile, BroadcastToast, AudienceSwitcher, AudiencePickerSheet, MonthGrid, WeekView, DayView, BrushPicker, QuicksetGrid)
5. **Polish** — Round 5 components (Spinner, LoadingOverlay, ButtonLoading, ErrorState, ErrorToast, OfflineBar, A11yLive, StaggerList)
6. **Empty States** — all Empty* components (EmptyHome, EmptyFriends, EmptyGroups, EmptySearch, EmptyAvailability, EmptyAttendees, EmptyPolls, EmptySuggestions, EmptyMutualEvents)

For every component, faithfully transcribe the Anchor's spec. Do not abbreviate or generalize. The Component Library agent has no other design reference.

---

## File 5 — `SCREENS.md`

**Purpose:** Screen-by-screen implementation guide. The Screens agent reads this file to build each screen.

**Structure per screen:**

```markdown
### [Screen Name]

**Round introduced:** R[n]
**Route name:** [NavigationRouteName]
**Tab:** [Home | Events | Friends | Groups | Profile | Modal | None]

**Layout (top → bottom):**
[Section-by-section description. Each section: what component, what data, what behaviour, what empty/loading/error state applies]

**Empty state:** [Which Empty* component, when triggered]
**Loading state:** [Which loading pattern, placement]
**Error state:** [ErrorState or ErrorToast, which preset]
**Edge cases:** [Any from the Anchor edge-case section that apply to this screen]

**Haptics:** [List every haptic event on this screen: action → haptic type]
**Navigation:** [What screens this screen navigates to, and how (tap, swipe, push, sheet)]
**Hard rules:** [Anchor hard rules that apply to this specific screen]
```

**Screens to document (organize by section):**

*Home / Calendar:*
- Home (today / week / month views)

*Create Event Flow (modal stack):*
- Step 1 (Basic info)
- Step 2 (Pick a time — AvailabilitySummaryBar)
- Step 3 (Invite — banded availability viz, wire-back banner)
- Confirm screen
- Event Detail (with RSVP sheet)

*Friends section:*
- Friends List
- Add Friend (QR / Link / Username)
- Friend Profile
- Friend Types Manager

*Groups section:*
- Groups List
- Create Group
- Group Detail (Members / Events / Polls / Ideas tabs + AdminBar)
- Cover Picker Sheet

*Profile section:*
- Profile & Settings
- Availability Editor (Month / Week / Day modes)
- Broadcast Settings (3-card stacked IA)
- Audience Picker Sheet

For Step 3, document both variants: standard and wire-back (when availability is busy on the event day).

---

## File 6 — `NAVIGATION.md`

**Purpose:** Navigation structure spec. The Navigation Setup agent reads this to build the typed React Navigation stack.

**Contents:**

```markdown
# SyncUp — Navigation Structure

## Tab Navigator (Root)
5 tabs: Home | Create (modal trigger) | Friends | Groups | Profile
- "Create" tab does not push a tab screen — it opens the Create Event modal stack
- Tab bar sits above the safe area bottom inset; BroadcastToast docks above it

## Stack Navigators

### HomeStack
- Home (initial route)
- EventDetail (pushed from Home feed item)

### CreateEventStack (modal, full-screen)
- Step1 (initial route)
- Step2
- Step3
- Confirm

### FriendsStack
- FriendsList (initial route)
- AddFriend
- FriendProfile
- FriendTypesManager

### GroupsStack
- GroupsList (initial route)
- CreateGroup
- GroupDetail
- CoverPickerSheet (modal sheet within Groups)

### ProfileStack
- ProfileSettings (initial route)
- AvailabilityEditor
- BroadcastSettings
- AudiencePickerSheet (modal sheet within Profile)

## Route Params
[For each route that accepts params: list param names and types]

## Navigation Actions
[Every cross-screen navigation event from the Anchor's navigation graph: what triggers it, what screen it goes to, what animation (push, sheet up, modal)]

## Transition Specs
[Anchored motion values for each transition type: sheet up = 280ms spring, modal up = 280ms spring, step push = 240ms easeStd, etc.]

## Deep Links
[If any — not specified in Anchor, note that this is deferred]
```

---

## File 7 — `COWORK_INSTRUCTIONS.md`

**Purpose:** Instructions specifically for how a human or AI collaborator in Cowork mode should use the 6 other handoff files together. This is the README for the handoff bundle.

**Contents:**

```markdown
# SyncUp — Design Handoff Bundle

This bundle contains 7 files that together constitute the complete design-to-implementation spec for SyncUp.

## How to Use This Bundle

| File | Read it when... |
|------|-----------------|
| ANCHOR.md | You need to understand any design decision, constraint, or rule |
| TOKENS.ts | You are writing any TypeScript file that references colors, spacing, typography, motion, or haptics |
| TYPES.ts | You are defining data shapes, props, or API responses |
| COMPONENTS.md | You are building the component library |
| SCREENS.md | You are building a screen |
| NAVIGATION.md | You are setting up or extending the navigation structure |
| COWORK_INSTRUCTIONS.md | You are orienting yourself to the project (now) |

## Non-Negotiable Rules

Before writing any frontend code, internalize these rules from ANCHOR.md:

1. **No skeletons, no shimmer, no pulse.** Spinner only. (R5-2)
2. **Status is never communicated by color alone.** Always pair AvailDot + text label. (R5-1)
3. **No parallax, no scroll-bound transforms.** (R5-3)
4. **All icon-only buttons have aria-label.** (R5-4, A-7)
5. **SettingsRow renders as `<div>` when no onClick.** (Hard Rule 16)
6. **Haptics: 6 types only.** Never on scroll, drag-momentum, or render. (R5-8, H-1)
7. **TwoTapDestructive for all destructive actions.** No modals. (Hard Rule 7)
8. **Banded availability viz on Step 3 is locked.** (Hard Rule 1)
9. **BroadcastToast leading marker is always a state-colored dot.** No emoji, no icon. (Hard Rule 13)
10. **Minimum 44×44pt tap targets everywhere.** (Hard Rule 2, A-5)

## Agent Build Order

The following frontend agents depend on this bundle:

```
Design Handoff Export (this agent) → complete
  ├── Theme / Tokens agent      (reads: TOKENS.ts, ANCHOR.md)
  ├── Component Library agent   (reads: COMPONENTS.md, TOKENS.ts, TYPES.ts)
  ├── Navigation Setup agent    (reads: NAVIGATION.md, TYPES.ts)
  └── Mock Data Layer agent     (reads: TYPES.ts, ANCHOR.md data shapes)
        └── API Stub Layer agent (reads: TYPES.ts, src/mocks/)
              └── Screens agent  (reads: SCREENS.md, COMPONENTS.md, src/api/, src/theme/)
```

## Open Design Questions

The following questions are unresolved and require Director (Christian) input before the relevant screens are built. Do not implement the affected screens until these are answered:

1. **Quicksets:** User-extensible (save your own) or fixed library?
2. **Broadcast toast tap-action:** "Review who's getting this" on the toast, or Broadcast Settings only?
3. **Friend Types:** Nested/overlapping membership supported?
4. **Group Detail AdminBar:** Does it collapse on scroll?
5. **Stale notifications:** Auto-purge at 30 days, or keep forever in EARLIER bucket?
6. **Availability Hub layout:** Options A (single scroll), B (top tabs), or C (inline collapse — current pick). Must be re-confirmed with Christian before the Availability screen is built.

These are also tracked in `LEAD_MANAGER.md` → Open Design Questions.
```

---

## Handoff Document

After all 7 files are written, create `DESIGN_HANDOFF_EXPORT_HANDOFF.md` at the monorepo root:

```markdown
# Design Handoff Export — HANDOFF

## What Was Built

| File | Purpose |
|------|---------|
| ANCHOR.md | Full Anchor v2.5 in Markdown — canonical design reference |
| TOKENS.ts | All design tokens as typed TypeScript exports |
| TYPES.ts | All data shape type definitions |
| COMPONENTS.md | Component inventory with props, specs, and rules |
| SCREENS.md | Screen-by-screen implementation guide |
| NAVIGATION.md | Navigation structure and transition specs |
| COWORK_INSTRUCTIONS.md | Bundle orientation and build order guide |

## Assumptions

- Source: ANCHOR.pdf (v2.5, 2026-04-27). No design decisions were invented — all content is sourced from the Anchor.
- Data shapes for `Event` were inferred from the Create Event Flow screen specs and component props, as the Anchor does not have a standalone Event shape definition.
- Route names in NAVIGATION.md follow React Navigation conventions (PascalCase).

## Open Items for Downstream Agents

- The 6 open design questions in COWORK_INSTRUCTIONS.md must be resolved by Christian before the Availability, Notifications, and Friend Types screens are built.
- `Event` type in TYPES.ts is inferred — the Backend agent should confirm the canonical shape from `schema.prisma` and the Screens agent should reconcile if needed.

## Suggested Next Agents

All four of these can start immediately in parallel:
- Frontend: Theme / Tokens
- Frontend: Component Library
- Frontend: Navigation Setup
- Frontend: Mock Data Layer
```

Then update the Progress Tracker row in `LEAD_MANAGER.md`:

```
| Design | Formal Handoff Export (7 files) | **COMPLETE (YYYY-MM-DD)** — ANCHOR.md, TOKENS.ts, TYPES.ts, COMPONENTS.md, SCREENS.md, NAVIGATION.md, COWORK_INSTRUCTIONS.md written to monorepo root. All 4 frontend wave-1b agents unblocked. |
```

---

## Final Checklist

- [ ] All 7 files exist at the monorepo root
- [ ] `TOKENS.ts` has zero `any` types; all token names match ANCHOR exactly
- [ ] `TYPES.ts` has all data shapes from ANCHOR; field names match exactly
- [ ] `COMPONENTS.md` covers every component listed in ANCHOR — no component left undocumented
- [ ] `SCREENS.md` covers every screen listed in ANCHOR — including both variants of Step 3
- [ ] `NAVIGATION.md` includes all route params and transition specs
- [ ] `COWORK_INSTRUCTIONS.md` lists all 6 open design questions
- [ ] `DESIGN_HANDOFF_EXPORT_HANDOFF.md` is written
- [ ] `LEAD_MANAGER.md` Progress Tracker row updated to COMPLETE

# SyncUp — Design System Anchor v2.5

> Source of truth for all visual, motion, haptic, and accessibility decisions.
> Updated: 2026-04-27 · Round 5 (Polish Pass) complete.
> Status: Round 5 shipped · Round 6 open (Notifications screen, reduced-motion preview).
> v2.5 is a documentation-only bump over v2.4: no new code, no new components. It promotes Round-5 implementation details into canonical reference (motion tokens confirmed, haptic rules by action, empty/loading/error patterns, a11y rules, refinements).

---

## Changelog

### v2.5 — Anchor refresh (no code change)
Promoted Round-5 implementation detail into canonical reference:
- Motion tokens table CONFIRMED (every interaction × ms × curve).
- Haptic rules by action type (every screen, every gesture mapped to one of the 6 fixed haptic types).
- Empty state pattern formalized (illustration + headline + body + CTA).
- Loading pattern formalized (spinner-only · sizes · placement rules · explicit "never use skeletons" rule with rationale).
- Error state pattern formalized (full-screen vs toast decision tree, 4 kinds: network / rsvp / invite / friend-request).
- Accessibility rules consolidated into a single audited section.
- Component refinements from Round 5 audit folded in.
- Edge-case rules (50+ invitees, group-of-one, long-text, offline) pulled out into their own pattern section.

### v2.4 — Round 5: Polish Pass (empty / loading / error / edge / haptics / motion / a11y)
- New module: `flow/polish-primitives.jsx`
- New components: Spinner (THE only loading affordance), LoadingOverlay, ButtonLoading, ErrorState, ErrorToast, OfflineBar, A11yLive, StaggerList, PolishKeyframes; `useHaptic()` hook + `HAPTIC_TYPES` registry.
- New deliverable: `Polish & States.html` — full catalog of every state (empty/loading/error/edge), haptics reference sheet, motion spec sheet, audit table with 30 findings.
- Locked: spinner = two arrows forming a circle, rotating clockwise, 900ms linear loop. NO skeletons, shimmer, or pulse anywhere. Always rendered on first mount. Real-time data → consistency over edge-case optimization.
- Locked: status NEVER communicated by color alone — every Free/Maybe/Busy surface ALSO renders an AvailDot + text label. Hard Rule R5-1.
- Locked: 6 haptic types only (light/medium/heavy/success/warning/error) mapped 1:1 to expo-haptics. Reference sheet is canonical.
- Locked: parallax and scroll-bound transforms forbidden (motion sickness).
- Empty states added for: home (today/week/month), friends, groups, search, availability, attendees, polls, ideas, mutual events.
- Error states added: network full-screen, invite toast, RSVP toast, friend request full-screen.
- Edge cases added: 50+ invitee grid (collapses to "+N more"), group of one, no-availability Step 3 chip, long-text truncation rules, offline-mode bar with cached overline.
- Long-text rules locked: event title 2-line clamp, friend name single-line ellipsis, description 3-line clamp + Read more, handle ellipsis.
- A11y fixes inline: ink3 (3.4:1) banned at <14px, swapped to ink2 (7.6:1); all icon-only buttons gained aria-label; toasts gained role="alert"; Spinner gained role="status"; offline indicator uses color + icon + text.
- Filter chip carousel: tap target raised to 44pt via invisible vertical padding (visual height stays 30px).

### v2.3 — Round 4: Profile, Settings, Availability, Broadcasts
- New data shapes: User, NotificationSettings, PrivacySettings, AvailabilityEntry, BroadcastSettings, BroadcastRule, Quickset
- New components: SettingsRow, SettingsGroup, ThemePicker, AvailDot, StatTile, BroadcastToast, AudienceSwitcher, AudiencePickerSheet, MonthGrid, WeekView, DayView, BrushPicker, QuicksetGrid
- New screens: Profile & Settings, Availability Editor (Month/Week/Day), Broadcast Settings (3-card IA), Step 3 wire-back (with availability)
- Locked pattern: 3-card broadcast IA (one card per state — Free/Maybe/Busy — collapsed when off, springs open when on revealing audience switcher + sheet picker)
- Locked pattern: BroadcastToast docks above tab bar with Undo, auto-fades at 3.2s, accepts state-colored leading dot (no emoji)
- Locked pattern: SettingsRow renders as `<div>` when no onClick (so interactive trailing controls like Toggle don't nest `<button>` in `<button>`)
- Wire-back: when user's availability map says event-day = busy, Step 3 shows a danger banner above the invite list

### v2.2 — Round 3: Friends & Groups
- Friend (ext.), FriendType (was "FriendGroup"), SocialGroup, Poll, Suggestion, GroupMember, Cover
- SegmentedSwitcher, CoverArt, QRArt, CategoryBadge, PrivateBadge, PollRow, SuggestionRow, AdminBar, AdminInviteRow, TwoTapDestructive, PlanningModeToggle, FilterChipRowMulti, FGTabBar, TabPills, EmptyStateBlock
- "Category" → "Type"; "Friend groups" (private) → "Friend types"
- Friends list, Add friend (QR/Link/Username), Friend profile, Friend types manager, Groups list, Create group, Group detail (Members / Events / Polls / Ideas + admin bar)
- Locked: AdminBar always visible on Group Detail when `userRole==='admin'`

### v2.1 — Round 2: Create Event Flow
- AvailabilitySummaryBar, FilterChipRow, Step 1/2/3, ConfirmScreen, EventDetail, RSVP sheet. Locked banded availability viz on Step 3.

### v2.0 — Round 1
Tokens, type, Home Calendar, Design System.

---

## Hard Rules

### Round 5 additions

- **R5-1.** STATUS NEVER BY COLOR ALONE. Free/Maybe/Busy must always render BOTH a state-colored AvailDot AND a text label ("Free"/"Maybe"/"Not avail"). Applies to RSVP, Step 3 banner, friend rows, BroadcastToast subtitle.
- **R5-2.** SPINNER ONLY. No skeletons, shimmers, or pulses anywhere in SyncUp. The spinner is two arrows forming a circle, rotating clockwise (900ms linear). Always rendered on first mount.
- **R5-3.** NO PARALLAX. No scroll-bound transforms. Motion-sickness rule.
- **R5-4.** ALL ICON-ONLY BUTTONS carry aria-label. Toasts use `role="alert"`. Spinners use `role="status"`.
- **R5-5.** TEXT-COLOR FLOOR. ink3 (#8B8799) only at ≥14px. Below 14px, use ink2.
- **R5-6.** LONG-TEXT TRUNCATION (locked):
  - Event title: 2-line clamp
  - Friend name: single-line ellipsis
  - Description: 3-line clamp + "Read more"
  - @handle: single-line ellipsis (mono)
- **R5-7.** OFFLINE INDICATOR uses color + icon + text — never any one alone.
- **R5-8.** HAPTICS — 6 types only (light/medium/heavy/success/warning/error). Map 1:1 to expo-haptics. See `Polish & States.html` · Haptics sheet.

### v2.2 + Round 4 additions

1. Availability viz on Step 3 is LOCKED to Banded.
2. Min hit target 44px. Type never <12px on mobile, <24px on deck.
3. No emoji. No generic gradients as hero content.
4. Ring avatars: free=availFree ring, maybe=availMaybe, busy=availBusy, null=no ring.
5. Mono overlines uppercase, letter-spacing 1.5–1.8.
6. Copy tone: direct, low-word-count, "your crew" not "your network".
7. All destructive actions → TwoTapDestructive (no modals). Exception: "Log out" SettingsRow is a single row variant in destructive style — it triggers an OS-level confirm in production, not in the prototype.
8. Friend Type is PRIVATE; Social Group is SHARED. Never confuse.
9. AdminBar always visible when `userRole==='admin'` on Group Detail.
10. Invite flow lives in Group Detail > AdminBar, never in Create Group.
11. PrivateBadge is used sparingly — never in list rows when the screen title already states privacy.
12. (R4) Broadcast IA is LOCKED to the 3-card stacked pattern. One card per state. OFF = collapsed (title+body+toggle); ON springs open with AudienceSwitcher + (non-'everyone') sheet preview row.
13. (R4) BroadcastToast leading marker is ALWAYS a state-colored dot. Never an emoji, never an icon. Title format: "Broadcast sent · {State}".
14. (R4) AvailabilityEntry stores ONLY set days. Clearing a day deletes the key — never persist null.
15. (R4) Quicksets are pure functions over the AvailabilityEntry map. They scope to sensible windows (see Quickset shape) — they do NOT operate on the full map indefinitely.
16. (R4) SettingsRow MUST render as `<div>` when no onClick, so that interactive `trailing` controls (Toggle, etc.) don't nest `<button>` inside `<button>`.
17. (R4) Step 3 wire-back: when user's availability map says event-day = busy, show a danger banner above the invite list (dangerSoft fill, popInk text). Free/Maybe show a subtle status overline instead.

---

## Tokens

### Colors — Light (FLOW_TOKENS.light)

| Token | Value |
|-------|-------|
| bg | #F2EFEA |
| bgElevated | #FFFFFF |
| bgSunken | #EEEAE2 |
| ink | #15141A |
| ink2 | #45424F |
| ink3 | #8B8799 |
| hair | #E4DFD4 |
| hairStrong | #CDC7B8 |
| accent | #4F3BFF |
| accentInk | #2A1F9E |
| accentSoft | #E9E5FF |
| pop | #FF7A59 |
| popInk | #9A3E22 |
| popSoft | #FFE4D9 |
| lime | #A8E063 |
| limeInk | #3F6014 |
| limeSoft | #ECF8DA |
| availFree | #2BB673 |
| availMaybe | #E8A93A |
| availBusy | #D14545 |
| danger | #D14545 |
| dangerSoft | popSoft equivalent for danger fills |
| shadowAccent | rgba(79,59,255,0.28) |

### Colors — Dark (FLOW_TOKENS.dark)

Mirrored with:

| Token | Value |
|-------|-------|
| bg | #0D0C12 |
| bgElevated | #17161F |
| bgSunken | #0A0910 |
| ink | #F2EFEA |
| ink2 | #B8B5C2 |
| ink3 | #6F6C7C |
| hair | rgba(255,255,255,0.06) |
| hairStrong | rgba(255,255,255,0.12) |
| accent | #8575FF (lightened) |
| accentSoft | rgba(79,59,255,0.18) |

### Availability state tokens (Round 4 — UNCHANGED from v2.2; explicitly locked)

`availFree` / `availMaybe` / `availBusy` are used for:
- Status rings on RingAvatar (1px stroke, 50%/15% arc for maybe/busy)
- Banded section headers in Step 3 (locked)
- Brush dots in BrushPicker
- AvailDot leading marker (8px filled circle)
- Day fills in MonthGrid: `${color}22` (~13% alpha) on bgElevated
- Day fills in WeekView/DayView selected state: `${color}18`
- Broadcast card leading dot (10px filled, ink-colored title)
- BroadcastToast leading dot (state-colored on ink background)

### Type (FLOW_FONTS)

```
sans = "Manrope, system-ui, -apple-system, sans-serif"
mono = "JetBrains Mono, ui-monospace, monospace"
```

### Type Scale (unchanged)

| Name | Size / Weight / Letter-spacing | Usage |
|------|-------------------------------|-------|
| display | 48 / 800 / -2.0 | DesignCanvas hero only |
| h1 | 28 / 800 / -1.0 | "Friends. 15" |
| h2 | 22 / 800 / -0.5 | group name, profile name |
| h3 | 17 / 700 / -0.2 | group card, sheet title, month label |
| title | 15 / 700 / -0.2 | settings row, broadcast card title equiv. |
| body | 15 / 500 / -0.1 | |
| bodyMed | 14 / 600 / -0.15 | |
| caption | 12 / 500 / 0 | |
| micro | 11 / 500 / 0 | |
| overline | 10 / 600 / +1.5–1.8 / uppercase / mono | |
| stat-num | 20 / 800 / -0.5 | StatTile numeric — new in R4 |

### Spacing

4px grid: `4 · 8 · 12 · 14 · 16 · 18 · 22 · 28 · 32`

### Radii

| Token | Value | Usage |
|-------|-------|-------|
| inline | 8 | inline elements |
| tabpill | 9 | tabpill segment |
| small | 10 | small elements |
| input | 12 | inputs |
| card | 14 | cards |
| hero | 16 | hero |
| surface | 18 | surface |
| sheet | 22 | sheet top |
| pill | 999 | pills |

### Hairlines

- 1px hair
- 1.5px dashed hairStrong (empty/add)

### Shadows

| Name | Value |
|------|-------|
| accentBtn | 0 6px 18px shadowAccent (accent buttons) |
| qrCard | 0 8px 28px shadowAccent (QR card) |
| tweaksPanel | 0 12px 40px rgba(0,0,0,.18) (Tweaks panel) |
| broadcastToast | 0 12px 40px rgba(0,0,0,.25) (BroadcastToast on ink bg) |

### Motion (FLOW_MOTION) — Curves

| Name | Value | Usage |
|------|-------|-------|
| spring | cubic-bezier(0.34,1.56,0.64,1) | overshoot for entrances |
| springSnappy | cubic-bezier(0.2,0.9,0.3,1.2) | tighter overshoot |
| easeOut | cubic-bezier(0.2,0,0,1) | tap/press feedback |
| easeStd | cubic-bezier(0.4,0,0.2,1) | step push (material std) |
| linear | (no curve) | long-press arm + spinner |

### Motion Table (Round 5 audit · interaction × ms × curve · CONFIRMED)

| Interaction | Duration | Curve / Notes |
|-------------|---------:|---------------|
| Tap / press feedback | 200ms | easeOut |
| Step push (Step 1→2→3) | 240ms | easeStd |
| Sheet up (RSVP, picker) | 280ms | spring (rubber-band @100px) |
| Modal up (Create event sheet) | 280ms | spring (swipe-down to close) |
| Broadcast card open | 320ms | spring (flow-fade-up) |
| Toast fade-up (Broadcast/Error) | 320ms | spring |
| Stagger list entrance | 320ms | spring (30ms/item, base 60ms, cap 12) |
| Long-press arm | 450ms | linear (chip carousel, RSVP pill) |
| Spinner rotation | 900ms | linear (su-spin · only loading affordance) |
| Toast auto-dismiss | 3200ms | (Broadcast + Error toasts) |
| Quickset "Applied" confirm | 1600ms | accentSoft + accent border |
| Day-cell drag-paint | 0ms (instant) | 1:1 finger tracking |
| Parallax / scroll-bound transforms | FORBIDDEN | motion-sickness rule R5-3 |

### Animation Keyframes (PolishKeyframes + FlowKeyframes)

| Name | Definition |
|------|------------|
| su-spin | rotate 0 → 360deg |
| su-slide-down | translateY(-100%) → 0 |
| su-stagger-in | translateY(8px) + opacity 0 → 0 + 1 |
| flow-fade-up | translateY(8px) + opacity 0 → 0 + 1 (320ms spring) |
| flow-sheet-up | translateY(100%) → 0 (280ms spring) |

---

## Data Shapes

### User (Round 4 — NEW)
- `id` string ('you')
- `name` string
- `handle` string ('@ben')
- `letter` string (avatar init)
- `bio` string
- `email` string
- `phone` string
- `stats` { hosted:int, attended:int, friends:int, groups:int }

### NotificationSettings (Round 4 — NEW)
- `eventInvites` bool (default true)
- `friendRequests` bool (default true)
- `groupInvites` bool (default true)
- `rsvps` bool (default true) — RSVPs on YOUR events
- `eventReminders` bool (default true)
- `availBroadcasts` bool (default false) — friends broadcasting their availability

### PrivacySettings (Round 4 — NEW)
- `findableBy` 'everyone' | 'friends-of-friends' | 'username-only' (default 'friends-of-friends')
- `invitableBy` 'everyone' | 'friends' | 'bff-only' (default 'friends')

### AvailabilityEntry (Round 4 — NEW)
Stored as a flat map: `{ [iso: 'YYYY-MM-DD']: 'free'|'maybe'|'busy' }`.
Absent key = unset. Never store nulls — delete on clear.
Mock data: `PA_AVAIL_DEFAULT` covers 30 consecutive days starting today-4.

### BroadcastSettings (Round 4 — NEW)
- `free` BroadcastRule
- `maybe` BroadcastRule
- `busy` BroadcastRule

### BroadcastRule (Round 4 — NEW)
- `on` bool
- `audience` 'everyone' | 'friends' | 'types'
- `targets` string[] — friend ids (when 'friends') or FriendType ids (when 'types'); empty array when audience='everyone'

### Quickset (Round 4 — NEW)
- `id` string ('weekends-free' | 'weekdays-5pm' | 'next30-maybe' | 'clear-month')
- `label` string
- `detail` string (one-line description)
- `status` 'free' | 'maybe' | null (null = clear)

Behavior: pure functions over the AvailabilityEntry map, scoped to sensible windows (next 4 weeks for weekends, next 14 days for weekdays, next 30 days for blanket maybe, current month for clear).

### Friend (Round 3 — unchanged)
- `id`, `name`, `letter`, `handle`, `category`, `status`, `friendTypes[]`

### FriendType (Round 3 — unchanged)
- `id`, `label`, `members[]`

### SocialGroup, GroupMember, Cover, Poll, Suggestion, SharedHistory (Round 3 — unchanged)

### Draft (Round 2 — unchanged)
Plus optional `eventIso: 'YYYY-MM-DD'` used by Step 3 wire-back to consult the AvailabilityEntry map.

---

## Components

### Round 4 Components

#### SettingsRow
`SettingsRow({ T, icon, label, sub, trailing, onClick, destructive, last })`
Row inside SettingsGroup. 56px min-height, 32px icon tile (bgSunken), label 15/600, sub 12/ink3 (truncated). Trailing chevron when `onClick && !destructive && !trailing`. Destructive uses danger color + dangerSoft tile.
**IMPORTANT:** Renders as `<div>` when `onClick` is undefined (so interactive `trailing` controls like `<Toggle>` do not produce nested `<button>`). [Hard Rule 16]

#### SettingsGroup
`SettingsGroup({ T, label, children, footnote })`
Titled card. Optional overline above. Card = bgElevated + 1px hair, radius 14, overflow hidden. Optional ink3 footnote below.

#### ThemePicker
`ThemePicker({ T, value, onChange })`
3-up segmented picker (Light / Dark / System) with 18px line icons + 12/600 label. Sunken track, active = bgElevated, subtle shadow. Each cell ~equal flex; padding 10×8. Each cell has aria-pressed; active cell passes 4.5:1 contrast on bgElevated.

#### AvailDot
`AvailDot({ T, status, size=8 })`
Tiny status circle. `status: 'free'|'maybe'|'busy'|null`. Null renders as dashed-border ring (no fill).

#### StatTile
`StatTile({ T, n, label })`
Centered 20/800 number + 9/600/1.4 mono uppercase label. Used in profile header; exactly 4 across with 8px gaps.

#### BrushPicker (inline; no factored primitive)
4-up brush row at top of Availability Editor: Free / Maybe / Not available / Clear. Each 36px tall, radius 10, shows status dot + 12/700 label. Active brush = bgElevated + 1.5px state-colored border.

#### MonthGrid
`MonthGrid({ T, anchor, setAnchor, avail, brush, setDay, dragging, setDragging })`
7-col CSS grid, square cells (aspect-ratio 1/1), radius 10, 4px gap. Cell fill = `${stateColor}22` when set, bgElevated otherwise. Today: 1.5px accent border + 800-weight day number. Cell shows day number + 6px state dot below when set. Tap-to-set; mousedown+enter chains drag-paint via parent dragging state. Header: chevrons + month-year label (17/800/-0.3).

#### WeekView
`WeekView({ T, anchor, avail, brush, setDay })`
7 stacked rows (Sun → Sat of anchor's week). Each row 14px-padded, radius 12, fill `${stateColor}18`. 44px-wide left column with mono dow + 22/800 date. Right side: status name + brush hint. Trailing 10px dot.

#### DayView
`DayView({ T, anchor, setAnchor, avail, setDay })`
Day chevron header + 4 stacked option rows (Available / Maybe / Not available / Clear). Each 16×14 padding, radius 14, 12px state dot, title + sub. Active = `${color}18` fill + 1.5px state border + check.

#### QuicksetGrid (inline, in pa-availability.jsx)
2×2 grid of buttons. Each ~66px min-height, radius 12. Title row = state dot + 13/700. Below: 11/ink3 detail OR "Applied" after tap. Applied = accentSoft fill + accent border (1.6s).

#### BroadcastToast
`BroadcastToast({ T, visible, status, audienceLabel, onUndo, onDismiss })`
Floating toast docked above the tab bar (left:14, right:14, bottom:24). Padding 10/12/10/14, radius 14, ink background, bg-color text. Layout: 8px state-colored leading dot · title (13/700) + sub (11/0.6 opacity, truncated) · "Undo" pill (12/700, alpha 0.14 white bg) · 24px close icon. Animation: flow-fade-up 320ms with spring. Auto-dismiss in 3200ms unless user undoes/dismisses.
**RULE:** Leading marker is ALWAYS the state dot. NO emoji, NO icon variants. Title format: "Broadcast sent · {State}". [Hard Rule 13]

#### AudienceSwitcher
`AudienceSwitcher({ T, value, onChange })`
3-up sub-switcher (Everyone / Friends / Types) with 30px tall pills, inset 3px padding, radius 10. Visually a tighter cousin of TabPills — used inside Broadcast cards only.

#### AudiencePickerSheet
`AudiencePickerSheet({ T, mode, selected, onChange, onClose })`
Bottom sheet (radius 22 22 0 0, max-height 78%). 38×4 grab handle. Header: title (17/800), N selected sub, accent "Done" pill.
Body:
- `mode='types'` → friend-type rows (PrivateBadge + label + N members + 22px checkbox)
- `mode='friends'` → friend rows (RingAvatar + name + handle mono + CategoryBadge); selected state via RingAvatar.selected.

### Round 5 Components

#### Spinner (NEW · R5)
The ONLY loading affordance. Replaces all skeletons that prior rounds had pencilled in but never spec'd. Always rendered from first mount.
- Geometry: Two opposing 120° arcs, each capped, forming a ring with two gaps. Stroke = `max(1.6, size/14)`.
- Motion: rotate 0 → 360deg, 900ms linear infinite (su-spin).
- Sizes: SM 20 · MD 28 (default) · LG 40 · XS 18 (button-inline)
- Color: T.accent on light surfaces · #fff on ink/danger surfaces
- A11y: `role="status"` + `aria-label="Loading"` (always)

#### LoadingOverlay
Full-screen / route-level loading: centered spinner + optional caption ("LOADING ·").

#### ButtonLoading
Replaces button content while a tapped button awaits its action; uses XS spinner.

#### ErrorState (full-area)
- Anatomy: 56×56 dangerSoft tile + triangle-alert icon (popInk stroke) · Headline 17/800 ink (≤ 5 words) · Body 13/500 ink2 (1–2 sentences, plain language, no codes) · Primary PillBtn accent ("Try again") · Secondary ghost PillBtn ("Use offline mode" / "Go back").
- 4 kinds (presets in `flow/polish-primitives.jsx · ErrorState`):
  - **network** — "You're offline" — Check connection / changes saved locally
  - **server** — "Something broke" — We're looking into it / try again
  - **notFound** — "Can't find that" — The link may have expired
  - **permission** — "Can't do that" — You don't have permission for this group

#### ErrorToast
- Layout: Same as BroadcastToast — ink bg, bg text — but leading icon is a 14px alert-triangle in popSoft (NOT a state dot). Title: "{Action} failed" · Sub: 1-line cause · "Retry" pill + 24px close.
- Auto-dismiss 3200ms unless user taps Retry.
- A11y: `role="alert"` · `aria-live="assertive"`.
- 4 kinds (presets):
  - **rsvp** — "RSVP failed" · "Tap retry — your choice is saved locally"
  - **invite** — "Invites didn't send" · "X of N delivered. Retry?"
  - **friend** — "Friend request failed" · "Try again in a moment"
  - **generic** — "Something went wrong" · "Tap retry"

#### OfflineBar (NEW · R5)
Slim top bar, slides down from FlowHeader. 36px tall, warningSoft fill, 1px hair below. Always icon (cloud-off) + text ("OFFLINE · cached data shown") + warning color — never any one alone (R5-7). Auto-hides on reconnect; entrance haptic = warning.

#### A11yLive
`<A11yLive message="…"/>` for ephemeral status that has no visible toast (e.g. "5 days marked free" after Quickset).

#### StaggerList (NEW · R5)
30ms per item · base 60ms · spring · cap 12 items. Used on Friends list, Groups list, Notifications feed, Empty state inventories. NOT used on day grids (would feel laggy on a 30-cell month view).

### Round 5 Component Refinements (audit pass)

- **SettingsRow** — Renders `<div>` when no onClick (was always `<button>`). Fix for Toggle-in-button-in-button warning. Status: Hard Rule 16.
- **FilterChipRow / FilterChipRowMulti** — Visual height stays 30px; tap target raised to 44px via invisible vertical padding (`touch-action: manipulation`). Long-press hint: 450ms · linear · subtle scale to 0.98.
- **RingAvatar** — Now ALWAYS rendered alongside an AvailDot or text label when conveying state (R5-1). Ring color/arc alone is decorative.
- **BroadcastToast / ErrorToast** — Both gained `role="alert"` + aria-live (R5-4 / A-9). Error variant: leading marker is a popSoft alert-triangle, not a state dot. Broadcast variant unchanged (state dot).
- **Step3InviteWired** (R4 wire-back) — Danger banner gained `role="alert"` — announce-on-mount. Free/Maybe overline got AvailDot so it's not color-only (R5-1).
- **PillBtn / Toggle / FormField** — No changes; all met R5 audit on first pass.

---

## Screens

### Round 4 inventory

#### 01 Profile & Settings
- FlowHeader "Profile"
- Profile card: 72px RingAvatar (status="free") + 28px accent edit FAB overlay, name (22/800), handle (mono ink3), top-right "Edit" pill. Bio (13/ink2), then 4-up StatTile row (HOSTED · ATTENDED · FRIENDS · GROUPS).
- AVAILABILITY group: row → Availability editor / row → Broadcast settings ("N of 3 active" subtitle).
- ACCOUNT group: Email, Phone, Change password.
- NOTIFICATIONS group: 6 toggle rows.
- PRIVACY group: Who can find me / Who can invite me.
- APPEARANCE group: ThemePicker (inset).
- SUPPORT group: Help & support.
- Bottom: destructive "Log out" row (in its own ungrouped card).
- Footer mono: "SYNCUP · 2.2.0"

#### 02 Availability Editor
- FlowHeader "Availability"
- Mode tabs (Month/Week/Day) + 38px broadcast shortcut button (radio icon).
- Optional onboarding hint card (accentSoft, dismissible by tweak).
- BrushPicker row.
- Body: MonthGrid | WeekView | DayView (per mode).
- QUICK-SET overline + 2×2 Quickset grid.
- Empty state when avail map is empty.

#### 03 Broadcast Settings
- FlowHeader "Broadcasts"
- Header: BROADCASTS · N ACTIVE overline + 14/ink2 explainer.
- Three stacked broadcast cards (radius 16):
  - **OFF state:** state dot · TITLE overline (state name uppercase) · 12/ink3 body · Toggle. Card height stays compact.
  - **ON state:** same head + reveals (animation flow-fade-up 320ms):
    - SEND TO overline + AudienceSwitcher
    - (when not 'everyone') sheet preview row (chevron + truncated label + "Tap to edit") → opens AudiencePickerSheet
    - "Preview toast" pill (test fire — 11/600/hair-bordered).
- Footnote: "Broadcasts send once per status change, with a 60-second undo toast. Edit anytime."

#### 04 Step 3 wire-back (Create Event Flow)
Same FlowHeader/Progress as Round 2 Step 3.
- When `AvailabilityEntry[eventIso] === 'busy'`:
  - Danger banner card (dangerSoft, popInk text) at top: "You marked this day Not available — From your availability — tap to override."
- When 'free' or 'maybe': subtle bgElevated chip: "YOUR DAY · AVAILABLE" or "YOUR DAY · MAYBE" (mono overline + state dot).
- Banded list, footer status pill mono now reads "FROM YOUR AVAILABILITY".

#### Empty states
No availability set → dashed EmptyStateBlock under Quickset grid.

#### Dark mode
Profile, Availability, Broadcasts all tested with FLOW_TOKENS.dark.

### Round 3 Screens (Friends & Groups)
- Friends list, Add friend (QR/Link/Username), Friend profile, Friend types manager
- Groups list, Create group, Group detail (Members / Events / Polls / Ideas + AdminBar), Cover Picker Sheet

### Round 2 Screens (Create Event Flow)
- Step 1 (Basic info), Step 2 (Pick a time — AvailabilitySummaryBar), Step 3 (Invite — banded availability viz), Confirm screen, Event Detail (with RSVP sheet)

### Round 1 Screens
- Home (today / week / month views)

---

## Navigation Graph

### Round 4 additions

```
[Profile & Settings]
      │
      ├── tap "Availability editor" ───▶ [Availability Editor]
      │                                          │
      │                                          ├── radio button   ─▶ [Broadcast Settings]
      │                                          └── back            ─▶ [Profile & Settings]
      │
      └── tap "Broadcast settings" ────▶ [Broadcast Settings]
                                                 │
                                                 ├── card sheet preview ─▶ [AudiencePickerSheet]
                                                 ├── "Preview toast"   ─▶ fires BroadcastToast
                                                 └── back              ─▶ caller
```

### Wire-back

```
[Availability Editor].avail map ────▶ [Step 3 Invite] (Create flow)
  – busy on event day → danger banner
  – free/maybe on day → subtle status overline
```

---

## Haptic Feedback Rules

### 6 Fixed Types

| Type | expo-haptics mapping | Use |
|------|---------------------|-----|
| light | impact / Light | Tap, selection, mode switch |
| medium | impact / Medium | Confirmed action |
| heavy | impact / Heavy | Destructive armed (1st tap of two-tap) |
| success | notification / Success | Created / sent OK |
| warning | notification / Warning | Conflict, soft block |
| error | notification / Error | Failed action |

### Action → Haptic (canonical mapping)

**light**
- Tab change · SegmentedSwitcher flip · TabPills change
- AvailabilityEditor mode tab (Month/Week/Day)
- BrushPicker brush change · AudienceSwitcher pill
- Filter chip toggle · Theme picker switch
- Day cell tap-to-set (single) · Day cell drag-paint enter

**medium**
- RSVP Yes/Maybe/No confirmed · Step 1→2→3 advance
- "Send invites" tapped · Quickset applied
- Friend type assigned · Toggle flipped (broadcast on/off, notification settings)
- "Done" on AudiencePickerSheet

**heavy**
- TwoTapDestructive armed (1st tap, before 2nd-tap commit)
- Long-press friend chip (filter carousel) reaches 450ms
- Drag-paint hits an already-set day with same brush (no-op feedback)

**success**
- Event created (Confirm screen lands)
- Friend request accepted · Invites sent OK
- Broadcast fired (BroadcastToast appears)
- Cover photo saved · Group created
- "Applied" confirmation on Quickset

**warning**
- Step 3 wire-back: busy day banner appears
- RSVP "Maybe" tapped on a day already marked busy
- Quickset overwrites >5 existing days
- Offline mode entered (OfflineBar slides down)

**error**
- RSVP failed · Invite failed
- Friend request failed · Broadcast send failed
- Network error toast surfaces

### Hard Rules

- **H-1.** NEVER haptic on scroll, drag-momentum, or pure visual transitions.
- **H-2.** NEVER stack haptics within 80ms (debounce in `useHaptic`).
- **H-3.** NEVER haptic on initial mount or auto-fired toasts that the user did not trigger (e.g. an inbound broadcast received).
- **H-4.** Two-tap destructive: heavy on arm (tap 1), success on commit (tap 2).
- **H-5.** Toasts: success/warning/error fires WITH the toast, not on dismiss.

Use `useHaptic()` from `polish-primitives.jsx`. Call ONCE per gesture (never on render, never inside scroll/drag handlers).

---

## Empty State Patterns

### Anatomy (top → bottom, all centered, max-width 280)

1. **ILLUSTRATION** — 56×56 rounded tile (radius 16) on bgSunken, 18-stroke line icon at 50% opacity ink2. NEVER a photo, NEVER a 3D render, NEVER an emoji.
2. **HEADLINE** — 17/700/-0.2 ink · ≤ 4 words ideal, 6 max
3. **BODY** — 13/500 ink2 · 1 sentence, ≤ 14 words, `text-wrap: pretty`
4. **CTA** — PillBtn primary (accent) — verb-first, ≤ 3 words. Optional secondary: ghost PillBtn underneath.

Vertical gap: 10–14px between rows · 32px outer padding.
Surface: bgElevated card with 1px hair (full-screen) OR transparent (inline). Never both an outer card AND an inner illustration tile.

### Voice
Direct, low-word-count, never apologize. "Nothing here yet" → bad; "No friends yet" + "Add one to start planning" → good.

### Inventory (Round 5 — every empty surface has one)

| Component | Icon | Headline | Subhead/CTA |
|-----------|------|----------|-------------|
| EmptyHome (today) | Calendar mark | "No plans today" | "Plan something" CTA |
| EmptyHome (week/month) | — | "Quiet week" | "Tap + to start" |
| EmptyFriends | User-plus | "No friends yet" | "Add one" + secondary "Share QR" |
| EmptyGroups | Users | "No groups yet" | "Create one" |
| EmptySearch | Search | "Nothing matched" | "Invite by handle" secondary |
| EmptyAvailability | Calendar-grid | "Set your first day" | "Try a Quickset" secondary |
| EmptyAttendees | User-circle | "No invites sent" | "Add invitees" CTA |
| EmptyPolls | Poll-bars | "No polls yet" | "Start a poll" |
| EmptySuggestions | Lightbulb | "No ideas yet" | "Suggest one" |
| EmptyMutualEvents | Handshake | "Nothing planned together" | "Plan an event" |

Files: `flow/polish-screens.jsx` exports each as `Empty<Name>(props)`.

---

## Loading Pattern

**R5-2 (HARD RULE):** SPINNER ONLY. No skeletons, no shimmer, no pulses.
Rationale: SyncUp is a real-time app. Skeletons that misrepresent layout ("there will be 3 cards here") create perceptual whiplash when the real data has 0 or 7. A consistent spinner is honest and predictable.

### Spinner Spec (the ONLY loading affordance)

| Property | Value |
|----------|-------|
| Geometry | Two opposing 120° arcs, each capped, forming a ring with two gaps. Stroke = `max(1.6, size/14)`. |
| Motion | rotate 0→360deg, 900ms linear infinite (su-spin). |
| Sizes | SM 20 · MD 28 (default) · LG 40 · XS 18 (button-inline) |
| Color | `T.accent` on light surfaces · `#fff` on ink/danger surfaces |
| A11y | `role="status"` + `aria-label="Loading"` (always) |

### Placement Decision Tree

| Condition | Placement |
|-----------|-----------|
| Full-screen / route-level | `<LoadingOverlay caption="LOADING ·"/>` (centered + optional caption) |
| Button the user tapped | `<ButtonLoading label="Sending…"/>` (replaces button content) |
| Section refresh inside loaded view | 28px spinner top-right of the section header (no caption) |
| Sheet body waiting on content | 32px spinner centered in sheet, no caption |

### Rules

- **L-1.** ALWAYS render the spinner from first mount of the loading region — no delay before showing it. (Exception: ≤120ms perceived latency may render nothing, never a skeleton.)
- **L-2.** NEVER render a spinner inside a list cell. Loading goes at the section level, not the row level.
- **L-3.** Caption (when used) is mono uppercase 10/600 ink3, letter-spacing 1.6, ≤ 2 words ("LOADING ·", "SYNCING ·", "FETCHING ·").
- **L-4.** NEVER stack two spinners in nested regions — outermost only.

---

## Error State Patterns

### Decision Tree

| Condition | Surface |
|-----------|---------|
| User tapped something needing the network and got nothing | **ErrorState** (full-area) — Network down · cold start · auth fail |
| Discrete action failed but the screen is still useful | **ErrorToast** (docked above tab bar, mirrors BroadcastToast layout) |

### ErrorState (full-area)

**Anatomy:**
- 56×56 dangerSoft tile + triangle-alert icon (popInk stroke)
- Headline 17/800 ink · ≤ 5 words
- Body 13/500 ink2 · 1–2 sentences, plain language, no codes
- Primary PillBtn accent · verb-first ("Try again")
- Secondary ghost PillBtn ("Use offline mode" / "Go back")

**4 kinds** (presets in `flow/polish-primitives.jsx · ErrorState`):

| Kind | Headline | Body |
|------|----------|------|
| network | "You're offline" | Check connection / changes saved locally |
| server | "Something broke" | We're looking into it / try again |
| notFound | "Can't find that" | The link may have expired |
| permission | "Can't do that" | You don't have permission for this group |

### ErrorToast (docked)

**Layout:** Same as BroadcastToast — ink bg, bg text — but leading icon is a 14px alert-triangle in popSoft (NOT a state dot). Title: "{Action} failed" · Sub: 1-line cause · "Retry" pill + 24px close.
**Auto-dismiss:** 3200ms unless user taps Retry.
**A11y:** `role="alert"` · `aria-live="assertive"`.

**4 kinds** (presets):

| Kind | Title | Sub |
|------|-------|-----|
| rsvp | "RSVP failed" | "Tap retry — your choice is saved locally" |
| invite | "Invites didn't send" | "X of N delivered. Retry?" |
| friend | "Friend request failed" | "Try again in a moment" |
| generic | "Something went wrong" | "Tap retry" |

### OfflineBar (related, not strictly an error)

Slim top bar, slides down from FlowHeader. 36px tall, warningSoft fill, 1px hair below. Always icon (cloud-off) + text ("OFFLINE · cached data shown") + warning color — never any one alone (R5-7). Auto-hides on reconnect; entrance haptic = warning.

### Rules

- **E-1.** NEVER show two error surfaces at once (toast preempts banner; full-screen preempts both).
- **E-2.** NEVER use an error color tile as decoration — only when an actionable error is present.
- **E-3.** Body copy NEVER includes status codes, stack traces, or "Error 0x...". Talk like a person.
- **E-4.** Always offer a recovery path (Retry, Go back, Offline mode). No dead-end errors.

---

## Accessibility Rules

### Color & Contrast

- **A-1.** ink3 (#8B8799) on bg/bgElevated measures 3.4:1 — passes AA Large only. Below 18px (or 14px bold), use ink2 (7.6:1). Codified as Hard Rule R5-5.
- **A-2.** Availability state must render BOTH a colored AvailDot AND a text label. Hard Rule R5-1.
- **A-3.** Offline indicator uses color + icon + text. Hard Rule R5-7.
- **A-4.** Focus rings: 2px accent outline + 2px offset (never removed).

### Hit Targets

- **A-5.** Minimum 44×44pt for any tap target. Verified inventory:
  - MonthGrid day cell — 44–46pt on 402px-wide phone ✓
  - Filter chip carousel — visual 30px, hit 44px via invisible vertical padding (Round 5 fix)
  - AvailDot (interactive) — wraps in 44px tap area
  - FAB — 56pt
  - Back button — 36pt visual + 44pt hit area
- **A-6.** Two-tap destructive: minimum 600ms between arm and commit window opens (prevents accidental double-tap commit).

### Labels & Roles

- **A-7.** All icon-only buttons carry aria-label. Hard Rule R5-4. Audited: back, close, +, scan, edit FAB, dismiss-toast, chevron on SettingsRow, brush-pick, mode-tabs.
- **A-8.** Spinner: `role="status"` + `aria-label="Loading"`.
- **A-9.** Toasts: `role="alert"` + `aria-live="assertive"` (errors) or `"polite"` (broadcasts).
- **A-10.** Use `<A11yLive message="…"/>` for ephemeral status that has no visible toast (e.g. "5 days marked free" after Quickset).

### Motion

- **A-11.** Honor `prefers-reduced-motion`: disable spring overshoot, replace flow-fade-up with simple opacity fade (200ms easeOut), disable stagger (all-at-once), keep spinner.
- **A-12.** NO parallax, NO scroll-bound transforms. Hard Rule R5-3.

### Text & Copy

- **A-13.** Long-text rules R5-6 apply system-wide.
- **A-14.** Tap targets that are text-only (links, "Read more") must be at least 14/600 to meet 44pt with vertical padding.

### Forms

- **A-15.** Every input has an associated `<label>` (or `aria-labelledby`).
- **A-16.** Error text on inputs uses popInk + triangle icon, never red color alone.

---

## Edge-Case Patterns

### Long-Text (R5-6 inventory)

| Surface | Rule |
|---------|------|
| Event title | 2-line clamp · webkit-line-clamp |
| Friend name | single-line · ellipsis |
| Description | 3-line clamp + "Read more" inline pill |
| @handle | single-line · ellipsis (mono · letter-spacing 0) |
| Group name | 2-line clamp on cards · single-line in headers |
| Toast subtitle | single-line · ellipsis (rely on toast width) |

### Crowd & Scale

| Case | Behavior |
|------|----------|
| 50+ invitees | Avatar grid collapses to first 8 + "+N more" pill (pill = bgSunken · 12/700 · opens AttendeesSheet) |
| Group of 1 | AdminBar still shown; member list shows YOU row only; polls/ideas tabs render their Empty* states |
| No availability | Step 3 footer reads "FROM YOUR AVAILABILITY · NOT SET" in mono ink3; no banner, no chip |
| Single friend | Friend type "All" auto-selected; FilterChipRowMulti hides chips when < 2 categories |
| Zero results | EmptySearch (see Empty inventory) |

### Connectivity & State

| Case | Behavior |
|------|----------|
| Offline | OfflineBar slides down · cached overline appears on Home ("LAST SYNCED · 4M AGO" mono ink3) |
| Stale broadcast | Queued-offline broadcasts: BroadcastToast on reconnect reads "Broadcast sent · was queued" |
| Optimistic write | All RSVP / invite / availability writes are optimistic; on failure, ErrorToast with Retry; underlying state rolls back only after user dismisses without retry |

---

## File Map

### Root HTML
- `Polish & States.html` — Round 5 polish catalog (NEW)
- `Profile & Availability.html` — Round 4 prototype shell
- `Friends & Groups.html` — Round 3 prototype shell
- `Create Event Flow.html` — Round 2 prototype shell
- `Home v2 - Merged.html` — Round 1 home
- `Design System.html` — Round 1 DS gallery
- `ANCHOR.txt` — canonical anchor source

### Round 5 modules
- `flow/polish-primitives.jsx` — Spinner, LoadingOverlay, ButtonLoading, ErrorState, ErrorToast, OfflineBar, A11yLive, StaggerList, PolishKeyframes, useHaptic, HAPTIC_TYPES
- `flow/polish-screens.jsx` — In-place state demos (Empty*, Loading*, Error*, Edge*) for every shipped screen
- `flow/polish-catalog.jsx` — DesignCanvas layout: spinner spec, haptics sheet, motion sheet, audit table, dark check

### Round 4 modules
- `flow/pa-data.jsx` — PA_PROFILE, PA_NOTIF_DEFAULTS, PA_PRIVACY_DEFAULTS, PA_TODAY, PA_AVAIL_DEFAULT, PA_BROADCAST_DEFAULT, PA_QUICKSETS, paToIso, paAddDays
- `flow/pa-primitives.jsx` — SettingsRow, SettingsGroup, ThemePicker, AvailDot, StatTile, BroadcastToast, AudienceSwitcher
- `flow/pa-profile.jsx` — ProfileSettings
- `flow/pa-availability.jsx` — AvailabilityEditor, MonthGrid, WeekView, DayView (+ inline BrushPicker, QuicksetGrid)
- `flow/pa-broadcast.jsx` — BroadcastSettings, AudiencePickerSheet
- `flow/pa-step3-wired.jsx` — Step3InviteWired (consumes avail map)

### Round 3 modules
- `flow/fg-data.jsx` — ME, FRIEND_CATEGORIES, FG_FRIENDS, FG_PRIVATE_GROUPS (friend types), FG_SOCIAL_GROUPS, FG_SHARED_HISTORY
- `flow/fg-primitives.jsx` — SegmentedSwitcher, QRArt, CoverArt, CategoryBadge, PrivateBadge, PollRow, SuggestionRow, AdminBar, TwoTapDestructive, PlanningModeToggle, FilterChipRowMulti, FGTabBar, TabPills, EmptyStateBlock
- `flow/fg-screens.jsx` — FriendsList, AddFriend, FriendProfile, FriendTypesManage, GroupsList, CreateGroup, GroupDetail, CoverPickerSheet, AdminInviteRow

### Round 2 modules
- `flow/flow-data.jsx` — FLOW_TOKENS, FLOW_FONTS, FLOW_MOTION, FRIENDS (legacy), EventGlyph, DEFAULT_DRAFT
- `flow/flow-primitives.jsx` — base primitives (status area, header, footer, progress, PillBtn, FormField, Field, RingAvatar, Overline, SectionHeader, FlowKeyframes, useLongPress, useSheetDrag, MiniMap, PriceSelector, Toggle)
- `flow/flow-step1/2/3.jsx` — Create flow screens
- `flow/flow-confirm.jsx` — Confirm screen
- `flow/flow-detail.jsx` — Event detail + RSVP sheet
- `flow/flow-home.jsx` — Home with feed

### Shared
- `ios-frame.jsx` — IOSDevice
- `design-canvas.jsx` — DesignCanvas / DCSection / DCArtboard

---

## Open Questions

Tracked from ANCHOR open-questions block — require Director input before relevant screens are built.

1. **Notifications screen (bell tab)** — not yet designed; should it be a full-screen feed or a pull-down sheet from the home tab bar?
2. **Profile tab in FGTabBar** should now route to Profile & Settings.
3. **Quicksets** — user-extensible (save your own) or fixed library?
4. **Broadcast toast** — should we offer a "review who's getting this" tap-action on the toast itself, or rely on Broadcast Settings as the single editor?
5. **Friend Types** — support nested/overlapping membership? (still open from R3)
6. **Group Detail AdminBar** — collapsing on scroll — still deferred.
7. **Reduced-motion fallbacks (A-11)** — spec'd but not visually demoed in any prototype — should Round 6 add a Tweaks toggle to preview them?
8. **Inbound broadcast UI** (someone else broadcasts to ME) — not designed. Likely lives in Notifications screen above. Affects H-3 carve-out.

---

## Round 4 Build Notes

Tweaks / edits during build:
- Initial filename was double-encoded ("Profile &amp;…html"); renamed via move to "Profile & Availability.html".
- SettingsRow originally rendered as `<button>` always, which produced a React validateDOMNesting warning when the trailing slot held a Toggle (button-in-button). Refactored to render `<div>` when no onClick is provided. This is now Hard Rule 16.
- Broadcast IA approved before build (3-card stacked pattern); no deviations during implementation.
- Wire-back was added as a new Step 3 variant (Step3InviteWired) rather than mutating the original Step3Invite — original remains untouched and still renders the locked Banded viz.

## Round 5 Build Notes (Polish Pass)

Tweaks / edits during build:
- Skeletons were initially prototyped (shimmer + pulse variants) but cut after motion review: a real-time app with variable-shape data creates layout-whiplash when fakes don't match real. Replaced with spinner-only (R5-2). Skeleton tokens (skeletonBg, etc.) deleted from FLOW_TOKENS to prevent regression.
- Initial haptic registry had 9 types (added selection / impact-soft / impact-rigid). Trimmed to 6 to match expo-haptics 1:1; the extras were aliases that drifted between iOS/Android. Locked at 6.
- First pass on ErrorToast used a state-colored dot (matched broadcast). Felt indistinguishable from a successful broadcast at a glance. Switched to popSoft alert-triangle so the variant is unmistakable.
- Filter chip carousel originally failed 44pt (visual 30px == hit 30px). Fix: invisible vertical padding 7px each side bumps hit area to 44pt while keeping visual height. Documented as A-5 inventory.
- ink3 contrast audit caught 4 surfaces using ink3 below 14px (toast subtitle, broadcast card body, settings row sub, filter chip count). All swapped to ink2. Codified as R5-5.
- Stagger entrance was originally on day grids; pulled — felt laggy on a 30-cell month view. Now restricted to lists ≤ 12 items.
- Anchor doc bumped to v2.5 (this update). No code changes — doc-only refresh promoting Round-5 details to canonical reference.

---

SYNCUP · ANCHOR V2.5 · 2026-04-27

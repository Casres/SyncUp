# SyncUp — Component Inventory

> Source: ANCHOR.pdf v2.5 (2026-04-27). Every component shipped through Round 5.
> Token references map to `TOKENS.ts`. Type references map to `TYPES.ts`.
> Hard rules referenced inline (full text in `ANCHOR.md`).

---

## 1. Foundation (Round 1 + Round 2 base primitives)

### FlowHeader

**Round introduced:** R1
**File:** `src/components/foundation/FlowHeader.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens object (light or dark from COLORS). |
| title | string | yes | — | Header title text (h3 = 17/700/-0.2). |
| onBack | () => void | no | — | If provided, renders a 36pt-visual / 44pt-hit back button. |
| right | ReactNode | no | — | Optional trailing slot (pill/icon). |

**Visual spec:** Top of every screen. Renders the title centered or left-aligned per the screen, optional back chevron (left), optional right slot. Sits above OfflineBar slide-down origin. Hairline below (1px hair).

**Hard rules:** Hard Rule 2 (44pt min hit target on back).
**Accessibility:** Back button has `aria-label="Back"` (R5-4 / A-7).

---

### PillBtn

**Round introduced:** R2
**File:** `src/components/foundation/PillBtn.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| label | string | yes | — | Verb-first, ≤ 3 words on Empty/Error CTAs. |
| variant | 'primary' \| 'ghost' \| 'destructive' | no | 'primary' | Visual style. |
| size | 'sm' \| 'md' \| 'lg' | no | 'md' | Sizing. |
| onPress | () => void | no | — | Tap handler. |
| loading | boolean | no | false | Swaps content for `<ButtonLoading/>`. |
| icon | ReactNode | no | — | Leading icon. |
| disabled | boolean | no | false | Disabled state. |

**Visual spec:** Pill (`radius: 999`). Primary = accent fill + accentBtn shadow on dark/elevated bg. Ghost = transparent + 1px hair border. Destructive = danger fill / dangerSoft tile.
**Hard rules:** R5 audit: no changes. Meets 44pt hit area at md (Hard Rule 2).
**Accessibility:** Always uses native button semantics with text label or `aria-label` if icon-only.

---

### FormField

**Round introduced:** R2
**File:** `src/components/foundation/FormField.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| label | string | yes | — | Field label (`<label>` for a11y, A-15). |
| value | string | yes | — | Controlled value. |
| onChange | (v: string) => void | yes | — | Change handler. |
| placeholder | string | no | — | Placeholder text. |
| multiline | boolean | no | false | Textarea variant. |
| error | string | no | — | Error text in popInk + triangle icon (A-16). |
| trailing | ReactNode | no | — | Trailing slot. |

**Visual spec:** Input radius 12, hair border, 14px-padded. Label above (12/600 ink2). Error below in popInk with triangle icon — never red color alone (A-16).
**Accessibility:** A-15 (every input has `<label>`); A-16 (errors use popInk + triangle, not color alone).

---

### Field

**Round introduced:** R2
**File:** `src/components/foundation/Field.tsx`
**Props:** Lower-level wrapper used inside FormField (label + body + footnote). Same theming rules as FormField.

---

### RingAvatar

**Round introduced:** R2 (refined R5)
**File:** `src/components/foundation/RingAvatar.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| letter | string | yes | — | Single-letter initial (avatar). |
| size | number | no | 40 | Diameter in px. |
| status | AvailState \| null | no | null | Drives ring color (Hard Rule 4). |
| selected | boolean | no | false | Selection variant (used in AudiencePickerSheet). |

**Visual spec:** Circle. 1px stroke. `free`=availFree, `maybe`=availMaybe (50% arc), `busy`=availBusy (15% arc), `null`=no ring (Hard Rule 4). Sizes: 40 default; 72 on Profile; 22 on rows.
**Hard rules:** Hard Rule 4 (ring color/arc rules); R5-1 (must be paired with AvailDot OR text label when conveying state — ring alone is decorative).
**Accessibility:** Decorative when paired with text; otherwise `aria-label` describing the user.

---

### Overline

**Round introduced:** R2
**File:** `src/components/foundation/Overline.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| children | ReactNode | yes | — | Text content (auto-uppercased). |
| color | ColorToken | no | 'ink3' | Color (ink3 only at ≥14px — but overline is 10/600/mono). |

**Visual spec:** 10/600 mono uppercase, letter-spacing 1.5–1.8 (Hard Rule 5). Used for section labels, footers ("BROADCASTS · N ACTIVE", "FROM YOUR AVAILABILITY", "LAST SYNCED · 4M AGO").
**Hard rules:** Hard Rule 5; R5-5 floor (overline at 10px must pair with sufficient color contrast — defaults to ink2 not ink3).

---

### SectionHeader

**Round introduced:** R2
**File:** `src/components/foundation/SectionHeader.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| title | string | yes | — | Section title (title scale = 15/700/-0.2). |
| right | ReactNode | no | — | Optional trailing slot (e.g. 28px section-refresh spinner — Loading L-1). |

**Visual spec:** Padded 14px horizontal, 8px vertical. Trailing slot reserves 28×28 for inline spinner.

---

### Toggle

**Round introduced:** R2
**File:** `src/components/foundation/Toggle.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| value | boolean | yes | — | Controlled state. |
| onChange | (v: boolean) => void | yes | — | Change handler. |
| disabled | boolean | no | false | Disabled state. |

**Visual spec:** Standard iOS-style switch. On = accent. Off = bgSunken track.
**Haptics:** medium on flip (per haptics canonical mapping).
**Hard rules:** When used inside SettingsRow, parent must render as `<div>` not `<button>` to avoid nested buttons (Hard Rule 16).

---

### MiniMap

**Round introduced:** R2
**File:** `src/components/foundation/MiniMap.tsx`
**Props:** `{ T, lat, lng, height? }`
**Visual spec:** Static map preview behind event location card. Radius 14, hairline border. No parallax (R5-3).

---

### PriceSelector

**Round introduced:** R2
**File:** `src/components/foundation/PriceSelector.tsx`
**Props:** `{ T, value, onChange }`
**Visual spec:** Inline +/- pill stepper for event price. Min hit target 44pt (Hard Rule 2).

---

## 2. Event Flow (Round 2)

### AvailabilitySummaryBar

**Round introduced:** R2
**File:** `src/components/event-flow/AvailabilitySummaryBar.tsx`
**Props:** `{ T, draft, friendsAvail }`
**Visual spec:** Top of Step 2 (Pick a time). Shows aggregate availability across invitees for the chosen day window. State counts in availFree / availMaybe / availBusy color, paired with text labels (R5-1).
**Hard rules:** R5-1 (color + label).

---

### FilterChipRow / FilterChipRowMulti

**Round introduced:** R2 (Multi added R3, refined R5)
**File:** `src/components/event-flow/FilterChipRow.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| chips | { id: string; label: string; count?: number }[] | yes | — | Chips. |
| selected | string \| string[] | yes | — | Single (FilterChipRow) or multi (FilterChipRowMulti). |
| onChange | (next: string \| string[]) => void | yes | — | Change handler. |

**Visual spec:** Visual height 30px. Tap target raised to 44px via invisible vertical padding (`touch-action: manipulation`). Long-press hint: 450ms · linear · subtle scale to 0.98.
**Haptics:** light on chip toggle; heavy when long-press carousel arms at 450ms.
**Hard rules:** Hard Rule 2 (44pt hit area enforced by R5 audit fix); R5-5 (chip count text uses ink2, not ink3).

---

### ProgressBar

**Round introduced:** R2
**File:** `src/components/event-flow/ProgressBar.tsx`
**Props:** `{ T, step: 1 | 2 | 3 }`
**Visual spec:** 3-segment top progress bar across Step 1 / 2 / 3 of Create Event Flow. Active segment = accent.
**Haptics:** medium fires on Step 1→2→3 advance.

---

### ConfirmCard

**Round introduced:** R2
**File:** `src/components/event-flow/ConfirmCard.tsx`
**Props:** `{ T, draft }`
**Visual spec:** Hero card on Confirm screen. Radius 16. Glyph + title (h2) + date/time + location. Used as the "lands" visual after Send Invites.
**Haptics:** success fires on Confirm screen mount (event created).

---

### EventDetailCard

**Round introduced:** R2
**File:** `src/components/event-flow/EventDetailCard.tsx`
**Props:** `{ T, event }`
**Visual spec:** Top of Event Detail screen. Glyph + title (h2, 2-line clamp R5-6) + date pill + location + MiniMap + description (3-line clamp + Read more, R5-6).
**Hard rules:** R5-6 truncation rules.

---

### RSVPSheet

**Round introduced:** R2
**File:** `src/components/event-flow/RSVPSheet.tsx`
**Props:** `{ T, value, onChange, onClose }`
**Visual spec:** Bottom sheet (radius 22 22 0 0). 38×4 grab handle. 3 large pill buttons: Yes / Maybe / No, each with AvailDot + label (R5-1). Sheet up: 280ms spring (rubber-band @100px).
**Haptics:** medium on Yes/Maybe/No confirmed.
**Hard rules:** R5-1 (RSVP must show dot + label).

---

## 3. Social — Friends & Groups (Round 3)

### SegmentedSwitcher

**Round introduced:** R3
**File:** `src/components/social/SegmentedSwitcher.tsx`
**Props:** `{ T, options: { id: string; label: string }[], value, onChange }`
**Visual spec:** Sunken-track 2/3-up switcher. Active segment = bgElevated + subtle shadow. Radius 10.
**Haptics:** light on flip.

---

### CoverArt

**Round introduced:** R3
**File:** `src/components/social/CoverArt.tsx`
**Props:** `{ T, cover: Cover, size? }`
**Visual spec:** Renders bundled artwork for a SocialGroup. Rounded radius (16 hero / 14 card depending on placement). Never a generic gradient (Hard Rule 3).

---

### QRArt

**Round introduced:** R3
**File:** `src/components/social/QRArt.tsx`
**Props:** `{ T, payload: string, size? }`
**Visual spec:** QR code on Add Friend screen. White card surface with 0 8px 28px shadowAccent (qrCard shadow).

---

### CategoryBadge

**Round introduced:** R3
**File:** `src/components/social/CategoryBadge.tsx`
**Props:** `{ T, categoryId: string }`
**Visual spec:** Small pill badge labelling a friend's category (BFF / Work / Gym / etc.). Used in friend rows + AudiencePickerSheet rows.

---

### PrivateBadge

**Round introduced:** R3
**File:** `src/components/social/PrivateBadge.tsx`
**Props:** `{ T }`
**Visual spec:** Lock icon + "Private" label. Used sparingly (Hard Rule 11) — never in list rows when the screen title already states privacy.
**Hard rules:** Hard Rule 11.

---

### PollRow

**Round introduced:** R3
**File:** `src/components/social/PollRow.tsx`
**Props:** `{ T, poll: Poll, onVote }`
**Visual spec:** Card row in Group Detail Polls tab. Question + horizontal bar viz of vote distribution.

---

### SuggestionRow

**Round introduced:** R3
**File:** `src/components/social/SuggestionRow.tsx`
**Props:** `{ T, suggestion: Suggestion, onUpvote }`
**Visual spec:** Lightbulb icon + author + idea text + upvote count.

---

### AdminBar

**Round introduced:** R3
**File:** `src/components/social/AdminBar.tsx`
**Props:** `{ T, onInvite, onSettings }`
**Visual spec:** Sticky top bar inside Group Detail. Always visible when `userRole === 'admin'` (Hard Rule 9). Hosts the invite flow (Hard Rule 10 — invites live here, NOT in Create Group).
**Hard rules:** 9, 10. Open Question: collapse-on-scroll deferred.

---

### AdminInviteRow

**Round introduced:** R3
**File:** `src/components/social/AdminInviteRow.tsx`
**Props:** `{ T, friend: Friend, selected, onToggle }`
**Visual spec:** Friend row used inside AdminBar invite flow. Mirrors AudiencePickerSheet 'friends' mode visually.

---

### TwoTapDestructive

**Round introduced:** R3
**File:** `src/components/social/TwoTapDestructive.tsx`
**Props:** `{ T, label, onConfirm }`
**Visual spec:** Single button that arms on 1st tap (heavy haptic, color shifts to danger), commits on 2nd tap (success haptic). Min 600ms between arm and commit window opening (A-6). The ONLY destructive pattern — no modals (Hard Rule 7).
**Haptics:** heavy (arm) → success (commit) (H-4).
**Hard rules:** 7, A-6, H-4.

---

### PlanningModeToggle

**Round introduced:** R3
**File:** `src/components/social/PlanningModeToggle.tsx`
**Props:** `{ T, mode: 'casual' | 'planning', onChange }`
**Visual spec:** Toggle within Group Detail to flip between casual chat and active planning mode.

---

### FGTabBar

**Round introduced:** R3
**File:** `src/components/social/FGTabBar.tsx`
**Props:** `{ T, value, onChange }`
**Visual spec:** Bottom tab bar for the Friends & Groups module. Sits above safe area; BroadcastToast docks above it.
**Hard rules:** Open question — Profile tab should now route to Profile & Settings (per ANCHOR open questions list).

---

### TabPills

**Round introduced:** R3
**File:** `src/components/social/TabPills.tsx`
**Props:** `{ T, tabs: { id: string; label: string }[], value, onChange }`
**Visual spec:** Pill-style tabs (radius 9 = tabpill segment). Used inside Group Detail (Members / Events / Polls / Ideas).
**Haptics:** light on TabPills change.

---

### EmptyStateBlock

**Round introduced:** R3 (formalized R5)
**File:** `src/components/social/EmptyStateBlock.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| icon | ReactNode | yes | — | 18-stroke line icon at 50% opacity ink2. |
| headline | string | yes | — | 17/700/-0.2 ink, ≤ 4 words ideal, 6 max. |
| body | string | yes | — | 13/500 ink2, 1 sentence, ≤ 14 words. |
| primary | { label: string; onPress: () => void } | no | — | Verb-first, ≤ 3 words. |
| secondary | { label: string; onPress: () => void } | no | — | Optional ghost PillBtn underneath. |
| inline | boolean | no | false | Transparent (true) vs full-screen card (false). |

**Visual spec:** 56×56 rounded illustration tile (radius 16) on bgSunken, then headline, body, CTA(s). Vertical gap 10–14px, 32px outer padding. NEVER a photo, NEVER a 3D render, NEVER an emoji. Centered, max-width 280.
**Hard rules:** Empty State Pattern (anatomy) and voice rules.

---

## 4. Profile & Availability (Round 4)

### SettingsRow

**Round introduced:** R4
**File:** `src/components/profile/SettingsRow.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| icon | ReactNode | yes | — | Icon for the 32px tile. |
| label | string | yes | — | 15/600 label. |
| sub | string | no | — | 12/ink3 subtitle (truncated). |
| trailing | ReactNode | no | — | Trailing slot — chevron auto-rendered when `onClick && !destructive && !trailing`. |
| onClick | () => void | no | — | Tap handler. **Renders `<div>` when undefined** (Hard Rule 16). |
| destructive | boolean | no | false | Danger color + dangerSoft tile. |
| last | boolean | no | false | Suppresses bottom hairline. |

**Visual spec:** 56px min-height, 32px icon tile (bgSunken).
**Hard rules:** Hard Rule 16 (renders as `<div>` when no `onClick` so interactive trailing controls don't nest `<button>` in `<button>`).
**Accessibility:** R5-5 — sub uses ink2 if rendered below 14px (originally ink3, fixed in R5 audit).

---

### SettingsGroup

**Round introduced:** R4
**File:** `src/components/profile/SettingsGroup.tsx`
**Props:** `{ T, label?: string, children: ReactNode, footnote?: string }`
**Visual spec:** Titled card. Optional overline above. Card = bgElevated + 1px hair, radius 14, overflow hidden. Optional ink3 footnote below (≥14px or ink2 swap per R5-5).

---

### ThemePicker

**Round introduced:** R4
**File:** `src/components/profile/ThemePicker.tsx`
**Props:** `{ T, value: ThemePreference, onChange: (v: ThemePreference) => void }`
**Visual spec:** 3-up segmented picker (Light / Dark / System) with 18px line icons + 12/600 label. Sunken track, active = bgElevated, subtle shadow. Each cell ~equal flex; padding 10×8.
**Haptics:** light on switch.
**Accessibility:** Each cell has `aria-pressed`; active cell passes 4.5:1 contrast on bgElevated.

---

### AvailDot

**Round introduced:** R4
**File:** `src/components/profile/AvailDot.tsx`
**Props:** `{ T, status: AvailDotStatus, size?: number }`
**Visual spec:** Tiny status circle (default 8px). null renders as dashed-border ring (no fill). When `status` is set, fills with availFree/availMaybe/availBusy.
**Hard rules:** R5-1 (AvailDot is the ONLY way to convey state — must always be paired with text label).
**Accessibility:** When interactive, wraps in 44pt tap area (A-5).

---

### StatTile

**Round introduced:** R4
**File:** `src/components/profile/StatTile.tsx`
**Props:** `{ T, n: number, label: string }`
**Visual spec:** Centered 20/800 number (statNum scale) + 9/600/1.4 mono uppercase label. Used in profile header; exactly 4 across with 8px gaps.

---

### BroadcastToast

**Round introduced:** R4
**File:** `src/components/profile/BroadcastToast.tsx`
**Props:** `{ T, visible: boolean, status: AvailState, audienceLabel: string, onUndo: () => void, onDismiss: () => void }`
**Visual spec:** Floating toast docked above the tab bar (`left:14, right:14, bottom:24`). Padding 10/12/10/14, radius 14, ink background, bg-color text. Layout: 8px state-colored leading dot · title (13/700) + sub (11/0.6 opacity, truncated) · "Undo" pill (12/700, alpha 0.14 white bg) · 24px close icon. Animation: flow-fade-up 320ms with spring. Auto-dismiss in 3200ms unless user undoes/dismisses. Box-shadow: broadcastToast (0 12px 40px rgba(0,0,0,.25)).
**Title format:** "Broadcast sent · {State}" (Hard Rule 13).
**Hard rules:** Hard Rule 13 (leading marker is ALWAYS state-colored dot — NO emoji, NO icon variants); R5-1 (subtitle pairs dot + text); H-3 (no haptic on auto-fired inbound broadcasts).
**Accessibility:** `role="alert"` + `aria-live="polite"` (A-9). Toast subtitle: single-line ellipsis (R5-6).

---

### AudienceSwitcher

**Round introduced:** R4
**File:** `src/components/profile/AudienceSwitcher.tsx`
**Props:** `{ T, value: AudienceMode, onChange: (v: AudienceMode) => void }`
**Visual spec:** 3-up sub-switcher (Everyone / Friends / Types) with 30px tall pills, inset 3px padding, radius 10. Visually a tighter cousin of TabPills — used inside Broadcast cards only.
**Haptics:** light on pill change.

---

### AudiencePickerSheet

**Round introduced:** R4
**File:** `src/components/profile/AudiencePickerSheet.tsx`
**Props:** `{ T, mode: AudiencePickerMode, selected: string[], onChange: (next: string[]) => void, onClose: () => void }`
**Visual spec:** Bottom sheet (radius 22 22 0 0, max-height 78%). 38×4 grab handle. Header: title (17/800), N selected sub, accent "Done" pill.
- `mode='types'` → friend-type rows (PrivateBadge + label + N members + 22px checkbox)
- `mode='friends'` → friend rows (RingAvatar + name + handle mono + CategoryBadge); selected state via `RingAvatar.selected`.

**Haptics:** medium on "Done"; light on row toggle.
**Animation:** Sheet up 280ms spring (rubber-band @100px).

---

### MonthGrid

**Round introduced:** R4
**File:** `src/components/profile/MonthGrid.tsx`
**Props:** `{ T, anchor: Date, setAnchor: (d: Date) => void, avail: AvailabilityEntry, brush: AvailabilityBrush, setDay: (iso: string) => void, dragging: boolean, setDragging: (v: boolean) => void }`
**Visual spec:** 7-col CSS grid, square cells (`aspect-ratio 1/1`), radius 10, 4px gap. Cell fill = `${stateColor}22` when set, bgElevated otherwise. Today: 1.5px accent border + 800-weight day number. Cell shows day number + 6px state dot below when set. Tap-to-set; mousedown+enter chains drag-paint via parent `dragging` state. Header: chevrons + month-year label (17/800/-0.3).
**Haptics:** light on day cell tap-to-set; light on drag-paint enter; heavy on drag-paint hitting an already-set day with same brush (no-op feedback).
**Accessibility:** Day cell measures 44–46pt on 402px-wide phone (A-5).

---

### WeekView

**Round introduced:** R4
**File:** `src/components/profile/WeekView.tsx`
**Props:** `{ T, anchor: Date, avail: AvailabilityEntry, brush: AvailabilityBrush, setDay: (iso: string) => void }`
**Visual spec:** 7 stacked rows (Sun → Sat of anchor's week). Each row 14px-padded, radius 12, fill `${stateColor}18`. 44px-wide left column with mono dow + 22/800 date. Right side: status name + brush hint. Trailing 10px dot.

---

### DayView

**Round introduced:** R4
**File:** `src/components/profile/DayView.tsx`
**Props:** `{ T, anchor: Date, setAnchor: (d: Date) => void, avail: AvailabilityEntry, setDay: (iso: string) => void }`
**Visual spec:** Day chevron header + 4 stacked option rows (Available / Maybe / Not available / Clear). Each 16×14 padding, radius 14, 12px state dot, title + sub. Active = `${color}18` fill + 1.5px state border + check.

---

### BrushPicker

**Round introduced:** R4 (inline; no factored primitive in source)
**File:** `src/components/profile/BrushPicker.tsx`
**Props:** `{ T, value: AvailabilityBrush, onChange: (v: AvailabilityBrush) => void }`
**Visual spec:** 4-up brush row at top of Availability Editor: Free / Maybe / Not available / Clear. Each 36px tall, radius 10, shows status dot + 12/700 label. Active brush = bgElevated + 1.5px state-colored border.
**Haptics:** light on brush change.

---

### QuicksetGrid

**Round introduced:** R4 (inline, in `pa-availability.jsx`)
**File:** `src/components/profile/QuicksetGrid.tsx`
**Props:** `{ T, quicksets: Quickset[], onApply: (q: Quickset) => void }`
**Visual spec:** 2×2 grid of buttons. Each ~66px min-height, radius 12. Title row = state dot + 13/700. Below: 11/ink3 detail OR "Applied" after tap. Applied = accentSoft fill + accent border (1600ms).
**Haptics:** medium on "Quickset applied"; success on "Applied" confirmation; warning when quickset overwrites >5 existing days.
**Hard rules:** Hard Rule 15 (Quicksets are pure functions over the AvailabilityEntry map, scoped to sensible windows).

---

## 5. Polish (Round 5)

### Spinner

**Round introduced:** R5
**File:** `src/components/polish/Spinner.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| size | SpinnerSizeName | no | 'MD' | XS=18 / SM=20 / MD=28 / LG=40. |
| onInk | boolean | no | false | If true, color = #fff (use on ink/danger surfaces). |

**Visual spec:** Two opposing 120° arcs, each capped, forming a ring with two gaps. Stroke = `max(1.6, size/14)`. Rotation: 0 → 360deg, 900ms linear infinite (`su-spin`). Color = `T.accent` on light surfaces · `#fff` on ink/danger surfaces.
**Hard rules:** R5-2 (the ONLY loading affordance). L-1 (always rendered from first mount; ≤120ms latency may render nothing — never a skeleton). L-2, L-4.
**Accessibility:** `role="status"` + `aria-label="Loading"` (always) (R5-4 / A-8).

---

### LoadingOverlay

**Round introduced:** R5
**File:** `src/components/polish/LoadingOverlay.tsx`
**Props:** `{ T, caption?: string }`
**Visual spec:** Full-screen / route-level loading. Centered 28px Spinner + optional caption. Caption: mono uppercase 10/600 ink3, letter-spacing 1.6, ≤ 2 words ("LOADING ·", "SYNCING ·", "FETCHING ·") (L-3).
**Hard rules:** L-1, L-3.

---

### ButtonLoading

**Round introduced:** R5
**File:** `src/components/polish/ButtonLoading.tsx`
**Props:** `{ T, label?: string }`
**Visual spec:** Replaces button content while a tapped button awaits its action. XS spinner (18px) + optional label ("Sending…").

---

### ErrorState

**Round introduced:** R5
**File:** `src/components/polish/ErrorState.tsx`
**Props:**
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| T | Theme | yes | — | Theme tokens. |
| kind | ErrorStateKind | yes | — | 'network' \| 'server' \| 'notFound' \| 'permission'. |
| onPrimary | () => void | no | — | "Try again" handler. |
| onSecondary | () => void | no | — | Ghost PillBtn handler ("Use offline mode" / "Go back"). |

**Visual spec:** 56×56 dangerSoft tile + triangle-alert icon (popInk stroke). Headline 17/800 ink (≤ 5 words). Body 13/500 ink2 (1–2 sentences, plain language, no codes — E-3). Primary PillBtn accent · verb-first. Secondary ghost PillBtn.
**Hard rules:** E-1, E-2, E-3, E-4. Always offer a recovery path.

---

### ErrorToast

**Round introduced:** R5
**File:** `src/components/polish/ErrorToast.tsx`
**Props:** `{ T, kind: ErrorToastKind, visible: boolean, onRetry: () => void, onClose: () => void, sub?: string }`
**Visual spec:** Same layout as BroadcastToast — ink bg, bg text — but leading icon is a 14px alert-triangle in popSoft (NOT a state dot). Title: "{Action} failed" · Sub: 1-line cause · "Retry" pill + 24px close. Auto-dismiss 3200ms unless user taps Retry.
**Haptics:** error fires WITH the toast (H-5).
**Accessibility:** `role="alert"` · `aria-live="assertive"` (A-9).
**Hard rules:** E-1 (toast preempts banner).

---

### OfflineBar

**Round introduced:** R5
**File:** `src/components/polish/OfflineBar.tsx`
**Props:** `{ T, visible: boolean }`
**Visual spec:** Slim top bar, slides down from FlowHeader. 36px tall, warningSoft fill, 1px hair below. Always icon (cloud-off) + text ("OFFLINE · cached data shown") + warning color — never any one alone (R5-7). Auto-hides on reconnect.
**Haptics:** warning on entrance; no haptic on auto-hide.
**Hard rules:** R5-7, A-3.

---

### A11yLive

**Round introduced:** R5
**File:** `src/components/polish/A11yLive.tsx`
**Props:** `{ message: string }`
**Visual spec:** Visually hidden live region. Used for ephemeral status that has no visible toast (e.g. "5 days marked free" after Quickset).
**Accessibility:** A-10.

---

### StaggerList

**Round introduced:** R5
**File:** `src/components/polish/StaggerList.tsx`
**Props:** `{ children: ReactNode[], capItems?: number }`
**Visual spec:** Animates children in: 30ms per item · base 60ms · spring · cap 12 items. Used on Friends list, Groups list, Notifications feed, Empty state inventories.
**Hard rules:** NOT used on day grids (would feel laggy on a 30-cell month view); honor `prefers-reduced-motion` to disable stagger (A-11).

---

### PolishKeyframes

**Round introduced:** R5
**File:** `src/components/polish/PolishKeyframes.tsx`
**Visual spec:** Mounts global keyframes: `su-spin`, `su-slide-down`, `su-stagger-in`. Counterpart to FlowKeyframes (Round 2).

---

## 6. Empty States — Inventory

All exported from `flow/polish-screens.jsx` per ANCHOR file map. Each uses `EmptyStateBlock` with a fixed icon/headline/body/CTA pairing.

### EmptyHome (today)

**Round introduced:** R5
**File:** `src/components/empty/EmptyHome.tsx`
**Variant:** today
**Icon:** Calendar mark
**Headline:** "No plans today"
**Body:** —
**Primary CTA:** "Plan something"

### EmptyHome (week / month)

**Variant:** week / month
**Icon:** —
**Headline:** "Quiet week"
**Body:** "Tap + to start"

### EmptyFriends

**Round introduced:** R5
**File:** `src/components/empty/EmptyFriends.tsx`
**Icon:** User-plus
**Headline:** "No friends yet"
**Primary CTA:** "Add one"
**Secondary CTA:** "Share QR"

### EmptyGroups

**Round introduced:** R5
**File:** `src/components/empty/EmptyGroups.tsx`
**Icon:** Users
**Headline:** "No groups yet"
**Primary CTA:** "Create one"

### EmptySearch

**Round introduced:** R5
**File:** `src/components/empty/EmptySearch.tsx`
**Icon:** Search
**Headline:** "Nothing matched"
**Secondary CTA:** "Invite by handle"

### EmptyAvailability

**Round introduced:** R5
**File:** `src/components/empty/EmptyAvailability.tsx`
**Icon:** Calendar-grid
**Headline:** "Set your first day"
**Secondary CTA:** "Try a Quickset"

### EmptyAttendees

**Round introduced:** R5
**File:** `src/components/empty/EmptyAttendees.tsx`
**Icon:** User-circle
**Headline:** "No invites sent"
**Primary CTA:** "Add invitees"

### EmptyPolls

**Round introduced:** R5
**File:** `src/components/empty/EmptyPolls.tsx`
**Icon:** Poll-bars
**Headline:** "No polls yet"
**Primary CTA:** "Start a poll"

### EmptySuggestions

**Round introduced:** R5
**File:** `src/components/empty/EmptySuggestions.tsx`
**Icon:** Lightbulb
**Headline:** "No ideas yet"
**Primary CTA:** "Suggest one"

### EmptyMutualEvents

**Round introduced:** R5
**File:** `src/components/empty/EmptyMutualEvents.tsx`
**Icon:** Handshake
**Headline:** "Nothing planned together"
**Primary CTA:** "Plan an event"

---

## Cross-Component Hard Rules Summary

| Rule | Component(s) affected |
|------|----------------------|
| R5-1 (status: dot + label) | RingAvatar, AvailDot, BroadcastToast, RSVPSheet, Step3InviteWired |
| R5-2 (spinner only) | Spinner replaces every previously-pencilled skeleton; LoadingOverlay, ButtonLoading |
| R5-3 (no parallax) | MiniMap, all scroll views |
| R5-4 (icon-only buttons need aria-label) | Back, close, +, scan, edit FAB, dismiss-toast, chevron on SettingsRow, brush-pick, mode-tabs |
| R5-5 (ink3 floor) | SettingsRow.sub, FilterChipRow.count, BroadcastToast.sub — all use ink2 |
| R5-6 (truncation) | EventDetailCard.title (2-line), .description (3-line + Read more), Friend.name (1-line ellipsis), .handle (1-line mono ellipsis), Group.name (2-line on cards / 1-line in headers), Toast.subtitle (1-line ellipsis) |
| R5-7 (offline triple) | OfflineBar |
| R5-8 (6 haptic types) | Toggle, MonthGrid, RSVPSheet, ProgressBar, BroadcastToast, ErrorToast, TwoTapDestructive, FilterChipRow, all switchers |
| Hard Rule 4 (ring colors) | RingAvatar |
| Hard Rule 7 (TwoTapDestructive only) | TwoTapDestructive (Log out is single-row exception) |
| Hard Rule 8 (Friend Type private vs Social Group shared) | FriendType vs SocialGroup data, AudiencePickerSheet, FriendTypesManager |
| Hard Rule 9 (AdminBar always when admin) | AdminBar on Group Detail |
| Hard Rule 10 (invites in AdminBar, not Create Group) | AdminInviteRow placement |
| Hard Rule 11 (PrivateBadge sparingly) | PrivateBadge usage in lists |
| Hard Rule 12 (3-card broadcast IA) | BroadcastSettings screen, BroadcastRule data |
| Hard Rule 13 (toast leading state dot) | BroadcastToast |
| Hard Rule 14 (no null avail keys) | AvailabilityEntry mutators |
| Hard Rule 15 (Quicksets are pure scoped fns) | QuicksetGrid + Quickset shape |
| Hard Rule 16 (SettingsRow div when no onClick) | SettingsRow |
| Hard Rule 17 (Step 3 wire-back banner) | Step3InviteWired (banded list) |

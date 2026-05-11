# Screens — Handoff (2026-05-04)

> Frontend / Screens agent. Output of the build run on 2026-05-04.
> `npx tsc --noEmit` from `social-calendar-mobile/` is clean (zero errors).

**Top-level note:** Flow 6 (Availability Editor) is now COMPLETE. Decision #6
(Option C — Inline collapse) was locked by the Director on 2026-05-04 and the
screen was built immediately after. See the Flow 6 section below for details.

---

## What Was Built

All 16 screens replaced. None remain as stubs.

```
Flow 1 — Home & Event Detail                ✅
Flow 2 — Create Event Flow                  ✅
Flow 3 — Friends                            ✅
Flow 4 — Groups                             ✅
Flow 5 — Profile & Settings                 ✅
Flow 6 — Availability Editor                ✅ (Option C inline collapse · Decision #6)
Flow 7 — Broadcast Settings + Picker Sheet  ✅
```

Composition pattern is identical across all 15 screens: import components from
`'../../components'` (the barrel), import API hooks from `'../../api'`, theme
from `'../../theme'`, mocks only when local-only data is needed (e.g.
`MOCK_FRIEND_TYPES` in Friend Types Manager).

---

## Flow 1 — Home & Event Detail

### Files replaced
- `src/screens/home/HomeScreen.tsx`
- `src/screens/events/EventDetailScreen.tsx`

### Data hooks used
- `useEvents()` — Home feed list
- `useEvent(eventId)` — Event Detail
- `useSubmitRSVP()` — optimistic RSVP submission

### Edge cases handled
- **Empty Today/Week/Month**: routes through `<EmptyHome variant=...>` with
  "Plan something" CTA that opens the Create modal.
- **Network error**: `<ErrorState kind="network" onPrimary={refetch}>` covers
  the body region, FlowHeader stays.
- **50+ attendees on Event Detail**: `ATTENDEE_COLLAPSE_THRESHOLD = 8` clamps
  the avatar grid to first 8 + `+N` overflow pill.
- **NOT_FOUND on Event Detail**: surfaces `<ErrorState kind="notFound">` with
  Go-back primary + Refresh secondary (E-4 always-recoverable).
- **Long title**: 2-line clamp on hero (`numberOfLines={2}` ellipsizeMode tail).
- **Long description**: 3-line clamp + "Read more" inline pill expands to full.
- **RSVP failure (~10% SERVER_ERROR)**: `<ErrorToast kind="rsvp">` with retry,
  sub-text "Tap retry · your choice is saved locally". H-5 fires the error
  haptic from inside ErrorToast on visible mount.
- **OfflineBar**: rendered with hard-coded `isOffline=false` for the stub
  phase; cached overline "LAST SYNCED · 4M AGO" gated on the same flag.

### Hard rules applied
- **R5-1 (paired dot + label)**: AvailDot + label everywhere RSVP status shows.
- **R5-2 (Spinner only)**: route-level `<LoadingOverlay caption="LOADING ·">`
  on first mount; no skeletons anywhere.
- **R5-3 (no parallax)**: MiniMap rendered static.
- **R5-6 (truncation)**: 2-line title clamp, single-line meta lines, 3-line
  description + Read more.
- **Hard Rule 2 (44pt hit)**: PillBtn / FlowHeader back / RSVP CTA all meet.

### Open items
- The OfflineBar wiring is stubbed; a `useNetworkState()` hook is the eventual
  consumer when real offline support lands.

---

## Flow 2 — Create Event Flow

### Files replaced
- `src/screens/create/Step1Screen.tsx`
- `src/screens/create/Step2Screen.tsx`
- `src/screens/create/Step3Screen.tsx`
- `src/screens/create/ConfirmScreen.tsx`
- `src/screens/create/draftStore.ts` (new — transient draft singleton)

### Draft state architecture
The `CreateEventStackParamList` types Step2/Step3 as `undefined`, so the draft
cannot ride on navigation params. Per the prompt's contract — "do NOT store
the draft in React Query or Zustand — it is transient navigation state" — the
draft lives in a process-local singleton in `draftStore.ts`. Step1 calls
`resetDraft()` once on mount; Step2/Step3/Confirm `useDraft()` to subscribe.
Re-opening the modal lands on a clean slate.

### Data hooks used
- `useFriends()` — Step 2 + Step 3 friend list source
- `useQueries(queryKeys.availability.friend(id))` — Step 2 + Step 3 per-friend
  availability fetch (via raw `getFriendAvailability` for the array form;
  retry suppressed on FORBIDDEN)
- `useMyAvailability()` — Step 3 wire-back source
- `useCreateEvent()` — Step 3 send invites mutation

### Edge cases handled
- **Step 2: FORBIDDEN (Marcus, user-3)**: `useQueries.retry` returns false on
  `ApiError('FORBIDDEN', …)`; the friend renders as `null` ("unknown" bucket
  in the banded summary). NO ErrorToast — graceful per prompt R6.
- **Step 2: empty map (Sasha, user-2)**: returns `{}` from the stub; the day
  lookup is `undefined` → "unknown" bucket. NO error.
- **Step 3 wire-back, busy day (Hard Rule 17)**: when
  `myAvailability[draft.eventIso] === 'busy'`, `<Step3BusyBanner iso={…}/>`
  renders above the banded list and a one-shot `warning` haptic fires on
  banner mount (guarded by a ref so re-renders don't re-fire).
- **Step 3 wire-back, free/maybe day**: `<Step3AvailChip status={…}/>` with
  default "From your availability" overline.
- **Step 3, no availability set for the day**: footer status pill reads
  `FROM YOUR AVAILABILITY · NOT SET` in mono ink3 (no banner, no chip).
- **Step 3, 50+ invitees per band**: `COLLAPSE_THRESHOLD = 8`; bands show first
  8 friends + `+N more` row.
- **Send invites failure**: `<ErrorToast kind="invite">`; retry re-fires the
  mutation.
- **Confirm screen mount fires `success` haptic** (canonical mapping).

### Hard rules applied
- **Hard Rule 1 (banded availability LOCKED)**: `<AvailabilitySummaryBar />`
  used as-is on both Step 2 and Step 3.
- **Hard Rule 17 (Step 3 busy banner)**: implemented with the wire-back
  invariant verified (`MOCK_MY_AVAILABILITY[isoOffset(7)] === 'busy'` and the
  upcoming event sits on that day).
- **R5-1 (paired dot + label)**: AvailDot + label on the banded buckets.
- **R5-6 (truncation)**: row name single-line ellipsis; ConfirmCard 2-line h2.
- **Hard Rule 2 (44pt)**: every Pressable / PillBtn meets.
- **Hard Rule 3 (no gradients on Confirm hero)**: ConfirmCard renders a glyph
  badge, not a gradient.

### Open items
- Date / time picker fields are FormField text inputs in this build
  (HH:MM and YYYY-MM-DD strings). A native picker swap is a future phase.
- `glyph` field on the draft is not exposed in Step 1; ConfirmCard derives
  the glyph initial from the title for now.

---

## Flow 3 — Friends

### Files replaced
- `src/screens/friends/FriendsListScreen.tsx`
- `src/screens/friends/AddFriendScreen.tsx`
- `src/screens/friends/FriendProfileScreen.tsx`
- `src/screens/friends/FriendTypesManagerScreen.tsx`

### Data hooks used
- `useFriends()` — list + counts
- `useFriendRequests()` — pending requests banner
- `useFriendProfile(friendId)` — profile detail
- `useFriendAvailability(friendId)` — graceful FORBIDDEN handling
- `useEvents()` — mutual events derivation (filter by `inviteeIds`)
- `useSendFriendRequest()` — Add Friend (Username mode)
- `useRespondToFriendRequest()` — Accept / Decline pending requests
- `MOCK_FRIEND_LABELS` / `MOCK_FRIEND_TYPES` — local-only label/type catalog

### Edge cases handled
- **Pending requests banner**: surfaces only when at least one pending row and
  the user isn't already on the Pending segment (taps switch to Pending).
- **Add Friend / CONFLICT (already a friend)**: `<ErrorToast kind="friend">`
  renders sub copy "Already in your friends list."
- **Friend Profile / FORBIDDEN availability (Marcus)**: status row reads
  "Availability private" with the `null` AvailDot — NO ErrorToast surface.
- **Friend Profile / NOT_FOUND**: `<ErrorState kind="notFound">` with Go-back +
  Refresh.
- **Mutual Events empty**: `<EmptyMutualEvents onPlan={…}/>` opens Create modal
  prefilled with the friend.
- **Friend Types Manager / empty after deletion**: `<EmptyStateBlock>` with
  "Create one" copy.
- **Long name/handle**: single-line ellipsis on row name + handle (R5-6).

### Hard rules applied
- **Hard Rule 7 (TwoTapDestructive)**: used for "Remove friend" on Friend
  Profile and "Delete" on each FriendType row. The component itself enforces
  the ARM_MIN_MS = 600ms gate and the heavy → success haptic ladder (H-4).
- **Hard Rule 8 (FriendType is PRIVATE)**: Friend Types Manager screen titles
  the privacy explicitly; per-row PrivateBadge omitted (Hard Rule 11).
- **Hard Rule 11 (PrivateBadge sparingly)**: not rendered on Friend Types
  Manager rows.
- **R5-1**: FriendProfile status row pairs AvailDot + text label.
- **R5-6**: name + handle ellipsis on every list row.

### Open items
- AddFriend Username mode treats CONFLICT-on-send as the test signal for
  EmptySearch. A real search endpoint would split "no results" from
  "already a friend" — both surface here as the same error path for now.
- "Plan together" CTA passes only `prefilledInviteeIds`; an `eventIso` prefill
  hook is unused in this build (the param exists in `Step1ScreenProps`).

---

## Flow 4 — Groups

### Files replaced
- `src/screens/groups/GroupsListScreen.tsx`
- `src/screens/groups/CreateGroupScreen.tsx`
- `src/screens/groups/GroupDetailScreen.tsx`
- `src/screens/groups/CoverPickerSheetScreen.tsx`

### Data hooks used
- `useGroups()` — list
- `useGroupDetail(groupId)` — header + members
- `useGroupPolls(groupId)` + `useVotePoll()` — polls tab
- `useGroupSuggestions(groupId)` + `useAddSuggestion()` — ideas tab
- `useEvents()` — events tab (filter by `groupId`)
- `useCreateGroup()` — Create Group screen
- `pollIsClosed()` — closed/active gating

### Edge cases handled
- **Group of 1**: AdminBar still renders (Hard Rule 9 unchanged); members tab
  shows YOU row only + an inline `<EmptyStateBlock>` "Group of one · Invite
  friends from the Admin bar."; Polls / Ideas show their Empty states.
- **Polls empty / Ideas empty**: `<EmptyPolls>` / `<EmptySuggestions>` rendered
  inside the tab body.
- **Closed poll**: a CLOSED overline renders above the PollRow; tap-to-vote
  is suppressed in the parent (the row's haptic still fires inside the
  component but the mutation is a no-op).
- **Permission error on group fetch**: `<ErrorState kind="permission">` (E-4
  always-recoverable, OS-Settings primary).
- **Long group name**: 2-line clamp on the hero card (R5-6).
- **CoverPickerSheet**: 6-tile bundled catalog as a stub; Done fires
  `medium` (tap) + `success` (saved) per the canonical mapping.

### Hard rules applied
- **Hard Rule 9 (AdminBar always visible when admin)**: the screen renders
  `<AdminBar>` directly under the FlowHeader and never hides it on scroll
  (collapsing-on-scroll is deferred).
- **Hard Rule 10 (invites in AdminBar, NOT in Create Group)**: Create Group
  has only Cover / Name / Private toggle / Create.
- **Hard Rule 11 (PrivateBadge sparingly)**: only rendered when
  `group.isPrivate === true` AND the title isn't already privacy-stating it
  — i.e. the group cards on Groups List + the Group Detail hero.
- **R5-6**: hero h2 2-line clamp; row labels single-line ellipsis; group card
  name 2-line clamp.

### Open items
- AdminBar's Invite / Settings handlers fire `medium` / `light` placeholders
  — the actual invite flow is not wired here (Hard Rule 10 says invites live
  in AdminBar; the click target is in place but the picker route is the same
  AudiencePickerSheet pattern, deferred to a future phase).
- `useAddSuggestion` writes optimistically through React Query but
  `onUpvote` for SuggestionRow is currently a no-op stub; a per-suggestion
  upvote API hook is a future phase.

---

## Flow 5 — Profile & Settings

### Files replaced
- `src/screens/profile/ProfileSettingsScreen.tsx`

### Data hooks used
- `useMyProfile()` — header + stats
- `useNotificationSettings()` + `useUpdateNotificationSettings()` — toggles
- `usePrivacySettings()` + `useUpdatePrivacySettings()` — privacy rows
- `useBroadcastSettings()` — drives the "N of 3 active" subtitle on the
  Broadcasts row

### Edge cases handled
- **Server error on profile fetch**: `<ErrorState kind="server">` body region.
- **All toggles off**: still renders (no special state).
- **Long bio**: respects the card; no truncation specified beyond standard
  wrap.
- **Privacy row taps**: cycle the value (everyone ↔ friends-of-friends or
  everyone ↔ friends) and `medium` haptic fires; canonical select-row picker
  is a future phase.
- **Log out**: single-tap triggers a `heavy` haptic; OS-level confirm in
  production. Single-row exception to Hard Rule 7.

### Hard rules applied
- **Hard Rule 16 (SettingsRow renders <View> when no onPress)**: the six
  Notification toggle rows have a `Toggle` trailing and NO onPress, so they
  render as `<View>` — the Toggle handles the press, no nested Pressable.
  The Theme row likewise carries no onPress; ThemePicker renders inset below.
- **R5-1**: Theme picker pairs icon + label (active/ink contrast).
- **R5-5**: footer overline uses ink3 only on the version footer; all other
  small copy is ink2 floor.

### Open items
- The Edit FAB on the profile card and the "Edit" PillBtn fire `light` only
  — opening the edit sheet is deferred (not specified in SCREENS.md beyond
  "deferred / not specified").
- Privacy row stubs cycle 2 values; the full ANCHOR enum (3 FindableBy / 3
  InvitableBy values) needs a tap-sheet picker in a future phase.

---

## Flow 6 — Availability Editor

### Files replaced
- `src/screens/profile/AvailabilityEditorScreen.tsx`

### Decision context
**Decision #6 — Option C (Inline collapse) — Locked 2026-05-04.** The Director
re-confirmed the Availability Hub layout the same day Flow 6 was about to
start. The calendar is the primary surface; broadcast rules tuck under it
inline and expand on tap. The original ANCHOR-spec'd 38px broadcast shortcut
button at the top of the screen is replaced by the inline collapse pattern
per Option C — the navigation is preserved (tap "Manage broadcasts" inside
the expanded section to push BroadcastSettings).

### Layout
```
FlowHeader "Availability"
  → TabPills (Month / Week / Day)
  → Onboarding hint card  (accentSoft, dismissible — ephemeral useState)
  → BrushPicker  (Free / Maybe / Not available / Clear)
  → Body  (MonthGrid | WeekView | DayView per active mode)
  → QUICK-SET overline + QuicksetGrid (4 quicksets)
  → BROADCAST RULES · N OF 3 ACTIVE  ← Pressable header (chevron + state-overline)
       └── (expanded · 320ms flow-fade-up)
             • PreviewCard FREE  (read-only summary: ON/OFF + audience label)
             • PreviewCard MAYBE
             • PreviewCard BUSY
             • PillBtn "Manage broadcasts"  → BroadcastSettings
  → EmptyAvailability  (when avail map is empty — primary "Set today")
```

### Data hooks used
- `useMyAvailability()` — drives the calendar body and empty gate
- `useBroadcastSettings()` — drives the inline preview cards + active count
- `useUpdateAvailability()` — optimistic mutation for tap, drag-paint, day
  picker, and Quickset apply (see API_STUB_HANDOFF §4 — cancel/snapshot/
  patch/rollback already wired)

### Local (ephemeral) state
```ts
const [mode, setMode] = useState<'month' | 'week' | 'day'>('month');
const [brush, setBrush] = useState<AvailabilityBrush>('free');
const [anchor, setAnchor] = useState<Date>(new Date());
const [dragging, setDragging] = useState(false);
const [hintDismissed, setHintDismissed] = useState(false);
const [broadcastsExpanded, setBroadcastsExpanded] = useState(false);
```
A single `Animated.Value` drives the inline-collapse transform (translateY
−6→0 + opacity 0→1 over `durations.broadcastCardOpen` = 320ms with
`Easing.out(Easing.cubic)`, useNativeDriver=true).

### Hard rules applied
- **Hard Rule 14 (delete-on-clear)**: parent `setDay` mapper translates the
  brush:
  ```
  next = brush === 'clear' ? null : brush
  if (next === null) delete updated[iso]
  else                updated[iso] = next
  ```
  Null is NEVER persisted — keys are removed entirely. The same invariant
  applies to the Quickset path: `clear-month` deletes every key whose ISO
  prefix matches the current calendar month.
- **Hard Rule 15 (Quicksets are pure functions over the map)**: window logic
  lives in `computeQuicksetPatch()` inside the screen — `weekends-free`
  iterates next 28 days picking dow ∈ {0, 6}, `weekdays-5pm` iterates next 14
  days dow ∈ {1..5}, `next30-maybe` iterates 30 days, `clear-month` deletes
  the YYYY-MM-prefixed slice. None operate on the full map indefinitely.
- **Hard Rule 12 (3-card stacked broadcast IA)**: the inline preview
  iterates the canonical `STATE_ORDER = [free, maybe, busy]`. Edit lives at
  BroadcastSettings — preview is read-only here.
- **R5-1 (paired dot + text)**: every broadcast preview row pairs an
  `AvailDot` with the ON/OFF label. The state-pill never communicates by
  color alone.
- **R5-2 (Spinner only)**: `LoadingOverlay caption="LOADING ·"` covers the
  initial fetch; no skeletons or pulses anywhere.

### Haptic ownership (re-affirmed)
- **MonthGrid** owns drag-paint haptics (`light` per cell entered, `heavy`
  on no-op repaint). Parent does NOT also fire on cell enter.
- **QuicksetGrid** fires `medium` (apply) + `success` (confirm) internally.
  Parent does NOT also fire on apply — it just merges the patch.
- **TabPills** fires `light` on mode change internally.
- **BrushPicker** fires `light` on brush change internally.
- **DayView / WeekView** fire `light` on row select internally.
- **Parent fires only**: `light` on broadcast-section toggle and `light` on
  the "Manage broadcasts" PillBtn tap. Hint-dismiss tap fires `light`.

### Edge cases handled
- **Empty avail map** (`Object.keys(avail).length === 0`): `EmptyAvailability`
  renders below the Quickset section with "Set today" CTA → writes
  `{ [todayIso]: 'free' }` through the optimistic mutation. The Quicksets are
  also still visible above the empty state, satisfying the "Try a Quickset"
  alternate CTA path.
- **Mode switch resets `dragging`** (preserves `brush`): a `useEffect` on
  `[mode]` clears the drag flag so a stuck PanResponder release on a
  remounted view doesn't strand the parent in dragging=true.
- **Drag outside the grid**: handled by MonthGrid's PanResponder
  `onPanResponderRelease` / `onPanResponderTerminate`.
- **DayView 'Clear' option**: routes through a separate `setDayExplicit`
  mapper that bypasses the active brush — picking 'Clear' from DayView
  always wipes the day regardless of which BrushPicker option is active.
- **ScrollView scrollEnabled**: gated on `!dragging` so a drag-paint gesture
  on the calendar isn't intercepted by vertical scroll.
- **Network error on initial fetch**: `<ErrorState kind="network"
  onPrimary={refetch} />` covers the body region; FlowHeader stays.

### Open items
- The onboarding hint card is purely ephemeral — `hintDismissed` is local
  `useState`, so the hint reappears on every screen mount. A persistent
  "first visit" flag (AsyncStorage / Zustand-with-storage) is a future-phase
  concern.
- The original ANCHOR-spec'd 38px broadcast shortcut button (with the radio
  icon) is intentionally absent; Decision #6 Option C replaced it with the
  inline collapse pattern. The navigation target (`navigation.navigate(
  'BroadcastSettings')`) is preserved on the "Manage broadcasts" PillBtn.
- `MOCK_QUICKSETS` does not exist in the mocks layer — the 4 canonical
  Quicksets are defined inline at the top of the screen file from the
  enum-locked TYPES.QuicksetId set. If a future round wants user-extensible
  Quicksets (per ANCHOR open-question §3 "user-extensible or fixed
  library?"), this becomes a mocks/api concern — the screen surface stays
  the same.
- `computeQuicksetPatch()` lives in the screen rather than the api layer.
  When real backend lands, the right home for this function is probably
  `src/api/availability.ts` so server-side pure-function semantics match
  client preview semantics.

---

## Flow 7 — Broadcast Settings & Audience Picker

### Files replaced
- `src/screens/profile/BroadcastSettingsScreen.tsx`
- `src/screens/profile/AudiencePickerSheetScreen.tsx`

### Data hooks used
- `useBroadcastSettings()` — initial settings hydration
- `useUpdateBroadcastSettings()` — optimistic flush on toggle / audience /
  targets change
- `useFriends()` — picker friends mode
- `MOCK_FRIEND_TYPES` / `MOCK_FRIENDS` — picker types mode + audience-label
  resolution on preview row

### Local state pattern
`localSettings` mirrors the server settings; toggles + audience changes update
locally and immediately call the optimistic mutation. On error the optimistic
patch is rolled back by React Query (snapshot in `onMutate`, restore in
`onError` — built into `useUpdateBroadcastSettings`).

### Edge cases handled
- **Long audience-targets label** on preview row → single-line ellipsis (R5-6).
- **`audience === 'everyone'`**: preview row hidden; the AudiencePickerSheet
  is gated behind the row tap, which itself is hidden when audience is
  everyone.
- **No types / no friends in picker**: AudiencePickerSheet route swaps to
  `<EmptyFriends>` or `<EmptyStateBlock>` ("No friend types · Create one")
  with secondary nav to FriendTypesManager.
- **Preview toast**: tapping the "Preview toast" pill fires `medium` and
  shows `<BroadcastToast />` for 3200ms (component owns the timer); BroadcastToast
  itself fires NO haptic (H-3) — parent owns the outbound `medium`.

### Hard rules applied
- **Hard Rule 12 (3-card stacked IA LOCKED)**: cards iterate STATE_ORDER
  (free / maybe / busy); each card is the spec's OFF / ON state pattern.
- **Hard Rule 13 (BroadcastToast leading marker = state-colored dot)**:
  `<BroadcastToast status={…}/>` carries the dot; no emoji, no icon variants.
- **R5-1 (paired dot + text)**: the OFF state head pairs AvailDot + state
  TITLE overline.
- **R5-6**: preview row label ellipsis; explainer body 14/ink2 wraps.

### Open items
- The "Preview toast" tap fires the toast inline — there is no real broadcast
  network call yet. Once a broadcast send endpoint is added, the same toast
  becomes the post-send confirmation.
- AudiencePickerSheet is presented as a stack push using
  `presentation: 'formSheet'` (handled by the navigation layer); the sheet
  body component itself supports rubber-band dismissal via the parent
  presenter.

---

## Cross-Flow Notes

### Toast positioning
Both `<ErrorToast>` and `<BroadcastToast>` are anchored with the canonical
`TOAST_POSITION_DEFAULTS` exported from the components barrel. Screens that
also render the bottom tab bar should compose
`{ ...TOAST_POSITION_DEFAULTS, bottom: TAB_BAR_HEIGHT + 24 }` — none of the
flows currently in scope dock toasts above the tab bar (the tab bar is
hidden on the Create modal stack and not present on the modal sheets).

### Haptic firing surface
- All component-level haptics (Toggle medium, FilterChipRow light, TabPills
  light, RSVPSheet medium on choose, TwoTapDestructive heavy/success) fire
  inside the component — screens do NOT also fire on those gestures.
- Screens fire only the canonical screen-level events: Step1→Step2 advance
  (medium), Step2→Step3 advance (medium), Step3 send (medium + success/error
  via mutation), Confirm mount (success), filter chip on Home (light via
  the chip itself), Open Create modal (light), and any screen-level
  navigation light pings.
- Step3's wire-back warning (`busy` banner mount) fires once via a `useRef`
  guard so re-renders don't re-fire.

### React Query vs local state
- Server data (events, friends, groups, polls, suggestions, profile,
  notification / privacy / broadcast settings, availability) is read through
  React Query hooks only.
- UI-only state (active view tab, filter chip, sheet visibility, expanded
  description, current segment) is `useState` per screen.
- The Create-Event draft lives in a transient module-level singleton in
  `src/screens/create/draftStore.ts` — NOT React Query, NOT Zustand. The
  prompt explicitly forbids both for transient navigation state.

### Verification
- `npx tsc --noEmit` from `social-calendar-mobile/` — 0 errors after every
  flow, including the Flow 6 build (2026-05-04).
- All 16 built screens follow the same composition pattern: import from the
  components barrel, theme barrel, api barrel; never reach into individual
  files.
- Empty / loading / error states are handled in every screen that fetches
  data; screens that don't fetch (ConfirmScreen, FriendTypesManager,
  CoverPickerSheet, AudiencePickerSheet local-data path) skip those states
  by design.

### Known stubs / future-phase items
1. **Date / time pickers** in Step 1 / Step 2 are FormField text inputs.
2. **Native QR scanner** in AddFriend / QR mode renders only the user's own
   QR via `<QRArt />`; a scanner camera surface is a future phase.
3. **MiniMap** uses the token-tinted placeholder — real Apple/Google static
   tiles are a future integration (open item from COMPONENTS_HANDOFF #4).
4. **Edit profile sheet**, **Help & support**, **Edit cover** flows are
   deferred per SCREENS.md.
5. **Suggestion upvote** mutation is not yet wired (the row's haptic and
   visual feedback work; the API write is the future phase).
6. **Real OfflineBar wiring** — flag is hard-coded `false`.
7. **AdminBar invite picker route** — the Invite handler in Group Detail
   AdminBar fires `medium` / `light` placeholders; the actual invite picker
   route (the same AudiencePickerSheet pattern used in Broadcast Settings) is
   stub-phase deferred.
8. **Availability Editor onboarding hint persistence** — `hintDismissed` is
   ephemeral `useState`; a real "first visit" flag would need AsyncStorage
   or Zustand-with-storage. Same screen also keeps `computeQuicksetPatch()`
   inline — the right home is `src/api/availability.ts` once a real backend
   replaces the mocks.

### Suggested next agent
- An "Edit profile" sheet agent could swing through the deferred picker
  modes for FindableBy / InvitableBy and the profile edit form.
- A "real-data integration" agent to wire `useNetworkState`, AsyncStorage
  for the Availability Editor onboarding-hint flag, and migrate
  `computeQuicksetPatch()` into the api layer when the backend lands.

## R7 Hard Rules Applied (2026-05-04)

ANCHOR v2.7 Round-7 hard rules (R7-1 through R7-6) — Director-approved
answers to the 5 previously-open design questions. Full text in
`/Users/christiancasillas/Documents/Claude/Projects/SyncUp/ANCHOR-DESIGN.txt`
lines 833–869. tsc --noEmit clean after all edits.

| Rule | Files touched | Fix summary |
|---|---|---|
| **R7-1** Quicksets are user-extensible | `src/components/profile/QuicksetGrid.tsx`, `src/screens/profile/AvailabilityEditorScreen.tsx`, `src/components/index.ts` | Already compliant (`QuicksetGrid` accepts `quicksets: Quickset[]` prop, no fixed-length-4 internal). Hardened: extracted the 4 built-ins into a frozen `BUILTIN_QUICKSETS` readonly export from `QuicksetGrid.tsx`, re-exported through the components barrel. `AvailabilityEditorScreen` now spreads `BUILTIN_QUICKSETS` into its `QUICKSETS` array (future custom Quicksets append to it). Added `// R7-1` markers + JSDoc rule text. |
| **R7-2** BroadcastToast stays simple | `src/components/profile/BroadcastToast.tsx` | Already compliant — toast body is `<View>` (not Pressable), only the Undo pill and close X have `onPress`, no avatar stack, no chevron, no "review recipients" affordance. Added a `// R7-2` marker on the component definition + JSDoc rule text restating the 5-element contract (state dot · title · sub · Undo · X). |
| **R7-3** Friend Types are non-overlapping | `src/mocks/friendTypes.ts`, `src/components/social/FilterChipRowMulti.tsx`, `src/components/profile/AudiencePickerSheet.tsx` | Already compliant. Verified `MOCK_FRIEND_TYPES.members[]` are pairwise disjoint: ft-1=[user-2,user-6] / ft-2=[user-3] / ft-3=[user-4] / ft-4=[user-5] — zero pairwise intersection, no reassignments required. Verified `FilterChipRowMulti` emits a flat string-id array; both consumers (`FriendsListScreen` + `Step3Screen`) apply `friendTypes.some(t => set.has(t))` (UNION). Verified `AudiencePickerSheet` mode='types' uses flat checkbox toggle (no compound/intersection mode). Added `// R7-3` markers + JSDoc rule text in all three files. |
| **R7-4** Stale notifications auto-purge at 30 days | `src/mocks/notifications.ts` | Notifications surface not built in this phase. Added the full R7-4 rule text as JSDoc on `MOCK_NOTIFICATIONS` so the future Notifications agent inherits it. |
| **R7-5** Push copy = in-app copy verbatim | `src/mocks/notifications.ts` | No push notification system wired. Added the full R7-5 rule text as JSDoc on `MOCK_NOTIFICATIONS` (same block as R7-4) for the future push integration agent. |
| **R7-6** Group Detail AdminBar is pinned | `src/components/social/AdminBar.tsx`, `src/screens/groups/GroupDetailScreen.tsx` | Already compliant — `GroupDetailScreen` renders `<AdminBar/>` BETWEEN `<FlowHeader/>` and `<ScrollView>`, so it stays pinned when the body scrolls. `AdminBar` has zero scroll-listening logic and no scroll-tied opacity/translate animations. Added `// R7-6` marker on the rendering site + JSDoc rule text on the component restating the no-collapse / no-scroll-listener contract. |

**Reassignments:** None. All `MOCK_FRIEND_TYPES.members[]` arrays were
already pairwise disjoint at the time of the audit.

**Verification:** `npx tsc --noEmit` from `social-calendar-mobile/` returned
0 errors after every edit.

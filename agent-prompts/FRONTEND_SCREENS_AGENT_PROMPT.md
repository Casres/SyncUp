# Frontend — Screens Agent Prompt

> **You are the Frontend / Screens agent.** Read this entire document before writing a single line of code. Your job is to replace the stub screens created by the Navigation agent with real implementations, one screen flow at a time. You build screens by composing components from `src/components/` and data from `src/api/` hooks. You do not build new components, change the theme, or modify the navigation structure.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified:

| Agent | Output | Key files |
|-------|--------|-----------|
| Theme / Tokens | Full token system | `src/theme/` |
| Component Library | All presentational components | `src/components/`, `COMPONENTS_HANDOFF.md` |
| Navigation Setup | Full navigator + stub screens | `src/navigation/`, `src/screens/` (stubs) |
| Mock Data Layer | Typed mock constants | `src/mocks/`, `MOCKS_HANDOFF.md` |
| API Stub Layer | Typed async hooks + query keys | `src/api/`, `API_STUB_HANDOFF.md` |

**Read these files before writing any screen:**
- `SCREENS.md` (monorepo root) — authoritative screen-by-screen spec. Build exactly what is described here.
- `COMPONENTS_HANDOFF.md` (`src/components/`) — what components exist, their props, any assumptions made
- `API_STUB_HANDOFF.md` (`src/api/`) — what hooks are available, which stubs simulate errors
- `ANCHOR.md` (monorepo root) — reference for any ambiguity in SCREENS.md; hard rules, haptic map, edge cases
- `src/navigation/types.ts` — props types for every screen

---

## Non-Negotiable Contracts

### 1. State management: React Query for API data, Zustand for local UI state only

```ts
// ✅ correct — server data via React Query hook
const { data: events, isLoading, error } = useEvents();

// ✅ correct — ephemeral UI state via useState (no server data)
const [activeTab, setActiveTab] = useState<'Members' | 'Events' | 'Polls' | 'Ideas'>('Members');

// ❌ wrong — API response stored in Zustand
const setEvents = useEventsStore(s => s.setEvents);
setEvents(events); // NEVER
```

Local UI state that never touches the network (selected tab, modal open state, active brush, drag state) lives in `useState` or Zustand if it needs to be shared across a tree. API response data never goes into Zustand.

### 2. No hardcoded design values in screen files
All colors, typography, spacing, and radii come from `src/theme/`. All components come from `src/components/`. Screens are composition layers — they should contain almost no styling themselves beyond layout flexbox values.

### 3. Every screen handles all three states: loading, error, empty

```tsx
const { data, isLoading, error } = useEvents();

if (isLoading) return <LoadingOverlay />;
if (error) return <ErrorState preset="network" onRetry={refetch} />;
if (!data?.length) return <EmptyHome />;

return (/* real content */);
```

Choose the correct loading placement, error type, and empty state component from `SCREENS.md`. See the Anchor's loading placement decision tree for section-level vs. full-screen loading.

### 4. Every action fires the correct haptic
Before building each screen, cross-reference the Anchor's haptic map. Every tap, RSVP, step advance, toggle flip, and destructive arm must fire the correct haptic type via `useHaptic()` from `src/theme/haptics.ts`.

### 5. Hard rules are non-negotiable
The Anchor's hard rules are locked by the Director. Do not work around them.

Key hard rules that affect screens:
- **R5-1**: Free/Maybe/Busy status ALWAYS renders AvailDot + text. Never color alone.
- **R5-2**: Only Spinner for loading. No skeletons, shimmer, or pulse.
- **R5-6**: Long-text truncation rules system-wide.
- **Hard Rule 1**: Banded availability viz on Step 3 is locked. Do not change it.
- **Hard Rule 9**: AdminBar is always visible when `userRole === 'admin'` on Group Detail.
- **Hard Rule 12**: Broadcast IA is locked to the 3-card stacked pattern.
- **Hard Rule 16**: SettingsRow renders `<View>` (not `<Pressable>`) when no `onPress`.
- **Hard Rule 17**: Step 3 wire-back: show danger banner when event day is 'busy'.

### 6. Build screens in the order specified below — do not skip or parallelize
Some screens depend on shared patterns established in earlier screens. Build flows in order.

---

## Build Order

Build one flow at a time. Complete and verify each flow before starting the next.

```
Flow 1  — Home & Event Detail
Flow 2  — Create Event (Step 1 → Step 2 → Step 3 → Confirm)
Flow 3  — Friends (List → Add → Profile → Types Manager)
Flow 4  — Groups (List → Create → Detail → Cover Picker)
Flow 5  — Profile & Settings
Flow 6  — Availability Editor (Month / Week / Day)
Flow 7  — Broadcast Settings
```

---

## Flow 1 — Home & Event Detail

**Files to replace:**
- `src/screens/home/HomeScreen.tsx`
- `src/screens/events/EventDetailScreen.tsx`

### HomeScreen

Layout (from SCREENS.md — follow exactly):
- `FlowHeader` with title "SyncUp" and optional right action
- Date range segmented switcher: Today / This Week / This Month
- `FilterChipRow` for event type filtering
- Event list — `StaggerList` wrapping `EventCard` components
- `OfflineBar` (conditionally rendered when offline — wire to a `useNetworkState` or hardcode `isOffline=false` for stub phase)
- Floating "+" button — navigates to Step 1 (opens Create Event modal)

Data hooks:
```ts
const { data: events, isLoading, error, refetch } = useEvents();
```

Edge cases:
- Empty today: `<EmptyHome variant="today" />`
- Empty week/month: `<EmptyHome variant="week" />`
- Offline: `<OfflineBar />` below FlowHeader + cached overline "LAST SYNCED · 4M AGO" on event cards

Haptics:
- Filter chip toggle: `light`
- Segmented switcher: `light`

### EventDetailScreen

Route params: `{ eventId: string }`

Layout:
- `FlowHeader` with back button + event title (2-line clamp)
- Cover/hero area (if event has cover)
- Event metadata: date, time, location, host
- RSVP section: current user's RSVP status (AvailDot + label) + RSVP pill row
- Attendees: `RingAvatar` grid; collapses to "+N more" at 8 avatars (edge case: 50+)
- Description: 3-line clamp + "Read more" inline pill
- `RSVPSheet` (modal, triggered by RSVP pill tap)

Data hooks:
```ts
const { data: event, isLoading, error } = useEvent(eventId);
const submitRSVP = useSubmitRSVP();
```

RSVP optimistic update: use `submitRSVP` mutation; show `ErrorToast` preset "rsvp" on failure.

Haptics:
- RSVP Yes/Maybe/No confirmed: `medium`
- RSVP failed → `error` (fired by ErrorToast — Hard Rule H-5)

---

## Flow 2 — Create Event Flow

**Files to replace:**
- `src/screens/create/Step1Screen.tsx`
- `src/screens/create/Step2Screen.tsx`
- `src/screens/create/Step3Screen.tsx`
- `src/screens/create/ConfirmScreen.tsx`

This is a modal stack. A `draft` object flows through the steps via navigation params. Do NOT store the draft in React Query or Zustand — it is transient navigation state.

### Step 1 (Basic Info)

Layout:
- `FlowHeader` with close (X) button + title "New Event"
- `ProgressBar` (step 1 of 3)
- `FormField` for: Event name, Date picker, Time, Location, Description, Price
- "Next" `PillBtn` → navigates to Step 2 with `{ draft }`

Haptics: advance to Step 2 → `medium`

### Step 2 (Pick a Time — Availability)

Layout:
- `FlowHeader` + `ProgressBar` (step 2 of 3)
- `AvailabilitySummaryBar` — shows friends' availability banded by Free/Maybe/Busy

Data hooks:
```ts
// Fetch availability for all accepted friends
const friends = useFriends();
const availQueries = useQueries(friends.data?.map(f => ({
  queryKey: queryKeys.availability.friend(f.id),
  queryFn: () => getFriendAvailability(f.id),
})) ?? []);
```

Note: `getFriendAvailability('user-3')` will throw `FORBIDDEN` (Marcus is blocked). Handle gracefully — treat blocked users as "unknown" in the banded view.

"Continue" → Step 3 with `{ draft: { ...draft, eventIso: selectedDate } }`

Haptics: advance to Step 3 → `medium`

### Step 3 (Invite — Wire-back)

Layout:
- `FlowHeader` + `ProgressBar` (step 3 of 3)
- **Wire-back banner** (Hard Rule 17): If `draft.eventIso` exists AND `myAvailability[draft.eventIso] === 'busy'`:
  - Render `<Step3BusyBanner />` (danger banner: dangerSoft fill, popInk text, role="alert")
  - Fire `warning` haptic on mount of this banner
- If `draft.eventIso` availability is 'free' or 'maybe': render `<Step3AvailChip status={...} />`
- `AvailabilitySummaryBar` (banded — Hard Rule 1: LOCKED to banded viz)
- `FilterChipRow` for filtering invitees
- Invitee list: `RingAvatar` row per friend with RSVP status
- At 50+ invitees: collapse to first 8 + "+N more" pill (edge case)
- "Send invites" `PillBtn` → calls `createEvent` mutation → navigates to Confirm

Data hooks:
```ts
const { data: myAvailability } = useMyAvailability();
const createEventMutation = useCreateEvent();
```

Haptics: "Send invites" tapped → `medium`; invites sent OK → `success`; invite failed → `error`

### ConfirmScreen

Layout:
- No `FlowHeader` — full-screen confirm state
- `ConfirmCard` with event summary
- "View event" `PillBtn` → pops modal stack, pushes to EventDetail
- "Back to home" secondary `PillBtn` → dismisses modal

Haptics: screen landing fires `success` (event created)

---

## Flow 3 — Friends

**Files to replace:**
- `src/screens/friends/FriendsListScreen.tsx`
- `src/screens/friends/AddFriendScreen.tsx`
- `src/screens/friends/FriendProfileScreen.tsx`
- `src/screens/friends/FriendTypesManagerScreen.tsx`

### FriendsListScreen

Layout:
- `FlowHeader` with title "Friends. {count}" (h1 style per Anchor)
- `FilterChipRowMulti` for filtering by friend type
- `StaggerList` of friends — each row: `RingAvatar` + name + handle + `CategoryBadge`
- Pending requests banner if `MOCK_PENDING_REQUESTS.length > 0`
- Empty: `<EmptyFriends />`

Data hooks:
```ts
const { data: friends } = useFriends();
const { data: requests } = useFriendRequests();
```

Haptics: filter chip toggle → `light`

### AddFriendScreen

Layout:
- `FlowHeader` with back button + title "Add Friend"
- `SegmentedSwitcher`: QR / Link / Username tabs
- QR tab: `<QRArt />` (my QR code)
- Link tab: share link (copy/share button)
- Username tab: `FormField` for @handle search + "Send request" `PillBtn`

Haptics: send request → `medium`; request sent OK → `success`; request failed → `error`

### FriendProfileScreen

Route params: `{ friendId: string }`

Layout:
- `FlowHeader` with back button
- Profile card: `RingAvatar` (72px) + name + handle + bio
- Mutual events section
- Shared availability section (shows friend's availability — handle FORBIDDEN gracefully: show "Availability private")
- `TwoTapDestructive` for "Remove friend" (bottom of screen)

Data hooks:
```ts
const { data: profile } = useFriendProfile(friendId);
const { data: friendAvail } = useFriendAvailability(friendId);
// Handle ApiError('FORBIDDEN') from useFriendAvailability: show "Availability private"
```

Haptics: remove friend arm → `heavy`; remove confirmed → `success`

### FriendTypesManagerScreen

Layout:
- `FlowHeader` + title "Friend Types"
- List of `FriendType` rows with member count and edit/delete
- "New type" `PillBtn`
- `TwoTapDestructive` on each row for delete

Data: purely local (FriendTypes are private to the client — no API stub needed; read from `MOCK_FRIEND_TYPES`)

---

## Flow 4 — Groups

**Files to replace:**
- `src/screens/groups/GroupsListScreen.tsx`
- `src/screens/groups/CreateGroupScreen.tsx`
- `src/screens/groups/GroupDetailScreen.tsx`
- `src/screens/groups/CoverPickerSheetScreen.tsx`

### GroupsListScreen

Layout:
- `FlowHeader` + title "Groups"
- `StaggerList` of group cards: `CoverArt` + name + member count + `PrivateBadge` (if applicable)
- "New group" `PillBtn`
- Empty: `<EmptyGroups />`

### CreateGroupScreen

Layout:
- `FlowHeader` (modal style) + title "New Group"
- `FormField` for group name
- "Create" `PillBtn`

Haptics: group created → `success`

### GroupDetailScreen

Route params: `{ groupId: string }`

Layout:
- `FlowHeader` with group name + back button
- Cover art header
- **`AdminBar`** — Hard Rule 9: ALWAYS visible when `group.userRole === 'admin'`. Contains: Invite, Edit cover, End group actions. Never hide it based on scroll position (AdminBar collapsing on scroll is DEFERRED — see open design questions).
- `FGTabBar`: Members / Events / Polls / Ideas tabs
- Tab content:
  - Members: `RingAvatar` + name rows; empty: `<EmptyStateBlock />` (group of 1 edge case: shows YOU row only)
  - Events: event cards; empty: `EmptyMutualEvents`
  - Polls: `PollRow` list (closed poll shows results; active poll shows voting); empty: `EmptyPolls`
  - Ideas: `SuggestionRow` list; empty: `EmptySuggestions`

Data hooks:
```ts
const { data: group } = useGroupDetail(groupId);
const { data: polls } = useGroupPolls(groupId);
const { data: suggestions } = useGroupSuggestions(groupId);
```

Haptics: tab change → `light`; vote poll → `medium`; add suggestion → `medium`

### CoverPickerSheetScreen

Presented as a modal sheet. Allows choosing or generating group cover art. Stub implementation: show a grid of placeholder cover options; "Save" fires `success` haptic.

---

## Flow 5 — Profile & Settings

**File to replace:** `src/screens/profile/ProfileSettingsScreen.tsx`

Layout (exact per ANCHOR):
1. `FlowHeader` "Profile"
2. Profile card: 72px `RingAvatar` + accent edit FAB overlay + name (h2) + handle (mono, ink3) + "Edit" pill. Bio (13/ink2). 4-up `StatTile` row (HOSTED · ATTENDED · FRIENDS · GROUPS).
3. AVAILABILITY `SettingsGroup`: → Availability Editor / → Broadcast Settings ("N of 3 active" subtitle)
4. ACCOUNT `SettingsGroup`: Email, Phone, Change password rows
5. NOTIFICATIONS `SettingsGroup`: 6 toggle rows (from `NotificationSettings`)
6. PRIVACY `SettingsGroup`: Who can find me / Who can invite me rows
7. APPEARANCE `SettingsGroup`: `ThemePicker` (inset — no `onPress` on SettingsRow → Hard Rule 16 → renders `<View>`)
8. SUPPORT `SettingsGroup`: Help & support row
9. Destructive "Log out" row (standalone card, `TwoTapDestructive` pattern)
10. Footer: "SYNCUP · 2.2.0" (mono overline)

Data hooks:
```ts
const { data: profile } = useMyProfile();
const { data: notifSettings } = useNotificationSettings();
const { data: privacySettings } = usePrivacySettings();
const { data: broadcastSettings } = useBroadcastSettings();
```

The "N of 3 active" subtitle on Broadcasts row: count `Object.values(broadcastSettings).filter(r => r.on).length`.

Haptics: toggle flip → `medium`; log out arm → `heavy`

---

## Flow 6 — Availability Editor

**File to replace:** `src/screens/profile/AvailabilityEditorScreen.tsx`

Layout (exact per ANCHOR):
1. `FlowHeader` "Availability"
2. Mode tabs (Month / Week / Day) + 38px broadcast shortcut button (radio icon → navigates to BroadcastSettings)
3. Optional onboarding hint card (accentSoft, dismissible — show only on first visit; track in `useState`)
4. `BrushPicker` row (Free / Maybe / Not available / Clear)
5. Body: `MonthGrid` | `WeekView` | `DayView` (per mode)
6. QUICK-SET overline + `QuicksetGrid`
7. Empty state when avail map is empty: `<EmptyAvailability />`

Data hooks:
```ts
const { data: avail } = useMyAvailability();
const updateAvail = useUpdateAvailability();
```

State:
```ts
const [mode, setMode] = useState<'Month' | 'Week' | 'Day'>('Month');
const [brush, setBrush] = useState<AvailState | null>('free');
const [dragging, setDragging] = useState(false);
const [anchor, setAnchor] = useState(new Date()); // month/week anchor date
```

Note on drag-paint: cell tap/drag applies the active brush, immediately fires `updateAvail` mutation (optimistic). Each drag-cell-enter fires `light` haptic. Entering a cell with the same state as the brush fires `heavy` haptic (no-op feedback).

Quickset applied: fires `success` haptic + shows "Applied" state on the grid button (1.6s).

> ⚠️ **STOP BEFORE BUILDING THIS SCREEN.** Per `LEAD_MANAGER.md`: the Availability Hub layout (Option A/B/C) must be re-confirmed with Christian before implementation. Current pick is Option C (inline collapse), but Christian flagged this for re-confirmation. Pause and escalate to the Lead Manager before building this screen. Do not implement until re-confirmed.

---

## Flow 7 — Broadcast Settings

**File to replace:** `src/screens/profile/BroadcastSettingsScreen.tsx`

Layout (exact per ANCHOR, Hard Rule 12: LOCKED to 3-card stacked pattern):
1. `FlowHeader` "Broadcasts"
2. Header: "BROADCASTS · N ACTIVE" overline + 14/ink2 explainer
3. Three stacked broadcast cards (radius 16), one per state (Free / Maybe / Busy):
   - OFF state: state dot · state name (TITLE overline) · 12/ink3 body · `Toggle`
   - ON state: same head + (animated flow-fade-up 320ms):
     - "SEND TO" overline + `AudienceSwitcher`
     - If audience !== 'everyone': sheet preview row → opens `AudiencePickerSheet`
     - "Preview toast" pill → fires `BroadcastToast`
4. Footnote text (from ANCHOR)

Data hooks:
```ts
const { data: settings } = useBroadcastSettings();
const update = useUpdateBroadcastSettings();
```

Local state: `const [localSettings, setLocalSettings] = useState(settings)` — update locally on toggle, flush to API on change.

Haptics: toggle flip → `medium`; broadcast fired (preview toast) → `success`

**File to replace:** `src/screens/profile/AudiencePickerSheetScreen.tsx`

Route params: `{ mode: 'types' | 'friends', selected: string[], onConfirm: (selected: string[]) => void }`

Renders `<AudiencePickerSheet />` component filling the sheet. "Done" calls `onConfirm` with selected IDs and pops the sheet.

Haptics: "Done" → `medium`

---

## Edge Cases — Apply Across All Screens

Per the ANCHOR's edge-case patterns:

- **50+ invitees**: Avatar grid shows first 8 + "+N more" pill (Step 3, Event Detail)
- **Group of 1**: AdminBar still shown; member list shows YOU row only; tabs show Empty states (Group Detail)
- **No availability set**: Friend's availability renders as "unknown" state (no AvailDot, "Not set" label) — not an error (Step 2, Step 3, Friend Profile)
- **Availability blocked**: Returns `FORBIDDEN` from API stub — render "Availability private" gracefully, not an error toast (Step 2, Step 3, Friend Profile)
- **Offline**: `<OfflineBar />` appears + cached data continues rendering with "LAST SYNCED" overline (Home)
- **Long text**: Apply R5-6 truncation rules everywhere (2-line event title, single-line friend name, 3-line description + "Read more", single-line handle)

---

## Handoff Document

After all screens in a flow are complete, write or append to `src/screens/SCREENS_HANDOFF.md`. Organize by flow:

For each flow:
1. **What was built** — list of screen files replaced
2. **Data hooks used** — which React Query hooks each screen uses
3. **Edge cases handled** — which edge cases were implemented and how
4. **Hard rules applied** — which Anchor hard rules were relevant and how they were implemented
5. **Open items** — anything deferred or needing cross-section input

Note the Availability Editor stop explicitly: "Paused before Availability Editor screen — awaiting Christian's re-confirmation of Availability Hub layout option (A/B/C). Currently Option C (inline collapse). Escalated to Lead Manager."

---

## Final Checklist (per flow)

After completing each flow:
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All three states handled in every screen: loading (`LoadingOverlay` or spinner), error (`ErrorState` or `ErrorToast`), empty (correct `Empty*` component)
- [ ] No hardcoded colors, font sizes, or radii — all from `src/theme/`
- [ ] No data fetching with raw `fetch` or `axios` — only React Query hooks from `src/api/`
- [ ] No API response data stored in Zustand
- [ ] Every user action that should fire a haptic does fire one (correct type from haptic map)
- [ ] All Hard Rules that apply to this flow are respected
- [ ] Long-text truncation (R5-6) applied everywhere it's relevant
- [ ] Edge cases from ANCHOR are handled (not just the happy path)
- [ ] `SCREENS_HANDOFF.md` updated with this flow's entry

**Before starting Flow 6 (Availability Editor):**
- [ ] Availability Hub layout re-confirmed with Christian via Lead Manager escalation
- [ ] Layout option (A/B/C) documented in `SCREENS_HANDOFF.md`

**Final:**
- [ ] All flows complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for Screens → `COMPLETE (date)` with note on any deferred screens

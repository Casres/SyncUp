# SyncUp — Screen Implementation Guide

> Source: ANCHOR.pdf v2.5 (2026-04-27).
> Tab IA + Groups/Messages placement reconciled to the locked anchor (TAB BAR IA + R17) on 2026-06-03: Explore is a tab; Groups and Messages are segments of the Friends tab, not separate tabs.
> Component references map to `COMPONENTS.md`. Token references map to `TOKENS.ts`. Type references map to `TYPES.ts`.
> Hard rules referenced inline (full text in `ANCHOR.md`).

Each screen follows the same structure: layout (top → bottom), empty/loading/error states, edge cases, haptics, navigation, hard rules.

---

## Home / Calendar

### Home

**Round introduced:** R1
**Route name:** `Home`
**Tab:** Home

**Layout (top → bottom):**
1. **OfflineBar slot** — slides down from top when offline (R5-7).
2. **FlowHeader** — title "Today" / "Week" / "Month" depending on view; right slot may host a "+ New" pill that opens Create Event modal stack.
3. **Cached overline** (when offline) — `Overline` reads "LAST SYNCED · 4M AGO" in mono ink3.
4. **View switcher (TabPills)** — Today / Week / Month. Light haptic on flip.
5. **Body** — feed of upcoming events (Today), calendar grid (Week / Month). Each feed row taps into Event Detail.

**Empty state:**
- Today view → `EmptyHome (today)` ("No plans today" · "Plan something" CTA)
- Week / Month view → `EmptyHome (week/month)` ("Quiet week" · "Tap + to start")

**Loading state:** `<LoadingOverlay caption="LOADING ·"/>` on first mount of route (L-1). Section refresh on the feed = 28px Spinner top-right of section header (no caption).

**Error state:** `ErrorState` `kind='network'` full-area when feed fetch fails ("You're offline — Check connection / changes saved locally"). Optimistic writes retain.

**Edge cases:**
- 50+ items in feed → render normally; per-row R5-6 truncation (event title 2-line clamp).
- Offline → OfflineBar + cached overline.

**Haptics:**
- Tab change (Today/Week/Month) → light
- Tap "+" to open Create modal → light (selection)
- Tap event row → light

**Navigation:**
- Tap event in feed → push `EventDetail` (HomeStack)
- Tap "+" → opens `CreateEventStack` modal (full-screen)

**Hard rules:** R5-2 (no skeletons), R5-3 (no parallax), R5-7 (offline triple).

---

## Create Event Flow (modal stack)

### Step 1 (Basic info)

**Round introduced:** R2
**Route name:** `Step1`
**Tab:** Modal (CreateEventStack)

**Layout (top → bottom):**
1. **FlowHeader** — title "New event"; left slot "Cancel" → dismiss modal; right slot empty.
2. **ProgressBar** — step 1 of 3.
3. **FormField** — Event title (R5-6 will apply on render elsewhere).
4. **Field** — Glyph picker (`EventGlyph`).
5. **Field** — optional Description (multiline).
6. **PriceSelector** — optional.
7. **Footer pill** — "Next" PillBtn primary → push Step2.

**Empty state:** N/A (form view).
**Loading state:** Footer button → `<ButtonLoading label="…"/>` if a server-side draft save is in flight.
**Error state:** Field-level error in popInk + triangle (A-16).

**Edge cases:** Title >2 lines clamps on the Confirm card (R5-6); description gets Read more on Event Detail.

**Haptics:** medium on "Next" tap (Step 1→2 advance).

**Navigation:** push `Step2` (240ms easeStd step push).

**Hard rules:** Hard Rule 2 (44pt hit), R5-6 truncation (downstream).

---

### Step 2 (Pick a time — AvailabilitySummaryBar)

**Round introduced:** R2
**Route name:** `Step2`
**Tab:** Modal

**Layout (top → bottom):**
1. **FlowHeader** — title "When?"; back chevron.
2. **ProgressBar** — step 2 of 3.
3. **AvailabilitySummaryBar** — aggregate avail counts across invitees for the chosen day. State counts paired with text labels (R5-1).
4. **Day picker / time picker** — date selector + start/end time fields.
5. **Footer pill** — "Next" PillBtn primary → push Step3 (writes `eventIso` to draft for wire-back).

**Empty state:** N/A.
**Loading state:** Section refresh on AvailabilitySummaryBar = 28px spinner top-right.
**Error state:** ErrorToast `kind='generic'` if availability fetch fails.

**Edge cases:**
- 50+ invitees → counts shown but list collapses elsewhere (Step 3 +N more pill).

**Haptics:**
- Day select → light
- "Next" → medium

**Navigation:** push `Step3`.

**Hard rules:** R5-1 (state must show dot + label).

---

### Step 3 (Invite — STANDARD variant)

**Round introduced:** R2
**Route name:** `Step3`
**Tab:** Modal

**Layout (top → bottom):**
1. **FlowHeader** — title "Invite"; back chevron.
2. **ProgressBar** — step 3 of 3.
3. **FilterChipRowMulti** — filter friends by FriendType (chips for type ids).
4. **Banded availability viz (LOCKED)** — section headers banded by availFree / availMaybe / availBusy color, each section listing eligible invitees in that bucket. RingAvatar + name + handle + RSVP-state dot (R5-1).
5. **Footer pill** — "Send invites" PillBtn primary; mono status pill on left reads context (e.g. selected count).

**Empty state:** `EmptyAttendees` ("No invites sent" · "Add invitees") only after sending zero; otherwise N/A in selection.

**Loading state:** Section refresh on banded list = 28px spinner top-right of section header.

**Error state:** ErrorToast `kind='invite'` — "Invites didn't send · X of N delivered. Retry?" (auto-dismiss 3200ms; Retry pill).

**Edge cases:**
- 50+ invitees → grid collapses to first 8 + "+N more" pill (opens AttendeesSheet).
- No availability set on user → footer reads "FROM YOUR AVAILABILITY · NOT SET" mono ink3 (no banner, no chip).
- Single friend in app → FilterChipRowMulti hides chips when < 2 categories.

**Haptics:**
- Filter chip toggle → light
- "Send invites" → medium
- Send success (Confirm screen lands) → success
- Invite failure → error (with toast)
- Long-press friend chip carousel arms at 450ms → heavy

**Navigation:** push `Confirm` on success.

**Hard rules:** Hard Rule 1 (banded availability viz LOCKED), Hard Rule 2, R5-1.

---

### Step 3 (Invite — WIRE-BACK variant)

**Round introduced:** R4
**Route name:** `Step3` (rendered as `Step3InviteWired` when `Draft.eventIso` is in the AvailabilityEntry map)
**Tab:** Modal

Same FlowHeader / ProgressBar / banded list / FilterChipRowMulti as Standard, PLUS:

**Layout addition (top of body, above the banded list):**

- When `AvailabilityEntry[draft.eventIso] === 'busy'`:
  **Danger banner card** (dangerSoft fill, popInk text), `role="alert"` announce-on-mount:
  > "You marked this day Not available — From your availability — tap to override."
- When `'free'` or `'maybe'`:
  **Subtle bgElevated chip** with mono overline + state dot (AvailDot — paired per R5-1):
  > "YOUR DAY · AVAILABLE" (free) or "YOUR DAY · MAYBE" (maybe)
- Footer status pill reads **"FROM YOUR AVAILABILITY"** (mono).

**Loading state:** Same as Standard.
**Error state:** Same as Standard.

**Edge cases:**
- No availability for the day → footer reads "FROM YOUR AVAILABILITY · NOT SET" (mono ink3) — no banner, no chip.

**Haptics:**
- All Standard haptics PLUS:
- warning fires when busy day banner appears.

**Navigation:** Same as Standard. Banner has tap-to-override → opens Availability Editor for that day.

**Hard rules:** Hard Rule 17 (wire-back banner), R5-1 (chip pairs dot + text), Hard Rule 1 (banded list still locked).

---

### Confirm screen

**Round introduced:** R2
**Route name:** `Confirm`
**Tab:** Modal

**Layout (top → bottom):**
1. **FlowHeader** — title empty / collapsed; close button on right.
2. **ConfirmCard** — hero card with glyph, title (h2), date/time, location, optional description.
3. **Action row** — "Done" PillBtn primary → dismiss modal stack; secondary "View event" → push EventDetail.

**Empty state:** N/A (terminal screen of flow).
**Loading state:** N/A (renders post-success).
**Error state:** ErrorState `kind='server'` if final create call fails after invite send.

**Haptics:** **success** fires on screen mount (Event created — canonical mapping). Cover photo saved / Group created (when reused) → success.

**Navigation:**
- "Done" → dismiss modal back to whichever tab opened it.
- "View event" → dismiss modal, push `EventDetail` on the previously active stack.

**Hard rules:** Hard Rule 3 (no emoji / no generic gradients in hero).

---

### Event Detail (with RSVP sheet)

**Round introduced:** R2
**Route name:** `EventDetail`
**Tab:** Home (HomeStack); also reachable from Group Detail Events tab

**Layout (top → bottom):**
1. **FlowHeader** — back; title "Event"; right slot "Edit" (admin only).
2. **EventDetailCard** — glyph + title (h2, 2-line clamp R5-6) + date pill + location + MiniMap + description (3-line clamp + Read more, R5-6).
3. **Attendees section** — SectionHeader "Going" + horizontal RingAvatar grid; collapses 50+ → first 8 + "+N more" pill (opens AttendeesSheet).
4. **RSVP CTA** — sticky bottom PillBtn primary "RSVP" → opens `RSVPSheet`.

**Empty state:** Attendees: `EmptyAttendees` if zero invites; otherwise N/A.
**Loading state:** Route-level `<LoadingOverlay caption="LOADING ·"/>` on first mount.
**Error state:** ErrorState `kind='notFound'` if event id missing ("Can't find that — The link may have expired"); ErrorToast `kind='rsvp'` on RSVP failure (Sub: "Tap retry — your choice is saved locally").

**Edge cases:**
- 50+ attendees → collapse pill.
- Long title → 2-line clamp.
- Long description → 3-line clamp + Read more.

**Haptics:**
- RSVP Yes/Maybe/No confirmed → medium (in RSVPSheet)
- RSVP failed → error (with toast, H-5)
- Tap "Read more" → light

**Navigation:**
- Tap RSVP → present `RSVPSheet` (sheet up 280ms spring, rubber-band @100px).
- Tap "+N more" → present AttendeesSheet.
- Edit (admin) → push edit flow (deferred / not specified in ANCHOR).

**Hard rules:** R5-1 (RSVP must show dot + label), R5-3 (MiniMap stays static — no parallax), R5-6 (truncation rules).

---

## Friends section

### Friends List

**Round introduced:** R3
**Route name:** `FriendsList`
**Tab:** Friends

**Layout (top → bottom):**
1. **FlowHeader** — title "Friends. {N}" (h1 = 28/800/-1.0).
2. **SegmentedSwitcher** — **Friends · Groups · Messages** (3-way, carousel-wraps both directions per R17-1). Items 3–5 below describe the **Friends** segment; the **Groups** segment renders the group list (see Groups section) and the **Messages** segment renders the inbox (R17-2).
3. **FilterChipRowMulti** — filter by FriendType (Friends segment).
4. **Body** — `StaggerList`-wrapped list of friend rows: RingAvatar + name (1-line ellipsis R5-6) + handle (mono 1-line ellipsis R5-6) + CategoryBadge + trailing chevron.
5. **Floating "+" / Scan FAB** — opens AddFriend.

**Empty state:** `EmptyFriends` ("No friends yet" · "Add one" + "Share QR").
**Loading state:** `<LoadingOverlay/>` on first mount; section spinner on refresh.
**Error state:** ErrorToast `kind='friend'` on friend-action failure.

**Edge cases:**
- Long friend name / handle → ellipsis (R5-6).
- Single friend → no FilterChipRowMulti chips (< 2 categories).

**Haptics:**
- Tab/Filter change → light
- Tap row → light
- StaggerList entrance → no haptic (H-3: never on auto entrance)

**Navigation:**
- Tap row → push `FriendProfile`.
- Tap "+" → push `AddFriend`.
- Tap "Friend types" entry (in profile menu or settings) → push `FriendTypesManager`.

**Hard rules:** R5-6, R5-1 (rows that show availability state pair AvailDot + label), Hard Rule 2.

---

### Add Friend (QR / Link / Username)

**Round introduced:** R3
**Route name:** `AddFriend`
**Tab:** Friends (FriendsStack)

**Layout (top → bottom):**
1. **FlowHeader** — back; title "Add friend".
2. **SegmentedSwitcher** — QR / Link / Username (drives mode).
3. **Body per mode:**
   - **QR** → `QRArt` card centered (qrCard shadow); below: "Scan a friend's code" caption.
   - **Link** → shareable link field + "Copy" / "Share" PillBtns.
   - **Username** → FormField + "Search" PillBtn primary.

**Empty state:**
- Username search returns nothing → `EmptySearch` ("Nothing matched" · secondary "Invite by handle").

**Loading state:** Search → `<ButtonLoading label="Searching…"/>`.
**Error state:** ErrorToast `kind='friend'` on send failure.

**Haptics:**
- SegmentedSwitcher flip → light
- "Search" tap → medium
- Friend request accepted → success
- Friend request failed → error

**Navigation:**
- On successful add → back to FriendsList.

**Hard rules:** Hard Rule 3 (no generic gradients in hero), Hard Rule 2.

---

### Friend Profile

**Round introduced:** R3
**Route name:** `FriendProfile`
**Tab:** Friends

**Layout (top → bottom):**
1. **FlowHeader** — back; title "Profile".
2. **Profile card** — RingAvatar (ring colored by friend's current avail state, paired with AvailDot + text per R5-1) + name (h2) + handle (mono ink3) + CategoryBadge.
3. **StatTile row** — 4-up: HOSTED · ATTENDED · FRIENDS · GROUPS (uses Friend's stats subset).
4. **Friend types** — chips listing FriendType buckets this friend is in.
5. **Mutual events** — section listing past + upcoming shared events.
6. **Action row** — "Plan together" primary → opens Create Event prefilled; "Remove friend" → `TwoTapDestructive`.

**Empty state:** Mutual events empty → `EmptyMutualEvents` ("Nothing planned together" · "Plan an event").

**Loading state:** Route-level `<LoadingOverlay/>`.

**Error state:** ErrorState `kind='notFound'` if friend missing.

**Edge cases:**
- Long name / handle → R5-6.

**Haptics:**
- Friend type assigned (chip toggle here) → medium
- "Remove friend" arm → heavy; commit → success (H-4)

**Navigation:**
- "Plan together" → opens CreateEventStack with prefilled invitee.
- Back → FriendsList.

**Hard rules:** Hard Rule 7 (TwoTapDestructive), R5-1, R5-6.

---

### Friend Types Manager

**Round introduced:** R3
**Route name:** `FriendTypesManager`
**Tab:** Friends

**Layout (top → bottom):**
1. **FlowHeader** — back; title "Friend types"; right slot "+ Add type".
2. **List of FriendType cards** — each shows label + N members + edit affordance.
3. **Per type detail (sheet/screen on tap)** — list of friends, toggle membership, rename, delete (TwoTapDestructive).

**Empty state:** Reuses `EmptyStateBlock`-style messaging if zero types.

**Loading state:** Route-level `<LoadingOverlay/>`.

**Error state:** ErrorToast `kind='generic'`.

**Haptics:**
- Friend type assigned → medium
- Type deletion arm → heavy; commit → success

**Navigation:**
- Back → FriendsList or Profile (caller).

**Hard rules:** Hard Rule 7 (TwoTapDestructive on delete), Hard Rule 8 (Friend Type is PRIVATE — never confused with Social Group), Hard Rule 11 (PrivateBadge sparingly — screen title states privacy so omit per-row badge).

**Open question:** Friend Types support nested/overlapping membership? (still open from R3) — implementation must allow membership-list multi-select for now.

---

## Groups section

> **Placement (locked):** these screens live in the **Friends tab** (`FriendsStack`), surfaced via the **Groups segment** of the FriendsList SegmentedSwitcher (TAB BAR IA + R17-1). Groups is NOT a separate bottom tab. The group-list view (below) renders as the Groups-segment body.

### Groups List

**Round introduced:** R3
**Route name:** `GroupsList`
**Tab:** Friends (Groups segment)

**Layout (top → bottom):**
1. **FlowHeader** — title "Groups. {N}".
2. **SegmentedSwitcher** — All / Mine / Joined (or similar).
3. **Body** — `StaggerList` of group cards: CoverArt + group name (h3, 2-line clamp on cards per R5-6) + member count + PrivateBadge if private (sparingly per Hard Rule 11).
4. **Floating "+" FAB** — opens CreateGroup.

**Empty state:** `EmptyGroups` ("No groups yet" · "Create one").
**Loading state:** `<LoadingOverlay/>` on first mount; section spinner on refresh.
**Error state:** ErrorState `kind='network'` full-screen; ErrorToast `kind='generic'` for action failures.

**Edge cases:**
- Group of 1 still appears.
- Long group name → 2-line clamp on card.

**Haptics:**
- Tab change → light
- Card tap → light
- Group created → success

**Navigation:**
- Tap card → push `GroupDetail`.
- Tap "+" → push `CreateGroup`.

**Hard rules:** Hard Rule 11, R5-6.

---

### Create Group

**Round introduced:** R3
**Route name:** `CreateGroup`
**Tab:** Friends (FriendsStack · pushed from the Groups segment)

**Layout (top → bottom):**
1. **FlowHeader** — back; title "New group".
2. **CoverArt picker entry** — tile that opens `CoverPickerSheet`.
3. **FormField** — group name.
4. **Toggle** — "Private" (renders PrivateBadge later only where privacy isn't already screen-stated).
5. **Footer pill** — "Create" PillBtn primary.

**NOTE:** Invite flow is NOT here. Invites live in Group Detail > AdminBar (Hard Rule 10).

**Empty state:** N/A.
**Loading state:** Footer → `<ButtonLoading label="Creating…"/>`.
**Error state:** ErrorToast `kind='generic'` on create failure.

**Haptics:**
- Toggle "Private" → medium
- "Create" → medium
- Group created (success animation) → success
- Cover photo saved → success

**Navigation:**
- Tap CoverArt picker → present `CoverPickerSheet` (sheet up 280ms spring).
- "Create" success → push `GroupDetail` for the new group.

**Hard rules:** Hard Rule 10 (no invites here), Hard Rule 8 (group is SHARED).

---

### Group Detail (Members / Events / Polls / Ideas + AdminBar)

**Round introduced:** R3
**Route name:** `GroupDetail`
**Tab:** Friends (FriendsStack · pushed from the Groups segment)

**Layout (top → bottom):**
1. **AdminBar** (sticky top) — visible when `userRole === 'admin'` (Hard Rule 9). Hosts invite flow + group settings (Hard Rule 10).
2. **FlowHeader** — back; title = group name (single-line in headers per R5-6); right "Edit" (admin).
3. **Hero** — CoverArt + group meta (member count + PrivateBadge if not stated by title context).
4. **TabPills** — Members / Events / Polls / Ideas (light haptic on change).
5. **Tab body:**
   - **Members** → list of GroupMember rows (RingAvatar + name + role badge). Single-friend group → YOU row only (Edge case: group of 1).
   - **Events** → upcoming + past events; tap row → push `EventDetail`.
   - **Polls** → list of `PollRow`; "Start a poll" CTA at bottom.
   - **Ideas** → list of `SuggestionRow`; "Suggest one" CTA.
6. **PlanningModeToggle** — accessible somewhere on screen (per Round 3 module exports).

**Empty states (per tab):**
- Members → never empty (you exist; group of 1 renders YOU).
- Events → reuse EmptyHome week/month-ish "Quiet week" or `EmptyMutualEvents` analogue.
- Polls → `EmptyPolls`.
- Ideas → `EmptySuggestions`.
- Group of 1 edge case explicitly: polls/ideas tabs render their Empty* states.

**Loading state:** Route-level `<LoadingOverlay/>`; per-tab section spinner.

**Error state:** ErrorState `kind='permission'` if non-member tries to view ("Can't do that — You don't have permission for this group"); ErrorToast `kind='generic'` for action failures.

**Edge cases:**
- Group of 1 → AdminBar still shown; Polls / Ideas show Empty*.
- 50+ members → list paginates / collapses; long names ellipsis (R5-6).
- Long group name → 2-line on cards / 1-line in headers (R5-6).

**Haptics:**
- TabPills change → light
- Invite send (from AdminBar) → medium
- Invites sent OK → success
- Invite failed → error (toast)
- TwoTapDestructive (e.g. remove member) → heavy → success

**Navigation:**
- Members row → push FriendProfile (if non-self).
- Events row → push EventDetail.
- Tap "Invite" in AdminBar → opens invite picker (uses AdminInviteRow).
- Back → FriendsList (Groups segment).

**Hard rules:** Hard Rules 8, 9, 10, 11 (PrivateBadge sparingly), R5-6.
**Open question:** Group Detail AdminBar collapsing on scroll — deferred. Implement non-collapsing for now.

---

### Cover Picker Sheet

**Round introduced:** R3
**Route name:** `CoverPickerSheet`
**Tab:** Friends (FriendsStack · modal sheet in the group flow)

**Layout (top → bottom):**
1. **38×4 grab handle** + sheet header "Choose cover" (h3).
2. **Grid of CoverArt tiles** — selectable.
3. **Footer "Done" pill** — accent.

**Empty state:** Catalog never empty (bundled).

**Loading state:** Sheet body spinner = 32px centered, no caption.

**Error state:** Inline message if save fails; ErrorToast `kind='generic'`.

**Haptics:**
- Tile select → light
- "Done" → medium
- Cover photo saved → success

**Navigation:** Dismisses back to CreateGroup or GroupDetail (caller).

**Hard rules:** Sheet up 280ms spring (rubber-band @100px).

---

## Profile section

### Profile & Settings

**Round introduced:** R4
**Route name:** `ProfileSettings`
**Tab:** Profile

**Layout (top → bottom):**
1. **FlowHeader** — title "Profile".
2. **Profile card** — 72px RingAvatar (status="free") + 28px accent edit FAB overlay; name (h2 = 22/800); handle (mono ink3); top-right "Edit" pill. Bio (13/ink2). 4-up StatTile row: HOSTED · ATTENDED · FRIENDS · GROUPS.
3. **AVAILABILITY** group (`SettingsGroup`):
   - SettingsRow → "Availability editor" (chevron).
   - SettingsRow → "Broadcast settings" with sub "N of 3 active".
4. **ACCOUNT** group: Email · Phone · Change password rows.
5. **NOTIFICATIONS** group: 6 toggle rows (one per `NotificationSettings` field).
6. **PRIVACY** group: "Who can find me" (FindableBy) · "Who can invite me" (InvitableBy).
7. **APPEARANCE** group: ThemePicker (inset).
8. **SUPPORT** group: "Help & support" row.
9. **Bottom card** — destructive "Log out" SettingsRow (single-row exception to Hard Rule 7 — triggers OS-level confirm in production, not a TwoTapDestructive).
10. **Footer mono** — "SYNCUP · 2.2.0" (overline scale).

**Empty state:** N/A.
**Loading state:** Route-level `<LoadingOverlay/>`.
**Error state:** ErrorToast `kind='generic'` for save failures (e.g. notification toggle fails).

**Edge cases:**
- Long bio → respect cards / no truncation specified beyond standard wrap.
- All toggles off → still renders (no special state).

**Haptics:**
- Toggle (any notification or broadcast) → medium
- Tap edit FAB → light
- Tap Log out → behaves like single-tap destructive (no two-tap; OS confirm in prod)

**Navigation:**
- "Availability editor" → push `AvailabilityEditor`.
- "Broadcast settings" → push `BroadcastSettings`.
- "Edit" pill → opens edit profile (deferred / not specified).
- "Help & support" → external (deferred).

**Hard rules:** Hard Rule 16 (SettingsRow renders `<div>` when no onClick — Notification rows have Toggle trailing and no onClick), Hard Rule 7 + exception (Log out).

---

### Availability Editor (Month / Week / Day)

**Round introduced:** R4
**Route name:** `AvailabilityEditor`
**Tab:** Profile

**Layout (top → bottom):**
1. **FlowHeader** — back; title "Availability".
2. **Mode tabs** (Month/Week/Day) + 38px broadcast shortcut button (radio icon) on the right.
3. **Optional onboarding hint card** — accentSoft fill, dismissible by tweak.
4. **BrushPicker** — Free / Maybe / Not available / Clear.
5. **Body per mode:**
   - **Month** → `MonthGrid`
   - **Week** → `WeekView`
   - **Day** → `DayView`
6. **QUICK-SET** overline + 2×2 `QuicksetGrid`.
7. **Empty state slot** — when avail map is empty: dashed `EmptyStateBlock` ("Set your first day" / "Try a Quickset" secondary) under Quickset grid.

**Empty state:** `EmptyAvailability` (per inventory) under Quickset grid when map is empty.

**Loading state:** Route-level `<LoadingOverlay/>` on first mount.

**Error state:** ErrorToast `kind='generic'` on save failure (optimistic write rolls back if not retried).

**Edge cases:**
- Day-cell drag-paint = 0ms instant 1:1 finger tracking.
- StaggerList NOT applied to MonthGrid (would feel laggy).

**Haptics:**
- Mode tab change (Month/Week/Day) → light
- BrushPicker change → light
- Day cell tap-to-set (single) → light
- Day cell drag-paint enter → light
- Drag-paint hits already-set day with same brush → heavy (no-op feedback)
- Quickset applied → medium
- "Applied" confirmation (1600ms) → success
- Quickset overwrites >5 existing days → warning
- Broadcast shortcut tap → light

**Navigation:**
- Broadcast shortcut button → push `BroadcastSettings`.
- Back → ProfileSettings.

**Hard rules:** Hard Rule 14 (clear deletes the key — never persists null), Hard Rule 15 (Quicksets are pure scoped functions), R5-2 (no skeletons), A-5 (44pt day cell hit area).

**Open question:** Availability Hub layout — Options A (single scroll), B (top tabs), C (inline collapse — current pick). Must be re-confirmed with Director before this screen is built.

---

### Broadcast Settings (3-card stacked IA)

**Round introduced:** R4
**Route name:** `BroadcastSettings`
**Tab:** Profile

**Layout (top → bottom):**
1. **FlowHeader** — back; title "Broadcasts".
2. **Header overline + explainer** — "BROADCASTS · N ACTIVE" (mono overline) + 14/ink2 explainer text.
3. **Three stacked broadcast cards** (radius 16) — one per state (Free / Maybe / Busy):
   - **OFF state** (collapsed): state dot · TITLE overline (state name uppercase) · 12/ink3 body · `Toggle`. Card stays compact.
   - **ON state** (springs open with `flow-fade-up` 320ms):
     - SEND TO overline + `AudienceSwitcher` (Everyone / Friends / Types).
     - When audience is NOT 'everyone' → sheet preview row (chevron + truncated label + "Tap to edit") that opens `AudiencePickerSheet`.
     - "Preview toast" pill (test fire — 11/600/hair-bordered).
4. **Footnote**: "Broadcasts send once per status change, with a 60-second undo toast. Edit anytime."

**Empty state:** N/A (always 3 cards).
**Loading state:** Route-level `<LoadingOverlay/>`.
**Error state:** ErrorToast `kind='generic'` on save; "Broadcast send failed" → error haptic + toast.

**Edge cases:**
- Long audience-targets label → 1-line ellipsis on preview row (R5-6).

**Haptics:**
- Toggle on/off (broadcast) → medium
- AudienceSwitcher pill → light
- "Preview toast" tap → medium; resulting BroadcastToast → success
- Broadcast fired (real, not preview) → success
- Broadcast send failed → error

**Navigation:**
- Sheet preview row → present `AudiencePickerSheet` (mode='friends' or 'types').
- "Preview toast" → fires `BroadcastToast` (does NOT navigate).
- Back → ProfileSettings or AvailabilityEditor (caller).

**Hard rules:** Hard Rule 12 (3-card stacked IA LOCKED), Hard Rule 13 (BroadcastToast leading marker = state-colored dot), R5-1 (subtitle pairs dot + text label).

**Open question:** Broadcast toast tap-action — "review who's getting this" on the toast itself, or rely on Broadcast Settings as the single editor? Defer until Director resolves.

---

### Audience Picker Sheet

**Round introduced:** R4
**Route name:** `AudiencePickerSheet`
**Tab:** Profile (modal sheet)

**Layout (top → bottom):**
1. **38×4 grab handle.**
2. **Header** — title (17/800), "N selected" sub, accent "Done" pill.
3. **Body per mode:**
   - `mode='types'` → friend-type rows: PrivateBadge + label + "N members" + 22px checkbox.
   - `mode='friends'` → friend rows: RingAvatar + name + handle (mono) + CategoryBadge; selected state via `RingAvatar.selected`.

**Empty state:** Friends list empty → `EmptyFriends`; Types list empty → `EmptyStateBlock` with "No friend types · Create one" (secondary navigates to FriendTypesManager).
**Loading state:** Sheet body spinner = 32px centered, no caption.
**Error state:** ErrorToast `kind='generic'` on save fail.

**Haptics:**
- Row toggle → light
- "Done" → medium

**Navigation:**
- "Done" → dismiss sheet, write `targets` array to BroadcastRule.
- Tap outside / grab handle drag → dismiss without save (or apply optimistic per-toggle, depending on impl).

**Hard rules:** Hard Rule 11 (PrivateBadge appears on type rows since the sheet doesn't title-state privacy), Hard Rule 8 (Friend Type vs Social Group never confused).

---

## Cross-Screen Patterns

### Loading
- Route-level: always `<LoadingOverlay/>` on first mount (L-1 ≤120ms exception allowed).
- Section refresh: 28px Spinner top-right of section header (no caption).
- Sheet body: 32px Spinner centered.
- Buttons: `<ButtonLoading/>` swap.
- NEVER skeletons (R5-2). NEVER nested spinners (L-4). NEVER per-row spinners (L-2).

### Errors
- Toast preempts banner; full-screen preempts both (E-1).
- Body copy never includes status codes (E-3).
- Always offer recovery (E-4).

### Offline
- OfflineBar slides down from FlowHeader on disconnect.
- Cached overline ("LAST SYNCED · 4M AGO") on Home.
- Optimistic writes; rollback only after user dismisses ErrorToast without Retry.

### Reduced motion (A-11)
- Spring overshoot disabled.
- `flow-fade-up` replaced with simple opacity fade (200ms easeOut).
- Stagger disabled (all-at-once).
- Spinner rotation kept.

---

## Messaging (R18 — built 2026-06-04, branch `r18-messaging-build`)

> Caveat: R17-1's Friends·Groups·Messages top-level carousel is NOT yet
> consolidated. The inbox ships as a reachable `Messages` route (FriendsList
> header "Messages" pill); folding GroupsList + the inbox under one
> SegmentedSwitcher is the open R18 follow-up (R18-PLAN.md "Build notes").

### Messages (inbox) — `MessagesScreen`
**File:** `src/screens/friends/MessagesScreen.tsx` (FriendsStack route `Messages`). R17-1/R17-2.
- Layout: FlowHeader "Messages" → list of `InboxRow` (newest first, archived excluded).
- Loading: spinner only (R5-2). Empty: `EmptyMessages` (NO-CTA, R17-2). Error: `ErrorState kind="server"`.
- Row tap: DM/group → `MessageThread`; event → HomeTab → `EventChat` (D2). Light haptic.

### Message thread (DM / group) — `MessageThreadScreen`
**File:** `src/screens/friends/MessageThreadScreen.tsx` (FriendsStack route `MessageThread { conversationId, type }`). R17-4…R17-8.
- Thin wrapper over `ChatThreadView`; group subtitle = member count.

### Event chat — `EventChatScreen`
**File:** `src/screens/events/EventChatScreen.tsx` (HomeStack route `EventChat { conversationId, eventId }`). R17-4…R17-8 / D2.
- Thin wrapper over `ChatThreadView`; subtitle = "Event chat". Reached from EventDetail (host-enabled) or a message notif card.

### Entry points
- **DM (R17-9):** `FriendProfileScreen` "DM" button → `useGetOrCreateDirect` → `MessageThread` (promoted from the R16-9 stub).
- **Inbox:** FriendsList header "Messages" pill → `Messages`.
- **Notif (M4):** message notif cards route straight to the thread, sheet dismissing concurrently, medium haptic (R17-11 / R12-1).

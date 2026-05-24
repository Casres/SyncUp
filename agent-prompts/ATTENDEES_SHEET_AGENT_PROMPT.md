# Frontend — AttendeesSheet R15 Extension Agent Prompt

> **You are the Frontend / AttendeesSheet R15 agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — apply the Round 15 hard rules (R15-1 through R15-6) to the existing `AttendeesSheet` and `QuickProfileSheet` components, plus wire row-tap → QuickProfileSheet from AttendeesSheet and from the Search overlay's PEOPLE row. You are **updating components that already exist**, not building from scratch. You do not invent behavior, you do not redesign anything, and you do not extend the spec.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following components are already on disk and tsc-clean:

| Component | File | Status |
|---|---|---|
| AttendeesSheet | `src/components/social/AttendeesSheet.tsx` | Built for R10 + R11. Header has search-magnifier-reveal (R15-4) wiring already partially present (see `searchQuery` state). Filter chips exist via `FilterChipRow`. NO RSVP grouping with HOSTS pinned yet. NO offline state. |
| AttendeeRow | `src/components/social/AttendeeRow.tsx` | Built per R10-7. Currently has CO-HOST chip support. Needs HOST chip support. Row-tap currently routes to FriendProfile (R10-7 pre-R15) — must be REWIRED per R15-1 to open QuickProfileSheet instead. |
| QuickProfileSheet | `src/components/social/QuickProfileSheet.tsx` | Built per R12-5 / R12-6 for the non-friend variant. Single CTA-block ("Add friend" / "Requested" / Accept+Decline). Needs the R15-2 friend variant (status-ringed avatar + Friend Type chip in place of CTA block). |
| SearchOverlay | `src/components/social/SearchOverlay.tsx` | Built. Currently calls `onNavigateToFriendProfile`. The PEOPLE row body tap should open QuickProfileSheet (R12-5 pre-existing + R15-1/R15-2) — likely a TODO in the file. Verify before wiring. |
| PeopleResultRow | `src/components/social/PeopleResultRow.tsx` | Built. Already supports the "Add" pill flow per R8-7. |
| FilterChipRow | `src/components/eventFlow/FilterChipRow.tsx` | Re-use. Do not modify. |
| OfflineBar | `src/components/polish/OfflineBar.tsx` | Re-use. Already used by NotifSheet per R13-2. |
| StaggerList | `src/components/polish/StaggerList.tsx` | Re-use for offline reconnect (R15-6 list refresh). |
| RingAvatar | `src/components/foundation/RingAvatar.tsx` | Re-use. Status ring is gated on a prop — passing `null` hides it (non-friend variant). |
| PillBtn | `src/components/foundation/PillBtn.tsx` | Re-use. |

**Read these files before writing any code:**

- `ANCHOR-DESIGN.txt` (monorepo root) — full design spec at **v3.5**. R15-1..R15-6 hard rules live at lines 9–161. The ATTENDEESSHEET SURFACE (Round 15) section starts at line 1079. The Round 15 haptic additions live at line 1157.
- `CLAUDE.md` (monorepo root) — state management rules.
- `FRONTEND-HANDOFF.txt` (monorepo root) — GAP 3 background (R10 + R11 reference; R15 supersedes where they overlap).
- `social-calendar-mobile/src/components/social/AttendeesSheet.tsx` — read fully; note current state structure (`rsvpFilter`, `typeGroupFilter`, `searchQuery`, `armedRowId`) and the existing filter pipeline so your edits are surgical.
- `social-calendar-mobile/src/components/social/AttendeeRow.tsx` — note current row anatomy and the existing CO-HOST chip implementation. R15-3 adds a HOST chip in the same position.
- `social-calendar-mobile/src/components/social/QuickProfileSheet.tsx` — note the current variant assumption (non-friend only). R15-2 adds a friend variant.
- `social-calendar-mobile/src/components/social/SearchOverlay.tsx` — locate the PEOPLE row body-tap call site (likely a `// TODO(quick-profile-sheet)` comment). R15-1/R15-2 mean this is now the live destination.
- `social-calendar-mobile/src/screens/events/EventDetailScreen.tsx` — confirms how AttendeesSheet is currently opened (the "Attendees" affordance). No changes needed here unless the open call passes incorrect props post-update.
- `TYPES.ts` (monorepo root) — `Event`, `Friend`, `FriendType`, `RSVPStatus`, `SocialGroup`, `AvailState`. `FriendType.members[]` is the source of truth for R15-2 variant resolution (a target is a "friend" iff they appear in any FriendType the local user owns — per R7-3 each friend belongs to exactly ONE FriendType).

---

## Non-Negotiable Contracts

These rules are locked. Do not deviate.

### 1. State management: React Query for cache, `useState` for local UI

```ts
// ✅ correct — attendee list lives in React Query (caller supplies it)
const { data: attendees } = useEventAttendees(eventId);

// ✅ correct — sheet-local UI state (search query, armed row, search reveal toggle)
const [searchRevealed, setSearchRevealed] = useState(false);
const [searchQuery, setSearchQuery] = useState('');

// ❌ wrong — no Zustand
```

From `CLAUDE.md`: API response data → React Query. Local UI state → `useState`. **There is no Zustand in this project. Do not add it.**

### 2. No hardcoded design values

Every color, font size, spacing value, border radius, and duration comes from `src/theme/`. No `#FFFFFF`, no `fontSize: 15`, no `borderRadius: 12` in any file you create or modify.

### 3. Haptics via `useHaptic()` only

The R15 haptic table for AttendeesSheet (ANCHOR line 1157) is reproduced in the Haptic Map section below. Use that as the authoritative source.

### 4. R15-1 through R15-6 are non-negotiable

These rules are Director-locked. Do not soften, extend, or "improve" them. R15-1 **supersedes** the "Tap row → Friend Profile" clause in R10-7. R15-2 **supersedes** the R12-5 single-variant assumption for QuickProfileSheet. R15-3 **adds** RSVP grouping on top of the existing R10 sort. Where this prompt and the anchor disagree, the **anchor wins**. Stop and escalate.

---

## Files to Modify (and the One File to Create)

```
MODIFY  src/components/social/AttendeesSheet.tsx
  - Add RSVP grouping + HOSTS-pinned sections (R15-3)
  - Wire search reveal/exit + header swap (R15-4) if not fully present
  - Make filter chip bar sticky on scroll (R15-5)
  - Add offline state (OfflineBar + SYNCED sub-line + disabled actions) (R15-6)
  - Replace row-tap → FriendProfile with row-tap → openQuickProfileSheet (R15-1)
  - Pass viewer's currentUserId so the self-row tap is suppressed (R15-1)

MODIFY  src/components/social/AttendeeRow.tsx
  - Add HOST chip support (R15-3): same anatomy as the existing CO-HOST chip
  - Add an "isHost" prop the parent passes based on event.hostId vs row.userId
  - Suppress tap (no haptic, no callback) when row.userId === currentUserId (R15-1)

MODIFY  src/components/social/QuickProfileSheet.tsx
  - Add the R15-2 friend variant:
    - RingAvatar 64px shows the status ring (status comes from currentUser's view permission)
    - Replace the CTA block (Add/Requested/Accept+Decline) with a single non-interactive Friend Type chip when target is a friend
    - If target is untyped, OMIT the chip entirely (no placeholder)
  - Variant resolution: target is a friend iff present in any of currentUser's FriendType.members[] (R7-3)

MODIFY  src/components/social/SearchOverlay.tsx
  - Wire PEOPLE row body tap → openQuickProfileSheet (no longer the FriendProfile route)
  - Variant always = non-friend (people in PEOPLE results are by definition not yet friends) — but resolve via the same helper

MODIFY  src/api/queryKeys.ts
  - Add: attendees.eventOffline(eventId) for the lastSyncedAt timestamp lookup (R15-6 "SYNCED N AGO")

MODIFY  src/api/events.ts (or wherever useEventAttendees lives)
  - Expose lastSyncedAt for R15-6 (returns the React Query dataUpdatedAt from the hook)

CREATE  src/components/social/SearchInputBar.tsx
  - The inline search input revealed by R15-4 magnifier tap. Locked anatomy below.
  - Re-used potentially by other surfaces; keep it general but lean.

MODIFY  src/screens/events/EventDetailScreen.tsx (or whoever opens AttendeesSheet)
  - Pass the new `currentUserId` prop (already present per the existing AttendeesSheet props — verify)
  - Pass the new `onOpenQuickProfileSheet(person)` callback that mounts QuickProfileSheet over AttendeesSheet
  - Mount QuickProfileSheet alongside AttendeesSheet so the stacking works (R12-5: QuickProfileSheet stacks ON TOP of the host surface)

CREATE  src/components/social/ATTENDEES_SHEET_R15_HANDOFF.md (write LAST)
```

**Do not create new screen files. Do not create a separate AttendeesSheet variant** — extend the existing one.

---

## R15-3 · RSVP Grouping With HOSTS Pinned

The visible list becomes a single scrollable column with section overlines in this fixed order:

```
HOSTS                        ← no count
GOING (N)
MAYBE (N)
NOT GOING (N)
NO RESPONSE (N)
```

**Implementation:**

1. Before the existing filter pipeline returns its flat array, group the result by RSVP status. Then build a sectioned data structure:

```ts
type Section =
  | { kind: 'hosts'; rows: AttendeeRowData[] }
  | { kind: 'rsvp'; status: 'going' | 'maybe' | 'no' | 'none'; rows: AttendeeRowData[] };

function buildSections(
  filtered: AttendeeRowData[],
  hostId: string,
  coHostIds: string[],
  activeChipFilters: { rsvp: RsvpFilter; typeGroup: string },
): Section[] {
  // HOSTS section: host first, then co-hosts alphabetical by name (case-insensitive)
  const hostRow = filtered.find(r => r.userId === hostId);
  const coHostRows = filtered
    .filter(r => coHostIds.includes(r.userId))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const hostsSectionRows = [
    ...(hostRow ? [hostRow] : []),
    ...coHostRows,
  ];

  const sections: Section[] = [];

  // R15-3: HOSTS section is omitted entirely if no host/co-host matches the active filter
  if (hostsSectionRows.length > 0) {
    sections.push({ kind: 'hosts', rows: hostsSectionRows });
  }

  // RSVP sections — note hosts ALSO appear in their RSVP section (R15-3 explicit:
  // the row appears twice in the list with identical anatomy and identical tap behavior)
  const goingRows = filtered.filter(r => r.rsvp === 'yes');
  const maybeRows = filtered.filter(r => r.rsvp === 'maybe');
  const notGoingRows = filtered.filter(r => r.rsvp === 'no');
  const noResponseRows = filtered.filter(r => r.rsvp === null);

  if (goingRows.length > 0)     sections.push({ kind: 'rsvp', status: 'going', rows: goingRows });
  if (maybeRows.length > 0)     sections.push({ kind: 'rsvp', status: 'maybe', rows: maybeRows });
  if (notGoingRows.length > 0)  sections.push({ kind: 'rsvp', status: 'no',    rows: notGoingRows });
  if (noResponseRows.length > 0) sections.push({ kind: 'rsvp', status: 'none',  rows: noResponseRows });

  return sections;
}
```

2. Render the sections in order with a `<SectionList>` (or a `FlatList` with synthesized header rows; `FlatList` is fine if `SectionList` complicates the sticky-chip pattern from R15-5 — the existing component uses `FlatList` so prefer that for consistency).

3. **Key extraction** — engineering note from ANCHOR line 1152: `keyExtractor` must combine `row.id + section name` to permit the same person appearing under HOSTS AND their RSVP section without React key collisions:

```ts
keyExtractor={(item, index) => {
  if ('kind' in item) {
    // it's a section header row
    return `header-${item.kind}-${'status' in item ? item.status : ''}`;
  }
  return `${item.userId}-${currentSectionKey}-${index}`;
}}
```

4. **Section overline anatomy** (locked):
   - mono `typography.overline` 10/600 `T.ink3`
   - letter-spacing 1.6
   - 12px top padding, 6px bottom padding
   - 14px horizontal margin, left-aligned
   - RSVP overlines render `"{LABEL} ({N})"`; HOSTS overline is just `"HOSTS"` with no count
   - HOSTS overline taps are non-interactive (no haptic)

5. **HOST chip on the host row** (R15-3 anatomy):
   - 10/600 mono, `T.accentSoft` fill, `T.accent` text
   - `radii.full` (999)
   - 6×10 padding
   - right-aligned, 6px gap from RSVPBadge
   - Anatomy identical to the existing CO-HOST chip — extend `AttendeeRow` to accept `isHost?: boolean` and render either chip (or neither)

6. **Empty RSVP sections are omitted entirely.** Never render an overline with `(0)` below it. The HOSTS section is omitted if no host/co-host survives the active chip filter.

7. **RSVP section counts include hosts** (R15-3 explicit): if the host RSVPed Going, they count toward "GOING (N)". The row appears under both HOSTS and GOING.

**Forbidden (R15-3 explicit):**
- NEVER hide hosts from the RSVP sections — the double appearance is intentional
- NEVER merge HOSTS into GOING

---

## R15-4 · Search Reveal from Header Magnifier

The search affordance is a magnifying-glass icon-btn in the sheet header, immediately left of the Close X (or, in HOST/CO-HOST views, left of the "Invite more" pill, which sits left of Close X).

**Magnifier anatomy:**
- 20px (Ionicons `search`) `T.ink3`
- 44pt hit area
- A11y label "Search attendees"

**Tap behavior:**
- Fire `light` haptic
- Title-row collapse: animate the title block height to 0 over 200ms `easeStd` (use `withTiming`)
- A `<SearchInputBar />` slides into the freed area (200ms `easeStd`, translateY -8 → 0 + opacity 0 → 1)
- Magnifier swaps in-place to a "Cancel" text link: 13/500 `T.accent`, 44pt hit
- "Invite more" pill (HOST/CO-HOST views) is HIDDEN during search mode
- Close X remains visible (sheet dismiss is still available)

**SearchInputBar anatomy** (new component at `src/components/social/SearchInputBar.tsx`):
- Full-width pill, `radii.input` (12), height 44pt
- `T.bgSunken` background, `T.hair` 1px border
- Auto-focus on mount
- Leading 16px magnifier glyph `T.ink3`, 14pt left padding
- TextInput between: `typography.body` (15), `fonts.sans`, `T.ink`, placeholder color `T.ink3`, placeholder "Search attendees…"
- Trailing × icon-btn: only rendered when `value.length > 0`. Tap fires `light` haptic and clears value. 44pt hit. A11y label "Clear search".

**Props for SearchInputBar:**

```ts
export interface SearchInputBarProps {
  T?: Theme;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputRef?: React.Ref<TextInput>;
}
```

**While the search input has a non-empty query (R15-4):**
- Section overlines (HOSTS, GOING, MAYBE, NOT GOING, NO RESPONSE) are **HIDDEN entirely**
- All matching rows render in a single flat alphabetical list, sorted by name (case-insensitive, `localeCompare` with `sensitivity: 'base'`)
- Matching is case-insensitive against `name` AND `@handle`
- Hosts and co-hosts retain their HOST/CO-HOST chip but lose pinned position — sorting is strictly alphabetical
- The viewer's own row, if matched, is included in the flat list (still non-interactive per R15-1)

**Clearing the query (tap × or empty input):**
- Restores the grouped structure with HOSTS pinned (R15-3)

**Exiting search mode (tap "Cancel"):**
- Clears the query AND restores the title-row header
- Reverse the title-row collapse animation and slide SearchInputBar back out

**Composition with chip filters (R15-4 explicit):**
- The search input filters within whatever chip filter is active. Search and chips compose.

**Forbidden (R15-4 explicit):**
- NEVER fire a network request — search is purely local against the loaded list
- NEVER render section overlines during an active search
- NEVER auto-clear the search input when scrolling

**Haptic table for R15-4:**
- Magnifier tap (reveal) → `light`
- Cancel tap (exit) → `light`
- × clear inside input → `light`

---

## R15-5 · Sticky Chip Filter Bar

The chip filter bar (1 row for INVITEE/CO-HOST views, 2 rows for HOST view per R10-3 / R11-7) is sticky to the top of the sheet body as the list scrolls.

**Implementation options:**
1. If using `FlatList` (current code path), use `stickyHeaderIndices={[0]}` with the chip bar as the first item.
2. If using `SectionList`, render the chip bar as a custom ListHeaderComponent with absolute positioning is brittle — prefer option 1.

**Anchor rules:**
- The sheet header (title row OR SearchInputBar) remains pinned above the chip bar
- Chips do not transform, fade, or compress on scroll — they remain at full opacity and full height at every scroll position
- During an active search (R15-4): chips remain sticky AND remain interactive
- Reduced-motion: behavior unchanged (sticky positioning is not an animation)

**Forbidden (R15-5 explicit):**
- NEVER scroll the chip filter bar off-screen
- NEVER collapse the host's two-row chip stack into one row at any scroll position

---

## R15-6 · Offline State Mirrors NotifSheet

When the device loses network while AttendeesSheet is open, OR it is opened while offline:

**Render:**
1. `<OfflineBar />` immediately below the sheet header and above the chip filter bar. Re-use the existing component from `src/components/polish/OfflineBar.tsx`.
2. `"SYNCED {T} AGO"` sub-line directly below OfflineBar, in `fonts.mono` `typography.overline` 10/600 `T.ink3`. Format the relative time via the existing helper (look for `formatRelative` in `src/utils/` or `src/theme/`; if missing, use a small inline helper `formatSyncedAgo(date)`). **Omit the sub-line if the last sync time is unavailable.**
3. The attendee list remains visible — stale data is preferred over a blank state.

**Disabled actions while offline (opacity 0.4 · `pointerEvents='none'`):**
- "Invite more" pill (HOST + CO-HOST views, per R10-5 / R11-1a)
- The host's ⋯ menu items (R11-2) — the entire menu becomes non-tappable; tapping the ⋯ icon is a no-op with haptic SUPPRESSED (do NOT fire light)
- Any already-armed remove (R10-4 / R11-4) auto-cancels back to default state if network drops mid-arm; no commit fires

**Local actions remain active:**
- Scroll
- Chip filter taps
- Search reveal / clear (R15-4)
- Row tap → QuickProfileSheet (the profile data fetch may itself fail and surface its own loading/error state per R12-5)

**On reconnect (offline → online transition):**
- OfflineBar slides out (`su-slide-up` 240ms `easeStd`)
- Stale sub-line hides
- List refreshes via React Query invalidation: `queryClient.invalidateQueries({ queryKey: queryKeys.events.attendees(eventId) })`
- Any newly added attendees animate in via the existing `<StaggerList />`

**Detecting offline:** Use the existing offline detection pattern from NotifSheet — likely a `useNetworkState()` hook or React Query's `onlineManager`. If neither exists in shared code, plumb in a small `useIsOffline()` hook based on `@react-native-community/netinfo` (already a transitive dep via Expo, but verify). Flag in HANDOFF if you had to install it.

**Forbidden (R15-6 explicit):**
- NEVER show two OfflineBars simultaneously (E-1 unchanged — there's already one at the screen level; the sheet's OfflineBar replaces / takes precedence)
- NEVER blank the list while offline

---

## R15-1 / R15-2 · Row Tap → QuickProfileSheet (Terminal)

### R15-1 — AttendeesSheet row tap

Tapping any AttendeeRow body in AttendeesSheet opens QuickProfileSheet stacked above the sheet. The friend/non-friend variant is resolved at tap time (see R15-2).

**Implementation:**

1. Remove (or comment out as deprecated) the current `onRowTap → navigation.navigate('FriendProfile')` wiring in AttendeesSheet.
2. Replace with `onRowTap` calling a new prop callback `onOpenQuickProfile(person)`. The parent (EventDetailScreen) owns the QuickProfileSheet open state and mounts QuickProfileSheet alongside AttendeesSheet so the stacking visually works.
3. **Self-row guard (R15-1 explicit):** the viewer's own row renders normally (with their RSVPBadge visible to others) but tap is a NO-OP — no haptic, no callback fired. AttendeeRow already receives `currentUserId` or a `viewerRole`; gate the `Pressable`'s `onPress` on `row.userId !== currentUserId`.
4. Tap haptic: `light` (sheet-open per R12-5).
5. **Friend Profile routing from AttendeesSheet is deferred** — do not add a "See full profile" affordance. The sheet is TERMINAL in this round. If a backlog entry doesn't already exist, mention this in HANDOFF.

**Forbidden (R15-1 explicit):**
- NEVER navigate away from AttendeesSheet on row tap in this round
- NEVER stack QuickProfileSheet over a row owned by the viewer

### R15-2 — QuickProfileSheet two variants

Variant resolution: **friend** = the target appears in any of `currentUser`'s `FriendType.members[]` (R7-3 — disjoint membership, so a friend belongs to exactly one type). **Non-friend** = everyone else.

**Implementation:**

1. Create a small helper:

```ts
// inside QuickProfileSheet.tsx OR a shared util
export function resolveFriendVariant(
  targetUserId: string,
  friendTypes: FriendType[],
): { isFriend: boolean; friendTypeLabel: string | null } {
  for (const type of friendTypes) {
    if (type.members.some(m => m.id === targetUserId)) {
      return { isFriend: true, friendTypeLabel: type.label }; // e.g. "CLOSE FRIENDS"
    }
  }
  return { isFriend: false, friendTypeLabel: null };
}
```

2. Pass `friendTypes` (from the local user's profile cache, via `useFriendTypes()` or wherever the existing cache lives) into QuickProfileSheet. The variant is resolved at sheet-open time and held in local state for the lifetime of the sheet open.

3. **Friend variant differs ONLY in three ways from the non-friend variant (R12-5/R12-6 unchanged otherwise):**

   (a) `<RingAvatar size={64} status={availState} />` — status ring is SHOWN (viewer has permission per friendship — pass the `availState` from the resolved friendship record; if `availState` is null, pass null and the ring won't render).

   (b) The CTA block (R12-5: Add friend / Requested / Accept+Decline) is **REPLACED** by a single non-interactive Friend Type chip at the same vertical position:
   - 10/600 mono, `T.accentSoft` fill, `T.accent` text
   - `radii.full` (999)
   - 6×10 padding
   - Centered
   - Label = `friendTypeLabel` (e.g., "CLOSE FRIENDS")

   (c) If the target is untyped (R7-3 allows untyped friends), the chip is OMITTED entirely. No placeholder. No "UNTYPED" label. No empty pill outline. The CTA slot is just blank.

4. **Body content is identical to the non-friend variant** — mutual friends, bio, Hosted/Attended stats. Status ring stays on the avatar only.

5. **Both variants are TERMINAL per R15-1.** No "Message", no "View Shared Events", no "Remove Friend" in this surface. The R15 friend variant has only the chip (or nothing) in the CTA position.

**Forbidden (R15-2 explicit):**
- NEVER show Add/Requested/Accept/Decline controls in the friend variant
- NEVER show the status ring on the non-friend variant

### Wiring QuickProfileSheet under AttendeesSheet (R12-5 stacking)

QuickProfileSheet sits on TOP of AttendeesSheet. Backdrop is 30% black (intentionally lighter than the standard 42% because the host surface underneath is already opaque). The existing `QuickProfileSheet` already uses `BACKDROP_OPACITY = 0.3` — verify and leave alone.

EventDetailScreen (the parent) mounts:

```tsx
<>
  <AttendeesSheet
    open={attendeesOpen}
    event={event}
    attendees={attendees}
    currentUserId={me.id}
    friendTypes={friendTypes}
    groups={groups}
    onOpenQuickProfile={openProfile}
    // ... existing props ...
  />
  <QuickProfileSheet
    open={profileOpen}
    person={profileTarget}
    mutualFriends={mutualFriends}
    stats={profileStats}
    /* R15-2: */
    isFriend={profileVariant.isFriend}
    friendTypeLabel={profileVariant.friendTypeLabel}
    availState={profileVariant.availState ?? null}
    /* non-friend CTA block — only used when isFriend === false */
    friendRequestStatus={profileRequestStatus}
    onAddFriend={...}
    onAccept={...}
    onDecline={...}
    onClose={closeProfile}
  />
</>
```

The `QuickProfileSheetProps` interface needs the new fields:
- `isFriend: boolean`
- `friendTypeLabel: string | null`
- `availState: AvailState | null`

When `isFriend === true`, the existing `friendRequestStatus`/`onAddFriend`/`onAccept`/`onDecline` props are unused — keep them required to avoid type churn at call sites (callers pass empty no-op handlers).

### Wiring SearchOverlay PEOPLE row body tap

In `SearchOverlay.tsx`, locate the PEOPLE row body-tap handler (probably a `// TODO(quick-profile-sheet)` comment per the earlier GAP 2 prompt). Replace with:

```ts
function onPeopleRowBodyTap(person: PeopleResultPerson) {
  fire('light');
  setProfileTarget(person);
  setProfileOpen(true);
}
```

PEOPLE row targets are by definition non-friends (the search SQL filters them out of FRIENDS results). But still resolve via `resolveFriendVariant` for consistency — if a friend ever leaks into PEOPLE due to a stale cache, the friend variant will render correctly instead of a duplicate Add-friend pill.

QuickProfileSheet should be mounted by SearchOverlay itself (stacked on top), NOT routed through a parent screen — the search overlay is already at the root level. Keep the QuickProfileSheet in the same JSX tree.

---

## Haptic Map (Lifted from ANCHOR · AttendeesSheet Round 15 additions, line 1157)

| Event | Haptic | Where fired |
|---|---|---|
| Search reveal (magnifier tap) | `light` | AttendeesSheet header |
| Search exit (Cancel tap) | `light` | AttendeesSheet header |
| Search input clear (× tap) | `light` | SearchInputBar |
| Chip filter tap | `light` | existing — verify unchanged |
| Row tap → open QuickProfileSheet | `light` | AttendeeRow `onPress` (sheet-open per R12-5) |
| Self-row tap | NONE | AttendeeRow gates `onPress` on `row.userId !== currentUserId` |
| HOSTS section overline tap | NONE | non-interactive |
| Offline action attempt (disabled tap) | NONE | suppressed at `pointerEvents='none'` |
| PEOPLE row body tap → open QuickProfileSheet | `light` | SearchOverlay `onPeopleRowBodyTap` |

**Never** fire on:
- Mount/unmount of AttendeesSheet or QuickProfileSheet
- Scroll
- Sticky chip bar re-paint
- Variant resolution at sheet-open time

---

## A11y Checklist

| Element | Requirement |
|---|---|
| AttendeesSheet root | `accessibilityRole="dialog"` + `accessibilityViewIsModal={true}` |
| Section overlines | `accessibilityRole="header"`; non-focusable |
| HOST / CO-HOST chips | `accessibilityLabel="Host"` / `"Co-host"`; decorative for the row, NOT a separate tap target |
| Magnifier icon-btn | `accessibilityLabel="Search attendees"` |
| Cancel text link | `accessibilityLabel="Cancel search"` |
| SearchInputBar | `accessibilityLabel="Search attendees by name or handle"`; auto-focus on mount |
| Friend Type chip on QuickProfileSheet friend variant | decorative — `accessibilityElementsHidden={true}` (it's not an action) |
| Self-row | `accessibilityLabel={"This is you"}` + `accessibilityRole="text"`; no `Pressable` wrapper |
| Disabled actions while offline | `accessibilityState={{ disabled: true }}` so VoiceOver announces "dimmed" |
| OfflineBar | `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` (already on the existing component — verify) |

---

## Edge Cases — Apply Across the Surface

- **Single host, no co-hosts:** HOSTS section renders one row (the host). Still appears in their RSVP section below.
- **Co-host who didn't RSVP:** appears under HOSTS (alphabetical) AND under NO RESPONSE.
- **Host RSVPed "no":** appears under HOSTS AND under NOT GOING.
- **Active chip filter excludes hosts entirely:** HOSTS section is OMITTED (R15-3 explicit). RSVP sections render whatever rows survived the filter.
- **Search query active + chip filter active:** rows must satisfy BOTH filters. Result is a flat alphabetical list (R15-4 hides section overlines during active search). Host/co-host chips ride along with their rows.
- **Search query active + zero matches:** render `<EmptyAttendees />` inline below the chip bar (existing component). Title "No one matches." Sub "Try a different filter."
- **Offline + armed remove:** auto-cancel the armed row immediately (no haptic, no commit). On reconnect the row returns to its default state.
- **Offline + open QuickProfileSheet:** allowed. The profile data fetch surfaces its own loading/error state per R12-5; do not pre-emptively block the sheet from opening.
- **QuickProfileSheet friend variant + target's availState changes mid-session:** the avatar's status ring updates via React Query (mutual-friends cache, availability cache). No manual subscription needed.
- **QuickProfileSheet friend variant + target is untyped:** chip is omitted entirely. The vertical slot is empty (no spacer pill, no placeholder).
- **Re-tapping the same row that's currently open in QuickProfileSheet:** dismiss the sheet (`light` haptic) and reopen — this matches the natural close-on-second-tap pattern. **Actually verify by reading the existing sheet behavior — if double-tapping the same row is documented to be a no-op rather than re-open, follow the existing pattern. Flag in HANDOFF if you change it.**

---

## What NOT to Build

- A separate AttendeesSheet variant for R15 — extend the existing component (R15-3, R15-4, R15-5, R15-6 are additive)
- A "See full profile" affordance on QuickProfileSheet (R15-1 explicit — TERMINAL in this round)
- A Friend Profile route from AttendeesSheet (R15-1 explicit — deferred)
- A long-press menu, swipe action, or overflow on any row (R8-7 / R15-1 implicit — terminal sheet)
- A new "EmptyAttendees" variant — re-use the existing component
- A new EmptyNotifications-style inline empty state for QuickProfileSheet — its loading + error states already render per R12-5
- A separate offline-mode store — re-use the existing offline detection pattern from NotifSheet
- Any change to the existing CO-HOST chip anatomy — the new HOST chip is the SAME anatomy with a different label
- Any new dependency for fuzzy matching — search is case-insensitive substring on `name` and `@handle` only (R15-4)
- Any addition to Zustand (there is none — do not introduce it)

---

## Verification Steps

Before writing `ATTENDEES_SHEET_R15_HANDOFF.md`:

1. `cd social-calendar-mobile && npx tsc --noEmit` passes with zero errors.
2. Open AttendeesSheet on an event with: 1 host + 2 co-hosts + 5 other attendees with a mix of RSVPs. Verify HOSTS section renders host first, then co-hosts alphabetically. Verify each host/co-host ALSO appears in their RSVP section.
3. Apply a chip filter that excludes hosts (e.g., a Friend Type chip none of the hosts belong to). Confirm HOSTS section is OMITTED entirely.
4. Tap the magnifier. Confirm title row collapses, SearchInputBar slides in, "Cancel" replaces magnifier, "Invite more" pill is hidden. Type a query. Confirm flat alphabetical list, section overlines hidden, HOST/CO-HOST chips ride along on rows.
5. Tap Cancel. Confirm query clears, title row restores, magnifier returns, "Invite more" pill returns.
6. Scroll the body. Confirm chip filter bar stays pinned (R15-5). For HOST view, confirm both chip rows stay pinned together — no collapse.
7. Toggle offline (in dev, use the `useIsOffline` hook stub or `NetInfo.fetch`). Confirm OfflineBar renders below header above chip bar. Confirm "SYNCED N AGO" sub-line. Confirm "Invite more" disabled (opacity 0.4, pointer-events none). Confirm ⋯ tap is a no-op (no haptic). Confirm armed remove auto-cancels.
8. Toggle back online. Confirm OfflineBar slides out, list refreshes via invalidation.
9. Tap a non-self row. Confirm `light` haptic. Confirm QuickProfileSheet opens stacked above AttendeesSheet.
10. Tap the viewer's own row. Confirm NO haptic, NO sheet open.
11. Tap a row whose user is in one of the viewer's FriendTypes. Confirm QuickProfileSheet renders FRIEND variant: status-ringed 64px avatar, Friend Type chip in place of the CTA block, no Add/Requested/Accept/Decline controls.
12. Tap a row whose user is NOT in any FriendType. Confirm QuickProfileSheet renders NON-FRIEND variant: NO status ring, CTA block with Add/Requested/Accept+Decline per existing R12-5.
13. Tap a row whose user is an untyped friend (in no FriendType but with an accepted friendship). Confirm the chip is OMITTED entirely — slot blank.
14. In SearchOverlay, tap a PEOPLE row body. Confirm QuickProfileSheet opens stacked above SearchOverlay (NOT the FriendProfile route).
15. Grep for hardcoded `#` colors and bare `borderRadius:` numeric literals in files you touched — every value should reference `colors.*` or `radii.*`.

---

## Handoff Document

When all code is done and `npx tsc --noEmit` passes clean, write `src/components/social/ATTENDEES_SHEET_R15_HANDOFF.md`:

1. **What was modified vs. created** — table of files changed (M) or added (C) with a one-line summary per file
2. **R15 rule application** — for each of R15-1 through R15-6, one sentence describing where in the code the rule is enforced
3. **Section data structure** — the `Section` type and the `buildSections` helper signature; how `FlatList` `stickyHeaderIndices` is wired
4. **Search reveal animation** — describe the title-collapse + SearchInputBar reveal sequence, both for animation and for reduced-motion fallback
5. **Offline state** — describe how `useIsOffline()` is wired, where OfflineBar mounts in the JSX, and the disabled-action pattern
6. **QuickProfileSheet variant resolution** — describe the `resolveFriendVariant` helper, where it's called, and the prop additions to `QuickProfileSheetProps`
7. **Wiring summary** — diagram (ASCII or list) of: EventDetailScreen mounts AttendeesSheet + QuickProfileSheet siblings; AttendeesSheet rows → `onOpenQuickProfile` → parent opens sheet; SearchOverlay PEOPLE rows → its own QuickProfileSheet sibling
8. **Haptic map applied** — table of (event → haptic → file:line)
9. **Stub-phase deferrals** — list every `// TODO` left in code and what agent or future work owns each (Friend Profile drill-through from AttendeesSheet is the explicit one — backlog entry in `DESIGN-BACKLOG.txt`)
10. **Dependencies installed** — list anything added (e.g., `@react-native-community/netinfo` if needed)
11. **Open items for the Lead Manager** — anything cross-section: the contacts → matches stub vs. backend, the offline detection pattern (NotifSheet shares this), the second AvailState resolution path if friend variant ever needs to render non-stale presence
12. **Verification log** — confirm each of the 15 verification steps above passed

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors in `social-calendar-mobile/`
- [ ] AttendeesSheet renders RSVP-grouped sections with HOSTS pinned (R15-3)
- [ ] HOSTS section order: host first, then co-hosts alphabetical (R15-3)
- [ ] Hosts ALSO appear in their RSVP section (double-appearance intentional) (R15-3)
- [ ] HOST chip renders on host row in same anatomy as existing CO-HOST chip (R15-3)
- [ ] Empty RSVP sections are omitted entirely (R15-3)
- [ ] HOSTS section omitted if no host/co-host matches active chip filter (R15-3)
- [ ] Magnifier in header reveals SearchInputBar, title row collapses, Cancel replaces magnifier (R15-4)
- [ ] During active search: section overlines hidden, flat alphabetical list, HOST/CO-HOST chips travel with rows (R15-4)
- [ ] Chip filter bar is sticky on scroll (R15-5)
- [ ] HOST view 2-row chip stack stays as 2 rows at any scroll position (R15-5)
- [ ] Offline state renders OfflineBar + "SYNCED N AGO" sub-line, list stays visible (R15-6)
- [ ] Offline disabled: "Invite more" pill, ⋯ menu, auto-cancel armed remove (R15-6)
- [ ] On reconnect: OfflineBar slides out, list refreshes via React Query invalidation (R15-6)
- [ ] AttendeeRow tap → opens QuickProfileSheet stacked above AttendeesSheet (R15-1)
- [ ] Self-row tap: NO haptic, NO sheet open (R15-1)
- [ ] QuickProfileSheet friend variant: status-ringed avatar + Friend Type chip in place of CTA block (R15-2)
- [ ] QuickProfileSheet non-friend variant: NO status ring, existing CTA block per R12-5 (R15-2)
- [ ] Untyped friend: chip OMITTED, no placeholder (R15-2)
- [ ] SearchOverlay PEOPLE row body tap → QuickProfileSheet (non-friend variant) (R15-1 wire-in)
- [ ] All design values come from `src/theme/`; no hardcoded hex or px
- [ ] All haptics fire via `useHaptic()`; no direct `expo-haptics` imports
- [ ] API response data lives in React Query; local UI state via `useState`
- [ ] No Zustand introduced anywhere
- [ ] `ATTENDEES_SHEET_R15_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: AttendeesSheet R15 row → `COMPLETE (date)`

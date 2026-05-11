# GAP 2 — Search Overlay (R8-1 through R8-7)
# Spec: ANCHOR-DESIGN.txt Round 8
# Estimated time: ~60 minutes
================================================================

## AUTONOMOUS EXECUTION INSTRUCTIONS

Run start to finish without stopping. Spec is complete.
Make judgment calls consistent with existing codebase patterns.
Fix TypeScript errors and continue. Do not pause for confirmation.

================================================================
## MANDATORY PRE-FLIGHT — READ ALL BEFORE WRITING CODE

  ANCHOR-DESIGN.txt          (R8-1 through R8-7 + Search Surface section)
  FRONTEND-HANDOFF.txt       (GAP 2 section)
  TYPES.ts                   (repo root)
  social-calendar-mobile/src/theme/colors.ts
  social-calendar-mobile/src/theme/haptics.ts
  social-calendar-mobile/src/theme/motion.ts
  social-calendar-mobile/src/components/foundation/RingAvatar.tsx
  social-calendar-mobile/src/components/foundation/PillBtn.tsx
  social-calendar-mobile/src/components/foundation/FlowHeader.tsx
  social-calendar-mobile/src/components/social/CategoryBadge.tsx
  social-calendar-mobile/src/components/social/PrivateBadge.tsx
  social-calendar-mobile/src/components/social/CoverArt.tsx
  social-calendar-mobile/src/components/social/QuickProfileSheet.tsx
  social-calendar-mobile/src/components/emptyStates/EmptySearch.tsx
  social-calendar-mobile/src/components/polish/Spinner.tsx
  social-calendar-mobile/src/api/friends.ts
  social-calendar-mobile/src/api/events.ts
  social-calendar-mobile/src/api/groups.ts
  social-calendar-mobile/src/screens/home/HomeScreen.tsx
  social-calendar-mobile/src/navigation/types.ts

================================================================
## WHAT YOU ARE BUILDING

GAP 2 — Search overlay (R8-1 through R8-7).

A full-screen overlay that slides up over whichever screen opened it.
NOT a tab, NOT a route — a transient overlay controlled via context
or direct prop from its host screens (same pattern as NotifSheet).

Files to create:
  social-calendar-mobile/src/components/social/SearchOverlay.tsx
  social-calendar-mobile/src/components/social/FriendResultRow.tsx
  social-calendar-mobile/src/components/social/PeopleResultRow.tsx
  social-calendar-mobile/src/components/social/GroupResultRow.tsx
  social-calendar-mobile/src/components/social/EventResultRow.tsx
  social-calendar-mobile/src/components/social/RecentRow.tsx
  social-calendar-mobile/src/components/social/SearchContext.tsx

Files to update:
  social-calendar-mobile/src/screens/home/HomeScreen.tsx     (wire search icon)
  social-calendar-mobile/src/components/index.ts              (exports)

================================================================
## BUILD ORDER

  STEP 1 — SearchContext
  STEP 2 — Result row components (5 small components)
  STEP 3 — SearchOverlay main component
  STEP 4 — Wire entry points
  STEP 5 — TypeScript check
  STEP 6 — Exports

================================================================
## STEP 1 — SearchContext

File: social-calendar-mobile/src/components/social/SearchContext.tsx

Same pattern as NotifSheetContext. Provides open/close control so
any screen can open search without prop-drilling.

  interface SearchContextValue {
    open: boolean;
    openSearch: () => void;
    closeSearch: () => void;
  }

  export const SearchContext = createContext<SearchContextValue>(...);
  export function SearchProvider({ children }): JSX.Element  — wraps
    children with open state + light haptic on openSearch.
  export function useSearch(): SearchContextValue  — convenience hook.

Mount SearchProvider in App.tsx (or RootNavigator) at the same level
as NotifSheetContext. Read RootNavigator.tsx to find the right spot
before modifying it.

================================================================
## STEP 2 — RESULT ROW COMPONENTS

All rows: min-height 64 · full-width · bgElevated (default) ·
light haptic on tap (medium when navigating across screens — see per-row notes).
All text: never hardcode hex — use T.* tokens.

─────────────────────────────────────────────
FriendResultRow({ T, friend: Friend, onPress })
─────────────────────────────────────────────
  RingAvatar 40px WITH status ring (friend.availState if available,
    otherwise null) + name 15/600 + @handle mono 12/500 ink3.
  CategoryBadge trailing (friend.category).
  Tap row → onPress() + light haptic.
  No internal actions (R8-7).

─────────────────────────────────────────────
PeopleResultRow({ T, person, mutualCount, friendRequestStatus,
                  onAdd, onRowBodyPress })
─────────────────────────────────────────────
  person: { id, name, handle, letter, photoUrl? }
  mutualCount: number
  friendRequestStatus: 'none' | 'sent'
  onAdd: () => void
  onRowBodyPress: () => void  → opens QuickProfileSheet

  RingAvatar 40px NO status ring (non-friend per R8-3).
  name 15/600 + @handle mono 12/500 ink3.
  "{N} mutual friend{s}" sub-line 12/500 ink2 (omit if mutualCount === 0).
  Trailing: "Add" accent pill (friendRequestStatus='none') OR
            "Sent" ghost pill non-interactive (friendRequestStatus='sent').
  Tap "Add" pill → onAdd() + success haptic. Pill swaps to "Sent" optimistically.
  Tap row body (not pill) → onRowBodyPress() + light haptic → QuickProfileSheet.
  "Add" pill is the ONLY internal action (R8-7).

─────────────────────────────────────────────
GroupResultRow({ T, group: SocialGroup, onPress })
─────────────────────────────────────────────
  CoverArt 44px chip + group name 15/600 + member count 12/500 ink2.
  PrivateBadge if group.isPrivate.
  Tap → onPress() + medium haptic (cross-screen navigation).

─────────────────────────────────────────────
EventResultRow({ T, event: Event, rsvpStatus: RSVPStatus, onPress })
─────────────────────────────────────────────
  accentSoft 44×44 View · radius 10 · centered date text inside:
    month abbrev 9/600 ink2 · day number 17/800 ink.
  event name 15/600 · 2-line clamp · date string 12/500 ink2.
  RSVPStatus dot (AvailDot or colored 8px View using correct token):
    yes → limeInk · maybe → accent · no → popInk · null → ink3.
  Tap → onPress() + medium haptic (cross-screen navigation).

─────────────────────────────────────────────
RecentRow({ T, term: string, onSelect, onRemove })
─────────────────────────────────────────────
  Ionicons "time-outline" 16px ink3 leading + term 15/500 ink.
  Ionicons "close" 16px ink3 trailing × btn (44pt hit).
  Tap row → onSelect(term) + light haptic.
  Tap × → onRemove(term) + light haptic.

================================================================
## STEP 3 — SearchOverlay

File: social-calendar-mobile/src/components/social/SearchOverlay.tsx

─────────────────────────────────────────────
PROPS:
─────────────────────────────────────────────

  SearchOverlay({
    T?: Theme,
    open: boolean,
    onClose: () => void,
    // Navigation callbacks — host screen handles actual nav
    onNavigateToFriendProfile: (friendId: string) => void,
    onNavigateToGroupDetail: (groupId: string) => void,
    onNavigateToEventDetail: (eventId: string) => void,
  })

─────────────────────────────────────────────
OVERLAY SHELL:
─────────────────────────────────────────────

  Full-screen opaque overlay (NOT a Modal — use Animated.View with
  position absolute, top 0, left 0, right 0, bottom 0, zIndex 100).
  Background: T.bg (opaque — no backdrop, the overlay IS the screen).
  Animation open:  flow-sheet-up 280ms spring (Reanimated translateY).
  Animation close: flow-sheet-down 240ms easeStd.
  A11y: accessibilityViewIsModal.

  Header (56px):
    "Cancel" ghost text btn (15/600 ink2) · left · 44pt ·
      tap → onClose() + light haptic.
    No centered title. No close X (Cancel is sole dismiss per spec).

  SearchInputBar (full-width · below header · 8px top margin):
    bgSunken fill · radius 12 · 44px height.
    Leading Ionicons "search" 16px ink3.
    TextInput: placeholder "Search friends, groups, events…" ink3 ·
      auto-focus when overlay opens (focus ref on open).
    Trailing × Ionicons "close" 16px ink3 · ONLY when value.length > 0 ·
      tap → clear input + light haptic.
    Debounce queries: 220ms after last keystroke (useEffect + setTimeout).

─────────────────────────────────────────────
INTERNAL STATE:
─────────────────────────────────────────────

  query: string
  recents: string[]          (persisted via useRef — in-memory only)
  results: SearchResults | null
  loading: boolean
  friendRequestStates: Record<string, 'none' | 'sent'>
  quickProfileOpen: boolean
  quickProfilePerson: QuickProfilePerson | null

  interface SearchResults {
    friends: Friend[];
    people: PeopleResult[];
    groups: SocialGroup[];
    events: Event[];
  }

  interface PeopleResult {
    id: string; name: string; handle: string;
    letter: string; photoUrl?: string | null;
    mutualCount: number;
  }

─────────────────────────────────────────────
DEFAULT STATE (no query):
─────────────────────────────────────────────

  Show recents section when query is empty.
  "RECENT" Overline left + "Clear all" PillBtn right (warning haptic on tap).
  Up to 7 RecentRow items, newest first.
  "Find anyone by @handle" hint: 13/500 ink3 · mono "@handle" inline ·
    below recents list.
  If recents is empty: show hint only, no "RECENT" header.

─────────────────────────────────────────────
RESULTS STATE (query present):
─────────────────────────────────────────────

  Fire query after 220ms debounce. While loading: show 28px Spinner
  top-right of results area only (not full-screen).

  Use MOCK DATA for search results (real API integration is deferred —
  filter mocks client-side against the query string). Import from
  src/mocks/ — friends, groups, events. For PEOPLE results, use
  friends mock data but exclude already-friends (simulate non-friends
  by using a subset or the same data with a flag). Add a comment
  explaining this is mock-only and real API wiring is deferred.

  Results render in locked order: FRIENDS → PEOPLE → GROUPS → EVENTS (R8-2).
  Each section: Overline label left + count chip right (mono 9/600 hairBg fill).
  Empty sections omitted entirely — no zero-count headers (R8-2).

  When ALL sections are empty → render EmptySearch (replaces entire
  result stack). Fire light haptic once on first empty render.
  Never show per-section empty states (R8-5).

  On tapping a result row:
    Friend → onNavigateToFriendProfile(friend.id) + add to recents.
    People row body → open QuickProfileSheet for that person.
    Group → onNavigateToGroupDetail(group.id) + add to recents.
    Event → onNavigateToEventDetail(event.id) + add to recents.

  Add to recents: prepend query string (not the item name) to recents
  array, dedupe, cap at 7. Do not add if query is already most-recent.

─────────────────────────────────────────────
QUICKPROFILESHEET INTEGRATION:
─────────────────────────────────────────────

  Mount QuickProfileSheet inside SearchOverlay (it stacks on top).
  Pass mock data for mutualFriends and stats.
  Wire onAddFriend to update friendRequestStates[person.id] = 'sent'
  and also update the PeopleResultRow pill optimistically.
  onClose → setQuickProfileOpen(false).
  The "Add friend" → "Sent" sync back to the row is automatic via
  friendRequestStates state.

─────────────────────────────────────────────
HAPTICS SUMMARY:
─────────────────────────────────────────────

  Overlay open              light
  Tap "Cancel"              light
  Tap result row (friend)   light
  Tap result row (group/event) medium  (cross-screen)
  Tap "Add" → "Sent"        success
  Tap clear × on input      light
  Tap "Clear all" recents   warning
  Tap × on recent row       light
  Zero results first render light  (once only)

================================================================
## STEP 4 — WIRE ENTRY POINTS

Entry: FlowHeader search icon on HomeScreen (R8-1 says Home, Friends,
and Groups screens all have the search icon).

For this build, wire HomeScreen only. Leave a TODO comment in
FriendsListScreen and GroupsListScreen:
  // TODO (GAP 2): wire SearchOverlay entry via FlowHeader search icon.

HomeScreen:
  1. Import useSearch from SearchContext.
  2. Add search icon (Ionicons "search") to FlowHeader right slot.
     Tap → openSearch() + light haptic.
  3. Mount <SearchOverlay> as a sibling to the main ScrollView,
     passing open={open}, onClose={closeSearch}, and navigation
     callbacks that call navigation.navigate() to the appropriate screens.

Read HomeScreen.tsx in full before modifying to understand existing
FlowHeader usage and avoid breaking anything.

================================================================
## STEP 5 — TypeScript CHECK

  cd social-calendar-mobile && npx tsc --noEmit

Exit 0 required. Fix all errors.

================================================================
## STEP 6 — EXPORTS

Add to social-calendar-mobile/src/components/index.ts:
  SearchOverlay, SearchContext, useSearch,
  FriendResultRow, PeopleResultRow, GroupResultRow,
  EventResultRow, RecentRow.

================================================================
## HARD RULES

1. Design tokens only — no hardcoded hex values.
2. Haptics via useHaptic() only.
3. "Add" pill is the ONLY in-row action on PEOPLE rows (R8-7).
   No swipe, no long press, no overflow menu on any result row.
4. Section order is LOCKED: FRIENDS → PEOPLE → GROUPS → EVENTS.
   Never reorder, never merge, never add a "Top hits" section.
5. Input bar is LOCKED (R8-6): no filter chips, no scope pickers,
   no voice input. Exactly: pill + magnifier + input + trailing ×.
6. Search is NOT a tab, NOT a screen — overlay only (R8-1).
7. EmptySearch replaces the ENTIRE result stack — no per-section
   empty states (R8-5).
8. No Zustand. All state local to SearchOverlay.
9. Mock data only for now — real API deferred. Comment clearly.

================================================================
## DEFINITION OF DONE

  ✓ tsc exits 0
  ✓ Overlay slides up with spring, closes with ease
  ✓ Input auto-focuses on open
  ✓ Default state: recents list (≤7) + "@handle" hint
  ✓ "Clear all" clears recents with warning haptic
  ✓ Query debounces 220ms, shows loading spinner during fetch
  ✓ Results in locked order: FRIENDS · PEOPLE · GROUPS · EVENTS
  ✓ Empty sections omitted entirely
  ✓ Zero results → EmptySearch (full replacement, light haptic once)
  ✓ PeopleResultRow: "Add" pill → "Sent" optimistically (success haptic)
  ✓ PeopleResultRow body tap → QuickProfileSheet opens
  ✓ QuickProfileSheet "Add friend" syncs back to row pill
  ✓ Friend/Group/Event taps fire navigation callbacks + medium haptic
  ✓ Tapping result adds query to recents (capped at 7, deduped)
  ✓ HomeScreen FlowHeader search icon opens overlay
  ✓ All haptics match table exactly
  ✓ All new components exported from components/index.ts

> ⛔ **SUPERSEDED — DO NOT SPAWN THIS AGENT.**
>
> The R8-1..R8-7 Search overlay scope described below was already shipped in commit `966e846` ("feat(mobile): GAP 2 — Search overlay (R8-1 through R8-7)") on 2026-05-21, roughly 30 minutes **before** this prompt was written.
>
> The component lives at `social-calendar-mobile/src/components/social/SearchOverlay.tsx` (plus `SearchContext.tsx` and the `EmptySearch` empty state). The PEOPLE-row → QuickProfileSheet wire-up is the only remaining stub-phase deferral and is now owned by `ATTENDEES_SHEET_AGENT_PROMPT.md` (R15-1 work).
>
> **What went wrong:** Step 1 (the planning chat) wrote this prompt without checking git or the working tree. LEAD_MANAGER.md line 304 was not flipped to COMPLETE after the GAP 2 commit landed, so the Step 3 chat trusted the stale tracker and spawned this agent in Wave 1. The agent hit the usage limit before writing anything — no damage done.
>
> This file is kept (not deleted) so the wave history stays auditable. If you are an orchestrator reading this file: skip it. The corresponding LEAD_MANAGER row has been flipped to COMPLETE referencing commit `966e846`.
>
> ---

# Frontend — Search Overlay Agent Prompt

> **You are the Frontend / Search Overlay agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — build the SyncUp Search overlay (GAP 2 in `FRONTEND-HANDOFF.txt`), implementing every locked rule from `ANCHOR-DESIGN.txt` R8-1 through R8-7 exactly as specified. You do not invent behavior, you do not redesign anything, you do not extend the spec.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified:

| Agent | Output | Key files |
|---|---|---|
| Theme / Tokens | Full token system | `src/theme/` — colors, typography, spacing, radii, motion, haptics, index |
| Component Library | All 63 presentational components | `src/components/` (foundation, polish, eventFlow, social, profile, emptyStates) |
| Navigation Setup | Root `native-stack` + 4 tab stacks + `CreateEventModal` sibling | `src/navigation/` — `RootNavigator.tsx`, `types.ts`, `TabBar.tsx` |
| Mock Data Layer | Typed mock constants | `src/mocks/` — users, friendships, events, groups |
| API Stub Layer | React Query hooks + `queryKeys` | `src/api/` — events, friends, groups, availability, profile |
| Screens | All 16 stub-phase screens built | `src/screens/` |

**Read these files before writing any code:**

- `ANCHOR-DESIGN.txt` (monorepo root) — full design spec. The Search Surface section starts at line ~795. R8-1 through R8-7 hard rules live at lines 350–399.
- `FRONTEND-HANDOFF.txt` (monorepo root) — GAP 2 begins at line 142. Lists the file paths you must create.
- `CLAUDE.md` (monorepo root) — state management rules and non-negotiable hard rules
- `social-calendar-mobile/src/api/API_STUB_HANDOFF.md` — which React Query hooks exist; which stubs simulate errors
- `social-calendar-mobile/src/components/COMPONENTS_HANDOFF.md` — which presentational components exist and their prop shapes (`RingAvatar`, `PillBtn`, `CategoryBadge`, `CoverArt`, `PrivateBadge`, `Overline`, `Spinner`, `LoadingOverlay`, `EmptySearch`)
- `social-calendar-mobile/src/navigation/NAVIGATION_HANDOFF.md` — how `RootNavigator` is wired and how modal screens are mounted (`CreateEventModal` is the existing sibling-to-tabs pattern)
- `social-calendar-mobile/src/navigation/types.ts` — every param list; you will add to this file
- `social-calendar-mobile/src/screens/home/HomeScreen.tsx`, `friends/FriendsListScreen.tsx`, `groups/GroupsListScreen.tsx` — three screens that must wire the search icon to your overlay
- `social-calendar-mobile/src/components/foundation/FlowHeader.tsx` — its `right` slot is where the search icon mounts

---

## Non-Negotiable Contracts

These rules are locked. Do not deviate from them.

### 1. State management: React Query for cache, `useState` for local UI

```ts
// ✅ correct — cached search results live in React Query
const { data, isLoading } = useQuery({
  queryKey: queryKeys.search.query(debouncedQuery),
  queryFn: () => searchAll(debouncedQuery),
  staleTime: 5 * 60 * 1000, // 5min — matches cache window from ANCHOR (R8-4)
  enabled: debouncedQuery.length > 0,
});

// ✅ correct — recent searches list is local UI state, not server data
const [recents, setRecents] = useState<string[]>(() => loadRecentsFromStorage());

// ❌ wrong — putting React Query response into Zustand
const setResults = useSearchStore(s => s.setResults);
setResults(data); // NEVER. There is NO Zustand in this project.
```

From `CLAUDE.md` and the user's locked custom instructions:
- API response data → React Query. No exceptions.
- Local-only UI state (input value, recents list, sheet open state) → `useState` / `useReducer`.
- **There is no Zustand in this project. Do not add it.**

### 2. No hardcoded design values

Every color, font size, spacing value, border radius, and duration comes from `src/theme/`. No `#FFFFFF`, no `fontSize: 15`, no `borderRadius: 12` in any file you create.

### 3. Haptics via `useHaptic()` only

```ts
import { useHaptic } from '../../theme/haptics';
const fire = useHaptic();
fire('light'); // call ONCE per gesture
```

Never call `expo-haptics` directly. Never fire haptics on mount, scroll, or visual transitions (Hard Rules H-1, H-3).

### 4. R8 hard rules are non-negotiable

R8-1 through R8-7 are Director-locked. Do not soften, extend, or "improve" them. The exact list:

- **R8-1** — Search is a full-screen overlay over Home / Friends / Groups. NEVER a tab, route, or separate screen.
- **R8-2** — Section order is FRIENDS → PEOPLE → GROUPS → EVENTS. Empty sections omitted entirely. NEVER a unified "Top hit" section above.
- **R8-3** — Result-row anatomy is locked per type (see Spec section below).
- **R8-4** — Default state is RECENT with **max 7** entries, "Clear all" pill, "@handle" hint. Tapping a recent uses cache.
- **R8-5** — Zero results renders `<EmptySearch />` unchanged. NEVER per-section empties.
- **R8-6** — Input bar is locked. NEVER add filter chips, scope pickers, or voice input inside it.
- **R8-7** — The PEOPLE row "Add" pill is the **only** row-internal action. NEVER add long-press menus, swipe actions, or per-row overflow.

If anything in this prompt appears to contradict R8-1..R8-7, the Anchor wins. Stop and escalate.

---

## Files to Create

Create only these files. Do not scaffold anything outside this list.

```
src/components/search/SearchOverlay.tsx        ← the full-screen overlay shell
src/components/search/SearchInput.tsx          ← locked input bar (R8-6)
src/components/search/SearchSection.tsx        ← shared section wrapper (overline + count chip)
src/components/search/ResultRowFriend.tsx      ← FRIENDS row (R8-3)
src/components/search/ResultRowPeople.tsx      ← PEOPLE row + "Add"→"Sent" pill (R8-3, R8-7)
src/components/search/ResultRowGroup.tsx       ← GROUPS row (R8-3)
src/components/search/ResultRowEvent.tsx       ← EVENTS row (R8-3)
src/components/search/RecentSearches.tsx       ← RECENT default body (R8-4)
src/components/search/useSearchRecents.ts      ← AsyncStorage-backed recents (max 7)
src/components/search/index.ts                 ← barrel export

src/api/search.ts                              ← searchAll() stub + useSearchQuery hook
                                                 + updates queryKeys.search
src/api/queryKeys.ts                           ← MODIFY: add `search: { query: (q) => ... }`

src/api/index.ts                               ← MODIFY: re-export from search.ts

src/screens/home/HomeScreen.tsx                ← MODIFY: wire FlowHeader `right` slot search icon
src/screens/friends/FriendsListScreen.tsx      ← MODIFY: same
src/screens/groups/GroupsListScreen.tsx        ← MODIFY: same

src/navigation/RootNavigator.tsx               ← MODIFY: mount SearchOverlay as a sibling modal screen
src/navigation/types.ts                        ← MODIFY: add SearchOverlay route param

src/components/search/SEARCH_OVERLAY_HANDOFF.md ← write this LAST, after all code is done
```

Do **not** create a screen file in `src/screens/`. R8-1 forbids it.

---

## How It Mounts (R8-1)

The overlay is **not** a screen file. It is a `presentation: 'transparentModal'` (or `'fullScreenModal'`) route mounted as a sibling of the tabs in `RootNavigator`, the same pattern as `CreateEventModal`.

### Route addition in `src/navigation/types.ts`

```ts
export type RootStackParamList = {
  Tabs: undefined;
  CreateEventModal: undefined;
  SearchOverlay: undefined;  // ← NEW. No params — overlay reads no external state.
};

export type SearchOverlayProps = NativeStackScreenProps<RootStackParamList, 'SearchOverlay'>;
```

### Route registration in `src/navigation/RootNavigator.tsx`

```tsx
<RootStack.Screen
  name="SearchOverlay"
  component={SearchOverlay}
  options={{
    presentation: 'fullScreenModal',  // or 'transparentModal' if backdrop matches T.bg exactly
    animation: 'slide_from_bottom',
    animationDuration: 280,           // R8-1: flow-sheet-up 280ms spring
    gestureEnabled: false,            // Cancel button is the sole dismiss path
  }}
/>
```

### Entry: FlowHeader search icon on Home / Friends / Groups

Each of these three screens must mount a search icon button in `FlowHeader`'s `right` slot. Tapping it fires `light` haptic and calls `navigation.getParent()?.navigate('SearchOverlay')`.

```tsx
// In HomeScreen.tsx, FriendsListScreen.tsx, GroupsListScreen.tsx
const navigation = useNavigation();
const fire = useHaptic();

<FlowHeader
  T={T}
  title="SyncUp"
  right={
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search"
      onPress={() => {
        fire('light');
        navigation.getParent()?.navigate('SearchOverlay');
      }}
      hitSlop={6}
      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* 18px magnifier SVG — ink2 color */}
    </Pressable>
  }
/>
```

Do not change the FlowHeader component itself. Just pass a node into its existing `right` slot.

---

## Component Specifications

### `SearchOverlay.tsx`

The overlay root. Composes everything.

**Layout (top → bottom, fills the screen):**

1. Safe-area top inset
2. **Header bar** — 56pt tall, `T.bgElevated`:
   - "Cancel" ghost button left (15/600 ink2, fires `light` haptic on tap, calls `navigation.goBack()`)
   - Centered title omitted (R8 spec — Cancel is the sole dismiss)
   - No close X (R8 spec)
3. **`<SearchInput />`** — 14px horizontal padding from header sides
4. **Body** — `ScrollView` with `keyboardShouldPersistTaps="handled"`:
   - If `query.length === 0`: render `<RecentSearches />`
   - Else if `isLoading && !data`: render `<Spinner size="md" />` centered, with no other content
   - Else if `hasZeroHits(data)`: render `<EmptySearch />` from `src/components/emptyStates/`
   - Else: render the four sections in **locked order** (R8-2): `<SearchSection title="FRIENDS">`, then PEOPLE, then GROUPS, then EVENTS. **Omit any section whose results array is empty.**
5. Loading affordance during active query (non-initial): a small `<Spinner size="sm" />` aligned top-right of the overall results header. Only render while `isFetching && data` (refetch state).

**State (all `useState` / local):**

```ts
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 220); // R8 spec: 220ms debounce after last keystroke
const { recents, addRecent, removeRecent, clearAll } = useSearchRecents();
const inputRef = useRef<TextInput>(null);
```

**Data hook:**

```ts
const { data, isLoading, isFetching } = useSearchQuery(debouncedQuery);
// useSearchQuery uses staleTime: 5 * 60 * 1000 (R8 cache: 5min)
// enabled: debouncedQuery.length > 0
```

**Lifecycle:**

- On mount: `inputRef.current?.focus()` once (do NOT fire a haptic — H-3 forbids haptic on mount). The `light` "open overlay" haptic specified in ANCHOR is fired by the search-icon Pressable on the invoking screen, NOT here.
- When the user submits the input (`onSubmitEditing`) OR taps a result row: call `addRecent(query)` if `query.length > 0`.
- A11y: root `<View>` carries `accessibilityRole="dialog"` and `accessibilityViewIsModal={true}` (A-23). Input auto-focuses (A-23). Cancel is the first tab stop (A-24).

**Animation:**

- Reduced motion: rely on React Navigation's own reduced-motion handling for the modal transition. Do not add manual Reanimated animation for the overlay container.

**Dismiss paths:**

- Cancel button → `navigation.goBack()`. Input ref is blurred via `inputRef.current?.blur()` first (avoids keyboard flicker).
- Hardware back (Android) → same as Cancel.

---

### `SearchInput.tsx`

The locked input bar (R8-6).

**Anatomy:**

- Full-width pill, `borderRadius: radii.input` (12), height 44pt
- Background `T.bgSunken`
- Leading magnifier SVG, 16px, color `T.ink3`, left padding 14pt
- `<TextInput>` between icons: `fontSize: typography.body.fontSize` (15), `fontFamily: fonts.sans`, color `T.ink`, placeholder color `T.ink3`, placeholder text **exactly** "Search friends, groups, events…"
- Trailing × button: only rendered when `value.length > 0`. Tap fires `light` haptic and calls `onChangeText('')`. Hit area 44×44 (Hard Rule 2). A11y label "Clear search".

**Props:**

```ts
export interface SearchInputProps {
  T: typeof colors.light;
  value: string;
  onChangeText: (next: string) => void;
  onSubmit?: () => void;
  inputRef?: React.Ref<TextInput>;
}
```

**Forbidden inside this component (R8-6):**

- No filter chips
- No scope picker (Friends / Groups / Events tabs inside the bar)
- No voice-input affordance
- No mode toggle
- No clear-all button (that lives in `RecentSearches`, on the section header)

---

### `SearchSection.tsx`

Wrapper for any non-empty result section. Composes the overline + count chip + children.

**Anatomy:**

- Row: `<Overline />` on the left (e.g. "FRIENDS"), `<View>` count chip on the right
- Count chip: mono `typography.overline` font, fontSize 9, color `T.ink2`, background `T.hairBg` (use `T.bgSunken` if `hairBg` is not in the token set), `borderRadius: 999`, padding `2px 6px`. Text is the integer count.
- Children render directly below — `RingAvatar` rows.

**Props:**

```ts
export interface SearchSectionProps {
  T: typeof colors.light;
  title: 'FRIENDS' | 'PEOPLE' | 'GROUPS' | 'EVENTS';
  count: number;
  children: React.ReactNode;
}
```

This component must **not** render itself when `count === 0`. The parent omits it. (R8-2 — empty sections omitted entirely.)

---

### `ResultRowFriend.tsx` (R8-3, FRIENDS)

**Anatomy (locked):**

```
[RingAvatar 40px, status ring on]  Name 15/600 ink (1-line ellipsis)
                                    @handle mono 12/500 ink3 (1-line ellipsis)
                                                                    [CategoryBadge right]
```

- Row min-height 64
- Background `T.bgElevated`, no top divider on the first row, `1px T.hair` separator between rows handled by the section (or use a tight `gap`)
- Whole row is the tap target (R8-7 — no row-internal action other than the row tap itself)
- Tap → `light` haptic, then `navigation.navigate('Tabs', { screen: 'FriendsTab', params: { screen: 'FriendProfile', params: { friendId } } })`. **Fire `medium` haptic for the navigation per the haptic map** ("notification card tap → navigate (R12-1)" pattern applies to result rows that cross screens). Read the haptic map carefully: open haptic light, tap result light, navigation medium. Pick the haptic the Anchor specifies for tap-result-row (light) plus the navigation (handled by React Navigation's transition, not your code).

**Props:**

```ts
export interface ResultRowFriendProps {
  T: typeof colors.light;
  friendship: Friend; // from TYPES.ts — includes the resolved friend + categoryBadge
  onPress: (friendId: string) => void;
}
```

---

### `ResultRowPeople.tsx` (R8-3, R8-7, PEOPLE)

**Anatomy (locked):**

```
[RingAvatar 40px, NO status ring]  Name 15/600 ink
                                    @handle mono 12/500 ink3
                                    "N mutual friends" 12/500 ink3 sub-line
                                                                    [Add accent pill]
```

- Row min-height 64
- Whole row body is a tap target (opens QuickProfileSheet — see GAP 4; for THIS agent, the screen target is the Friend Profile route stub. When QuickProfileSheet ships, the people-row body destination will be re-wired by the QuickProfileSheet agent. Add a `// TODO(quick-profile-sheet)` comment at the body-tap call site.)
- "Add" pill is the **sole** row-internal action (R8-7). Tap behaviour:
  - State `'none'` → renders `<PillBtn variant="primary" size="sm">Add</PillBtn>`
  - On tap: fire `medium` haptic immediately (gesture), call `useSendFriendRequest()` mutation
  - On success: pill swaps to state `'sent'` → renders `<PillBtn variant="ghost" size="sm" disabled>Sent</PillBtn>` (non-interactive). Fire `success` haptic.
  - On failure: revert to `'none'`, fire `error` haptic, render an `ErrorToast` preset `'friend'` (the toast is the screen's responsibility — for this agent, just bubble the error via the mutation's `onError` and leave the toast wiring to the existing toast infrastructure if present; otherwise log `// TODO: wire error toast` and flag in HANDOFF).
- A11y: pill carries `accessibilityLabel={"Send friend request to " + name}`; on transition to `'sent'`, an invisible `<A11yLive />` announces "Sent" via `aria-live="polite"` (A-26).
- **Never** add long-press, swipe, or overflow controls (R8-7).

**Props:**

```ts
export interface ResultRowPeopleProps {
  T: typeof colors.light;
  person: { id: string; name: string; handle: string; avatarUrl?: string; mutualCount: number; requestState: 'none' | 'sent' };
  onAddTap: (personId: string) => void;
  onBodyTap: (personId: string) => void;
}
```

`requestState` should be derived inside the row from a local `useState` initialized from `person.requestState`, advanced to `'sent'` on a successful mutation. Do **not** put this in React Query — it's transient per-render UI feedback; the underlying friendship state still lives in React Query under `queryKeys.friends.requests()`. After a successful send, invalidate `queryKeys.friends.requests()` so the rest of the app reflects the new pending request.

---

### `ResultRowGroup.tsx` (R8-3, GROUPS)

**Anatomy (locked):**

```
[CoverArt chip 44px, radius card]  Group name 15/600 ink (1-line ellipsis)
                                    Member count 12/500 ink3 (e.g. "8 members")
                                                                    [PrivateBadge if private]
```

- Row min-height 64
- Whole row is the tap target → `navigation.navigate('Tabs', { screen: 'GroupsTab', params: { screen: 'GroupDetail', params: { groupId } } })`
- Tap fires `light` haptic

**Props:**

```ts
export interface ResultRowGroupProps {
  T: typeof colors.light;
  group: SocialGroup;
  onPress: (groupId: string) => void;
}
```

---

### `ResultRowEvent.tsx` (R8-3, EVENTS)

**Anatomy (locked):**

```
[44px calendar tile, accentSoft bg, radius 12,  Event name 15/600 ink (2-line clamp)
 ink-color month/day inside]                    Date 12/500 ink3
                                                                    [RSVP status dot, AvailDot pattern]
```

- Row min-height 64 (allow extra height when title wraps to 2 lines)
- Whole row is the tap target → `navigation.navigate('Tabs', { screen: 'HomeTab', params: { screen: 'EventDetail', params: { eventId } } })`
- Tap fires `light` haptic

**Props:**

```ts
export interface ResultRowEventProps {
  T: typeof colors.light;
  event: { id: string; title: string; startsAt: string; myRsvp?: 'yes' | 'maybe' | 'no' | null };
  onPress: (eventId: string) => void;
}
```

The calendar tile composition is allowed to be inline — do not create a new shared component for it. Tile fill is `T.accentSoft`, text inside uses `T.accentInk`.

---

### `RecentSearches.tsx` (R8-4)

The default body when `query.length === 0`.

**Anatomy:**

1. Section header row:
   - `<Overline>RECENT</Overline>` on the left
   - "Clear all" `<PillBtn variant="ghost" size="sm">Clear all</PillBtn>` on the right. Tap fires `warning` haptic, calls `clearAll()`, announces "Recent searches cleared" via `<A11yLive />`.
2. Recent rows — render `recents.slice(0, 7)` (R8-4: max 7). Each row:
   - Tappable. Whole row → `setQuery(term)`. Fires `light` haptic. (This re-populates the input; the query effect kicks in and uses cached results when available — `staleTime: 5min` handles this for free.)
   - Trailing × icon-btn (44×44 hit, 18px visual). Tap fires `light` haptic, calls `removeRecent(term)`. A11y label `"Remove " + term` (A-25). The × tap must NOT propagate up to the row tap.
3. Below the list: a single line `"Find anyone by "` + inline mono `"@handle"` + `" "`, color `T.ink3`, font `typography.body` (size 15, weight 500) with the `@handle` token in `typography.overline.fontFamily` (mono).
4. Special case: if `recents.length === 0`, do NOT render the RECENT overline, "Clear all" pill, or the row list. Render ONLY the "@handle" hint at the top. (Edge-case pattern from ANCHOR line 1808: "No recents: Search default body shows only '@handle' hint, no RECENT section.")

**Props:**

```ts
export interface RecentSearchesProps {
  T: typeof colors.light;
  recents: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll: () => void;
}
```

---

### `useSearchRecents.ts`

A small hook that owns the recents list. Backed by `@react-native-async-storage/async-storage` (already a transitive dep via Expo; if not installed, run `expo install @react-native-async-storage/async-storage` — flag in HANDOFF if you had to install it).

**Behaviour:**

- Storage key: `'syncup.search.recents'`
- Value: JSON-serialized `string[]`, newest first
- On mount: load from storage, set local state
- `addRecent(term: string)`:
  - Trim whitespace; if `term === ''` after trim, no-op
  - Dedupe (case-insensitive): if `term` already exists, remove the existing entry, then unshift
  - Cap at **7** entries (R8-4 — drop the oldest beyond 7)
  - Persist
- `removeRecent(term: string)`: remove by case-insensitive match, persist
- `clearAll()`: empty the array, persist

**Return shape:**

```ts
return { recents, addRecent, removeRecent, clearAll };
```

This hook MUST NOT use React Query. Recents are device-local UI state and never touch the network.

---

## `src/api/search.ts` + `queryKeys` Update

### `src/api/queryKeys.ts` — add a `search` namespace

Add this entry (do not touch any existing keys):

```ts
export const queryKeys = {
  // ... existing entries unchanged ...
  search: {
    query: (q: string) => ['search', q] as const,
  },
} as const;
```

### `src/api/search.ts` — new file

Create the stub function and the React Query hook.

```ts
import { useQuery } from '@tanstack/react-query';
import { simulateLatency } from './_utils';
import { queryKeys } from './queryKeys';
import {
  MOCK_FRIENDS, MOCK_USERS, MOCK_SOCIAL_GROUPS, MOCK_EVENTS,
} from '../mocks';
import type { Friend, SocialGroup } from '../../TYPES';

export interface SearchResults {
  friends: Friend[];                                                            // R8-2 order
  people:  { id: string; name: string; handle: string; avatarUrl?: string; mutualCount: number; requestState: 'none' | 'sent' }[];
  groups:  SocialGroup[];
  events:  { id: string; title: string; startsAt: string; myRsvp?: 'yes' | 'maybe' | 'no' | null }[];
}

export async function searchAll(query: string): Promise<SearchResults> {
  await simulateLatency();
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return { friends: [], people: [], groups: [], events: [] };
  }

  // FRIENDS — caller's accepted friendships matched by name OR @handle
  const friends = MOCK_FRIENDS.filter(f =>
    f.friend.name.toLowerCase().includes(q) ||
    f.friend.handle.toLowerCase().includes(q)
  );

  // PEOPLE — every other user NOT already in MOCK_FRIENDS or MOCK_PENDING_REQUESTS
  const friendIds   = new Set(MOCK_FRIENDS.map(f => f.friend.id));
  const people = MOCK_USERS
    .filter(u => u.id !== 'me' && !friendIds.has(u.id))
    .filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.handle.toLowerCase().includes(q)
    )
    .map(u => ({
      id: u.id, name: u.name, handle: u.handle, avatarUrl: u.avatarUrl,
      mutualCount: 0,             // stub-phase: 0 — flag in HANDOFF for real backend
      requestState: 'none' as const,
    }));

  // GROUPS — caller's groups matched by name
  const groups = MOCK_SOCIAL_GROUPS.filter(g => g.name.toLowerCase().includes(q));

  // EVENTS — caller's visible events matched by title
  const events = MOCK_EVENTS
    .filter(e => e.title.toLowerCase().includes(q))
    .map(e => ({ id: e.id, title: e.title, startsAt: e.startsAt, myRsvp: e.myRsvp ?? null }));

  return { friends, people, groups, events };
}

export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.search.query(query),
    queryFn:  () => searchAll(query),
    enabled:  query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // R8-4 / ANCHOR line 821: 5min cache
    gcTime:    30 * 60 * 1000,
  });
}
```

The exact field shapes above are based on `MOCKS_HANDOFF.md`. If a field name differs in the real mocks (e.g. `avatarUrl` vs. `avatar`), match the mock — do not rename the mock data.

### `src/api/index.ts` — re-export

Add one line, surgical:

```ts
export * from './search';
```

---

## Edge Cases — Apply Across the Overlay

Per ANCHOR (lines 1808, 1814):

- **No recents**: default body shows ONLY the "@handle" hint. No RECENT overline. No "Clear all" pill.
- **Search offline**: overlay still opens. The `<OfflineBar />` from `src/components/polish/` renders above the input. Live queries are disabled (`useSearchQuery`'s `enabled` should evaluate to `false` when the device is offline — for the stub phase, hardcode `isOffline=false` and add a `// TODO: wire useNetworkState()` comment). Cached recents still tap to cached results because React Query's cache lives in memory.
- **Zero results**: a query that returns 0 hits across all four sections renders `<EmptySearch />` from `src/components/emptyStates/`. NEVER per-section empty states (R8-5).
- **Active query loading** (initial): center a single `<Spinner size="md" />` in the body. Render no section headers.
- **Active refetch** (`isFetching && data`): show a small `<Spinner size="sm" />` top-right of the results area, leave previous data in place.

---

## Haptic Map (Lifted from ANCHOR · Search Surface)

You must fire exactly these — and only these — haptics:

| Event | Haptic | Where fired |
|---|---|---|
| Tap search icon on Home / Friends / Groups | `light` | Search icon `Pressable` on each invoking screen |
| Tap a result row (any section) | `light` | Row `onPress` handler |
| Tap "Add" pill in PEOPLE row | `medium` (gesture), then `success` on mutation success, `error` on failure | `ResultRowPeople` |
| Tap × clear button inside input | `light` | `SearchInput` |
| Tap "Clear all" pill in recents | `warning` | `RecentSearches` |
| Tap × on a single recent row | `light` | `RecentSearches` |
| Tap a recent term to repopulate | `light` | `RecentSearches` |
| Zero-results render | `light` (ONCE, on the render that flips data to zero hits) | `SearchOverlay` — use a `useEffect` keyed on the zero-hits boolean |

**Never** fire on:
- Overlay mount/unmount (H-3)
- Keyboard show/hide
- Scroll
- Re-render while the query results are unchanged
- The Cancel button (it is `light` — wait, re-read: Cancel uses no haptic in the ANCHOR table; if in doubt, omit. The opening side fires `light` via the search-icon Pressable; the closing side has no specified haptic.)

---

## A11y Checklist

| Element | Requirement |
|---|---|
| SearchOverlay root | `accessibilityRole="dialog"` + `accessibilityViewIsModal={true}` (A-23) |
| Input | auto-focuses on overlay open; focus returns to the search icon on close (A-23) — React Navigation handles focus return when the modal pops; verify on iOS |
| Cancel button | first tab stop (A-24) — render it first in the tree |
| Recent row × button | `accessibilityLabel={"Remove " + term}` (A-25) |
| "Add" pill | `accessibilityLabel={"Send friend request to " + name}` (A-26); on transition to "Sent", announce via `<A11yLive />` polite (A-26) |
| Magnifier icon, calendar tile glyph | decorative — `accessibilityElementsHidden={true}` |
| Spinner | `<Spinner>` already carries `accessibilityRole="progressbar"` per Component Library handoff — do not re-wrap |

---

## What NOT to Build

- A `SearchScreen` file in `src/screens/` — R8-1 forbids it
- A bottom tab for search — R8-1 forbids it
- A "Top hit" section above the four locked sections — R8-2 forbids it
- Per-section empty states — R8-5 forbids it
- Filter chips, scope pickers, or voice input inside the search bar — R8-6 forbids it
- Long-press menus, swipe actions, or overflow controls on any row — R8-7 forbids it
- `QuickProfileSheet` itself — that's GAP 4, a separate agent. Wire only the body-tap call site with a `// TODO(quick-profile-sheet)` comment, and as an interim destination navigate to FriendProfile.
- Any change to existing components in `src/components/foundation/`, `polish/`, `social/`, `profile/`, or `emptyStates/`. Compose them, don't modify them.
- Any change to `src/api/queryKeys.ts` beyond adding the `search` namespace.
- Any change to existing screens beyond wiring the FlowHeader `right` slot search icon on Home / Friends / Groups.
- A real-network search implementation — this layer stays mocked. The Explore Backend agent and a future SearchBackend agent will provide the live data.

---

## Verification Steps

Before writing `SEARCH_OVERLAY_HANDOFF.md`:

1. `cd social-calendar-mobile && npx tsc --noEmit` passes with zero errors.
2. Open `RootNavigator.tsx` — confirm `SearchOverlay` is registered as a sibling of `Tabs` and `CreateEventModal`.
3. Open `HomeScreen.tsx`, `FriendsListScreen.tsx`, `GroupsListScreen.tsx` — confirm each FlowHeader's `right` slot renders a search icon Pressable that navigates to `SearchOverlay`.
4. Visually trace: tapping the search icon mounts the overlay over the current tab with a 280ms slide-up.
5. Confirm `useSearchRecents` cap is **7**, not 6 or 8. (R8-4.)
6. Confirm Section render order is exactly FRIENDS → PEOPLE → GROUPS → EVENTS, and that empty sections are omitted (R8-2).
7. Confirm `<EmptySearch />` is rendered for zero hits (R8-5) — not per-section empties.
8. Confirm the input bar contains no filter chips, scope pickers, or voice icons (R8-6).
9. Confirm PEOPLE row has no overflow / long-press / swipe controls; the "Add" pill is the only non-row tap target (R8-7).
10. Confirm no hardcoded hex / px values. Grep for `#` and `borderRadius:` in the files you created — every value should reference `colors.*` or `radii.*`.

---

## Handoff Document

When all code is done and `npx tsc --noEmit` passes clean, write `src/components/search/SEARCH_OVERLAY_HANDOFF.md`:

1. **What was built** — table of files and their roles (1 row per file)
2. **Mount pattern** — exact description of how `SearchOverlay` is registered in `RootNavigator`, including the presentation mode, animation, and gesture settings used
3. **R8 rule application** — for each of R8-1 through R8-7, one sentence describing where in the code the rule is enforced
4. **Haptic map applied** — table of (event → haptic → file:line)
5. **Cache strategy** — confirm `staleTime: 5min`, `gcTime: 30min`, `enabled: query.length > 0`
6. **Recents storage** — storage key used, the cap, what happens on dedupe collision
7. **Stub-phase deferrals** — list every `// TODO` comment left in code (people-row body destination, mutual-count = 0, offline detection) and what agent or future work owns each
8. **Open items for the Lead Manager** — anything cross-section: the QuickProfileSheet (GAP 4) dependency for the people-row body tap; any error-toast wiring that needs the toast infrastructure to ship; any AsyncStorage install you had to perform
9. **Verification log** — confirm each of the 10 verification steps above passed

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors in `social-calendar-mobile/`
- [ ] `SearchOverlay` mounted as a sibling modal in `RootNavigator` — NOT a screen file
- [ ] Search icon wired into FlowHeader `right` slot on Home, Friends, AND Groups (3 screens)
- [ ] Section order is FRIENDS → PEOPLE → GROUPS → EVENTS, empty sections omitted (R8-2)
- [ ] Result-row anatomy matches R8-3 for all four row types
- [ ] Recents capped at exactly 7 (R8-4)
- [ ] "Clear all" pill fires `warning` haptic; per-row × fires `light` (R8-4)
- [ ] Zero-results renders `<EmptySearch />` only (R8-5)
- [ ] No recents → only "@handle" hint, no RECENT overline (ANCHOR edge case line 1808)
- [ ] Input bar has no filter chips, scope pickers, or voice (R8-6)
- [ ] PEOPLE row "Add" pill is the only row-internal action; tap = `medium` then `success`/`error` (R8-7)
- [ ] No long-press, swipe, or overflow controls on any row (R8-7)
- [ ] All design values come from `src/theme/`; no hardcoded hex or px
- [ ] All haptics fire via `useHaptic()`; no direct `expo-haptics` imports
- [ ] API response data lives in React Query; recents live in local state via AsyncStorage
- [ ] No Zustand introduced anywhere
- [ ] `SEARCH_OVERLAY_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Search Overlay row → `COMPLETE (date)`

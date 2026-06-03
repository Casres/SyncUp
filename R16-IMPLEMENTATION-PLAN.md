# R16 Implementation Plan — Friend Profile + QuickProfileSheet drill

Spec source: `ANCHOR-DESIGN-R16-EXTENSION.txt` (R16-1 through R16-11).
Status: planning. Last updated 2026-05-25.

---

## TL;DR — what we're shipping

1. **Friend Profile** gets a header overflow (⋯) containing Remove friend / Block / Report.
2. The action row simplifies to two equal primary pills: **Make Plans** + **DM**.
3. **DM** and **Report** are stubs (toast feedback only). **Remove friend** and **Block** are real mutations.
4. **QuickProfileSheet** learns to stack on itself when a mutual-friend avatar is tapped, capped at depth 1.
5. Self-view guard: tapping a mutual-friend avatar whose userId equals the viewer's id is a no-op.

What is **not** in scope: a real DM system, a real Report pipeline, mutual-event tap-through, inline FriendType editing, the SearchOverlay/FriendsList row-tap inconsistency (logged as R16 follow-up #5).

---

## Code surface — by area

### 1. API hooks — `src/api/friends.ts`

The backend is **already done**:

- `DELETE /friends/:id` → unfriend (soft delete) — confirmed in `social-calendar-api/src/routes/friends.routes.ts:26`.
- `PATCH /friends/:id/block` → set friendship to BLOCKED — confirmed at line 25.

Two new hooks + mock fallbacks. Both follow the existing `useSendFriendRequest` / `useRespondToFriendRequest` pattern.

```ts
// New exports in src/api/friends.ts
export async function removeFriend(authedMutate: AuthedMutate, friendId: string): Promise<void>
export async function blockUser(authedMutate: AuthedMutate, friendId: string): Promise<void>
export function useRemoveFriend(): UseMutationResult<void, ApiError, string>
export function useBlockUser(): UseMutationResult<void, ApiError, string>
```

Both mutations invalidate `queryKeys.friends.all()` and `queryKeys.friends.profile(id)` on success. `useBlockUser` additionally invalidates events queries (the blocked user's authored content vanishes from feed).

Mock path: `removeFriend(unknownId)` and `blockUser(unknownId)` throw `ApiError('NOT_FOUND')`. Both succeed silently for known friend ids.

**Effort:** ~30 LOC. No new query keys needed (using existing `queryKeys.friends.*`).

### 2. QuickProfileSheet stacking — `src/components/social/QuickProfileSheet.tsx`

Two prop additions:

```ts
export interface QuickProfileSheetProps {
  // ... existing props
  /** Tap handler for mutual-friend avatars. Omitted/undefined at depth 1. */
  onMutualFriendTap?: (userId: string) => void;
  /** R16-3 stacking depth. depth=1 disables mutual taps + hides own backdrop. */
  depth?: 0 | 1;
  /** R16-4 self-view guard. */
  currentUserId?: string;
}
```

Internal changes:

- Line 308 stub becomes a real handler that fires `light` haptic + `onMutualFriendTap(mf.id)` when `depth === 0`. When `depth === 1` or `mf.id === currentUserId`, the Pressable is replaced by a plain View (per R16-4).
- Backdrop opacity: when `depth === 1`, the backdrop View becomes `backgroundColor: 'transparent'` (R16-3: "the existing 30% backdrop from R12-5 covers both sheets").
- Optional polish: the depth-1 sheet's entrance translateY could start at a small offset (e.g. 80px) to visually distinguish from depth-0, but this is not required by spec.

**Effort:** ~40 LOC of QuickProfileSheet edits.

### 3. Each QuickProfileSheet call site — depth-1 wiring

Two call sites exist today (one shipped, one planned):

#### a) `AttendeesSheet.tsx` (shipped, R15-1)

Current state owns one slot: `quickProfileTargetId`. Extend to two:

```ts
const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null);
const [nestedProfileId, setNestedProfileId] = useState<string | null>(null);

// ...render two sheets:
<QuickProfileSheet
  open={primaryProfileId !== null}
  // ...primary props
  onMutualFriendTap={setNestedProfileId}
  onClose={() => { setPrimaryProfileId(null); setNestedProfileId(null); }}
  depth={0}
  currentUserId={viewerId}
/>
<QuickProfileSheet
  open={nestedProfileId !== null}
  // ...nested props derived from nestedProfileId
  onClose={() => setNestedProfileId(null)}
  depth={1}
  currentUserId={viewerId}
/>
```

Need to derive `nestedProfileId`'s person/mutuals/stats/isFriend/friendTypeName same way the primary does. Extract a helper `useQuickProfileData(userId)` (new file `src/components/social/useQuickProfileData.ts`) so the resolution logic isn't duplicated.

#### b) `SearchOverlay.tsx` (GAP 2 — not yet built)

Currently a TODO per QuickProfileSheet comments. When GAP 2 lands, it picks up the same two-slot pattern via the shared `useQuickProfileData` hook. No work in this round beyond noting it.

**Effort:** ~60 LOC of AttendeesSheet edits + ~30 LOC for the new hook.

### 4. FriendProfileScreen — header overflow + action row swap — `src/screens/friends/FriendProfileScreen.tsx`

#### a) FlowHeader gains a `right` slot

FlowHeader already accepts a `right` ReactNode (confirmed in `src/components/foundation/FlowHeader.tsx:21`). Pass:

```tsx
<FlowHeader
  T={T}
  title="Profile"
  onBack={() => navigation.goBack()}
  right={
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="More options"
      onPress={openOverflow}
      hitSlop={8}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={T.ink2} />
    </Pressable>
  }
/>
```

#### b) Overflow component — new file

Build `src/components/social/FriendProfileOverflowMenu.tsx`. Pattern after `RowOverflowMenu.tsx` but tailored for screen-level (not row-anchored) presentation. Open contract:

```ts
interface FriendProfileOverflowMenuProps {
  T?: Theme;
  open: boolean;
  friendFirstName: string;
  onRemoveFriend: () => void;   // parent handles TwoTapDestructive
  onBlock: () => void;          // parent handles TwoTapDestructive
  onReport: () => void;         // parent handles Report stub
  onClose: () => void;
}
```

Anatomy per R16-6: three rows in order Remove friend / Block {firstName} / Report {firstName}. Remove and Block use destructive ink color. Each row's onPress closes the menu *first*, then calls the handler. The TwoTapDestructive UX for Remove/Block happens on the FriendProfile body (per the current pattern), not inside the overflow row, so the menu can be a normal action sheet.

Actually wait — a simpler alternative: each destructive row in the overflow renders a `TwoTapDestructive` component inline (label = "Remove friend" → "Tap again to confirm"). This avoids ferrying state back to the parent. Choose during build; both shapes match the spec.

**Effort:** ~120 LOC for the new component.

#### c) Action row simplification

Replace lines 215-237 of `FriendProfileScreen.tsx` (currently `PillBtn "Plan together"` + `TwoTapDestructive "Remove friend"`) with:

```tsx
<View style={styles.actionsRow}>
  <View style={styles.actionCell}>
    <PillBtn
      T={T}
      label="Make Plans"
      variant="primary"
      size="md"
      icon={<Ionicons name="calendar" size={16} color={T.onAccent} />}
      onPress={handleMakePlans}
    />
  </View>
  <View style={styles.actionCell}>
    <PillBtn
      T={T}
      label="DM"
      variant="primary"
      size="md"
      icon={<Ionicons name="chatbubble" size={16} color={T.onAccent} />}
      onPress={handleDmStub}
    />
  </View>
</View>
```

`actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }` ; `actionCell: { flex: 1 }`.

`handleMakePlans` is the existing `navigation.navigate('CreateEventModal', ...)` call.
`handleDmStub` fires `light` haptic + shows the stub toast (see §5).

#### d) Wire the overflow handlers

```tsx
const [overflowOpen, setOverflowOpen] = useState(false);
const removeFriend = useRemoveFriend();
const blockUser = useBlockUser();

const handleRemoveConfirm = () => {
  removeFriend.mutate(friendId, {
    onSuccess: () => navigation.popToTop(),
    onError: () => showErrorToast('generic'),
  });
};
const handleBlockConfirm = () => {
  blockUser.mutate(friendId, {
    onSuccess: () => navigation.popToTop(),
    onError: () => showErrorToast('generic'),
  });
};
const handleReportStub = () => {
  fire('success');
  showInfoToast("Thanks — we'll review this report.");
};
```

**Effort:** ~80 LOC of FriendProfileScreen edits (delete the destructive button + add overflow state + add three handlers + restyle action row).

### 5. Stub toast surface — new lightweight component

Existing toasts (`BroadcastToast`, `ErrorToast`) are specialized. Add a tiny `InfoToast` for R16-9 stubs.

Option A — new component `src/components/polish/InfoToast.tsx` modeled after ErrorToast (same position, same auto-dismiss, no Undo, no semantic dot). ~60 LOC.

Option B — extend `ErrorToast` with an `info` variant. Riskier; existing call sites might leak.

Recommend Option A. Variant prop: `kind: 'info' | 'success'`. Used by DM stub and Report stub. Reusable for future stubs.

Render placement: at the root of `FriendProfileScreen` (above the SafeAreaView), or via a portal/context if we want toasts that survive screen pops. R16 only needs in-screen toasts, so render-on-screen is fine.

**Effort:** ~60 LOC.

### 6. Self-view guard — viewer id resolution

R16-4 needs `currentUserId`. The mobile project uses Clerk via `useApiFetch()`; the canonical viewer id likely lives in a Clerk hook (`useUser().user?.id` mapped to the SyncUp user id via the user table). Two options:

- Resolve via Clerk's `useUser()` and map to internal id via a `useViewerId()` hook. Verify the mapping exists in `src/auth/` during build.
- Pull from a known query key (e.g. `useFriends()` lists exclude self by definition — so viewer id might be exposed via `/users/me` if it exists).

**Effort:** unknown until I inspect `src/auth/`. Budget 30 LOC + the lookup.

### 7. Navigation types — no changes

`FriendsStackParamList.FriendProfile: { friendId: string }` is already correct. No new routes.

---

## File-by-file summary

| File | Action | LOC delta |
|---|---|---|
| `src/api/friends.ts` | Add `useRemoveFriend`, `useBlockUser` + their fetch fns + mock fallbacks | +60 |
| `src/components/social/QuickProfileSheet.tsx` | Add `onMutualFriendTap`, `depth`, `currentUserId` props; rewire mutual avatar Pressable; conditional backdrop | +40 |
| `src/components/social/useQuickProfileData.ts` | **NEW.** Userid → all QuickProfileSheet props derivation | +90 |
| `src/components/social/AttendeesSheet.tsx` | Add nested-profile state + render second sheet at depth=1 | +60 |
| `src/components/social/FriendProfileOverflowMenu.tsx` | **NEW.** Action-sheet overflow component | +120 |
| `src/components/polish/InfoToast.tsx` | **NEW.** Lightweight info/success toast | +60 |
| `src/screens/friends/FriendProfileScreen.tsx` | New action row, overflow state, mutation wiring, toast wiring | +80, -25 |
| `src/components/index.ts` | Export new components | +4 |

**Total: ~510 net LOC**, of which ~270 are new files.

No changes to: navigation/types, navigation/FriendsStack, queryKeys, theme tokens, FlowHeader.

---

## Build order (suggested)

1. **API hooks first** — `useRemoveFriend`, `useBlockUser`. Unblocks downstream wiring. Mock-fallback paths only at first; live backend integration is a follow-up check (CLAUDE.md says we're past the live-backend round-trip).
2. **InfoToast** — small standalone component, used by DM/Report stubs.
3. **FriendProfileOverflowMenu** — standalone, can be built in isolation with mock handlers.
4. **FriendProfileScreen** updates — wire up new action row, overflow, mutations, toasts. End-to-end on this screen.
5. **useQuickProfileData hook + QuickProfileSheet prop additions** — keep QuickProfileSheet API additive (existing call sites still work without the new props).
6. **AttendeesSheet** — adopt the new stacking model. Verify R15-1 terminality is preserved (the sheet's primary subject is still terminal; only mutual-friend taps stack).
7. **Self-view guard hook** — `useViewerId` if not already present.

Each step type-checks independently. Hold the AttendeesSheet update until QuickProfileSheet is done.

---

## Risks / open questions to resolve during build

1. **Toast lifecycle on screen pop.** If the user taps DM (stub), then quickly taps back, does the InfoToast keep rendering on FriendsList? Spec doesn't say. Default: toast unmounts with screen pop (standard React behavior). Confirm during build.

2. **Block invalidation surface area.** R16-8 says cache invalidates `friends.all()`, `friends.profile(id)`, and "any feed query that surfaces user-authored content". Need to enumerate these — likely `queryKeys.events.list()` at minimum, possibly `queryKeys.notifications.feed()`. Will audit during build.

3. **`useViewerId` implementation.** Unknown what the existing pattern is. May add a tiny helper, or use an existing one.

4. **TwoTapDestructive placement — LOCKED: Option Y.** TwoTapDestructive lives *inside* the menu row. First tap → row stays open, label flips to "Tap again to confirm", row remains red. Second tap → commits. Menu stays open until commit or dismiss.

5. **`onClose` ergonomics with two stacked sheets.** AttendeesSheet's existing `onClose` for QuickProfileSheet currently does `setQuickProfileTargetId(null)`. With stacking, dismissing the primary sheet should also clear the nested id. The cleanup is explicit in the §3a snippet — make sure both `setX(null)` calls happen.

6. **R16-9 stub expiry clause** ("NEVER ship a 'Coming soon' toast for more than one major round"). Not enforced by code; track via a calendar reminder or a DESIGN-BACKLOG entry. **RESOLVED 2026-06-02:** both DM and Report stubs intentionally KEPT this round (DM has no backend domain → separate scoped task; Report is a retained safety affordance). Clock consciously extended to the next major round. Recorded in CLAUDE.md R16 stub-decision note + PROJECT_TRACKER Step 5 + GAP-PROGRESS Friend Profile note.

---

## Verification — completed 2026-05-25

- [x] `tsc --noEmit` passes — zero errors.
- [N/A] ESLint — no lint script configured in `social-calendar-mobile/package.json`. Typecheck is the gate for this project.
- [x] No Zustand introduced — grepped, no matches.
- [x] No API data manually copied into local state — local state holds only UI flags (`overflowOpen`, `infoToast`, `errorToastVisible`).
- [x] Every R16 rule has a corresponding code change:
  - R16-1 → `FriendProfileScreen.tsx` anatomy + doc-comment.
  - R16-2 → existing routes unchanged; no new entry points added.
  - R16-3 → `QuickProfileSheet.tsx` `depth` + `onMutualFriendTap` props + conditional backdrop + depth-1 disabling.
  - R16-4 → `QuickProfileSheet.tsx` `currentUserId` prop + self-view guard render branch.
  - R16-5 → `FriendProfileScreen.tsx` action row → two equal-flex pills (Make Plans + DM).
  - R16-6 → `FriendProfileOverflowMenu.tsx` (new) + header `right` slot wiring.
  - R16-7 → `useRemoveFriend` hook + `handleRemoveConfirm` + silent `popToTop`.
  - R16-8 → `useBlockUser` hook + `handleBlockConfirm` + cross-resource cache invalidation.
  - R16-9 → DM/Report stubs route through `InfoToast.tsx` (new) with centralized copy.
  - R16-10 → existing chip rendering is non-interactive; doc-comment updated.
  - R16-11 → existing event-row rendering is non-interactive; doc-comment updated.
- [x] QuickProfileSheet API change is additive — `depth`, `onMutualFriendTap`, `currentUserId` are all optional with backwards-compatible defaults. AttendeesSheet call site still works.
- [x] Self-view guard: depth=0 with `mf.id === currentUserId` → `interactive` is false → renders a plain `<View>`, no Pressable.
- [x] Depth-1 mutual avatars: `depth === 1` → `interactive` is false → renders `<View>`, no Pressable.
- [x] Backdrop stacking: depth-1 sheet sets `backdropColor = 'transparent'`. No double-darken.
- [x] Remove friend success → `removeFriend.mutate` `onSuccess` → `setOverflowOpen(false)` + `navigation.popToTop()`. No toast.
- [x] Block success → same pattern with `blockUser.mutate`.
- [x] Remove friend error → `setErrorToastVisible(true)`. Stays on screen.
- [x] Block error → same.
- [x] DM tap → `fire('light')` + `setInfoToast(DM_STUB_COPY)`.
- [x] Report confirm → row-level `commitHaptic: 'success'` (fired by `FriendProfileOverflowMenu`) + `setInfoToast(REPORT_CONFIRM_COPY)`.
- [x] FriendType chips on FriendProfile → existing rendering uses `<View>`, never Pressable.
- [x] Mutual events on FriendProfile → existing rendering uses `<View>`, never Pressable.
- [x] CLAUDE.md state-management rule honored — React Query for `useFriendProfile`, `useFriends`, `useFriendAvailability`, `useEvents`, `useRemoveFriend`, `useBlockUser`; local React state only for UI flags.

# Claude Code — GAP 3: AttendeesSheet
# SyncUp · Generated 2026-05-10
# Run this from the repo root.
# Complete all steps in order. Do not skip or mark done until tested.
================================================================

## AUTONOMOUS EXECUTION INSTRUCTIONS

Run this entire prompt start to finish without stopping to ask for
confirmation, clarification, or approval at any step. The spec is
complete. If you encounter a decision point not covered here, make
the choice that is most consistent with the existing codebase
patterns and keep moving. Do not pause. Do not summarize mid-build.
Only stop if TypeScript exits non-zero — fix the errors and continue.
Deliver a final handoff summary when done (same format as GAP 6).

================================================================

## MANDATORY PRE-FLIGHT — READ EVERY FILE LISTED BEFORE WRITING CODE

Read these files in full before touching a single line of code.
No exceptions, no skipping. They contain locking rules that override
any defaults or conventions you would otherwise apply.

  ANCHOR-DESIGN.txt                                                  (repo root)
  FRONTEND-HANDOFF.txt                                               (repo root)
  TYPES.ts                                                           (repo root)
  social-calendar-mobile/src/theme/colors.ts
  social-calendar-mobile/src/theme/haptics.ts
  social-calendar-mobile/src/theme/motion.ts
  social-calendar-mobile/src/components/social/TwoTapDestructive.tsx
  social-calendar-mobile/src/components/social/FilterChipRowMulti.tsx
  social-calendar-mobile/src/components/eventFlow/FilterChipRow.tsx
  social-calendar-mobile/src/components/polish/StaggerList.tsx
  social-calendar-mobile/src/components/foundation/RingAvatar.tsx
  social-calendar-mobile/src/components/foundation/PillBtn.tsx
  social-calendar-mobile/src/components/notifications/RSVPBadge.tsx
  social-calendar-mobile/src/components/emptyStates/EmptyAttendees.tsx
  social-calendar-mobile/src/components/profile/AudiencePickerSheet.tsx
  social-calendar-mobile/src/api/events.ts
  social-calendar-mobile/src/api/friends.ts

Do not ask for clarification. Read silently and proceed.
If a file is missing, note it inline and continue.

================================================================
## CRITICAL PRE-BUILD NOTE — TYPE EXTENSION REQUIRED
================================================================

The current Event interface in TYPES.ts (repo root) is missing
coHostIds. The spec (R11-6) requires it. Before building any
component, add this field to the Event interface:

  /** Co-host user ids (R11-6). Empty array when no co-hosts. */
  coHostIds: string[];

Add it directly after hostId in the Event interface. Do not replace
any other fields. After adding, update MOCK_EVENTS in
social-calendar-mobile/src/mocks/ to include coHostIds: [] on
every mock event so TypeScript stays clean.

================================================================
## WHAT YOU ARE BUILDING
================================================================

GAP 3 — AttendeesSheet + supporting components (R10, R11).

This is the sheet that lists every invitee on an event. It is
role-aware: the host gets full controls, co-hosts get invite access,
invitees are read-only. Role is computed locally from
event.hostId / event.coHostIds vs the current user's id — no
extra API call.

Files to create (do not already exist):
  social-calendar-mobile/src/components/social/AttendeesSheet.tsx
  social-calendar-mobile/src/components/social/AttendeeRow.tsx
  social-calendar-mobile/src/components/social/RowOverflowMenu.tsx
  social-calendar-mobile/src/components/social/CoHostBadge.tsx
  social-calendar-mobile/src/components/social/CoHostToast.tsx

Files to update:
  TYPES.ts                          (add coHostIds to Event — see above)
  social-calendar-mobile/src/mocks/ (add coHostIds: [] to every MOCK_EVENT)
  social-calendar-mobile/src/components/social/index.ts (if it exists — export new components)
  social-calendar-mobile/src/components/index.ts        (export new components)

================================================================
## BUILD ORDER — FOLLOW EXACTLY
================================================================

Build in this order. Do not reorder. Each step depends on the prior.

  STEP 1 — Type extension (TYPES.ts + mocks)
  STEP 2 — CoHostBadge
  STEP 3 — RSVPBadge re-export / alias check
  STEP 4 — RowOverflowMenu
  STEP 5 — CoHostToast
  STEP 6 — AttendeeRow
  STEP 7 — AttendeesSheet
  STEP 8 — TypeScript check
  STEP 9 — Exports

================================================================
## STEP 1 — TYPE EXTENSION
================================================================

File: TYPES.ts (repo root)

Add coHostIds to the Event interface:
  /** Co-host user ids (R11-6). Empty array when no co-hosts. */
  coHostIds: string[];

Place it directly after the hostId field.

Then open social-calendar-mobile/src/mocks/ and find every place
a mock Event object is defined. Add coHostIds: [] to each one.
TypeScript strict mode will catch any you miss.

================================================================
## STEP 2 — CoHostBadge
================================================================

File: social-calendar-mobile/src/components/social/CoHostBadge.tsx

Spec (ANCHOR — Round 11 Components):
  Inline chip · "CO-HOST" · mono 9/600 · accentSoft fill ·
  accent text · radius 999 · padding 3×8.
  Renders inline after the name on AttendeeRow (trailing name).
  Visible to all viewers (R11-3).

Props:
  CoHostBadge({ T?: Theme })

Implementation notes:
- Text: "CO-HOST" — all caps, always, hardcoded string.
- Font: monospace 9px weight 600. Use typography token if one maps;
  otherwise StyleSheet with fontFamily: 'Courier' or equivalent mono.
  Never use a hardcoded hex for color — use T.accentSoft and T.accent.
- No press state. No haptic. Purely decorative label chip.
- Render inline (alignSelf: 'flex-start') so it sits next to the name.

================================================================
## STEP 3 — RSVPBadge IMPORT CHECK
================================================================

RSVPBadge already exists at:
  social-calendar-mobile/src/components/notifications/RSVPBadge.tsx

AttendeeRow (Step 6) will import it from there. No new file needed.
Just confirm it exports RSVPBadge and RSVPBadgeProps before proceeding.
If the import path would be awkward, move it to components/social/ and
update the notifications import. Either way — one canonical file.

================================================================
## STEP 4 — RowOverflowMenu
================================================================

File: social-calendar-mobile/src/components/social/RowOverflowMenu.tsx

Spec (ANCHOR — Round 11 Components):
  Small floating menu · radius 12 · bgElevated ·
  shadow 0 8px 28px rgba(0,0,0,.18).
  Appears anchored below-trailing of the ⋯ btn that opened it.
  Max 3 items. Each item: 44px row · 15/500 · leading icon (20px).
  Destructive item: popInk text + danger icon.
  Tapping outside or pressing Esc → onClose (light haptic).
  A11y: role="menu" · each item role="menuitem" · focus trap.
  Animation: opacity 0→1 + scale 0.95→1 · 150ms easeOut.

Props:
  RowOverflowMenu({
    T?: Theme,
    items: OverflowMenuItem[],
    onClose: () => void,
    anchorPosition?: { top: number; right: number },  // screen coords
  })

  interface OverflowMenuItem {
    label: string;
    icon: string;           // Ionicons name
    onPress: () => void;
    destructive?: boolean;  // renders in popInk with danger icon tint
  }

Implementation notes:
- Render as a Modal (transparent, no backdrop color from Modal itself)
  with a full-screen Pressable backdrop behind the menu card. Backdrop
  tap → onClose() with light haptic.
- The menu card is a View positioned absolutely using anchorPosition
  (top/right from the ⋯ button's onLayout). If anchorPosition is
  undefined, default to { top: 120, right: 16 }.
- Animation: use Reanimated useSharedValue for opacity (0→1) and
  scale (0.95→1) with 150ms withTiming + Easing.out(Easing.ease).
  Run on mount. No exit animation needed (Modal unmount is instant enough).
- Each item row: 44px minHeight, horizontal padding 16, flexDirection row,
  alignItems center. Leading icon (Ionicons, 20px, color = destructive ?
  T.popInk : T.ink). Text 15/500, color = destructive ? T.popInk : T.ink.
- Haptic on open: light (fired by the caller — RowOverflowMenu itself
  does NOT fire on mount per H-3).
- Haptic on item tap: caller's onPress handles it. RowOverflowMenu does
  NOT double-fire haptics.
- Haptic on outside-tap dismiss: light — fire it here inside the
  backdrop Pressable onPress before calling onClose().
- A11y: wrap the menu card View with accessibilityRole="menu".
  Each item Pressable gets accessibilityRole="menuitem".

================================================================
## STEP 5 — CoHostToast
================================================================

File: social-calendar-mobile/src/components/social/CoHostToast.tsx

Spec (ANCHOR — Round 11):
  Docked above tab bar (left:14, right:14, bottom:24). Radius 14.
  accentSoft fill · 1.5px accent border.
  Layout: star icon (16px accent) · "You're a co-host" (13/700 ink) ·
    "{eventName}" (11/500 ink2, 1-line ellipsis) · close X icon-btn.
  flow-fade-up 320ms spring. Auto-dismiss 3200ms.
  role="alert" · aria-live="polite".
  Success haptic fires WITH the toast appearing (H-5).

Props:
  CoHostToast({
    T?: Theme,
    visible: boolean,
    eventName: string,
    onDismiss: () => void,
  })

Implementation notes:
- Position: absolute, left 14, right 14, bottom 24. Render inside a
  root-level portal if available; otherwise the parent must guarantee
  z-index above the tab bar.
- Animation: Reanimated useSharedValue translateY (20→0) + opacity (0→1)
  on visible=true using withSpring (damping 18, stiffness 200, mass 0.8)
  for translateY and withTiming 200ms for opacity.
  On dismiss: fade out withTiming 160ms, then call onDismiss after.
- Auto-dismiss: useEffect watching `visible`. When visible becomes true,
  start a 3200ms timer → call onDismiss(). Clear timer on unmount or
  if visible flips to false early.
- Success haptic: fire('success') in the useEffect when visible becomes
  true. Fire once — do not repeat.
- Star icon: Ionicons "star" size 16 color T.accent.
- Close X: Ionicons "close" size 16 color T.ink3. 44pt hit target.
  Tap → onDismiss() with light haptic.
- accessibilityRole="alert" on the container View.

================================================================
## STEP 6 — AttendeeRow
================================================================

File: social-calendar-mobile/src/components/social/AttendeeRow.tsx

Spec (ANCHOR — Round 10 + 11):

  HOST view trailing: ⋯ icon-btn (20px ink3 · 44pt hit) on all rows
    EXCEPT the host's own row. Opens RowOverflowMenu.
    Items: "Make/Remove co-host" + "Remove from event" (destructive).
    Standalone remove icon-btn is REMOVED (R11-4).
  CO-HOST + INVITEE view trailing: RSVPBadge only. No ⋯ btn.
  Co-host rows: CoHostBadge renders inline after name on all views.
  Swipe-to-arm for remove (R10-4) unchanged — host view only.

Row anatomy (R10-7):
  64px minHeight. Full-width.
  bgElevated default · dangerSoft when armed.
  Left:   RingAvatar 40px (status ring per availability — pass
          availState prop; null if unknown).
  Center: name 15/600 · @handle mono 12/500 ink3 below.
          CoHostBadge renders inline after name IF attendee.isCoHost.
  Right:  RSVPBadge right-aligned.
          HOST view (not own row): ⋯ btn replaces nothing — it sits
          BETWEEN the CoHostBadge/name area and RSVPBadge. Actually:
          trailing slot = ⋯ btn (host, not own row) OR RSVPBadge only
          (all other cases). Put RSVPBadge always; ⋯ btn is an
          additional trailing element for host view.

Armed state (host view remove — R10-4):
  Row bg → dangerSoft.
  "Remove" 13/600 popInk text label replaces the ⋯ btn.
  Entire row is tappable to commit remove.
  Swipe handler: rightward drag ≥44px → onArm(). <44px → spring back.
  No haptic on spring-back-only swipe (<44px).

Props:
  AttendeeRow({
    T?: Theme,
    attendee: AttendeeRowData,   // see interface below
    viewerRole: 'host' | 'co-host' | 'invitee',
    isOwnRow: boolean,           // true when attendee.id === currentUserId
    armed: boolean,
    onArm: () => void,
    onCommit: () => void,        // remove confirmed
    onCancel: () => void,
    onMakeCoHost: () => void,
    onRemoveCoHost: () => void,
    onPress: () => void,         // tap row body → Friend Profile (light haptic)
  })

  interface AttendeeRowData {
    id: string;
    name: string;
    handle: string;
    letter: string;              // single char for RingAvatar fallback
    avatarUrl?: string | null;
    availState?: 'free' | 'maybe' | 'busy' | null;
    rsvpStatus: RSVPStatus;
    isCoHost: boolean;
  }

Implementation notes — swipe gesture:
- Use react-native-gesture-handler PanGestureHandler to detect
  rightward drag. translationX ≥ 44 → call onArm() + heavy haptic.
  translationX < 44 on release → spring back (Reanimated withSpring)
  + light haptic ONLY if the drag actually moved (translationX > 4).
  Do NOT haptic on incidental zero-movement release.
- Armed auto-cancel: parent AttendeesSheet manages armedRowId and
  passes armed prop. Row does NOT manage its own armed timer —
  AttendeesSheet manages the 4s auto-cancel via useEffect.

Implementation notes — RowOverflowMenu:
- When ⋯ btn is pressed: measure the btn's screen position with
  onLayout + ref.measure(), store as anchorPosition state, then
  set menuOpen=true. Light haptic on open.
- RowOverflowMenu items for a non-co-host attendee row:
    { label: 'Make co-host', icon: 'star-outline', onPress: onMakeCoHost }
    { label: 'Remove from event', icon: 'person-remove-outline',
      onPress: () => { menuClose(); onArm(); }, destructive: true }
- RowOverflowMenu items for a co-host attendee row:
    { label: 'Remove co-host', icon: 'star', onPress: onRemoveCoHost }
    { label: 'Remove from event', icon: 'person-remove-outline',
      onPress: () => { menuClose(); onArm(); }, destructive: true }
- "Remove from event" via menu dismisses menu THEN arms the row
  (same TwoTapDestructive flow — heavy haptic on arm, second tap commits).

================================================================
## STEP 7 — AttendeesSheet
================================================================

File: social-calendar-mobile/src/components/social/AttendeesSheet.tsx

This is the main sheet. Read R10 and R11 in ANCHOR-DESIGN.txt
in full before writing a single line.

Props:
  AttendeesSheet({
    T?: Theme,
    open: boolean,
    event: Event,
    attendees: AttendeeRowData[],   // pre-fetched by caller
    currentUserId: string,
    friendTypes: FriendType[],      // for Row 2 filter chips (host only)
    groups: SocialGroup[],          // for Row 2 filter chips (host only)
    onRemove: (userId: string) => void,
    onMakeCoHost: (userId: string) => void,
    onRemoveCoHost: (userId: string) => void,
    onInviteMore: () => void,       // opens AudiencePickerSheet (caller's job)
    onClose: () => void,
  })

─────────────────────────────────────────────
ROLE RESOLUTION (compute inside component):
─────────────────────────────────────────────

  const isHost    = event.hostId === currentUserId;
  const isCoHost  = event.coHostIds.includes(currentUserId);
  const viewerRole: 'host' | 'co-host' | 'invitee' =
    isHost ? 'host' : isCoHost ? 'co-host' : 'invitee';

─────────────────────────────────────────────
INTERNAL STATE (useState only — no Zustand, no Query):
─────────────────────────────────────────────

  rsvpFilter:      'all' | 'yes' | 'maybe' | 'no' | null  (default 'all')
  typeGroupFilter: 'all' | string                          (default 'all')
  searchQuery:     string                                  (default '')
  armedRowId:      string | null                           (default null)
  menuOpenForId:   string | null                           (RowOverflowMenu open for which row)

─────────────────────────────────────────────
SHEET SHELL:
─────────────────────────────────────────────

  Bottom sheet, radius 22 22 0 0, max-height 88% of screen.
  38×4 grab handle centered at top (bgSunken fill, radius 999).
  Backdrop: Modal transparent + full-screen Pressable with
  backgroundColor rgba(0,0,0,0.42).
  Drag-down >80px → onClose() + light haptic.
  Animation: flow-sheet-up 280ms spring on open ·
  flow-sheet-down 240ms easeStd on close.
  Use Reanimated for both. Check ANCHOR motion tokens before picking
  spring/easing values — do not hardcode spring params.
  A11y: accessibilityViewIsModal + accessibilityRole="none" on backdrop,
  inner sheet gets role="dialog" equivalent (accessibilityRole="none"
  with a labelled region is acceptable in RN — use what's available).

─────────────────────────────────────────────
HEADER (role-aware):
─────────────────────────────────────────────

HOST + CO-HOST view:
  Title: "Attendees" 17/800 left-aligned.
  Sub: "{attendees.length} invited" 12/500 ink3.
  "Invite more" accent PillBtn trailing. Tap → onInviteMore() +
  success haptic (after invite completes — fire on callback, not on tap).
  Actually: fire success haptic when new invitees land (caller handles).
  On tap itself: medium haptic (opening a new sheet).
  Close X: Ionicons "close" · top-right · 44pt · light haptic → onClose().

INVITEE view:
  Title + Sub same. NO "Invite more." Same Close X.

─────────────────────────────────────────────
FILTER BAR:
─────────────────────────────────────────────

IMPORTANT: Both filter rows use SINGLE-select semantics (like radio
buttons — exactly one chip active at a time), NOT the multi-select
FilterChipRowMulti. Use FilterChipRow from components/eventFlow/
(or build a local single-select chip row if FilterChipRow's API
doesn't fit). The INTERSECTION across Row 1 + Row 2 means:
show attendees who match BOTH the selected RSVP chip AND the selected
type/group chip. FilterChipRowMulti emits arrays and uses UNION
semantics — wrong for this surface.

HOST view — Row 1 (RSVP, 8px below header):
  Chips: All · Going · Maybe · Not going · No response
  Values: 'all' | 'yes' | 'maybe' | 'no' | null
  Light haptic on chip tap.

HOST view — Row 2 (type/group, 8px below Row 1):
  Chips: All · {friendType.label for each FriendType} ·
         {group.name for each SocialGroup}
  Values: 'all' | friendType.id | group.id
  Light haptic on chip tap.
  Omit Row 2 entirely if friendTypes and groups are both empty.

CO-HOST + INVITEE view:
  Row 1 (RSVP) only. Same chips as host Row 1. No Row 2.

─────────────────────────────────────────────
SEARCH INPUT (8px below filter bar):
─────────────────────────────────────────────

Full-width · SearchInputBar style:
  bgSunken fill · radius 12 · leading magnifier icon (ink3) ·
  trailing × ONLY when value is present (light haptic on tap × ).
  Placeholder: "Search attendees…"
  Filters the ALREADY-FILTERED list (post-chip) in-memory — no
  network call (R10-6). Case-insensitive match on name + handle.

─────────────────────────────────────────────
LIST BODY:
─────────────────────────────────────────────

Sorting (apply before filtering):
  Going → Maybe → No response → Not going
  (rsvpStatus: 'yes' → 'maybe' → null → 'no')

Filtering pipeline (apply in this order):
  1. Sort by RSVP order above.
  2. Apply rsvpFilter (skip if 'all'; map chip value to RSVPStatus).
  3. Apply typeGroupFilter (HOST only; skip if 'all').
     FriendType filter: show attendees whose id is in
     friendTypes.find(ft => ft.id === typeGroupFilter)?.members.
     Group filter: show attendees whose id is in
     groups.find(g => g.id === typeGroupFilter)?.members.map(m => m.id).
  4. Apply searchQuery: case-insensitive includes on name + handle.

Render:
  FlatList (not ScrollView) for performance.
  Each row: AttendeeRow with correct props.
  armed = armedRowId === attendee.id.
  onArm: setArmedRowId(attendee.id) — auto-cancel via:
    useEffect watching armedRowId: when non-null, start 4s timeout
    → setArmedRowId(null) + light haptic.
    Clear timer when armedRowId changes or component unmounts.
  onCommit: calls onRemove(attendee.id). Optimistically updates
    local attendee count in header sub. Success haptic (AttendeeRow
    fires it — do not double-fire here).
  onCancel: setArmedRowId(null) + light haptic.
  onMakeCoHost: calls onMakeCoHost(attendee.id). Optimistic:
    update local attendee's isCoHost = true. Success haptic.
  onRemoveCoHost: calls onRemoveCoHost(attendee.id). Optimistic:
    update local attendee's isCoHost = false. Light haptic.
  onPress (row body tap): light haptic. Navigate to Friend Profile
    (stub — log 'TODO: navigate to Friend Profile for {id}' for now,
    per CLAUDE.md deferred note).

StaggerList entrance on initial open: wrap AttendeeRow list in
  StaggerList for first render. 320ms spring · 30ms/item stagger.
  New rows from "Invite more" also get StaggerList entrance
  (base delay 0ms, same stagger config — animate in at bottom).

─────────────────────────────────────────────
EMPTY STATES:
─────────────────────────────────────────────

When filtered/searched list is empty:
  HOST view: render EmptyAttendees component (already exists in
    emptyStates/). Check its props and pass what it needs.
  CO-HOST + INVITEE view: inline centered block — plain Text
    "Nobody matches" · ink3 · 15/400 · no CTA.
    Never show "Add invitees" to non-host.

─────────────────────────────────────────────
HAPTICS SUMMARY (verify against ANCHOR — AttendeesSheet section):
─────────────────────────────────────────────

  Sheet open                     light
  Sheet close                    light
  Chip tap (filter change)       light
  Search clear ×                 light
  Row tap → Friend Profile       light
  Remove armed (tap or swipe)    heavy
  Remove committed               success
  Remove cancelled / spring-back light
  "Invite more" tap              medium   (opening new sheet)
  New rows animate in            (no haptic — H-3)
  ⋯ menu open                    light
  ⋯ menu dismiss                 light
  "Make co-host" confirmed       success
  "Remove co-host" confirmed     light
  CoHostToast fires              success

================================================================
## STEP 8 — TypeScript CHECK
================================================================

From the repo root, run:

  cd social-calendar-mobile && npx tsc --noEmit

Fix all errors before proceeding. Exit 0 is required.
Common issues to watch for:
  - coHostIds missing on any MOCK_EVENT object
  - AttendeeRowData not exported or imported correctly
  - RSVPBadge import path if you moved it
  - RowOverflowMenu anchorPosition type

================================================================
## STEP 9 — EXPORTS
================================================================

Add new components to:
  social-calendar-mobile/src/components/social/index.ts
    (or create it if missing)
  social-calendar-mobile/src/components/index.ts

Export:
  AttendeesSheet
  AttendeeRow
  AttendeeRowData (type)
  RowOverflowMenu
  OverflowMenuItem (type)
  CoHostBadge
  CoHostToast

================================================================
## HARD RULES — NEVER VIOLATE
================================================================

These are non-negotiable. Violating any is a build failure.

1. Design tokens only. Never hardcode hex values, font sizes as raw
   numbers, or spacing as magic numbers. Use src/theme/colors.ts,
   typography.ts, spacing.ts. The only exception is a value explicitly
   stated in the spec that has no token (e.g. the 38×4 grab handle size).

2. Haptics via useHaptic() only. Never call expo-haptics directly.
   Only the 6 types: light · medium · heavy · success · warning · error.

3. Destructive actions via TwoTapDestructive / the arm→commit pattern
   only. No confirmation modals. No single-tap deletes.

4. No Zustand. All state in this component is local (useState/useReducer).
   The attendees list is passed in as a prop — the caller fetches it
   via React Query. AttendeesSheet itself calls no hooks from src/api/.

5. Spinner only for loading states if any are needed. No skeletons,
   no shimmer.

6. StaggerList for entrance animations. No custom stagger logic.

7. CoHostToast is separate from BroadcastToast. Do not merge them.
   CoHostToast is defined in components/social/. BroadcastToast stays
   in components/profile/. Same visual position, different components.

8. The ⋯ menu "Remove from event" path flows through the same
   arm→commit (R10-4) pattern. The menu tap ARMS the row. The user
   must tap the armed row to commit. No shortcut.

================================================================
## WHAT NOT TO BUILD
================================================================

- Do NOT build QuickProfileSheet (GAP 4) — deferred.
- Do NOT wire AttendeesSheet to a nav screen. It is a sheet opened
  by its parent (typically EventDetailScreen). For now, open it from
  EventDetailScreen's attendee avatar stack tap and "+N more" pill
  if those exist; otherwise leave a TODO comment.
- Do NOT build the AudiencePickerSheet — it already exists.
  onInviteMore() is a prop; the caller is responsible for opening it.
- Do NOT add Friend Profile navigation — stub it with a console.log
  (per CLAUDE.md: "stub as a no-op until Friend Profile is fully designed").

================================================================
## DEFINITION OF DONE
================================================================

  ✓ npx tsc --noEmit exits 0
  ✓ CoHostBadge renders "CO-HOST" chip in accentSoft/accent
  ✓ RowOverflowMenu appears anchored to ⋯ btn, animates in,
    dismisses on outside tap
  ✓ CoHostToast animates in above tab bar, auto-dismisses at 3200ms,
    fires success haptic on appear
  ✓ AttendeeRow: RingAvatar + name + handle + CoHostBadge (if co-host)
    + RSVPBadge renders correctly for all three viewer roles
  ✓ HOST view: ⋯ btn on all rows except own; swipe-to-arm on all rows
  ✓ CO-HOST + INVITEE: RSVPBadge only, no ⋯, no swipe-to-arm
  ✓ AttendeesSheet opens with spring animation, closes with ease
  ✓ Filter chips (single-select) filter the list; Row 1 + Row 2
    combine as INTERSECTION (host only)
  ✓ Search filters post-chip list in-memory, no network call
  ✓ Armed row: dangerSoft bg, "Remove" label, full-row tap commits
  ✓ Armed auto-cancels after 4s with light haptic
  ✓ Empty state: EmptyAttendees for host, "Nobody matches" for others
  ✓ StaggerList entrance on initial render
  ✓ All haptics match the table in STEP 7 exactly
  ✓ coHostIds: [] present on all MOCK_EVENTS
  ✓ All new components exported from components/index.ts

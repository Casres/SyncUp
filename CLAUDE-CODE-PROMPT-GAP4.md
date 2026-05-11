# Claude Code — GAP 4: QuickProfileSheet
# SyncUp · Generated 2026-05-11
# Run this from the repo root.
# Complete all steps in order. Do not skip or mark done until tested.
================================================================

## AUTONOMOUS EXECUTION INSTRUCTIONS

Run this entire prompt start to finish without stopping to ask for
confirmation, clarification, or approval at any step. The spec is
complete. If you encounter a decision point not covered here, make
the choice most consistent with existing codebase patterns and keep
moving. Do not pause. Do not summarize mid-build.
Only stop if TypeScript exits non-zero — fix errors and continue.
Deliver a final handoff summary when done (same format as GAP 3).

================================================================
## MANDATORY PRE-FLIGHT — READ EVERY FILE LISTED BEFORE WRITING CODE

Read these files in full before touching a single line of code.
No exceptions, no skipping.

  ANCHOR-DESIGN.txt                                                  (repo root)
  FRONTEND-HANDOFF.txt                                               (repo root)
  TYPES.ts                                                           (repo root)
  social-calendar-mobile/src/theme/colors.ts
  social-calendar-mobile/src/theme/haptics.ts
  social-calendar-mobile/src/theme/motion.ts
  social-calendar-mobile/src/components/social/TwoTapDestructive.tsx
  social-calendar-mobile/src/components/foundation/RingAvatar.tsx
  social-calendar-mobile/src/components/foundation/PillBtn.tsx
  social-calendar-mobile/src/components/polish/Spinner.tsx
  social-calendar-mobile/src/components/polish/ErrorToast.tsx
  social-calendar-mobile/src/components/profile/StatTile.tsx
  social-calendar-mobile/src/components/foundation/Overline.tsx
  social-calendar-mobile/src/api/friends.ts

Do not ask for clarification. Read silently and proceed.
If a file is missing, note it inline and continue.

================================================================
## CONTEXT — WHERE THIS SHEET LIVES
================================================================

QuickProfileSheet is triggered by tapping a PEOPLE row body inside
the Search overlay (GAP 2, not yet built). Since Search doesn't
exist yet, this component is built as a fully self-contained,
prop-driven sheet. The trigger wiring into SearchOverlay happens
in GAP 2. For now, leave a TODO comment in the file:

  // TODO (GAP 2): Trigger from PEOPLE row body tap in SearchOverlay.

The sheet stacks ON TOP of the Search overlay. The Search overlay
stays mounted behind it — it does not unmount or dim further.
Backdrop is 30% black (not the standard 42%) because the overlay
underneath is already opaque (R12-5).

================================================================
## WHAT YOU ARE BUILDING
================================================================

GAP 4 — QuickProfileSheet (R12-5, R12-6).

A public mini-profile bottom sheet for a non-friend user found
via Search. Shows limited data only (R12-6) — name, handle,
mutual friends, bio, hosted/attended stats. Never shows
availability, friend count, or group membership.

Files to create:
  social-calendar-mobile/src/components/social/QuickProfileSheet.tsx

Files to update:
  social-calendar-mobile/src/components/social/index.ts   (export)
  social-calendar-mobile/src/components/index.ts           (export)

No new types needed in TYPES.ts — all shapes are inline props
(see Step 3 for the exact interface).

================================================================
## BUILD ORDER
================================================================

  STEP 1 — Pre-flight reads (mandatory — see above)
  STEP 2 — Confirm existing components are importable
  STEP 3 — Build QuickProfileSheet
  STEP 4 — TypeScript check
  STEP 5 — Exports

================================================================
## STEP 2 — CONFIRM IMPORTS BEFORE BUILDING
================================================================

Before writing QuickProfileSheet, confirm these components exist
and can be imported cleanly. If any are missing, note it and
use a minimal inline fallback — do not block the build.

  RingAvatar           from components/foundation/RingAvatar
  PillBtn              from components/foundation/PillBtn
  Spinner              from components/polish/Spinner
  ErrorToast           from components/polish/ErrorToast
  StatTile             from components/profile/StatTile
  Overline             from components/foundation/Overline
  TwoTapDestructive    from components/social/TwoTapDestructive
  useHaptic            from theme/haptics

================================================================
## STEP 3 — QuickProfileSheet
================================================================

File: social-calendar-mobile/src/components/social/QuickProfileSheet.tsx

─────────────────────────────────────────────
PROPS INTERFACE:
─────────────────────────────────────────────

  interface QuickProfilePerson {
    id: string;
    name: string;
    handle: string;       // includes @ prefix, e.g. "@taro"
    letter: string;       // single char avatar fallback
    photoUrl?: string | null;
    bio?: string | null;
  }

  interface QuickProfileMutualFriend {
    id: string;
    name: string;
    letter: string;
    availState?: 'free' | 'maybe' | 'busy' | null;
  }

  interface QuickProfileStats {
    hosted: number;
    attended: number;
  }

  type FriendRequestStatus = 'none' | 'sent' | 'received';

  interface QuickProfileSheetProps {
    T?: Theme;
    open: boolean;
    loading?: boolean;           // true while person data is fetching
    person: QuickProfilePerson | null;
    mutualFriends: QuickProfileMutualFriend[];  // max 5 rendered
    stats: QuickProfileStats | null;
    friendRequestStatus: FriendRequestStatus;
    onAddFriend: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onClose: () => void;
  }

─────────────────────────────────────────────
SHEET SHELL:
─────────────────────────────────────────────

  Bottom sheet · radius 22 22 0 0 · max-height 72% of screen.
  38×4 grab handle centered at top (bgSunken fill · radius 999).
  Backdrop: Modal transparent + full-screen Pressable with
    backgroundColor rgba(0,0,0,0.30)   ← 30%, NOT the usual 42%.
    This is intentional — R12-5. The sheet stacks on Search overlay.
  Drag-down >80px → onClose() + light haptic.
  Close X icon-btn (Ionicons "close") · top-right · 44pt ·
    light haptic → onClose().
  Animation: flow-sheet-up 280ms spring on open ·
    flow-sheet-down 240ms easeStd on close.
    Use Reanimated. Check motion.ts for spring/easing tokens.
  A11y: accessibilityViewIsModal on the sheet container.

─────────────────────────────────────────────
LOADING STATE:
─────────────────────────────────────────────

  When loading=true OR person=null (data not yet resolved):
  Render a centered 40px MD Spinner in the sheet body.
  Do not render identity block, CTA, or body sections.
  The sheet shell (grab handle, close X, backdrop) still renders.

─────────────────────────────────────────────
IDENTITY BLOCK (non-scrollable · centered):
─────────────────────────────────────────────

  24px below grab handle.

  RingAvatar:
    size=64 · NO status ring (non-friend per R12-6).
    Pass showRing={false} or equivalent prop.
    Centered horizontally.

  Name:
    20px · weight 800 · letterSpacing -0.5 · color T.ink.
    Centered · 8px below avatar.

  Handle:
    13px · weight 500 · monospace · color T.ink3.
    Centered · 4px below name.

  CTA block (full-width · 24px below handle):
    Three states based on friendRequestStatus:

    'none':
      "Add friend" accent PillBtn · full-width.
      Tap: call onAddFriend() + optimistically swap to 'sent' state
      (manage locally via useState — see optimistic section below).
      Haptic: success (fires on tap, not on API response — optimistic).

    'sent':
      Ghost PillBtn · full-width · label "Requested" ·
      leading Ionicons "checkmark-circle" icon 16px limeInk.
      Non-interactive (disabled=true, but no reduced opacity —
      it should look intentional, not broken).

    'received':
      Two-up row: "Accept" accent PillBtn + "Decline" ghost PillBtn.
      Equal width · 8px gap.
      "Accept": calls onAccept() · success haptic.
      "Decline": TwoTapDestructive · label="Decline" ·
        confirmLabel="Confirm" · onConfirm=onDecline.
        light haptic on arm · light haptic on commit (NOT heavy —
        declining a friend request is not as destructive as a delete).
        IMPORTANT: pass a custom arm haptic to TwoTapDestructive if
        it supports it, or fork the arm behavior. Default
        TwoTapDestructive fires heavy on arm — override to light here.
        If TwoTapDestructive doesn't support overriding the arm haptic,
        check its source and add an optional armHaptic prop.

─────────────────────────────────────────────
OPTIMISTIC FRIEND REQUEST STATE:
─────────────────────────────────────────────

  Manage an internal localStatus: FriendRequestStatus state,
  initialized from the friendRequestStatus prop.

  "Add friend" tap:
    setLocalStatus('sent') immediately (optimistic).
    Call onAddFriend().
    On failure: the parent must call back — expose an onAddFriendError
    callback OR the parent can re-render with friendRequestStatus='none'
    to revert. To keep it simple: add an optional onAddFriendError prop.
    If not provided, the parent handles revert by updating the prop.
    Either way: also fire ErrorToast (kind: friend) on failure.
    NOTE: The "Requested" state also needs to propagate back to the
    underlying PEOPLE row in SearchOverlay (GAP 2 concern — leave a
    TODO comment here, the parent handles this via the onAddFriend
    callback).

─────────────────────────────────────────────
1PX HAIR SEPARATOR (between CTA block and body):
─────────────────────────────────────────────

  View · height StyleSheet.hairlineWidth · backgroundColor T.hair ·
  full-width · marginTop 16 below CTA block.

─────────────────────────────────────────────
BODY (scrollable ScrollView):
─────────────────────────────────────────────

MUTUAL FRIENDS SECTION:
  Omit entire block if mutualFriends.length === 0.
  If present:
    Overline label: "{N} MUTUAL FRIEND{S}" (pluralize correctly).
    Left-aligned · 16px top padding inside scroll area.
    Avatar row below overline: up to 5 RingAvatar · size=24 ·
      WITH status ring (these are the viewer's friends, so
      availState is known — pass it from mutualFriend.availState).
      6px gap between avatars · left-aligned.
    Name labels omitted at 24px size.
    Tap any mutual friend avatar → no-op, no haptic.
    Add a comment: // TODO: navigate to Friend Profile (deferred per CLAUDE.md)

BIO SECTION:
  Omit if person.bio is null, undefined, or empty string.
  If present:
    No overline. Render directly below mutuals row (or below
    the separator if no mutuals).
    Text: 13/500 · color T.ink2.
    3-line clamp (numberOfLines=3 by default).
    "Read more" text link below if bio is long enough to clamp.
    Implement "Read more" by toggling a local boolean (expanded).
    When expanded: numberOfLines={undefined}, "Read more" becomes
    "Show less". Light haptic on either tap.

STATS SECTION:
  Always shown (even if stats values are 0).
  Two equal-width StatTile components side by side · 8px gap.
    StatTile 1: n={stats.hosted}   label="HOSTED"
    StatTile 2: n={stats.attended} label="ATTENDED"
  Full-width row · 8px gap · 16px top margin.
  NEVER add FRIENDS or GROUPS tiles (R12-6).
  If stats is null (still loading): render two placeholder tiles
  with n=0 and muted appearance — or just wait for loading state
  to resolve (simpler: only render body when loading=false).

─────────────────────────────────────────────
HAPTICS SUMMARY:
─────────────────────────────────────────────

  Sheet open                             light
  Sheet close (X or drag-down)           light
  "Add friend" → "Requested"            success
  "Accept" friend request                success
  "Decline" arm (first tap)              light   ← overrides TwoTap default
  "Decline" commit (second tap)          light
  "Read more" / "Show less" tap          light
  Tap mutual friend avatar               (no haptic · stub)

================================================================
## STEP 4 — TypeScript CHECK
================================================================

From the repo root, run:

  cd social-calendar-mobile && npx tsc --noEmit

Fix all errors before proceeding. Exit 0 required.
Common issues to watch for:
  - QuickProfilePerson and related interfaces — export them if
    other files will need them (SearchOverlay in GAP 2 will).
  - TwoTapDestructive armHaptic prop — if you added it, make sure
    it's typed correctly and backward-compatible (optional prop).
  - RingAvatar showRing prop — check the actual prop name in
    RingAvatar.tsx before using it.

================================================================
## STEP 5 — EXPORTS
================================================================

Add to social-calendar-mobile/src/components/social/index.ts:
  export { QuickProfileSheet } from './QuickProfileSheet';
  export type { QuickProfileSheetProps, QuickProfilePerson,
                QuickProfileMutualFriend, QuickProfileStats,
                FriendRequestStatus } from './QuickProfileSheet';

Add to social-calendar-mobile/src/components/index.ts:
  Export QuickProfileSheet and its types.

================================================================
## HARD RULES — NEVER VIOLATE
================================================================

1. Design tokens only. Never hardcode hex values. Use T.* from colors.ts.
2. Haptics via useHaptic() only. Never call expo-haptics directly.
   Only the 6 types: light · medium · heavy · success · warning · error.
3. Destructive actions: TwoTapDestructive only. No single-tap destroys.
4. No Zustand. State is local useState only.
5. Spinner only for loading. No skeletons, no shimmer.
6. Backdrop is 30% black — do NOT use the standard 42%. This is
   intentional per R12-5 and must not be "corrected."
7. NEVER show availability, friend count, or group membership
   in this sheet (R12-6). Enforce this even if data is available.
8. Mutual friend avatar tap is a no-op stub. No haptic, no nav,
   no placeholder modal. Just a comment.

================================================================
## WHAT NOT TO BUILD
================================================================

- Do NOT build SearchOverlay (GAP 2) — that comes later.
- Do NOT build the PEOPLE row — that's part of SearchOverlay.
- Do NOT add Friend Profile navigation to mutual friend avatars —
  stub as no-op per CLAUDE.md deferred note.
- Do NOT show more than 5 mutual friend avatars (slice the array).

================================================================
## DEFINITION OF DONE
================================================================

  ✓ npx tsc --noEmit exits 0
  ✓ Sheet opens with spring animation, closes with ease
  ✓ Backdrop is rgba(0,0,0,0.30) — confirmed in source
  ✓ Loading state: Spinner rendered when loading=true or person=null
  ✓ Identity block: RingAvatar (no ring) + name + handle centered
  ✓ CTA 'none': "Add friend" accent full-width pill
  ✓ CTA 'sent': "Requested" ghost pill + checkmark icon, non-interactive
  ✓ CTA 'received': "Accept" + "Decline" two-up, TwoTapDestructive
  ✓ "Decline" arm haptic is light (not heavy)
  ✓ Optimistic: "Add friend" tap swaps to 'sent' immediately
  ✓ Mutual friends: overline + up to 5 RingAvatars with status ring
  ✓ Mutual friends section omitted when mutualFriends.length === 0
  ✓ Bio: 3-line clamp + "Read more" toggle · omitted when empty
  ✓ Stats: HOSTED + ATTENDED StatTiles only, 2-up equal-width
  ✓ All haptics match table in Step 3 exactly
  ✓ QuickProfileSheet and types exported from components/index.ts
  ✓ TODO comment referencing GAP 2 trigger present in file

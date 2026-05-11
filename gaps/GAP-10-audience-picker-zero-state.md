# GAP 10 — AudiencePickerSheet zero-friend empty state (R13-4)
# Spec: ANCHOR-DESIGN.txt R13-4
# Estimated time: ~20 minutes
================================================================

## WHAT YOU ARE BUILDING

A small, targeted change to one existing component.
When AudiencePickerSheet is in mode='friends' and the friends list
is empty, render an inline empty state instead of an empty list.
The Done pill disables. Close X stays active.

Files to modify:
  social-calendar-mobile/src/components/profile/AudiencePickerSheet.tsx

No new files.

================================================================
## MANDATORY PRE-FLIGHT

Read these files in full before writing a single line:
  ANCHOR-DESIGN.txt  (R13-4 — search "R13-4")
  social-calendar-mobile/src/components/profile/AudiencePickerSheet.tsx

================================================================
## CHANGE SPEC

File: social-calendar-mobile/src/components/profile/AudiencePickerSheet.tsx

STEP 1 — Detect zero-friend state:
  const isZeroFriendState = mode === 'friends' && (!friends || friends.length === 0);

STEP 2 — Empty state UI (replaces friend list body when isZeroFriendState):

  Centered block inside the sheet body (not inside the ScrollView —
  render it as a flex-centered View that fills the available space):

    Icon tile:
      56×56 View · bgSunken fill · radius 16 · centered.
      Ionicons "people-outline" size 28 color T.ink3 · centered inside.

    Title:
      "No friends yet" · 15/700 · color T.ink · centered · 12px below tile.

    Body text:
      "Add friends to invite them to events."
      13/500 · color T.ink2 · centered · maxWidth 260 · 8px below title.

    NO CTA pill (R13-4 — never navigate away from a picker to add friends).

STEP 3 — Done pill behavior:
  When isZeroFriendState: Done pill is disabled (opacity 0.4,
  non-interactive). Close X remains active.
  When NOT isZeroFriendState: existing behavior unchanged.

STEP 4 — Optimistic gain of friends:
  If friends goes from [] to non-empty during the session (parent
  passes updated props), the empty state replaces itself with the
  friend list — this is automatic via React re-render, no special
  logic needed. Add a comment confirming this.

STEP 5 — mode='types' is NEVER affected (R13-4):
  The zero-friend check must be gated on mode === 'friends'.
  Never show this empty state for mode='types'.

================================================================
## TypeScript CHECK

  cd social-calendar-mobile && npx tsc --noEmit

Exit 0 required. Fix all errors before finishing.

================================================================
## DEFINITION OF DONE

  ✓ tsc exits 0
  ✓ mode='friends' + empty friends array → empty state renders
  ✓ Empty state: icon tile + "No friends yet" + body text, no CTA
  ✓ Done pill disabled (opacity 0.4) in zero-friend state
  ✓ Close X remains active in zero-friend state
  ✓ mode='types' behavior completely unchanged
  ✓ Empty state disappears when friends array becomes non-empty

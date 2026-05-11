# GAP 9 — BroadcastToast `queued` prop (R13-3)
# Spec: ANCHOR-DESIGN.txt R13-3
# Estimated time: ~15 minutes
================================================================

## WHAT YOU ARE BUILDING

A small, targeted change to one existing component.
BroadcastToast needs a `queued` boolean prop. When true, the toast
fired on reconnect after an offline broadcast — the Undo window has
already passed, so the Undo pill must not render and the title changes.

Files to modify:
  social-calendar-mobile/src/components/profile/BroadcastToast.tsx

No new files. No new types (beyond the prop addition).

================================================================
## MANDATORY PRE-FLIGHT

Read these files in full before writing a single line:
  ANCHOR-DESIGN.txt  (R13-3 — search "R13-3")
  social-calendar-mobile/src/components/profile/BroadcastToast.tsx

================================================================
## CHANGE SPEC

File: social-calendar-mobile/src/components/profile/BroadcastToast.tsx

STEP 1 — Add prop to BroadcastToastProps:
  /** When true, broadcast was queued offline and fired on reconnect.
   *  Omits Undo pill and changes title copy (R13-3). */
  queued?: boolean;

STEP 2 — Title logic:
  queued=false (default): "Broadcast sent · {State}"   ← existing behavior
  queued=true:            "Broadcast sent · was queued"

  Implement as:
    const title = queued
      ? 'Broadcast sent · was queued'
      : `Broadcast sent · ${STATE_LABEL[status]}`;

STEP 3 — Undo pill:
  Only render the Undo pill when queued is falsy.
  Wrap the existing Undo pill render in: {!queued && ( ... )}

STEP 4 — All other behavior unchanged:
  Position, sizing, tokens, border, close X, auto-dismiss 3200ms,
  success haptic, A11y — all identical to the standard toast (R13-3).

STEP 5 — Update JSDoc at top of file:
  Add a note about the queued prop and R13-3.

================================================================
## TypeScript CHECK

  cd social-calendar-mobile && npx tsc --noEmit

Exit 0 required. Fix all errors before finishing.

================================================================
## DEFINITION OF DONE

  ✓ tsc exits 0
  ✓ queued prop is optional (defaults to false — backward compatible)
  ✓ queued=true: title is "Broadcast sent · was queued"
  ✓ queued=true: Undo pill does NOT render
  ✓ queued=false: existing behavior unchanged
  ✓ All other toast properties identical in both states

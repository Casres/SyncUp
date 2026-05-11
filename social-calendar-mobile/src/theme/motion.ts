/**
 * SyncUp Motion Tokens — React Native (Reanimated)
 *
 * Source of truth: ANCHOR.pdf v2.5 / TOKENS.ts (monorepo root, MOTION).
 *
 * No CSS strings. Easing curves are expressed as Reanimated `Easing` functions;
 * `spring`/`springSnappy` are exported as Reanimated spring config objects intended
 * for use with `withSpring(value, config)`. Durations are plain numbers in ms.
 *
 * Note on dep version: the workspace uses `react-native-reanimated` 4.x. The
 * `Easing.bezier` factory and spring config shapes are compatible across v2/v3/v4.
 */

import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/**
 * Reanimated spring configs.
 *
 * Use with: `withSpring(value, easings.spring)`.
 *
 * Bezier overshoot curves from the Anchor (`spring`: 0.34,1.56,0.64,1 and
 * `springSnappy`: 0.2,0.9,0.3,1.2) are not first-class easing functions on the
 * native side — they are emulated by physical spring configs tuned to produce a
 * comparable overshoot envelope. Use `withSpring`, NOT `withTiming`, for these.
 */
export const springs = {
  // Overshoot for entrances (RSVP cards, broadcast pop, sheet open).
  spring:       { damping: 10, stiffness: 150, mass: 1 } satisfies WithSpringConfig,
  // Tighter overshoot (chip carousel snap, tab pill, picker confirm).
  springSnappy: { damping: 12, stiffness: 200, mass: 0.8 } satisfies WithSpringConfig,
} as const;

/**
 * Reanimated timing easings — use with `withTiming(value, { duration, easing })`.
 *
 * - `easeOut`  (0.2, 0, 0,   1) — exits, dismissals
 * - `easeStd`  (0.4, 0, 0.2, 1) — standard transitions
 * - `linear`                    — spinner rotation, scrubbing
 */
export const easings = {
  easeOut: Easing.bezier(0.2, 0, 0, 1),
  easeStd: Easing.bezier(0.4, 0, 0.2, 1),
  linear:  Easing.linear,
} as const;

/**
 * Duration table — transcribed from the Anchor's CONFIRMED motion table.
 * All values are milliseconds.
 *
 * Notes:
 *   - Day-cell drag-paint: 0ms (instant, 1:1 finger tracking)
 *   - Parallax / scroll-bound transforms: FORBIDDEN (Hard Rule R5-3)
 */
export const durations = {
  tapFeedback:        200,   // tap / press feedback
  stepPush:           240,   // Step 1→2→3 advance
  sheetUp:            280,   // RSVP sheet, picker sheet
  modalUp:            280,   // Create-event modal
  broadcastCardOpen:  320,   // broadcast card spring open
  toastFadeUp:        320,   // BroadcastToast / ErrorToast entrance
  staggerList:        320,   // list entrance window
  staggerItemBase:    60,    // stagger list base delay
  staggerItemStep:    30,    // stagger list per-item delay increment
  staggerItemCap:     12,    // max stagger items before capping
  longPressArm:       450,   // chip carousel, RSVP pill long-press arm
  spinner:            900,   // su-spin rotation (linear infinite)
  toastAutoDismiss:   3200,  // BroadcastToast + ErrorToast auto-dismiss
  quicksetConfirm:    1600,  // Quickset "Applied" confirm feedback
  dayCellDragPaint:   0,     // instant — 1:1 finger tracking
} as const;

export type DurationKey = keyof typeof durations;
export type EasingKey = keyof typeof easings;
export type SpringKey = keyof typeof springs;

/**
 * Sheet rubber-band overscroll threshold (per ANCHOR motion table).
 * Use to clamp sheet drag distance before snap.
 */
export const sheetRubberBandPx = 100;

/**
 * Stagger config — derived from `durations` for ergonomic access.
 * Use as: total = baseMs + Math.min(index, capItems) * perItemMs.
 */
export const stagger = {
  baseMs:    durations.staggerItemBase,
  perItemMs: durations.staggerItemStep,
  capItems:  durations.staggerItemCap,
} as const;

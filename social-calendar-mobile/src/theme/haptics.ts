/**
 * SyncUp Haptics — React Native (expo-haptics)
 *
 * Source of truth: ANCHOR.pdf v2.5 / TOKENS.ts (HAPTICS, HAPTIC_DEBOUNCE_MS).
 * The 6 fixed haptic types map 1:1 to expo-haptics. Hard Rule R5-8: use ONLY
 * these types — no custom patterns, no chained haptics, no ad-hoc additions.
 */

import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/**
 * The 6 fixed SyncUp haptic types.
 * See ANCHOR.md "Haptic rules" for when each is appropriate.
 */
export const HAPTIC_TYPES = {
  light:   'light',
  medium:  'medium',
  heavy:   'heavy',
  success: 'success',
  warning: 'warning',
  error:   'error',
} as const;

export type HapticType = typeof HAPTIC_TYPES[keyof typeof HAPTIC_TYPES];

/** Hard Rule H-2: never stack haptics within 80ms. */
export const HAPTIC_DEBOUNCE_MS = 80;

const hapticMap: Record<HapticType, () => Promise<void>> = {
  light:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

// Module-level debounce timestamp — shared across all useHaptic() consumers so
// stacked haptics from sibling components within the 80ms window are coalesced.
let lastHapticAt = 0;

export type FireHaptic = (type: HapticType) => void;

/**
 * useHaptic — returns a stable `fire(type)` callback.
 *
 * Rules (enforced by convention, not the runtime):
 *   H-1. NEVER call on scroll, drag-momentum, or visual-only transitions.
 *   H-2. Debounced at 80ms — stacked calls within that window are silently dropped.
 *   H-3. NEVER call on initial mount or auto-fired events the user did not trigger.
 *
 * Usage:
 *   const fire = useHaptic();
 *   fire('medium'); // call ONCE per gesture
 */
export function useHaptic(): FireHaptic {
  return useCallback((type: HapticType) => {
    const now = Date.now();
    if (now - lastHapticAt < HAPTIC_DEBOUNCE_MS) return;
    lastHapticAt = now;
    hapticMap[type]().catch(() => {
      // Haptics may fail on simulator / unsupported devices — silent fail is correct.
    });
  }, []);
}

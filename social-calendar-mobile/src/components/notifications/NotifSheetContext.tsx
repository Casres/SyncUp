/**
 * NotifSheetContext — provider that exposes openPeek / openFull / dismiss
 * to any descendant. Mounted by RootNavigator so the TabBar, HomeScreen,
 * and the NotifSheet itself can drive sheet state without prop-drilling.
 *
 * Detents (R6-2 — fixed at exactly two snaps):
 *   PEEK_DETENT = 0.44   → translateY = screenHeight * (1 - 0.44)
 *   FULL_DETENT = 0.88   → translateY = screenHeight * (1 - 0.88)
 *   CLOSED      = 1.0    → translateY = screenHeight
 *
 * The shared translateY is kept inside the provider so the sheet can drive
 * its own transform while consumers only see the high-level intent
 * (openPeek / openFull / dismiss / isOpen).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Dimensions } from 'react-native';
import {
  AccessibilityInfo,
  type AccessibilityChangeEventName,
} from 'react-native';
import {
  runOnJS,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { durations, easings, springs } from '../../theme';

export const PEEK_DETENT = 0.44;
export const FULL_DETENT = 0.88;

export type NotifDetent = 'closed' | 'peek' | 'full';

export interface NotifSheetContextValue {
  /** Animate to peek (44%). Optional `onSettled` fires after the snap completes. */
  openPeek: (onSettled?: () => void) => void;
  /** Animate to full (88%). Optional `onSettled` fires after the snap completes. */
  openFull: (onSettled?: () => void) => void;
  /** Animate to closed (off-screen). Optional `onSettled` fires after the snap completes. */
  dismiss: (onSettled?: () => void) => void;
  /** True when sheet is at peek or full. */
  isOpen: boolean;
  /** Current detent — useful for gesture logic. */
  detent: NotifDetent;
  /** Reanimated translateY shared value (px from top). */
  translateY: SharedValue<number>;
  /**
   * Reanimated backdrop-opacity shared value (0–1).
   *
   * Driven directly by the provider on every animateTo() call instead of being
   * interpolated from translateY, so the reduced-motion fallback (R13-1) can
   * switch the backdrop instantly at release while the sheet still respects
   * the 200ms easeOut translate.
   */
  backdropOpacity: SharedValue<number>;
  /** Cached screen height the provider snapped to on mount. */
  screenHeight: number;
  /** True when the OS reduce-motion setting is on (drives spring vs timing). */
  reducedMotion: boolean;
}

const NotifSheetContext = createContext<NotifSheetContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
}

export function NotifSheetProvider({ children }: ProviderProps): React.JSX.Element {
  const screenHeight = Dimensions.get('window').height;
  const closedY = screenHeight;
  const peekY = screenHeight * (1 - PEEK_DETENT);
  const fullY = screenHeight * (1 - FULL_DETENT);

  const translateY = useSharedValue(closedY);
  // Backdrop opacity is owned by the provider so the reduced-motion path can
  // snap it instantly at release (R13-1) without dragging it along the 200ms
  // translate animation that drives the sheet body.
  const backdropOpacity = useSharedValue(0);
  const [detent, setDetent] = useState<NotifDetent>('closed');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Track OS reduce-motion preference. Worklet animation choices (spring vs
  // timing) read from this state; the gesture layer also references it.
  React.useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReducedMotion(enabled);
      })
      .catch(() => {
        // Not all platforms support this — treat as "off" and continue.
      });
    const evt: AccessibilityChangeEventName = 'reduceMotionChanged';
    const sub = AccessibilityInfo.addEventListener(evt, (enabled) => {
      if (active) setReducedMotion(enabled);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // Locked per ANCHOR / R6-2: closed=0, peek=0.30, full=0.42.
  const backdropForDetent = (d: NotifDetent): number => {
    if (d === 'full') return 0.42;
    if (d === 'peek') return 0.3;
    return 0;
  };

  const animateTo = useCallback(
    (target: number, next: NotifDetent, onSettled?: () => void) => {
      const targetBackdrop = backdropForDetent(next);
      const fireSettled = onSettled
        ? (finished?: boolean) => {
            'worklet';
            if (finished) runOnJS(onSettled)();
          }
        : undefined;

      if (reducedMotion) {
        // R13-1 reduced-motion fallback: 200ms easeOut translate, backdrop
        // switches instantly at release. Settle callback fires once the
        // translate finishes so haptic still aligns with the visual snap.
        translateY.value = withTiming(
          target,
          { duration: durations.tapFeedback, easing: easings.easeOut },
          fireSettled,
        );
        backdropOpacity.value = targetBackdrop;
      } else {
        // 320ms spring overshoot. Backdrop crossfade rides the same spring
        // for visual lockstep with the sheet.
        translateY.value = withSpring(target, springs.spring, fireSettled);
        backdropOpacity.value = withTiming(targetBackdrop, {
          duration: durations.sheetUp,
          easing: easings.easeStd,
        });
      }
      setDetent(next);
    },
    [reducedMotion, translateY, backdropOpacity],
  );

  const openPeek = useCallback(
    (onSettled?: () => void) => animateTo(peekY, 'peek', onSettled),
    [animateTo, peekY],
  );

  const openFull = useCallback(
    (onSettled?: () => void) => animateTo(fullY, 'full', onSettled),
    [animateTo, fullY],
  );

  const dismiss = useCallback(
    (onSettled?: () => void) => animateTo(closedY, 'closed', onSettled),
    [animateTo, closedY],
  );

  const value = useMemo<NotifSheetContextValue>(
    () => ({
      openPeek,
      openFull,
      dismiss,
      isOpen: detent !== 'closed',
      detent,
      translateY,
      backdropOpacity,
      screenHeight,
      reducedMotion,
    }),
    [openPeek, openFull, dismiss, detent, translateY, backdropOpacity, screenHeight, reducedMotion],
  );

  return (
    <NotifSheetContext.Provider value={value}>
      {children}
    </NotifSheetContext.Provider>
  );
}

export function useNotifSheet(): NotifSheetContextValue {
  const ctx = useContext(NotifSheetContext);
  if (!ctx) {
    throw new Error('useNotifSheet must be used inside <NotifSheetProvider>.');
  }
  return ctx;
}

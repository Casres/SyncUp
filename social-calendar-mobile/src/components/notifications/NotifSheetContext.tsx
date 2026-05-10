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
  /** Animate to peek (44%). */
  openPeek: () => void;
  /** Animate to full (88%). */
  openFull: () => void;
  /** Animate to closed (off-screen). */
  dismiss: () => void;
  /** True when sheet is at peek or full. */
  isOpen: boolean;
  /** Current detent — useful for gesture logic. */
  detent: NotifDetent;
  /** Reanimated translateY shared value (px from top). */
  translateY: SharedValue<number>;
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

  const animateTo = useCallback(
    (target: number, next: NotifDetent) => {
      if (reducedMotion) {
        translateY.value = withTiming(target, {
          duration: durations.tapFeedback,
          easing: easings.easeOut,
        });
      } else {
        translateY.value = withSpring(target, springs.spring);
      }
      setDetent(next);
    },
    [reducedMotion, translateY],
  );

  const openPeek = useCallback(() => {
    animateTo(peekY, 'peek');
  }, [animateTo, peekY]);

  const openFull = useCallback(() => {
    animateTo(fullY, 'full');
  }, [animateTo, fullY]);

  const dismiss = useCallback(() => {
    animateTo(closedY, 'closed');
  }, [animateTo, closedY]);

  const value = useMemo<NotifSheetContextValue>(
    () => ({
      openPeek,
      openFull,
      dismiss,
      isOpen: detent !== 'closed',
      detent,
      translateY,
      screenHeight,
      reducedMotion,
    }),
    [openPeek, openFull, dismiss, detent, translateY, screenHeight, reducedMotion],
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

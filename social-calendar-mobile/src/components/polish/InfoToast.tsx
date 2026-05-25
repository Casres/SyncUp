/**
 * InfoToast — Docked transient toast for non-error feedback.
 *
 * Introduced in R16-9 to back the DM and Report stubs (both fire feedback
 * messages without invoking a real backend). Same docking + auto-dismiss
 * behavior as ErrorToast, but:
 *   - No leading icon (clean text body — keeps the surface low-weight).
 *   - No Retry pill.
 *   - No internal haptic fire — caller decides (DM stub fires `light`,
 *     Report stub fires `success` per R16-9).
 *   - A11y: role="status" + accessibilityLiveRegion="polite" (non-
 *     interruptive, matches BroadcastToast convention).
 *
 * The screen owner positions this with TOAST_POSITION_DEFAULTS (re-exported
 * for ergonomics).
 *
 * Visual treatment in this round is intentionally identical to ErrorToast's
 * surface (dark ink fill with elevated text) — the distinction is conveyed
 * by content and by the absence of the alert glyph. If future rounds need
 * a more decorative variant (e.g. success green), extend `kind` here rather
 * than overloading ErrorToast.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, durations, radii, spacing, springs, typography } from '../../theme';

type Theme = typeof colors.light;

export interface InfoToastProps {
  T?: Theme;
  visible: boolean;
  /** Single-line message body. R5-6 ellipsis applies. */
  message: string;
  onClose: () => void;
  /** Optional override for auto-dismiss duration. Defaults to durations.toastAutoDismiss. */
  durationMs?: number;
}

export const TOAST_POSITION_DEFAULTS = {
  position: 'absolute',
  bottom: 24,
  left: 14,
  right: 14,
} as const satisfies ViewStyle;

export function InfoToast({
  T = colors.light,
  visible,
  message,
  onClose,
  durationMs,
}: InfoToastProps): React.JSX.Element | null {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: durations.toastFadeUp });
      translate.value = withSpring(0, springs.spring);
      const t = setTimeout(onClose, durationMs ?? durations.toastAutoDismiss);
      return () => clearTimeout(t);
    }
    opacity.value = withTiming(0, { duration: durations.tapFeedback });
    translate.value = withTiming(8, { duration: durations.tapFeedback });
    return undefined;
  }, [visible, opacity, translate, durationMs, onClose]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        { backgroundColor: T.ink, shadowColor: T.ink },
        animStyle,
      ]}
    >
      <Text
        style={[styles.message, { color: T.bgElevated }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onClose}
        hitSlop={8}
        style={({ pressed }) => [styles.close, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 6l12 12M18 6L6 18"
            stroke={T.bgElevated}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.mdl,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 8,
  },
  message: {
    ...typography.bodyMed,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
  },
  close: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

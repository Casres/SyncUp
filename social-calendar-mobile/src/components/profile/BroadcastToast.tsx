/**
 * BroadcastToast — Floating broadcast toast docked above the tab bar.
 *
 * Hard Rule 13: leading marker is ALWAYS a state-colored dot (NEVER an emoji,
 * NEVER an icon variant). Title format: "Broadcast sent · {State}".
 * R5-1: subtitle pairs with the dot text.
 * R5-6: subtitle truncates to a single line.
 *
 * H-3: this component does NOT fire a haptic on its own — broadcast toasts on
 * inbound auto-fired events should never haptic. The parent fires `medium` on
 * outbound user-initiated broadcasts before showing this toast.
 *
 * Position: imported via TOAST_POSITION_DEFAULTS (canonical constant lives in
 * polish/ErrorToast.tsx). Re-exported here for ergonomic imports.
 *
 * A11y: `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` (A-9
 * mapping for non-interruptive broadcasts; the destructive ErrorToast uses
 * "assertive").
 *
 * R7-2 — BROADCASTTOAST STAYS SIMPLE. The toast surface contains EXACTLY:
 * state dot · title · sub · Undo pill · close X. It NEVER renders a
 * "review recipients" tap-action, recipient avatar stack, chevron-to-edit,
 * or any other affordance that opens audience editing. The toast body is
 * NOT tappable — only the Undo pill and close X have onPress. Audience
 * editing lives ONLY in BroadcastSettings.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, durations, radii, spacing, springs, typography } from '../../theme';
import { AvailDot } from './AvailDot';
import type { AvailState } from '../../../../TYPES';

// Re-export the canonical layout-defaults constant.
export { TOAST_POSITION_DEFAULTS } from '../polish/ErrorToast';

type Theme = typeof colors.light;

export interface BroadcastToastProps {
  T?: Theme;
  visible: boolean;
  status: AvailState;
  /** Audience descriptor (e.g. "Everyone", "Close friends", "Work"). */
  audienceLabel: string;
  onUndo: () => void;
  onDismiss: () => void;
}

const STATE_LABEL: Record<AvailState, string> = {
  free:  'Free',
  maybe: 'Maybe',
  busy:  'Busy',
};

// R7-2 — body is not tappable; only Undo + close X have onPress handlers.
export function BroadcastToast({
  T = colors.light,
  visible,
  status,
  audienceLabel,
  onUndo,
  onDismiss,
}: BroadcastToastProps): React.JSX.Element | null {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(8);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissedRef.current = false;
      opacity.value = withTiming(1, { duration: durations.toastFadeUp });
      translate.value = withSpring(0, springs.spring);
      const t = setTimeout(() => {
        if (!dismissedRef.current) onDismiss();
      }, durations.toastAutoDismiss);
      return () => clearTimeout(t);
    }
    opacity.value = withTiming(0, { duration: durations.tapFeedback });
    translate.value = withTiming(8, { duration: durations.tapFeedback });
    return undefined;
  }, [visible, opacity, translate, onDismiss]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        { backgroundColor: T.ink, shadowColor: T.ink },
        animStyle,
      ]}
    >
      <View style={styles.dot}>
        <AvailDot T={T} status={status} size={8} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: T.bgElevated }]} numberOfLines={1}>
          {`Broadcast sent · ${STATE_LABEL[status]}`}
        </Text>
        <Text style={[styles.sub, { color: T.bgElevated }]} numberOfLines={1}>
          {audienceLabel}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Undo broadcast"
        onPress={() => {
          dismissedRef.current = true;
          onUndo();
        }}
        style={({ pressed }) => [
          styles.undo,
          { backgroundColor: 'rgba(255,255,255,0.14)', opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.undoLabel, { color: T.bgElevated }]}>Undo</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={() => {
          dismissedRef.current = true;
          onDismiss();
        }}
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
  dot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.bodyMed,
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    ...typography.micro,
    opacity: 0.6,
  },
  undo: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  undoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

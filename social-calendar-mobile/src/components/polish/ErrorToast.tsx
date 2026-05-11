/**
 * ErrorToast — Docked error toast.
 *
 * Same layout as BroadcastToast, but leading marker is a 14px alert-triangle
 * (popSoft) — NOT a state dot. Title: "{Action} failed". Subtitle: 1-line cause.
 *
 * Hard rules: E-1 (toast preempts banner). H-5 (error haptic fires WITH toast).
 * A-9: role=alert + accessibilityLiveRegion="assertive".
 *
 * The screen owner positions this with TOAST_POSITION_DEFAULTS.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, durations, radii, spacing, springs, typography, useHaptic } from '../../theme';
import type { ErrorToastKind } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface ErrorToastProps {
  T?: Theme;
  kind: ErrorToastKind;
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
  /** Optional 1-line cause subtitle (R5-6 ellipsis). */
  sub?: string;
}

export const TOAST_POSITION_DEFAULTS = {
  position: 'absolute',
  bottom: 24,
  left: 14,
  right: 14,
} as const satisfies ViewStyle;

const TITLES: Record<ErrorToastKind, string> = {
  rsvp: 'RSVP failed',
  invite: 'Invite failed',
  friend: 'Friend request failed',
  generic: 'Something failed',
};

export function ErrorToast({
  T = colors.light,
  kind,
  visible,
  onRetry,
  onClose,
  sub,
}: ErrorToastProps): React.JSX.Element | null {
  const fire = useHaptic();
  const opacity = useSharedValue(0);
  const translate = useSharedValue(8);
  const haveFired = useRef(false);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: durations.toastFadeUp });
      translate.value = withSpring(0, springs.spring);
      if (!haveFired.current) {
        fire('error'); // H-5: error haptic fires WITH the toast.
        haveFired.current = true;
      }
      const t = setTimeout(onClose, durations.toastAutoDismiss);
      return () => clearTimeout(t);
    }
    opacity.value = withTiming(0, { duration: durations.tapFeedback });
    translate.value = withTiming(8, { duration: durations.tapFeedback });
    haveFired.current = false;
    return undefined;
  }, [visible, opacity, translate, fire, onClose]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[
        styles.root,
        {
          backgroundColor: T.ink,
          shadowColor: T.ink,
        },
        animStyle,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: T.popSoft }]}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l10 18H2L12 3z"
            stroke={T.popInk}
            strokeWidth={2.2}
            strokeLinejoin="round"
            fill="none"
          />
          <Path d="M12 10v5" stroke={T.popInk} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M12 18v.01" stroke={T.popInk} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: T.bgElevated }]} numberOfLines={1}>
          {TITLES[kind]}
        </Text>
        {sub ? (
          <Text style={[styles.sub, { color: T.bgElevated }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retry,
          { backgroundColor: 'rgba(255,255,255,0.14)', opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.retryLabel, { color: T.bgElevated }]}>Retry</Text>
      </Pressable>
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
  icon: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryLabel: {
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

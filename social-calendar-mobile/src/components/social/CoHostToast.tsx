/**
 * CoHostToast — docked above-tab-bar toast announcing co-host promotion.
 *
 * Spec (ANCHOR — Round 11):
 *   left:14 · right:14 · bottom:24 · radius 14 ·
 *   accentSoft fill · 1.5px accent border ·
 *   Layout: star icon (16px accent) · "You're a co-host" (13/700 ink) ·
 *           "{eventName}" (11/500 ink2, 1-line ellipsis) · close X icon-btn.
 *   flow-fade-up 320ms spring · auto-dismiss 3200ms ·
 *   role="alert" · success haptic on appear (H-5).
 *
 * NOTE: separate component from BroadcastToast (in components/profile/) by
 * design — same visual position, different content + intent.
 */

import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, durations, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface CoHostToastProps {
  T?: Theme;
  visible: boolean;
  eventName: string;
  onDismiss: () => void;
}

const TOAST_BOTTOM = 24;
const SIDE_INSET = 14;
const TOAST_RADIUS = 14;
const FADE_OUT_MS = 160;

const SPRING: WithSpringConfig = { damping: 18, stiffness: 200, mass: 0.8 };

export function CoHostToast({
  T = colors.light,
  visible,
  eventName,
  onDismiss,
}: CoHostToastProps): React.JSX.Element | null {
  const fire = useHaptic();
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      fire('success');
      opacity.value = withTiming(1, { duration: durations.tapFeedback });
      translateY.value = withSpring(0, SPRING);
      dismissTimer.current = setTimeout(() => {
        onDismiss();
      }, durations.toastAutoDismiss);
    } else {
      opacity.value = withTiming(0, { duration: FADE_OUT_MS });
      translateY.value = withTiming(20, { duration: FADE_OUT_MS });
    }
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [visible, fire, onDismiss, opacity, translateY]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  function onClosePress() {
    fire('light');
    onDismiss();
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        {
          backgroundColor: T.accentSoft,
          borderColor: T.accent,
        },
        aStyle,
      ]}
    >
      <Ionicons name="star" size={16} color={T.accent} />
      <View style={styles.text}>
        <Text style={[typography.bodyMed, { color: T.ink, fontSize: 13, fontWeight: '700' }]}>
          You&rsquo;re a co-host
        </Text>
        <Text
          style={[typography.micro, { color: T.ink2, fontSize: 11, fontWeight: '500' }]}
          numberOfLines={1}
        >
          {eventName}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={14}
        onPress={onClosePress}
        style={styles.close}
      >
        <Ionicons name="close" size={16} color={T.ink3} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: SIDE_INSET,
    right: SIDE_INSET,
    bottom: TOAST_BOTTOM,
    borderRadius: TOAST_RADIUS,
    borderWidth: 1.5,
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

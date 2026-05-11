/**
 * OfflineBar — Slim top bar that slides down below FlowHeader when offline.
 *
 * Hard Rule R5-7: triple convention — ICON + TEXT + WARNING COLOR. Never any
 * one alone.
 * Haptic: warning fires WITH entrance (H map). Auto-hide on reconnect (no
 * haptic on auto-hide).
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, durations, easings, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface OfflineBarProps {
  T?: Theme;
  visible: boolean;
}

const BAR_HEIGHT = 36;

export function OfflineBar({
  T = colors.light,
  visible,
}: OfflineBarProps): React.JSX.Element {
  const fire = useHaptic();
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      fire('warning');
    }
    progress.value = withTiming(visible ? 1 : 0, {
      duration: durations.tapFeedback,
      easing: easings.easeStd,
    });
  }, [visible, progress, fire]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: progress.value * BAR_HEIGHT,
    opacity: progress.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Offline. Cached data shown."
      style={[
        styles.root,
        {
          backgroundColor: `${T.availMaybe}33`, // warningSoft proxy
          borderBottomColor: T.hair,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.row}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 14a8 8 0 0 1 13-6.3M20 12a8 8 0 0 1-2.5 5.8"
            stroke={T.popInk}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
          <Line
            x1={3}
            y1={3}
            x2={21}
            y2={21}
            stroke={T.popInk}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={[typography.overline, { color: T.popInk }]}>
          OFFLINE · CACHED DATA SHOWN
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.mdl,
  },
});

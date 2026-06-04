/**
 * TypingDots — the "someone is typing" indicator (R17-7).
 *
 * Renders as a received-style 3-dot bubble (left-aligned, bgElevated) so it
 * reads as an in-flight incoming message. Ephemeral — driven by transient
 * local component state from `chat:typing` socket relays, never persisted.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing } from '../../theme';

type Theme = typeof colors.light;

export interface TypingDotsProps {
  T?: Theme;
}

const DOT = 6;
const PERIOD = 900;

function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: PERIOD / 3, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: PERIOD / 3, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: PERIOD / 3 }),
        ),
        -1,
      ),
    );
  }, [delay, v]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + v.value * 0.65,
    transform: [{ translateY: -v.value * 3 }],
  }));

  return (
    <Animated.View
      style={[
        { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function TypingDots({ T = colors.light }: TypingDotsProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: T.bgElevated,
            borderColor: T.hair,
            borderTopLeftRadius: radii.inline,
          },
        ]}
      >
        <Dot delay={0} color={T.ink3} />
        <Dot delay={PERIOD / 6} color={T.ink3} />
        <Dot delay={PERIOD / 3} color={T.ink3} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    alignItems: 'flex-start',
    marginVertical: spacing.xs / 2,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

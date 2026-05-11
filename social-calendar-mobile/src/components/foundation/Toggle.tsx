/**
 * Toggle — iOS-style switch.
 *
 * On = accent fill. Off = bgSunken track. Knob = bgElevated.
 * Haptic: medium on flip (per haptics canonical mapping).
 * Hard Rule 16: parents using this inside SettingsRow must render `<View>`,
 * NOT `<Pressable>` — enforced by SettingsRow itself.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, durations, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface ToggleProps {
  T?: Theme;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const TRACK_W = 50;
const TRACK_H = 30;
const KNOB = 26;
const PAD = (TRACK_H - KNOB) / 2;
const TRAVEL = TRACK_W - KNOB - PAD * 2;

export function Toggle({
  T = colors.light,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}: ToggleProps): React.JSX.Element {
  const fire = useHaptic();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: durations.tapFeedback,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [value, progress]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? T.accent : T.bgSunken,
  }));

  const handlePress = (): void => {
    if (disabled) return;
    fire('medium');
    onChange(!value);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel ?? 'Toggle'}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <View style={[styles.trackInner, { borderColor: T.hair }]} />
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: T.bgElevated, shadowColor: T.ink },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  trackInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TRACK_H / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
});

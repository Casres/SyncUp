/**
 * RSVPSheet — Bottom sheet for selecting RSVP (Yes / Maybe / No).
 *
 * 38×4 grab handle. 3 large pill buttons stacked vertically, each with
 * AvailDot + label (R5-1: status uses dot + text — never color alone).
 *
 * Sheet up: 280ms spring (per durations.sheetUp / springs.spring).
 * Haptics: medium fires on Yes / Maybe / No confirmed.
 *
 * Pure presentational — `visible` controls render; the parent screen owns
 * the modal-sheet presentation context (overlay, dismiss-on-tap-outside, etc).
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, durations, radii, spacing, springs, typography, useHaptic } from '../../theme';
import { AvailDot } from '../profile/AvailDot';
import type { RSVPStatus } from '../../../../TYPES';

type Theme = typeof colors.light;

type RSVPChoice = Exclude<RSVPStatus, null>;

export interface RSVPSheetProps {
  T?: Theme;
  visible: boolean;
  value: RSVPStatus;
  onChange: (next: RSVPChoice) => void;
  onClose: () => void;
}

interface ChoiceSpec {
  id: RSVPChoice;
  label: string;
  tone: 'free' | 'maybe' | 'busy';
}

const CHOICES: ChoiceSpec[] = [
  { id: 'yes',   label: 'Yes',   tone: 'free' },
  { id: 'maybe', label: 'Maybe', tone: 'maybe' },
  { id: 'no',    label: 'No',    tone: 'busy' },
];

export function RSVPSheet({
  T = colors.light,
  visible,
  value,
  onChange,
  onClose,
}: RSVPSheetProps): React.JSX.Element | null {
  const fire = useHaptic();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: durations.sheetUp });
      translateY.value = withSpring(0, springs.spring);
    } else {
      opacity.value = withTiming(0, { duration: durations.tapFeedback });
      translateY.value = withTiming(40, { duration: durations.tapFeedback });
    }
  }, [visible, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const handlePick = (next: RSVPChoice): void => {
    fire('medium');
    onChange(next);
  };

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[
        styles.root,
        { backgroundColor: T.bgElevated, borderColor: T.hair },
        animStyle,
      ]}
    >
      <View style={[styles.handle, { backgroundColor: T.hairStrong }]} />
      <Text style={[typography.h3, { color: T.ink, marginBottom: spacing.md }]}>
        RSVP
      </Text>
      <View style={styles.choices}>
        {CHOICES.map((c) => {
          const active = value === c.id;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`RSVP ${c.label}`}
              onPress={() => handlePick(c.id)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: active ? T.accentSoft : T.bgSunken,
                  borderColor: active ? T.accent : T.hair,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AvailDot T={T} status={c.tone} size={10} />
              <Text style={[typography.title, { color: T.ink, flex: 1 }]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={({ pressed }) => [
          styles.close,
          { borderColor: T.hair, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[typography.bodyMed, { color: T.ink2 }]}>Close</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  choices: {
    gap: spacing.md,
  },
  choice: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  close: {
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
});

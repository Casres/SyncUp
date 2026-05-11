/**
 * BrushPicker — 4-up brush selector for the Availability Editor.
 *
 * Free / Maybe / Not available / Clear. Each 36px tall, radius 10. Active brush
 * = bgElevated + 1.5px state-colored border.
 *
 * Haptic: light on brush change.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { AvailDot } from './AvailDot';
import type { AvailabilityBrush, AvailState } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface BrushPickerProps {
  T?: Theme;
  value: AvailabilityBrush;
  onChange: (next: AvailabilityBrush) => void;
}

interface BrushSpec {
  id: AvailabilityBrush;
  label: string;
  tone: AvailState | null;
}

const BRUSHES: BrushSpec[] = [
  { id: 'free',  label: 'Free',          tone: 'free' },
  { id: 'maybe', label: 'Maybe',         tone: 'maybe' },
  { id: 'busy',  label: 'Not available', tone: 'busy' },
  { id: 'clear', label: 'Clear',         tone: null },
];

export function BrushPicker({
  T = colors.light,
  value,
  onChange,
}: BrushPickerProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <View style={[styles.row, { backgroundColor: T.bgSunken }]}>
      {BRUSHES.map((b) => {
        const active = b.id === value;
        const borderColor = active
          ? b.tone
            ? stateColor(T, b.tone)
            : T.accent
          : 'transparent';
        return (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={b.label}
            onPress={() => {
              if (active) return;
              fire('light');
              onChange(b.id);
            }}
            style={({ pressed }) => [
              styles.cell,
              {
                backgroundColor: active ? T.bgElevated : 'transparent',
                borderColor,
                borderWidth: 1.5,
                opacity: pressed && !active ? 0.7 : 1,
              },
            ]}
          >
            <AvailDot T={T} status={b.tone} size={8} />
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? T.ink : T.ink2 },
              ]}
            >
              {b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function stateColor(T: Theme, s: AvailState): string {
  return s === 'free' ? T.availFree : s === 'maybe' ? T.availMaybe : T.availBusy;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: radii.small,
    padding: 3,
    gap: 3,
  },
  cell: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.inline,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
});

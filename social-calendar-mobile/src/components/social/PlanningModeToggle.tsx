/**
 * PlanningModeToggle — 2-up toggle inside Group Detail to flip between
 * 'casual' and 'planning' mode.
 *
 * Sunken track, active = bgElevated + subtle elevation. Haptic: medium on
 * mode flip (more weighty than a standard `light` switch — this affects the
 * group's visible state).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export type PlanningMode = 'casual' | 'planning';

export interface PlanningModeToggleProps {
  T?: Theme;
  mode: PlanningMode;
  onChange: (next: PlanningMode) => void;
}

interface Option {
  id: PlanningMode;
  label: string;
}

const OPTIONS: Option[] = [
  { id: 'casual',   label: 'Casual' },
  { id: 'planning', label: 'Planning' },
];

export function PlanningModeToggle({
  T = colors.light,
  mode,
  onChange,
}: PlanningModeToggleProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <View style={[styles.track, { backgroundColor: T.bgSunken }]}>
      {OPTIONS.map((opt) => {
        const active = opt.id === mode;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.label} mode`}
            onPress={() => {
              if (active) return;
              fire('medium');
              onChange(opt.id);
            }}
            style={({ pressed }) => [
              styles.cell,
              active && {
                backgroundColor: T.bgElevated,
                shadowColor: T.ink,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
                elevation: 1,
              },
              { opacity: pressed && !active ? 0.7 : 1 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? T.ink : T.ink2 },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radii.small,
    padding: 3,
    gap: 3,
  },
  cell: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.inline,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
  },
});

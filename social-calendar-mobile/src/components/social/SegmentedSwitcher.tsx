/**
 * SegmentedSwitcher — 2/3-up segmented switcher.
 *
 * Sunken-track. Active segment = bgElevated + subtle elevation. Radius 10.
 * Haptic: light on flip.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface SegmentedOption {
  id: string;
  label: string;
}

export interface SegmentedSwitcherProps {
  T?: Theme;
  options: SegmentedOption[];
  value: string;
  onChange: (next: string) => void;
}

export function SegmentedSwitcher({
  T = colors.light,
  options,
  value,
  onChange,
}: SegmentedSwitcherProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <View style={[styles.track, { backgroundColor: T.bgSunken }]}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            onPress={() => {
              if (active) return;
              fire('light');
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
              numberOfLines={1}
              style={[
                styles.label,
                { color: active ? T.ink : T.ink2 },
              ]}
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

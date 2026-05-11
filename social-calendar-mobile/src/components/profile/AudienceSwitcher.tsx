/**
 * AudienceSwitcher — 3-up sub-switcher (Everyone / Friends / Types).
 *
 * Used inside Broadcast cards. Visually a tighter cousin of TabPills:
 * 30px tall pills, inset 3px padding, radius 10.
 *
 * Haptic: light on pill change.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { AudienceMode } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface AudienceSwitcherProps {
  T?: Theme;
  value: AudienceMode;
  onChange: (next: AudienceMode) => void;
}

interface Option {
  id: AudienceMode;
  label: string;
}

const OPTIONS: Option[] = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'friends',  label: 'Friends' },
  { id: 'types',    label: 'Types' },
];

export function AudienceSwitcher({
  T = colors.light,
  value,
  onChange,
}: AudienceSwitcherProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <View style={[styles.track, { backgroundColor: T.bgSunken }]}>
      {OPTIONS.map((opt) => {
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
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.inline,
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
});

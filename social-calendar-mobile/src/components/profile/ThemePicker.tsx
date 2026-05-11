/**
 * ThemePicker — 3-up segmented picker for ThemePreference.
 *
 * Sunken track (bgSunken). Active cell = bgElevated + subtle elevation.
 * Each cell hosts an 18px line icon + 12/600 label. Padding 10×8.
 * Haptic: light on switch (R5-8 mapping).
 *
 * A11y: each cell uses `accessibilityState.selected`; active cell text contrast
 * meets 4.5:1 on bgElevated.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { ThemePreference } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface ThemePickerProps {
  T?: Theme;
  value: ThemePreference;
  onChange: (next: ThemePreference) => void;
}

interface Option {
  id: ThemePreference;
  label: string;
}

const OPTIONS: Option[] = [
  { id: 'light',  label: 'Light' },
  { id: 'dark',   label: 'Dark' },
  { id: 'system', label: 'System' },
];

export function ThemePicker({
  T = colors.light,
  value,
  onChange,
}: ThemePickerProps): React.JSX.Element {
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
            <ThemeIcon kind={opt.id} stroke={active ? T.ink : T.ink2} />
            <Text
              style={[
                styles.label,
                { color: active ? T.ink : T.ink2, fontWeight: '600' },
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

interface ThemeIconProps {
  kind: ThemePreference;
  stroke: string;
}

function ThemeIcon({ kind, stroke }: ThemeIconProps): React.JSX.Element {
  if (kind === 'light') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={4} stroke={stroke} strokeWidth={2} />
        <Path
          d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (kind === 'dark') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 13a8 8 0 11-9-9 6 6 0 009 9z"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  // system
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5h18v11H3z"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M8 20h8M12 16v4" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.inline,
    minHeight: 36,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
  },
});

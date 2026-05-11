/**
 * PriceSelector — Inline +/- pill stepper for event price.
 *
 * Hard Rule 2: 44pt minimum tap target on the +/- buttons.
 * 0 displays as "Free".
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface PriceSelectorProps {
  T?: Theme;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  currencySymbol?: string;
  disabled?: boolean;
}

const HIT = 44;

export function PriceSelector({
  T = colors.light,
  value,
  onChange,
  min = 0,
  step = 1,
  currencySymbol = '$',
  disabled = false,
}: PriceSelectorProps): React.JSX.Element {
  const decrement = (): void => {
    if (disabled) return;
    onChange(Math.max(min, value - step));
  };
  const increment = (): void => {
    if (disabled) return;
    onChange(value + step);
  };

  const display = value <= 0 ? 'Free' : `${currencySymbol}${value}`;

  return (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease price"
        onPress={decrement}
        disabled={disabled || value <= min}
        style={({ pressed }) => [
          styles.btn,
          { opacity: disabled || value <= min ? 0.4 : pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[typography.h3, { color: T.ink }]}>−</Text>
      </Pressable>
      <View style={styles.value}>
        <Text style={[typography.title, { color: T.ink }]} numberOfLines={1}>
          {display}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase price"
        onPress={increment}
        disabled={disabled}
        style={({ pressed }) => [styles.btn, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
      >
        <Text style={[typography.h3, { color: T.ink }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  btn: {
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 60,
    paddingHorizontal: spacing.md,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

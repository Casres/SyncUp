/**
 * StatTile — Stat number + label tile.
 *
 * 20/800 number (statNum scale) + 9/600 mono uppercase label (overline).
 * Used in the profile header — exactly 4 across with 8px gaps.
 *
 * The container expands via `flex: 1` so 4 tiles divide the parent row evenly.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Overline } from '../foundation/Overline';

type Theme = typeof colors.light;

export interface StatTileProps {
  T?: Theme;
  n: number;
  label: string;
}

export function StatTile({ T = colors.light, n, label }: StatTileProps): React.JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <Text style={[typography.statNum, { color: T.ink }]}>{n}</Text>
      <Overline T={T} color="ink2">{label}</Overline>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

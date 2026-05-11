/**
 * SectionHeader — Section title (15/700/-0.2) with optional trailing slot.
 *
 * The right slot reserves a 28x28 square so an inline section-refresh Spinner
 * (Loading L-1) fits without the row jumping.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface SectionHeaderProps {
  T?: Theme;
  title: string;
  right?: React.ReactNode;
}

export function SectionHeader({
  T = colors.light,
  title,
  right,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.root}>
      <Text style={[typography.title, { color: T.ink, flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.trailing}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  trailing: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

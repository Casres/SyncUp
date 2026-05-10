/**
 * NotifGroupHeader — overline above each NotifSheet day group.
 *
 * R6-7: groups are exactly TODAY · YESTERDAY · named-day ("TUE APR 22")
 *       for ≤7 days back · EARLIER. No grouping by kind, sender, or event.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface NotifGroupHeaderProps {
  T?: Theme;
  label: string;
}

export function NotifGroupHeader({
  T = colors.light,
  label,
}: NotifGroupHeaderProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={[typography.overline, { color: T.ink3 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: spacing.lg,
  },
});

/**
 * CoHostBadge — inline "CO-HOST" chip rendered after the name on AttendeeRow.
 *
 * Spec (ANCHOR — Round 11):
 *   accentSoft fill · accent text · radius 999 · padding 3×8 ·
 *   mono 9/600 uppercase · purely decorative · visible to all viewers (R11-3).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme';

type Theme = typeof colors.light;

export interface CoHostBadgeProps {
  T?: Theme;
}

export function CoHostBadge({ T = colors.light }: CoHostBadgeProps): React.JSX.Element {
  return (
    <View
      style={[styles.chip, { backgroundColor: T.accentSoft }]}
      accessibilityRole="text"
      accessibilityLabel="Co-host"
    >
      <Text style={[styles.label, { color: T.accent, fontFamily: fonts.mono }]}>
        CO-HOST
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

/**
 * RSVPBadge — pill badge for an RSVP status.
 *
 * Token map (per ANCHOR / FRONTEND-HANDOFF GAP 3):
 *   yes   ('going')      → limeSoft fill / limeInk text
 *   maybe                → accentSoft fill / accent text
 *   no    ('not going')  → popSoft fill / popInk text
 *   null  ('no response')→ bgSunken fill / ink3 text
 *
 * RSVPStatus in TYPES.ts uses 'yes' | 'maybe' | 'no' | null. The badge
 * accepts that shape directly and renders the human label.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import type { RSVPStatus } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface RSVPBadgeProps {
  T?: Theme;
  status: RSVPStatus;
}

interface BadgeStyle {
  bg: string;
  fg: string;
  label: string;
}

function resolveStyle(T: Theme, status: RSVPStatus): BadgeStyle {
  switch (status) {
    case 'yes':
      return { bg: T.limeSoft, fg: T.limeInk, label: 'Going' };
    case 'maybe':
      return { bg: T.accentSoft, fg: T.accent, label: 'Maybe' };
    case 'no':
      return { bg: T.popSoft, fg: T.popInk, label: 'Not going' };
    case null:
    default:
      return { bg: T.bgSunken, fg: T.ink3, label: 'No response' };
  }
}

export function RSVPBadge({
  T = colors.light,
  status,
}: RSVPBadgeProps): React.JSX.Element {
  const s = resolveStyle(T, status);
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text
        style={[
          typography.micro,
          { color: s.fg, fontSize: 11, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {s.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});

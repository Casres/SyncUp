/**
 * PrivateBadge — Lock icon + "Private" label.
 *
 * Hard Rule 11: use sparingly — never in list rows when the screen title
 * already states privacy. The component itself doesn't enforce that constraint;
 * the call site should respect it.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface PrivateBadgeProps {
  T?: Theme;
}

export function PrivateBadge({ T = colors.light }: PrivateBadgeProps): React.JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: T.bgSunken, borderColor: T.hair }]}>
      <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
        <Rect
          x={5}
          y={11}
          width={14}
          height={9}
          rx={1.5}
          stroke={T.ink2}
          strokeWidth={2}
        />
        <Path
          d="M8 11V8a4 4 0 018 0v3"
          stroke={T.ink2}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.label, { color: T.ink2 }]}>Private</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.micro,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

/**
 * Overline — Mono uppercase label.
 *
 * Hard Rule 5: 10/600 mono uppercase, letter-spacing 1.5–1.8.
 * R5-5: at the 10px floor, default color is `ink2` (NOT `ink3`) for contrast.
 */

import React from 'react';
import { Text } from 'react-native';

import { colors, typography, type ColorKey } from '../../theme';

type Theme = typeof colors.light;

export interface OverlineProps {
  T?: Theme;
  children: React.ReactNode;
  /** Color token name. Defaults to `ink2` (R5-5 contrast floor). */
  color?: ColorKey;
}

export function Overline({
  T = colors.light,
  children,
  color = 'ink2',
}: OverlineProps): React.JSX.Element {
  return (
    <Text accessibilityRole="text" style={[typography.overline, { color: T[color] }]}>
      {children}
    </Text>
  );
}

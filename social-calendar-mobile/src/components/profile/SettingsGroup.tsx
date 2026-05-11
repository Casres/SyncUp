/**
 * SettingsGroup — Titled card containing SettingsRow children.
 *
 * Optional overline above (mono uppercase 10/600 ink2 — R5-5 floor).
 * Card: bgElevated, radius 14, 1px hair border, overflow hidden so child row
 * separators don't bleed past the rounded corner.
 * Optional footnote below in ink2 (R5-5: ink2 not ink3 at small sizes).
 */

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Overline } from '../foundation/Overline';

type Theme = typeof colors.light;

export interface SettingsGroupProps {
  T?: Theme;
  /** Overline label rendered above the card. */
  label?: string;
  footnote?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SettingsGroup({
  T = colors.light,
  label,
  footnote,
  children,
  style,
}: SettingsGroupProps): React.JSX.Element {
  return (
    <View style={[styles.root, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Overline T={T} color="ink2">{label}</Overline>
        </View>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: T.bgElevated,
            borderColor: T.hair,
          },
        ]}
      >
        {children}
      </View>
      {footnote ? (
        <Text style={[typography.caption, { color: T.ink2, paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  labelRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});

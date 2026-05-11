/**
 * CategoryBadge — Small pill badge labeling a friend's category.
 *
 * Displays a colored dot + the category label (e.g. BFF, Work, Gym).
 * The category id maps to a label/color in the parent's mock catalog —
 * since this component is purely presentational, the parent must pass the
 * resolved label and tint color in.
 *
 * Pinned to the friend's category — typography is mono micro to read as a tag.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface CategoryBadgeProps {
  T?: Theme;
  /** Resolved category label (parent maps `categoryId` → label). */
  label: string;
  /** Tint color (hex from the category catalog). Defaults to `accent`. */
  tint?: string;
}

export function CategoryBadge({
  T = colors.light,
  label,
  tint,
}: CategoryBadgeProps): React.JSX.Element {
  const dotColor = tint ?? T.accent;
  return (
    <View style={[styles.root, { backgroundColor: T.bgSunken, borderColor: T.hair }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.label, { color: T.ink2 }]} numberOfLines={1}>
        {label}
      </Text>
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.micro,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

/**
 * EmptyStateBlock — Generic empty state.
 *
 * Anatomy (per ANCHOR Empty State Pattern):
 *   1. Illustration tile: 56×56, radius 16, bgSunken, 18-stroke line icon
 *      at 50% opacity ink2.
 *   2. Headline: typography.h3, ink, ≤ 6 words (4 ideal).
 *   3. Body: 13/500 ink2, ≤ 14 words.
 *   4. Primary CTA: PillBtn primary, verb-first, ≤ 3 words.
 *   5. Optional secondary: PillBtn ghost.
 *
 * Layout: centered column, max-width 280, gap 10–14px between rows, 32px
 * outer horizontal padding. NEVER a photo, NEVER an emoji, NEVER a 3D render.
 *
 * Voice: direct, no apologies.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { PillBtn } from '../foundation/PillBtn';

type Theme = typeof colors.light;

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateBlockProps {
  T?: Theme;
  icon: React.ReactNode;
  headline: string;
  body?: string;
  primary?: EmptyStateAction;
  secondary?: EmptyStateAction;
  /** When true, renders transparent (no card surface, for inline use). */
  inline?: boolean;
}

export function EmptyStateBlock({
  T = colors.light,
  icon,
  headline,
  body,
  primary,
  secondary,
  inline = false,
}: EmptyStateBlockProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.outer,
        !inline && {
          backgroundColor: T.bgElevated,
          borderColor: T.hair,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radii.card,
        },
      ]}
    >
      <View style={styles.column}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.iconTile, { backgroundColor: T.bgSunken }]}
        >
          {icon}
        </View>
        <Text style={[typography.h3, styles.headline, { color: T.ink }]} numberOfLines={2}>
          {headline}
        </Text>
        {body ? (
          <Text style={[styles.body, { color: T.ink2 }]} numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        {primary ? (
          <PillBtn
            T={T}
            label={primary.label}
            onPress={primary.onPress}
            variant="primary"
            size="md"
          />
        ) : null}
        {secondary ? (
          <PillBtn
            T={T}
            label={secondary.label}
            onPress={secondary.onPress}
            variant="ghost"
            size="md"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing['4xl'], // 32 outer horizontal padding
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    gap: spacing.md, // 12px (within 10–14 range)
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.hero,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  headline: {
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

/**
 * FilterBar — horizontal scrolling category filter chips for the Explore feed.
 *
 * Layout:
 *   ScrollView (horizontal, no scrollbar) → pill chips, one per category.
 *   Active chip: accent fill + white label.
 *   Inactive chip: bgSunken fill + ink2 label.
 *
 * Haptics: light on chip selection (R5-8).
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing, radii, typography, useHaptic } from '../../theme';
import type { ExploreCategory } from '../../../../TYPES';

// ─── Category config ─────────────────────────────────────────────────────────

interface CategoryConfig {
  id: ExploreCategory;
  label: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'all',        label: 'All' },
  { id: 'bar',        label: 'Bars' },
  { id: 'restaurant', label: 'Food' },
  { id: 'club',       label: 'Clubs' },
  { id: 'live-music', label: 'Live Music' },
  { id: 'food-truck', label: 'Food Trucks' },
  { id: 'popup',      label: 'Pop-ups' },
  { id: 'cafe',       label: 'Cafés' },
  { id: 'outdoor',    label: 'Outdoors' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FilterBarProps {
  T: typeof colors.light;
  active: ExploreCategory;
  onChange: (category: ExploreCategory) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterBar({ T, active, onChange }: FilterBarProps): React.JSX.Element {
  const fire = useHaptic();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {CATEGORIES.map(({ id, label }) => {
        const isActive = id === active;
        return (
          <Pressable
            key={id}
            onPress={() => {
              if (!isActive) {
                fire('light');
                onChange(id);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive ? T.accent : T.bgSunken,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? T.bgElevated : T.ink2,
                  fontFamily: typography.bodyMed.fontFamily,
                  fontSize: typography.bodyMed.fontSize,
                  fontWeight: typography.bodyMed.fontWeight,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill ?? 999,
  },
  label: {
    letterSpacing: -0.1,
  },
});

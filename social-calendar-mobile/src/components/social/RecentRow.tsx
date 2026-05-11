/**
 * RecentRow — single recent-search row in the SearchOverlay default state
 * (R8-4). Time-outline glyph + term + trailing × dismissal btn.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface RecentRowProps {
  T?: Theme;
  term: string;
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

export function RecentRow({
  T = colors.light,
  term,
  onSelect,
  onRemove,
}: RecentRowProps): React.JSX.Element {
  const fire = useHaptic();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Recent search ${term}`}
      onPress={() => {
        fire('light');
        onSelect(term);
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: T.bgElevated, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Ionicons name="time-outline" size={16} color={T.ink3} />
      <Text
        style={[styles.term, { color: T.ink }]}
        numberOfLines={1}
      >
        {term}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${term} from recent searches`}
        hitSlop={12}
        onPress={() => {
          fire('light');
          onRemove(term);
        }}
        style={styles.removeBtn}
      >
        <Ionicons name="close" size={16} color={T.ink3} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  term: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * FilterChipRowMulti — Multi-select horizontal filter chip carousel.
 *
 * Mirrors FilterChipRow but `selected` is `string[]` and `onChange` returns
 * the new array. Visual height 30, 44pt hit target via vertical padding.
 *
 * Haptic: light on chip toggle.
 * R5-5: chip count text uses ink2, never ink3.
 *
 * R7-3 — This component emits the selected chip-id ARRAY. Consumers MUST
 * apply UNION semantics when filtering (`items.filter(i => selected.some(...))`),
 * NEVER intersection. Selecting two FriendType chips means "members of
 * either type" — not "members of both" (FriendTypes are disjoint anyway).
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { FilterChip } from '../eventFlow/FilterChipRow';

type Theme = typeof colors.light;

export interface FilterChipRowMultiProps {
  T?: Theme;
  chips: FilterChip[];
  selected: string[];
  onChange: (next: string[]) => void;
}

const VISUAL_HEIGHT = 30;
const HIT_HEIGHT = 44;
const VPAD = (HIT_HEIGHT - VISUAL_HEIGHT) / 2;

export function FilterChipRowMulti({
  T = colors.light,
  chips,
  selected,
  onChange,
}: FilterChipRowMultiProps): React.JSX.Element {
  const fire = useHaptic();
  const set = new Set(selected);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const active = set.has(chip.id);
        return (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}
            onPress={() => {
              fire('light');
              if (active) {
                onChange(selected.filter((id) => id !== chip.id));
              } else {
                onChange([...selected, chip.id]);
              }
            }}
            style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: active ? T.accent : T.bgElevated,
                  borderColor: active ? T.accent : T.hair,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: active ? T.bgElevated : T.ink },
                ]}
                numberOfLines={1}
              >
                {chip.label}
              </Text>
              {typeof chip.count === 'number' ? (
                <Text
                  style={[
                    styles.count,
                    { color: active ? T.bgElevated : T.ink2 },
                  ]}
                >
                  {chip.count}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.mdl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  hit: {
    paddingVertical: VPAD,
  },
  chip: {
    height: VISUAL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  count: {
    ...typography.caption,
    fontSize: 12,
  },
});

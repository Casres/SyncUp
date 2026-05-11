/**
 * TabPills — Pill-style tab switcher (radius 9 = tabpill segment).
 *
 * Used inside Group Detail (Members / Events / Polls / Ideas).
 * Haptic: light on TabPills change.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface TabPillsTab {
  id: string;
  label: string;
}

export interface TabPillsProps {
  T?: Theme;
  tabs: TabPillsTab[];
  value: string;
  onChange: (next: string) => void;
}

export function TabPills({
  T = colors.light,
  tabs,
  value,
  onChange,
}: TabPillsProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (active) return;
              fire('light');
              onChange(tab.id);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: active ? T.ink : T.bgSunken,
                  borderColor: active ? T.ink : T.hair,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: active ? T.bgElevated : T.ink2 },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
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
  pill: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.tabpill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
  },
});

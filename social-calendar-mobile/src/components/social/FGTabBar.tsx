/**
 * FGTabBar — Friends & Groups module bottom tab bar.
 *
 * Sits above the safe area; BroadcastToast docks above it via
 * `TOAST_POSITION_DEFAULTS`.
 *
 * NOTE: per the ANCHOR open question, the Profile tab on this bar should now
 * route to Profile & Settings (Round 4). The component accepts the four tab
 * IDs and lets the parent screen decide routing.
 *
 * Haptic: light on tab change (no haptic if pressing the active tab — H-3).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export type FGTabId = 'home' | 'friends' | 'groups' | 'profile';

export interface FGTabBarProps {
  T?: Theme;
  value: FGTabId;
  onChange: (next: FGTabId) => void;
}

interface Tab {
  id: FGTabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'home',    label: 'Home' },
  { id: 'friends', label: 'Friends' },
  { id: 'groups',  label: 'Groups' },
  { id: 'profile', label: 'Profile' },
];

export function FGTabBar({
  T = colors.light,
  value,
  onChange,
}: FGTabBarProps): React.JSX.Element {
  const fire = useHaptic();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}
    >
      {TABS.map((tab) => {
        const active = tab.id === value;
        const color = active ? T.accent : T.ink2;
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
            style={({ pressed }) => [
              styles.cell,
              { opacity: pressed && !active ? 0.7 : 1 },
            ]}
          >
            <TabIcon kind={tab.id} stroke={color} />
            <Text
              style={[
                styles.label,
                { color, fontWeight: active ? '700' : '500' },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface TabIconProps {
  kind: FGTabId;
  stroke: string;
}

function TabIcon({ kind, stroke }: TabIconProps): React.JSX.Element {
  if (kind === 'home') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (kind === 'friends') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={9} cy={8} r={3.5} stroke={stroke} strokeWidth={2} />
        <Path
          d="M2 20a7 7 0 0114 0M16 7a3 3 0 010 6M22 20a6 6 0 00-3.5-5.5"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (kind === 'groups') {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={3.5} stroke={stroke} strokeWidth={2} />
        <Circle cx={5.5} cy={9.5} r={2.5} stroke={stroke} strokeWidth={2} />
        <Circle cx={18.5} cy={9.5} r={2.5} stroke={stroke} strokeWidth={2} />
        <Path
          d="M5 20a7 7 0 0114 0M2 20a4 4 0 014-4M22 20a4 4 0 00-4-4"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  // profile
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={stroke} strokeWidth={2} />
      <Path
        d="M4 21a8 8 0 0116 0"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    minHeight: 48,
  },
  label: {
    ...typography.micro,
    fontSize: 11,
  },
});

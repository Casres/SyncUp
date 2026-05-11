/**
 * SettingsRow — Settings list row.
 *
 * Hard Rule 16: renders `<View>` (NOT `<Pressable>`) when `onPress` is undefined.
 * This is critical because rows often contain interactive trailing controls
 * (Toggle, ThemePicker, etc.) — nesting Pressable in Pressable breaks RN
 * gesture handling and a11y.
 *
 * Layout: 32px icon tile (bgSunken) + label (15/600) + optional sub (12, ink2 per R5-5)
 *         + trailing slot. When `onPress && !destructive && !trailing`, an auto
 *         chevron is rendered. Min-height 56pt.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface SettingsRowProps {
  T?: Theme;
  icon?: React.ReactNode;
  label: string;
  /** 12/ink2 sub. R5-5: small text below 14px uses ink2 for contrast. */
  sub?: string;
  trailing?: React.ReactNode;
  /** Tap handler. When undefined, the row is a `<View>` not a `<Pressable>`. */
  onPress?: () => void;
  destructive?: boolean;
  /** Suppresses bottom hairline (use for the last row of a group). */
  last?: boolean;
}

export function SettingsRow({
  T = colors.light,
  icon,
  label,
  sub,
  trailing,
  onPress,
  destructive = false,
  last = false,
}: SettingsRowProps): React.JSX.Element {
  const labelColor = destructive ? T.danger : T.ink;
  const subColor = destructive ? T.danger : T.ink2;
  const tileBg = destructive ? T.dangerSoft : T.bgSunken;

  const showChevron = !!onPress && !destructive && trailing === undefined;

  const inner = (
    <>
      {icon !== undefined ? (
        <View style={[styles.iconTile, { backgroundColor: tileBg }]}>{icon}</View>
      ) : null}
      <View style={styles.body}>
        <Text style={[typography.bodyMed, { color: labelColor, fontSize: 15, fontWeight: '600' }]} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.sub, { color: subColor }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {trailing ?? null}
        {showChevron ? <Chevron T={T} /> : null}
      </View>
    </>
  );

  const baseStyle = [
    styles.root,
    {
      backgroundColor: T.bgElevated,
      borderBottomColor: T.hair,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
    },
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [...baseStyle, { opacity: pressed ? 0.85 : 1 }]}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={baseStyle}>{inner}</View>;
}

function Chevron({ T }: { T: Theme }): React.JSX.Element {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={T.ink3}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  sub: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

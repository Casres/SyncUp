/**
 * Step3BusyBanner — Danger banner for Step 3 wire-back when the chosen day
 * conflicts with the user's own availability ('busy').
 *
 * Hard Rule 17: Step 3 wire-back surfaces the conflict in a banded list +
 * banner — this is the banner half. R5-1: pairs danger color with text.
 *
 * Uses dangerSoft fill + popInk text (never red color alone). 14px alert-
 * triangle leading marker, headline + 1-line sub.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface Step3BusyBannerProps {
  T?: Theme;
  /** ISO date 'YYYY-MM-DD' the conflict pertains to. */
  iso: string;
  /** Optional CTA — typically "Pick another day" or "Override". */
  onAction?: () => void;
  actionLabel?: string;
}

export function Step3BusyBanner({
  T = colors.light,
  iso,
  onAction,
  actionLabel = 'Change',
}: Step3BusyBannerProps): React.JSX.Element {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: T.dangerSoft, borderColor: T.danger }]}
    >
      <View style={[styles.icon, { backgroundColor: T.popSoft }]}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l10 18H2L12 3z"
            stroke={T.popInk}
            strokeWidth={2.2}
            strokeLinejoin="round"
            fill="none"
          />
          <Path d="M12 10v5" stroke={T.popInk} strokeWidth={2.2} strokeLinecap="round" />
          <Path d="M12 18v.01" stroke={T.popInk} strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={[typography.bodyMed, { color: T.popInk, fontWeight: '700' }]}>
          You marked this day busy
        </Text>
        <Text style={[typography.caption, { color: T.popInk }]} numberOfLines={1}>
          {iso}
        </Text>
      </View>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { borderColor: T.popInk, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[typography.caption, { color: T.popInk, fontWeight: '700' }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});

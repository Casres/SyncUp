/**
 * FlowHeader — Top-of-screen header with optional back chevron and right slot.
 *
 * Hard Rule 2: back-button hit target is 44x44pt minimum (visual chevron 36pt,
 * hit area expanded via padding).
 * R5-4 / A-7: back button always carries `accessibilityLabel="Back"`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface FlowHeaderProps {
  T?: Theme;
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

const HIT_SIZE = 44;
const VISUAL_SIZE = 36;

export function FlowHeader({ T = colors.light, title, onBack, right }: FlowHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderBottomColor: T.hair }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={(HIT_SIZE - VISUAL_SIZE) / 2}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: T.bgSunken, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={T.ink}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[typography.h3, { color: T.ink }]}
        >
          {title}
        </Text>
      </View>
      <View style={[styles.side, styles.sideRight]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    minWidth: HIT_SIZE,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  backBtn: {
    width: VISUAL_SIZE,
    height: VISUAL_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

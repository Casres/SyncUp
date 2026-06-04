/**
 * ThreadHeader — the pinned header on a chat thread (R17-4).
 *
 * Back chevron · title (conversation name) · optional subtitle (e.g. member
 * count for group, "Event chat" for event). Kept type-agnostic; the screen
 * supplies the strings it wants per R17-4.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface ThreadHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  T?: Theme;
}

export function ThreadHeader({
  title,
  subtitle,
  onBack,
  T = colors.light,
}: ThreadHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.header, { backgroundColor: T.bgElevated, borderBottomColor: T.hair }]}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={T.ink}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>

      <View style={styles.titles}>
        <Text numberOfLines={1} style={[typography.title, { color: T.ink }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[typography.micro, { color: T.ink3 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {
    flex: 1,
  },
});

/**
 * GroupResultRow — Search result row for a SocialGroup (R8-3).
 *
 * CoverArt 44px + name + member count + PrivateBadge. Row tap navigates
 * cross-screen → medium haptic.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SocialGroup } from '../../../../TYPES';

import { CoverArt } from './CoverArt';
import { PrivateBadge } from './PrivateBadge';

type Theme = typeof colors.light;

export interface GroupResultRowProps {
  T?: Theme;
  group: SocialGroup;
  onPress: () => void;
}

export function GroupResultRow({
  T = colors.light,
  group,
  onPress,
}: GroupResultRowProps): React.JSX.Element {
  const fire = useHaptic();

  function onRowPress() {
    fire('medium');
    onPress();
  }

  const memberCount = group.members.length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={group.name}
      onPress={onRowPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: T.bgElevated, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <CoverArt T={T} cover={group.cover} size={44} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: T.ink }]} numberOfLines={1}>
            {group.name}
          </Text>
          {group.isPrivate ? <PrivateBadge T={T} /> : null}
        </View>
        <Text style={[styles.sub, { color: T.ink2 }]}>
          {`${memberCount} member${memberCount === 1 ? '' : 's'}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
  },
});

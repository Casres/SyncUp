/**
 * AdminInviteRow — Friend row in the admin invite flow (inside AdminBar).
 *
 * Mirrors AudiencePickerSheet 'friends' mode visually: RingAvatar (with
 * `selected` toggling) + name + handle (mono) + CategoryBadge.
 *
 * Haptic: light on toggle.
 * Hard Rule 10: this row is the canonical invite-selection control. Never
 * surface invites inside Create Group.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, typography, useHaptic } from '../../theme';
import { RingAvatar } from '../foundation/RingAvatar';
import { CategoryBadge } from './CategoryBadge';
import type { Friend } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface AdminInviteRowProps {
  T?: Theme;
  friend: Friend;
  selected: boolean;
  onToggle: (friendId: string) => void;
  /** Resolves the friend's category id → display label. */
  resolveCategoryLabel?: (categoryId: string) => string;
  resolveCategoryTint?: (categoryId: string) => string | undefined;
}

export function AdminInviteRow({
  T = colors.light,
  friend,
  selected,
  onToggle,
  resolveCategoryLabel,
  resolveCategoryTint,
}: AdminInviteRowProps): React.JSX.Element {
  const fire = useHaptic();
  const catLabel = resolveCategoryLabel?.(friend.category) ?? friend.category;
  const catTint = resolveCategoryTint?.(friend.category);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={friend.name}
      onPress={() => {
        fire('light');
        onToggle(friend.id);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: T.bgElevated,
          borderColor: selected ? T.accent : T.hair,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <RingAvatar T={T} letter={friend.letter} size={36} selected={selected} />
      <View style={styles.body}>
        <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={[styles.handle, { color: T.ink2 }]} numberOfLines={1}>
          {friend.handle}
        </Text>
      </View>
      <CategoryBadge T={T} label={catLabel} tint={catTint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: 1,
    minHeight: 56,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  handle: {
    ...typography.micro,
    fontFamily: fonts.mono,
  },
});

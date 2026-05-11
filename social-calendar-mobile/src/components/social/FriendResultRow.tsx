/**
 * FriendResultRow — Search result row for an existing friend (R8-3).
 *
 * RingAvatar 40px (with status ring if availState is known) + name +
 * @handle + CategoryBadge. Row body tap navigates to Friend Profile.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography, useHaptic } from '../../theme';
import { RingAvatar } from '../foundation/RingAvatar';
import type { AvailState, Friend } from '../../../../TYPES';

import { CategoryBadge } from './CategoryBadge';

type Theme = typeof colors.light;

export interface FriendResultRowProps {
  T?: Theme;
  friend: Friend;
  /** Optional availability state — passed through to the RingAvatar status ring. */
  availState?: AvailState | null;
  /** Optional human label for the category. Falls back to category id. */
  categoryLabel?: string;
  /** Optional tint resolver for the badge. */
  categoryTint?: string;
  onPress: () => void;
}

export function FriendResultRow({
  T = colors.light,
  friend,
  availState = null,
  categoryLabel,
  categoryTint,
  onPress,
}: FriendResultRowProps): React.JSX.Element {
  const fire = useHaptic();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friend.name} ${friend.handle}`}
      onPress={() => {
        fire('light');
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: T.bgElevated, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <RingAvatar T={T} letter={friend.letter} size={40} status={availState} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: T.ink }]} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text
          style={[
            styles.handle,
            { color: T.ink3, fontFamily: fonts.mono },
          ]}
          numberOfLines={1}
        >
          {friend.handle}
        </Text>
      </View>
      <CategoryBadge
        T={T}
        label={categoryLabel ?? friend.category}
        tint={categoryTint}
      />
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
  name: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  handle: {
    fontSize: 12,
    fontWeight: '500',
  },
});

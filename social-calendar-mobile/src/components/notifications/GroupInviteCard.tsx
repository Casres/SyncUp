/**
 * GroupInviteCard — pending group invite.
 *
 * Same in-place behavior as FriendRequestCard: Join + Decline pills,
 * no SwipeableRow, sheet does NOT dismiss. Decline uses TwoTapDestructive.
 * When offline=true, both pills render disabled.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RingAvatar } from '../foundation/RingAvatar';
import { PillBtn } from '../foundation/PillBtn';
import { TwoTapDestructive } from '../social/TwoTapDestructive';
import { colors, spacing, typography } from '../../theme';
import type { GroupInviteNotif } from '../../../../TYPES';

import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface GroupInviteCardProps {
  T?: Theme;
  notif: GroupInviteNotif;
  offline: boolean;
  onJoin: () => void;
  onDecline: () => void;
}

export function GroupInviteCard({
  T = colors.light,
  notif,
  offline,
  onJoin,
  onDecline,
}: GroupInviteCardProps): React.JSX.Element {
  return (
    <View
      pointerEvents={offline ? 'none' : 'auto'}
      style={[
        styles.row,
        { backgroundColor: T.bgElevated, opacity: offline ? 0.4 : 1 },
      ]}
    >
      <View style={styles.head}>
        <RingAvatar T={T} letter={notif.actorInitial} size={40} />
        <View style={styles.body}>
          <Text style={[typography.body, { color: T.ink }]} numberOfLines={2}>
            <Text style={{ fontWeight: '700' }}>{notif.actorName}</Text> invited you to{' '}
            <Text style={{ fontWeight: '700' }}>{notif.groupName}</Text>
          </Text>
          <Text style={[typography.caption, { color: T.ink3 }]}>
            {formatRelative(notif.createdAt)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.action}>
          <PillBtn
            T={T}
            label="Join"
            variant="primary"
            size="sm"
            onPress={onJoin}
          />
        </View>
        <View style={styles.action}>
          <TwoTapDestructive
            T={T}
            label="Decline"
            confirmLabel="Tap again to decline"
            onConfirm={onDecline}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: 52,
  },
  action: {
    flex: 1,
  },
});

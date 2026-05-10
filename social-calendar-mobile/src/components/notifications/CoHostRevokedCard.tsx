/**
 * CoHostRevokedCard — informational only.
 *
 * "Maya removed you as co-host of Dinner Friday."
 * NO trailing chevron. NO navigation. Tapping the row only marks-as-read
 * (light haptic). Per R11-5 / SPEC-R12-NotifRouting: revoke does not toast
 * and does not navigate.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RingAvatar } from '../foundation/RingAvatar';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { CoHostRevokedNotif } from '../../../../TYPES';

import { SwipeableRow } from './SwipeableRow';
import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface CoHostRevokedCardProps {
  T?: Theme;
  notif: CoHostRevokedNotif;
  onRead: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
}

export function CoHostRevokedCard({
  T = colors.light,
  notif,
  onRead,
  onMute,
  onDismiss,
}: CoHostRevokedCardProps): React.JSX.Element {
  const fire = useHaptic();

  function onPress() {
    onRead();
    fire('light');
  }

  return (
    <SwipeableRow T={T} onMute={onMute} onDismiss={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${notif.actorName} removed you as co-host of ${notif.eventName}`}
        onPress={onPress}
        style={[styles.row, { backgroundColor: T.bgElevated }]}
      >
        <RingAvatar T={T} letter={notif.actorInitial} size={40} />
        <View style={styles.body}>
          <Text style={[typography.body, { color: T.ink }]} numberOfLines={2}>
            <Text style={{ fontWeight: '700' }}>{notif.actorName}</Text> removed you as co-host of{' '}
            <Text style={{ fontWeight: '700' }}>{notif.eventName}</Text>
          </Text>
          <Text style={[typography.caption, { color: T.ink3 }]}>
            {formatRelative(notif.createdAt)}
          </Text>
        </View>
      </Pressable>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 4,
  },
});

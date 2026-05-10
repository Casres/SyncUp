/**
 * CoHostCard — "Maya made you a co-host of Dinner Friday".
 *
 * Tap row → onNavigate(eventId). Medium haptic at tap (R12-1).
 * Star icon next to actor name to signal the co-host promotion (parity with
 * CoHostToast on the live-app surface).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RingAvatar } from '../foundation/RingAvatar';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { CoHostNotif } from '../../../../TYPES';

import { SwipeableRow } from './SwipeableRow';
import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface CoHostCardProps {
  T?: Theme;
  notif: CoHostNotif;
  onNavigate: (eventId: string) => void;
  onRead: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
}

export function CoHostCard({
  T = colors.light,
  notif,
  onNavigate,
  onRead,
  onMute,
  onDismiss,
}: CoHostCardProps): React.JSX.Element {
  const fire = useHaptic();

  function onPress() {
    onRead();
    fire('medium');
    onNavigate(notif.eventId);
  }

  return (
    <SwipeableRow T={T} onMute={onMute} onDismiss={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${notif.actorName} made you a co-host of ${notif.eventName}`}
        onPress={onPress}
        style={[styles.row, { backgroundColor: T.bgElevated }]}
      >
        <RingAvatar T={T} letter={notif.actorInitial} size={40} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Ionicons name="star" size={14} color={T.accent} />
            <Text style={[typography.body, { color: T.ink }]} numberOfLines={2}>
              <Text style={{ fontWeight: '700' }}>{notif.actorName}</Text> made you a co-host of{' '}
              <Text style={{ fontWeight: '700' }}>{notif.eventName}</Text>
            </Text>
          </View>
          <Text style={[typography.caption, { color: T.ink3 }]}>
            {formatRelative(notif.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={T.ink3} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
});

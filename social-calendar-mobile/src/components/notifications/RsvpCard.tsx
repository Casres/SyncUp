/**
 * RsvpCard — "Sam said yes to Dinner Friday".
 *
 * Tap row OR trailing chevron → onNavigate(eventId). Medium haptic at tap
 * moment (R12-1 + SPEC-R12-NotifRouting). Marked read at the same moment.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RingAvatar } from '../foundation/RingAvatar';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { RsvpNotif } from '../../../../TYPES';

import { RSVPBadge } from './RSVPBadge';
import { SwipeableRow } from './SwipeableRow';
import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface RsvpCardProps {
  T?: Theme;
  notif: RsvpNotif;
  onNavigate: (eventId: string) => void;
  onRead: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
}

const VERB_BY_STATUS: Record<RsvpNotif['rsvpStatus'], string> = {
  yes: 'said yes to',
  maybe: 'is a maybe for',
  no: 'declined',
};

export function RsvpCard({
  T = colors.light,
  notif,
  onNavigate,
  onRead,
  onMute,
  onDismiss,
}: RsvpCardProps): React.JSX.Element {
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
        accessibilityLabel={`${notif.actorName} ${VERB_BY_STATUS[notif.rsvpStatus]} ${notif.eventName}`}
        onPress={onPress}
        style={[styles.row, { backgroundColor: T.bgElevated }]}
      >
        <RingAvatar T={T} letter={notif.actorInitial} size={40} />
        <View style={styles.body}>
          <Text style={[typography.body, { color: T.ink }]} numberOfLines={2}>
            <Text style={{ fontWeight: '700' }}>{notif.actorName}</Text>{' '}
            {VERB_BY_STATUS[notif.rsvpStatus]}{' '}
            <Text style={{ fontWeight: '700' }}>{notif.eventName}</Text>
          </Text>
          <View style={styles.subRow}>
            <RSVPBadge T={T} status={notif.rsvpStatus} />
            <Text style={[typography.caption, { color: T.ink3 }]}>
              {formatRelative(notif.createdAt)}
            </Text>
          </View>
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
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

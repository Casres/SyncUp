/**
 * EventReminderCard — "Dinner Friday is coming up".
 *
 * Tap row → onNavigate(eventId). Medium haptic at tap (R12-1).
 * No actor avatar — calendar tile in accentSoft instead.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { EventReminderNotif } from '../../../../TYPES';

import { SwipeableRow } from './SwipeableRow';
import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface EventReminderCardProps {
  T?: Theme;
  notif: EventReminderNotif;
  onNavigate: (eventId: string) => void;
  onRead: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
}

export function EventReminderCard({
  T = colors.light,
  notif,
  onNavigate,
  onRead,
  onMute,
  onDismiss,
}: EventReminderCardProps): React.JSX.Element {
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
        accessibilityLabel={`${notif.eventName} is coming up`}
        onPress={onPress}
        style={[styles.row, { backgroundColor: T.bgElevated }]}
      >
        <View style={[styles.tile, { backgroundColor: T.accentSoft }]}>
          <Ionicons name="calendar" size={20} color={T.accent} />
        </View>
        <View style={styles.body}>
          <Text style={[typography.body, { color: T.ink }]} numberOfLines={2}>
            <Text style={{ fontWeight: '700' }}>{notif.eventName}</Text> is coming up
          </Text>
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
  tile: {
    width: 40,
    height: 40,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
});

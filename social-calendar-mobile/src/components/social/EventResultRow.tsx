/**
 * EventResultRow — Search result row for an Event (R8-3).
 *
 * 44×44 accentSoft calendar-tile (month + day) + event name (2-line clamp)
 * + date string + RSVP status dot. Row tap navigates cross-screen →
 * medium haptic.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { Event, RSVPStatus } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface EventResultRowProps {
  T?: Theme;
  event: Event;
  rsvpStatus: RSVPStatus;
  onPress: () => void;
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function dotColor(T: Theme, status: RSVPStatus): string {
  if (status === 'yes') return T.limeInk;
  if (status === 'maybe') return T.accent;
  if (status === 'no') return T.popInk;
  return T.ink3;
}

export function EventResultRow({
  T = colors.light,
  event,
  rsvpStatus,
  onPress,
}: EventResultRowProps): React.JSX.Element {
  const fire = useHaptic();

  function onRowPress() {
    fire('medium');
    onPress();
  }

  const d = parseIso(event.iso);
  const monthLabel = MONTH_ABBR[d.getMonth()] ?? '';
  const dayLabel = String(d.getDate());
  const weekday = WEEKDAYS[d.getDay()] ?? '';
  const dateLine = `${weekday} · ${monthLabel} ${dayLabel}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title} on ${dateLine}`}
      onPress={onRowPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: T.bgElevated, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: T.accentSoft }]}>
        <Text style={[styles.tileMonth, { color: T.ink2 }]}>{monthLabel}</Text>
        <Text style={[styles.tileDay, { color: T.ink }]}>{dayLabel}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: T.ink }]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={[styles.date, { color: T.ink2 }]} numberOfLines={1}>
          {dateLine}
        </Text>
      </View>
      <View style={[styles.dot, { backgroundColor: dotColor(T, rsvpStatus) }]} />
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
  tile: {
    width: 44,
    height: 44,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMonth: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  tileDay: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
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
  date: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

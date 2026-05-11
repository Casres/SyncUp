/**
 * EventCard — Home feed event card.
 *
 * Inferred shape (the spec lists EventCard but does not table its props):
 *   - bgElevated card surface, radius 14, hair border
 *   - Glyph badge (24x24) + title (h3, 2-line clamp R5-6) + meta line
 *   - Optional trailing AvailDot (paired with the user's RSVP status)
 *   - Optional onPress handler — entire card is tappable when provided
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { AvailDot } from '../profile/AvailDot';
import type { Event, RSVPStatus } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface EventCardProps {
  T?: Theme;
  event: Event;
  /** The local user's RSVP for this event, if any. Drives trailing dot + label. */
  myRsvp?: RSVPStatus;
  onPress?: () => void;
}

const RSVP_COPY: Record<Exclude<RSVPStatus, null>, { label: string; tone: 'free' | 'maybe' | 'busy' }> = {
  yes: { label: 'Going', tone: 'free' },
  maybe: { label: 'Maybe', tone: 'maybe' },
  no: { label: 'Not going', tone: 'busy' },
};

export function EventCard({
  T = colors.light,
  event,
  myRsvp,
  onPress,
}: EventCardProps): React.JSX.Element {
  const meta = formatMeta(event);
  const rsvp = myRsvp ? RSVP_COPY[myRsvp] : null;

  const body = (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <View style={[styles.glyph, { backgroundColor: T.accentSoft }]}>
        <Text style={{ color: T.accentInk, fontWeight: '800' }}>{glyphChar(event)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[typography.h3, { color: T.ink }]} numberOfLines={2} ellipsizeMode="tail">
          {event.title}
        </Text>
        <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={1}>
          {meta}
        </Text>
        {event.location ? (
          <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={1}>
            {event.location}
          </Text>
        ) : null}
        {rsvp ? (
          <View style={styles.rsvpRow}>
            <AvailDot T={T} status={rsvp.tone} />
            <Text style={[typography.caption, { color: T.ink2, fontWeight: '600' }]}>
              {rsvp.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}. ${meta}`}
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {body}
      </Pressable>
    );
  }
  return body;
}

function glyphChar(e: Event): string {
  if (e.glyph && e.glyph.length > 0) return e.glyph[0]!.toUpperCase();
  return e.title.length > 0 ? e.title[0]!.toUpperCase() : '·';
}

function formatMeta(e: Event): string {
  // Avoid Intl complexity; produce a stable readable line from ISO fields.
  const date = e.iso;
  const start = formatTime(e.startAt);
  const end = formatTime(e.endAt);
  if (start && end) return `${date} · ${start}–${end}`;
  if (start) return `${date} · ${start}`;
  return date;
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

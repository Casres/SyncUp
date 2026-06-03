/**
 * EventDetailScreen — Event detail with RSVP sheet.
 *
 * SCREENS.md Event Detail layout:
 *  1. FlowHeader (back + 2-line title clamp)
 *  2. EventDetailCard — glyph + title + date + location + MiniMap + description
 *     (3-line clamp + Read more, R5-6)
 *  3. Attendees section — RingAvatar grid; collapses 50+ → first 8 + "+N more"
 *  4. RSVP CTA — sticky bottom PillBtn opens RSVPSheet
 *
 * State pattern:
 *  - server data via useEvent + useSubmitRSVP (optimistic)
 *  - UI state: sheet visibility, "Read more" expand, error toast visibility
 *
 * Hard rules: R5-1 (RSVP shows AvailDot + label), R5-3 (MiniMap static — no
 * parallax), R5-6 (truncation rules).
 *
 * Edge cases handled:
 *  - 50+ attendees → first 8 + "+N more" pill
 *  - long title → 2-line clamp
 *  - long description → 3-line clamp + Read more
 *  - RSVP failed → ErrorToast preset 'rsvp' (auto-fires error haptic via H-5)
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvailDot,
  ErrorState,
  ErrorToast,
  FlowHeader,
  LoadingOverlay,
  MiniMap,
  Overline,
  PillBtn,
  RSVPSheet,
  RingAvatar,
  TOAST_POSITION_DEFAULTS,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useEvent, useFriendProfile, useSubmitRSVP } from '../../api';
import type { EventDetailScreenProps } from '../../navigation/types';
import type { RSVPStatus } from '../../../../TYPES';

const ATTENDEE_COLLAPSE_THRESHOLD = 8;

const RSVP_LABEL: Record<Exclude<RSVPStatus, null>, { label: string; tone: 'free' | 'maybe' | 'busy' }> = {
  yes:   { label: 'Going',     tone: 'free' },
  maybe: { label: 'Maybe',     tone: 'maybe' },
  no:    { label: 'Not going', tone: 'busy' },
};

export default function EventDetailScreen({
  navigation,
  route,
}: EventDetailScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { eventId } = route.params;

  const { data: event, isLoading, error, refetch } = useEvent(eventId);
  // Host display name — resolved from /users/:id. `enabled` guards the empty
  // id during the event's own load.
  const { data: host } = useFriendProfile(event?.hostId ?? '');
  const submitRSVP = useSubmitRSVP();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [readMore, setReadMore] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Event" onBack={() => navigation.goBack()} />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Event" onBack={() => navigation.goBack()} />
        <View style={styles.fill}>
          <ErrorState
            T={T}
            kind={error?.code === 'NOT_FOUND' ? 'notFound' : 'server'}
            onPrimary={() => navigation.goBack()}
            onSecondary={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const myRsvp: RSVPStatus = event.rsvps.me ?? null;
  const attendees = Object.entries(event.rsvps).filter(([, status]) => status === 'yes');
  const visibleAttendees = attendees.slice(0, ATTENDEE_COLLAPSE_THRESHOLD);
  const overflow = Math.max(0, attendees.length - ATTENDEE_COLLAPSE_THRESHOLD);

  const myStatus = myRsvp ? RSVP_LABEL[myRsvp] : null;

  const handleRSVP = (next: 'yes' | 'maybe' | 'no'): void => {
    submitRSVP.mutate(
      { eventId: event.id, status: next },
      {
        onError: () => setToastVisible(true),
      }
    );
    setSheetVisible(false);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title={event.title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        {/* Hero / detail card */}
        <View style={[styles.hero, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
          <View style={[styles.glyph, { backgroundColor: T.accentSoft }]}>
            <Text style={{ color: T.accentInk, fontWeight: '800', fontSize: 18 }}>
              {(event.glyph?.[0] ?? event.title[0] ?? '·').toUpperCase()}
            </Text>
          </View>
          <Text
            style={[typography.h2, { color: T.ink }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {event.title}
          </Text>
          <Text style={[typography.body, { color: T.ink2 }]} numberOfLines={1}>
            {formatMeta(event.iso, event.startAt, event.endAt)}
          </Text>
          {event.location ? (
            <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={1}>
              {event.location}
            </Text>
          ) : null}
          {host ? (
            <Text style={[typography.caption, { color: T.ink3 }]} numberOfLines={1}>
              {`Hosted by ${host.name}`}
            </Text>
          ) : null}
        </View>

        {/* MiniMap (R5-3 static) */}
        {event.geo ? (
          <MiniMap T={T} lat={event.geo.lat} lng={event.geo.lng} height={140} />
        ) : null}

        {/* Description with R5-6 3-line clamp + Read more */}
        {event.description ? (
          <View
            style={[
              styles.descCard,
              { backgroundColor: T.bgElevated, borderColor: T.hair },
            ]}
          >
            <Overline T={T} color="ink2">DESCRIPTION</Overline>
            <Text
              style={[typography.body, { color: T.ink }]}
              numberOfLines={readMore ? undefined : 3}
              ellipsizeMode="tail"
            >
              {event.description}
            </Text>
            {!readMore && event.description.length > 160 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Read more"
                onPress={() => {
                  fire('light');
                  setReadMore(true);
                }}
                hitSlop={8}
              >
                <Text style={[typography.caption, { color: T.accent, fontWeight: '700' }]}>
                  Read more
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* RSVP status chip */}
        {myStatus ? (
          <View style={[styles.rsvpStatusRow, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
            <Overline T={T} color="ink2">YOUR RSVP</Overline>
            <View style={styles.rsvpStatusInner}>
              <AvailDot T={T} status={myStatus.tone} />
              <Text style={[typography.bodyMed, { color: T.ink, fontWeight: '700' }]}>
                {myStatus.label}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Attendees */}
        <View
          style={[
            styles.attendees,
            { backgroundColor: T.bgElevated, borderColor: T.hair },
          ]}
        >
          <Overline T={T} color="ink2">{`GOING · ${attendees.length}`}</Overline>
          <View style={styles.attendeeGrid}>
            {visibleAttendees.map(([userId]) => (
              <RingAvatar
                key={userId}
                T={T}
                letter={userId[0]?.toUpperCase() ?? '?'}
                status="free"
                size={36}
              />
            ))}
            {overflow > 0 ? (
              <View style={[styles.overflow, { backgroundColor: T.bgSunken, borderColor: T.hair }]}>
                <Text style={[typography.caption, { color: T.ink2, fontWeight: '700' }]}>
                  {`+${overflow}`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Sticky RSVP CTA */}
      <View style={[styles.ctaRow, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}>
        <PillBtn
          T={T}
          label={myStatus ? `RSVP · ${myStatus.label}` : 'RSVP'}
          variant="primary"
          size="lg"
          onPress={() => {
            fire('light');
            setSheetVisible(true);
          }}
        />
      </View>

      <RSVPSheet
        T={T}
        visible={sheetVisible}
        value={myRsvp}
        onChange={handleRSVP}
        onClose={() => setSheetVisible(false)}
      />

      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="rsvp"
          visible={toastVisible}
          onRetry={() => {
            setToastVisible(false);
            if (myRsvp) handleRSVP(myRsvp as 'yes' | 'maybe' | 'no');
          }}
          onClose={() => setToastVisible(false)}
          sub="Tap retry · your choice is saved locally"
        />
      </View>
    </SafeAreaView>
  );
}

function formatMeta(iso: string, startAt: string, endAt: string): string {
  const start = formatTime(startAt);
  const end = formatTime(endAt);
  if (start && end) return `${iso} · ${start}–${end}`;
  if (start) return `${iso} · ${start}`;
  return iso;
}

function formatTime(isoDt: string | undefined): string | null {
  if (!isoDt) return null;
  const m = isoDt.match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] * 2,
  },
  hero: {
    padding: spacing.lg,
    borderRadius: radii.hero,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  descCard: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  rsvpStatusRow: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  rsvpStatusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attendees: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  attendeeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  overflow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

/**
 * FriendProfileScreen — Friend's profile + shared availability + actions.
 *
 * SCREENS.md Friend Profile layout:
 *  1. FlowHeader back + title "Profile"
 *  2. Profile card: 72px RingAvatar (paired AvailDot for R5-1) + name (h2)
 *     + handle (mono ink3) + CategoryBadge
 *  3. StatTile row — HOSTED · ATTENDED · FRIENDS · GROUPS
 *  4. Friend types — chips listing FriendType buckets this friend is in
 *  5. Mutual events
 *  6. Shared availability (handles FORBIDDEN gracefully — "Availability private")
 *  7. Action row: "Plan together" primary + "Remove friend" TwoTapDestructive
 *
 * FORBIDDEN handling: useFriendAvailability returns ApiError('FORBIDDEN', …)
 * for user-3 (Marcus). Render "Availability private" — DO NOT show ErrorToast.
 *
 * Empty state: Mutual events empty → EmptyMutualEvents.
 *
 * Hard rules: Hard Rule 7 (TwoTapDestructive — only destructive pattern),
 * R5-1 (paired dot + label), R5-6 (truncation).
 *
 * Haptics: Friend type assigned (chip toggle) → medium; Remove friend arm →
 * heavy + commit success — fired internally by TwoTapDestructive.
 */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvailDot,
  CategoryBadge,
  EmptyMutualEvents,
  ErrorState,
  FlowHeader,
  LoadingOverlay,
  Overline,
  PillBtn,
  RingAvatar,
  StatTile,
  TwoTapDestructive,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useEvents,
  useFriendAvailability,
  useFriendProfile,
  useFriends,
} from '../../api';
import { MOCK_FRIEND_LABELS, MOCK_FRIEND_TYPES } from '../../mocks';
import type { FriendProfileScreenProps } from '../../navigation/types';
import type { AvailState, Event } from '../../../../TYPES';

export default function FriendProfileScreen({
  navigation,
  route,
}: FriendProfileScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { friendId } = route.params;

  const { data: profile, isLoading, error, refetch } = useFriendProfile(friendId);
  const { data: friends } = useFriends();
  const { data: friendAvail, error: availError } = useFriendAvailability(friendId);
  const { data: events } = useEvents();

  const friend = friends?.find((f) => f.id === friendId);
  const labelLookup = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of MOCK_FRIEND_LABELS) m[c.id] = c.label;
    return m;
  }, []);

  const todayState = useMemo<AvailState | null>(() => {
    if (!friendAvail) return null;
    const today = new Date().toISOString().split('T')[0]!;
    return friendAvail[today] ?? null;
  }, [friendAvail]);

  const mutualEvents: Event[] = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => e.inviteeIds.includes(friendId));
  }, [events, friendId]);

  const availabilityBlocked = availError?.code === 'FORBIDDEN';

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Profile" onBack={() => navigation.goBack()} />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error || !profile) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Profile" onBack={() => navigation.goBack()} />
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

  const friendTypes = MOCK_FRIEND_TYPES.filter((t) => t.members.includes(friendId));

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body}>
        {/* Profile card */}
        <View style={[styles.hero, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
          <RingAvatar T={T} letter={profile.letter} size={72} status={todayState} />
          <Text
            style={[typography.h2, { color: T.ink, textAlign: 'center' }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {profile.name}
          </Text>
          <Text
            style={[typography.micro, { color: T.ink3, textAlign: 'center' }]}
            numberOfLines={1}
          >
            {profile.handle}
          </Text>
          <View style={styles.statusRow}>
            <AvailDot T={T} status={availabilityBlocked ? null : todayState} />
            <Text style={[typography.caption, { color: T.ink2, fontWeight: '600' }]}>
              {availabilityBlocked
                ? 'Availability private'
                : todayState
                  ? `Today · ${labelForState(todayState)}`
                  : 'Availability not set'}
            </Text>
          </View>
          {friend ? (
            <CategoryBadge T={T} label={labelLookup[friend.category] ?? friend.category} />
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatTile T={T} n={profile.stats.hosted} label="HOSTED" />
          <StatTile T={T} n={profile.stats.attended} label="ATTENDED" />
          <StatTile T={T} n={profile.stats.friends} label="FRIENDS" />
          <StatTile T={T} n={profile.stats.groups} label="GROUPS" />
        </View>

        {/* Friend types (private to me) */}
        {friendTypes.length > 0 ? (
          <View style={styles.section}>
            <Overline T={T} color="ink2">FRIEND TYPES</Overline>
            <View style={styles.chipsRow}>
              {friendTypes.map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.typeChip,
                    { backgroundColor: T.accentSoft, borderColor: T.hair },
                  ]}
                >
                  <Text style={[typography.caption, { color: T.accentInk, fontWeight: '700' }]}>
                    {t.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Mutual events */}
        <View style={styles.section}>
          <Overline T={T} color="ink2">MUTUAL EVENTS</Overline>
          {mutualEvents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyMutualEvents
                T={T}
                onPlan={() => {
                  fire('medium');
                  navigation.navigate('CreateEventModal', {
                    screen: 'Step1',
                    params: { prefilledInviteeIds: [friendId] },
                  });
                }}
              />
            </View>
          ) : (
            <View style={styles.eventsList}>
              {mutualEvents.map((evt) => (
                <View
                  key={evt.id}
                  style={[
                    styles.eventRow,
                    { backgroundColor: T.bgElevated, borderColor: T.hair },
                  ]}
                >
                  <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                    {evt.title}
                  </Text>
                  <Text style={[typography.caption, { color: T.ink2 }]}>{evt.iso}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action row */}
        <View style={styles.actionsCol}>
          <PillBtn
            T={T}
            label="Plan together"
            variant="primary"
            size="md"
            onPress={() => {
              fire('medium');
              navigation.navigate('CreateEventModal', {
                screen: 'Step1',
                params: { prefilledInviteeIds: [friendId] },
              });
            }}
          />
          <TwoTapDestructive
            T={T}
            label="Remove friend"
            confirmLabel="Tap again to confirm"
            onConfirm={() => {
              navigation.goBack();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function labelForState(state: AvailState): string {
  switch (state) {
    case 'free':  return 'Free';
    case 'maybe': return 'Maybe';
    case 'busy':  return 'Busy';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] * 2,
  },
  hero: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.hero,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
  },
  eventsList: {
    gap: spacing.sm,
  },
  eventRow: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  actionsCol: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

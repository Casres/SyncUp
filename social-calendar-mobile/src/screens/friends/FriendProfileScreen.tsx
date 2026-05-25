/**
 * FriendProfileScreen — Friend's profile + shared availability + actions.
 *
 * Anatomy (R16-1):
 *  1. FlowHeader · back · title "Profile" · trailing overflow (⋯) per R16-6
 *  2. Profile card: 72px RingAvatar (paired AvailDot for R5-1) + name (h2)
 *     + handle (mono ink3) + CategoryBadge
 *  3. StatTile row — HOSTED · ATTENDED · FRIENDS · GROUPS
 *  4. Friend types — chips listing FriendType buckets this friend is in.
 *     R16-10: display-only on this screen. Tap is a no-op.
 *  5. Mutual events. R16-11: read-only list. Tap is a no-op.
 *  6. Action row: two equal primary pills — Make Plans + DM (R16-5).
 *     Remove friend / Block / Report all live in the header overflow.
 *
 * FORBIDDEN handling: useFriendAvailability returns ApiError('FORBIDDEN', …)
 * for friends who haven't shared their availability. Render "Availability
 * private" — DO NOT show ErrorToast.
 *
 * Empty state: Mutual events empty → EmptyMutualEvents.
 *
 * Hard rules: Hard Rule 7 (TwoTapDestructive — handled inside the overflow
 * rows per R16-6), R5-1 (paired dot + label), R5-6 (truncation).
 *
 * Haptics:
 *  - Make Plans → medium
 *  - DM stub → light (R16-9)
 *  - Overflow open → light
 *  - Remove/Block arm → heavy; commit → success (fired by overflow rows)
 *  - Report arm → light; commit → success (fired by overflow row, R16-9)
 *
 * State-management note (per project CLAUDE.md):
 *  - Server data lives in React Query only — useFriendProfile, useFriends,
 *    useFriendAvailability, useEvents, useRemoveFriend, useBlockUser.
 *  - Transient UI state (overflow open, toast visibility) is local React
 *    state. No Zustand.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  AvailDot,
  CategoryBadge,
  EmptyMutualEvents,
  ErrorState,
  ErrorToast,
  FlowHeader,
  FriendProfileOverflowMenu,
  InfoToast,
  LoadingOverlay,
  Overline,
  PillBtn,
  RingAvatar,
  StatTile,
  TOAST_POSITION_DEFAULTS,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useBlockUser,
  useEvents,
  useFriendAvailability,
  useFriendProfile,
  useFriends,
  useRemoveFriend,
} from '../../api';
import { MOCK_FRIEND_LABELS, MOCK_FRIEND_TYPES } from '../../mocks';
import type { FriendProfileScreenProps } from '../../navigation/types';
import type { AvailState, Event } from '../../../../TYPES';

// R16-9 stub copy. Centralized so future rounds can promote either string
// without grepping for it.
const DM_STUB_COPY = 'Direct messaging is coming soon.';
const REPORT_CONFIRM_COPY = "Thanks — we'll review this report.";

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

  // ── R16-7 / R16-8 mutations ────────────────────────────────────────────────
  const removeFriend = useRemoveFriend();
  const blockUser = useBlockUser();

  // ── Transient UI state (R16-6 overflow + R16-9 toasts + error toast) ──────
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const [errorToastVisible, setErrorToastVisible] = useState(false);

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

  // ── Handlers (R16-5 / R16-6 / R16-7 / R16-8 / R16-9) ──────────────────────
  const handleMakePlans = useCallback(() => {
    fire('medium');
    navigation.navigate('CreateEventModal', {
      screen: 'Step1',
      params: { prefilledInviteeIds: [friendId] },
    });
  }, [fire, friendId, navigation]);

  const handleDmStub = useCallback(() => {
    // R16-9 — DM is intentionally a stub in this round. No network roundtrip.
    fire('light');
    setInfoToast(DM_STUB_COPY);
  }, [fire]);

  const handleOpenOverflow = useCallback(() => {
    fire('light');
    setOverflowOpen(true);
  }, [fire]);

  const handleCloseOverflow = useCallback(() => {
    setOverflowOpen(false);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    // R16-7 — silent return on success; ErrorToast on failure.
    removeFriend.mutate(friendId, {
      onSuccess: () => {
        setOverflowOpen(false);
        navigation.popToTop();
      },
      onError: () => {
        setOverflowOpen(false);
        setErrorToastVisible(true);
      },
    });
  }, [friendId, navigation, removeFriend]);

  const handleBlockConfirm = useCallback(() => {
    // R16-8 — silent return on success; ErrorToast on failure. Block is a
    // superset of Remove on the backend; the mutation itself handles cache
    // invalidation across friends, events, notifications, and blocks.
    blockUser.mutate(friendId, {
      onSuccess: () => {
        setOverflowOpen(false);
        navigation.popToTop();
      },
      onError: () => {
        setOverflowOpen(false);
        setErrorToastVisible(true);
      },
    });
  }, [blockUser, friendId, navigation]);

  const handleReportConfirm = useCallback(() => {
    // R16-9 — Report is a client-side stub. No mutation, no roundtrip.
    setOverflowOpen(false);
    setInfoToast(REPORT_CONFIRM_COPY);
  }, []);

  // ── Header trailing slot: ⋯ overflow trigger ──────────────────────────────
  const headerRight = useMemo(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
        onPress={handleOpenOverflow}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={T.ink2} />
      </Pressable>
    ),
    [T.ink2, handleOpenOverflow],
  );

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
  const friendFirstName = profile.name.split(' ')[0] ?? profile.name;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader
        T={T}
        title="Profile"
        onBack={() => navigation.goBack()}
        right={headerRight}
      />

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

        {/* R16-5 Action row — two equal primary pills. Destructive actions
            (Remove / Block / Report) live in the header overflow per R16-6. */}
        <View style={styles.actionsRow}>
          <View style={styles.actionCell}>
            <PillBtn
              T={T}
              label="Make Plans"
              variant="primary"
              size="md"
              icon={<Ionicons name="calendar-outline" size={16} color={T.bgElevated} />}
              onPress={handleMakePlans}
            />
          </View>
          <View style={styles.actionCell}>
            <PillBtn
              T={T}
              label="DM"
              variant="primary"
              size="md"
              icon={<Ionicons name="chatbubble-outline" size={16} color={T.bgElevated} />}
              onPress={handleDmStub}
            />
          </View>
        </View>
      </ScrollView>

      {/* R16-6 — Header overflow menu (only mounted when open so the modal
          backdrop doesn't sit invisibly over the screen). */}
      {overflowOpen ? (
        <FriendProfileOverflowMenu
          T={T}
          friendFirstName={friendFirstName}
          onRemoveConfirm={handleRemoveConfirm}
          onBlockConfirm={handleBlockConfirm}
          onReportConfirm={handleReportConfirm}
          onClose={handleCloseOverflow}
        />
      ) : null}

      {/* R16-9 — DM + Report stub toasts. Single state slot; whichever stub
          fires last wins (the previous toast fades on auto-dismiss). */}
      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <InfoToast
          T={T}
          visible={infoToast !== null}
          message={infoToast ?? ''}
          onClose={() => setInfoToast(null)}
        />
      </View>

      {/* R16-7 / R16-8 — Mutation failures. Stay on screen; user can retry
          by re-opening the overflow. */}
      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="generic"
          visible={errorToastVisible}
          onRetry={() => {
            setErrorToastVisible(false);
            handleOpenOverflow();
          }}
          onClose={() => setErrorToastVisible(false)}
        />
      </View>
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
  /** R16-5 — action row holds Make Plans + DM as equal-flex pills, 8px gap. */
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionCell: {
    flex: 1,
  },
});

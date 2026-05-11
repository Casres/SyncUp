/**
 * Step3Screen — Create Event Flow / Invite (with wire-back).
 *
 * SCREENS.md Step 3 layout:
 *  1. FlowHeader title "Invite" + back chevron
 *  2. ProgressBar (step 3 of 3)
 *  3. WIRE-BACK: when myAvailability[draft.eventIso] === 'busy', render
 *     <Step3BusyBanner /> (Hard Rule 17). When 'free' / 'maybe', render
 *     <Step3AvailChip />. Banner mount fires `warning` haptic.
 *  4. AvailabilitySummaryBar (banded — Hard Rule 1)
 *  5. FilterChipRowMulti for filtering invitees by FriendType
 *  6. Banded invitee list — RingAvatar + name + handle, grouped by avail bucket
 *  7. Footer "Send invites" pill (mono status pill on left)
 *
 * Hard rules: Hard Rule 1 (banded LOCKED), Hard Rule 17 (busy banner), R5-1
 * (paired dot + label), R5-6 (truncation).
 *
 * Edge cases:
 *  - 50+ invitees → first 8 + "+N more" pill
 *  - FORBIDDEN (Marcus) and empty (Sasha) → treated as "unknown" bucket
 *  - "FROM YOUR AVAILABILITY · NOT SET" footer when myAvailability lacks the day
 *
 * Haptics: chip filter → light; warning fires on busy banner mount; medium on
 * Send tap; success/error fire after createEvent settles.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';

import {
  AvailabilitySummaryBar,
  ErrorState,
  ErrorToast,
  FilterChipRowMulti,
  FlowHeader,
  LoadingOverlay,
  Overline,
  PillBtn,
  ProgressBar,
  RingAvatar,
  Step3AvailChip,
  Step3BusyBanner,
  TOAST_POSITION_DEFAULTS,
  type FilterChip,
  type FriendsAvailMap,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  ApiError,
  getFriendAvailability,
  queryKeys,
  useApiFetch,
  useCreateEvent,
  useFriends,
  useMyAvailability,
} from '../../api';
import { MOCK_FRIEND_TYPES } from '../../mocks';
import type { Step3ScreenProps } from '../../navigation/types';
import type {
  AvailState,
  AvailabilityEntry,
  Event,
  Friend,
  RSVPStatus,
} from '../../../../TYPES';
import { updateDraft, useDraft } from './draftStore';

const COLLAPSE_THRESHOLD = 8;

export default function Step3Screen({ navigation }: Step3ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const draft = useDraft();

  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [errorVisible, setErrorVisible] = useState(false);

  const { data: friends, isLoading: friendsLoading, error: friendsError, refetch } = useFriends();
  const { data: myAvail } = useMyAvailability();
  const createEvent = useCreateEvent();
  const authedFetch = useApiFetch();

  // Per-friend availability for the chosen iso (graceful FORBIDDEN/unknown).
  const availQueries = useQueries({
    queries: (friends ?? []).map((f) => ({
      queryKey: queryKeys.availability.friend(f.id),
      queryFn: () => getFriendAvailability(authedFetch, f.id),
      retry: (failureCount: number, err: unknown) => {
        if (err instanceof ApiError && err.code === 'FORBIDDEN') return false;
        return failureCount < 1;
      },
    })),
  });

  const dayAvail = draft.eventIso && myAvail ? myAvail[draft.eventIso] : undefined;

  // Wire-back: warning haptic on busy banner mount only.
  const haveWarned = useRef(false);
  useEffect(() => {
    if (dayAvail === 'busy' && !haveWarned.current) {
      fire('warning');
      haveWarned.current = true;
    }
    if (dayAvail !== 'busy') haveWarned.current = false;
  }, [dayAvail, fire]);

  const friendStateForDay = useMemo<FriendsAvailMap>(() => {
    const map: FriendsAvailMap = {};
    if (!friends || !draft.eventIso) return map;
    friends.forEach((f, idx) => {
      const q = availQueries[idx];
      if (!q || q.isError) {
        map[f.id] = null;
        return;
      }
      const entry = q.data as AvailabilityEntry | undefined;
      map[f.id] = entry?.[draft.eventIso!] ?? null;
    });
    return map;
  }, [friends, availQueries, draft.eventIso]);

  // Banded buckets for the list.
  const buckets = useMemo(() => bucketize(friends ?? [], friendStateForDay, typeFilter), [
    friends,
    friendStateForDay,
    typeFilter,
  ]);

  const typeChips: FilterChip[] = useMemo(
    () =>
      MOCK_FRIEND_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        count: t.members.length,
      })),
    []
  );

  const invitedCount = draft.inviteeIds.length;
  const totalInvitees = (friends ?? []).length;

  const handleSend = (): void => {
    if (!draft.eventIso) return;
    fire('medium');

    const payload: Omit<Event, 'id'> = {
      title: draft.title,
      hostId: 'me',
      coHostIds: [],
      iso: draft.eventIso,
      startAt: draft.startAt ?? `${draft.eventIso}T00:00:00`,
      endAt: draft.endAt ?? `${draft.eventIso}T23:59:59`,
      location: draft.location,
      geo: draft.geo,
      description: draft.description,
      inviteeIds: draft.inviteeIds,
      rsvps: draft.inviteeIds.reduce<Record<string, RSVPStatus>>(
        (acc, id) => {
          acc[id] = null;
          return acc;
        },
        { me: 'yes' }
      ),
      glyph: draft.glyph,
      price: draft.price,
    };

    createEvent.mutate(payload, {
      onSuccess: (created) => {
        fire('success');
        navigation.navigate('Confirm', { eventId: created.id });
      },
      onError: () => {
        // ErrorToast itself fires the error haptic on visible mount (H-5).
        setErrorVisible(true);
      },
    });
  };

  const toggleInvitee = (friendId: string): void => {
    fire('light');
    const next = draft.inviteeIds.includes(friendId)
      ? draft.inviteeIds.filter((id) => id !== friendId)
      : [...draft.inviteeIds, friendId];
    updateDraft({ inviteeIds: next });
  };

  if (friendsLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Invite" onBack={() => navigation.goBack()} />
        <ProgressBar T={T} step={3} />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (friendsError) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Invite" onBack={() => navigation.goBack()} />
        <ProgressBar T={T} step={3} />
        <View style={styles.fill}>
          <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Invite" onBack={() => navigation.goBack()} />
      <ProgressBar T={T} step={3} />

      <ScrollView contentContainerStyle={styles.body}>
        {/* Wire-back: busy banner OR avail chip OR nothing. */}
        {draft.eventIso && dayAvail === 'busy' ? (
          <Step3BusyBanner T={T} iso={draft.eventIso} />
        ) : dayAvail === 'free' || dayAvail === 'maybe' ? (
          <Step3AvailChip T={T} status={dayAvail} />
        ) : null}

        <AvailabilitySummaryBar T={T} draft={draft} friendsAvail={friendStateForDay} />

        <FilterChipRowMulti
          T={T}
          chips={typeChips}
          selected={typeFilter}
          onChange={setTypeFilter}
        />

        {/* Banded invitee list. Each band = avail bucket; 50+ → first 8 + +N pill. */}
        {buckets.map((bucket) => {
          if (bucket.friends.length === 0) return null;
          const visible = bucket.friends.slice(0, COLLAPSE_THRESHOLD);
          const overflow = Math.max(0, bucket.friends.length - COLLAPSE_THRESHOLD);
          return (
            <View key={bucket.label} style={styles.band}>
              <View
                style={[
                  styles.bandHeader,
                  { backgroundColor: bucket.headerBg, borderColor: T.hair },
                ]}
              >
                <Overline T={T} color="ink2">{bucket.label}</Overline>
              </View>
              <View style={[styles.bandList, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
                {visible.map((f) => {
                  const selected = draft.inviteeIds.includes(f.id);
                  return (
                    <Pressable
                      key={f.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={f.name}
                      onPress={() => toggleInvitee(f.id)}
                      style={({ pressed }) => [
                        styles.row,
                        { borderBottomColor: T.hair, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <RingAvatar T={T} letter={f.letter} selected={selected} size={36} />
                      <View style={styles.rowBody}>
                        <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                          {f.name}
                        </Text>
                        <Text style={[typography.micro, { color: T.ink2 }]} numberOfLines={1}>
                          {f.handle}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {overflow > 0 ? (
                  <View style={styles.overflowRow}>
                    <Text style={[typography.caption, { color: T.ink2, fontWeight: '700' }]}>
                      {`+${overflow} more`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer status pill + Send pill */}
      <View
        style={[
          styles.ctaRow,
          { backgroundColor: T.bgElevated, borderTopColor: T.hair },
        ]}
      >
        <View style={[styles.statusPill, { backgroundColor: T.bgSunken }]}>
          <Overline T={T} color={dayAvail === undefined ? 'ink3' : 'ink2'}>
            {dayAvail === undefined
              ? 'FROM YOUR AVAILABILITY · NOT SET'
              : 'FROM YOUR AVAILABILITY'}
          </Overline>
        </View>
        <PillBtn
          T={T}
          label={`Send invites · ${invitedCount}/${totalInvitees}`}
          variant="primary"
          size="lg"
          onPress={handleSend}
          disabled={invitedCount === 0 || createEvent.isPending}
          loading={createEvent.isPending}
        />
      </View>

      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="invite"
          visible={errorVisible}
          onRetry={() => {
            setErrorVisible(false);
            handleSend();
          }}
          onClose={() => setErrorVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

interface Bucket {
  label: string;
  state: AvailState | null;
  headerBg: string;
  friends: Friend[];
}

function bucketize(
  friends: Friend[],
  states: FriendsAvailMap,
  typeFilter: string[]
): Bucket[] {
  const T = colors.light;
  const filterSet = new Set(typeFilter);
  const filtered = typeFilter.length === 0
    ? friends
    : friends.filter((f) => f.friendTypes.some((t) => filterSet.has(t)));

  const buckets: Bucket[] = [
    { label: 'FREE',    state: 'free',  headerBg: T.availFree,  friends: [] },
    { label: 'MAYBE',   state: 'maybe', headerBg: T.availMaybe, friends: [] },
    { label: 'BUSY',    state: 'busy',  headerBg: T.availBusy,  friends: [] },
    { label: 'UNKNOWN', state: null,    headerBg: T.bgSunken,   friends: [] },
  ];

  for (const f of filtered) {
    const state = states[f.id] ?? null;
    const target = buckets.find((b) => b.state === state) ?? buckets[3]!;
    target.friends.push(f);
  }
  return buckets;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] * 2,
  },
  band: {
    gap: spacing.xs,
  },
  bandHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.inline,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  bandList: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  overflowRow: {
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.md,
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
});

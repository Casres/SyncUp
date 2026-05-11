/**
 * FriendsListScreen — Friends list.
 *
 * SCREENS.md Friends List layout:
 *  1. FlowHeader title "Friends. {count}" (h1 style — uses FlowHeader as base
 *     since the screen-level h1 lives in FlowHeader's center slot)
 *  2. SegmentedSwitcher — All / BFFs / Pending
 *  3. FilterChipRowMulti — by FriendType
 *  4. Pending requests banner (when MOCK_PENDING_REQUESTS.length > 0)
 *  5. StaggerList of friend rows
 *  6. Floating "+" / Scan FAB → AddFriend
 *
 * Hard rules: R5-6 (1-line ellipsis on name + handle), Hard Rule 2 (44pt hit).
 *
 * Edge cases: long name/handle ellipsis; single friend → FilterChipRowMulti
 * still renders but harmless (less than 2 categories filter is a no-op visually).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CategoryBadge,
  EmptyFriends,
  ErrorState,
  FilterChipRowMulti,
  FlowHeader,
  LoadingOverlay,
  Overline,
  PillBtn,
  RingAvatar,
  SegmentedSwitcher,
  StaggerList,
  type FilterChip,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import { useFriendRequests, useFriends, useRespondToFriendRequest } from '../../api';
import { MOCK_FRIEND_LABELS, MOCK_FRIEND_TYPES } from '../../mocks';
import type { FriendsListScreenProps } from '../../navigation/types';
import type { Friend } from '../../../../TYPES';

const SEGMENTS = [
  { id: 'all',     label: 'All' },
  { id: 'bff',     label: 'BFFs' },
  { id: 'pending', label: 'Pending' },
];

export default function FriendsListScreen({
  navigation,
}: FriendsListScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  const [segment, setSegment] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const { data: friends, isLoading, error, refetch } = useFriends();
  const { data: requests } = useFriendRequests();
  const respond = useRespondToFriendRequest();

  const visibleFriends = useMemo(
    () => filterFriends(friends ?? [], segment, typeFilter),
    [friends, segment, typeFilter]
  );

  const typeChips: FilterChip[] = useMemo(
    () =>
      MOCK_FRIEND_TYPES.map((t) => ({
        id: t.id,
        label: t.label,
        count: t.members.length,
      })),
    []
  );

  const labelLookup = useMemo(() => buildLabelLookup(), []);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Friends" />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Friends" />
        <View style={styles.fill}>
          <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const friendsCount = friends?.length ?? 0;
  const requestsCount = requests?.length ?? 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader
        T={T}
        title={`Friends · ${friendsCount}`}
        right={
          <PillBtn
            T={T}
            label="Types"
            variant="ghost"
            size="sm"
            onPress={() => navigation.navigate('FriendTypesManager')}
          />
        }
      />

      <View style={styles.segRow}>
        <SegmentedSwitcher T={T} options={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      <View style={styles.filterRow}>
        <FilterChipRowMulti
          T={T}
          chips={typeChips}
          selected={typeFilter}
          onChange={setTypeFilter}
        />
      </View>

      {requestsCount > 0 && segment !== 'pending' ? (
        <View style={[styles.requestBanner, { backgroundColor: T.accentSoft }]}>
          <Overline T={T} color="accentInk">
            {`${requestsCount} pending request${requestsCount === 1 ? '' : 's'}`}
          </Overline>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View pending requests"
            onPress={() => setSegment('pending')}
          >
            <Text style={[typography.caption, { color: T.accentInk, fontWeight: '700' }]}>
              View
            </Text>
          </Pressable>
        </View>
      ) : null}

      {segment === 'pending' && requests ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {requests.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyFriends T={T} />
            </View>
          ) : (
            requests.map((req) => (
              <View key={req.id} style={[styles.row, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
                <RingAvatar T={T} letter={req.letter} size={40} />
                <View style={styles.rowBody}>
                  <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                    {req.name}
                  </Text>
                  <Text style={[typography.micro, { color: T.ink2 }]} numberOfLines={1}>
                    {req.handle}
                  </Text>
                </View>
                <PillBtn
                  T={T}
                  label="Accept"
                  size="sm"
                  variant="primary"
                  onPress={() => {
                    fire('medium');
                    respond.mutate({ id: req.id, action: 'accept' });
                  }}
                />
                <PillBtn
                  T={T}
                  label="Decline"
                  size="sm"
                  variant="ghost"
                  onPress={() => respond.mutate({ id: req.id, action: 'decline' })}
                />
              </View>
            ))
          )}
        </ScrollView>
      ) : visibleFriends.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <EmptyFriends T={T} onAdd={() => navigation.navigate('AddFriend')} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <StaggerList>
            {visibleFriends.map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityLabel={`${f.name} ${f.handle}`}
                onPress={() => {
                  fire('light');
                  navigation.navigate('FriendProfile', { friendId: f.id });
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: T.bgElevated,
                    borderColor: T.hair,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <RingAvatar T={T} letter={f.letter} size={40} />
                <View style={styles.rowBody}>
                  <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={[typography.micro, { color: T.ink2 }]} numberOfLines={1}>
                    {f.handle}
                  </Text>
                </View>
                <CategoryBadge T={T} label={labelLookup[f.category] ?? f.category} />
              </Pressable>
            ))}
          </StaggerList>
        </ScrollView>
      )}

      <View style={styles.fab}>
        <PillBtn
          T={T}
          label="+ Add"
          variant="primary"
          size="md"
          onPress={() => navigation.navigate('AddFriend')}
        />
      </View>
    </SafeAreaView>
  );
}

function filterFriends(
  friends: Friend[],
  segment: string,
  typeFilter: string[]
): Friend[] {
  let list = friends;
  if (segment === 'bff') list = list.filter((f) => f.category === 'bff');
  if (typeFilter.length > 0) {
    const set = new Set(typeFilter);
    list = list.filter((f) => f.friendTypes.some((t) => set.has(t)));
  }
  return list;
}

function buildLabelLookup(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of MOCK_FRIEND_LABELS) map[c.id] = c.label;
  return map;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  segRow: {
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
  },
  filterRow: {
    paddingVertical: spacing.sm,
  },
  requestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.mdl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyWrap: {
    paddingVertical: spacing['4xl'],
  },
  listContent: {
    padding: spacing.mdl,
    gap: spacing.sm,
    paddingBottom: spacing['4xl'] * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    marginBottom: spacing.sm,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fab: {
    position: 'absolute',
    right: spacing.mdl,
    bottom: spacing.lg,
  },
});


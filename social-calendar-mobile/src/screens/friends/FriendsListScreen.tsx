/**
 * FriendsListScreen — host of the Friends·Groups·Messages carousel (R17-1).
 *
 * The screen shell (FlowHeader + 3-way SegmentedSwitcher + per-segment FAB)
 * stays fixed; the body is a SegmentCarousel that swipes between three panes —
 * Friends, Groups (GroupsPane), Messages (InboxPane) — wrapping in both
 * directions. Messages and Groups are SEGMENTS of the Friends tab, not routes
 * or tabs (locked IA; SCREENS.md Friends List).
 *
 * Friends pane:
 *  1. Pending-requests banner → inline-expands the accept/decline list.
 *  2. FilterChipRowMulti — a pinned "BFFs" quick-filter chip prepended to the
 *     FriendType chips (union multi-select).
 *  3. StaggerList of friend rows → FriendProfile.
 *
 * Hard rules: R5-6 (1-line ellipsis on name + handle), Hard Rule 2 (44pt hit).
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
  GroupsPane,
  LoadingOverlay,
  Overline,
  PillBtn,
  RingAvatar,
  SegmentCarousel,
  SegmentedSwitcher,
  StaggerList,
  type FilterChip,
} from '../../components';
import { InboxPane } from '../../components/messaging/InboxPane';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useFriendLabels,
  useFriendRequests,
  useFriends,
  useFriendTypes,
  useGroups,
  useRespondToFriendRequest,
} from '../../api';
import { ContactsDeniedAffordance } from '../../components/foundation/ContactsDeniedAffordance';
import { useIsFirstRun } from '../auth/onboarding/useIsFirstRun';
import { useContactsPermissionStatus } from '../auth/onboarding/useContactsPermissionStatus';
import type { FriendsListScreenProps } from '../../navigation/types';
import type { Friend } from '../../../../TYPES';
import type { InboxItem } from '../../api/conversations.types';

const SEGMENTS = [
  { id: 'friends', label: 'Friends' },
  { id: 'groups', label: 'Groups' },
  { id: 'messages', label: 'Messages' },
];

/** Synthetic chip id for the pinned BFFs quick-filter (R17-1 decision). */
const BFF_CHIP = '__bff__';

export default function FriendsListScreen({
  navigation,
}: FriendsListScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const firstRun = useIsFirstRun();
  const contactsStatus = useContactsPermissionStatus();

  const [index, setIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showPending, setShowPending] = useState(false);

  const { data: friends, isLoading, error, refetch } = useFriends();
  const { data: requests } = useFriendRequests();
  const { data: friendTypes = [] } = useFriendTypes();
  const { data: friendLabels = [] } = useFriendLabels();
  const { data: groups } = useGroups();
  const respond = useRespondToFriendRequest();

  const visibleFriends = useMemo(
    () => filterFriends(friends ?? [], typeFilter),
    [friends, typeFilter],
  );

  const bffCount = useMemo(
    () => (friends ?? []).filter((f) => f.category === 'bff').length,
    [friends],
  );

  const typeChips: FilterChip[] = useMemo(() => {
    const bff: FilterChip = { id: BFF_CHIP, label: 'BFFs', count: bffCount };
    return [
      bff,
      ...friendTypes.map((t) => ({
        id: t.id,
        label: t.label,
        count: t.members.length,
      })),
    ];
  }, [friendTypes, bffCount]);

  const labelLookup = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of friendLabels) map[c.id] = c.label;
    return map;
  }, [friendLabels]);

  const friendsCount = friends?.length ?? 0;
  const requestsCount = requests?.length ?? 0;
  const groupsCount = groups?.length ?? 0;

  const setSegmentById = (id: string) =>
    setIndex(Math.max(0, SEGMENTS.findIndex((s) => s.id === id)));

  const openConversation = (item: InboxItem) => {
    fire('light');
    if (item.type === 'EVENT' && item.linkedEventId) {
      navigation.navigate('HomeTab', {
        screen: 'EventChat',
        params: { conversationId: item.id, eventId: item.linkedEventId },
      });
      return;
    }
    navigation.navigate('MessageThread', {
      conversationId: item.id,
      type: item.type === 'GROUP' ? 'GROUP' : 'DIRECT',
    });
  };

  // ─── Friends pane ─────────────────────────────────────────────────────────
  const friendsPane = (
    <View style={styles.fill}>
      {contactsStatus === 'denied' ? <ContactsDeniedAffordance T={T} /> : null}

      {requestsCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${requestsCount} pending requests, tap to ${showPending ? 'hide' : 'view'}`}
          onPress={() => setShowPending((v) => !v)}
          style={[styles.requestBanner, { backgroundColor: T.accentSoft }]}
        >
          <Overline T={T} color="accentInk">
            {`${requestsCount} pending request${requestsCount === 1 ? '' : 's'}`}
          </Overline>
          <Text style={[typography.caption, { color: T.accentInk, fontWeight: '700' }]}>
            {showPending ? 'Hide' : 'View'}
          </Text>
        </Pressable>
      ) : null}

      {isLoading ? (
        <LoadingOverlay T={T} caption="LOADING ·" />
      ) : error ? (
        <View style={styles.fill}>
          <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {showPending && requests && requests.length > 0
            ? requests.map((req) => (
                <View
                  key={req.id}
                  style={[styles.row, { backgroundColor: T.bgElevated, borderColor: T.hair }]}
                >
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
            : null}

          <View style={styles.filterRow}>
            <FilterChipRowMulti
              T={T}
              chips={typeChips}
              selected={typeFilter}
              onChange={setTypeFilter}
            />
          </View>

          {visibleFriends.length === 0 ? (
            <View style={styles.emptyContent}>
              <EmptyFriends
                T={T}
                firstRun={firstRun}
                onAdd={() => navigation.navigate('AddFriend')}
              />
            </View>
          ) : (
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
          )}
        </ScrollView>
      )}
    </View>
  );

  // ─── Header / FAB derived from the active segment ─────────────────────────
  const segId = SEGMENTS[index]?.id ?? 'friends';
  const headerTitle =
    segId === 'groups'
      ? `Groups · ${groupsCount}`
      : segId === 'messages'
        ? 'Messages'
        : `Friends · ${friendsCount}`;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader
        T={T}
        title={headerTitle}
        right={
          segId === 'friends' ? (
            <PillBtn
              T={T}
              label="Types"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('FriendTypesManager')}
            />
          ) : undefined
        }
      />

      <View style={styles.segRow}>
        <SegmentedSwitcher
          T={T}
          options={SEGMENTS}
          value={segId}
          onChange={setSegmentById}
        />
      </View>

      <SegmentCarousel index={index} onIndexChange={setIndex}>
        {[
          friendsPane,
          <GroupsPane
            key="groups"
            T={T}
            onOpenGroup={(groupId) => navigation.navigate('GroupDetail', { groupId })}
            onCreateGroup={() => navigation.navigate('CreateGroup')}
          />,
          <InboxPane key="messages" T={T} onOpenConversation={openConversation} />,
        ]}
      </SegmentCarousel>

      {segId === 'friends' ? (
        <View style={styles.fab}>
          <PillBtn
            T={T}
            label="+ Add"
            variant="primary"
            size="md"
            onPress={() => navigation.navigate('AddFriend')}
          />
        </View>
      ) : null}
      {segId === 'groups' ? (
        <View style={styles.fab}>
          <PillBtn
            T={T}
            label="+ New"
            variant="primary"
            size="md"
            onPress={() => navigation.navigate('CreateGroup')}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Union multi-select over the filter chips. The pinned BFF chip matches
 * `category === 'bff'`; FriendType chips match `friendTypes`. No selection →
 * every friend.
 */
function filterFriends(friends: Friend[], selected: string[]): Friend[] {
  if (selected.length === 0) return friends;
  const bff = selected.includes(BFF_CHIP);
  const typeSet = new Set(selected.filter((s) => s !== BFF_CHIP));
  return friends.filter(
    (f) =>
      (bff && f.category === 'bff') ||
      (typeSet.size > 0 && f.friendTypes.some((t) => typeSet.has(t))),
  );
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
    marginTop: spacing.sm,
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

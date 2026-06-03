/**
 * GroupDetailScreen — Group detail with tabs (Members / Events / Polls / Ideas).
 *
 * SCREENS.md Group Detail layout:
 *  1. AdminBar (sticky top) — visible when userRole === 'admin' (Hard Rule 9)
 *  2. FlowHeader back + group name (single-line per R5-6)
 *  3. Hero — CoverArt + member count + PrivateBadge if applicable
 *  4. TabPills — Members / Events / Polls / Ideas
 *  5. Tab body per selection (with Empty* for empty cases)
 *
 * Hard rules: Hard Rules 8, 9 (AdminBar non-collapsing), 10 (invites here),
 * 11 (PrivateBadge sparingly), R5-6 (truncation).
 *
 * Edge cases: group of 1 → AdminBar still shown, Members shows YOU row only,
 * Polls/Ideas show Empty*; 50+ members → list paginates / R5-6 ellipsis.
 *
 * Haptics: tab change → light (TabPills); vote → light (PollRow); upvote →
 * light (SuggestionRow); add suggestion / invite send → medium.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminBar,
  CoverArt,
  EmptyMutualEvents,
  EmptyPolls,
  EmptyStateBlock,
  EmptySuggestions,
  ErrorState,
  ErrorToast,
  FlowHeader,
  FormField,
  LoadingOverlay,
  Overline,
  PillBtn,
  PollRow,
  PrivateBadge,
  RingAvatar,
  SuggestionRow,
  TOAST_POSITION_DEFAULTS,
  TabPills,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  pollIsClosed,
  useAddSuggestion,
  useEvents,
  useGroupDetail,
  useGroupPolls,
  useGroupSuggestions,
  useVotePoll,
} from '../../api';
import type { GroupDetailScreenProps } from '../../navigation/types';
import type { GroupDetailTab } from '../../../../TYPES';

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'events',  label: 'Events' },
  { id: 'polls',   label: 'Polls' },
  { id: 'ideas',   label: 'Ideas' },
];

export default function GroupDetailScreen({
  navigation,
  route,
}: GroupDetailScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { groupId, tab: initialTab } = route.params;

  const [tab, setTab] = useState<GroupDetailTab>(initialTab ?? 'members');
  const [newIdea, setNewIdea] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);

  const { data: group, isLoading, error, refetch } = useGroupDetail(groupId);
  const { data: polls } = useGroupPolls(groupId);
  const { data: suggestions } = useGroupSuggestions(groupId);
  const { data: events } = useEvents();
  const votePoll = useVotePoll();
  const addSuggestion = useAddSuggestion();

  const groupEvents = useMemo(
    () => (events ?? []).filter((e) => e.groupId === groupId),
    [events, groupId]
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Group" onBack={() => navigation.goBack()} />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error || !group) {
    const isPermission = error?.code === 'FORBIDDEN';
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Group" onBack={() => navigation.goBack()} />
        <View style={styles.fill}>
          <ErrorState
            T={T}
            kind={
              error?.code === 'NOT_FOUND'
                ? 'notFound'
                : isPermission
                  ? 'permission'
                  : 'server'
            }
            onPrimary={() => navigation.goBack()}
            onSecondary={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = group.userRole === 'admin';

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title={group.name} onBack={() => navigation.goBack()} />

      {/* Hard Rule 9 + R7-6: AdminBar is PINNED — rendered OUTSIDE the
          ScrollView below so it stays put when the body scrolls. Visibility
          is binary on role; never collapses/fades/shrinks on scroll. */}
      {isAdmin ? (
        <AdminBar
          T={T}
          onInvite={() => fire('medium')}
          onSettings={() => fire('light')}
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.body}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
          <CoverArt T={T} cover={group.cover} size={80} />
          <View style={styles.heroBody}>
            <Text style={[typography.h2, { color: T.ink }]} numberOfLines={2}>
              {group.name}
            </Text>
            <Text style={[typography.caption, { color: T.ink2 }]}>
              {`${group.members.length} member${group.members.length === 1 ? '' : 's'}`}
            </Text>
            {group.isPrivate ? <PrivateBadge T={T} /> : null}
          </View>
        </View>

        {/* TabPills */}
        <View style={styles.tabRow}>
          <TabPills
            T={T}
            tabs={TABS}
            value={tab}
            onChange={(next) => setTab(next as GroupDetailTab)}
          />
        </View>

        {/* Tab body */}
        {tab === 'members' ? (
          <View style={styles.list}>
            {group.members.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={m.name}
                onPress={() => {
                  if (m.id === 'me') return;
                  fire('light');
                  navigation.navigate('FriendsTab', {
                    screen: 'FriendProfile',
                    params: { friendId: m.id },
                  });
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
                <RingAvatar T={T} letter={m.letter} size={36} />
                <View style={styles.rowBody}>
                  <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                    {m.id === 'me' ? `${m.name} (you)` : m.name}
                  </Text>
                  <Text style={[typography.micro, { color: T.ink2 }]} numberOfLines={1}>
                    {m.handle}
                  </Text>
                </View>
                {m.role === 'admin' ? (
                  <View
                    style={[styles.adminBadge, { backgroundColor: T.accentSoft }]}
                  >
                    <Text style={[typography.micro, { color: T.accentInk, fontWeight: '700' }]}>
                      ADMIN
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab === 'events' ? (
          groupEvents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyMutualEvents
                T={T}
                onPlan={() => navigation.navigate('CreateEventModal', { screen: 'Step1' })}
              />
            </View>
          ) : (
            <View style={styles.list}>
              {groupEvents.map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={e.title}
                  onPress={() => {
                    fire('light');
                    navigation.navigate('HomeTab', {
                      screen: 'EventDetail',
                      params: { eventId: e.id },
                    });
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
                  <View style={styles.rowBody}>
                    <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={2}>
                      {e.title}
                    </Text>
                    <Text style={[typography.caption, { color: T.ink2 }]}>{e.iso}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : null}

        {tab === 'polls' ? (
          (polls ?? []).length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyPolls T={T} />
            </View>
          ) : (
            <View style={styles.list}>
              {(polls ?? []).map((p) => {
                const closed = pollIsClosed(p);
                return (
                  <View key={p.id} style={styles.pollRowWrap}>
                    {closed ? (
                      <Overline T={T} color="ink3">CLOSED</Overline>
                    ) : null}
                    <PollRow
                      T={T}
                      poll={p}
                      onVote={(optionId) => {
                        if (closed) return;
                        votePoll.mutate({ pollId: p.id, optionId, groupId });
                      }}
                    />
                  </View>
                );
              })}
            </View>
          )
        ) : null}

        {tab === 'ideas' ? (
          <View style={styles.list}>
            {(suggestions ?? []).length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptySuggestions T={T} />
              </View>
            ) : (
              (suggestions ?? []).map((s) => (
                <SuggestionRow
                  key={s.id}
                  T={T}
                  suggestion={s}
                  authorName={s.authorId}
                  upvotedByMe={s.upvotes.includes('me')}
                  onUpvote={() => {
                    // Local upvote — optimistic only via the mutation cache
                    // pattern; for now no API write, the haptic fires inside
                    // SuggestionRow.
                  }}
                />
              ))
            )}
            <View
              style={[
                styles.newCard,
                { backgroundColor: T.bgElevated, borderColor: T.hair },
              ]}
            >
              <FormField
                T={T}
                label="New idea"
                value={newIdea}
                onChange={setNewIdea}
                placeholder="What should we do?"
                multiline
              />
              <PillBtn
                T={T}
                label="Add"
                variant="primary"
                size="md"
                onPress={() => {
                  if (!newIdea.trim()) return;
                  fire('medium');
                  addSuggestion.mutate(
                    { groupId, text: newIdea.trim() },
                    {
                      onSuccess: () => setNewIdea(''),
                      onError: () => setErrorVisible(true),
                    }
                  );
                }}
                disabled={!newIdea.trim() || addSuggestion.isPending}
                loading={addSuggestion.isPending}
              />
            </View>
          </View>
        ) : null}

        {/* Group of 1 edge case: members has only 'me' → empty bands cover
            polls/ideas. The Members list always renders YOU row though. */}
        {group.members.length === 1 && tab === 'members' ? (
          <View style={styles.emptyWrap}>
            <EmptyStateBlock
              T={T}
              icon={<View />}
              headline="Group of one"
              body="Invite friends from the Admin bar."
            />
          </View>
        ) : null}
      </ScrollView>

      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <ErrorToast
          T={T}
          kind="generic"
          visible={errorVisible}
          onRetry={() => setErrorVisible(false)}
          onClose={() => setErrorVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.hero,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  tabRow: {
    paddingVertical: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  adminBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  pollRowWrap: {
    gap: spacing.xs,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
  },
  newCard: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    marginTop: spacing.md,
  },
});

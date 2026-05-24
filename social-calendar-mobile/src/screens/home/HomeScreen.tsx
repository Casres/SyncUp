/**
 * HomeScreen — Home / Calendar feed.
 *
 * SCREENS.md Home/Calendar layout:
 *  1. OfflineBar slot (R5-7 triple)
 *  2. FlowHeader (title varies by view)
 *  3. Cached overline (when offline)
 *  4. View switcher (TabPills): Today / Week / Month
 *  5. FilterChipRow for event type filtering
 *  6. Body — StaggerList of EventCard rows; "+" FAB → opens CreateEventModal
 *
 * NotifSheet entry points (GAP 6):
 *  - Bell icon in FlowHeader right slot — tap → openFull(). Unread dot
 *    when any item is unread.
 *    // TODO: Replace with ActivityTab press once tab order is reconciled
 *    // with ANCHOR R6-6.
 *  - Pull-from-Home gesture (Phase A · R13-1) — downward pan when the
 *    ScrollView is at top: < 60px → spring back; 60-159px → peek;
 *    ≥ 160px → full. Velocity ≥ 0.5 px/ms → full directly.
 *
 * State pattern:
 *  - server data via `useEvents()` (React Query)
 *  - UI-only state (active view, filter chip) via `useState`
 *  - offline flag is hard-coded false for the stub phase
 *
 * Hard rules: R5-2 (Spinner only), R5-7 (offline triple), Hard Rule 2 (44pt),
 * R5-6 (long-text truncation in EventCard).
 */
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  EmptyHome,
  ErrorState,
  EventCard,
  FilterChipRow,
  FlowHeader,
  LoadingOverlay,
  OfflineBar,
  Overline,
  PillBtn,
  StaggerList,
  TabPills,
  type FilterChip,
} from '../../components';
import { useNotifSheet } from '../../components/notifications';
import { SearchOverlay } from '../../components/social/SearchOverlay';
import { useSearch } from '../../components/social/SearchContext';
import { colors, spacing, useHaptic } from '../../theme';
import { useEvents, useNotifications } from '../../api';
import { useIsFirstRun } from '../auth/onboarding/useIsFirstRun';
import type { HomeScreenProps } from '../../navigation/types';
import type { Event } from '../../../../TYPES';

type HomeView = 'today' | 'week' | 'month';

const VIEW_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'Week' },
  { id: 'month', label: 'Month' },
];

const TYPE_FILTERS: FilterChip[] = [
  { id: 'all',     label: 'All' },
  { id: 'social',  label: 'Social' },
  { id: 'work',    label: 'Work' },
  { id: 'fitness', label: 'Fitness' },
];

const TITLE_BY_VIEW: Record<HomeView, string> = {
  today: 'Today',
  week:  'This week',
  month: 'This month',
};

// Phase A thresholds — ANCHOR R13-1.
const PHASE_A_VELOCITY_TO_FULL = 0.5;   // px/ms downward
const PHASE_A_NO_OPEN_PX = 60;
const PHASE_A_FULL_PX = 160;

export default function HomeScreen({ navigation }: HomeScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const firstRun = useIsFirstRun();
  const { translateY, screenHeight, openPeek, openFull, dismiss } = useNotifSheet();
  const { open: searchOpen, openSearch, closeSearch } = useSearch();
  const { data: notifications } = useNotifications();

  const [view, setView] = useState<HomeView>('today');
  const [filter, setFilter] = useState<string>('all');
  // Stub-phase: offline flag is hard-coded false. Real wiring lands later.
  const isOffline = false;

  const { data: events, isLoading, error, refetch } = useEvents();

  const visibleEvents = useMemo(
    () => filterByView(events ?? [], view),
    [events, view]
  );

  const hasUnread = useMemo(
    () => (notifications ?? []).some((n) => !n.read),
    [notifications],
  );

  // Phase A pull-from-home gesture.
  // The pan only activates after 8px of downward drag, so the ScrollView
  // owns "in-list" gestures. When the list is at top (atTop === true),
  // the pan starts driving the sheet's translateY 1:1.
  const closedY = screenHeight;
  const atTop = useSharedValue(true);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    atTop.value = e.nativeEvent.contentOffset.y <= 0;
  }

  // R13-1: snap haptic fires when the snap visually settles, not at pointer
  // up. The shared provider exposes `onSettled` on each open/close so the
  // haptic is dispatched from the spring/timing completion callback.
  function snapPhaseA(target: 'closed' | 'peek' | 'full') {
    const onSettled = () => fire('light');
    if (target === 'closed') dismiss(onSettled);
    else if (target === 'peek') openPeek(onSettled);
    else openFull(onSettled);
  }

  const phaseA = Gesture.Pan()
    .activeOffsetY([8, Number.POSITIVE_INFINITY])
    .onUpdate((e) => {
      'worklet';
      if (!atTop.value) return;
      if (e.translationY <= 0) return;
      // Sheet rises as finger drags down (1:1).
      const next = closedY - e.translationY;
      translateY.value = next < 0 ? 0 : next;
    })
    .onEnd((e) => {
      'worklet';
      if (!atTop.value) {
        // ScrollView claimed the gesture — leave sheet alone.
        return;
      }
      const v = e.velocityY / 1000; // px/ms
      const dy = e.translationY;

      let target: 'closed' | 'peek' | 'full';
      if (v >= PHASE_A_VELOCITY_TO_FULL) {
        target = 'full';
      } else if (dy < PHASE_A_NO_OPEN_PX) {
        target = 'closed';
      } else if (dy < PHASE_A_FULL_PX) {
        target = 'peek';
      } else {
        target = 'full';
      }
      runOnJS(snapPhaseA)(target);
    });

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader
        T={T}
        title={TITLE_BY_VIEW[view]}
        right={
          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              hitSlop={8}
              onPress={() => {
                // openSearch fires a light haptic internally.
                openSearch();
              }}
              style={styles.bellWrap}
            >
              <Ionicons name="search" size={22} color={T.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={hasUnread ? 'Activity (unread)' : 'Activity'}
              hitSlop={8}
              onPress={() => {
                fire('light');
                openFull();
              }}
              style={styles.bellWrap}
            >
              <Ionicons
                name={hasUnread ? 'notifications' : 'notifications-outline'}
                size={22}
                color={T.ink}
              />
              {hasUnread ? (
                <View style={[styles.unreadDot, { backgroundColor: T.accent }]} />
              ) : null}
            </Pressable>
            <PillBtn
              T={T}
              label="+ New"
              size="sm"
              onPress={() => {
                fire('light');
                navigation.navigate('CreateEventModal', { screen: 'Step1' });
              }}
            />
          </View>
        }
      />
      <OfflineBar T={T} visible={isOffline} />
      {isOffline ? (
        <View style={styles.cachedRow}>
          <Overline T={T} color="ink3">LAST SYNCED · 4M AGO</Overline>
        </View>
      ) : null}
      <View style={styles.tabRow}>
        <TabPills
          T={T}
          tabs={VIEW_TABS}
          value={view}
          onChange={(next) => setView(next as HomeView)}
        />
      </View>
      <View style={styles.filterRow}>
        <FilterChipRow
          T={T}
          chips={TYPE_FILTERS}
          selected={filter}
          onChange={setFilter}
        />
      </View>

      <GestureDetector gesture={phaseA}>
        <View style={styles.fill}>
          {isLoading ? (
            <View style={styles.fill}>
              <LoadingOverlay T={T} caption="LOADING ·" />
            </View>
          ) : error ? (
            <View style={styles.fill}>
              <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
            </View>
          ) : visibleEvents.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContent}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              <EmptyHome
                T={T}
                variant={view}
                firstRun={firstRun}
                onPlan={() => {
                  fire('light');
                  navigation.navigate('CreateEventModal', { screen: 'Step1' });
                }}
              />
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              <StaggerList>
                {visibleEvents.map((evt) => (
                  <View key={evt.id} style={styles.cardWrap}>
                    <EventCard
                      T={T}
                      event={evt}
                      myRsvp={evt.rsvps.me}
                      onPress={() => {
                        fire('light');
                        navigation.navigate('HomeTab', {
                          screen: 'EventDetail',
                          params: { eventId: evt.id },
                        });
                      }}
                    />
                  </View>
                ))}
              </StaggerList>
            </ScrollView>
          )}
        </View>
      </GestureDetector>

      {/* SearchOverlay — full-screen transient overlay (R8-1), mounted as a
          SafeAreaView sibling so it sits above the screen body without
          replacing the route. Navigation callbacks wire to React Navigation. */}
      <SearchOverlay
        T={T}
        open={searchOpen}
        onClose={closeSearch}
        onNavigateToFriendProfile={(friendId) => {
          closeSearch();
          navigation.navigate('FriendsTab', {
            screen: 'FriendProfile',
            params: { friendId },
          });
        }}
        onNavigateToGroupDetail={(groupId) => {
          closeSearch();
          navigation.navigate('GroupsTab', {
            screen: 'GroupDetail',
            params: { groupId },
          });
        }}
        onNavigateToEventDetail={(eventId) => {
          closeSearch();
          navigation.navigate('HomeTab', {
            screen: 'EventDetail',
            params: { eventId },
          });
        }}
      />
    </SafeAreaView>
  );
}

/**
 * Filter the events list to the chosen view window.
 *
 * Today → events whose `iso` matches today's date.
 * Week  → next 7 days inclusive of today.
 * Month → next 31 days inclusive of today.
 */
function filterByView(events: Event[], view: HomeView): Event[] {
  const today = todayIso();
  if (view === 'today') {
    return events.filter((e) => e.iso === today);
  }
  const todayDate = new Date(today + 'T00:00:00');
  const horizon = new Date(todayDate);
  horizon.setDate(horizon.getDate() + (view === 'week' ? 7 : 31));
  return events.filter((e) => {
    const d = new Date(e.iso + 'T00:00:00');
    return d >= todayDate && d <= horizon;
  });
}

function todayIso(): string {
  const d = new Date();
  return d.toISOString().split('T')[0]!;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  cachedRow: {
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
  },
  tabRow: {
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
  },
  filterRow: {
    paddingVertical: spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  cardWrap: {
    marginBottom: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

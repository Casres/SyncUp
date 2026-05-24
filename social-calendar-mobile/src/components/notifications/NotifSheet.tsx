/**
 * NotifSheet — root-level notification overlay (Round 6).
 *
 * Mounted ONCE inside RootNavigator (above the tab tree), driven by
 * NotifSheetProvider. Renders nothing while detent === 'closed', otherwise
 * shows the backdrop and sheet at the active detent.
 *
 * SCOPE in this file:
 *   - Backdrop with opacity tied to translateY position.
 *   - Sheet container with translateY animated by the provider.
 *   - Phase B drag gesture on the grab-handle (R13-1 inter-detent).
 *   - Header (Activity title + Mark all read + Clear all).
 *   - Offline state (R13-2: OfflineBar + "SYNCED N AGO" + disabled CTAs).
 *   - Day-grouped feed (R6-7) with 30-day purge (R7-4).
 *   - Reduced-motion fallback for the snap animation.
 *   - Imperative navigation from cards via navigationRef (R12-1).
 *
 * Phase A entry (closed → peek/full from a downward pull on Home) is wired
 * separately in HomeScreen — this component only handles inter-detent.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { A11yLive } from '../polish/A11yLive';
import { OfflineBar } from '../polish/OfflineBar';
import { Spinner } from '../polish/Spinner';
import { StaggerList } from '../polish/StaggerList';
import { PillBtn } from '../foundation/PillBtn';
import { colors, durations, easings, radii, spacing, springs, typography, useHaptic } from '../../theme';
import { queryKeys, useNotifications } from '../../api';
import type {
  CoHostNotif,
  CoHostRevokedNotif,
  EventReminderNotif,
  FriendRequestNotif,
  GroupActivityNotif,
  GroupInviteNotif,
  InboundBroadcastNotif,
  Notif,
  RsvpNotif,
} from '../../../../TYPES';
import { navigationRef } from '../../navigation/navigationRef';

import { CoHostCard } from './CoHostCard';
import { CoHostRevokedCard } from './CoHostRevokedCard';
import { EventReminderCard } from './EventReminderCard';
import { FriendRequestCard } from './FriendRequestCard';
import { GroupActivityCard } from './GroupActivityCard';
import { GroupInviteCard } from './GroupInviteCard';
import { InboundBroadcastCard } from './InboundBroadcastCard';
import { NotifGroupHeader } from './NotifGroupHeader';
import { RsvpCard } from './RsvpCard';
import { groupByDay } from './dayGroup';
import { formatRelative } from './relativeTime';
import {
  FULL_DETENT,
  PEEK_DETENT,
  useNotifSheet,
} from './NotifSheetContext';

type Theme = typeof colors.light;

// Per ANCHOR R13-1 PHASE B velocity table — values are in px/ms.
const V_DOWN_FROM_FULL_TO_PEEK = 0.7;
const V_DOWN_FROM_FULL_TO_CLOSE = 1.2;
const V_DOWN_FROM_PEEK_TO_CLOSE = 0.7;
const V_UP_FROM_PEEK_TO_FULL = 0.7;
// Displacement fallback thresholds (px).
const DISP_PEEK_DOWN = 40;
const DISP_PEEK_UP = 40;
const DISP_FULL_DOWN_TO_PEEK = 80;
const DISP_FULL_DOWN_TO_CLOSE = 200;
// Rubber-band cap for upward drag past full (px).
const RUBBER_BAND_PX = 12;

export interface NotifSheetProps {
  T?: Theme;
  /**
   * Hard-coded for now — wire to real connectivity state when available.
   * Drives R13-2 offline behavior.
   */
  offline?: boolean;
  /**
   * Last successful sync timestamp (ISO). Drives "SYNCED N AGO" sub-line.
   * Optional — omitted when no sync has happened yet.
   */
  lastSyncedAt?: string;
}

interface SnapTargets {
  closedY: number;
  peekY: number;
  fullY: number;
}

export function NotifSheet({
  T = colors.light,
  offline = false,
  lastSyncedAt,
}: NotifSheetProps): React.JSX.Element {
  const fire = useHaptic();
  const sheet = useNotifSheet();
  const queryClient = useQueryClient();
  const {
    translateY,
    backdropOpacity,
    screenHeight,
    detent,
    dismiss,
    openPeek,
    openFull,
  } = sheet;
  // ANCHOR R13-2 — on offline → online transition, invalidate the notifications
  // query so the stale feed auto-refreshes via React Query (state-management
  // rule: API data lives in React Query, never copied elsewhere). Using a ref
  // for the prior value keeps this effect transition-aware without churn.
  const wasOfflineRef = useRef(offline);
  useEffect(() => {
    if (wasOfflineRef.current && !offline) {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    }
    wasOfflineRef.current = offline;
  }, [offline, queryClient]);

  const targets: SnapTargets = useMemo(
    () => ({
      closedY: screenHeight,
      peekY: screenHeight * (1 - PEEK_DETENT),
      fullY: screenHeight * (1 - FULL_DETENT),
    }),
    [screenHeight],
  );

  const startY = useSharedValue(targets.closedY);

  const { data: notifications, isLoading } = useNotifications();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [allCleared, setAllCleared] = useState(false);
  const [clearedAnnouncement, setClearedAnnouncement] = useState(false);

  const visibleNotifs = useMemo<Notif[]>(() => {
    if (allCleared) return [];
    const base = notifications ?? [];
    return base
      .filter((n) => !dismissedIds.has(n.id))
      .map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
  }, [notifications, dismissedIds, readIds, allCleared]);

  const groups = useMemo(() => groupByDay(visibleNotifs), [visibleNotifs]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markDismissed = useCallback((id: string) => {
    setDismissedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  function markAllRead() {
    fire('success');
    if (!notifications) return;
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function clearAll() {
    fire('warning');
    setAllCleared(true);
    setClearedAnnouncement(true);
    // Reset announcement flag on next tick so a future "Clear all" re-announces.
    setTimeout(() => setClearedAnnouncement(false), 600);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Navigation (R12-1) — sheet dismisses concurrent with destination mount.
  // Each helper marks-read, fires haptic, dismisses, then routes via the
  // global navigationRef. Back from the destination returns to the tab root,
  // not to NotifSheet, because the sheet is not in the navigator stack.
  // ────────────────────────────────────────────────────────────────────────

  function navigateAfterDismiss(navigateFn: () => void) {
    // Sheet first, navigation second — but they happen in the same JS frame.
    // The 240ms close animation runs concurrent with the destination mounting.
    dismiss();
    if (navigationRef.isReady()) {
      navigateFn();
    }
  }

  function navEventDetail(eventId: string) {
    navigateAfterDismiss(() => {
      navigationRef.navigate('Tabs', {
        screen: 'HomeTab',
        params: { screen: 'EventDetail', params: { eventId } },
      });
    });
  }

  function navGroupDetail(groupId: string) {
    // SPEC-R12-NotifRouting: Friends tab activates and the SegmentedSwitcher
    // flips to Groups. Current navigator hides GroupsTab from TabBar but it
    // remains a real tab — navigate directly to it. Once the Friends/Groups
    // SegmentedSwitcher is unified into a single FriendsTab segment, swap
    // this to navigate('FriendsTab', { … }) with a `segment: 'groups'` param.
    navigateAfterDismiss(() => {
      navigationRef.navigate('Tabs', {
        screen: 'GroupsTab',
        params: { screen: 'GroupDetail', params: { groupId } },
      });
    });
  }

  function navFriendProfile(friendId: string) {
    navigateAfterDismiss(() => {
      navigationRef.navigate('Tabs', {
        screen: 'FriendsTab',
        params: { screen: 'FriendProfile', params: { friendId } },
      });
    });
  }

  function navCreateEvent(friendId: string) {
    // Modal opens over current tab — no tab switch required (SPEC-R12).
    navigateAfterDismiss(() => {
      navigationRef.navigate('CreateEventModal', {
        screen: 'Step1',
        params: { prefilledInviteeIds: [friendId] },
      });
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Phase B drag gesture (R13-1).
  // Velocity-first @ ≥0.7 px/ms; displacement fallback otherwise.
  // ────────────────────────────────────────────────────────────────────────

  // R13-1: haptic fires at the snap moment, NOT at pointer-up. We pass the
  // light-haptic firing to animateTo()'s `onSettled` callback so it lands when
  // the spring settles (or, under reduced-motion, when the 200ms easeOut
  // finishes). The withSpring/withTiming completion flag protects against
  // mid-animation interruption — partial settles won't double-fire.
  const fireSnapHaptic = useCallback(() => fire('light'), [fire]);
  function snapTo(target: 'closed' | 'peek' | 'full') {
    if (target === 'closed') dismiss(fireSnapHaptic);
    else if (target === 'peek') openPeek(fireSnapHaptic);
    else openFull(fireSnapHaptic);
  }

  const closedY = targets.closedY;
  const peekY = targets.peekY;
  const fullY = targets.fullY;
  const fullClampY = fullY - RUBBER_BAND_PX;

  const pan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = startY.value + e.translationY;
      // Clamp upper bound to fullY - rubber-band; lower bound to closedY.
      if (next < fullClampY) {
        translateY.value = fullClampY;
      } else if (next > closedY) {
        translateY.value = closedY;
      } else {
        translateY.value = next;
      }
    })
    .onEnd((e) => {
      'worklet';
      const v = e.velocityY / 1000; // px/ms
      const wasFromFull = Math.abs(startY.value - fullY) < 1;
      const wasFromPeek = Math.abs(startY.value - peekY) < 1;

      let target: 'closed' | 'peek' | 'full';

      if (Math.abs(v) >= V_DOWN_FROM_FULL_TO_PEEK) {
        // Velocity-first
        if (v > 0) {
          // downward
          if (wasFromFull && v >= V_DOWN_FROM_FULL_TO_CLOSE) target = 'closed';
          else if (wasFromFull) target = 'peek';
          else if (wasFromPeek && v >= V_DOWN_FROM_PEEK_TO_CLOSE) target = 'closed';
          else target = wasFromPeek ? 'closed' : 'peek';
        } else {
          // upward
          if (wasFromPeek && -v >= V_UP_FROM_PEEK_TO_FULL) target = 'full';
          else if (wasFromFull) target = 'full'; // rubber-band → spring back
          else target = wasFromPeek ? 'full' : 'peek';
        }
      } else {
        // Displacement fallback
        const dy = translateY.value - startY.value;
        if (wasFromFull) {
          if (dy > DISP_FULL_DOWN_TO_CLOSE) target = 'closed';
          else if (dy > DISP_FULL_DOWN_TO_PEEK) target = 'peek';
          else target = 'full';
        } else if (wasFromPeek) {
          if (dy > DISP_PEEK_DOWN) target = 'closed';
          else if (-dy > DISP_PEEK_UP) target = 'full';
          else target = 'peek';
        } else {
          target = 'closed';
        }
      }

      runOnJS(snapTo)(target);
    });

  // ────────────────────────────────────────────────────────────────────────
  // Animated styles — backdrop opacity & sheet translateY.
  // ────────────────────────────────────────────────────────────────────────

  const backdropStyle = useAnimatedStyle(() => {
    // R13-1 reduced-motion: backdrop opacity is driven directly by the
    // provider (instant set on the reduced-motion path; 280ms easeStd
    // crossfade otherwise) — no interpolation from translateY here, so the
    // reduced-motion "instant switch at release" requirement holds.
    return { opacity: backdropOpacity.value };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const isHidden = detent === 'closed';

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'auto'}
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable
          accessibilityLabel="Dismiss notifications"
          onPress={() => {
            fire('light');
            // Backdrop tap → use the same animation path as dismiss().
            // No need to re-fire haptic here; sheet position drives crossfade.
            dismiss();
          }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={isHidden ? 'none' : 'auto'}
        style={[
          styles.sheet,
          {
            backgroundColor: T.bgElevated,
            height: screenHeight * FULL_DETENT,
          },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.handleHit} accessibilityLabel="Drag to resize sheet">
            <View style={[styles.handle, { backgroundColor: T.bgSunken }]} />
          </View>
        </GestureDetector>

        <View style={[styles.header, { borderBottomColor: T.hair }]}>
          <Text style={[typography.h3, { color: T.ink, flex: 1 }]}>Activity</Text>
          <View style={styles.headerActions}>
            <PillBtn T={T} label="Mark all read" variant="ghost" size="sm" onPress={markAllRead} />
            <PillBtn T={T} label="Clear all" variant="ghost" size="sm" onPress={clearAll} />
          </View>
        </View>

        {offline ? (
          <View>
            <OfflineBar T={T} visible />
            {lastSyncedAt ? (
              <Text style={[typography.overline, styles.syncedLine, { color: T.ink3 }]}>
                {`SYNCED ${formatRelative(lastSyncedAt).toUpperCase()}`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {clearedAnnouncement ? <A11yLive message="Activity cleared" level="polite" /> : null}

        {isLoading && !notifications ? (
          <View style={styles.loadingFill}>
            <Spinner T={T} size="MD" />
          </View>
        ) : groups.length === 0 ? (
          <EmptyNotifications T={T} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <StaggerList>
              {groups.flatMap((group) => [
                <NotifGroupHeader key={`h-${group.label}`} T={T} label={group.label} />,
                ...group.items.map((n) =>
                  renderCard(n, {
                    T,
                    offline,
                    onRead: markRead,
                    onDismiss: markDismissed,
                    onMute: markDismissed,
                    onNavEvent: navEventDetail,
                    onNavGroup: navGroupDetail,
                    onNavFriend: navFriendProfile,
                    onNavCreate: navCreateEvent,
                  }),
                ),
              ])}
            </StaggerList>
          </ScrollView>
        )}
      </Animated.View>
    </>
  );
}

interface RenderCtx {
  T: Theme;
  offline: boolean;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onMute: (id: string) => void;
  onNavEvent: (eventId: string) => void;
  onNavGroup: (groupId: string) => void;
  onNavFriend: (friendId: string) => void;
  onNavCreate: (friendId: string, friendName: string) => void;
}

function renderCard(n: Notif, c: RenderCtx): React.ReactNode {
  const onRead = () => c.onRead(n.id);
  const onMute = () => c.onMute(n.id);
  const onDismiss = () => c.onDismiss(n.id);

  switch (n.type) {
    case 'rsvp':
      return (
        <RsvpCard
          key={n.id}
          T={c.T}
          notif={n as RsvpNotif}
          onNavigate={c.onNavEvent}
          onRead={onRead}
          onMute={onMute}
          onDismiss={onDismiss}
        />
      );
    case 'event_reminder':
      return (
        <EventReminderCard
          key={n.id}
          T={c.T}
          notif={n as EventReminderNotif}
          onNavigate={c.onNavEvent}
          onRead={onRead}
          onMute={onMute}
          onDismiss={onDismiss}
        />
      );
    case 'co_host':
      return (
        <CoHostCard
          key={n.id}
          T={c.T}
          notif={n as CoHostNotif}
          onNavigate={c.onNavEvent}
          onRead={onRead}
          onMute={onMute}
          onDismiss={onDismiss}
        />
      );
    case 'co_host_revoked':
      return (
        <CoHostRevokedCard
          key={n.id}
          T={c.T}
          notif={n as CoHostRevokedNotif}
          onRead={onRead}
          onMute={onMute}
          onDismiss={onDismiss}
        />
      );
    case 'group_activity':
      return (
        <GroupActivityCard
          key={n.id}
          T={c.T}
          notif={n as GroupActivityNotif}
          onNavigate={(groupId, _switchSegment) => c.onNavGroup(groupId)}
          onRead={onRead}
          onMute={onMute}
          onDismiss={onDismiss}
        />
      );
    case 'inbound_broadcast':
      return (
        <InboundBroadcastCard
          key={n.id}
          T={c.T}
          notif={n as InboundBroadcastNotif}
          offline={c.offline}
          onNavigateFriendProfile={c.onNavFriend}
          onNavigateCreateEvent={c.onNavCreate}
          onRead={onRead}
          onMute={onMute}
          onDismiss={onDismiss}
        />
      );
    case 'friend_request':
      return (
        <FriendRequestCard
          key={n.id}
          T={c.T}
          notif={n as FriendRequestNotif}
          offline={c.offline}
          onAccept={() => c.onRead(n.id)}
          onDecline={() => c.onDismiss(n.id)}
        />
      );
    case 'group_invite':
      return (
        <GroupInviteCard
          key={n.id}
          T={c.T}
          notif={n as GroupInviteNotif}
          offline={c.offline}
          onJoin={() => c.onRead(n.id)}
          onDecline={() => c.onDismiss(n.id)}
        />
      );
  }
}

interface EmptyProps {
  T: Theme;
}

function EmptyNotifications({ T }: EmptyProps): React.JSX.Element {
  return (
    <View style={styles.emptyFill}>
      <View style={[styles.emptyTile, { backgroundColor: T.bgSunken }]}>
        <Ionicons name="notifications-off-outline" size={28} color={T.ink3} />
      </View>
      <Text style={[typography.bodyMed, { color: T.ink2, marginTop: spacing.md }]}>
        No activity
      </Text>
    </View>
  );
}

// Reduced-motion path is implemented inside NotifSheetContext.animateTo().
// The constants below are wired to the same easing tokens for symmetry —
// preserving them so they remain easy to find next to the gesture math.
void durations;
void easings;
void springs;
void withSpring;
void withTiming;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleHit: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 44, // 44pt hit target per spec
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  syncedLine: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  scroll: {
    paddingBottom: spacing['4xl'],
  },
  loadingFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['4xl'],
  },
  emptyTile: {
    width: 56,
    height: 56,
    borderRadius: radii.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

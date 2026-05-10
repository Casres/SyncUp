/**
 * InboundBroadcastCard — broadcast received from a friend.
 *
 * Two tap targets:
 *   Row body         → onNavigateFriendProfile(actorId)  — light haptic (locked)
 *   "Plan something" → onNavigateCreateEvent(actorId, actorName) — medium haptic
 *
 * R6-3: receiving a broadcast NEVER fires a haptic — only user-initiated taps do.
 * R6-4: multiple broadcasts from the same sender within 60 min collapse into
 *       one card. The current build renders the single-card layout; stacking
 *       is stubbed below for the future Activity surface to wire.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RingAvatar } from '../foundation/RingAvatar';
import { PillBtn } from '../foundation/PillBtn';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { InboundBroadcastNotif } from '../../../../TYPES';

import { SwipeableRow } from './SwipeableRow';
import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface InboundBroadcastCardProps {
  T?: Theme;
  notif: InboundBroadcastNotif;
  /** Disable the "Plan something" CTA when offline (R13-2). */
  offline?: boolean;
  onNavigateFriendProfile: (friendId: string) => void;
  onNavigateCreateEvent: (friendId: string, friendName: string) => void;
  onRead: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
}

const STATE_LABEL: Record<InboundBroadcastNotif['state'], string> = {
  free: 'Free',
  maybe: 'Maybe',
  busy: 'Busy',
};

function dotColor(T: Theme, state: InboundBroadcastNotif['state']): string {
  if (state === 'free') return T.availFree;
  if (state === 'maybe') return T.availMaybe;
  return T.availBusy;
}

export function InboundBroadcastCard({
  T = colors.light,
  notif,
  offline = false,
  onNavigateFriendProfile,
  onNavigateCreateEvent,
  onRead,
  onMute,
  onDismiss,
}: InboundBroadcastCardProps): React.JSX.Element {
  const fire = useHaptic();

  function onPressBody() {
    onRead();
    fire('light'); // locked — body tap is light, not medium (SPEC-R12-NotifRouting)
    onNavigateFriendProfile(notif.actorId);
  }

  function onPlan() {
    onRead();
    fire('medium');
    onNavigateCreateEvent(notif.actorId, notif.actorName);
  }

  // R6-4: stack per sender — when multiple broadcasts from same sender
  // arrive within 60 min, the older ones collapse behind a "+N earlier"
  // springs-open pill. Stub note for the future Activity surface to wire.
  // Stacking logic belongs here once the feed shape exposes it.

  return (
    <SwipeableRow T={T} onMute={onMute} onDismiss={onDismiss}>
      <View style={[styles.row, { backgroundColor: T.bgElevated }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${notif.actorName} broadcast: ${notif.message}`}
          onPress={onPressBody}
          style={styles.bodyTap}
        >
          <RingAvatar T={T} letter={notif.actorInitial} size={40} />
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <View style={[styles.dot, { backgroundColor: dotColor(T, notif.state) }]} />
              <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
                {notif.actorName}
              </Text>
              <Text style={[typography.micro, { color: T.ink3 }]}>
                · {STATE_LABEL[notif.state]}
              </Text>
            </View>
            <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={2}>
              {notif.message}
            </Text>
            <Text style={[typography.caption, { color: T.ink3 }]}>
              {formatRelative(notif.createdAt)}
            </Text>
          </View>
        </Pressable>
        <View style={styles.actionRow}>
          <PillBtn
            T={T}
            label="Plan something"
            variant="primary"
            size="sm"
            onPress={onPlan}
            disabled={offline}
          />
        </View>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    minHeight: 64,
  },
  bodyTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: 52, // align under text body, not avatar
  },
});

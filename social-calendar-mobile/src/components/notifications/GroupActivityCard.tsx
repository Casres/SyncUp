/**
 * GroupActivityCard — "Climbing Crew · New poll: Saturday session…".
 *
 * Tap row → onNavigate(groupId, switchToGroupsSegment=true). Medium haptic.
 * Per SPEC-R12-NotifRouting: Friends tab activates and the
 * Friends/Groups SegmentedSwitcher flips to Groups before pushing
 * GroupDetail. The caller threads that switch flag.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { GroupActivityNotif } from '../../../../TYPES';

import { SwipeableRow } from './SwipeableRow';
import { formatRelative } from './relativeTime';

type Theme = typeof colors.light;

export interface GroupActivityCardProps {
  T?: Theme;
  notif: GroupActivityNotif;
  onNavigate: (groupId: string, switchToGroupsSegment: boolean) => void;
  onRead: () => void;
  onMute?: () => void;
  onDismiss?: () => void;
}

export function GroupActivityCard({
  T = colors.light,
  notif,
  onNavigate,
  onRead,
  onMute,
  onDismiss,
}: GroupActivityCardProps): React.JSX.Element {
  const fire = useHaptic();

  function onPress() {
    onRead();
    fire('medium');
    onNavigate(notif.groupId, true);
  }

  return (
    <SwipeableRow T={T} onMute={onMute} onDismiss={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${notif.groupName}: ${notif.summary}`}
        onPress={onPress}
        style={[styles.row, { backgroundColor: T.bgElevated }]}
      >
        <View style={[styles.tile, { backgroundColor: T.bgSunken }]}>
          <Text
            style={{
              color: T.ink,
              fontWeight: '700',
              fontSize: 16,
            }}
          >
            {notif.groupInitial}
          </Text>
        </View>
        <View style={styles.body}>
          <Text style={[typography.bodyMed, { color: T.ink }]} numberOfLines={1}>
            {notif.groupName}
          </Text>
          <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={2}>
            {notif.summary}
          </Text>
          <Text style={[typography.caption, { color: T.ink3 }]}>
            {formatRelative(notif.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={T.ink3} />
      </Pressable>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});

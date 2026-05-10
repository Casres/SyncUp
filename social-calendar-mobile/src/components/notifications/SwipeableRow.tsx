/**
 * SwipeableRow — wraps a notification card with left-swipe-to-reveal Mute + Dismiss.
 *
 * Used by every navigating / informational card. NOT used by FriendRequestCard
 * or GroupInviteCard, which expose in-place pills and would otherwise have
 * conflicting tap targets.
 *
 * Haptics:
 *   Mute    → light    (matches "tap to mute" affordance level)
 *   Dismiss → warning  (destructive feel; consistent with "Clear all" warning)
 */

import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { colors, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface SwipeableRowProps {
  T?: Theme;
  children: React.ReactNode;
  onMute?: () => void;
  onDismiss?: () => void;
}

const ACTION_WIDTH = 88;

export function SwipeableRow({
  T = colors.light,
  children,
  onMute,
  onDismiss,
}: SwipeableRowProps): React.JSX.Element {
  const fire = useHaptic();
  const ref = useRef<Swipeable | null>(null);

  function close() {
    ref.current?.close();
  }

  function handleMute() {
    fire('light');
    onMute?.();
    close();
  }

  function handleDismiss() {
    fire('warning');
    onDismiss?.();
    close();
  }

  function renderRightActions() {
    return (
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mute"
          onPress={handleMute}
          style={[styles.action, { backgroundColor: T.bgSunken }]}
        >
          <Text style={[typography.bodyMed, { color: T.ink, fontWeight: '700' }]}>Mute</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={handleDismiss}
          style={[styles.action, { backgroundColor: T.danger }]}
        >
          <Text style={[typography.bodyMed, { color: T.bgElevated, fontWeight: '700' }]}>
            Dismiss
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});

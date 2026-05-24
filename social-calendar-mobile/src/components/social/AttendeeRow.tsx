/**
 * AttendeeRow — single attendee within AttendeesSheet (R10-7, R11-3, R11-4).
 *
 * Role-aware behavior:
 *   HOST view (not own row): trailing ⋯ btn + RSVPBadge. Right-swipe ≥44px
 *     OR menu "Remove from event" arms the row (TwoTapDestructive flow).
 *   HOST own row, CO-HOST view, INVITEE view: RSVPBadge only. No ⋯, no swipe.
 *   Co-host attendee: CoHostBadge renders inline after the name in all views (R11-3).
 *
 * Armed state visual (R10-4):
 *   Row bg → dangerSoft. "Remove" 13/600 popInk replaces the ⋯ btn.
 *   The full row is tappable to commit; second tap fires onCommit.
 *   Auto-cancel and a separate cancel onPress are owned by the parent
 *   (AttendeesSheet manages armedRowId + 4s timer).
 *
 * Tap targets and haptics summary (parent fires success on commit confirmation):
 *   Row body tap (not armed)         → onPress · light
 *   Row body tap (armed)             → onCommit · (parent fires success)
 *   ⋯ btn tap                        → opens RowOverflowMenu · light
 *   Right-swipe ≥44px                → onArm · heavy
 *   Right-swipe <44px (and moved>4)  → spring back · light
 */

import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, springs, typography, useHaptic } from '../../theme';
import { RingAvatar } from '../foundation/RingAvatar';
import { RSVPBadge } from '../notifications/RSVPBadge';
import type { AvailState, RSVPStatus } from '../../../../TYPES';

import { CoHostBadge } from './CoHostBadge';
import { RowOverflowMenu, type OverflowMenuItem } from './RowOverflowMenu';

type Theme = typeof colors.light;

export type AttendeeViewerRole = 'host' | 'co-host' | 'invitee';

export interface AttendeeRowData {
  id: string;
  name: string;
  handle: string;
  /** Single character for RingAvatar fallback. */
  letter: string;
  avatarUrl?: string | null;
  availState?: AvailState | null;
  rsvpStatus: RSVPStatus;
  isCoHost: boolean;
}

export interface AttendeeRowProps {
  T?: Theme;
  attendee: AttendeeRowData;
  viewerRole: AttendeeViewerRole;
  /** True when attendee.id === currentUserId — host's own row gets no ⋯. */
  isOwnRow: boolean;
  /** R15-3: true when this row is the event host (shows HOST chip). */
  isHost?: boolean;
  armed: boolean;
  onArm: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onMakeCoHost: () => void;
  onRemoveCoHost: () => void;
  /** R15-1: row body tap → QuickProfileSheet. No-op when isOwnRow. */
  onPress: () => void;
}

const ARM_THRESHOLD_PX = 44;
const SPRING_BACK_NUDGE_PX = 4;

export function AttendeeRow({
  T = colors.light,
  attendee,
  viewerRole,
  isOwnRow,
  isHost = false,
  armed,
  onArm,
  onCommit,
  onCancel,
  onMakeCoHost,
  onRemoveCoHost,
  onPress,
}: AttendeeRowProps): React.JSX.Element {
  const fire = useHaptic();
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | undefined>();
  const trailingBtnRef = useRef<View>(null);

  // Translation for the swipe gesture (host view only).
  const translateX = useSharedValue(0);

  const showOverflow = viewerRole === 'host' && !isOwnRow && !armed;
  const swipeEnabled = viewerRole === 'host' && !isOwnRow && !armed;

  function fireArm() {
    fire('heavy');
    onArm();
  }

  function fireSpringBack() {
    fire('light');
  }

  const swipe = Gesture.Pan()
    .enabled(swipeEnabled)
    .activeOffsetX([10, Number.POSITIVE_INFINITY])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      'worklet';
      // Only respond to rightward drag; clamp left.
      translateX.value = e.translationX > 0 ? e.translationX : 0;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX >= ARM_THRESHOLD_PX) {
        translateX.value = withSpring(0, springs.springSnappy);
        runOnJS(fireArm)();
      } else {
        const moved = e.translationX > SPRING_BACK_NUDGE_PX;
        translateX.value = withSpring(0, springs.springSnappy);
        if (moved) runOnJS(fireSpringBack)();
      }
    });

  const rowAStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function onOverflowLayout(_e: LayoutChangeEvent) {
    const node = trailingBtnRef.current;
    if (!node) return;
    node.measureInWindow((x, y, w) => {
      // Anchor the menu directly below the ⋯ button, right-aligned to it.
      // `right` is the screen-right offset (window width - btn right edge),
      // approximated below — we position via right inset using window width
      // measurement once available, falling back to a reasonable offset.
      setAnchor({ top: y + 28, right: Math.max(0, 16 + (w - 24)) });
    });
  }

  function openMenu() {
    fire('light');
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const overflowItems: OverflowMenuItem[] = attendee.isCoHost
    ? [
        {
          label: 'Remove co-host',
          icon: 'star',
          onPress: () => {
            closeMenu();
            onRemoveCoHost();
          },
        },
        {
          label: 'Remove from event',
          icon: 'person-remove-outline',
          destructive: true,
          onPress: () => {
            closeMenu();
            onArm();
            // Heavy haptic on arm — parent doesn't know whether arm came
            // from swipe or menu, so we fire it here to keep parity.
            fire('heavy');
          },
        },
      ]
    : [
        {
          label: 'Make co-host',
          icon: 'star-outline',
          onPress: () => {
            closeMenu();
            onMakeCoHost();
          },
        },
        {
          label: 'Remove from event',
          icon: 'person-remove-outline',
          destructive: true,
          onPress: () => {
            closeMenu();
            onArm();
            fire('heavy');
          },
        },
      ];

  function onRowPress() {
    if (armed) {
      onCommit();
      return;
    }
    // R15-1: self-row tap is a no-op — no haptic, no navigation.
    if (isOwnRow) return;
    fire('light');
    onPress();
  }

  return (
    <>
      <Animated.View
        style={[
          styles.row,
          {
            backgroundColor: armed ? T.dangerSoft : T.bgElevated,
            borderBottomColor: T.hair,
          },
          rowAStyle,
        ]}
      >
        <GestureDetector gesture={swipe}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              armed
                ? `Confirm remove ${attendee.name}`
                : `${attendee.name} ${attendee.handle}`
            }
            onPress={onRowPress}
            style={styles.tapBody}
          >
            <RingAvatar
              T={T}
              letter={attendee.letter}
              size={40}
              status={attendee.availState ?? null}
            />
            <View style={styles.center}>
              <View style={styles.nameRow}>
                <Text
                  style={[typography.body, { color: T.ink, fontWeight: '600', fontSize: 15 }]}
                  numberOfLines={1}
                >
                  {attendee.name}
                </Text>
                {attendee.isCoHost ? <CoHostBadge T={T} /> : null}
              </View>
              <Text
                style={[
                  styles.handle,
                  { color: T.ink3, fontFamily: fonts.mono },
                ]}
                numberOfLines={1}
              >
                {attendee.handle}
              </Text>
            </View>
          </Pressable>
        </GestureDetector>

        <View style={styles.trailing}>
          {/* R15-3: HOST chip appears right of center, left of RSVPBadge */}
          {isHost && !armed ? (
            <View style={[styles.hostChip, { backgroundColor: T.accentSoft }]}>
              <Text style={[styles.hostChipLabel, { color: T.accent, fontFamily: fonts.mono }]}>
                HOST
              </Text>
            </View>
          ) : null}
          {!armed ? <RSVPBadge T={T} status={attendee.rsvpStatus} /> : null}
          {armed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel remove"
              hitSlop={8}
              onPress={() => {
                fire('light');
                onCancel();
              }}
              style={styles.armedLabelBtn}
            >
              <Text
                style={[
                  styles.armedLabel,
                  { color: T.popInk },
                ]}
              >
                Remove
              </Text>
            </Pressable>
          ) : null}
          {showOverflow ? (
            <View ref={trailingBtnRef} onLayout={onOverflowLayout}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More actions"
                hitSlop={8}
                onPress={openMenu}
                style={styles.overflowBtn}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={T.ink3} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>

      {menuOpen ? (
        <RowOverflowMenu
          T={T}
          items={overflowItems}
          onClose={closeMenu}
          anchorPosition={anchor}
        />
      ) : null}
    </>
  );
}

// Re-export the menu item type for parent ergonomics.
export type { OverflowMenuItem };

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  tapBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  center: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  handle: {
    fontSize: 12,
    fontWeight: '500',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overflowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  armedLabelBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  armedLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  hostChip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  hostChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

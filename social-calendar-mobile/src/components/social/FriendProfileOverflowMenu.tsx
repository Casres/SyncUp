/**
 * FriendProfileOverflowMenu — Header overflow (⋯) menu for Friend Profile.
 *
 * Spec: R16-6. Three rows in escalation order:
 *   (a) "Remove friend"        — destructive, TwoTap (heavy → success)
 *   (b) "Block {firstName}"    — destructive, TwoTap (heavy → success)
 *   (c) "Report {firstName}"   — neutral,    TwoTap (light → success)
 *
 * Per-row TwoTapDestructive timing is implemented inline (not via the
 * shared TwoTapDestructive component, which is pill-shaped) so each row
 * can render as a standard menu row while still honoring Hard Rule 7 and
 * A-6 (≥600ms between arm and commit).
 *
 * Only one row may be armed at a time; arming a second row auto-disarms
 * the first. Backdrop tap or `onClose` resets all armed state.
 *
 * The menu stays open until a commit or an outside dismissal — matching
 * the spec language "Menu stays open until commit or dismiss."
 *
 * The caller fires the open haptic (light, on overflow icon tap) per H-3.
 * The menu does NOT fire on mount.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { HapticType } from '../../theme';

type Theme = typeof colors.light;

export interface FriendProfileOverflowMenuProps {
  T?: Theme;
  /** Friend's first name — used in "Block {firstName}" / "Report {firstName}". */
  friendFirstName: string;
  onRemoveConfirm: () => void;
  onBlockConfirm: () => void;
  onReportConfirm: () => void;
  /**
   * Called when the user dismisses the menu without committing — backdrop
   * tap, hardware back, or the Cancel row. Does NOT fire on commit (the
   * caller is responsible for closing the menu in their `on*Confirm`
   * handlers if needed).
   */
  onClose: () => void;
  /**
   * Screen-coordinate anchor (top + right edges in px). Defaults align with
   * the typical FlowHeader ⋯ button position.
   */
  anchorPosition?: { top: number; right: number };
}

const ARM_MIN_MS = 600;     // A-6 minimum between arm and commit.
const ARM_TIMEOUT_MS = 3000; // Auto-revert if no second tap.
const ENTRANCE_MS = 150;
const DEFAULT_ANCHOR = { top: 64, right: 16 };

type RowKey = 'remove' | 'block' | 'report';

interface RowDef {
  key: RowKey;
  label: string;
  armedLabel: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  destructive: boolean;
  armHaptic: HapticType;
  commitHaptic: HapticType;
  onConfirm: () => void;
}

export function FriendProfileOverflowMenu({
  T = colors.light,
  friendFirstName,
  onRemoveConfirm,
  onBlockConfirm,
  onReportConfirm,
  onClose,
  anchorPosition,
}: FriendProfileOverflowMenuProps): React.JSX.Element {
  const fire = useHaptic();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  // Entrance animation — matches RowOverflowMenu.
  useEffect(() => {
    opacity.value = withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.ease) });
  }, [opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // Arm state — only one row may be armed at a time.
  const [armedKey, setArmedKey] = useState<RowKey | null>(null);
  const armedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const disarm = (): void => {
    setArmedKey(null);
    armedAtRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const rows: RowDef[] = [
    {
      key: 'remove',
      label: 'Remove friend',
      armedLabel: 'Tap again to confirm',
      icon: 'person-remove-outline',
      destructive: true,
      armHaptic: 'heavy',
      commitHaptic: 'success',
      onConfirm: onRemoveConfirm,
    },
    {
      key: 'block',
      label: `Block ${friendFirstName}`,
      armedLabel: 'Tap again to confirm',
      icon: 'ban-outline',
      destructive: true,
      armHaptic: 'heavy',
      commitHaptic: 'success',
      onConfirm: onBlockConfirm,
    },
    {
      key: 'report',
      label: `Report ${friendFirstName}`,
      armedLabel: 'Tap again to report',
      icon: 'flag-outline',
      destructive: false,
      armHaptic: 'light',
      commitHaptic: 'success',
      onConfirm: onReportConfirm,
    },
  ];

  function handleRowPress(row: RowDef): void {
    if (armedKey !== row.key) {
      // Arming this row — also disarms whichever row was previously armed.
      fire(row.armHaptic);
      setArmedKey(row.key);
      armedAtRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(disarm, ARM_TIMEOUT_MS);
      return;
    }
    // Already armed — gate on the A-6 600ms minimum.
    const elapsed = Date.now() - armedAtRef.current;
    if (elapsed < ARM_MIN_MS) return;
    fire(row.commitHaptic);
    disarm();
    row.onConfirm();
  }

  function dismissOutside(): void {
    fire('light');
    disarm();
    onClose();
  }

  const anchor = anchorPosition ?? DEFAULT_ANCHOR;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel="Dismiss menu"
        onPress={dismissOutside}
      >
        <Animated.View
          accessibilityRole="menu"
          style={[
            styles.card,
            {
              backgroundColor: T.bgElevated,
              top: anchor.top,
              right: anchor.right,
            },
            cardStyle,
          ]}
        >
          {/* Inner Pressable swallows taps so they don't dismiss. */}
          <Pressable accessibilityRole="none" onPress={() => {}}>
            {rows.map((row, idx) => {
              const isArmed = armedKey === row.key;
              const showHairline = idx < rows.length - 1;
              const labelColor = row.destructive
                ? isArmed
                  ? T.bgElevated
                  : T.popInk
                : T.ink;
              const iconColor = row.destructive ? (isArmed ? T.bgElevated : T.danger) : T.ink;
              const rowBg = isArmed
                ? T.danger
                : 'transparent';

              return (
                <Pressable
                  key={row.key}
                  accessibilityRole="menuitem"
                  accessibilityLabel={isArmed ? row.armedLabel : row.label}
                  onPress={() => handleRowPress(row)}
                  style={({ pressed }) => [
                    styles.item,
                    {
                      backgroundColor: pressed && !isArmed ? T.bgSunken : rowBg,
                      borderBottomColor: T.hair,
                      borderBottomWidth: showHairline ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}
                >
                  <Ionicons name={row.icon} size={20} color={iconColor} />
                  <Text
                    style={[
                      typography.body,
                      {
                        color: labelColor,
                        fontSize: 15,
                        fontWeight: '500',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isArmed ? row.armedLabel : row.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Animated.View>
        {/* Hidden — keeps a11y tree clean. The View below is intentionally empty
            so the Pressable backdrop above remains the dismiss surface. */}
        <View accessibilityElementsHidden importantForAccessibility="no" />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    minWidth: 220,
    borderRadius: radii.input,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
});

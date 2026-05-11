/**
 * RowOverflowMenu — small floating menu anchored below-trailing of a ⋯ button.
 *
 * Spec (ANCHOR — Round 11 Components):
 *   radius 12 · bgElevated · shadow 0 8px 28px rgba(0,0,0,.18) ·
 *   max 3 items · 44px row · 15/500 · leading icon (20px) ·
 *   destructive item: popInk text + danger icon ·
 *   tap outside / Esc → onClose (light haptic) ·
 *   animation: opacity 0→1 + scale 0.95→1 · 150ms easeOut.
 *
 * Implementation notes:
 *   - Renders inside a transparent <Modal> so it floats over any sheet body.
 *   - Backdrop is a full-screen Pressable that fires the dismiss haptic.
 *   - The caller fires the open haptic; the menu does NOT fire on mount (H-3).
 */

import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface OverflowMenuItem {
  label: string;
  /** Ionicons name — see @expo/vector-icons Ionicons reference. */
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Renders the item in popInk with a danger-tinted icon. */
  destructive?: boolean;
}

export interface RowOverflowMenuProps {
  T?: Theme;
  items: OverflowMenuItem[];
  onClose: () => void;
  /**
   * Screen-coordinate anchor (top + right edges in px). Computed by the
   * caller from a ref.measure() on the ⋯ button after onLayout. Defaults
   * to a sensible top-right position when undefined.
   */
  anchorPosition?: { top: number; right: number };
}

const DEFAULT_ANCHOR = { top: 120, right: 16 };
const ENTRANCE_MS = 150;

export function RowOverflowMenu({
  T = colors.light,
  items,
  onClose,
  anchorPosition,
}: RowOverflowMenuProps): React.JSX.Element {
  const fire = useHaptic();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: ENTRANCE_MS,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withTiming(1, {
      duration: ENTRANCE_MS,
      easing: Easing.out(Easing.ease),
    });
  }, [opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const anchor = anchorPosition ?? DEFAULT_ANCHOR;

  function dismissOutside() {
    fire('light');
    onClose();
  }

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
          // The card itself shouldn't trigger the backdrop dismiss when tapped;
          // wrap content in a Pressable that swallows the press.
        >
          <Pressable accessibilityRole="none" onPress={() => {}}>
            {items.map((item, idx) => (
              <Pressable
                key={`${item.label}-${idx}`}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: pressed ? T.bgSunken : 'transparent',
                    borderBottomColor: T.hair,
                    borderBottomWidth: idx < items.length - 1 ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.destructive ? T.danger : T.ink}
                />
                <Text
                  style={[
                    typography.body,
                    {
                      color: item.destructive ? T.popInk : T.ink,
                      fontSize: 15,
                      fontWeight: '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    minWidth: 200,
    borderRadius: radii.input,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
});

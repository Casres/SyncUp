/**
 * TwoTapDestructive — Two-step destructive action (arm → confirm).
 *
 * Hard Rule 7: the ONLY destructive pattern. No modals.
 * A-6: minimum 600ms window between arm and commit.
 * H-4: heavy haptic on arm; success haptic on commit.
 *
 * Behavior:
 *   Tap 1 (Arm):    Button shifts to destructive visual. Fires `heavy`. The
 *                   commit window opens after 600ms (A-6). Auto-reverts after
 *                   3 seconds total if no second tap.
 *   Tap 2 (Commit): Only counted once 600ms has elapsed since arm. Fires
 *                   `success`. Calls `onConfirm`. Resets to default.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface TwoTapDestructiveProps {
  T?: Theme;
  label: string;
  /** Label shown after the first tap (armed state). */
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}

const ARM_MIN_MS = 600;     // A-6 minimum between arm and commit
const ARM_TIMEOUT_MS = 3000; // auto-revert if no second tap

export function TwoTapDestructive({
  T = colors.light,
  label,
  confirmLabel,
  onConfirm,
  disabled = false,
}: TwoTapDestructiveProps): React.JSX.Element {
  const fire = useHaptic();
  const [armed, setArmed] = useState(false);
  const armedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const disarm = (): void => {
    setArmed(false);
    armedAtRef.current = 0;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPress = (): void => {
    if (disabled) return;
    if (!armed) {
      fire('heavy');
      setArmed(true);
      armedAtRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(disarm, ARM_TIMEOUT_MS);
      return;
    }
    // Already armed — gate on the 600ms minimum.
    const elapsed = Date.now() - armedAtRef.current;
    if (elapsed < ARM_MIN_MS) return;
    fire('success');
    disarm();
    onConfirm();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={armed ? confirmLabel : label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        armed
          ? { backgroundColor: T.danger, borderColor: T.danger }
          : { backgroundColor: 'transparent', borderColor: T.danger },
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text
        style={[
          typography.bodyMed,
          {
            color: armed ? T.bgElevated : T.danger,
            fontWeight: '700',
          },
        ]}
        numberOfLines={1}
      >
        {armed ? confirmLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

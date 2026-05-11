/**
 * AvailDot — Tiny availability status circle (default 8px).
 *
 * `null` → dashed-border ring (no fill) so the absence-of-state remains visible.
 * Set states fill solid in availFree / availMaybe / availBusy.
 *
 * Hard Rule R5-1: AvailDot is the canonical way to convey availability state, but
 * it must always appear alongside a text label in its parent — never color alone.
 * The component itself does NOT enforce the pairing (that lives at the call site)
 * but it DOES render a visible dashed ring when status is null instead of hiding.
 *
 * A-5: when `onPress` is provided, wraps in a 44pt hit area; visual dot stays the
 * caller-requested size.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../../theme';
import type { AvailDotStatus } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface AvailDotProps {
  T?: Theme;
  status: AvailDotStatus;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const HIT_SIZE = 44;

export function AvailDot({
  T = colors.light,
  status,
  size = 8,
  onPress,
  accessibilityLabel,
}: AvailDotProps): React.JSX.Element {
  const palette = resolvePalette(T, status);

  const dot = (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.fill,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
          borderStyle: palette.borderStyle,
        },
      ]}
    />
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? statusLabel(status)}
        onPress={onPress}
        hitSlop={Math.max(0, (HIT_SIZE - size) / 2)}
        style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.7 : 1 }]}
      >
        {dot}
      </Pressable>
    );
  }

  return dot;
}

interface DotPalette {
  fill: string;
  border: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed';
}

function resolvePalette(T: Theme, status: AvailDotStatus): DotPalette {
  switch (status) {
    case 'free':
      return { fill: T.availFree, border: T.availFree, borderWidth: 0, borderStyle: 'solid' };
    case 'maybe':
      return { fill: T.availMaybe, border: T.availMaybe, borderWidth: 0, borderStyle: 'solid' };
    case 'busy':
      return { fill: T.availBusy, border: T.availBusy, borderWidth: 0, borderStyle: 'solid' };
    default:
      return { fill: 'transparent', border: T.ink3, borderWidth: 1, borderStyle: 'dashed' };
  }
}

function statusLabel(status: AvailDotStatus): string {
  switch (status) {
    case 'free':  return 'Free';
    case 'maybe': return 'Maybe';
    case 'busy':  return 'Busy';
    default:      return 'Not set';
  }
}

const styles = StyleSheet.create({
  dot: {},
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

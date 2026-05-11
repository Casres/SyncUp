/**
 * Spinner — THE only loading affordance in SyncUp.
 *
 * Hard Rule R5-2: skeletons / shimmer / pulse FORBIDDEN. Spinner only.
 *
 * Geometry: two opposing ~120° arcs forming a ring with two ~60° gaps.
 *           stroke = max(1.6, size/14), rounded caps.
 * Motion:   0 → 360°, 900ms linear, infinite (Reanimated withRepeat).
 * Sizes:    XS=18 / SM=20 / MD=28 / LG=40.
 * Color:    accent on light surfaces · #fff on ink/danger surfaces (`onInk`).
 * A11y:     accessibilityRole="progressbar", accessibilityLabel="Loading".
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, durations } from '../../theme';
import type { SpinnerSizeName } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface SpinnerProps {
  T?: Theme;
  size?: SpinnerSizeName;
  /** When true, renders white (use on ink/danger surfaces). */
  onInk?: boolean;
}

export const SPINNER_PIXEL_SIZE: Record<SpinnerSizeName, number> = {
  XS: 18,
  SM: 20,
  MD: 28,
  LG: 40,
};

export function Spinner({
  T = colors.light,
  size = 'MD',
  onInk = false,
}: SpinnerProps): React.JSX.Element {
  const px = SPINNER_PIXEL_SIZE[size];
  const stroke = Math.max(1.6, px / 14);
  const color = onInk ? '#FFFFFF' : T.accent;

  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = 0;
    angle.value = withRepeat(
      withTiming(360, { duration: durations.spinner, easing: Easing.linear }),
      -1,
      false,
    );
  }, [angle]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  // Build two opposing 120° arcs as SVG paths.
  const pathD = useMemo(() => buildArcsPath(px, stroke), [px, stroke]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.root, { width: px, height: px }]}
    >
      <Animated.View style={[{ width: px, height: px }, animatedStyle]}>
        <Svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} fill="none">
          <Path
            d={pathD}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * Build path data for two opposing ~120° arcs (gap ~60° between them).
 * SVG arc syntax: `M sx sy A r r 0 largeArcFlag sweepFlag ex ey`.
 */
function buildArcsPath(size: number, stroke: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2 - 1; // 1px inset so caps don't clip.
  const arcDeg = 120;
  // Arc 1: from -150° to -30° (top half of the ring).
  // Arc 2: from 30° to 150° (bottom half).
  const arc1Start = polar(cx, cy, r, -150);
  const arc1End = polar(cx, cy, r, -150 + arcDeg);
  const arc2Start = polar(cx, cy, r, 30);
  const arc2End = polar(cx, cy, r, 30 + arcDeg);

  return [
    `M ${arc1Start.x} ${arc1Start.y}`,
    `A ${r} ${r} 0 0 1 ${arc1End.x} ${arc1End.y}`,
    `M ${arc2Start.x} ${arc2Start.y}`,
    `A ${r} ${r} 0 0 1 ${arc2End.x} ${arc2End.y}`,
  ].join(' ');
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

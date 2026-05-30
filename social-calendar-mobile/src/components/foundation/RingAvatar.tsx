/**
 * RingAvatar — Circular avatar with availability ring (Hard Rule 4).
 *
 *   free  → full ring stroke in availFree
 *   maybe → 50% arc stroke in availMaybe
 *   busy  → 15% arc stroke in availBusy
 *   null  → no ring (decorative)
 *
 * R5-1: ring is decorative — parent must pair with text or AvailDot when the
 * ring conveys state.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '../../theme';
import type { AvailState } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface RingAvatarProps {
  T?: Theme;
  letter: string;
  size?: number;
  status?: AvailState | null;
  selected?: boolean;
  accessibilityLabel?: string;
  /** Profile photo URI. Falls back to the letter initial when null/undefined. */
  photoUrl?: string | null;
}

export function RingAvatar({
  T = colors.light,
  letter,
  size = 40,
  status = null,
  selected = false,
  accessibilityLabel,
  photoUrl = null,
}: RingAvatarProps): React.JSX.Element {
  const stroke = Math.max(1, Math.round(size * 0.05));
  const inset = stroke + 1;
  const radius = (size - inset * 2) / 2;
  const circ = 2 * Math.PI * radius;

  const ringConfig = resolveRing(T, status);
  const arcLen = circ * ringConfig.fraction;
  const dashArray = ringConfig.fraction === 1 ? undefined : `${arcLen} ${circ - arcLen}`;

  const innerSize = size - inset * 2;

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessible
      accessibilityLabel={accessibilityLabel ?? `Avatar ${letter}`}
    >
      {ringConfig.fraction > 0 ? (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringConfig.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      ) : null}
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: selected ? T.accent : T.bgSunken,
            borderColor: selected ? T.accent : T.hair,
            overflow: 'hidden',
          },
        ]}
      >
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: innerSize, height: innerSize }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              color: selected ? T.bgElevated : T.ink,
              fontFamily: fonts.sans,
              fontWeight: '700',
              fontSize: Math.round(size * 0.42),
            }}
          >
            {letter}
          </Text>
        )}
      </View>
    </View>
  );
}

interface RingConfig {
  color: string;
  fraction: number;
}

function resolveRing(T: Theme, status: AvailState | null): RingConfig {
  switch (status) {
    case 'free':
      return { color: T.availFree, fraction: 1 };
    case 'maybe':
      return { color: T.availMaybe, fraction: 0.5 };
    case 'busy':
      return { color: T.availBusy, fraction: 0.15 };
    default:
      return { color: 'transparent', fraction: 0 };
  }
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

/**
 * QRArt — QR code display card.
 *
 * Used on the Add Friend screen. White (bgElevated) card surface with a soft
 * accent shadow (shadowAccent) — the "qrCard" treatment.
 *
 * Inferred shape: this component is purely presentational. The actual QR
 * bitmap is rendered as a deterministic SVG grid derived from the payload
 * (no third-party QR library needed for the design-system layer — the screens
 * agent may swap in a real encoder later, but the visible "QR-ish" tile keeps
 * the layout pinned).
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, radii, spacing } from '../../theme';

type Theme = typeof colors.light;

export interface QRArtProps {
  T?: Theme;
  payload: string;
  size?: number;
}

const GRID = 21; // canonical QR v1 module count

export function QRArt({
  T = colors.light,
  payload,
  size = 220,
}: QRArtProps): React.JSX.Element {
  const moduleSize = size / GRID;
  const cells = useMemo(() => buildCells(payload), [payload]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: T.bgElevated,
          shadowColor: T.shadowAccent,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.map((on, idx) => {
          if (!on) return null;
          const row = Math.floor(idx / GRID);
          const col = idx % GRID;
          return (
            <Rect
              key={idx}
              x={col * moduleSize}
              y={row * moduleSize}
              width={moduleSize}
              height={moduleSize}
              fill={T.ink}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function buildCells(payload: string): boolean[] {
  // Deterministic but visually QR-like fill: position-detector squares in 3
  // corners + a payload-hashed pseudo-random fill across the rest.
  const out: boolean[] = new Array<boolean>(GRID * GRID).fill(false);
  const setPdp = (cx: number, cy: number): void => {
    for (let dy = 0; dy < 7; dy += 1) {
      for (let dx = 0; dx < 7; dx += 1) {
        const onPerimeter = dy === 0 || dy === 6 || dx === 0 || dx === 6;
        const onCenter = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
        out[(cy + dy) * GRID + (cx + dx)] = onPerimeter || onCenter;
      }
    }
  };
  setPdp(0, 0);
  setPdp(GRID - 7, 0);
  setPdp(0, GRID - 7);

  let h = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    h = ((h ^ payload.charCodeAt(i)) * 16777619) >>> 0;
  }
  for (let r = 0; r < GRID; r += 1) {
    for (let c = 0; c < GRID; c += 1) {
      const inPdp =
        (r < 7 && c < 7) ||
        (r < 7 && c >= GRID - 7) ||
        (r >= GRID - 7 && c < 7);
      if (inPdp) continue;
      h = (h * 1664525 + 1013904223) >>> 0;
      out[r * GRID + c] = (h & 1) === 1;
    }
  }
  return out;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.hero,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 8,
    alignSelf: 'center',
  },
});

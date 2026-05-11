/**
 * CoverArt — Renders bundled artwork for a SocialGroup.
 *
 * Hard Rule 3: NEVER a generic gradient. Cover art must be a deterministic
 * tinted glyph composition derived from the cover id.
 *
 * The component is purely presentational — it receives a `Cover` (id + label +
 * art) and renders a tinted card containing the cover initial. The actual
 * bundled art asset (a hosted SVG or sprite mapping) is the parent's concern;
 * this component renders a stable visual using token color stops from the cover
 * id's hash so groups stay visually distinct without ever using a gradient.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../../theme';
import type { Cover } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface CoverArtProps {
  T?: Theme;
  cover: Cover;
  /** Pixel size — square. Default 56 (matches the EmptyState 56×56 tile). */
  size?: number;
  /** Border radius. Default radii.card (14). */
  radius?: number;
}

const COLOR_KEYS: ReadonlyArray<'accentSoft' | 'popSoft' | 'limeSoft' | 'bgSunken'> = [
  'accentSoft', 'popSoft', 'limeSoft', 'bgSunken',
];

const INK_KEYS: ReadonlyArray<'accentInk' | 'popInk' | 'limeInk' | 'ink'> = [
  'accentInk', 'popInk', 'limeInk', 'ink',
];

export function CoverArt({
  T = colors.light,
  cover,
  size = 56,
  radius,
}: CoverArtProps): React.JSX.Element {
  const r = radius ?? radii.card;
  const idx = hashIndex(cover.id, COLOR_KEYS.length);
  const bgKey = COLOR_KEYS[idx]!;
  const inkKey = INK_KEYS[idx]!;
  const bg = T[bgKey];
  const fg = T[inkKey];
  const initial = (cover.label[0] ?? cover.id[0] ?? '·').toUpperCase();

  return (
    <View
      accessible
      accessibilityLabel={`${cover.label} cover`}
      style={[
        styles.root,
        { width: size, height: size, backgroundColor: bg, borderRadius: r },
      ]}
    >
      <Text
        style={[
          typography.h2,
          { color: fg, fontSize: Math.round(size * 0.5), fontWeight: '800' },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

function hashIndex(id: string, n: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % n;
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

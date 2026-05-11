/**
 * LoadingOverlay — Full-screen / route-level loading.
 *
 * Centered MD Spinner + optional caption. Caption: mono uppercase 10/600 ink3,
 * letter-spacing 1.6, ≤ 2 words ("LOADING ·", "SYNCING ·") (L-3).
 *
 * Hard Rules: L-1 (always rendered, no skeleton fallback), L-3 (caption rules),
 * R5-2 (Spinner is the only loading affordance).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { Spinner } from './Spinner';

type Theme = typeof colors.light;

export interface LoadingOverlayProps {
  T?: Theme;
  caption?: string;
}

export function LoadingOverlay({
  T = colors.light,
  caption,
}: LoadingOverlayProps): React.JSX.Element {
  return (
    <View
      style={[styles.root, { backgroundColor: T.bg }]}
      accessibilityRole="progressbar"
      accessibilityLabel={caption ? `${caption} loading` : 'Loading'}
    >
      <Spinner T={T} size="MD" />
      {caption ? (
        <Text style={[typography.overline, { color: T.ink3, marginTop: spacing.md }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * ErrorState — Full-area error block.
 *
 * 4 presets: network / server / notFound / permission.
 * E-1, E-2, E-3, E-4: always offer a recovery path; plain language; no codes.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../../theme';
import { PillBtn } from '../foundation/PillBtn';
import type { ErrorStateKind } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface ErrorStateProps {
  T?: Theme;
  kind: ErrorStateKind;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

interface Preset {
  headline: string;
  body: string;
  primary: string;
  secondary: string;
}

const PRESETS: Record<ErrorStateKind, Preset> = {
  network: {
    headline: 'No connection',
    body: 'Check your network and try again.',
    primary: 'Try again',
    secondary: 'Use offline mode',
  },
  server: {
    headline: 'Something broke',
    body: 'Our servers are taking a breather.',
    primary: 'Try again',
    secondary: 'Go back',
  },
  notFound: {
    headline: 'Not found',
    body: 'This may have been removed.',
    primary: 'Go back',
    secondary: 'Refresh',
  },
  permission: {
    headline: 'Permission needed',
    body: 'Open Settings to grant access.',
    primary: 'Open Settings',
    secondary: 'Go back',
  },
};

export function ErrorState({
  T = colors.light,
  kind,
  onPrimary,
  onSecondary,
}: ErrorStateProps): React.JSX.Element {
  const preset = PRESETS[kind];

  return (
    <View style={styles.root} accessibilityRole="alert">
      <View style={[styles.tile, { backgroundColor: T.dangerSoft }]}>
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l10 18H2L12 3z"
            stroke={T.popInk}
            strokeWidth={2}
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M12 10v5"
            stroke={T.popInk}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M12 18v.01"
            stroke={T.popInk}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text
        style={[
          typography.h3,
          { color: T.ink, fontWeight: '800', textAlign: 'center' },
        ]}
      >
        {preset.headline}
      </Text>
      <Text style={[typography.caption, { color: T.ink2, textAlign: 'center', fontSize: 13 }]}>
        {preset.body}
      </Text>
      <View style={styles.actions}>
        {onPrimary ? (
          <PillBtn T={T} variant="primary" label={preset.primary} onPress={onPrimary} />
        ) : null}
        {onSecondary ? (
          <PillBtn T={T} variant="ghost" label={preset.secondary} onPress={onSecondary} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['4xl'],
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
    maxWidth: 360,
    alignSelf: 'center',
  },
  tile: {
    width: 56,
    height: 56,
    borderRadius: radii.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
});

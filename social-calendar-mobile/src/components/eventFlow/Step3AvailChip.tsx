/**
 * Step3AvailChip — Subtle status overline chip for Step 3 wire-back.
 *
 * Renders when the chosen day is `free` or `maybe` (the non-conflict cases).
 * Uses Overline (mono uppercase 10/600) + AvailDot — the spec calls for
 * "FROM YOUR AVAILABILITY" with a subtle state dot.
 *
 * R5-1: pairs dot + text. R5-5: overline at 10px must use ink2 contrast floor.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';
import { Overline } from '../foundation/Overline';
import { AvailDot } from '../profile/AvailDot';
import type { AvailState } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface Step3AvailChipProps {
  T?: Theme;
  /** Status of the day being shown. 'busy' should use Step3BusyBanner instead. */
  status: Extract<AvailState, 'free' | 'maybe'>;
  /** Optional descriptor — defaults to "From your availability". */
  label?: string;
}

const DEFAULT_LABEL = 'From your availability';

export function Step3AvailChip({
  T = colors.light,
  status,
  label = DEFAULT_LABEL,
}: Step3AvailChipProps): React.JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: T.bgSunken }]}>
      <AvailDot T={T} status={status} size={6} />
      <Overline T={T} color="ink2">
        {label}
      </Overline>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
});

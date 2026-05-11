/**
 * ProgressBar — 3-segment top progress bar for Create Event Flow.
 *
 * Step 1 / 2 / 3. Active segment fill = accent. Inactive = bgSunken.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type Theme = typeof colors.light;

export interface ProgressBarProps {
  T?: Theme;
  step: 1 | 2 | 3;
  /** Total step count. Defaults to 3. */
  total?: number;
}

export function ProgressBar({
  T = colors.light,
  step,
  total = 3,
}: ProgressBarProps): React.JSX.Element {
  const segments = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={styles.root}
    >
      {segments.map((s) => {
        const active = s <= step;
        return (
          <View
            key={s}
            style={[
              styles.seg,
              { backgroundColor: active ? T.accent : T.bgSunken },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  seg: {
    flex: 1,
    height: 4,
    borderRadius: radii.inline,
  },
});

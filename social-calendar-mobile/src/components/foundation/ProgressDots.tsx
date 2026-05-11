/**
 * ProgressDots — onboarding step indicator (R9-2).
 *
 * Row of `total` 8px dots with 6px gaps. Active dot is `accent`; completed
 * dots use `accent` at 40% opacity; upcoming dots use the hairStrong border
 * with no fill. NEVER pairs with "Step N of N" copy per the rule — the dots
 * are the only progress affordance.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';

type Theme = typeof colors.light;

export interface ProgressDotsProps {
  T?: Theme;
  total: number;
  /** 1-indexed step (1 = first dot active). */
  current: number;
}

export function ProgressDots({
  T = colors.light,
  total,
  current,
}: ProgressDotsProps): React.JSX.Element {
  return (
    <View accessibilityRole="progressbar" style={styles.row}>
      {Array.from({ length: total }).map((_, idx) => {
        const step = idx + 1;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <View
            key={idx}
            style={[
              styles.dot,
              isActive
                ? { backgroundColor: T.accent, borderColor: T.accent }
                : isCompleted
                  ? { backgroundColor: T.accent, borderColor: T.accent, opacity: 0.4 }
                  : { backgroundColor: 'transparent', borderColor: T.hairStrong },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});

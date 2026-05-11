/**
 * ButtonLoading — Inline button loading state.
 *
 * Replaces button content while a tap awaits its action. XS spinner + optional
 * label ("Sending…", "Saving…").
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { Spinner } from './Spinner';

type Theme = typeof colors.light;

export interface ButtonLoadingProps {
  T?: Theme;
  label?: string;
  /** Match the host button surface — true on accent/destructive, false on ghost. */
  onInk?: boolean;
}

export function ButtonLoading({
  T = colors.light,
  label,
  onInk = true,
}: ButtonLoadingProps): React.JSX.Element {
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Spinner T={T} size="XS" onInk={onInk} />
      {label ? (
        <Text
          style={[
            typography.bodyMed,
            { color: onInk ? T.bgElevated : T.ink, fontWeight: '700' },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

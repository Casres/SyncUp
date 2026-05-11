/**
 * Field — Lower-level wrapper used by FormField and inside Create flow.
 *
 * Owns: 14px-padded, hair-bordered, radius-12 surface with optional label
 * (12/600 ink2) above the body and optional footnote below.
 *
 * Does NOT own the input control — caller composes children inside.
 */

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface FieldProps {
  T?: Theme;
  label?: string;
  footnote?: string;
  error?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Field({
  T = colors.light,
  label,
  footnote,
  error,
  children,
  style,
}: FieldProps): React.JSX.Element {
  const borderColor = error ? T.popInk : T.hair;
  return (
    <View style={style}>
      {label ? (
        <Text
          accessibilityRole="text"
          style={[
            typography.caption,
            { color: T.ink2, fontWeight: '600', marginBottom: spacing.xs },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.body,
          { backgroundColor: T.bgElevated, borderColor, borderWidth: 1 },
        ]}
      >
        {children}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Text style={[typography.caption, { color: T.popInk }]} accessibilityLiveRegion="polite">
            {/* Triangle marker satisfies A-16: never color alone. */}
            {'⚠  ' + error}
          </Text>
        </View>
      ) : null}
      {!error && footnote ? (
        <Text style={[typography.caption, { color: T.ink2, marginTop: spacing.xs }]}>{footnote}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    borderRadius: radii.input,
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.md,
  },
  errorRow: {
    marginTop: spacing.xs,
  },
});

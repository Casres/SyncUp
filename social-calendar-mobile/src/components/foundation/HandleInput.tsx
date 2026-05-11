/**
 * HandleInput — "@handle" entry with debounced availability indicator (R9-6).
 *
 * The 400ms debounce + actual check live in the parent (the parent owns
 * the check, since this will eventually hit the real backend). This
 * component renders the visual state passed via `availabilityState`.
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, radii, spacing, typography } from '../../theme';
import { Spinner } from '../polish/Spinner';

type Theme = typeof colors.light;

export type HandleAvailabilityState = 'idle' | 'checking' | 'available' | 'taken';

export interface HandleInputProps {
  T?: Theme;
  value: string;
  onChange: (next: string) => void;
  availabilityState: HandleAvailabilityState;
  /** Shows the "Handle taken" inline error per R9-6. */
  showTakenError?: boolean;
}

export function HandleInput({
  T = colors.light,
  value,
  onChange,
  availabilityState,
  showTakenError = true,
}: HandleInputProps): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { backgroundColor: T.bgSunken }]}>
        <View style={styles.prefix}>
          <Text style={[styles.prefixText, { color: T.ink3 }]}>@</Text>
        </View>
        <TextInput
          accessibilityLabel="Username handle"
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
          placeholder="handle"
          placeholderTextColor={T.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          style={[styles.input, typography.body, { color: T.ink }]}
        />
        <View style={styles.trailing}>
          {availabilityState === 'checking' ? (
            <Spinner T={T} size="XS" />
          ) : availabilityState === 'available' ? (
            <Ionicons name="checkmark-circle" size={20} color={T.limeInk} />
          ) : availabilityState === 'taken' ? (
            <Ionicons name="close-circle" size={20} color={T.popInk} />
          ) : null}
        </View>
      </View>
      {availabilityState === 'taken' && showTakenError ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning" size={14} color={T.danger} />
          <Text style={[styles.errorText, { color: T.danger }]}>Handle taken</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
  },
  prefix: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.mono,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: fonts.mono,
  },
  trailing: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

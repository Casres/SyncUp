/**
 * AuthInputField — labeled text input used across the onboarding stack.
 *
 * Implements R9-4 (inline error only after the user attempts submit).
 * The error message render is controlled by the parent via the `error` prop.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export type AuthInputType = 'text' | 'email' | 'phone' | 'password';

export interface AuthInputFieldProps {
  T?: Theme;
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  type?: AuthInputType;
  placeholder?: string;
  autoFocus?: boolean;
  /** Match TextInput.maxLength for the typed input value. */
  maxLength?: number;
}

function autoCapForType(type: AuthInputType): 'none' | 'words' | 'sentences' {
  if (type === 'email' || type === 'phone' || type === 'password') return 'none';
  return 'words';
}

function keyboardForType(
  type: AuthInputType,
): 'default' | 'email-address' | 'phone-pad' {
  if (type === 'email') return 'email-address';
  if (type === 'phone') return 'phone-pad';
  return 'default';
}

export function AuthInputField({
  T = colors.light,
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoFocus,
  maxLength,
}: AuthInputFieldProps): React.JSX.Element {
  const [reveal, setReveal] = useState(false);
  const hasError = typeof error === 'string' && error.length > 0;

  const secure = type === 'password' && !reveal;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: T.ink2 }]}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          {
            backgroundColor: T.bgSunken,
            borderColor: hasError ? T.danger : 'transparent',
            borderWidth: hasError ? 1.5 : 0,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.ink3}
          autoCapitalize={autoCapForType(type)}
          keyboardType={keyboardForType(type)}
          secureTextEntry={secure}
          autoCorrect={type !== 'text'}
          autoFocus={autoFocus}
          maxLength={maxLength}
          style={[styles.input, typography.body, { color: T.ink }]}
        />
        {type === 'password' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            hitSlop={8}
            onPress={() => setReveal((p) => !p)}
            style={styles.revealBtn}
          >
            <Ionicons
              name={reveal ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={T.ink3}
            />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning" size={14} color={T.danger} />
          <Text style={[styles.errorText, { color: T.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radii.input,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '500',
  },
  revealBtn: {
    width: 32,
    height: 32,
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

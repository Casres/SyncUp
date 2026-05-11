/**
 * FormField — Labeled text input with optional error.
 *
 * A-15: every input has an associated label.
 * A-16: errors render in popInk + triangle (never color alone).
 */

import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Field } from './Field';

type Theme = typeof colors.light;

export interface FormFieldProps {
  T?: Theme;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  error?: string;
  trailing?: React.ReactNode;
  onBlur?: TextInputProps['onBlur'];
  onFocus?: TextInputProps['onFocus'];
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  secureTextEntry?: boolean;
}

export function FormField({
  T = colors.light,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  error,
  trailing,
  onBlur,
  onFocus,
  autoCapitalize,
  keyboardType,
  secureTextEntry,
}: FormFieldProps): React.JSX.Element {
  return (
    <Field T={T} label={label} error={error}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.ink3}
          multiline={multiline}
          onBlur={onBlur}
          onFocus={onFocus}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            typography.body,
            {
              color: T.ink,
              minHeight: multiline ? 80 : undefined,
              textAlignVertical: multiline ? 'top' : 'auto',
            },
          ]}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    padding: 0, // Field already provides padding; kill RN default.
    borderRadius: radii.inline,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

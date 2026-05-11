/**
 * OTPInput — 6-cell verification-code input (R9-5).
 *
 * Visual cells render the digits typed into a single hidden TextInput.
 * Auto-submits on the 6th digit by emitting the full value through
 * `onChange`. Parent watches for length === 6 and fires the submit.
 *
 * Supports paste of a 6-digit string. Non-digit characters are filtered.
 */

import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type Theme = typeof colors.light;

export interface OTPInputProps {
  T?: Theme;
  length?: number;
  value: string;
  onChange: (next: string) => void;
  /** When true, every cell border renders in danger color. */
  hasError?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  T = colors.light,
  length = 6,
  value,
  onChange,
  hasError = false,
  autoFocus = true,
}: OTPInputProps): React.JSX.Element {
  const inputRef = useRef<TextInput | null>(null);

  function focusHidden() {
    inputRef.current?.focus();
  }

  function handleChange(next: string) {
    const cleaned = next.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
  }

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Verification code input"
      onPress={focusHidden}
      style={styles.row}
    >
      {Array.from({ length }).map((_, idx) => {
        const ch = value[idx] ?? '';
        const isActive = idx === value.length;
        return (
          <View
            key={idx}
            style={[
              styles.cell,
              {
                backgroundColor: T.bgSunken,
                borderColor: hasError
                  ? T.danger
                  : isActive
                    ? T.accent
                    : T.hair,
                borderWidth: hasError || isActive ? 1.5 : 1,
              },
            ]}
          >
            <Text style={[styles.cellText, { color: T.ink }]}>{ch}</Text>
          </View>
        );
      })}
      <TextInput
        ref={(r) => {
          inputRef.current = r;
        }}
        autoFocus={autoFocus}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={length}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const CELL_W = 48;
const CELL_H = 56;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  cell: {
    width: CELL_W,
    height: CELL_H,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 24,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

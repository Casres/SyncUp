/**
 * SearchInputBar — R15-4 reusable search pill.
 *
 * Full-width pill · radius 12 · bgSunken · hair border · auto-focus ·
 * clear × inside right edge (renders when text present · light haptic on tap).
 *
 * Used in AttendeesSheet header search mode.
 */

import React, { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface SearchInputBarProps extends Pick<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'accessibilityLabel'> {
  T?: Theme;
  onClear: () => void;
}

export const SearchInputBar = forwardRef<TextInput, SearchInputBarProps>(
  function SearchInputBar(
    { T = colors.light, value, onChangeText, placeholder = 'Search…', accessibilityLabel, onClear },
    ref,
  ) {
    const fire = useHaptic();

    return (
      <View style={[styles.pill, { backgroundColor: T.bgSunken, borderColor: T.hair }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? 'Search'}
          placeholder={placeholder}
          placeholderTextColor={T.ink3}
          value={value}
          onChangeText={onChangeText}
          style={[styles.input, typography.body, { color: T.ink }]}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {value && value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear"
            hitSlop={8}
            onPress={() => { fire('light'); onClear(); }}
          >
            <Ionicons name="close-circle" size={18} color={T.ink3} />
          </Pressable>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
  },
});

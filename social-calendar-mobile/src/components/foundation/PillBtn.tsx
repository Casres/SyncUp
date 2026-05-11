/**
 * PillBtn — Primary / ghost / destructive pill button.
 *
 * Loading state swaps content for <ButtonLoading/> (R5-2 enforced).
 * Hard Rule 2: md size meets 44pt hit area.
 * R5-4 / A-7: icon-only callers must pass `accessibilityLabel`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { ButtonLoading } from '../polish/ButtonLoading';

type Theme = typeof colors.light;

export type PillBtnVariant = 'primary' | 'ghost' | 'destructive';
export type PillBtnSize = 'sm' | 'md' | 'lg';

export interface PillBtnProps {
  T?: Theme;
  label: string;
  variant?: PillBtnVariant;
  size?: PillBtnSize;
  onPress?: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

interface SizeSpec {
  paddingV: number;
  paddingH: number;
  minHeight: number;
  fontSize: number;
}

const SIZE_TABLE: Record<PillBtnSize, SizeSpec> = {
  sm: { paddingV: 6, paddingH: spacing.md, minHeight: 32, fontSize: 12 },
  md: { paddingV: 12, paddingH: spacing.lg, minHeight: 44, fontSize: 14 },
  lg: { paddingV: 14, paddingH: spacing.xl, minHeight: 52, fontSize: 15 },
};

export function PillBtn({
  T = colors.light,
  label,
  variant = 'primary',
  size = 'md',
  onPress,
  loading = false,
  icon,
  disabled = false,
  accessibilityLabel,
  style,
}: PillBtnProps): React.JSX.Element {
  const spec = SIZE_TABLE[size];
  const isDisabled = disabled || loading;

  const palette = resolveVariantPalette(T, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: spec.paddingV,
          paddingHorizontal: spec.paddingH,
          minHeight: spec.minHeight,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.borderWidth,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ButtonLoading T={T} onInk={variant !== 'ghost'} />
      ) : (
        <View style={styles.row}>
          {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
          <Text
            numberOfLines={1}
            style={[
              typography.bodyMed,
              {
                color: palette.fg,
                fontSize: spec.fontSize,
                fontWeight: '700',
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface VariantPalette {
  bg: string;
  fg: string;
  border: string;
  borderWidth: number;
}

function resolveVariantPalette(T: Theme, variant: PillBtnVariant): VariantPalette {
  switch (variant) {
    case 'primary':
      return { bg: T.accent, fg: T.bgElevated, border: T.accent, borderWidth: 0 };
    case 'ghost':
      return { bg: 'transparent', fg: T.ink, border: T.hair, borderWidth: 1 };
    case 'destructive':
      return { bg: T.danger, fg: T.bgElevated, border: T.danger, borderWidth: 0 };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

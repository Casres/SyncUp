/**
 * QuicksetNameSheet — name a new custom Quickset or rename an existing one
 * (R12-2, R12-4).
 *
 * Entry points (wired in AvailabilityEditorScreen):
 *   - "Save as Quickset" pill below QuicksetGrid → mode='new'.
 *   - QuicksetGrid ⋯ menu → "Rename" → mode='rename' with initialName.
 *
 * Validation:
 *   - trimmed name cannot be empty
 *   - case-insensitive uniqueness against existingNames; in rename mode
 *     the row's current name is excluded from the collision check so
 *     the user can save the same name unchanged.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  durations,
  easings,
  radii,
  spacing,
  springs,
  typography,
  useHaptic,
} from '../../theme';
import { PillBtn } from '../foundation/PillBtn';

type Theme = typeof colors.light;

export type QuicksetNameSheetMode = 'new' | 'rename';

export interface QuicksetNameSheetProps {
  T?: Theme;
  open: boolean;
  mode: QuicksetNameSheetMode;
  /** Pre-populated value when mode='rename'. */
  initialName?: string;
  /** All current custom quickset names (case-insensitive uniqueness). */
  existingNames: string[];
  /**
   * Called when the user taps Save AFTER validation passes. Receives the
   * trimmed name. Parent is responsible for firing success haptic and
   * mutating local state.
   */
  onSave: (name: string) => void;
  onClose: () => void;
}

const SHEET_MAX_HEIGHT_PCT = 0.5;
const MAX_NAME_LENGTH = 24;

export function QuicksetNameSheet({
  T = colors.light,
  open,
  mode,
  initialName,
  existingNames,
  onSave,
  onClose,
}: QuicksetNameSheetProps): React.JSX.Element | null {
  const fire = useHaptic();

  // ── Local state ────────────────────────────────────────────────────────
  const [nameValue, setNameValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset/initialise state when the sheet opens or mode/initialName change.
  useEffect(() => {
    if (!open) return;
    setNameValue(mode === 'rename' ? (initialName ?? '') : '');
    setValidationError(null);
  }, [open, mode, initialName]);

  // ── Sheet animation ────────────────────────────────────────────────────
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      opacity.value = withTiming(1, { duration: durations.sheetUp });
      translateY.value = withSpring(0, springs.spring);
    } else {
      opacity.value = withTiming(0, {
        duration: durations.stepPush,
        easing: easings.easeStd,
      });
      translateY.value = withTiming(60, {
        duration: durations.stepPush,
        easing: easings.easeStd,
      });
    }
  }, [open, opacity, translateY]);

  const sheetAStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  function dismiss() {
    fire('light');
    onClose();
  }

  // ── Validation ─────────────────────────────────────────────────────────
  const trimmed = nameValue.trim();
  const isEmpty = trimmed.length === 0;

  // Exclude the row's current name from the collision check in rename mode.
  const collidingSet = useMemo(() => {
    const original = mode === 'rename' ? (initialName ?? '').trim().toLowerCase() : null;
    const set = new Set<string>();
    for (const n of existingNames) {
      const lower = n.trim().toLowerCase();
      if (lower.length === 0) continue;
      if (original !== null && lower === original) continue;
      set.add(lower);
    }
    return set;
  }, [existingNames, initialName, mode]);

  const collides = !isEmpty && collidingSet.has(trimmed.toLowerCase());

  function handleSave() {
    if (isEmpty) {
      setValidationError('Name cannot be empty');
      return;
    }
    if (collides) {
      setValidationError('Name already in use');
      return;
    }
    onSave(trimmed);
    onClose();
  }

  // Save is disabled when input is empty OR a validation error is showing.
  // Once the user edits the field, onChange clears validationError, so the
  // pill re-enables and validation re-runs on the next Save tap.
  const saveDisabled = isEmpty || validationError !== null;

  if (!open) return null;

  const headerTitle = mode === 'rename' ? 'Rename Quickset' : 'Name your Quickset';

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="none"
        accessibilityLabel="Dismiss sheet"
        onPress={dismiss}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: T.bgElevated,
              maxHeight: `${SHEET_MAX_HEIGHT_PCT * 100}%`,
            },
            sheetAStyle,
          ]}
        >
          <Pressable
            accessibilityViewIsModal
            accessibilityRole="none"
            onPress={() => {}}
            style={styles.sheetInner}
          >
            {/* Grab handle */}
            <View style={[styles.grabHandle, { backgroundColor: T.bgSunken }]} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: T.ink }]}>{headerTitle}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                hitSlop={8}
                onPress={dismiss}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={T.ink3} />
              </Pressable>
            </View>

            {/* Body */}
            <View style={styles.body}>
              <Text style={[styles.fieldLabel, { color: T.ink2 }]}>
                Quickset name
              </Text>
              <TextInput
                accessibilityLabel="Quickset name"
                value={nameValue}
                onChangeText={(text) => {
                  setNameValue(text);
                  if (validationError !== null) setValidationError(null);
                }}
                placeholder="e.g. Morning free"
                placeholderTextColor={T.ink3}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                autoCapitalize="sentences"
                autoCorrect={false}
                style={[
                  styles.input,
                  typography.body,
                  {
                    backgroundColor: T.bgSunken,
                    color: T.ink,
                  },
                ]}
              />

              {validationError !== null ? (
                <View style={styles.errorRow}>
                  <Ionicons name="warning" size={14} color={T.danger} />
                  <Text style={[styles.errorText, { color: T.danger }]}>
                    {validationError}
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.hint, { color: T.ink3 }]}>
                Applied over the next 30 days
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <PillBtn
                T={T}
                label="Save"
                variant="primary"
                size="lg"
                onPress={handleSave}
                disabled={saveDisabled}
              />
              <View style={styles.footerGap} />
              <PillBtn
                T={T}
                label="Cancel"
                variant="ghost"
                size="lg"
                onPress={dismiss}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: 'hidden',
  },
  sheetInner: {
    flexShrink: 1,
  },
  grabHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: radii.input,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    fontWeight: '500',
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
  hint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  footerGap: {
    height: spacing.md,
  },
});

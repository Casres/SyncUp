/**
 * SignUpStep3Screen — identity (name + handle).
 *
 * Name auto-populates the handle (lowercase, strip non-alphanumerics,
 * trim to 20). Availability check is debounced 400ms (R9-6). Simulation:
 * any handle is 'available' except the literal string "taken" — real
 * Clerk + backend check is deferred to the auth integration pass.
 */

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthInputField } from '../../components/foundation/AuthInputField';
import {
  HandleInput,
  type HandleAvailabilityState,
} from '../../components/foundation/HandleInput';
import { PillBtn } from '../../components/foundation/PillBtn';
import { ProgressDots } from '../../components/foundation/ProgressDots';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep3ScreenProps } from '../../navigation/types';

const DEBOUNCE_MS = 400;

function deriveHandle(fullName: string): string {
  return fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

export default function SignUpStep3Screen({
  navigation,
  route,
}: SignUpStep3ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { credential } = route.params;

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleDirty, setHandleDirty] = useState(false);
  const [availability, setAvailability] = useState<HandleAvailabilityState>('idle');

  // Auto-populate handle from name only until the user explicitly edits it.
  useEffect(() => {
    if (handleDirty) return;
    setHandle(deriveHandle(name));
  }, [name, handleDirty]);

  // Debounced availability check (simulated).
  useEffect(() => {
    if (handle.trim().length === 0) {
      setAvailability('idle');
      return;
    }
    setAvailability('checking');
    const t = setTimeout(() => {
      // TODO (real API): replace with debounced /handles/check?value=…
      setAvailability(handle.toLowerCase() === 'taken' ? 'taken' : 'available');
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [handle]);

  function onHandleChange(next: string) {
    setHandle(next);
    if (!handleDirty) setHandleDirty(true);
  }

  const canContinue =
    name.trim().length > 0 && availability === 'available';

  function onContinue() {
    if (!canContinue) return;
    fire('medium');
    navigation.navigate('SignUpStep4', {
      credential,
      name: name.trim(),
      handle,
    });
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: T.bg }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={() => {
              fire('light');
              navigation.goBack();
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={T.ink} />
          </Pressable>
          <View style={styles.dotsWrap}>
            <ProgressDots T={T} total={6} current={3} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[typography.h1, styles.title, { color: T.ink }]}>
            What should we call you?
          </Text>

          <View style={styles.fields}>
            <AuthInputField
              T={T}
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Jane Smith"
              autoFocus
              maxLength={64}
            />
            <HandleInput
              T={T}
              value={handle}
              onChange={onHandleChange}
              availabilityState={availability}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <PillBtn
            T={T}
            label="Continue"
            variant="primary"
            size="lg"
            disabled={!canContinue}
            onPress={onContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsWrap: {
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['3xl'],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  fields: {
    marginTop: spacing['3xl'],
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

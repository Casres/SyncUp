/**
 * SignUpStep1Screen — credential entry (R9-1..R9-4).
 *
 * Asks for a phone or email; light format check; pushes to Step 2 (OTP).
 * Auth is simulated for this build — TODO comment marks the real Clerk
 * `signUp.create(...)` integration point.
 */

import React, { useState } from 'react';
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
import { PillBtn } from '../../components/foundation/PillBtn';
import { ProgressDots } from '../../components/foundation/ProgressDots';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep1ScreenProps } from '../../navigation/types';

function isPlausibleCredential(raw: string): boolean {
  const v = raw.trim();
  if (v.length === 0) return false;
  if (v.includes('@')) return true;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7;
}

export default function SignUpStep1Screen({
  navigation,
}: SignUpStep1ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const [credential, setCredential] = useState('');

  const canContinue = isPlausibleCredential(credential);

  function onContinue() {
    if (!canContinue) return;
    // TODO (real Clerk): signUp.create({ phoneNumber|emailAddress: credential })
    // then prepare phone/email verification before navigating.
    fire('medium');
    navigation.navigate('SignUpStep2', { credential: credential.trim() });
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
            <ProgressDots T={T} total={6} current={1} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[typography.h1, styles.title, { color: T.ink }]}>
            Create your account
          </Text>
          <Text style={[styles.sub, { color: T.ink2 }]}>
            We&rsquo;ll send you a code to verify.
          </Text>

          <View style={styles.fields}>
            <AuthInputField
              T={T}
              label="Phone or email"
              value={credential}
              onChange={setCredential}
              placeholder="you@example.com or +1 555 555 5555"
              autoFocus
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
  sub: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: spacing.sm,
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

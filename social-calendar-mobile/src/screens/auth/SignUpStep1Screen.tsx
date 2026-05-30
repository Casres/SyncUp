/**
 * SignUpStep1Screen — credential entry (R9-1..R9-4).
 *
 * Asks for a phone or email; routes through Clerk `signUp.create` +
 * prepare-verification, then pushes to Step 2 (OTP).
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
import { useSignUp } from '@clerk/clerk-expo';

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
  const { signUp, isLoaded } = useSignUp();
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canContinue =
    isPlausibleCredential(credential) && isLoaded && !submitting;

  async function onContinue() {
    if (!canContinue || !isLoaded) return;
    fire('light');
    setSubmitting(true);
    setError(null);
    const trimmed = credential.trim();
    const isEmail = trimmed.includes('@');
    try {
      if (isEmail) {
        await signUp.create({ emailAddress: trimmed });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else {
        await signUp.create({ phoneNumber: trimmed });
        await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      }
      fire('medium');
      navigation.navigate('SignUpStep2', { credential: trimmed });
    } catch (e) {
      fire('error');
      const msg = e instanceof Error ? e.message : 'Could not start sign-up';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
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
              onChange={(v) => {
                setCredential(v);
                if (error) setError(null);
              }}
              placeholder="you@example.com or +1 555 555 5555"
              error={error ?? undefined}
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
            loading={submitting}
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

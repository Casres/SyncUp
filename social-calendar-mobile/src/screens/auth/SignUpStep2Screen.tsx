/**
 * SignUpStep2Screen — OTP verification (R9-5).
 *
 * Auto-submits on the 6th digit via Clerk
 * `signUp.attemptEmailAddressVerification` / `attemptPhoneNumberVerification`.
 * Resend code is gated by a 30s cooldown.
 */

import React, { useEffect, useRef, useState } from 'react';
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

import { OTPInput } from '../../components/foundation/OTPInput';
import { PillBtn } from '../../components/foundation/PillBtn';
import { ProgressDots } from '../../components/foundation/ProgressDots';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep2ScreenProps } from '../../navigation/types';

const RESEND_COOLDOWN_SECONDS = 30;

export default function SignUpStep2Screen({
  navigation,
  route,
}: SignUpStep2ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { signUp, isLoaded } = useSignUp();
  const { credential } = route.params;

  const isEmail = credential.includes('@');

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [verifying, setVerifying] = useState(false);
  // Tracks the last code we submitted to Clerk so we don't re-attempt the
  // same code if the effect re-runs (e.g., signUp reference changes after
  // attemptVerification resolves).
  const attemptedCodeRef = useRef<string | null>(null);

  // Cooldown timer for the Resend link.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-submit on the 6th digit (R9-5).
  useEffect(() => {
    if (code.length !== 6) {
      attemptedCodeRef.current = null;
      return;
    }
    if (!isLoaded) return;
    if (attemptedCodeRef.current === code) return;
    attemptedCodeRef.current = code;

    let cancelled = false;
    setVerifying(true);
    (async () => {
      try {
        if (isEmail) {
          await signUp.attemptEmailAddressVerification({ code });
        } else {
          await signUp.attemptPhoneNumberVerification({ code });
        }
        if (cancelled) return;
        fire('medium');
        setError(null);
        navigation.navigate('SignUpStep3', { credential });
      } catch (e) {
        if (cancelled) return;
        fire('error');
        const msg = e instanceof Error ? e.message : 'Incorrect code';
        setError(msg);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, credential, fire, navigation, isLoaded, isEmail, signUp]);

  function onCodeChange(next: string) {
    setCode(next);
    if (error !== null) setError(null);
  }

  function onVerify() {
    if (code.length !== 6) return;
    // The useEffect above handles the auto-submit. This button is a
    // fallback that simply nudges the user — actual nav happens via effect.
    fire('medium');
  }

  async function onResend() {
    if (cooldown > 0) return;
    if (!isLoaded) return;
    try {
      if (isEmail) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else {
        await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      }
      fire('success');
      setCode('');
      attemptedCodeRef.current = null;
      setError(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      fire('error');
      const msg = e instanceof Error ? e.message : 'Could not resend code';
      setError(msg);
    }
  }

  function onChangeCredential() {
    fire('light');
    navigation.goBack();
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
            <ProgressDots T={T} total={6} current={2} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[typography.h1, styles.title, { color: T.ink }]}>
            Enter the code
          </Text>
          <View style={styles.subRow}>
            <Text style={[styles.sub, { color: T.ink2 }]}>
              {`Sent to ${credential}. `}
            </Text>
            <Pressable accessibilityRole="link" hitSlop={6} onPress={onChangeCredential}>
              <Text style={[styles.link, { color: T.accent }]}>Change</Text>
            </Pressable>
          </View>

          <View style={styles.otpWrap}>
            <OTPInput
              T={T}
              length={6}
              value={code}
              onChange={onCodeChange}
              hasError={error !== null}
              autoFocus
            />
          </View>

          {error !== null ? (
            <View style={styles.errorRow}>
              <Ionicons name="warning" size={14} color={T.danger} />
              <Text style={[styles.errorText, { color: T.danger }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            hitSlop={8}
            onPress={onResend}
            disabled={cooldown > 0}
            style={styles.resendBtn}
          >
            <Text
              style={[
                styles.resendLabel,
                { color: cooldown > 0 ? T.ink3 : T.accent },
              ]}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <PillBtn
            T={T}
            label="Verify"
            variant="primary"
            size="lg"
            disabled={code.length !== 6 || verifying}
            loading={verifying}
            onPress={onVerify}
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
  subRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: 15,
    fontWeight: '500',
  },
  link: {
    fontSize: 13,
    fontWeight: '500',
  },
  otpWrap: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resendBtn: {
    marginTop: spacing.xxl,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  resendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

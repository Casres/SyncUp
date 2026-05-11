/**
 * SignUpScreen — minimum sign-up shell for Clerk integration.
 *
 * SPEC STATUS:
 *   This is a single-screen shell, not the full Round 9 6-step flow.
 *   It collects an identifier (email or phone) + password, fires Clerk's
 *   verification, and accepts the code. R9-9 spirit applies: the identifier
 *   field auto-detects email vs phone (leading `+` and digits → phone).
 *
 * IMPLEMENTED RULES:
 *   - R9-1: no tab bar / FlowHeader; renders inside AuthNavigator.
 *   - R9-4: primary CTA disabled until valid; errors only after submit attempt.
 *   - R9-5: OTP auto-submits on 6th digit (`onChangeText` length === 6).
 *   - R9-9 (partial): identifier accepts email or phone, format auto-detected.
 *   - Tokens only.
 *
 * DEFERRED (TODO):
 *   - R9-2: 6-dot progress indicator (we have 2 phases here, not 6 steps).
 *   - R9-3: back arrow that preserves form state across steps.
 *   - R9-6: handle availability check with 400ms debounce.
 *   - R9-7: skippable photo + availability steps.
 *   - R9-8: invite-context capture before auth.
 *   - R9-9: full keyboardType adaptation per first-character heuristics.
 *   - Inline error styling per ANCHOR (popInk + triangle iconography).
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp } from '@clerk/clerk-expo';

import { FormField, PillBtn } from '../../components';
import { colors, spacing, typography } from '../../theme';
import type { SignUpScreenProps } from '../../navigation/types';

type Phase = 'credential' | 'verify';
type IdentifierKind = 'email' | 'phone';

interface ParsedIdentifier {
  kind: IdentifierKind;
  value: string;
}

function classifyIdentifier(raw: string): ParsedIdentifier | null {
  const trimmed = raw.trim();
  // Phone: leading `+` followed by 8–15 digits (E.164). Strip spaces/dashes/parens first.
  const phoneCleaned = trimmed.replace(/[\s\-()]/g, '');
  if (/^\+\d{8,15}$/.test(phoneCleaned)) {
    return { kind: 'phone', value: phoneCleaned };
  }
  if (/^\S+@\S+\.\S+$/.test(trimmed)) {
    return { kind: 'email', value: trimmed };
  }
  return null;
}

export default function SignUpScreen({ navigation }: SignUpScreenProps): React.JSX.Element {
  const T = colors.light;
  const { signUp, setActive, isLoaded } = useSignUp();

  const [phase, setPhase] = useState<Phase>('credential');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  // Tracks which verification we sent so verifyCode can call the matching attempt API.
  const [verifyingKind, setVerifyingKind] = useState<IdentifierKind>('email');

  const parsed = classifyIdentifier(identifier);
  const credentialValid = parsed !== null && password.length >= 8;
  const codeValid = code.length === 6;

  async function startSignUp() {
    if (!isLoaded || !parsed) return;
    setSubmitting(true);
    setError(undefined);
    try {
      if (parsed.kind === 'email') {
        await signUp.create({ emailAddress: parsed.value, password });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else {
        await signUp.create({ phoneNumber: parsed.value, password });
        await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      }
      setVerifyingKind(parsed.kind);
      setPhase('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start sign-up');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(nextCode: string) {
    if (!isLoaded || nextCode.length !== 6) return;
    setSubmitting(true);
    setError(undefined);
    try {
      let attempt =
        verifyingKind === 'email'
          ? await signUp.attemptEmailAddressVerification({ code: nextCode })
          : await signUp.attemptPhoneNumberVerification({ code: nextCode });

      // R9 GAP 1 will collect first name, last name, handle, etc. across Steps 3-6.
      // For this minimum-viable shell we stub anything Clerk's instance still
      // requires so the session can be activated and the auth gate fires.
      if (attempt.status === 'missing_requirements') {
        const stubs: { firstName?: string; lastName?: string; username?: string } = {};
        if (attempt.missingFields.includes('first_name')) stubs.firstName = 'SyncUp';
        if (attempt.missingFields.includes('last_name')) stubs.lastName = 'User';
        if (attempt.missingFields.includes('username')) {
          stubs.username = `user_${Date.now().toString(36)}`;
        }
        if (Object.keys(stubs).length > 0) {
          attempt = await signUp.update(stubs);
        }
      }

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        const missing = attempt.missingFields.join(', ') || 'unknown';
        setError(
          `Sign-up status: ${attempt.status}. Still missing: ${missing}. ` +
            'Either disable these in Clerk Dashboard → User & Authentication, or extend GAP 1.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  // R9-5: auto-submit on 6th digit.
  function onCodeChange(next: string) {
    const cleaned = next.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    if (cleaned.length === 6) {
      void verifyCode(cleaned);
    }
  }

  // R9-9 (partial): adapt keyboard based on the first character heuristic.
  // Full first-character map is deferred to GAP 1.
  const credentialKeyboard: 'default' | 'email-address' | 'phone-pad' =
    identifier.startsWith('+') ? 'phone-pad' : 'email-address';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.h1, { color: T.ink, marginBottom: spacing.sm }]}>
            Create account
          </Text>
          <Text style={[typography.body, { color: T.ink2, marginBottom: spacing['3xl'] }]}>
            {phase === 'credential'
              ? 'Email or phone, then a password.'
              : `We sent a 6-digit code to ${identifier.trim()}.`}
          </Text>

          {phase === 'credential' ? (
            <>
              <FormField
                T={T}
                label="Email or phone"
                value={identifier}
                onChange={setIdentifier}
                placeholder="you@example.com or +15555550100"
                autoCapitalize="none"
                keyboardType={credentialKeyboard}
              />
              <View style={{ height: spacing.lg }} />
              <FormField
                T={T}
                label="Password (min 8 chars)"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoCapitalize="none"
                secureTextEntry
              />
            </>
          ) : (
            <FormField
              T={T}
              label="Verification code"
              value={code}
              onChange={onCodeChange}
              placeholder="123456"
              keyboardType="numeric"
            />
          )}

          {error ? (
            <Text style={[typography.caption, styles.error, { color: T.popInk }]}>{error}</Text>
          ) : null}

          <View style={{ height: spacing['3xl'] }} />

          {phase === 'credential' ? (
            <>
              <PillBtn
                T={T}
                label="Continue"
                variant="primary"
                size="lg"
                onPress={startSignUp}
                disabled={!credentialValid || submitting}
                loading={submitting}
              />
              <View style={{ height: spacing.md }} />
              <PillBtn
                T={T}
                label="I already have an account"
                variant="ghost"
                size="lg"
                onPress={() => navigation.navigate('SignIn')}
              />
            </>
          ) : (
            <>
              <PillBtn
                T={T}
                label="Verify"
                variant="primary"
                size="lg"
                onPress={() => verifyCode(code)}
                disabled={!codeValid || submitting}
                loading={submitting}
              />
              <View style={{ height: spacing.md }} />
              <PillBtn
                T={T}
                label="Back"
                variant="ghost"
                size="lg"
                onPress={() => setPhase('credential')}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing['4xl'],
  },
  error: {
    marginTop: spacing.md,
  },
});

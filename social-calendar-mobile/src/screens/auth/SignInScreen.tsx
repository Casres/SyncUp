/**
 * SignInScreen — credential-based sign-in (R9-1, R9-9, R9-10 entry).
 *
 * Updated for the GAP 1 onboarding surface — still backed by Clerk
 * (`useSignIn`) when a real attempt completes, with a simulated wrong-
 * credentials path for visual QA (password === 'wrong'). Forgot-password
 * link routes to the dedicated sub-flow, and the footer routes to the
 * 6-step sign-up rather than the legacy single-screen surface.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';

import { AuthInputField } from '../../components/foundation/AuthInputField';
import { PillBtn } from '../../components/foundation/PillBtn';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignInScreenProps } from '../../navigation/types';

export default function SignInScreen({
  navigation,
}: SignInScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    identifier.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    fire('light');

    // QA hook: password === 'wrong' surfaces the inline error path without
    // requiring a network round-trip. Real Clerk auth handles every other
    // case (incl. genuine bad credentials with its own message).
    if (password === 'wrong') {
      fire('error');
      setError('Incorrect credentials');
      return;
    }

    if (!isLoaded) return;
    setSubmitting(true);
    setError(null);
    try {
      const attempt = await signIn.create({
        identifier: identifier.trim(),
        password,
      });
      if (attempt.status === 'complete') {
        fire('success');
        await setActive({ session: attempt.createdSessionId });
        // RootNavigator unmounts AuthNavigator when isSignedIn flips.
      } else {
        setError('Additional verification required.');
      }
    } catch (e) {
      fire('error');
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function onForgotPassword() {
    fire('light');
    navigation.navigate('ForgotPassword');
  }

  function onCreateAccount() {
    fire('light');
    navigation.navigate('SignUpStep1');
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: T.bg }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.h1, styles.title, { color: T.ink }]}>
            Welcome back
          </Text>

          <View style={styles.fields}>
            <AuthInputField
              T={T}
              label="Phone, email, or @handle"
              value={identifier}
              onChange={(v) => {
                setIdentifier(v);
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              autoFocus
            />
            <View>
              <AuthInputField
                T={T}
                label="Password"
                type="password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (error) setError(null);
                }}
                error={error ?? undefined}
                placeholder="••••••••"
              />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
                hitSlop={8}
                onPress={onForgotPassword}
                style={styles.forgotBtn}
              >
                <Text style={[styles.forgotLabel, { color: T.ink3 }]}>
                  Forgot password?
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.cta}>
            <PillBtn
              T={T}
              label="Sign in"
              variant="primary"
              size="lg"
              disabled={!canSubmit}
              loading={submitting}
              onPress={onSubmit}
            />
          </View>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Create account"
            hitSlop={8}
            onPress={onCreateAccount}
            style={styles.footerLink}
          >
            <Text style={[styles.footerLabel, { color: T.ink3 }]}>
              New to SyncUp?{' '}
              <Text style={{ color: T.accent }}>Create account</Text>
            </Text>
          </Pressable>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  fields: {
    marginTop: spacing['3xl'],
    gap: spacing.lg,
  },
  forgotBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  forgotLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  cta: {
    marginTop: spacing.xxl,
  },
  footerLink: {
    marginTop: spacing.xxl,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

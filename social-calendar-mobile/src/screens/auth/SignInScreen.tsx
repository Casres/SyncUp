/**
 * SignInScreen — minimum sign-in shell for Clerk integration.
 *
 * SPEC STATUS:
 *   This screen is the smallest viable surface that lets a real Clerk
 *   session be established so the rest of the app can be exercised against
 *   live tokens. The full Round 9 sign-in design — branded Welcome screen,
 *   format-agnostic identifier (R9-9), forgot-password sub-flow ending at a
 *   confirmation screen (R9-10), invite-context banner (R9-8) — is GAP 1 and
 *   tracked separately. See ANCHOR-DESIGN.txt R9-1 through R9-10.
 *
 * IMPLEMENTED RULES:
 *   - R9-1: no tab bar / FlowHeader; this screen renders inside AuthNavigator,
 *     which mounts before the main app shell.
 *   - R9-4: primary CTA disabled until both fields non-empty. No error shown
 *     before the first submit attempt.
 *   - Tokens only: never hardcodes hex; uses src/theme/colors.ts.
 *
 * DEFERRED (TODO):
 *   - R9-9: format-agnostic identifier with adaptive keyboardType.
 *   - R9-10: forgot-password sub-flow + confirmation screen.
 *   - InviteContextBanner on Welcome (R9-8).
 *   - Welcome screen with branded illustration.
 *   - Animated entry / haptics on submit success (use useHaptic, never raw Haptics.*).
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';

import { FormField, PillBtn } from '../../components';
import { colors, spacing, typography } from '../../theme';
import type { SignInScreenProps } from '../../navigation/types';

export default function SignInScreen({ navigation }: SignInScreenProps): React.JSX.Element {
  const T = colors.light;
  const { signIn, setActive, isLoaded } = useSignIn();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!isLoaded || !canSubmit) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const attempt = await signIn.create({ identifier: identifier.trim(), password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        // RootNavigator unmounts AuthNavigator on isSignedIn flip.
      } else {
        setError('Additional verification required. Full multi-factor flow is GAP 1.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

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
            Sign in
          </Text>
          <Text style={[typography.body, { color: T.ink2, marginBottom: spacing['3xl'] }]}>
            Welcome back to SyncUp.
          </Text>

          <FormField
            T={T}
            label="Phone, email, or @handle"
            value={identifier}
            onChange={setIdentifier}
            placeholder="you@example.com"
            autoCapitalize="none"
          />
          <View style={{ height: spacing.lg }} />
          <FormField
            T={T}
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoCapitalize="none"
            secureTextEntry
          />

          {error ? (
            <Text style={[typography.caption, styles.error, { color: T.popInk }]}>{error}</Text>
          ) : null}

          <View style={{ height: spacing['3xl'] }} />

          <PillBtn
            T={T}
            label="Sign in"
            variant="primary"
            size="lg"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
          />
          <View style={{ height: spacing.md }} />
          <PillBtn
            T={T}
            label="Create account"
            variant="ghost"
            size="lg"
            onPress={() => navigation.navigate('SignUp')}
          />
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

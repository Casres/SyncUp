/**
 * SignUpStep4Screen — password (R9-4).
 *
 * Single requirement indicator (8+ characters). CTA disabled until met.
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
import type { SignUpStep4ScreenProps } from '../../navigation/types';
import { setSignupSessionId } from './signupSessionStore';

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpStep4Screen({
  navigation,
  route,
}: SignUpStep4ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { signUp, isLoaded } = useSignUp();
  const { credential, name, handle } = route.params;

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetsLength = password.length >= MIN_PASSWORD_LENGTH;
  const canContinue = meetsLength && isLoaded && !submitting;

  async function onContinue() {
    if (!canContinue || !isLoaded) return;
    fire('light');
    setSubmitting(true);
    setError(null);
    try {
      // Setting the password completes the Clerk sign-up; Clerk mints the
      // session here. setActive() only runs ~5 screens later on YoureIn, by
      // which point `signUp.createdSessionId` has been dropped from the client
      // resource — so capture it now and stash it for YoureIn (issue #4). Use
      // the resolved resource from update(), not the possibly-stale closure.
      const completed = await signUp.update({ password });
      if (completed.status === 'complete' && completed.createdSessionId) {
        setSignupSessionId(completed.createdSessionId);
      }
      fire('success');
      navigation.navigate('SignUpStep5', {
        credential,
        name,
        handle,
        password,
      });
    } catch (e) {
      fire('error');
      const msg = e instanceof Error ? e.message : 'Could not set your password';
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
            <ProgressDots T={T} total={6} current={4} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[typography.h1, styles.title, { color: T.ink }]}>
            Set a password
          </Text>

          <View style={styles.fields}>
            <AuthInputField
              T={T}
              label="Password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (error) setError(null);
              }}
              type="password"
              autoFocus
              placeholder="••••••••"
              error={error ?? undefined}
            />

            <View style={styles.requirementRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={meetsLength ? T.limeInk : T.ink3}
              />
              <Text
                style={[
                  styles.requirementText,
                  { color: meetsLength ? T.ink : T.ink3 },
                ]}
              >
                8+ characters
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <PillBtn
            T={T}
            label="Create account"
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
  fields: {
    marginTop: spacing['3xl'],
    gap: spacing.md,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  requirementText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

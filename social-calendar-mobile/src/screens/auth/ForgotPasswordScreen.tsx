/**
 * ForgotPasswordScreen — request a password reset (R9-10 — entry).
 *
 * Captures the credential (phone or email) and hands off to the
 * ForgotPasswordConfirmScreen. Real reset send is deferred — TODO
 * marker is below.
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
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { ForgotPasswordScreenProps } from '../../navigation/types';

export default function ForgotPasswordScreen({
  navigation,
}: ForgotPasswordScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const [credential, setCredential] = useState('');

  const canSubmit = credential.trim().length > 0;

  function onSubmit() {
    if (!canSubmit) return;
    // TODO (real Clerk): signIn.create + prepareFirstFactor with reset_password_email_code
    fire('success');
    navigation.navigate('ForgotPasswordConfirm', {
      credential: credential.trim(),
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
        </View>

        <View style={styles.body}>
          <Text style={[typography.h1, styles.title, { color: T.ink }]}>
            Reset your password
          </Text>
          <Text style={[styles.sub, { color: T.ink2 }]}>
            Enter the phone or email on your account.
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
            label="Send reset link"
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            onPress={onSubmit}
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
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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

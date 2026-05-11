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

import { AuthInputField } from '../../components/foundation/AuthInputField';
import { PillBtn } from '../../components/foundation/PillBtn';
import { ProgressDots } from '../../components/foundation/ProgressDots';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep4ScreenProps } from '../../navigation/types';

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpStep4Screen({
  navigation,
  route,
}: SignUpStep4ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { credential, name, handle } = route.params;

  const [password, setPassword] = useState('');

  const meetsLength = password.length >= MIN_PASSWORD_LENGTH;
  const canContinue = meetsLength;

  function onContinue() {
    if (!canContinue) return;
    // TODO (real Clerk): signUp.update({ password }) before navigating.
    fire('success');
    navigation.navigate('SignUpStep5', {
      credential,
      name,
      handle,
      password,
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
              onChange={setPassword}
              type="password"
              autoFocus
              placeholder="••••••••"
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

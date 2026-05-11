/**
 * ForgotPasswordConfirmScreen — confirmation surface (R9-10).
 *
 * NO back arrow (R9-10) — the only exit is "Back to sign in." Icon adapts
 * to the credential type (mail glyph for emails, chatbubble for phones).
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PillBtn } from '../../components/foundation/PillBtn';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { ForgotPasswordConfirmScreenProps } from '../../navigation/types';

const FEEDBACK_DURATION_MS = 2000;

export default function ForgotPasswordConfirmScreen({
  navigation,
  route,
}: ForgotPasswordConfirmScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { credential } = route.params;
  const [resentVisible, setResentVisible] = useState(false);

  const isEmail = credential.includes('@');
  const title = isEmail ? 'Check your email' : 'Check your messages';

  function onResend() {
    fire('light');
    setResentVisible(true);
    setTimeout(() => setResentVisible(false), FEEDBACK_DURATION_MS);
    // TODO (real Clerk): re-trigger prepareFirstFactor for reset_password.
  }

  function onBackToSignIn() {
    fire('light');
    navigation.navigate('SignIn');
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: T.bg }]}
    >
      <View style={styles.body}>
        <View style={[styles.iconTile, { backgroundColor: T.bgSunken }]}>
          <Ionicons
            name={isEmail ? 'mail-outline' : 'chatbubble-outline'}
            size={28}
            color={T.ink2}
          />
        </View>

        <Text style={[typography.h1, styles.title, { color: T.ink }]}>
          {title}
        </Text>
        <Text style={[styles.sub, { color: T.ink2 }]}>
          {`We sent a reset link to ${credential}.`}
        </Text>

        <View style={styles.actions}>
          <PillBtn
            T={T}
            label="Back to sign in"
            variant="ghost"
            size="lg"
            onPress={onBackToSignIn}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resend reset link"
            hitSlop={8}
            onPress={onResend}
            style={styles.resendBtn}
          >
            <Text style={[styles.resendLabel, { color: T.ink3 }]}>
              {resentVisible ? 'Sent!' : "Didn't get it? Resend"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: radii.hero,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  resendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

/**
 * WelcomeScreen — onboarding entry screen (R9-1, R9-8).
 *
 * No progress dots, no back arrow. Centered layout with logo + tagline +
 * optional InviteContextBanner + "Get started" + "Sign in".
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InviteContextBanner } from '../../components/foundation/InviteContextBanner';
import { PillBtn } from '../../components/foundation/PillBtn';
import { colors, spacing, useHaptic } from '../../theme';
import type { WelcomeScreenProps } from '../../navigation/types';

export default function WelcomeScreen({
  navigation,
  route,
}: WelcomeScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const inviteContext = route?.params?.inviteContext ?? null;

  function onGetStarted() {
    fire('medium');
    navigation.navigate('SignUpStep1');
  }

  function onSignIn() {
    fire('light');
    navigation.navigate('SignIn');
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: T.bg }]}
    >
      <View style={styles.body}>
        <View style={styles.logoWrap}>
          <Text style={[styles.logo, { color: T.accent }]}>SyncUp</Text>
          <Text style={[styles.tagline, { color: T.ink2 }]}>
            Know when your people are free.
          </Text>
        </View>

        {inviteContext ? (
          <View style={styles.bannerWrap}>
            <InviteContextBanner T={T} inviteContext={inviteContext} />
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PillBtn
          T={T}
          label="Get started"
          variant="primary"
          size="lg"
          onPress={onGetStarted}
        />
        <View style={{ height: spacing.md }} />
        <PillBtn
          T={T}
          label="Sign in"
          variant="ghost"
          size="lg"
          onPress={onSignIn}
        />
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
    gap: spacing.lg,
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  bannerWrap: {
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});

/**
 * SignUpStep6Screen — availability nudge (R9-7, R9-8).
 *
 * Last sign-up step. Optional invite context boosts the prominence of
 * the "Skip for now" secondary action. QuicksetGrid renders the four
 * built-in presets — applying one here is a NUDGE only (no real edit),
 * the canonical surface is AvailabilityEditorScreen.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { InviteContextBanner } from '../../components/foundation/InviteContextBanner';
import { PillBtn } from '../../components/foundation/PillBtn';
import { ProgressDots } from '../../components/foundation/ProgressDots';
import {
  BUILTIN_QUICKSETS,
  QuicksetGrid,
} from '../../components/profile/QuicksetGrid';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep6ScreenProps } from '../../navigation/types';

export default function SignUpStep6Screen({
  navigation,
  route,
}: SignUpStep6ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const inviteContext = route.params?.inviteContext ?? null;

  function finishOnboarding() {
    fire('medium');
    navigation.navigate('PushPermissionGate');
  }

  function onSetAvailability() {
    finishOnboarding();
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: T.bg }]}
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
          <ProgressDots T={T} total={6} current={6} />
        </View>
      </View>

      <View style={styles.body}>
        {inviteContext ? (
          <View style={styles.bannerWrap}>
            <InviteContextBanner T={T} inviteContext={inviteContext} />
          </View>
        ) : null}

        <Text style={[typography.h1, styles.title, { color: T.ink }]}>
          Set your availability
        </Text>
        <Text style={[styles.sub, { color: T.ink2 }]}>
          {inviteContext
            ? 'You can always set this up later.'
            : "Let friends know when you're free."}
        </Text>

        {/* Quickset apply on this screen is a nudge only. Real availability
            editing is in AvailabilityEditorScreen. */}
        <View style={styles.gridWrap}>
          <QuicksetGrid
            T={T}
            quicksets={[...BUILTIN_QUICKSETS]}
            onApply={() => {
              // Nudge — no real availability mutation here.
            }}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <PillBtn
          T={T}
          label="Set availability"
          variant="primary"
          size="lg"
          onPress={onSetAvailability}
        />
        <View style={{ height: spacing.md }} />
        <PillBtn
          T={T}
          label="Skip for now"
          variant="ghost"
          size="lg"
          onPress={finishOnboarding}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  bannerWrap: {
    marginBottom: spacing.lg,
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
  gridWrap: {
    marginTop: spacing['3xl'],
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

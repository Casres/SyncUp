/**
 * SignUpStep5Screen — profile photo (R9-7 — always skippable).
 *
 * Image picker integration is simulated here (we don't pull in
 * expo-image-picker just for this build). Tapping the avatar well
 * flips a local `chosen` flag; CTA label switches from "Choose photo"
 * to "Continue" once a photo has been "picked".
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
import { ProgressDots } from '../../components/foundation/ProgressDots';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep5ScreenProps } from '../../navigation/types';

export default function SignUpStep5Screen({
  navigation,
}: SignUpStep5ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const [chosen, setChosen] = useState(false);

  function pickPhoto() {
    // TODO (real): expo-image-picker.launchImageLibraryAsync(...) and
    // store the asset uri to upload after Clerk session is active.
    fire('light');
    setChosen(true);
  }

  function advance() {
    fire('medium');
    navigation.navigate('SignUpStep6', {});
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
          <ProgressDots T={T} total={6} current={5} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[typography.h1, styles.title, { color: T.ink }]}>
          Add a photo
        </Text>
        <Text style={[styles.sub, { color: T.ink2 }]}>
          Help friends recognize you.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose profile photo"
          onPress={pickPhoto}
          style={[
            styles.well,
            {
              backgroundColor: chosen ? T.accentSoft : T.bgSunken,
              borderColor: chosen ? T.accent : T.hair,
            },
          ]}
        >
          <Ionicons
            name={chosen ? 'image' : 'person'}
            size={36}
            color={chosen ? T.accent : T.ink3}
          />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <PillBtn
          T={T}
          label={chosen ? 'Continue' : 'Choose photo'}
          variant="primary"
          size="lg"
          onPress={chosen ? advance : pickPhoto}
        />
        <View style={{ height: spacing.md }} />
        <PillBtn
          T={T}
          label="Skip for now"
          variant="ghost"
          size="lg"
          onPress={advance}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  sub: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  well: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['4xl'],
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

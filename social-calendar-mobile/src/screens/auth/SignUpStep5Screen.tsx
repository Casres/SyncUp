/**
 * SignUpStep5Screen — profile photo (R9-7 — always skippable).
 *
 * Tapping the avatar well opens the OS photo library via
 * expo-image-picker. The chosen asset URI is stashed in the transient
 * signupAvatarStore (local-only — no network here; the Clerk session
 * isn't active yet). YoureIn uploads it after setActive(). The CTA label
 * switches from "Choose photo" to "Continue" once a photo is picked.
 */

import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { PillBtn } from '../../components/foundation/PillBtn';
import { ProgressDots } from '../../components/foundation/ProgressDots';
import { colors, spacing, typography, useHaptic } from '../../theme';
import type { SignUpStep5ScreenProps } from '../../navigation/types';
import { getSignupAvatarUri, setSignupAvatarUri } from './signupAvatarStore';

export default function SignUpStep5Screen({
  navigation,
}: SignUpStep5ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  // Seed from the store so the preview survives a back-nav from Step 6.
  const [uri, setUri] = useState<string | null>(() => getSignupAvatarUri());
  const chosen = uri !== null;

  async function pickPhoto() {
    fire('light');
    // Don't upload during signup — the Clerk session isn't active yet.
    // Stash the URI; YoureInScreen uploads it after setActive().
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (!asset) return;
    setSignupAvatarUri(asset.uri);
    setUri(asset.uri);
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
          accessibilityLabel={chosen ? 'Change profile photo' : 'Choose profile photo'}
          onPress={pickPhoto}
          style={[
            styles.well,
            {
              backgroundColor: chosen ? T.accentSoft : T.bgSunken,
              borderColor: chosen ? T.accent : T.hair,
            },
          ]}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.wellImage} resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={36} color={T.ink3} />
          )}
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
    overflow: 'hidden',
  },
  wellImage: {
    width: 80,
    height: 80,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});

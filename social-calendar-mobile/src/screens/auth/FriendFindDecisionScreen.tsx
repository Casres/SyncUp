/**
 * FriendFindDecisionScreen — R15-10 three-branch decision screen.
 *
 * "Find friends" → requests Contacts permission → granted: FriendFindMatches,
 *                                                  denied:  FriendFindNoWorries
 * "Not now"      → FriendFindNoWorries (no system prompt)
 * "Skip"         → FriendFindNoWorries (no system prompt)
 *
 * All three outcomes use replace() so the back stack never contains this screen.
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
import * as Contacts from 'expo-contacts';

import { PillBtn } from '../../components/foundation/PillBtn';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { FriendFindDecisionScreenProps } from '../../navigation/types';

export default function FriendFindDecisionScreen({
  navigation,
}: FriendFindDecisionScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  async function onFindFriends() {
    fire('light');
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      navigation.replace('FriendFindMatches');
    } else {
      navigation.replace('FriendFindNoWorries');
    }
  }

  function onNotNow() {
    fire('light');
    navigation.replace('FriendFindNoWorries');
  }

  function onSkip() {
    fire('light');
    navigation.replace('FriendFindNoWorries');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Hero icon */}
      <View style={[styles.hero, { backgroundColor: T.accentSoft, borderRadius: radii.card }]}>
        <Ionicons name="people-outline" size={24} color={T.accent} accessibilityElementsHidden />
      </View>

      {/* Heading + sub */}
      <Text
        style={[typography.h2, styles.heading, { color: T.ink }]}
        accessibilityRole="header"
      >
        Find friends from your contacts.
      </Text>
      <Text style={[styles.sub, { color: T.ink2 }]}>
        {"We'll match contacts who already have SyncUp. Nothing is uploaded."}
      </Text>

      <View style={{ flex: 1 }} />

      {/* CTA stack */}
      <View style={styles.ctas}>
        <PillBtn T={T} label="Find friends" variant="primary" size="lg" onPress={onFindFriends} />
        <View style={{ height: spacing.md }} />
        <PillBtn T={T} label="Not now" variant="ghost" size="lg" onPress={onNotNow} />
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip finding friends"
          hitSlop={8}
          style={styles.skipWrap}
        >
          <Text style={[styles.skipLabel, { color: T.ink3 }]}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 64,
  },
  heading: {
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  ctas: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  skipWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});

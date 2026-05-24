/**
 * FriendFindNoWorriesScreen — R15-10 unified denial/skip destination.
 *
 * Reached via: "Not now", "Skip", or Contacts permission denied.
 * No back arrow (gestureEnabled: false, headerShown: false in navigator).
 * "Got it" → YoureIn.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PillBtn } from '../../components/foundation/PillBtn';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { FriendFindNoWorriesScreenProps } from '../../navigation/types';

export default function FriendFindNoWorriesScreen({
  navigation,
}: FriendFindNoWorriesScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  function onGotIt() {
    fire('light');
    navigation.replace('YoureIn');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Lime checkmark badge */}
      <View style={[styles.badge, { backgroundColor: T.lime, borderRadius: radii.pill }]}>
        <Ionicons name="checkmark" size={24} color={T.bg} />
      </View>

      <Text style={[typography.h2, styles.heading, { color: T.ink }]}>
        No worries.
      </Text>
      <Text style={[styles.body, { color: T.ink2 }]}>
        {"You can add contacts permission anytime in Settings. For now, you can find friends by searching their @handle."}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.ctas}>
        <PillBtn T={T} label="Got it" variant="ghost" size="lg" onPress={onGotIt} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  badge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 64,
  },
  heading: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  ctas: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
});

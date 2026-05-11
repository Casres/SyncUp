/**
 * ConfirmScreen — Create Event Flow / Confirm.
 *
 * SCREENS.md Confirm layout:
 *  1. FlowHeader collapsed; close (X) on right
 *  2. ConfirmCard with the draft summary
 *  3. Action row: "View event" primary, "Back to home" secondary
 *
 * Haptic: success fires on screen mount (event created — canonical mapping).
 *
 * Hard rules: Hard Rule 3 (no emoji / generic gradients in hero — ConfirmCard
 * uses a glyph badge, not gradient).
 */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ConfirmCard, PillBtn } from '../../components';
import { colors, radii, spacing, useHaptic } from '../../theme';
import type { ConfirmScreenProps } from '../../navigation/types';
import { useDraft } from './draftStore';

export default function ConfirmScreen({
  navigation,
  route,
}: ConfirmScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const draft = useDraft();
  const { eventId } = route.params;

  useEffect(() => {
    fire('success');
  }, [fire]);

  const dismissModal = (): void => {
    navigation.getParent()?.goBack();
  };

  const viewEvent = (): void => {
    navigation.getParent()?.goBack();
    navigation.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'EventDetail', params: { eventId } },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <View style={styles.headerRow}>
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={dismissModal}
          hitSlop={8}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: T.bgSunken, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 6l12 12M18 6L6 18"
              stroke={T.ink}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ConfirmCard T={T} draft={draft} />
      </ScrollView>

      <View style={[styles.ctaRow, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}>
        <PillBtn T={T} label="View event" variant="primary" size="lg" onPress={viewEvent} />
        <PillBtn T={T} label="Back to home" variant="ghost" size="md" onPress={dismissModal} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});

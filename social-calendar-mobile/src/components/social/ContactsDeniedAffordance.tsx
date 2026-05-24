/**
 * ContactsDeniedAffordance — R15-11.
 *
 * Renders when iOS Contacts permission is denied. Shows a single-line
 * nudge with a tappable "Turn on contacts" phrase that deep-links to
 * Settings. Light haptic on tap. Never renders when status is
 * 'granted' or 'not_determined'.
 */

import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface ContactsDeniedAffordanceProps {
  T?: Theme;
}

export function ContactsDeniedAffordance({
  T = colors.light,
}: ContactsDeniedAffordanceProps): React.JSX.Element {
  const fire = useHaptic();

  function onTurnOn() {
    fire('light');
    void Linking.openSettings();
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { color: T.ink3 }]}>
        {'Find friends faster — '}
        <Pressable
          onPress={onTurnOn}
          accessibilityRole="button"
          accessibilityLabel="Turn on contacts permission in Settings"
          hitSlop={8}
        >
          <Text style={[styles.link, { color: T.accent }]}>Turn on contacts</Text>
        </Pressable>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    marginTop: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  link: {
    fontSize: 12,
    fontWeight: '500',
  },
});

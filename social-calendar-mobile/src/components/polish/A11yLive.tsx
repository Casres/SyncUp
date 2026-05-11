/**
 * A11yLive — Visually hidden screen-reader announcement region.
 *
 * Used for ephemeral status that has no visible toast (e.g. "5 days marked free"
 * after a Quickset). A-10.
 *
 * RN equivalent of an `aria-live` region: an off-screen <Text> with
 * `accessibilityLiveRegion="polite"` so VoiceOver / TalkBack picks up the
 * change.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface A11yLiveProps {
  message: string;
  /** Polite announcements queue; assertive interrupts. Default polite. */
  level?: 'polite' | 'assertive';
}

export function A11yLive({ message, level = 'polite' }: A11yLiveProps): React.JSX.Element {
  return (
    <View pointerEvents="none" style={styles.hidden} accessibilityElementsHidden={false}>
      <Text accessibilityLiveRegion={level} accessibilityRole="alert">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    left: -9999,
    top: -9999,
  },
});

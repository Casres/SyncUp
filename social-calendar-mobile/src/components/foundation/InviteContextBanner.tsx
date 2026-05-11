/**
 * InviteContextBanner — surfaces invite-first context during onboarding
 * (R9-8). Renders nothing when no invite context is present.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type Theme = typeof colors.light;

export interface InviteContext {
  inviterName: string;
  eventName?: string;
}

export interface InviteContextBannerProps {
  T?: Theme;
  inviteContext?: InviteContext | null;
}

export function InviteContextBanner({
  T = colors.light,
  inviteContext,
}: InviteContextBannerProps): React.JSX.Element | null {
  if (!inviteContext) return null;

  const { inviterName, eventName } = inviteContext;
  const text = eventName
    ? `${inviterName} invited you to ${eventName}.`
    : `${inviterName} invited you.`;

  return (
    <View
      accessibilityRole="text"
      style={[styles.banner, { backgroundColor: T.accentSoft }]}
    >
      <Text style={[styles.text, { color: T.accent }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

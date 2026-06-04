/**
 * MessageInput — the thread composer bar (R17-8).
 *
 * Text-only + native emoji (the OS keyboard supplies emoji — no custom picker).
 * The paper-plane send button is HIDDEN while the field is empty and appears
 * once there's non-whitespace content. Send fires a `medium` haptic.
 */

import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography, useHaptic } from '../../theme';

type Theme = typeof colors.light;

export interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Called with the trimmed content when send is pressed. */
  onSend: (content: string) => void;
  /** Disables send while a previous send is in flight. */
  sending?: boolean;
  T?: Theme;
}

export function MessageInput({
  value,
  onChangeText,
  onSend,
  sending = false,
  T = colors.light,
}: MessageInputProps): React.JSX.Element {
  const fire = useHaptic();
  const canSend = value.trim().length > 0 && !sending;

  const handleSend = () => {
    const content = value.trim();
    if (content.length === 0) return;
    fire('medium');
    onSend(content);
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: T.bgElevated, borderTopColor: T.hair },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Message"
        placeholderTextColor={T.ink3}
        multiline
        style={[
          typography.body,
          styles.input,
          { color: T.ink, backgroundColor: T.bgSunken },
        ]}
      />
      {canSend ? (
        <Pressable
          onPress={handleSend}
          style={[styles.send, { backgroundColor: T.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          hitSlop={8}
        >
          <PaperPlane />
        </Pressable>
      ) : null}
    </View>
  );
}

function PaperPlane(): React.JSX.Element {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11l18-8-8 18-2.5-7.5L3 11z"
        stroke="#FFFFFF"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.input,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

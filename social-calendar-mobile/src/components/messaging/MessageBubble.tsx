/**
 * MessageBubble — one chat message (R17-5).
 *
 * Sent → right-aligned, accent fill, white ink.
 * Received → left-aligned, bgElevated fill, ink.
 * Sender label (caption, ink3) sits ABOVE the bubble for group/event threads
 * only — omitted for 1:1 (R17-5). Optional timestamp (micro, ink3) below, shown
 * by the parent per the gap-gated / date-aware rule (R17-6).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type Theme = typeof colors.light;

export interface MessageBubbleProps {
  content: string;
  /** True when the current user is the sender. */
  mine: boolean;
  /** Sender display name — only rendered when `showSender` is true. */
  senderName?: string;
  /** Group/event threads pass true; 1:1 passes false/omitted (R17-5). */
  showSender?: boolean;
  /** Pre-formatted timestamp string; null/undefined hides it (R17-6). */
  timestamp?: string | null;
  T?: Theme;
}

export function MessageBubble({
  content,
  mine,
  senderName,
  showSender = false,
  timestamp,
  T = colors.light,
}: MessageBubbleProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.row,
        { alignItems: mine ? 'flex-end' : 'flex-start' },
      ]}
    >
      {showSender && !mine && senderName ? (
        <Text style={[typography.caption, styles.sender, { color: T.ink3 }]}>
          {senderName}
        </Text>
      ) : null}

      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: T.accent, borderTopRightRadius: radii.inline }
            : {
                backgroundColor: T.bgElevated,
                borderTopLeftRadius: radii.inline,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.hair,
              },
        ]}
      >
        <Text
          style={[
            typography.body,
            { color: mine ? '#FFFFFF' : T.ink },
          ]}
        >
          {content}
        </Text>
      </View>

      {timestamp ? (
        <Text style={[typography.micro, styles.ts, { color: T.ink3 }]}>
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginVertical: spacing.xs / 2,
  },
  sender: {
    marginBottom: 2,
    marginHorizontal: spacing.sm,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
  },
  ts: {
    marginTop: 2,
    marginHorizontal: spacing.sm,
  },
});

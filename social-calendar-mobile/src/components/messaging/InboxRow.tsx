/**
 * InboxRow — one conversation row in the Messages segment (R17-2).
 *
 * Layout: type-specific avatar (R17-3) · name + 1-line preview · timestamp +
 * unread badge. Unread rows get a weight treatment (bolder name, ink preview,
 * accent dot). Badge caps at "9+" with an accent fill.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConversationAvatar } from './ConversationAvatar';
import { formatInboxTime } from './format';
import { colors, radii, spacing, typography } from '../../theme';
import type { InboxItem } from '../../api/conversations.types';

type Theme = typeof colors.light;

export interface InboxRowProps {
  item: InboxItem;
  currentUserId: string;
  onPress: () => void;
  T?: Theme;
}

export function InboxRow({
  item,
  currentUserId,
  onPress,
  T = colors.light,
}: InboxRowProps): React.JSX.Element {
  const unread = item.unreadCount > 0;
  const badge = item.unreadCount > 9 ? '9+' : String(item.unreadCount);
  const preview = item.lastMessage?.content ?? 'No messages yet';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? T.bgSunken : 'transparent' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${unread ? `, ${item.unreadCount} unread` : ''}`}
    >
      <ConversationAvatar
        type={item.type}
        title={item.title}
        participants={item.participants}
        currentUserId={currentUserId}
        T={T}
      />

      <View style={styles.body}>
        <View style={styles.line}>
          <Text
            numberOfLines={1}
            style={[
              unread ? typography.bodyMed : typography.body,
              styles.title,
              { color: T.ink },
            ]}
          >
            {item.title}
          </Text>
          <Text style={[typography.micro, { color: unread ? T.accent : T.ink3 }]}>
            {formatInboxTime(item.lastMessageAt)}
          </Text>
        </View>

        <View style={styles.line}>
          <Text
            numberOfLines={1}
            style={[
              typography.caption,
              styles.preview,
              { color: unread ? T.ink2 : T.ink3 },
            ]}
          >
            {preview}
          </Text>
          {unread ? (
            <View style={[styles.badge, { backgroundColor: T.accent }]}>
              <Text style={[typography.micro, styles.badgeText]}>{badge}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

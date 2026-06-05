/**
 * InboxPane — the Messages segment body of the Friends-tab carousel
 * (R17-1 / R17-2).
 *
 * Extracted from the former MessagesScreen so the inbox renders inside the
 * FriendsList SegmentedSwitcher (Messages is a segment, NOT a route — R17-1).
 * Lists every non-archived conversation newest-first. Spinner-only loading
 * (R5-2), NO-CTA empty state (R17-2). The host owns the FlowHeader; row taps
 * are routed by the host via `onOpenConversation`.
 */

import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { EmptyMessages } from '../emptyStates/EmptyMessages';
import { ErrorState } from '../polish/ErrorState';
import { InboxRow } from './InboxRow';
import { useInbox } from '../../api/conversations';
import { useMyProfile } from '../../api/profile';
import { colors } from '../../theme';
import type { InboxItem } from '../../api/conversations.types';

type Theme = typeof colors.light;

export interface InboxPaneProps {
  T?: Theme;
  onOpenConversation: (item: InboxItem) => void;
}

export function InboxPane({
  T = colors.light,
  onOpenConversation,
}: InboxPaneProps): React.JSX.Element {
  const { data: me } = useMyProfile();
  const { data: conversations, isLoading, error, refetch } = useInbox();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.accent} />
      </View>
    );
  }
  if (error) {
    return <ErrorState T={T} kind="server" onPrimary={() => void refetch()} />;
  }
  if (!conversations || conversations.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyMessages T={T} />
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <InboxRow
          T={T}
          item={item}
          currentUserId={me?.id ?? ''}
          onPress={() => onOpenConversation(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

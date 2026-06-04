/**
 * MessagesScreen — the inbox (R17-1 / R17-2).
 *
 * The Messages surface of the Friends tab. Lists every non-archived
 * conversation newest-first. Spinner-only loading (R5-2), NO-CTA empty state
 * (R17-2). Tapping a row routes by type: DM/group → MessageThread (this stack),
 * event → HomeTab → EventChat (D2).
 *
 * NOTE (R17-1 carousel): the locked IA hosts Friends · Groups · Messages as a
 * single top-level SegmentedSwitcher carousel on the Friends tab. That
 * consolidation (folding GroupsList + this inbox under one switcher) is the
 * remaining IA step; this screen is the Messages surface it will slot into.
 */

import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyMessages } from '../../components/emptyStates/EmptyMessages';
import { ErrorState, FlowHeader } from '../../components';
import { InboxRow } from '../../components/messaging/InboxRow';
import { useInbox } from '../../api/conversations';
import { useMyProfile } from '../../api/profile';
import { colors, useHaptic } from '../../theme';
import type { MessagesScreenProps } from '../../navigation/types';
import type { InboxItem } from '../../api/conversations.types';

export default function MessagesScreen({
  navigation,
}: MessagesScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { data: me } = useMyProfile();
  const { data: conversations, isLoading, error, refetch } = useInbox();

  const openConversation = (item: InboxItem) => {
    fire('light');
    if (item.type === 'EVENT' && item.linkedEventId) {
      navigation.navigate('HomeTab', {
        screen: 'EventChat',
        params: { conversationId: item.id, eventId: item.linkedEventId },
      });
      return;
    }
    navigation.navigate('MessageThread', {
      conversationId: item.id,
      type: item.type === 'GROUP' ? 'GROUP' : 'DIRECT',
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]} edges={['top']}>
      <FlowHeader title="Messages" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : error ? (
        <ErrorState T={T} kind="server" onPrimary={() => void refetch()} />
      ) : !conversations || conversations.length === 0 ? (
        <View style={styles.center}>
          <EmptyMessages T={T} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <InboxRow
              T={T}
              item={item}
              currentUserId={me?.id ?? ''}
              onPress={() => openConversation(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

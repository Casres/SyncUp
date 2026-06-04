/**
 * ChatThreadView — the shared thread surface behind both MessageThreadScreen
 * (DM / group, FriendsStack) and EventChatScreen (HomeStack). R17-4…R17-8.
 *
 * Messages arrive newest-first from `useThread`; we render them in an INVERTED
 * FlatList so index 0 sits at the bottom and pagination (`onEndReached`) pulls
 * older history at the top. The composer is pinned below via KeyboardAvoiding.
 *
 * Read cursor (D1): on mount and whenever the newest message changes, the
 * viewer's cursor is advanced to that message so the inbox unread badge clears.
 *
 * Typing indicator (R17-7): `typingNames` is local component state — the socket
 * bridge (`chat:typing` relay) populates it when realtime lands. It is never
 * written to a global store (CLAUDE.md state rule).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ThreadHeader } from './ThreadHeader';
import { TypingDots } from './TypingDots';
import { formatThreadTime, shouldShowTimestamp } from './format';
import {
  flattenThread,
  threadConversation,
  useMarkRead,
  useSendMessage,
  useThread,
} from '../../api/conversations';
import { useMyProfile } from '../../api/profile';
import { colors, spacing } from '../../theme';
import type { ConversationSummary, Message } from '../../api/conversations.types';

type Theme = typeof colors.light;

export interface ChatThreadViewProps {
  conversationId: string;
  onBack: () => void;
  /** Derives the header subtitle from the loaded conversation (per R17-4). */
  subtitleFor?: (conv: ConversationSummary) => string | undefined;
  T?: Theme;
}

export function ChatThreadView({
  conversationId,
  onBack,
  subtitleFor,
  T = colors.light,
}: ChatThreadViewProps): React.JSX.Element {
  const { data: me } = useMyProfile();
  const thread = useThread(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkRead(conversationId);

  const [draft, setDraft] = useState('');
  // Populated by the socket `chat:typing` relay once realtime is wired.
  const [typingNames] = useState<string[]>([]);

  const messages = flattenThread(thread.data);
  const conv = threadConversation(thread.data);
  const newestId = messages[0]?.id;

  // Advance the read cursor to the newest message (D1).
  const lastMarked = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (newestId && newestId !== lastMarked.current) {
      lastMarked.current = newestId;
      markRead.mutate(newestId);
    }
  }, [newestId, markRead]);

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    // Older neighbour is the NEXT index in a newest-first array.
    const olderIso = messages[index + 1]?.sentAt;
    const showTs = shouldShowTimestamp(item.sentAt, olderIso);
    return (
      <MessageBubble
        T={T}
        content={item.content}
        mine={item.sender.id === me?.id}
        senderName={item.sender.displayName}
        showSender={conv?.type !== 'DIRECT'}
        timestamp={showTs ? formatThreadTime(item.sentAt) : null}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: T.bg }]} edges={['top']}>
      <ThreadHeader
        T={T}
        title={conv?.title ?? '…'}
        subtitle={conv && subtitleFor ? subtitleFor(conv) : undefined}
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {thread.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={T.accent} />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              typingNames.length > 0 ? <TypingDots T={T} /> : null
            }
            onEndReached={() => {
              if (thread.hasNextPage && !thread.isFetchingNextPage) {
                void thread.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
          />
        )}

        <MessageInput
          T={T}
          value={draft}
          onChangeText={setDraft}
          sending={send.isPending}
          onSend={(content) => {
            send.mutate(content);
            setDraft('');
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});

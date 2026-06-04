/**
 * MessageThreadScreen — DM + group chat thread (FriendsStack, R18 / D2).
 *
 * Thin wrapper over ChatThreadView; the conversation `type` from the route
 * params only affects the header subtitle (group → member count).
 */

import React from 'react';

import { ChatThreadView } from '../../components/messaging/ChatThreadView';
import { colors } from '../../theme';
import type { MessageThreadScreenProps } from '../../navigation/types';

export default function MessageThreadScreen({
  route,
  navigation,
}: MessageThreadScreenProps): React.JSX.Element {
  const { conversationId } = route.params;
  return (
    <ChatThreadView
      T={colors.light}
      conversationId={conversationId}
      onBack={() => navigation.goBack()}
      subtitleFor={(conv) =>
        conv.type === 'GROUP'
          ? `${conv.participants.length} members`
          : undefined
      }
    />
  );
}

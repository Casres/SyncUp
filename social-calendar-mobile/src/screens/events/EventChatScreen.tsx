/**
 * EventChatScreen — event chat thread (HomeStack, R18 / D2).
 *
 * Thin wrapper over ChatThreadView. Lives in HomeStack because event surfaces
 * hang off the Home tab; reached from EventDetail (host-enabled) or a notif.
 */

import React from 'react';

import { ChatThreadView } from '../../components/messaging/ChatThreadView';
import { colors } from '../../theme';
import type { EventChatScreenProps } from '../../navigation/types';

export default function EventChatScreen({
  route,
  navigation,
}: EventChatScreenProps): React.JSX.Element {
  const { conversationId } = route.params;
  return (
    <ChatThreadView
      T={colors.light}
      conversationId={conversationId}
      onBack={() => navigation.goBack()}
      subtitleFor={() => 'Event chat'}
    />
  );
}

/**
 * RealtimeProvider — owns the chat socket lifecycle and the GLOBAL chat
 * subscriptions (R18 realtime client).
 *
 * Lifecycle: a single socket is created while the Clerk session is signed in
 * and torn down on sign-out. It is exposed via context so per-thread hooks
 * (`useChatRoom`) can join rooms and relay typing without re-creating it.
 *
 * Global subscriptions (active app-wide, independent of which screen is open):
 *   - `chat:message:new`      → push into the thread query cache + invalidate
 *                               the inbox (preview + unread badge re-sync).
 *   - `chat:conversation:new` → invalidate the inbox.
 *   - `notif:new`             → invalidate the notifications query so the Home
 *                               bell's unread dot + the NotifSheet update live
 *                               (message notifs dispatch as GROUP_ACTIVITY).
 *   - `notif:dismissed`       → drop the row from the notifications cache
 *                               (multi-device dismiss sync).
 *
 * HARD RULE (CLAUDE.md): socket pushes update the React Query cache ONLY —
 * never a global store. Typing events are local component state (useChatRoom).
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '../api/queryKeys';
import { createChatSocket } from './socket';
import type { ChatSocket } from './events.types';
import type { Message, ThreadResponse } from '../api/conversations.types';
import type { Notif } from '../../../TYPES';

const RealtimeContext = createContext<ChatSocket | null>(null);

/** The live chat socket, or null while signed out / connecting. */
export function useChatSocket(): ChatSocket | null {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { isSignedIn, getToken } = useAuth();
  const qc = useQueryClient();

  // Keep the auth callback fresh without re-creating the socket: the socket's
  // `auth` function reads this ref on every (re)connection attempt.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [socket, setSocket] = useState<ChatSocket | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    const s = createChatSocket(() => getTokenRef.current());

    const handleMessage = ({
      conversationId,
      message,
    }: {
      conversationId: string;
      message: Message;
    }) => {
      // Prepend to the newest page (messages are newest-first). Dedupe by id
      // so the sender's own REST-confirmed message isn't doubled when it also
      // arrives over the socket.
      qc.setQueryData<InfiniteData<ThreadResponse>>(
        queryKeys.conversations.thread(conversationId),
        (old) => {
          if (!old) return old;
          const seen = old.pages.some((p) =>
            p.messages.some((m) => m.id === message.id),
          );
          if (seen) return old;
          const [first, ...rest] = old.pages;
          if (!first) return old;
          return {
            ...old,
            pages: [
              { ...first, messages: [message, ...first.messages] },
              ...rest,
            ],
          };
        },
      );
      // Re-sync the inbox preview + unread count.
      void qc.invalidateQueries({ queryKey: queryKeys.conversations.inbox() });
    };

    const handleConversationNew = () => {
      void qc.invalidateQueries({ queryKey: queryKeys.conversations.inbox() });
    };

    // A new in-app notification → re-sync the notifications query so the Home
    // bell's unread dot + the NotifSheet update live. The Home tab stays
    // mounted, so invalidate refetches immediately rather than waiting out the
    // 60s staleTime. Invalidate (not a manual prepend) keeps the backend→mobile
    // shape mapping in one place (getNotifications / toMobileNotif).
    const handleNotifNew = () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    };

    // A dismissal elsewhere → optimistically drop the row (multi-device sync).
    const handleNotifDismissed = ({
      notificationId,
    }: {
      notificationId: string;
    }) => {
      qc.setQueryData<Notif[]>(
        queryKeys.notifications.all(),
        (prev) => prev?.filter((n) => n.id !== notificationId) ?? prev,
      );
    };

    s.on('chat:message:new', handleMessage);
    s.on('chat:conversation:new', handleConversationNew);
    s.on('notif:new', handleNotifNew);
    s.on('notif:dismissed', handleNotifDismissed);
    s.connect();
    setSocket(s);

    return () => {
      s.off('chat:message:new', handleMessage);
      s.off('chat:conversation:new', handleConversationNew);
      s.off('notif:new', handleNotifNew);
      s.off('notif:dismissed', handleNotifDismissed);
      s.disconnect();
      setSocket(null);
    };
  }, [isSignedIn, qc]);

  return (
    <RealtimeContext.Provider value={socket}>
      {children}
    </RealtimeContext.Provider>
  );
}

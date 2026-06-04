/**
 * useChatRoom — per-thread realtime wiring (R18, R17-7).
 *
 * Mounted by a thread screen (via ChatThreadView). On mount it joins the
 * conversation's socket room so live `chat:message:new` pushes reach the global
 * handler in RealtimeProvider; on unmount it leaves. It also owns the typing
 * relay both directions:
 *
 *   - INBOUND  `chat:typing` → `typingUserIds` (local state, never a store).
 *     Each remote typer auto-expires after TYPING_EXPIRY_MS in case a `stop`
 *     is dropped.
 *   - OUTBOUND `markTyping()` (call per keystroke) emits `chat:typing:start`
 *     once, then debounces a `chat:typing:stop` TYPING_DEBOUNCE_MS after the
 *     last keystroke. `stopTyping()` forces an immediate stop (e.g. on send).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useChatSocket } from './RealtimeProvider';

const TYPING_DEBOUNCE_MS = 3000;
const TYPING_EXPIRY_MS = 6000;

export interface ChatRoom {
  /** User ids currently typing in this thread (excludes the local user). */
  typingUserIds: string[];
  /** Call on each keystroke; manages start + debounced stop emission. */
  markTyping: () => void;
  /** Force-stop the local typing relay immediately (e.g. on send). */
  stopTyping: () => void;
}

export function useChatRoom(conversationId: string): ChatRoom {
  const socket = useChatSocket();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  // Per-remote-user expiry timers for inbound typing.
  const expiryRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  // Outbound typing debounce state.
  const localTypingRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('chat:join', { conversationId });

    const handleTyping = ({
      conversationId: cid,
      userId,
      isTyping,
    }: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (cid !== conversationId) return;
      const timers = expiryRef.current;
      const existing = timers.get(userId);
      if (existing) clearTimeout(existing);

      if (isTyping) {
        setTypingUserIds((prev) =>
          prev.includes(userId) ? prev : [...prev, userId],
        );
        timers.set(
          userId,
          setTimeout(() => {
            timers.delete(userId);
            setTypingUserIds((prev) => prev.filter((id) => id !== userId));
          }, TYPING_EXPIRY_MS),
        );
      } else {
        timers.delete(userId);
        setTypingUserIds((prev) => prev.filter((id) => id !== userId));
      }
    };

    socket.on('chat:typing', handleTyping);

    return () => {
      socket.off('chat:typing', handleTyping);
      socket.emit('chat:leave', { conversationId });

      expiryRef.current.forEach((t) => clearTimeout(t));
      expiryRef.current.clear();
      setTypingUserIds([]);

      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (localTypingRef.current) {
        socket.emit('chat:typing:stop', { conversationId });
        localTypingRef.current = false;
      }
    };
  }, [socket, conversationId]);

  const markTyping = useCallback(() => {
    if (!socket) return;
    if (!localTypingRef.current) {
      localTypingRef.current = true;
      socket.emit('chat:typing:start', { conversationId });
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      localTypingRef.current = false;
      stopTimerRef.current = null;
      socket.emit('chat:typing:stop', { conversationId });
    }, TYPING_DEBOUNCE_MS);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket) return;
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (localTypingRef.current) {
      localTypingRef.current = false;
      socket.emit('chat:typing:stop', { conversationId });
    }
  }, [socket, conversationId]);

  return { typingUserIds, markTyping, stopTyping };
}

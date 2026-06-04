/**
 * Mobile mirror of the backend Socket.io event map (R18 realtime client).
 *
 * Source of truth: `social-calendar-api/src/types/socket.types.ts`. This file
 * is intentionally SCOPED TO THE CHAT EVENTS — the only domain with a mobile
 * realtime consumer today. When another domain wires up a socket client, add
 * its events here in lockstep with the backend map.
 *
 * Payload shapes must match the backend byte-for-byte. `Message` is reused
 * from the REST types so the socket-pushed message drops straight into the
 * React Query cache with no transform.
 */

import type { Message } from '../api/conversations.types';

/** Events the server pushes to this client. */
export interface ServerToClientEvents {
  /** A new message in a joined `conversation:{id}` room (R18 B5). */
  'chat:message:new': (data: {
    conversationId: string;
    message: Message;
  }) => void;
  /** The viewer was added to a new conversation → invalidate the inbox. */
  'chat:conversation:new': (data: { conversationId: string }) => void;
  /** Ephemeral typing relay for a room minus the typer (R17-7). */
  'chat:typing': (data: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
}

/** Events this client emits to the server. */
export interface ClientToServerEvents {
  /** Join a thread's room to receive its live events (server gates membership). */
  'chat:join': (data: { conversationId: string }) => void;
  /** Leave a thread's room on thread unmount. */
  'chat:leave': (data: { conversationId: string }) => void;
  /** Begin the typing relay (broadcast to the room minus this client). */
  'chat:typing:start': (data: { conversationId: string }) => void;
  /** End the typing relay. */
  'chat:typing:stop': (data: { conversationId: string }) => void;
}

/** The fully-typed socket instance shared across the realtime module. */
export type ChatSocket = import('socket.io-client').Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

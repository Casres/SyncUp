import type { Server, Socket } from 'socket.io';
import { prismaApp } from '../config/prisma.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Chat socket handlers (R18 B5).
 *
 * Each Conversation gets a room: `conversation:{id}`. A client must call
 * `chat:join` to receive that thread's live events; the server validates
 * participation BEFORE the join (mirrors `group:join` in groups.socket.ts —
 * silent no-op on non-participant, never leaking thread existence).
 *
 * Push events (emitted FROM the service, per SOCKETIO_HANDOFF "emit from
 * service" rule — NOT from here):
 *   - sendMessage(...)          → 'chat:message:new'  (to conversation:{id})
 *   - create/seed/join hooks    → 'chat:conversation:new' (to user:{id})
 *
 * Relayed HERE (ephemeral, never persisted — R17-7):
 *   - 'chat:typing:start' / 'chat:typing:stop' → 'chat:typing' to the room
 *     minus the typer.
 *
 * Read receipts: NONE in V1 (R17-14). The read cursor is advanced via the
 * REST `POST /conversations/:id/read` endpoint and is private to the viewer.
 */

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type IoSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Participation check for `chat:join`. Uses `prismaApp` inside a one-shot
 * transaction with `app.current_user_id` set so RLS gates apply — a
 * non-participant's lookup returns null because the CP own-rows policy hides
 * every row but the caller's own, and there is none for this conversation.
 */
async function isParticipant(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  try {
    const row = await prismaApp.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      return tx.conversationParticipant.findFirst({
        where: { conversationId, userId },
        select: { id: true },
      });
    });
    return row !== null;
  } catch {
    return false;
  }
}

export function registerChatHandlers(_io: IoServer, socket: IoSocket) {
  const userId = socket.data.user.id;

  socket.on('chat:join', async ({ conversationId }) => {
    if (typeof conversationId !== 'string' || conversationId.length === 0) {
      return;
    }
    if (await isParticipant(userId, conversationId)) {
      await socket.join(`conversation:${conversationId}`);
    }
    // Silent failure on non-participant — do not leak conversation existence.
  });

  socket.on('chat:leave', async ({ conversationId }) => {
    if (typeof conversationId !== 'string' || conversationId.length === 0) {
      return;
    }
    await socket.leave(`conversation:${conversationId}`);
  });

  // Typing relay. Trust the socket's authenticated user id, not the payload.
  // Broadcast to everyone in the room EXCEPT the typer (`socket.to(room)`).
  // Gated on room membership: a client can only be in the room if `chat:join`
  // validated participation, so we don't re-check here.
  socket.on('chat:typing:start', ({ conversationId }) => {
    if (typeof conversationId !== 'string' || conversationId.length === 0) {
      return;
    }
    if (!socket.rooms.has(`conversation:${conversationId}`)) return;
    socket.to(`conversation:${conversationId}`).emit('chat:typing', {
      conversationId,
      userId,
      isTyping: true,
    });
  });

  socket.on('chat:typing:stop', ({ conversationId }) => {
    if (typeof conversationId !== 'string' || conversationId.length === 0) {
      return;
    }
    if (!socket.rooms.has(`conversation:${conversationId}`)) return;
    socket.to(`conversation:${conversationId}`).emit('chat:typing', {
      conversationId,
      userId,
      isTyping: false,
    });
  });
}

import type { Server, Socket } from 'socket.io';
import { FriendshipStatus } from '@prisma/client';
import { redis } from '../config/redis.js';
import { prismaApp } from '../config/prisma.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Presence is the ONE place in the socket layer where we write directly
 * to Redis without going through a service. The presence record is best-
 * effort: a Redis outage degrades online indicators but never breaks the
 * socket connection or any other functionality.
 *
 * Redis key schema (documented in CLAUDE.md / SOCKETIO_HANDOFF.md):
 *
 *     presence:{userId}  →  JSON { socketId, connectedAt }   TTL: 60s
 */

const PRESENCE_KEY_PREFIX = 'presence:';
const PRESENCE_TTL_SECONDS = 60;

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

function presenceKey(userId: string) {
  return `${PRESENCE_KEY_PREFIX}${userId}`;
}

/**
 * Resolve the userIds of every accepted friend of the given user.
 *
 * RLS-aware: queries via `prismaApp` and runs `set_config('app.current_user_id', ...)`
 * inside a one-shot transaction so the friendship row is visible.
 *
 * Used to limit the audience of a presence:update emission — friends-only,
 * never strangers. Failure is non-fatal; we return [] and skip the
 * notification rather than crashing the connect/disconnect flow.
 */
async function getFriendUserIds(userId: string): Promise<string[]> {
  try {
    return await prismaApp.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      const rows = await tx.friendship.findMany({
        where: {
          deletedAt: null,
          status: FriendshipStatus.ACCEPTED,
          OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
        select: { initiatorId: true, receiverId: true },
      });
      return rows.map((r) =>
        r.initiatorId === userId ? r.receiverId : r.initiatorId,
      );
    });
  } catch {
    // Best-effort — presence updates degrade silently if the friend lookup fails.
    return [];
  }
}

async function emitPresenceToFriends(
  io: IoServer,
  userId: string,
  status: 'online' | 'offline',
) {
  const friendIds = await getFriendUserIds(userId);
  if (friendIds.length === 0) return;
  for (const friendId of friendIds) {
    io.to(`user:${friendId}`).emit('presence:update', { userId, status });
  }
}

/**
 * Write the user's presence record to Redis with a short TTL.
 * Called on connect and on every `presence:join` heartbeat.
 */
async function writePresence(userId: string, socketId: string) {
  try {
    await redis.set(
      presenceKey(userId),
      JSON.stringify({ socketId, connectedAt: new Date().toISOString() }),
      'EX',
      PRESENCE_TTL_SECONDS,
    );
  } catch {
    // Redis hiccup — degrade silently.
  }
}

async function clearPresence(userId: string) {
  try {
    await redis.del(presenceKey(userId));
  } catch {
    // Same — best effort.
  }
}

export function registerPresenceHandlers(io: IoServer, socket: IoSocket) {
  const userId = socket.data.user.id;

  // Every authenticated socket joins its own user-room. Other handlers
  // (events, friends, invites) target this room when pushing
  // user-scoped notifications. Done immediately so we don't miss pushes
  // that fire between connect and the first explicit presence:join.
  socket.join(`user:${userId}`);

  // Initial presence write + announce to friends.
  void (async () => {
    await writePresence(userId, socket.id);
    await emitPresenceToFriends(io, userId, 'online');
  })();

  /**
   * Heartbeat / explicit join. Refreshes the Redis TTL.
   *
   * The userId in the payload is informational — we always trust
   * `socket.data.user.id` (set by the auth middleware) over anything the
   * client sends, so a malicious client cannot spoof presence for others.
   */
  socket.on('presence:join', async () => {
    await writePresence(userId, socket.id);
    // Re-emit "online" — useful when a friend just came online and the
    // viewing client wants to refresh stale state.
    await emitPresenceToFriends(io, userId, 'online');
  });

  socket.on('presence:leave', async () => {
    await clearPresence(userId);
    await emitPresenceToFriends(io, userId, 'offline');
  });

  socket.on('disconnect', async () => {
    await clearPresence(userId);
    await emitPresenceToFriends(io, userId, 'offline');
  });
}

import type { Server, Socket } from 'socket.io';
import { prismaApp } from '../config/prisma.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Groups socket handlers.
 *
 * Each `SocialGroup` gets its own Socket.io room: `group:{groupId}`. A
 * client must call `group:join` to receive group-scoped events; the
 * server validates membership BEFORE allowing the join.
 *
 * Push events (emitted from `src/services/groups.service.ts`):
 *
 *   - createPoll(...)            → 'group:poll:created'
 *   - closePoll(...)             → 'group:poll:closed'
 *   - voteOnPollOption(...)      → 'group:poll:vote' (with new voteCount)
 *   - removePollVote(...)        → 'group:poll:vote' (with new voteCount)
 *   - createSuggestion(...)      → 'group:suggestion:created'
 *   - voteOnSuggestion(...)      → 'group:suggestion:vote' (with totals)
 *   - removeSuggestionVote(...)  → 'group:suggestion:vote' (with totals)
 *   - addMember(...)             → 'group:member:added'
 *   - removeMember(...)          → 'group:member:removed'
 *
 * All target the `group:{groupId}` room so only joined-and-validated
 * members receive them.
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
 * Membership check for `group:join`. Uses `prismaApp` inside a one-shot
 * transaction with `app.current_user_id` set so RLS gates apply — a
 * non-member's lookup returns null because the row is invisible.
 */
async function isMember(userId: string, groupId: string): Promise<boolean> {
  try {
    const membership = await prismaApp.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      return tx.socialGroupMember.findUnique({
        where: { socialGroupId_userId: { socialGroupId: groupId, userId } },
      });
    });
    return membership !== null;
  } catch {
    // Best-effort — refuse the join on lookup failure.
    return false;
  }
}

export function registerGroupsHandlers(_io: IoServer, socket: IoSocket) {
  const userId = socket.data.user.id;

  socket.on('group:join', async ({ groupId }) => {
    if (typeof groupId !== 'string' || groupId.length === 0) return;
    if (await isMember(userId, groupId)) {
      await socket.join(`group:${groupId}`);
    }
    // Silent failure on non-member: the client never knows the room
    // exists. Avoids leaking group existence to non-members.
  });

  socket.on('group:leave', async ({ groupId }) => {
    if (typeof groupId !== 'string' || groupId.length === 0) return;
    await socket.leave(`group:${groupId}`);
  });
}

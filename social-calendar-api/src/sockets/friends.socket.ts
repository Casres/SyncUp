import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Friends socket handlers.
 *
 * Outbound-only at the socket layer. Clients call REST (`POST /friends/requests`,
 * `PATCH /friends/requests/:id`) and the server pushes via Socket.io after
 * the transaction commits.
 *
 * The actual emit calls live inside `src/services/friends.service.ts`:
 *
 *   - sendRequest(...)        → emits 'friend:request:received'
 *                                to user:{recipientId}
 *
 *   - respondToRequest(...) when action === 'accept'
 *                             → emits 'friend:request:accepted'
 *                                to user:{initiatorId}
 *
 * Note on the FriendshipPayload's `friend` field: it's the OTHER party
 * relative to the receiver, so the service shapes the friendship from the
 * recipient's perspective before each emit.
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

export function registerFriendsHandlers(_io: IoServer, _socket: IoSocket) {
  // No client→server events for the Friends domain. All push points are
  // wired in `src/services/friends.service.ts`.
}

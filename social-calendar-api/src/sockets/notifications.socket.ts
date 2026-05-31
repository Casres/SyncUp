import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Notifications socket handlers.
 *
 * OUTBOUND-ONLY at the socket layer. Clients always mutate notifications
 * via the REST API (`POST /notifications/:id/read`, `DELETE
 * /notifications/:id`, etc.). The server pushes new and dismissed cards
 * via Socket.io after the REST transaction commits.
 *
 * Push events (emitted from `src/services/notifications.service.ts`):
 *
 *   - notificationsService.dispatch(...)   → 'notif:new'
 *   - notificationsService.dismiss(...)     → 'notif:dismissed'
 *
 * Audience for every push is the recipient's own `user:{userId}` room
 * (which presence joins on connect). That gives us multi-device
 * delivery for the same user without a separate fan-out lookup.
 *
 * Auth context: handlers do not need any DB I/O — they only register
 * the room listeners. The auth middleware in `src/sockets/index.ts`
 * has already resolved `socket.data.user` before this runs.
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

export function registerNotificationsHandlers(
  _io: IoServer,
  socket: IoSocket,
) {
  // Every user joins their own private room on connect. Presence does
  // the same join under a different alias (`user:{id}` mirrors what
  // the events / friends domains emit to). Doubling the join is a
  // no-op in Socket.io.
  void socket.join(`user:${socket.data.user.id}`);

  // No client → server messages for the notifications domain.
}

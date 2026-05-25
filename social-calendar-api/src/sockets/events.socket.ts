import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Events socket handlers.
 *
 * The events domain is OUTBOUND-ONLY at the socket layer — there are no
 * client→server messages for event CRUD. Clients always mutate via the
 * REST API; the server pushes updates via Socket.io after the REST
 * transaction commits.
 *
 * The actual emit calls live inside the Events service methods (Option A
 * pattern — see SOCKETIO_HANDOFF.md). Wiring those up requires:
 *
 *   1. Service method accepts an optional `io?: Server` parameter.
 *   2. After the Prisma write succeeds, the service computes the audience
 *      (creator + co-hosts + accepted invitees) and emits `event:updated`
 *      to each user-room.
 *
 * Invite + RSVP push points are TODO-flagged below — the Invites REST
 * endpoints don't exist yet (per EVENTS_HANDOFF "Open items #1").
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

export function registerEventsHandlers(_io: IoServer, _socket: IoSocket) {
  // No client→server events for the Events domain.
  //
  // Push points (called from src/services/events.service.ts):
  //
  //   - eventsService.update(...)         → emits 'event:updated'
  //                                          to user:{creatorId} +
  //                                          user:{co-host id} +
  //                                          user:{accepted invitee id}
  //
  //   - eventsService.sendInvites(...)    → emits 'event:invite:received'
  //                                          to user:{recipientId} for each
  //                                          NEW invite (idempotent
  //                                          re-sends don't re-emit).
  //                                          Also dispatches a GROUP_INVITE
  //                                          notification via
  //                                          notificationsService.dispatch.
  //
  //   - eventsService.respondToInvite(...) → emits 'event:invite:rsvp'
  //                                          to user:{organiserId} for each
  //                                          organiser. Also dispatches an
  //                                          RSVP notification to each
  //                                          organiser (excluding the
  //                                          responding recipient).
  //
  //   - eventsService.rescindInvite(...)   → no socket emission today.
  //                                          The invited user re-fetches
  //                                          on the next event:updated
  //                                          push. Open item if mobile
  //                                          needs immediate notification.
}

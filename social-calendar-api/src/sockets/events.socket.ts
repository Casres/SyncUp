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
  // TODO (Invites agent): when POST /events/:id/invites lands, emit
  //   'event:invite:received' to user:{recipientId}. Service signature:
  //
  //     invitesService.create(db, io, eventId, recipientIds[]) → InvitePayload[]
  //
  // TODO (Invites agent): when PATCH /events/:id/invites/:inviteId (RSVP)
  //   lands, emit 'event:invite:rsvp' to user:{organiserId} for each
  //   organiser of the event. Service signature:
  //
  //     invitesService.respond(db, io, inviteId, status) → void
}

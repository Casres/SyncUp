import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

/**
 * Availability socket handlers.
 *
 * The `UserAvailability` REST domain DOES NOT EXIST YET (a separate
 * future agent will build it). When that lands, the availability service
 * will need to emit `availability:updated` after every UserAvailability
 * INSERT / UPDATE / DELETE so connected friends can invalidate their
 * cached "who's free" lookups.
 *
 * Push event shape (from src/types/socket.types.ts):
 *
 *   'availability:updated': { userId: string }
 *
 * The payload deliberately contains only `userId` — recipients re-fetch
 * the full availability data via the REST API, so a stale socket payload
 * never feeds the UI.
 *
 * Audience: friends of the user whose availability changed, MINUS anyone
 * who has an `AvailabilityBlock` row hiding this user's availability from
 * them. The availability service is responsible for that filtering before
 * calling `io.to(...).emit(...)`.
 *
 * TODO (Availability service agent): emit `availability:updated` from
 *   every CRUD method. Suggested service signatures:
 *
 *     availabilityService.create(db, io, userId, input) → UserAvailabilityRow
 *     availabilityService.update(db, io, userId, id, input) → UserAvailabilityRow
 *     availabilityService.delete(db, io, userId, id) → void
 *
 *   After the Prisma write, the service should:
 *     a) Look up accepted friends of `userId` (excluding any in
 *        AvailabilityBlock with blockedId === userId) — reuse
 *        friendsRepository.list(...) and friendsRepository.findBlock(...).
 *     b) For each surviving friendId:
 *          io.to(`user:${friendId}`).emit('availability:updated', { userId });
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

export function registerAvailabilityHandlers(
  _io: IoServer,
  _socket: IoSocket,
) {
  // No client→server events. All push points are wired in a future
  // `src/services/availability.service.ts` (does not exist today).
}

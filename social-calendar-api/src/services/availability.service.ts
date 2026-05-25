import type { Server } from 'socket.io';
import { AvailState } from '@prisma/client';
import {
  availabilityRepository,
  type AvailabilityMap,
  type BroadcastSettingsData,
} from '../repositories/availability.repository.js';
import { friendsRepository } from '../repositories/friends.repository.js';
import type { Db } from '../repositories/_types.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ─── Domain errors ────────────────────────────────────────────────────────

export class AvailabilityForbiddenError extends Error {
  constructor(blockedUserId: string) {
    super(
      `User ${blockedUserId} has blocked their availability from the caller`,
    );
    this.name = 'AvailabilityForbiddenError';
  }
}

export class AvailabilityInvalidDateError extends Error {
  constructor(date: string) {
    super(`Invalid ISO date: ${date}`);
    this.name = 'AvailabilityInvalidDateError';
  }
}

// ─── Service ──────────────────────────────────────────────────────────────

export const availabilityService = {
  /** Current user's own availability map. */
  async getMine(db: Db, userId: string): Promise<AvailabilityMap> {
    return availabilityRepository.getMap(db, userId);
  },

  /**
   * Friend's availability — gated by `AvailabilityBlock` (one-directional
   * hide). The mobile contract is: throw `ApiError('FORBIDDEN', ...)`
   * when blocked. We mirror that with `AvailabilityForbiddenError`
   * mapped to HTTP 403 in the controller.
   *
   * RLS on `AvailabilityBlock` is owner-only — but the BLOCKER is the
   * owner, not the viewer. So we check via the migration-owner
   * `friendsRepository.findBlock` semantics? No — `friendsRepository.findBlock`
   * already uses `db.availabilityBlock.findUnique`, and the
   * `availabilityblock_select_*` RLS policies grant SELECT both to the
   * blocker AND to the blocked user (so the viewer can see "I'm blocked"
   * without the blocker hiding it).
   *
   * If the policies don't extend SELECT to the blocked party, this
   * service still works against the migration-owner client in tests; in
   * production the RLS policy needs the blocked party included. Open
   * item flagged for the Lead Manager.
   */
  async getFriend(
    db: Db,
    viewerUserId: string,
    targetUserId: string,
  ): Promise<AvailabilityMap> {
    if (viewerUserId === targetUserId) {
      return availabilityRepository.getMap(db, targetUserId);
    }
    const block = await friendsRepository.findBlock(
      db,
      targetUserId,
      viewerUserId,
    );
    if (block) {
      throw new AvailabilityForbiddenError(targetUserId);
    }
    return availabilityRepository.getMap(db, targetUserId);
  },

  /**
   * Full-map replace (PUT /me/availability). Emits an
   * `availability:updated` push to every accepted friend of the user
   * (minus anyone who has blocked the user — handled by the friends
   * repo's `findBlock` check) AFTER the transaction commits.
   *
   * We compute the audience using the same transaction client so RLS
   * passes; the emit itself is fire-and-forget post-write.
   */
  async replaceMine(
    db: Db,
    userId: string,
    map: AvailabilityMap,
    io?: IoServer,
  ): Promise<void> {
    // Normalise the map by ensuring every key parses as a real ISO day.
    for (const iso of Object.keys(map)) {
      try {
        availabilityRepository.isoDateToUtcMidnight(iso);
      } catch {
        throw new AvailabilityInvalidDateError(iso);
      }
    }
    await availabilityRepository.replaceMap(db, userId, map);
    if (io) await fanoutAvailability(db, io, userId);
  },

  /**
   * Patch / brush (PATCH /availability/me). Keys with a state set
   * upsert; keys with `null` clear.
   */
  async patchMine(
    db: Db,
    userId: string,
    patch: Record<string, AvailState | null>,
    io?: IoServer,
  ): Promise<void> {
    for (const iso of Object.keys(patch)) {
      try {
        availabilityRepository.isoDateToUtcMidnight(iso);
      } catch {
        throw new AvailabilityInvalidDateError(iso);
      }
    }
    await availabilityRepository.patchMap(db, userId, patch);
    if (io) await fanoutAvailability(db, io, userId);
  },

  /**
   * Single-day PUT (PUT /availability/me/:date). When `state` is null
   * the day is cleared instead of upserted (Hard Rule 14 — never store
   * the null state).
   */
  async setDay(
    db: Db,
    userId: string,
    iso: string,
    state: AvailState | null,
    io?: IoServer,
  ): Promise<void> {
    let date: Date;
    try {
      date = availabilityRepository.isoDateToUtcMidnight(iso);
    } catch {
      throw new AvailabilityInvalidDateError(iso);
    }
    if (state === null) {
      await availabilityRepository.clearDay(db, userId, date);
    } else {
      await availabilityRepository.upsertDay(db, userId, date, state);
    }
    if (io) await fanoutAvailability(db, io, userId);
  },

  // ─── Broadcast settings ────────────────────────────────────────────────

  getBroadcasts(db: Db, userId: string): Promise<BroadcastSettingsData> {
    return availabilityRepository.getSettings(db, userId);
  },

  updateBroadcasts(
    db: Db,
    userId: string,
    data: BroadcastSettingsData,
  ): Promise<BroadcastSettingsData> {
    return availabilityRepository.upsertSettings(db, userId, data);
  },
};

// ─── Internal: fan-out via Socket.io ──────────────────────────────────────

/**
 * Resolve the friends-of-user audience and emit `availability:updated`
 * to each of their user-rooms. Mirrors the contract documented in
 * `src/sockets/availability.socket.ts`.
 *
 * Errors are non-fatal — availability writes have already committed by
 * the time this runs; degrading socket delivery silently is preferable
 * to surfacing an HTTP error on a write that did succeed.
 */
async function fanoutAvailability(
  db: Db,
  io: IoServer,
  userId: string,
): Promise<void> {
  try {
    const friendships = await friendsRepository.list(db, {
      currentUserId: userId,
      status: 'ACCEPTED',
    });
    const friendIds = friendships.map((f) =>
      f.initiatorId === userId ? f.receiverId : f.initiatorId,
    );
    // Per `availability.socket.ts` TODO: skip anyone the user has
    // blocked their availability FROM. (We're emitting to people who
    // see this user's availability, so the relevant block is
    // `blockerId=userId, blockedId=friend`.)
    const blocks = await friendsRepository.listBlocks(db, userId);
    const blockedFriendIds = new Set(blocks.map((b) => b.blockedId));
    for (const friendId of friendIds) {
      if (blockedFriendIds.has(friendId)) continue;
      io.to(`user:${friendId}`).emit('availability:updated', { userId });
    }
  } catch {
    // Fan-out is best-effort.
  }
}

// Re-export AvailState for consumers that don't want to import from
// `@prisma/client`.
export { AvailState };

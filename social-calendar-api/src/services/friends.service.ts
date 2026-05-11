import { FriendshipStatus, Prisma } from '@prisma/client';
import type { Server } from 'socket.io';
import {
  friendsRepository,
  type AvailabilityBlockWithRelations,
  type FriendshipWithRelations,
} from '../repositories/friends.repository.js';
import type { Db } from '../repositories/_types.js';
import type {
  ClientToServerEvents,
  FriendshipPayload,
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

// ─── Domain errors ─────────────────────────────────────────────────────────

export class FriendshipNotFoundError extends Error {
  constructor(id: string) {
    super(`Friendship ${id} not found`);
    this.name = 'FriendshipNotFoundError';
  }
}

export class FriendshipForbiddenError extends Error {
  constructor(id: string) {
    super(`Caller is not a party to friendship ${id}`);
    this.name = 'FriendshipForbiddenError';
  }
}

export class FriendshipAlreadyExistsError extends Error {
  constructor(message = 'A friendship between these users already exists') {
    super(message);
    this.name = 'FriendshipAlreadyExistsError';
  }
}

export class FriendshipSelfError extends Error {
  constructor() {
    super('Cannot friend yourself');
    this.name = 'FriendshipSelfError';
  }
}

export class FriendshipInvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendshipInvalidStateError';
  }
}

export class AvailabilityBlockSelfError extends Error {
  constructor() {
    super('Cannot block yourself');
    this.name = 'AvailabilityBlockSelfError';
  }
}

export class AvailabilityBlockAlreadyExistsError extends Error {
  constructor() {
    super('User is already blocked');
    this.name = 'AvailabilityBlockAlreadyExistsError';
  }
}

// ─── Response shaping ──────────────────────────────────────────────────────

export type FriendshipResponse = {
  id: string;
  initiatorId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
  friend: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  label?: string;
};

/**
 * Resolve the "other user" relative to the caller and pull out the
 * caller's label (if any). Done in the service so controllers stay thin
 * and so this logic isn't duplicated by future consumers.
 */
function shapeFriendship(
  friendship: FriendshipWithRelations,
  currentUserId: string,
): FriendshipResponse {
  const isInitiator = friendship.initiatorId === currentUserId;
  const friend = isInitiator ? friendship.receiver : friendship.initiator;
  const callerLabel = friendship.labels.find(
    (l) => l.ownerId === currentUserId,
  );

  return {
    id: friendship.id,
    initiatorId: friendship.initiatorId,
    receiverId: friendship.receiverId,
    status: friendship.status,
    createdAt: friendship.createdAt,
    updatedAt: friendship.updatedAt,
    friend,
    ...(callerLabel ? { label: callerLabel.label } : {}),
  };
}

/**
 * Convert a Friendship + perspective into the wire FriendshipPayload
 * (Date → ISO string). Used for socket emissions where the recipient
 * needs to see the OTHER party as their `friend`.
 */
function toFriendshipPayload(
  friendship: FriendshipWithRelations,
  recipientId: string,
): FriendshipPayload {
  const shaped = shapeFriendship(friendship, recipientId);
  return {
    ...shaped,
    createdAt: shaped.createdAt.toISOString(),
    updatedAt: shaped.updatedAt.toISOString(),
  };
}

export type AvailabilityBlockResponse = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
  blocked: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

function shapeBlock(
  block: AvailabilityBlockWithRelations,
): AvailabilityBlockResponse {
  return {
    id: block.id,
    blockerId: block.blockerId,
    blockedId: block.blockedId,
    createdAt: block.createdAt,
    blocked: block.blocked,
  };
}

// ─── Service ───────────────────────────────────────────────────────────────

export type ListFriendsOptions = {
  label?: string;
};

export type AcceptOrDecline = 'accept' | 'decline';

export const friendsService = {
  /**
   * List the caller's accepted friends. Optional label filter is applied
   * against the caller's own labels (never the other party's).
   */
  async listAccepted(
    db: Db,
    currentUserId: string,
    options: ListFriendsOptions,
  ): Promise<FriendshipResponse[]> {
    const friendships = await friendsRepository.list(db, {
      currentUserId,
      status: FriendshipStatus.ACCEPTED,
      labelOwnedByCaller: options.label,
    });
    return friendships.map((f) => shapeFriendship(f, currentUserId));
  },

  async listIncomingRequests(
    db: Db,
    currentUserId: string,
  ): Promise<FriendshipResponse[]> {
    const friendships = await friendsRepository.listIncomingRequests(db, {
      currentUserId,
    });
    return friendships.map((f) => shapeFriendship(f, currentUserId));
  },

  async sendRequest(
    db: Db,
    currentUserId: string,
    recipientId: string,
    io?: IoServer,
  ): Promise<FriendshipResponse> {
    if (recipientId === currentUserId) throw new FriendshipSelfError();

    // Check for any existing row between the pair, including
    // soft-deleted ones — the @@unique([initiatorId, receiverId])
    // tombstones would block a re-insert anyway, and we want to give a
    // clean 409 instead of a Prisma unique-constraint error.
    const existing = await friendsRepository.findBetweenUsers(
      db,
      currentUserId,
      recipientId,
    );
    if (existing) {
      if (existing.deletedAt) {
        throw new FriendshipAlreadyExistsError(
          'A previous friendship between these users was deleted; reuse is blocked until that record is purged',
        );
      }
      throw new FriendshipAlreadyExistsError();
    }

    try {
      const created = await friendsRepository.create(
        db,
        currentUserId,
        recipientId,
      );
      // Push to the recipient's user-room. Payload is shaped from THEIR
      // perspective so `friend` is the initiator (the new request).
      if (io) {
        io.to(`user:${recipientId}`).emit('friend:request:received', {
          friendship: toFriendshipPayload(created, recipientId),
        });
      }
      return shapeFriendship(created, currentUserId);
    } catch (err) {
      // Race: another request inserted between our findBetweenUsers and
      // create. Surface as a 409.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new FriendshipAlreadyExistsError();
      }
      throw err;
    }
  },

  async respondToRequest(
    db: Db,
    currentUserId: string,
    friendshipId: string,
    action: AcceptOrDecline,
    io?: IoServer,
  ): Promise<FriendshipResponse | null> {
    const existing = await friendsRepository.findById(db, friendshipId);
    if (!existing) throw new FriendshipNotFoundError(friendshipId);

    // Only the receiver may accept or decline. Anyone else (including
    // the original initiator) gets 403.
    if (existing.receiverId !== currentUserId) {
      throw new FriendshipForbiddenError(friendshipId);
    }

    if (existing.status !== FriendshipStatus.PENDING) {
      throw new FriendshipInvalidStateError(
        `Friendship ${friendshipId} is not pending; cannot ${action}`,
      );
    }

    if (action === 'accept') {
      const updated = await friendsRepository.updateStatus(
        db,
        friendshipId,
        FriendshipStatus.ACCEPTED,
      );
      if (!updated) throw new FriendshipNotFoundError(friendshipId);
      // Notify the original initiator that their request was accepted.
      // Payload is shaped from THEIR perspective so `friend` is the
      // accepter (the receiver = currentUserId).
      if (io) {
        io.to(`user:${existing.initiatorId}`).emit(
          'friend:request:accepted',
          { friendship: toFriendshipPayload(updated, existing.initiatorId) },
        );
      }
      return shapeFriendship(updated, currentUserId);
    }

    // decline → soft-delete
    await friendsRepository.softDelete(db, friendshipId);
    return null;
  },

  async block(
    db: Db,
    currentUserId: string,
    friendshipId: string,
  ): Promise<FriendshipResponse> {
    const existing = await friendsRepository.findById(db, friendshipId);
    if (!existing) throw new FriendshipNotFoundError(friendshipId);

    const isParty =
      existing.initiatorId === currentUserId ||
      existing.receiverId === currentUserId;
    if (!isParty) throw new FriendshipForbiddenError(friendshipId);

    const updated = await friendsRepository.updateStatus(
      db,
      friendshipId,
      FriendshipStatus.BLOCKED,
    );
    if (!updated) throw new FriendshipNotFoundError(friendshipId);
    return shapeFriendship(updated, currentUserId);
  },

  async unfriend(
    db: Db,
    currentUserId: string,
    friendshipId: string,
  ): Promise<void> {
    const existing = await friendsRepository.findById(db, friendshipId);
    if (!existing) throw new FriendshipNotFoundError(friendshipId);

    const isParty =
      existing.initiatorId === currentUserId ||
      existing.receiverId === currentUserId;
    if (!isParty) throw new FriendshipForbiddenError(friendshipId);

    await friendsRepository.softDelete(db, friendshipId);
  },

  // ─── Labels ──────────────────────────────────────────────────────────────

  async setLabel(
    db: Db,
    currentUserId: string,
    friendshipId: string,
    label: string,
  ): Promise<{ id: string; friendshipId: string; ownerId: string; label: string }> {
    const existing = await friendsRepository.findById(db, friendshipId);
    if (!existing) throw new FriendshipNotFoundError(friendshipId);

    const isParty =
      existing.initiatorId === currentUserId ||
      existing.receiverId === currentUserId;
    if (!isParty) throw new FriendshipForbiddenError(friendshipId);

    const upserted = await friendsRepository.upsertLabel(
      db,
      friendshipId,
      currentUserId,
      label,
    );
    return {
      id: upserted.id,
      friendshipId: upserted.friendshipId,
      ownerId: upserted.ownerId,
      label: upserted.label,
    };
  },

  /**
   * Remove the caller's label. Idempotent — succeeds (returns void) even
   * if no label existed. Per spec the controller always responds 204.
   */
  async removeLabel(
    db: Db,
    currentUserId: string,
    friendshipId: string,
  ): Promise<void> {
    const existing = await friendsRepository.findById(db, friendshipId);
    if (!existing) throw new FriendshipNotFoundError(friendshipId);

    const isParty =
      existing.initiatorId === currentUserId ||
      existing.receiverId === currentUserId;
    if (!isParty) throw new FriendshipForbiddenError(friendshipId);

    await friendsRepository.deleteLabel(db, friendshipId, currentUserId);
  },

  // ─── Availability blocks ────────────────────────────────────────────────

  async listBlocks(
    db: Db,
    currentUserId: string,
  ): Promise<AvailabilityBlockResponse[]> {
    const blocks = await friendsRepository.listBlocks(db, currentUserId);
    return blocks.map(shapeBlock);
  },

  async createBlock(
    db: Db,
    currentUserId: string,
    targetUserId: string,
  ): Promise<AvailabilityBlockResponse> {
    if (targetUserId === currentUserId) throw new AvailabilityBlockSelfError();

    const existing = await friendsRepository.findBlock(
      db,
      currentUserId,
      targetUserId,
    );
    if (existing) throw new AvailabilityBlockAlreadyExistsError();

    try {
      const created = await friendsRepository.createBlock(
        db,
        currentUserId,
        targetUserId,
      );
      return shapeBlock(created);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AvailabilityBlockAlreadyExistsError();
      }
      throw err;
    }
  },

  /**
   * Idempotent unblock. Always resolves successfully — the caller
   * responds 204 whether or not a row was deleted.
   */
  async deleteBlock(
    db: Db,
    currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    await friendsRepository.deleteBlock(db, currentUserId, targetUserId);
  },
};

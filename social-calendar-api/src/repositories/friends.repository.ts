import { FriendshipStatus, Prisma } from '@prisma/client';
import type { Db } from './_types.js';
import { publicProfileSelect } from './_userSelects.js';

const friendshipInclude = {
  initiator: { select: publicProfileSelect },
  receiver: { select: publicProfileSelect },
  labels: {
    select: {
      id: true,
      ownerId: true,
      label: true,
    },
  },
} satisfies Prisma.FriendshipInclude;

export type FriendshipWithRelations = Prisma.FriendshipGetPayload<{
  include: typeof friendshipInclude;
}>;

const availabilityBlockInclude = {
  blocked: { select: publicProfileSelect },
} satisfies Prisma.AvailabilityBlockInclude;

export type AvailabilityBlockWithRelations =
  Prisma.AvailabilityBlockGetPayload<{
    include: typeof availabilityBlockInclude;
  }>;

export type ListFriendshipsFilters = {
  /**
   * The id of the calling user. RLS already restricts results to
   * friendships where the caller is initiator OR receiver, but we pass it
   * explicitly so the WHERE clause mirrors the policy and so the
   * caller's-label filter can resolve.
   */
  currentUserId: string;
  status?: FriendshipStatus;
  /** Filter to friendships the caller has labelled with this string. */
  labelOwnedByCaller?: string;
};

export type ListIncomingRequestsFilters = {
  currentUserId: string;
};

export const friendsRepository = {
  /**
   * List friendships involving the current user. Always filters out
   * soft-deleted rows. Optional status filter and optional caller-label
   * filter (the caller's own label, never the other party's).
   */
  list(db: Db, filters: ListFriendshipsFilters) {
    const where: Prisma.FriendshipWhereInput = {
      deletedAt: null,
      OR: [
        { initiatorId: filters.currentUserId },
        { receiverId: filters.currentUserId },
      ],
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.labelOwnedByCaller
        ? {
            labels: {
              some: {
                ownerId: filters.currentUserId,
                label: filters.labelOwnedByCaller,
              },
            },
          }
        : {}),
    };

    return db.friendship.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: friendshipInclude,
    });
  },

  /**
   * Pending friend requests where the caller is the receiver.
   */
  listIncomingRequests(db: Db, filters: ListIncomingRequestsFilters) {
    return db.friendship.findMany({
      where: {
        deletedAt: null,
        receiverId: filters.currentUserId,
        status: FriendshipStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
      include: friendshipInclude,
    });
  },

  /**
   * Find a non-soft-deleted friendship by id, including both parties and
   * labels. Returns null if it doesn't exist or RLS hides it.
   */
  findById(db: Db, id: string) {
    return db.friendship.findFirst({
      where: { id, deletedAt: null },
      include: friendshipInclude,
    });
  },

  /**
   * Look up an existing friendship between two users in either direction
   * (we still treat A→B and B→A as the same relationship for the purposes
   * of duplicate-detection). Includes soft-deleted rows on purpose — the
   * service layer needs to know about tombstones to enforce the
   * "no re-request while a deleted row blocks the unique constraint"
   * rule documented in FRIENDS_HANDOFF.md.
   */
  findBetweenUsers(db: Db, userAId: string, userBId: string) {
    return db.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: userAId, receiverId: userBId },
          { initiatorId: userBId, receiverId: userAId },
        ],
      },
    });
  },

  /**
   * True iff the two users have a non-deleted ACCEPTED friendship in
   * either direction. Used as the privacy gate for availability and any
   * other "friends-only" read path. RLS on Friendship restricts
   * visibility to either party — both userAId and userBId must be the
   * caller for at least one direction to return a row; otherwise the
   * helper must run against a client with the relevant party as
   * current_app_user_id, or under the migration-owner client.
   */
  async hasAcceptedFriendship(db: Db, userAId: string, userBId: string) {
    const row = await db.friendship.findFirst({
      where: {
        deletedAt: null,
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { initiatorId: userAId, receiverId: userBId },
          { initiatorId: userBId, receiverId: userAId },
        ],
      },
      select: { id: true },
    });
    return row !== null;
  },

  create(db: Db, initiatorId: string, receiverId: string) {
    return db.friendship.create({
      data: {
        initiatorId,
        receiverId,
        status: FriendshipStatus.PENDING,
      },
      include: friendshipInclude,
    });
  },

  /**
   * Set the friendship status (accept / block). Soft-delete-safe via
   * updateMany — Prisma's `update` only accepts unique fields in `where`.
   * Returns null if no row was updated.
   */
  async updateStatus(db: Db, id: string, status: FriendshipStatus) {
    const result = await db.friendship.updateMany({
      where: { id, deletedAt: null },
      data: { status },
    });
    if (result.count === 0) return null;
    return this.findById(db, id);
  },

  /**
   * Soft delete (decline / unfriend). Idempotent — a no-op on a row that
   * is already deleted.
   */
  async softDelete(db: Db, id: string) {
    const result = await db.friendship.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  },

  /**
   * Upsert the caller's label on a friendship. The unique key is
   * (friendshipId, ownerId), so each user labels independently.
   */
  upsertLabel(db: Db, friendshipId: string, ownerId: string, label: string) {
    return db.friendshipLabel.upsert({
      where: { friendshipId_ownerId: { friendshipId, ownerId } },
      update: { label },
      create: { friendshipId, ownerId, label },
    });
  },

  /**
   * Hard-delete the caller's label. Returns the count for the controller
   * to decide whether to surface a 204 vs 404 — but per spec we always
   * return 204 regardless.
   */
  async deleteLabel(db: Db, friendshipId: string, ownerId: string) {
    const result = await db.friendshipLabel.deleteMany({
      where: { friendshipId, ownerId },
    });
    return result.count;
  },

  // ─── Availability blocks ────────────────────────────────────────────────

  listBlocks(db: Db, blockerId: string) {
    return db.availabilityBlock.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      include: availabilityBlockInclude,
    });
  },

  findBlock(db: Db, blockerId: string, blockedId: string) {
    return db.availabilityBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
  },

  createBlock(db: Db, blockerId: string, blockedId: string) {
    return db.availabilityBlock.create({
      data: { blockerId, blockedId },
      include: availabilityBlockInclude,
    });
  },

  /**
   * Hard-delete a block. Idempotent — caller treats `count === 0` as a
   * no-op and still responds 204 per spec.
   */
  async deleteBlock(db: Db, blockerId: string, blockedId: string) {
    const result = await db.availabilityBlock.deleteMany({
      where: { blockerId, blockedId },
    });
    return result.count;
  },
};

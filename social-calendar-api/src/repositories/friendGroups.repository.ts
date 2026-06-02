import { Prisma } from '@prisma/client';
import type { Db } from './_types.js';
import { publicProfileSelect } from './_userSelects.js';

const friendGroupWithCountInclude = {
  _count: { select: { members: true } },
} satisfies Prisma.FriendGroupInclude;

export type FriendGroupWithCount = Prisma.FriendGroupGetPayload<{
  include: typeof friendGroupWithCountInclude;
}>;

export const friendGroupsRepository = {
  /**
   * List groups owned by the caller. RLS restricts ownership; we still
   * pass the `ownerId` filter explicitly so the query is intent-clear.
   */
  list(db: Db, ownerId: string) {
    return db.friendGroup.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: friendGroupWithCountInclude,
    });
  },

  findById(db: Db, id: string) {
    return db.friendGroup.findUnique({
      where: { id },
      include: friendGroupWithCountInclude,
    });
  },

  create(db: Db, ownerId: string, name: string) {
    return db.friendGroup.create({
      data: { ownerId, name },
      include: friendGroupWithCountInclude,
    });
  },

  /**
   * Rename. RLS already gates on owner; we still constrain on
   * `(id, ownerId)` to keep the query honest.
   */
  async rename(db: Db, id: string, ownerId: string, name: string) {
    const result = await db.friendGroup.updateMany({
      where: { id, ownerId },
      data: { name },
    });
    if (result.count === 0) return null;
    return this.findById(db, id);
  },

  /**
   * Delete a FriendGroup and all its members atomically. The members
   * have no cascade FK in the schema (default RESTRICT), so we delete
   * children first, then the parent, all on the same transaction
   * client passed in by the caller.
   */
  async deleteWithMembers(db: Db, id: string, ownerId: string) {
    // RLS on FriendGroupMember requires the parent's owner to match the
    // current user — so without that match this deleteMany is a no-op.
    // Belt-and-braces: also confirm the group exists and belongs to the
    // owner before issuing the delete.
    const group = await db.friendGroup.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });
    if (!group) return false;

    await db.friendGroupMember.deleteMany({ where: { friendGroupId: id } });
    const result = await db.friendGroup.deleteMany({
      where: { id, ownerId },
    });
    return result.count > 0;
  },

  // ─── Members ────────────────────────────────────────────────────────────

  /**
   * List members of a group. `FriendGroupMember` has no `User` relation
   * in the schema, so we resolve the user rows in a second query against
   * the collected ids. Both queries flow through the same per-request
   * transaction client.
   */
  async listMembers(db: Db, friendGroupId: string) {
    const members = await db.friendGroupMember.findMany({
      where: { friendGroupId },
      orderBy: { id: 'asc' },
      select: { id: true, userId: true },
    });

    if (members.length === 0) return [];

    const users = await db.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: publicProfileSelect,
    });

    const usersById = new Map(users.map((u) => [u.id, u]));
    return members
      .map((m) => {
        const user = usersById.get(m.userId);
        return user ? { membershipId: m.id, user } : null;
      })
      .filter((row): row is { membershipId: string; user: typeof users[number] } =>
        row !== null,
      );
  },

  findMember(db: Db, friendGroupId: string, userId: string) {
    return db.friendGroupMember.findUnique({
      where: { friendGroupId_userId: { friendGroupId, userId } },
    });
  },

  addMember(db: Db, friendGroupId: string, userId: string) {
    return db.friendGroupMember.create({
      data: { friendGroupId, userId },
    });
  },

  /**
   * Idempotent remove. Returns the count for the caller — but per spec
   * the controller responds 204 regardless.
   */
  async removeMember(db: Db, friendGroupId: string, userId: string) {
    const result = await db.friendGroupMember.deleteMany({
      where: { friendGroupId, userId },
    });
    return result.count;
  },
};

import { Prisma, ConversationType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { Db } from './_types.js';
import { publicProfileSelect } from './_userSelects.js';

const friendGroupWithMembersInclude = {
  _count: { select: { members: true } },
  members: { select: { userId: true }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.FriendGroupInclude;

export type FriendGroupWithMembers = Prisma.FriendGroupGetPayload<{
  include: typeof friendGroupWithMembersInclude;
}>;

/** @deprecated Alias kept for backward-compat during the memberIds migration — remove once all callers are updated. */
export type FriendGroupWithCount = FriendGroupWithMembers;

export const friendGroupsRepository = {
  /**
   * List groups owned by the caller. RLS restricts ownership; we still
   * pass the `ownerId` filter explicitly so the query is intent-clear.
   */
  list(db: Db, ownerId: string) {
    return db.friendGroup.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: friendGroupWithMembersInclude,
    });
  },

  findById(db: Db, id: string) {
    return db.friendGroup.findUnique({
      where: { id },
      include: friendGroupWithMembersInclude,
    });
  },

  create(db: Db, ownerId: string, name: string) {
    return db.friendGroup.create({
      data: { ownerId, name },
      include: friendGroupWithMembersInclude,
    });
  },

  /**
   * Create a FriendGroup and its auto-seeded GROUP chat (R18 D4) atomically,
   * on the migration-owner client.
   *
   * Why the owner client and not the per-request app client: the messaging
   * tables have SELECT-only RLS policies (no INSERT policy), so the app client
   * cannot write a Conversation / ConversationParticipant row at all — every
   * messaging write routes through the owner client by design.
   *
   * Why one owner-client transaction and not "app-create group, then
   * owner-create chat": the per-request app-client write commits only at
   * `onResponse` (see AUTH_HANDOFF.md). If the chat insert runs on the separate
   * owner connection while the group row is still uncommitted in the request
   * transaction, the `Conversation.linkedGroupId` FK has no visible target and
   * the insert fails (P2003). Creating both in the same owner transaction makes
   * the FK target visible and rolls the pair back together on any failure.
   *
   * The owner is the sole initial participant; members added later join via
   * `conversationsService.addGroupParticipant`.
   */
  createWithGroupChatOwner(ownerId: string, name: string) {
    return prisma.$transaction(async (tx) => {
      const group = await tx.friendGroup.create({
        data: { ownerId, name },
        include: friendGroupWithMembersInclude,
      });
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.GROUP,
          linkedGroupId: group.id,
          participants: { create: [{ userId: ownerId }] },
        },
        select: { id: true },
      });
      return { group, conversationId: conversation.id };
    });
  },

  /**
   * Rename. RLS already gates on owner; we still constrain on
   * `(id, ownerId)` to keep the query honest. Returns the updated
   * record (with members inline) or null if not found / not owned.
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

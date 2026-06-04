import { Prisma } from '@prisma/client';
import type { Server } from 'socket.io';
import {
  friendGroupsRepository,
  type FriendGroupWithMembers,
} from '../repositories/friendGroups.repository.js';
import { conversationsService } from './conversations.service.js';
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

// ─── Domain errors ─────────────────────────────────────────────────────────

export class FriendGroupNotFoundError extends Error {
  constructor(id: string) {
    super(`FriendGroup ${id} not found`);
    this.name = 'FriendGroupNotFoundError';
  }
}

export class FriendGroupForbiddenError extends Error {
  constructor(id: string) {
    super(`Caller does not own FriendGroup ${id}`);
    this.name = 'FriendGroupForbiddenError';
  }
}

export class FriendGroupMemberAlreadyExistsError extends Error {
  constructor() {
    super('User is already a member of this group');
    this.name = 'FriendGroupMemberAlreadyExistsError';
  }
}

// ─── Response shaping ──────────────────────────────────────────────────────

export type FriendGroupResponse = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  /** Ordered list of member user IDs. Populated inline from the FriendGroupMember join. */
  memberIds: string[];
};

function shape(group: FriendGroupWithMembers): FriendGroupResponse {
  return {
    id: group.id,
    ownerId: group.ownerId,
    name: group.name,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    memberCount: group._count.members,
    memberIds: group.members.map((m) => m.userId),
  };
}

export type FriendGroupMemberProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

// ─── Service ───────────────────────────────────────────────────────────────

export const friendGroupsService = {
  async list(db: Db, ownerId: string): Promise<FriendGroupResponse[]> {
    const groups = await friendGroupsRepository.list(db, ownerId);
    return groups.map(shape);
  },

  async create(
    db: Db,
    ownerId: string,
    name: string,
    io?: IoServer,
  ): Promise<FriendGroupResponse> {
    const created = await friendGroupsRepository.create(db, ownerId, name);

    // R18 D4: a GROUP chat is auto-created as a side effect of FriendGroup
    // creation — never via a public route. The owner is the sole initial
    // participant; members added later are joined via addGroupParticipant.
    // Best-effort: a chat-creation failure must not fail group creation.
    try {
      await conversationsService.ensureGroupConversation(io, created.id, [
        ownerId,
      ]);
    } catch {
      /* swallow — group creation already committed */
    }

    return shape(created);
  },

  async rename(
    db: Db,
    id: string,
    ownerId: string,
    name: string,
  ): Promise<FriendGroupResponse> {
    const existing = await friendGroupsRepository.findById(db, id);
    if (!existing) throw new FriendGroupNotFoundError(id);
    if (existing.ownerId !== ownerId) throw new FriendGroupForbiddenError(id);

    const updated = await friendGroupsRepository.rename(db, id, ownerId, name);
    if (!updated) throw new FriendGroupNotFoundError(id);
    return shape(updated);
  },

  /**
   * Cascade-delete the group. The repository runs the child + parent
   * deletes through the same `db` (per-request transaction client), so
   * either both succeed or both roll back when the auth middleware's
   * outer `$transaction` resolves.
   */
  async delete(db: Db, id: string, ownerId: string): Promise<void> {
    const existing = await friendGroupsRepository.findById(db, id);
    if (!existing) throw new FriendGroupNotFoundError(id);
    if (existing.ownerId !== ownerId) throw new FriendGroupForbiddenError(id);

    const ok = await friendGroupsRepository.deleteWithMembers(db, id, ownerId);
    if (!ok) throw new FriendGroupNotFoundError(id);
  },

  // ─── Members ────────────────────────────────────────────────────────────

  async listMembers(
    db: Db,
    friendGroupId: string,
    ownerId: string,
  ): Promise<FriendGroupMemberProfile[]> {
    const existing = await friendGroupsRepository.findById(db, friendGroupId);
    if (!existing) throw new FriendGroupNotFoundError(friendGroupId);
    if (existing.ownerId !== ownerId) {
      throw new FriendGroupForbiddenError(friendGroupId);
    }

    const members = await friendGroupsRepository.listMembers(
      db,
      friendGroupId,
    );
    return members.map((m) => m.user);
  },

  async addMember(
    db: Db,
    friendGroupId: string,
    ownerId: string,
    userId: string,
    io?: IoServer,
  ): Promise<{ membershipId: string; userId: string }> {
    const existing = await friendGroupsRepository.findById(db, friendGroupId);
    if (!existing) throw new FriendGroupNotFoundError(friendGroupId);
    if (existing.ownerId !== ownerId) {
      throw new FriendGroupForbiddenError(friendGroupId);
    }

    const dup = await friendGroupsRepository.findMember(
      db,
      friendGroupId,
      userId,
    );
    if (dup) throw new FriendGroupMemberAlreadyExistsError();

    try {
      const created = await friendGroupsRepository.addMember(
        db,
        friendGroupId,
        userId,
      );

      // R18 D4: join the new member to the group's chat (idempotent; no-op if
      // the chat doesn't exist). Best-effort — never fail the membership write.
      try {
        await conversationsService.addGroupParticipant(
          io,
          friendGroupId,
          userId,
        );
      } catch {
        /* swallow — membership already committed */
      }

      return { membershipId: created.id, userId: created.userId };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new FriendGroupMemberAlreadyExistsError();
      }
      throw err;
    }
  },

  /**
   * Idempotent remove. Always resolves successfully.
   */
  async removeMember(
    db: Db,
    friendGroupId: string,
    ownerId: string,
    userId: string,
  ): Promise<void> {
    const existing = await friendGroupsRepository.findById(db, friendGroupId);
    if (!existing) throw new FriendGroupNotFoundError(friendGroupId);
    if (existing.ownerId !== ownerId) {
      throw new FriendGroupForbiddenError(friendGroupId);
    }

    await friendGroupsRepository.removeMember(db, friendGroupId, userId);
  },
};

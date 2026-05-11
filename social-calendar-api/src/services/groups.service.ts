import { SocialGroupRole, SuggestionVoteValue } from '@prisma/client';
import type { Server } from 'socket.io';
import type { Db } from '../repositories/_types.js';
import {
  groupsRepository,
  type CreateGroupData,
  type CreateSuggestionData,
  type EventSuggestionRow,
  type GroupPollRow,
  type SocialGroupMemberRow,
  type SocialGroupRow,
  type UpdateGroupData,
} from '../repositories/groups.repository.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  MemberPayload,
  PollPayload,
  ServerToClientEvents,
  SocketData,
  SuggestionPayload,
} from '../types/socket.types.js';

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ─── Domain errors ───────────────────────────────────────────────────────────

export class SocialGroupNotFoundError extends Error {
  constructor(id: string) {
    super(`Social group ${id} not found`);
    this.name = 'SocialGroupNotFoundError';
  }
}

export class SocialGroupForbiddenError extends Error {
  constructor(id: string) {
    super(`Caller is not authorised for social group ${id}`);
    this.name = 'SocialGroupForbiddenError';
  }
}

export class SocialGroupLastAdminError extends Error {
  constructor() {
    super('A group must have at least one admin.');
    this.name = 'SocialGroupLastAdminError';
  }
}

export class SocialGroupMemberAlreadyExistsError extends Error {
  constructor() {
    super('User is already a member of this group.');
    this.name = 'SocialGroupMemberAlreadyExistsError';
  }
}

export class PollNotFoundError extends Error {
  constructor(id: string) {
    super(`Poll ${id} not found`);
    this.name = 'PollNotFoundError';
  }
}

export class PollClosedError extends Error {
  constructor() {
    super('Poll is closed.');
    this.name = 'PollClosedError';
  }
}

export class PollOptionNotFoundError extends Error {
  constructor(id: string) {
    super(`Poll option ${id} not found`);
    this.name = 'PollOptionNotFoundError';
  }
}

export class PollVoteAlreadyExistsError extends Error {
  constructor() {
    super('Already voted on this option.');
    this.name = 'PollVoteAlreadyExistsError';
  }
}

export class SuggestionNotFoundError extends Error {
  constructor(id: string) {
    super(`Suggestion ${id} not found`);
    this.name = 'SuggestionNotFoundError';
  }
}

export class SuggestionVotingDisabledError extends Error {
  constructor() {
    super('Voting on this suggestion is disabled.');
    this.name = 'SuggestionVotingDisabledError';
  }
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export type GroupResponse = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  viewerRole: SocialGroupRole;
};

export type PollOptionResponse = {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  viewerHasVoted: boolean;
};

export type PollResponse = {
  id: string;
  socialGroupId: string;
  eventId: string | null;
  question: string;
  closedAt: Date | null;
  createdAt: Date;
  createdBy: GroupPollRow['createdBy'];
  options: PollOptionResponse[];
  totalVotes: number;
};

export type SuggestionResponse = {
  id: string;
  socialGroupId: string;
  eventId: string | null;
  title: string;
  description: string | null;
  proposedDate: Date | null;
  createdAt: Date;
  suggestedBy: EventSuggestionRow['suggestedBy'];
  upvotes: number;
  downvotes: number;
  viewerVote: SuggestionVoteValue | null;
};

// ─── Input types ─────────────────────────────────────────────────────────────

export type CreateGroupInput = CreateGroupData;
export type UpdateGroupInput = UpdateGroupData;
export type CreatePollInput = {
  question: string;
  options: string[];
  eventId?: string;
};
export type CreateSuggestionInput = Omit<
  CreateSuggestionData,
  'socialGroupId' | 'suggestedById'
>;

// ─── Mappers ─────────────────────────────────────────────────────────────────

type RawGroupWithViewer = SocialGroupRow & {
  _count: { members: number };
  members: Array<{ role: SocialGroupRole }>;
};

function toGroupResponse(row: RawGroupWithViewer): GroupResponse {
  // The caller is always a member at this point (RLS or service-level
  // membership check has already filtered) so members[0] is defined.
  // Default to MEMBER if somehow missing rather than throwing.
  const viewerRole = row.members[0]?.role ?? SocialGroupRole.MEMBER;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    memberCount: row._count.members,
    viewerRole,
  };
}

function toPollResponse(row: GroupPollRow, viewerId: string): PollResponse {
  let totalVotes = 0;
  const options = row.options.map((option) => {
    const voteCount = option._count.votes;
    totalVotes += voteCount;
    return {
      id: option.id,
      text: option.text,
      order: option.order,
      voteCount,
      viewerHasVoted: option.votes.some((v) => v.userId === viewerId),
    };
  });
  return {
    id: row.id,
    socialGroupId: row.socialGroupId,
    eventId: row.eventId,
    question: row.question,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    options,
    totalVotes,
  };
}

function toSuggestionResponse(
  row: EventSuggestionRow,
  viewerId: string,
): SuggestionResponse {
  let upvotes = 0;
  let downvotes = 0;
  let viewerVote: SuggestionVoteValue | null = null;
  for (const vote of row.votes) {
    if (vote.value === SuggestionVoteValue.UP) upvotes += 1;
    else downvotes += 1;
    if (vote.userId === viewerId) viewerVote = vote.value;
  }
  return {
    id: row.id,
    socialGroupId: row.socialGroupId,
    eventId: row.eventId,
    title: row.title,
    description: row.description,
    proposedDate: row.proposedDate,
    createdAt: row.createdAt,
    suggestedBy: row.suggestedBy,
    upvotes,
    downvotes,
    viewerVote,
  };
}

// ─── Wire-format converters (REST shape → socket payload) ────────────────────
//
// The REST controllers serialise via Fastify's default JSON encoder, which
// turns Date instances into ISO strings. Socket payloads pre-stringify the
// dates so the wire shape is byte-identical between REST responses and
// socket events. Frontend can hydrate either one with the same parser.

function pollToPayload(row: GroupPollRow, viewerId: string): PollPayload {
  const resp = toPollResponse(row, viewerId);
  return {
    ...resp,
    closedAt: resp.closedAt ? resp.closedAt.toISOString() : null,
    createdAt: resp.createdAt.toISOString(),
  };
}

function suggestionToPayload(
  row: EventSuggestionRow,
  viewerId: string,
): SuggestionPayload {
  const resp = toSuggestionResponse(row, viewerId);
  return {
    ...resp,
    proposedDate: resp.proposedDate ? resp.proposedDate.toISOString() : null,
    createdAt: resp.createdAt.toISOString(),
  };
}

function memberToPayload(row: SocialGroupMemberRow): MemberPayload {
  return {
    id: row.id,
    socialGroupId: row.socialGroupId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    user: row.user,
  };
}

// ─── Membership helpers ──────────────────────────────────────────────────────

/**
 * Asserts the caller is a member of the group and returns their role.
 * Throws `SocialGroupNotFoundError` if the group is missing / soft-deleted /
 * RLS-hidden, and `SocialGroupForbiddenError` if visible but not a member.
 *
 * RLS already restricts SELECT to members, so a missing row could mean
 * either case. We fall back to a raw existence check (which RLS will also
 * gate) to disambiguate; in practice both end up surfacing as 404 since
 * RLS hides non-member groups. The explicit branch keeps the contract
 * readable for whoever maintains this next.
 */
async function assertMember(db: Db, groupId: string, userId: string) {
  const member = await groupsRepository.findMember(db, groupId, userId);
  if (member) return member;
  const exists = await groupsRepository.findRawById(db, groupId);
  if (!exists) throw new SocialGroupNotFoundError(groupId);
  throw new SocialGroupForbiddenError(groupId);
}

async function assertAdmin(db: Db, groupId: string, userId: string) {
  const member = await assertMember(db, groupId, userId);
  if (member.role !== SocialGroupRole.ADMIN) {
    throw new SocialGroupForbiddenError(groupId);
  }
  return member;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const groupsService = {
  // ── Group CRUD ────────────────────────────────────────────────────────────

  async list(db: Db, userId: string): Promise<GroupResponse[]> {
    const rows = await groupsRepository.listForUser(db, userId);
    return rows.map(toGroupResponse);
  },

  async getById(db: Db, id: string, userId: string): Promise<GroupResponse> {
    // assertMember runs first so we honour the 404-vs-403 contract before
    // even reading the response shape.
    await assertMember(db, id, userId);
    const row = await groupsRepository.findByIdForUser(db, id, userId);
    if (!row) throw new SocialGroupNotFoundError(id);
    return toGroupResponse(row);
  },

  async create(
    db: Db,
    userId: string,
    input: CreateGroupInput,
  ): Promise<GroupResponse> {
    // Atomic via Prisma nested write inside the per-request transaction:
    // SocialGroup row + initial ADMIN SocialGroupMember land together.
    const row = await groupsRepository.create(db, userId, input);
    return toGroupResponse(row);
  },

  async update(
    db: Db,
    id: string,
    userId: string,
    input: UpdateGroupInput,
  ): Promise<GroupResponse> {
    await assertAdmin(db, id, userId);
    const count = await groupsRepository.update(db, id, input);
    if (count === 0) throw new SocialGroupNotFoundError(id);
    const row = await groupsRepository.findByIdForUser(db, id, userId);
    if (!row) throw new SocialGroupNotFoundError(id);
    return toGroupResponse(row);
  },

  async softDelete(db: Db, id: string, userId: string): Promise<void> {
    await assertAdmin(db, id, userId);
    const ok = await groupsRepository.softDelete(db, id);
    if (!ok) throw new SocialGroupNotFoundError(id);
  },

  // ── Members ───────────────────────────────────────────────────────────────

  async listMembers(
    db: Db,
    groupId: string,
    userId: string,
  ): Promise<SocialGroupMemberRow[]> {
    await assertMember(db, groupId, userId);
    return groupsRepository.listMembers(db, groupId);
  },

  async addMember(
    db: Db,
    groupId: string,
    callerId: string,
    targetUserId: string,
    io?: IoServer,
  ): Promise<SocialGroupMemberRow> {
    await assertAdmin(db, groupId, callerId);
    const existing = await groupsRepository.findMember(db, groupId, targetUserId);
    if (existing) throw new SocialGroupMemberAlreadyExistsError();
    const member = await groupsRepository.addMember(
      db,
      groupId,
      targetUserId,
      SocialGroupRole.MEMBER,
    );
    if (io) {
      io.to(`group:${groupId}`).emit('group:member:added', {
        groupId,
        member: memberToPayload(member),
      });
    }
    return member;
  },

  /**
   * Removes a member. ADMIN can remove anyone; non-ADMIN can only
   * self-leave. If the last ADMIN tries to leave, reject. Returns
   * `removed: false` when the user wasn't a member to begin with — the
   * controller should still respond 204 in that case.
   */
  async removeMember(
    db: Db,
    groupId: string,
    callerId: string,
    targetUserId: string,
    io?: IoServer,
  ): Promise<{ removed: boolean }> {
    const callerMembership = await assertMember(db, groupId, callerId);
    const isSelfLeave = callerId === targetUserId;

    if (!isSelfLeave && callerMembership.role !== SocialGroupRole.ADMIN) {
      throw new SocialGroupForbiddenError(groupId);
    }

    const target = await groupsRepository.findMember(db, groupId, targetUserId);
    if (!target) {
      // Spec: "No-op if user is not a member (return 204)."
      return { removed: false };
    }

    if (target.role === SocialGroupRole.ADMIN) {
      const adminCount = await groupsRepository.countAdmins(db, groupId);
      if (adminCount <= 1) throw new SocialGroupLastAdminError();
    }

    const count = await groupsRepository.removeMember(db, groupId, targetUserId);
    if (io && count > 0) {
      io.to(`group:${groupId}`).emit('group:member:removed', {
        groupId,
        userId: targetUserId,
      });
    }
    return { removed: count > 0 };
  },

  async updateMemberRole(
    db: Db,
    groupId: string,
    callerId: string,
    targetUserId: string,
    role: SocialGroupRole,
  ): Promise<SocialGroupMemberRow> {
    await assertAdmin(db, groupId, callerId);
    const target = await groupsRepository.findMember(db, groupId, targetUserId);
    if (!target) throw new SocialGroupNotFoundError(targetUserId);

    // No-op when the role isn't actually changing — saves a write and
    // sidesteps the last-admin guard for trivial PATCHes.
    if (target.role === role) return target;

    if (target.role === SocialGroupRole.ADMIN && role !== SocialGroupRole.ADMIN) {
      const adminCount = await groupsRepository.countAdmins(db, groupId);
      if (adminCount <= 1) throw new SocialGroupLastAdminError();
    }

    return groupsRepository.updateMemberRole(db, groupId, targetUserId, role);
  },

  // ── Polls ─────────────────────────────────────────────────────────────────

  async listPolls(
    db: Db,
    groupId: string,
    userId: string,
    openOnly: boolean,
  ): Promise<PollResponse[]> {
    await assertMember(db, groupId, userId);
    const rows = await groupsRepository.listPolls(db, groupId, openOnly);
    return rows.map((row) => toPollResponse(row, userId));
  },

  async createPoll(
    db: Db,
    groupId: string,
    userId: string,
    input: CreatePollInput,
    io?: IoServer,
  ): Promise<PollResponse> {
    await assertMember(db, groupId, userId);
    const row = await groupsRepository.createPoll(db, {
      socialGroupId: groupId,
      createdById: userId,
      question: input.question,
      eventId: input.eventId,
      options: input.options,
    });
    if (io) {
      // Use a viewer-agnostic perspective on the broadcast — the
      // recipient's `viewerHasVoted` will always be false on a brand-new
      // poll regardless of which user we shape from. Pick the creator.
      io.to(`group:${groupId}`).emit('group:poll:created', {
        groupId,
        poll: pollToPayload(row, userId),
      });
    }
    return toPollResponse(row, userId);
  },

  /**
   * Closes an open poll. Cannot re-open. Permission: poll creator or
   * group ADMIN.
   */
  async closePoll(
    db: Db,
    groupId: string,
    pollId: string,
    userId: string,
    io?: IoServer,
  ): Promise<PollResponse> {
    const callerMembership = await assertMember(db, groupId, userId);
    const meta = await groupsRepository.findPollMeta(db, pollId);
    if (!meta || meta.socialGroupId !== groupId) {
      throw new PollNotFoundError(pollId);
    }
    const isCreator = meta.createdById === userId;
    const isAdmin = callerMembership.role === SocialGroupRole.ADMIN;
    if (!isCreator && !isAdmin) throw new SocialGroupForbiddenError(groupId);

    if (meta.closedAt !== null) throw new PollClosedError();

    const count = await groupsRepository.closePoll(db, pollId);
    if (count === 0) throw new PollClosedError();

    const row = await groupsRepository.findPollById(db, pollId);
    if (!row) throw new PollNotFoundError(pollId);
    if (io) {
      io.to(`group:${groupId}`).emit('group:poll:closed', {
        groupId,
        pollId,
      });
    }
    return toPollResponse(row, userId);
  },

  async deletePoll(
    db: Db,
    groupId: string,
    pollId: string,
    userId: string,
  ): Promise<void> {
    const callerMembership = await assertMember(db, groupId, userId);
    const meta = await groupsRepository.findPollMeta(db, pollId);
    if (!meta || meta.socialGroupId !== groupId) {
      throw new PollNotFoundError(pollId);
    }
    const isCreator = meta.createdById === userId;
    const isAdmin = callerMembership.role === SocialGroupRole.ADMIN;
    if (!isCreator && !isAdmin) throw new SocialGroupForbiddenError(groupId);

    // Cascade: PollVote → PollOption → GroupPoll, all in the same
    // request transaction (`db` IS the transaction client).
    await groupsRepository.deletePollCascade(db, pollId);
  },

  // ── Poll votes ────────────────────────────────────────────────────────────

  async voteOnPollOption(
    db: Db,
    groupId: string,
    pollId: string,
    optionId: string,
    userId: string,
    io?: IoServer,
  ): Promise<void> {
    await assertMember(db, groupId, userId);

    const poll = await groupsRepository.findPollMeta(db, pollId);
    if (!poll || poll.socialGroupId !== groupId) {
      throw new PollNotFoundError(pollId);
    }
    if (poll.closedAt !== null) throw new PollClosedError();

    const option = await groupsRepository.findPollOption(db, optionId);
    if (!option || option.pollId !== pollId) {
      throw new PollOptionNotFoundError(optionId);
    }

    const existing = await groupsRepository.findPollVote(db, optionId, userId);
    if (existing) throw new PollVoteAlreadyExistsError();

    await groupsRepository.createPollVote(db, optionId, userId);

    if (io) {
      // Re-fetch to compute the new voteCount inside the same tx — Prisma
      // counts after the insert so the broadcast is correct.
      const refreshed = await groupsRepository.findPollById(db, pollId);
      const opt = refreshed?.options.find((o) => o.id === optionId);
      if (opt) {
        io.to(`group:${groupId}`).emit('group:poll:vote', {
          groupId,
          pollId,
          optionId,
          voteCount: opt._count.votes,
        });
      }
    }
  },

  async removePollVote(
    db: Db,
    groupId: string,
    pollId: string,
    optionId: string,
    userId: string,
    io?: IoServer,
  ): Promise<void> {
    await assertMember(db, groupId, userId);

    const poll = await groupsRepository.findPollMeta(db, pollId);
    if (!poll || poll.socialGroupId !== groupId) {
      throw new PollNotFoundError(pollId);
    }
    if (poll.closedAt !== null) throw new PollClosedError();

    const option = await groupsRepository.findPollOption(db, optionId);
    if (!option || option.pollId !== pollId) {
      throw new PollOptionNotFoundError(optionId);
    }

    // Idempotent: deleteMany returns count = 0 if nothing to remove.
    const removed = await groupsRepository.deletePollVote(db, optionId, userId);

    if (io && removed > 0) {
      const refreshed = await groupsRepository.findPollById(db, pollId);
      const opt = refreshed?.options.find((o) => o.id === optionId);
      if (opt) {
        io.to(`group:${groupId}`).emit('group:poll:vote', {
          groupId,
          pollId,
          optionId,
          voteCount: opt._count.votes,
        });
      }
    }
  },

  // ── Suggestions ───────────────────────────────────────────────────────────

  async listSuggestions(
    db: Db,
    groupId: string,
    userId: string,
  ): Promise<SuggestionResponse[]> {
    await assertMember(db, groupId, userId);
    const rows = await groupsRepository.listSuggestions(db, groupId);
    return rows.map((row) => toSuggestionResponse(row, userId));
  },

  async createSuggestion(
    db: Db,
    groupId: string,
    userId: string,
    input: CreateSuggestionInput,
    io?: IoServer,
  ): Promise<SuggestionResponse> {
    await assertMember(db, groupId, userId);
    const row = await groupsRepository.createSuggestion(db, {
      socialGroupId: groupId,
      suggestedById: userId,
      title: input.title,
      description: input.description,
      proposedDate: input.proposedDate,
      eventId: input.eventId,
    });
    if (io) {
      io.to(`group:${groupId}`).emit('group:suggestion:created', {
        groupId,
        suggestion: suggestionToPayload(row, userId),
      });
    }
    return toSuggestionResponse(row, userId);
  },

  async deleteSuggestion(
    db: Db,
    groupId: string,
    suggestionId: string,
    userId: string,
  ): Promise<void> {
    const callerMembership = await assertMember(db, groupId, userId);
    const meta = await groupsRepository.findSuggestionMeta(db, suggestionId);
    if (!meta || meta.socialGroupId !== groupId) {
      throw new SuggestionNotFoundError(suggestionId);
    }
    const isCreator = meta.suggestedById === userId;
    const isAdmin = callerMembership.role === SocialGroupRole.ADMIN;
    if (!isCreator && !isAdmin) throw new SocialGroupForbiddenError(groupId);

    await groupsRepository.deleteSuggestionCascade(db, suggestionId);
  },

  // ── Suggestion votes ──────────────────────────────────────────────────────

  /**
   * Upserts the caller's vote on a suggestion. If the suggestion is tied
   * to an event with `allowSuggestionVoting = false`, reject. The
   * upsert itself is atomic over the (suggestionId, userId) unique key.
   */
  async voteOnSuggestion(
    db: Db,
    groupId: string,
    suggestionId: string,
    userId: string,
    value: SuggestionVoteValue,
    io?: IoServer,
  ): Promise<void> {
    await assertMember(db, groupId, userId);

    const meta = await groupsRepository.findSuggestionMeta(db, suggestionId);
    if (!meta || meta.socialGroupId !== groupId) {
      throw new SuggestionNotFoundError(suggestionId);
    }

    if (meta.eventId) {
      const event = await groupsRepository.findEventVotingFlag(db, meta.eventId);
      // If the event row is missing or RLS-hidden we treat that as "no
      // restriction" — the suggestion still exists in the group, voting
      // on it remains allowed because the gating signal is unreachable.
      if (event && !event.allowSuggestionVoting) {
        throw new SuggestionVotingDisabledError();
      }
    }

    await groupsRepository.upsertSuggestionVote(db, suggestionId, userId, value);

    if (io) {
      const refreshed = await groupsRepository.findSuggestionById(
        db,
        suggestionId,
      );
      if (refreshed) {
        const { upvotes, downvotes } = countVotes(refreshed);
        io.to(`group:${groupId}`).emit('group:suggestion:vote', {
          groupId,
          suggestionId,
          upvotes,
          downvotes,
        });
      }
    }
  },

  async removeSuggestionVote(
    db: Db,
    groupId: string,
    suggestionId: string,
    userId: string,
    io?: IoServer,
  ): Promise<void> {
    await assertMember(db, groupId, userId);
    const meta = await groupsRepository.findSuggestionMeta(db, suggestionId);
    if (!meta || meta.socialGroupId !== groupId) {
      throw new SuggestionNotFoundError(suggestionId);
    }
    // Idempotent — zero rows is fine, controller still returns 204.
    const removed = await groupsRepository.deleteSuggestionVote(
      db,
      suggestionId,
      userId,
    );

    if (io && removed > 0) {
      const refreshed = await groupsRepository.findSuggestionById(
        db,
        suggestionId,
      );
      if (refreshed) {
        const { upvotes, downvotes } = countVotes(refreshed);
        io.to(`group:${groupId}`).emit('group:suggestion:vote', {
          groupId,
          suggestionId,
          upvotes,
          downvotes,
        });
      }
    }
  },
};

/**
 * Sum the vote totals from the included `votes` relation. Used by the
 * socket emit paths after a suggestion vote upsert / delete so the
 * broadcast payload contains the new totals.
 */
function countVotes(row: EventSuggestionRow): {
  upvotes: number;
  downvotes: number;
} {
  let upvotes = 0;
  let downvotes = 0;
  for (const v of row.votes) {
    if (v.value === SuggestionVoteValue.UP) upvotes += 1;
    else downvotes += 1;
  }
  return { upvotes, downvotes };
}

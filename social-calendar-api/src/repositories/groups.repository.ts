import { Prisma, SocialGroupRole, SuggestionVoteValue } from '@prisma/client';
import type { Db } from './_types.js';

/**
 * Public profile shape exposed inside group / member / poll / suggestion
 * payloads. Identical to the one used by the Events domain — slated for
 * consolidation into `_types.ts` once Friends + Groups have both shipped.
 * See GROUPS_HANDOFF for the cross-section flag.
 */
const publicProfileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

// ─── Selects / Includes ──────────────────────────────────────────────────────

const groupBaseSelect = {
  id: true,
  name: true,
  description: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SocialGroupSelect;

const memberSelect = {
  id: true,
  socialGroupId: true,
  userId: true,
  role: true,
  joinedAt: true,
  user: { select: publicProfileSelect },
} satisfies Prisma.SocialGroupMemberSelect;

const pollSelect = {
  id: true,
  socialGroupId: true,
  eventId: true,
  question: true,
  closedAt: true,
  createdAt: true,
  createdBy: { select: publicProfileSelect },
  options: {
    orderBy: { order: 'asc' },
    select: {
      id: true,
      text: true,
      order: true,
      _count: { select: { votes: true } },
      votes: { select: { userId: true } },
    },
  },
} satisfies Prisma.GroupPollSelect;

const suggestionSelect = {
  id: true,
  socialGroupId: true,
  eventId: true,
  title: true,
  description: true,
  proposedDate: true,
  createdAt: true,
  suggestedBy: { select: publicProfileSelect },
  votes: { select: { userId: true, value: true } },
} satisfies Prisma.EventSuggestionSelect;

export type SocialGroupRow = Prisma.SocialGroupGetPayload<{
  select: typeof groupBaseSelect;
}>;

export type SocialGroupMemberRow = Prisma.SocialGroupMemberGetPayload<{
  select: typeof memberSelect;
}>;

export type GroupPollRow = Prisma.GroupPollGetPayload<{
  select: typeof pollSelect;
}>;

export type EventSuggestionRow = Prisma.EventSuggestionGetPayload<{
  select: typeof suggestionSelect;
}>;

// ─── Input data shapes ───────────────────────────────────────────────────────

export type CreateGroupData = {
  name: string;
  description?: string;
  avatarUrl?: string;
};

export type UpdateGroupData = {
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
};

export type CreatePollData = {
  socialGroupId: string;
  createdById: string;
  question: string;
  eventId?: string;
  options: string[];
};

export type CreateSuggestionData = {
  socialGroupId: string;
  suggestedById: string;
  title: string;
  description?: string;
  proposedDate?: Date;
  eventId?: string;
};

// ─── Repository ──────────────────────────────────────────────────────────────

export const groupsRepository = {
  // ── SocialGroup CRUD ──────────────────────────────────────────────────────

  /**
   * Lists groups visible to the caller. RLS already restricts SELECT to
   * groups the caller is a member of, but we pin to caller membership
   * explicitly so we can also include the caller's role + member count
   * in a single round trip.
   */
  listForUser(db: Db, userId: string) {
    return db.socialGroup.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ...groupBaseSelect,
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });
  },

  /**
   * Returns a single group plus the caller's membership row. Caller must
   * already be a member or RLS hides the row entirely (returns null).
   */
  findByIdForUser(db: Db, id: string, userId: string) {
    return db.socialGroup.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...groupBaseSelect,
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
      },
    });
  },

  /**
   * Lightweight existence check (still soft-delete-aware). Used by
   * services to decide between 404 and 403 when downstream RLS blocks.
   */
  findRawById(db: Db, id: string) {
    return db.socialGroup.findFirst({
      where: { id, deletedAt: null },
      select: groupBaseSelect,
    });
  },

  /**
   * Atomically create the SocialGroup row AND the creator's
   * SocialGroupMember row (role: ADMIN). Both writes succeed or neither
   * does — we use a nested write so Prisma issues a single statement
   * batch inside the per-request transaction.
   */
  create(db: Db, creatorId: string, data: CreateGroupData) {
    return db.socialGroup.create({
      data: {
        name: data.name,
        description: data.description,
        avatarUrl: data.avatarUrl,
        members: {
          create: {
            userId: creatorId,
            role: SocialGroupRole.ADMIN,
          },
        },
      },
      select: {
        ...groupBaseSelect,
        _count: { select: { members: true } },
        members: {
          where: { userId: creatorId },
          select: { role: true },
          take: 1,
        },
      },
    });
  },

  /**
   * Updates a group. Soft-delete safety filter via `updateMany` because
   * Prisma's `update` doesn't accept non-unique fields in `where`.
   * Returns the count for the service to interpret.
   */
  async update(db: Db, id: string, data: UpdateGroupData) {
    const result = await db.socialGroup.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    return result.count;
  },

  /**
   * Soft-delete (sets deletedAt). Idempotent: zero affected rows means
   * the group was already deleted or RLS hid it.
   */
  async softDelete(db: Db, id: string) {
    const result = await db.socialGroup.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  },

  // ── Members ───────────────────────────────────────────────────────────────

  listMembers(db: Db, socialGroupId: string) {
    return db.socialGroupMember.findMany({
      where: { socialGroupId },
      orderBy: { joinedAt: 'asc' },
      select: memberSelect,
    });
  },

  findMember(db: Db, socialGroupId: string, userId: string) {
    return db.socialGroupMember.findUnique({
      where: { socialGroupId_userId: { socialGroupId, userId } },
      select: memberSelect,
    });
  },

  countAdmins(db: Db, socialGroupId: string) {
    return db.socialGroupMember.count({
      where: { socialGroupId, role: SocialGroupRole.ADMIN },
    });
  },

  addMember(
    db: Db,
    socialGroupId: string,
    userId: string,
    role: SocialGroupRole = SocialGroupRole.MEMBER,
  ) {
    return db.socialGroupMember.create({
      data: { socialGroupId, userId, role },
      select: memberSelect,
    });
  },

  /**
   * Hard-delete a member row. No-op if no row exists. Returns the count
   * so the service can decide between 204 and 404.
   */
  async removeMember(db: Db, socialGroupId: string, userId: string) {
    const result = await db.socialGroupMember.deleteMany({
      where: { socialGroupId, userId },
    });
    return result.count;
  },

  updateMemberRole(
    db: Db,
    socialGroupId: string,
    userId: string,
    role: SocialGroupRole,
  ) {
    return db.socialGroupMember.update({
      where: { socialGroupId_userId: { socialGroupId, userId } },
      data: { role },
      select: memberSelect,
    });
  },

  // ── Polls ─────────────────────────────────────────────────────────────────

  listPolls(db: Db, socialGroupId: string, openOnly: boolean) {
    return db.groupPoll.findMany({
      where: {
        socialGroupId,
        ...(openOnly ? { closedAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: pollSelect,
    });
  },

  findPollById(db: Db, pollId: string) {
    return db.groupPoll.findUnique({
      where: { id: pollId },
      select: pollSelect,
    });
  },

  /**
   * Bare poll lookup for permission checks — avoids hauling options +
   * votes when all the service needs is `socialGroupId` / `createdById`
   * / `closedAt`.
   */
  findPollMeta(db: Db, pollId: string) {
    return db.groupPoll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        socialGroupId: true,
        createdById: true,
        closedAt: true,
      },
    });
  },

  createPoll(db: Db, data: CreatePollData) {
    return db.groupPoll.create({
      data: {
        socialGroupId: data.socialGroupId,
        createdById: data.createdById,
        question: data.question,
        eventId: data.eventId,
        options: {
          create: data.options.map((text, index) => ({
            text,
            order: index,
          })),
        },
      },
      select: pollSelect,
    });
  },

  async closePoll(db: Db, pollId: string) {
    const result = await db.groupPoll.updateMany({
      where: { id: pollId, closedAt: null },
      data: { closedAt: new Date() },
    });
    return result.count;
  },

  /**
   * Cascade-delete a poll: PollVote → PollOption → GroupPoll, all in
   * the same transaction. The schema has no DB-level cascade so we do
   * it explicitly. Caller must already be inside `request.prismaTransaction`.
   */
  async deletePollCascade(db: Db, pollId: string) {
    await db.pollVote.deleteMany({
      where: { pollOption: { pollId } },
    });
    await db.pollOption.deleteMany({ where: { pollId } });
    await db.groupPoll.delete({ where: { id: pollId } });
  },

  // ── Poll votes ────────────────────────────────────────────────────────────

  findPollOption(db: Db, optionId: string) {
    return db.pollOption.findUnique({
      where: { id: optionId },
      select: { id: true, pollId: true },
    });
  },

  findPollVote(db: Db, pollOptionId: string, userId: string) {
    return db.pollVote.findUnique({
      where: { pollOptionId_userId: { pollOptionId, userId } },
    });
  },

  createPollVote(db: Db, pollOptionId: string, userId: string) {
    return db.pollVote.create({
      data: { pollOptionId, userId },
    });
  },

  async deletePollVote(db: Db, pollOptionId: string, userId: string) {
    const result = await db.pollVote.deleteMany({
      where: { pollOptionId, userId },
    });
    return result.count;
  },

  // ── Suggestions ───────────────────────────────────────────────────────────

  listSuggestions(db: Db, socialGroupId: string) {
    return db.eventSuggestion.findMany({
      where: { socialGroupId },
      orderBy: { createdAt: 'desc' },
      select: suggestionSelect,
    });
  },

  findSuggestionById(db: Db, suggestionId: string) {
    return db.eventSuggestion.findUnique({
      where: { id: suggestionId },
      select: suggestionSelect,
    });
  },

  /**
   * Lightweight suggestion lookup for permission checks.
   */
  findSuggestionMeta(db: Db, suggestionId: string) {
    return db.eventSuggestion.findUnique({
      where: { id: suggestionId },
      select: {
        id: true,
        socialGroupId: true,
        suggestedById: true,
        eventId: true,
      },
    });
  },

  createSuggestion(db: Db, data: CreateSuggestionData) {
    return db.eventSuggestion.create({
      data: {
        socialGroupId: data.socialGroupId,
        suggestedById: data.suggestedById,
        title: data.title,
        description: data.description,
        proposedDate: data.proposedDate,
        eventId: data.eventId,
      },
      select: suggestionSelect,
    });
  },

  /**
   * Cascade-delete a suggestion and its votes in one transaction.
   */
  async deleteSuggestionCascade(db: Db, suggestionId: string) {
    await db.suggestionVote.deleteMany({ where: { suggestionId } });
    await db.eventSuggestion.delete({ where: { id: suggestionId } });
  },

  // ── Suggestion votes ──────────────────────────────────────────────────────

  /**
   * Upsert on the (suggestionId, userId) unique key. Handles the
   * "change your vote" case atomically — no separate read-then-write.
   */
  upsertSuggestionVote(
    db: Db,
    suggestionId: string,
    userId: string,
    value: SuggestionVoteValue,
  ) {
    return db.suggestionVote.upsert({
      where: { suggestionId_userId: { suggestionId, userId } },
      create: { suggestionId, userId, value },
      update: { value },
    });
  },

  async deleteSuggestionVote(db: Db, suggestionId: string, userId: string) {
    const result = await db.suggestionVote.deleteMany({
      where: { suggestionId, userId },
    });
    return result.count;
  },

  /**
   * Reads `allowSuggestionVoting` on the event a suggestion is tied to.
   * Returns null if the suggestion has no eventId (group-general
   * suggestion, voting always allowed) or the event is gone / RLS-hidden.
   */
  findEventVotingFlag(db: Db, eventId: string) {
    return db.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, allowSuggestionVoting: true },
    });
  },
};

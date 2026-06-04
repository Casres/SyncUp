import { Prisma, ConversationType } from '@prisma/client';
import type {
  Conversation,
  ConversationParticipant,
  Message,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { Db } from './_types.js';
import { publicProfileSelect } from './_userSelects.js';

/**
 * Conversations (messaging) repository — R18.
 *
 * Two client policies, kept deliberately explicit per method:
 *
 *  - READS go through the per-request app client (`Db`, i.e.
 *    `request.prismaTransaction`) so RLS gates them. The SELECT policies
 *    (migration `20260603000001_messaging`) make a Conversation / Message
 *    visible only to participants, and a ConversationParticipant row visible
 *    only to its own owner.
 *
 *  - WRITES and CO-PARTICIPANT / LINKED-NAME hydration go through the
 *    migration-owner `prisma` client, which bypasses RLS. They are cross-user
 *    by nature (a message is read by every participant; a conversation seeds
 *    participant rows for other users; a group/DM inbox row must render the
 *    OTHER members' avatars, whose CP rows the app client cannot see). The
 *    SERVICE layer gates WHO may trigger these — exactly the contract
 *    `notificationsRepository.create` follows. Methods that touch the owner
 *    client are suffixed `…Owner` so the privileged boundary is auditable.
 */

const messageWithSenderInclude = {
  sender: { select: publicProfileSelect },
} satisfies Prisma.MessageInclude;

export type MessageWithSender = Prisma.MessageGetPayload<{
  include: typeof messageWithSenderInclude;
}>;

export type ParticipantWithUser = {
  conversationId: string;
  userId: string;
  joinedAt: Date;
  lastReadMessageId: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export const conversationsRepository = {
  // ─── App-client reads (RLS-gated) ──────────────────────────────────────────

  /**
   * The caller's own participant row for a conversation, or null. Doubles as
   * the membership gate: under RLS the app client can only ever see its own
   * CP rows, so a non-participant gets null.
   */
  findMyParticipation(
    db: Db,
    conversationId: string,
    userId: string,
  ): Promise<ConversationParticipant | null> {
    return db.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
  },

  /** Every participation row for the caller — the inbox starting point. */
  listMyParticipations(
    db: Db,
    userId: string,
  ): Promise<ConversationParticipant[]> {
    return db.conversationParticipant.findMany({ where: { userId } });
  },

  /**
   * Conversations by id, newest-activity first, EXCLUDING archived
   * (`archivedAt IS NULL` — R18 D3). RLS additionally hides any the caller
   * is not a participant of (belt-and-braces; the ids already come from the
   * caller's own participations).
   */
  listConversationsByIds(db: Db, ids: string[]): Promise<Conversation[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return db.conversation.findMany({
      where: { id: { in: ids }, archivedAt: null },
      orderBy: { lastMessageAt: 'desc' },
    });
  },

  findConversationById(db: Db, id: string): Promise<Conversation | null> {
    return db.conversation.findUnique({ where: { id } });
  },

  /**
   * One page of a thread, newest-first, cursor on `sentAt`. The caller passes
   * the `sentAt` of the oldest message already loaded to page backwards.
   */
  listMessages(
    db: Db,
    conversationId: string,
    opts: { limit: number; before?: Date },
  ): Promise<MessageWithSender[]> {
    return db.message.findMany({
      where: {
        conversationId,
        ...(opts.before ? { sentAt: { lt: opts.before } } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: opts.limit,
      include: messageWithSenderInclude,
    });
  },

  findMessageById(db: Db, id: string): Promise<Message | null> {
    return db.message.findUnique({ where: { id } });
  },

  /**
   * Unread count for the caller: messages after the read cursor that the
   * caller did not send. App-client read — the participant can see every
   * message in their own conversation.
   */
  countUnread(
    db: Db,
    conversationId: string,
    userId: string,
    after: Date | undefined,
  ): Promise<number> {
    return db.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        ...(after ? { sentAt: { gt: after } } : {}),
      },
    });
  },

  // ─── Owner-client hydration (gated by the service) ─────────────────────────

  /**
   * All participants (with public profiles) for the given conversations.
   * Owner client — co-participant CP rows are invisible to the app client by
   * design (own-rows-only RLS). The service calls this only after proving the
   * caller participates in each conversation.
   */
  async listParticipantsForConversationsOwner(
    conversationIds: string[],
  ): Promise<ParticipantWithUser[]> {
    if (conversationIds.length === 0) return [];
    const rows = await prisma.conversationParticipant.findMany({
      where: { conversationId: { in: conversationIds } },
      select: {
        conversationId: true,
        userId: true,
        joinedAt: true,
        lastReadMessageId: true,
        user: { select: publicProfileSelect },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return rows;
  },

  /** Linked FriendGroup names (owner — group rows are owner-private). */
  async getLinkedGroupNamesOwner(
    groupIds: string[],
  ): Promise<Map<string, string>> {
    if (groupIds.length === 0) return new Map();
    const groups = await prisma.friendGroup.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true },
    });
    return new Map(groups.map((g) => [g.id, g.name]));
  },

  /** Linked Event titles (owner — event visibility varies per viewer). */
  async getLinkedEventTitlesOwner(
    eventIds: string[],
  ): Promise<Map<string, string>> {
    if (eventIds.length === 0) return new Map();
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true },
    });
    return new Map(events.map((e) => [e.id, e.title]));
  },

  // ─── Owner-client idempotency lookups ──────────────────────────────────────

  /**
   * The existing DIRECT conversation between two users, or null. Owner client:
   * the app client cannot see the OTHER user's participant row, so a
   * symmetric "both are participants" lookup must bypass RLS. Gated upstream
   * by the friendship + block checks in the service.
   */
  async findDirectConversationOwner(
    userAId: string,
    userBId: string,
  ): Promise<{ id: string } | null> {
    const rows = await prisma.conversation.findMany({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          { participants: { some: { userId: userAId } } },
          { participants: { some: { userId: userBId } } },
        ],
      },
      select: { id: true },
      take: 1,
    });
    return rows[0] ?? null;
  },

  /**
   * Distinct user ids to seed an EVENT conversation: every organiser plus
   * every invitee (any status). Owner client — the host enabling chat should
   * seed all invitees regardless of the host's per-row RLS visibility.
   */
  async getEventParticipantUserIdsOwner(eventId: string): Promise<string[]> {
    const [organisers, invites] = await Promise.all([
      prisma.eventOrganiser.findMany({
        where: { eventId },
        select: { userId: true },
      }),
      prisma.eventInvite.findMany({
        where: { eventId },
        select: { recipientId: true },
      }),
    ]);
    const ids = new Set<string>();
    for (const o of organisers) ids.add(o.userId);
    for (const i of invites) ids.add(i.recipientId);
    return Array.from(ids);
  },

  /** Existing GROUP/EVENT conversation for a linked entity, or null. */
  async findLinkedConversationOwner(
    type: ConversationType,
    linked: { groupId?: string; eventId?: string },
  ): Promise<{ id: string } | null> {
    const row = await prisma.conversation.findFirst({
      where: {
        type,
        ...(linked.groupId ? { linkedGroupId: linked.groupId } : {}),
        ...(linked.eventId ? { linkedEventId: linked.eventId } : {}),
      },
      select: { id: true },
    });
    return row;
  },

  // ─── Owner-client writes ───────────────────────────────────────────────────

  /**
   * Create a conversation and seed its participants atomically. Owner client
   * (bypasses RLS — the seed writes CP rows for users other than the caller).
   * `participantUserIds` is deduped by the caller.
   */
  createConversationOwner(data: {
    type: ConversationType;
    linkedGroupId?: string | null;
    linkedEventId?: string | null;
    participantUserIds: string[];
  }): Promise<Conversation> {
    return prisma.conversation.create({
      data: {
        type: data.type,
        linkedGroupId: data.linkedGroupId ?? null,
        linkedEventId: data.linkedEventId ?? null,
        participants: {
          create: data.participantUserIds.map((userId) => ({ userId })),
        },
      },
    });
  },

  /**
   * Idempotently add a participant (no-op if already present). Owner client —
   * adds a CP row for a user other than the caller (group member join).
   */
  async addParticipantOwner(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await prisma.conversationParticipant.create({
        data: { conversationId, userId },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return; // already a participant
      }
      throw err;
    }
  },

  /**
   * Persist a message and bump the parent conversation's `lastMessageAt` to
   * the message's `sentAt`, in one owner-client transaction. Owner client:
   * the row is read by every other participant, and routing the write here
   * means the INSERT...RETURNING never re-evaluates a SELECT policy (avoiding
   * the snapshot-isolation class of bug entirely).
   */
  async createMessageOwner(data: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<MessageWithSender> {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
        },
        include: messageWithSenderInclude,
      });
      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: message.sentAt },
      });
      return message;
    });
  },

  /**
   * Advance the caller's private read cursor. Owner client (no app-client
   * write policy exists — writes fail closed there). The `userId` filter
   * keeps it scoped to the caller's own row.
   */
  async setLastReadOwner(
    conversationId: string,
    userId: string,
    messageId: string,
  ): Promise<void> {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadMessageId: messageId },
    });
  },
};

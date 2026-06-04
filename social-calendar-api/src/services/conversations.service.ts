import type { Server } from 'socket.io';
import { ConversationType, NotifType } from '@prisma/client';
import type { Conversation } from '@prisma/client';
import {
  conversationsRepository,
  type MessageWithSender,
  type ParticipantWithUser,
} from '../repositories/conversations.repository.js';
import { eventsRepository } from '../repositories/events.repository.js';
import { friendsRepository } from '../repositories/friends.repository.js';
import { notificationsService } from './notifications.service.js';
import type { Db } from '../repositories/_types.js';
import type {
  ClientToServerEvents,
  ConversationSummaryWire,
  InboxItemWire,
  InterServerEvents,
  MessageWire,
  PublicProfile,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ─── Domain errors ──────────────────────────────────────────────────────────

export class ConversationNotFoundError extends Error {
  constructor(id: string) {
    super(`Conversation ${id} not found`);
    this.name = 'ConversationNotFoundError';
  }
}

/** Caller is not a participant of the conversation. → 403. */
export class ConversationForbiddenError extends Error {
  constructor(id: string) {
    super(`Caller is not a participant of conversation ${id}`);
    this.name = 'ConversationForbiddenError';
  }
}

/** No accepted friendship, or a block exists. → 403. */
export class DirectMessageForbiddenError extends Error {
  constructor(friendId: string) {
    super(`Cannot open a direct conversation with ${friendId}`);
    this.name = 'DirectMessageForbiddenError';
  }
}

/** Caller is not an organiser of the event. → 403. */
export class EventChatForbiddenError extends Error {
  constructor(eventId: string) {
    super(`Caller cannot enable chat for event ${eventId}`);
    this.name = 'EventChatForbiddenError';
  }
}

export class EventNotFoundError extends Error {
  constructor(id: string) {
    super(`Event ${id} not found`);
    this.name = 'EventNotFoundError';
  }
}

// ─── Wire shaping ─────────────────────────────────────────────────────────────

function toMessageWire(m: MessageWithSender): MessageWire {
  return {
    id: m.id,
    conversationId: m.conversationId,
    content: m.content,
    sentAt: m.sentAt.toISOString(),
    sender: m.sender,
  };
}

/**
 * Compute the display title for a conversation row:
 *   - DIRECT → the OTHER participant's display name
 *   - GROUP  → the linked FriendGroup name
 *   - EVENT  → the linked Event title
 */
function titleFor(
  conv: Conversation,
  participants: PublicProfile[],
  viewerId: string,
  groupNames: Map<string, string>,
  eventTitles: Map<string, string>,
): string {
  if (conv.type === ConversationType.DIRECT) {
    const other = participants.find((p) => p.id !== viewerId);
    return other?.displayName ?? 'Direct message';
  }
  if (conv.type === ConversationType.GROUP) {
    return (conv.linkedGroupId && groupNames.get(conv.linkedGroupId)) || 'Group';
  }
  return (conv.linkedEventId && eventTitles.get(conv.linkedEventId)) || 'Event';
}

function toSummary(
  conv: Conversation,
  participants: PublicProfile[],
  viewerId: string,
  groupNames: Map<string, string>,
  eventTitles: Map<string, string>,
): ConversationSummaryWire {
  return {
    id: conv.id,
    type: conv.type,
    title: titleFor(conv, participants, viewerId, groupNames, eventTitles),
    linkedGroupId: conv.linkedGroupId,
    linkedEventId: conv.linkedEventId,
    participants,
  };
}

/** Group hydrated participant rows by conversationId. */
function groupParticipants(
  rows: ParticipantWithUser[],
): Map<string, ParticipantWithUser[]> {
  const map = new Map<string, ParticipantWithUser[]>();
  for (const row of rows) {
    const arr = map.get(row.conversationId) ?? [];
    arr.push(row);
    map.set(row.conversationId, arr);
  }
  return map;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const conversationsService = {
  /**
   * Inbox: every non-archived conversation the caller participates in, newest
   * activity first, with a last-message preview and the caller's unread count
   * (D1 — derived from their private read cursor).
   *
   * N+1 note: last-message + unread are fetched per conversation. Acceptable
   * for v1 (mirrors the documented re-fetch trade-offs elsewhere); revisit
   * with a windowed aggregate if inbox latency becomes a problem.
   */
  async getInbox(db: Db, userId: string): Promise<InboxItemWire[]> {
    const myParts = await conversationsRepository.listMyParticipations(
      db,
      userId,
    );
    if (myParts.length === 0) return [];

    const convs = await conversationsRepository.listConversationsByIds(
      db,
      myParts.map((p) => p.conversationId),
    );
    if (convs.length === 0) return [];

    const visibleIds = convs.map((c) => c.id);
    const partRows =
      await conversationsRepository.listParticipantsForConversationsOwner(
        visibleIds,
      );
    const byConv = groupParticipants(partRows);

    const groupNames = await conversationsRepository.getLinkedGroupNamesOwner(
      convs.flatMap((c) =>
        c.type === ConversationType.GROUP && c.linkedGroupId
          ? [c.linkedGroupId]
          : [],
      ),
    );
    const eventTitles = await conversationsRepository.getLinkedEventTitlesOwner(
      convs.flatMap((c) =>
        c.type === ConversationType.EVENT && c.linkedEventId
          ? [c.linkedEventId]
          : [],
      ),
    );
    const myPartByConv = new Map(myParts.map((p) => [p.conversationId, p]));

    const items: InboxItemWire[] = [];
    for (const conv of convs) {
      const participants = (byConv.get(conv.id) ?? []).map((p) => p.user);
      const myPart = myPartByConv.get(conv.id);

      const [lastMsg] = await conversationsRepository.listMessages(db, conv.id, {
        limit: 1,
      });

      // Read baseline: the cursor message's sentAt, else the time the caller
      // joined (so messages predating their join don't count as unread).
      let after: Date | undefined = myPart?.joinedAt;
      if (myPart?.lastReadMessageId) {
        const cursorMsg = await conversationsRepository.findMessageById(
          db,
          myPart.lastReadMessageId,
        );
        if (cursorMsg) after = cursorMsg.sentAt;
      }
      const unreadCount = await conversationsRepository.countUnread(
        db,
        conv.id,
        userId,
        after,
      );

      items.push({
        ...toSummary(conv, participants, userId, groupNames, eventTitles),
        lastMessage: lastMsg ? toMessageWire(lastMsg) : null,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        unreadCount,
      });
    }
    return items;
  },

  /**
   * One page of a thread plus the conversation summary (for the header).
   * Messages are newest-first; `nextCursor` is the `sentAt` of the oldest row
   * in the page, or null when the start of history is reached.
   */
  async getThread(
    db: Db,
    userId: string,
    conversationId: string,
    opts: { limit: number; before?: Date },
  ): Promise<{
    conversation: ConversationSummaryWire;
    messages: MessageWire[];
    nextCursor: string | null;
  }> {
    await this.assertParticipant(db, conversationId, userId);

    const conv = await conversationsRepository.findConversationById(
      db,
      conversationId,
    );
    if (!conv) throw new ConversationNotFoundError(conversationId);

    const partRows =
      await conversationsRepository.listParticipantsForConversationsOwner([
        conversationId,
      ]);
    const participants = partRows.map((p) => p.user);
    const groupNames = await conversationsRepository.getLinkedGroupNamesOwner(
      conv.linkedGroupId ? [conv.linkedGroupId] : [],
    );
    const eventTitles = await conversationsRepository.getLinkedEventTitlesOwner(
      conv.linkedEventId ? [conv.linkedEventId] : [],
    );

    const rows = await conversationsRepository.listMessages(db, conversationId, {
      limit: opts.limit,
      before: opts.before,
    });
    const oldest = rows[rows.length - 1];
    const nextCursor =
      rows.length === opts.limit && oldest ? oldest.sentAt.toISOString() : null;

    return {
      conversation: toSummary(conv, participants, userId, groupNames, eventTitles),
      messages: rows.map(toMessageWire),
      nextCursor,
    };
  },

  /**
   * Membership gate. The caller's own CP row is the only one RLS exposes to
   * the app client, so a null result means "not a participant".
   */
  async assertParticipant(db: Db, conversationId: string, userId: string) {
    const mine = await conversationsRepository.findMyParticipation(
      db,
      conversationId,
      userId,
    );
    if (!mine) throw new ConversationForbiddenError(conversationId);
    return mine;
  },

  /**
   * Get-or-create the 1:1 conversation with `friendId` (R17-9, idempotent).
   * Requires an accepted friendship and no block (block-check first, mirroring
   * the locked availability gate).
   */
  async getOrCreateDirect(
    db: Db,
    io: IoServer | undefined,
    userId: string,
    friendId: string,
  ): Promise<ConversationSummaryWire> {
    if (friendId === userId) throw new DirectMessageForbiddenError(friendId);

    // Block check first (either direction), then accepted-friendship check.
    const blockedByThem = await friendsRepository.findBlock(db, friendId, userId);
    const blockedByMe = await friendsRepository.findBlock(db, userId, friendId);
    if (blockedByThem || blockedByMe) {
      throw new DirectMessageForbiddenError(friendId);
    }
    const friends = await friendsRepository.hasAcceptedFriendship(
      db,
      userId,
      friendId,
    );
    if (!friends) throw new DirectMessageForbiddenError(friendId);

    const existing = await conversationsRepository.findDirectConversationOwner(
      userId,
      friendId,
    );
    const convId = existing
      ? existing.id
      : (
          await conversationsRepository.createConversationOwner({
            type: ConversationType.DIRECT,
            participantUserIds: [userId, friendId],
          })
        ).id;

    if (!existing && io) {
      // Tell the other party a thread now exists so their inbox refetches.
      io.to(`user:${friendId}`).emit('chat:conversation:new', {
        conversationId: convId,
      });
    }

    return this.getSummary(db, userId, convId);
  },

  /**
   * Send a message. Membership-gated, persisted via the owner client, then
   * fanned out: `chat:message:new` to the conversation room and a
   * notification to every other participant.
   */
  async sendMessage(
    db: Db,
    io: IoServer | undefined,
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageWire> {
    await this.assertParticipant(db, conversationId, userId);

    const message = await conversationsRepository.createMessageOwner({
      conversationId,
      senderId: userId,
      content,
    });
    const wire = toMessageWire(message);

    // Advance the sender's own read cursor — their own message is "read".
    await conversationsRepository.setLastReadOwner(
      conversationId,
      userId,
      message.id,
    );

    if (io) {
      io.to(`conversation:${conversationId}`).emit('chat:message:new', {
        conversationId,
        message: wire,
      });
    }

    // Notify the other participants (owner-client hydration — gated by the
    // membership check above).
    const partRows =
      await conversationsRepository.listParticipantsForConversationsOwner([
        conversationId,
      ]);
    const conv = await conversationsRepository.findConversationById(
      db,
      conversationId,
    );
    const recipients = partRows.filter((p) => p.userId !== userId);
    const senderName = message.sender.displayName;
    const preview = content.slice(0, 140);
    for (const r of recipients) {
      try {
        // Dispatched as GROUP_ACTIVITY (no dedicated MESSAGE NotifType yet) so
        // the existing mobile group_activity card renders it. The extra
        // `conversation*` fields are the R18 M4 routing hint: the NotifSheet
        // routes to the thread when `conversationId` is present, picking
        // EventChat vs MessageThread by `conversationType`.
        await notificationsService.dispatch(db, io, {
          userId: r.userId,
          type: NotifType.GROUP_ACTIVITY,
          payload: {
            // group_activity card render fields
            groupId: conversationId,
            groupName: senderName,
            groupInitial: (senderName.trim()[0] ?? '?').toUpperCase(),
            summary: preview,
            // R18 M4 routing hint
            conversationId,
            conversationType: conv?.type ?? null,
            linkedEventId: conv?.linkedEventId ?? null,
            messageId: message.id,
            senderId: userId,
            senderName,
            preview,
          },
          groupKey: `conversation:${conversationId}`,
        });
      } catch {
        // Dispatch is best-effort — never fail the send on a notif error.
      }
    }

    return wire;
  },

  /**
   * Advance the caller's private read cursor to `messageId` (D1). The message
   * must belong to a conversation the caller participates in.
   */
  async markRead(
    db: Db,
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await this.assertParticipant(db, conversationId, userId);
    await conversationsRepository.setLastReadOwner(
      conversationId,
      userId,
      messageId,
    );
  },

  /**
   * Host enables chat for an event (organiser-only). Idempotent — returns the
   * existing EVENT conversation if one already exists. Seeds participants =
   * organisers + all current invitees.
   */
  async enableEventChat(
    db: Db,
    io: IoServer | undefined,
    userId: string,
    eventId: string,
  ): Promise<ConversationSummaryWire> {
    const event = await eventsRepository.findById(db, eventId);
    if (!event) throw new EventNotFoundError(eventId);

    const organiser = await eventsRepository.findOrganiser(db, eventId, userId);
    if (!organiser) throw new EventChatForbiddenError(eventId);

    const existing = await conversationsRepository.findLinkedConversationOwner(
      ConversationType.EVENT,
      { eventId },
    );
    if (existing) return this.getSummary(db, userId, existing.id);

    const participantUserIds =
      await conversationsRepository.getEventParticipantUserIdsOwner(eventId);

    const conv = await conversationsRepository.createConversationOwner({
      type: ConversationType.EVENT,
      linkedEventId: eventId,
      participantUserIds,
    });

    if (io) {
      for (const pid of participantUserIds) {
        io.to(`user:${pid}`).emit('chat:conversation:new', {
          conversationId: conv.id,
        });
      }
    }

    return this.getSummary(db, userId, conv.id);
  },

  // ─── Auto-create hooks (called by friendGroups.service) ────────────────────

  /**
   * Ensure a GROUP conversation exists for a FriendGroup (R17-10 / R18 D4).
   * Called as an internal side effect of FriendGroup creation — never via a
   * public route. Idempotent.
   */
  async ensureGroupConversation(
    io: IoServer | undefined,
    groupId: string,
    memberUserIds: string[],
  ): Promise<void> {
    const existing = await conversationsRepository.findLinkedConversationOwner(
      ConversationType.GROUP,
      { groupId },
    );
    if (existing) return;

    const conv = await conversationsRepository.createConversationOwner({
      type: ConversationType.GROUP,
      linkedGroupId: groupId,
      participantUserIds: Array.from(new Set(memberUserIds)),
    });

    if (io) {
      for (const uid of memberUserIds) {
        io.to(`user:${uid}`).emit('chat:conversation:new', {
          conversationId: conv.id,
        });
      }
    }
  },

  /**
   * Add a member to a FriendGroup's chat when they join the group. Idempotent;
   * a no-op if the group has no conversation yet.
   */
  async addGroupParticipant(
    io: IoServer | undefined,
    groupId: string,
    userId: string,
  ): Promise<void> {
    const conv = await conversationsRepository.findLinkedConversationOwner(
      ConversationType.GROUP,
      { groupId },
    );
    if (!conv) return;

    await conversationsRepository.addParticipantOwner(conv.id, userId);
    if (io) {
      io.to(`user:${userId}`).emit('chat:conversation:new', {
        conversationId: conv.id,
      });
    }
  },

  // ─── Internal ──────────────────────────────────────────────────────────────

  /** Build a ConversationSummaryWire for a single conversation (gated read). */
  async getSummary(
    db: Db,
    viewerId: string,
    conversationId: string,
  ): Promise<ConversationSummaryWire> {
    const conv = await conversationsRepository.findConversationById(
      db,
      conversationId,
    );
    if (!conv) throw new ConversationNotFoundError(conversationId);
    const partRows =
      await conversationsRepository.listParticipantsForConversationsOwner([
        conversationId,
      ]);
    const groupNames = await conversationsRepository.getLinkedGroupNamesOwner(
      conv.linkedGroupId ? [conv.linkedGroupId] : [],
    );
    const eventTitles = await conversationsRepository.getLinkedEventTitlesOwner(
      conv.linkedEventId ? [conv.linkedEventId] : [],
    );
    return toSummary(
      conv,
      partRows.map((p) => p.user),
      viewerId,
      groupNames,
      eventTitles,
    );
  },
};

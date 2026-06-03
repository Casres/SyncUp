import { EventOrganiserRole, InviteStatus, Prisma } from '@prisma/client';
import type { NotifChannel } from '@prisma/client';
import type { Db } from './_types.js';
import { publicProfileSelect } from './_userSelects.js';

// Re-exported for any consumer that imported `Db` from this module
// before `_types.ts` was extracted.
export type { Db };

const eventInclude = {
  creator: { select: publicProfileSelect },
  organisers: {
    select: {
      id: true,
      role: true,
      user: { select: publicProfileSelect },
    },
  },
  invites: {
    select: {
      id: true,
      status: true,
      friendGroupId: true,
      recipient: { select: publicProfileSelect },
    },
  },
} satisfies Prisma.EventInclude;

export type EventWithRelations = Prisma.EventGetPayload<{
  include: typeof eventInclude;
}>;

export type EventListItem = Prisma.EventGetPayload<{
  include: {
    creator: { select: typeof publicProfileSelect };
    organisers: {
      select: {
        id: true;
        role: true;
        user: { select: typeof publicProfileSelect };
      };
    };
  };
}>;

export type ListEventsFilters = {
  fromDate?: Date;
  toDate?: Date;
  limit: number;
};

export type CreateEventData = {
  creatorId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  recurrence?: Prisma.EventCreateInput['recurrence'];
  recurrenceRuleRaw?: string;
  allowSuggestionVoting?: boolean;
};

export type UpdateEventData = {
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  recurrence?: Prisma.EventUpdateInput['recurrence'];
  recurrenceRuleRaw?: string | null;
  allowSuggestionVoting?: boolean;
};

export const eventsRepository = {
  /**
   * Returns the event by id if it exists, is not soft-deleted, and is
   * visible to the current user (RLS enforces visibility).
   */
  findById(db: Db, id: string) {
    return db.event.findFirst({
      where: { id, deletedAt: null },
      include: eventInclude,
    });
  },

  /**
   * Lists events visible to the current user (RLS filters by
   * creator/organiser/invitee), ordered by startsAt ascending.
   */
  list(db: Db, filters: ListEventsFilters) {
    const startsAt: Prisma.DateTimeFilter = {};
    if (filters.fromDate) startsAt.gte = filters.fromDate;
    if (filters.toDate) startsAt.lte = filters.toDate;

    return db.event.findMany({
      where: {
        deletedAt: null,
        ...(filters.fromDate || filters.toDate ? { startsAt } : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: filters.limit,
      include: {
        creator: { select: publicProfileSelect },
        organisers: {
          select: {
            id: true,
            role: true,
            user: { select: publicProfileSelect },
          },
        },
      },
    });
  },

  /**
   * Creates the event AND the CREATOR EventOrganiser row in a single
   * write. Both rows materialise atomically — no separate round trip
   * needed and the creator can never end up without an organiser row.
   */
  create(db: Db, data: CreateEventData) {
    return db.event.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        recurrence: data.recurrence,
        recurrenceRuleRaw: data.recurrenceRuleRaw,
        allowSuggestionVoting: data.allowSuggestionVoting,
        creator: { connect: { id: data.creatorId } },
        organisers: {
          create: {
            role: EventOrganiserRole.CREATOR,
            user: { connect: { id: data.creatorId } },
          },
        },
      },
      include: eventInclude,
    });
  },

  /**
   * Updates an event. Caller must verify the event is visible and the
   * user is an organiser; this method does not re-check.
   *
   * Soft-delete safety: Prisma's `update` doesn't accept non-unique
   * filters in `where`, so we use `updateMany` to also enforce
   * `deletedAt: null`, then re-fetch via `findById`. Returns null if no
   * row was updated (already deleted, or RLS hid it).
   */
  async update(db: Db, id: string, data: UpdateEventData) {
    const result = await db.event.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.findById(db, id);
  },

  /**
   * Soft-deletes by setting deletedAt. Idempotent — soft-deleting an
   * already-deleted event is a no-op (count = 0). Returns true if a row
   * was actually flipped from non-deleted to deleted.
   */
  async softDelete(db: Db, id: string) {
    const result = await db.event.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count > 0;
  },

  /**
   * Returns the EventOrganiser row for (eventId, userId), or null.
   * Used by the service to gate UPDATE / DELETE on organiser status.
   */
  findOrganiser(db: Db, eventId: string, userId: string) {
    return db.eventOrganiser.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
  },

  // ─── Invites ─────────────────────────────────────────────────────────

  /**
   * Bulk-create invites for an event. Uses `createMany` with
   * `skipDuplicates: true` so re-running the request with overlapping
   * recipients is idempotent against the `@@unique([eventId,
   * recipientId])` constraint. Returns the resulting full set of
   * invites (including any that already existed) so the controller can
   * echo back a complete picture.
   *
   * `friendGroupId` is an audit-trail field: when a creator blasts a
   * FriendGroup, the same FriendGroup id is stamped onto every
   * resulting EventInvite. The service is responsible for expanding
   * the group into individual recipient ids.
   */
  async createInvitesIncremental(
    db: Db,
    eventId: string,
    recipientIds: string[],
    friendGroupId: string | null,
    notifChannel: NotifChannel | null,
  ) {
    if (recipientIds.length === 0) return [];
    await db.eventInvite.createMany({
      data: recipientIds.map((recipientId) => ({
        eventId,
        recipientId,
        status: InviteStatus.PENDING,
        friendGroupId,
        notifChannel,
      })),
      skipDuplicates: true,
    });
    return db.eventInvite.findMany({
      where: { eventId, recipientId: { in: recipientIds } },
      include: {
        recipient: {
          select: publicProfileSelect,
        },
      },
    });
  },

  /**
   * Pre-fetch existing invites for the given recipient list so the
   * service can detect which recipients are NEW vs duplicate (used to
   * skip notification fan-out on idempotent re-sends).
   */
  findInvitesForRecipients(
    db: Db,
    eventId: string,
    recipientIds: string[],
  ) {
    if (recipientIds.length === 0) return Promise.resolve([]);
    return db.eventInvite.findMany({
      where: { eventId, recipientId: { in: recipientIds } },
      select: { id: true, recipientId: true },
    });
  },

  /**
   * Find a single invite, gated to a specific event for safety. RLS
   * keeps non-participants from reading invites they shouldn't see.
   */
  findInvite(db: Db, eventId: string, inviteId: string) {
    return db.eventInvite.findFirst({
      where: { id: inviteId, eventId },
      include: { recipient: { select: publicProfileSelect } },
    });
  },

  /**
   * Update invite status (RSVP). Returns null if no row matched
   * (already deleted, or RLS hid it). The service should re-check the
   * recipient identity to enforce "only the recipient can RSVP".
   */
  async updateInviteStatus(
    db: Db,
    eventId: string,
    inviteId: string,
    status: InviteStatus,
  ) {
    const result = await db.eventInvite.updateMany({
      where: { id: inviteId, eventId },
      data: { status },
    });
    if (result.count === 0) return null;
    return this.findInvite(db, eventId, inviteId);
  },

  /**
   * Hard-delete an invite. Used by the organiser to rescind. Returns
   * the row count so the controller can pick 204 vs 404.
   */
  async deleteInvite(db: Db, eventId: string, inviteId: string) {
    const result = await db.eventInvite.deleteMany({
      where: { id: inviteId, eventId },
    });
    return result.count;
  },

  /**
   * Find the invite belonging to a specific recipient for an event.
   * Used by the convenience RSVP endpoint — the caller supplies only
   * `eventId` + their own userId; we resolve the inviteId internally.
   */
  findInviteForRecipient(db: Db, eventId: string, recipientId: string) {
    return db.eventInvite.findFirst({
      where: { eventId, recipientId },
      include: { recipient: { select: publicProfileSelect } },
    });
  },
};

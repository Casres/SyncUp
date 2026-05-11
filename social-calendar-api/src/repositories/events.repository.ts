import { EventOrganiserRole, Prisma } from '@prisma/client';
import type { Db } from './_types.js';

// Re-exported for any consumer that imported `Db` from this module
// before `_types.ts` was extracted.
export type { Db };

const publicProfileSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

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
};

import type { Server } from 'socket.io';
import {
  eventsRepository,
  type CreateEventData,
  type Db,
  type EventWithRelations,
  type ListEventsFilters,
  type UpdateEventData,
} from '../repositories/events.repository.js';
import type {
  ClientToServerEvents,
  EventPayload,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';
import { InviteStatus } from '@prisma/client';

export class EventNotFoundError extends Error {
  constructor(id: string) {
    super(`Event ${id} not found`);
    this.name = 'EventNotFoundError';
  }
}

export class EventForbiddenError extends Error {
  constructor(id: string) {
    super(`Caller is not authorised to modify event ${id}`);
    this.name = 'EventForbiddenError';
  }
}

export class EventDateRangeError extends Error {
  constructor() {
    super('Event endsAt must be greater than or equal to startsAt');
    this.name = 'EventDateRangeError';
  }
}

export type CreateEventInput = Omit<CreateEventData, 'creatorId'>;
export type UpdateEventInput = UpdateEventData;

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Convert Prisma Date fields → ISO strings for the EventPayload contract.
 * The REST controllers serialise via Fastify's default JSON encoder which
 * ALSO produces ISO strings, so the wire shape is identical.
 */
function toEventPayload(event: EventWithRelations): EventPayload {
  return {
    id: event.id,
    creatorId: event.creatorId,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    recurrence: event.recurrence,
    recurrenceRuleRaw: event.recurrenceRuleRaw,
    allowSuggestionVoting: event.allowSuggestionVoting,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    deletedAt: event.deletedAt ? event.deletedAt.toISOString() : null,
    creator: event.creator,
    organisers: event.organisers,
    invites: event.invites,
  };
}

/**
 * Compute the audience for an `event:updated` push: every organiser
 * (creator + co-hosts) and every accepted invitee. Returns a deduped
 * list of userIds. Pure derivation off the included relations — no extra
 * query.
 */
function audienceFor(event: EventWithRelations): string[] {
  const ids = new Set<string>();
  for (const o of event.organisers) ids.add(o.user.id);
  for (const inv of event.invites) {
    if (inv.status === InviteStatus.ACCEPTED) ids.add(inv.recipient.id);
  }
  return [...ids];
}

export const eventsService = {
  async getById(db: Db, id: string) {
    const event = await eventsRepository.findById(db, id);
    if (!event) throw new EventNotFoundError(id);
    return event;
  },

  list(db: Db, filters: ListEventsFilters) {
    return eventsRepository.list(db, filters);
  },

  async create(db: Db, userId: string, input: CreateEventInput) {
    if (input.endsAt < input.startsAt) throw new EventDateRangeError();

    return eventsRepository.create(db, {
      ...input,
      creatorId: userId,
    });
  },

  /**
   * Update an event. If `io` is supplied, emits `event:updated` to every
   * organiser and accepted invitee after the transaction commits — see
   * Option A pattern in `src/sockets/SOCKETIO_HANDOFF.md`.
   */
  async update(
    db: Db,
    id: string,
    userId: string,
    input: UpdateEventInput,
    io?: IoServer,
  ) {
    // Verify the event exists, is not soft-deleted, and is visible. RLS
    // already filters by participation, but we want a 404 not a 403 when
    // a non-participant pokes at it.
    const existing = await eventsRepository.findById(db, id);
    if (!existing) throw new EventNotFoundError(id);

    // Organiser gate (creator + co-hosts). RLS event_modify_organiser
    // enforces this at the row level too, but checking here gives us a
    // clean 403 instead of an opaque "row not updated" outcome.
    const organiser = await eventsRepository.findOrganiser(db, id, userId);
    if (!organiser) throw new EventForbiddenError(id);

    // Validate the post-merge date range. Either field may be omitted on
    // PATCH; fall back to the existing value when checking the invariant.
    const startsAt = input.startsAt ?? existing.startsAt;
    const endsAt = input.endsAt ?? existing.endsAt;
    if (endsAt < startsAt) throw new EventDateRangeError();

    const updated = await eventsRepository.update(db, id, input);
    if (!updated) throw new EventNotFoundError(id);

    if (io) {
      const payload = toEventPayload(updated);
      const audience = audienceFor(updated);
      for (const recipientId of audience) {
        io.to(`user:${recipientId}`).emit('event:updated', {
          eventId: updated.id,
          event: payload,
        });
      }
    }

    return updated;
  },

  async softDelete(db: Db, id: string, userId: string) {
    const existing = await eventsRepository.findById(db, id);
    if (!existing) throw new EventNotFoundError(id);

    // Spec: "organisers only" — creator + co-hosts. Note this is more
    // permissive than the RLS event_delete_creator policy (creator only),
    // but soft delete goes through UPDATE, so the relevant RLS policy is
    // event_modify_organiser, which permits both. Service-layer check
    // is the source of truth.
    const organiser = await eventsRepository.findOrganiser(db, id, userId);
    if (!organiser) throw new EventForbiddenError(id);

    await eventsRepository.softDelete(db, id);
  },
};

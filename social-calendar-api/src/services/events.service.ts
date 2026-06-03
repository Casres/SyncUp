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
  InvitePayload,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';
import { InviteStatus, NotifType } from '@prisma/client';
import type { NotifChannel } from '@prisma/client';
import { notificationsService } from './notifications.service.js';

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

export class InviteNotFoundError extends Error {
  constructor(id: string) {
    super(`Invite ${id} not found`);
    this.name = 'InviteNotFoundError';
  }
}

export class InviteForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InviteForbiddenError';
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

  // ─── Invites (incremental endpoints) ───────────────────────────────────

  /**
   * Send invites for an event. Organiser-only (creator + co-hosts).
   * Idempotent: if any of `recipientIds` already has an invite, that
   * row is left untouched and the response still contains it. Pushes
   * an `event:invite:received` socket event AND a notification to each
   * NEW recipient.
   *
   * Spec: see EVENTS_HANDOFF.md "Open items §1" and the matching socket
   * TODO block in src/sockets/events.socket.ts.
   */
  async sendInvites(
    db: Db,
    eventId: string,
    userId: string,
    recipientIds: string[],
    options: {
      friendGroupId?: string | null;
      notifChannel?: NotifChannel | null;
    } = {},
    io?: IoServer,
  ): Promise<InvitePayload[]> {
    // Event must exist + be visible.
    const event = await eventsRepository.findById(db, eventId);
    if (!event) throw new EventNotFoundError(eventId);

    // Organiser gate.
    const organiser = await eventsRepository.findOrganiser(db, eventId, userId);
    if (!organiser) throw new EventForbiddenError(eventId);

    // No-op early-out for empty lists; saves a SELECT.
    if (recipientIds.length === 0) return [];

    // Determine which recipients are NEW so we don't notify on
    // idempotent re-sends.
    const existing = await eventsRepository.findInvitesForRecipients(
      db,
      eventId,
      recipientIds,
    );
    const existingIds = new Set(existing.map((i) => i.recipientId));

    const created = await eventsRepository.createInvitesIncremental(
      db,
      eventId,
      recipientIds,
      options.friendGroupId ?? null,
      options.notifChannel ?? null,
    );

    // Shape to wire form once; we'll need it for both the response and
    // the socket fan-out.
    const wire: InvitePayload[] = created.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      recipientId: row.recipientId,
      status: row.status,
      friendGroupId: row.friendGroupId,
      notifChannel: row.notifChannel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      recipient: row.recipient,
    }));

    if (io) {
      for (const invite of wire) {
        // Only fan out for NEW invites — re-sending the same invite is
        // a no-op for the recipient.
        if (existingIds.has(invite.recipientId)) continue;
        io.to(`user:${invite.recipientId}`).emit('event:invite:received', {
          invite,
        });
      }
    }

    // Snapshot actor profile once for notification fan-out. The actor is
    // always an organiser, so their profile is already loaded via eventInclude.
    const actorOrganiser = event.organisers.find((o) => o.user.id === userId);
    const actorProfile = actorOrganiser?.user;

    // Dispatch a notification for each new recipient. Failures here
    // are non-fatal — the invite has already committed via the
    // transaction context Prisma passed through.
    for (const invite of wire) {
      if (existingIds.has(invite.recipientId)) continue;
      try {
        await notificationsService.dispatch(db, io, {
          userId: invite.recipientId,
          type: NotifType.GROUP_INVITE,
          payload: {
            eventId: invite.eventId,
            eventName: event.title,
            actorId: userId,
            // Denormalize actor profile so the mobile NotifSheet can render
            // the card without a secondary user lookup.
            actorName: actorProfile?.displayName ?? '',
            actorInitial: (actorProfile?.displayName ?? '?').charAt(0).toUpperCase(),
          },
          groupKey: `invite:${invite.eventId}`,
        });
      } catch {
        // Notification fan-out is best-effort.
      }
    }

    return wire;
  },

  /**
   * RSVP — the invite recipient updates their status. Only the
   * recipient is allowed to call this; everyone else gets a 403.
   * Pushes `event:invite:rsvp` to each organiser of the event so
   * their UIs refresh in real time.
   */
  async respondToInvite(
    db: Db,
    eventId: string,
    inviteId: string,
    userId: string,
    status: InviteStatus,
    io?: IoServer,
  ): Promise<InvitePayload> {
    const event = await eventsRepository.findById(db, eventId);
    if (!event) throw new EventNotFoundError(eventId);

    const invite = await eventsRepository.findInvite(db, eventId, inviteId);
    if (!invite) throw new InviteNotFoundError(inviteId);

    if (invite.recipientId !== userId) {
      throw new InviteForbiddenError(
        'Only the invite recipient can change the RSVP',
      );
    }

    const updated = await eventsRepository.updateInviteStatus(
      db,
      eventId,
      inviteId,
      status,
    );
    if (!updated) throw new InviteNotFoundError(inviteId);

    const wire: InvitePayload = {
      id: updated.id,
      eventId: updated.eventId,
      recipientId: updated.recipientId,
      status: updated.status,
      friendGroupId: updated.friendGroupId,
      notifChannel: updated.notifChannel,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      recipient: updated.recipient,
    };

    if (io) {
      for (const o of event.organisers) {
        io.to(`user:${o.user.id}`).emit('event:invite:rsvp', {
          eventId,
          inviteId,
          status,
        });
      }
      // Dispatch an RSVP notification to organisers so they see "Sam
      // said yes to Dinner Friday" on their NotifSheet.
      if (status !== InviteStatus.PENDING) {
        for (const o of event.organisers) {
          if (o.user.id === userId) continue;
          try {
            await notificationsService.dispatch(db, io, {
              userId: o.user.id,
              type: NotifType.RSVP,
              payload: {
                eventId,
                eventName: event.title,
                actorId: userId,
                // Denormalize actor (the RSVP respondent) so the mobile can
                // render RsvpNotif without a secondary user lookup.
                actorName: updated.recipient.displayName,
                actorHandle: updated.recipient.username,
                actorInitial: updated.recipient.displayName.charAt(0).toUpperCase(),
                rsvpStatus: status, // InviteStatus — mobile mapper converts to RSVPStatus
              },
              groupKey: `rsvp:${eventId}`,
            });
          } catch {
            // best-effort
          }
        }
      }
    }

    return wire;
  },

  /**
   * Convenience RSVP — the invite recipient submits a status update
   * without needing to know their inviteId. Resolves the invite by
   * (eventId, recipientId) then delegates to respondToInvite which
   * handles the update, socket fan-out, and organiser notifications.
   */
  async rsvp(
    db: Db,
    eventId: string,
    userId: string,
    status: InviteStatus,
    io?: IoServer,
  ) {
    const invite = await eventsRepository.findInviteForRecipient(
      db,
      eventId,
      userId,
    );
    if (!invite) throw new InviteNotFoundError(userId);
    return this.respondToInvite(db, eventId, invite.id, userId, status, io);
  },

  /**
   * Rescind an invite. Organiser-only. Hard-deletes the invite row.
   */
  async rescindInvite(
    db: Db,
    eventId: string,
    inviteId: string,
    userId: string,
  ): Promise<void> {
    const event = await eventsRepository.findById(db, eventId);
    if (!event) throw new EventNotFoundError(eventId);

    const organiser = await eventsRepository.findOrganiser(db, eventId, userId);
    if (!organiser) throw new EventForbiddenError(eventId);

    const count = await eventsRepository.deleteInvite(db, eventId, inviteId);
    if (count === 0) throw new InviteNotFoundError(inviteId);
  },
};

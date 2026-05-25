import type { FastifyReply, FastifyRequest } from 'fastify';
import { InviteStatus, NotifChannel, Recurrence } from '@prisma/client';
import { z } from 'zod';
import {
  EventDateRangeError,
  EventForbiddenError,
  EventNotFoundError,
  InviteForbiddenError,
  InviteNotFoundError,
  eventsService,
} from '../services/events.service.js';

const createEventBodySchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    location: z.string().max(500).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    recurrence: z.nativeEnum(Recurrence).default(Recurrence.NONE),
    recurrenceRuleRaw: z.string().max(2000).optional(),
    allowSuggestionVoting: z.boolean().default(false),
  })
  .strict();

const updateEventBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    location: z.string().max(500).nullable().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    recurrence: z.nativeEnum(Recurrence).optional(),
    recurrenceRuleRaw: z.string().max(2000).nullable().optional(),
    allowSuggestionVoting: z.boolean().optional(),
  })
  .strict();

const idParamsSchema = z.object({ id: z.string().min(1) });
const inviteParamsSchema = z.object({
  id: z.string().min(1),
  inviteId: z.string().min(1),
});

const sendInvitesBodySchema = z
  .object({
    recipientIds: z.array(z.string().min(1)).min(1).max(500),
    friendGroupId: z.string().min(1).nullable().optional(),
    notifChannel: z.nativeEnum(NotifChannel).nullable().optional(),
  })
  .strict();

const rsvpBodySchema = z
  .object({ status: z.nativeEnum(InviteStatus) })
  .strict();

const listQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
  })
  .strict();

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

export const eventsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error);

    const events = await eventsService.list(request.prismaTransaction, {
      fromDate: parsed.data.from,
      toDate: parsed.data.to,
      limit: parsed.data.limit,
    });
    return reply.send({ events });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      const event = await eventsService.getById(
        request.prismaTransaction,
        params.data.id,
      );
      return reply.send(event);
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return reply.code(404).send({ error: 'Event not found' });
      }
      throw err;
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createEventBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const event = await eventsService.create(
        request.prismaTransaction,
        request.user.id,
        body.data,
      );
      return reply.code(201).send(event);
    } catch (err) {
      if (err instanceof EventDateRangeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = updateEventBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const event = await eventsService.update(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data,
        request.server.io,
      );
      return reply.send(event);
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return reply.code(404).send({ error: 'Event not found' });
      }
      if (err instanceof EventForbiddenError) {
        return reply.code(403).send({ error: 'Not an organiser of this event' });
      }
      if (err instanceof EventDateRangeError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async softDelete(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await eventsService.softDelete(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return reply.code(404).send({ error: 'Event not found' });
      }
      if (err instanceof EventForbiddenError) {
        return reply.code(403).send({ error: 'Not an organiser of this event' });
      }
      throw err;
    }
  },

  // ─── Invites ───────────────────────────────────────────────────────────

  async sendInvites(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = sendInvitesBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const invites = await eventsService.sendInvites(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data.recipientIds,
        {
          friendGroupId: body.data.friendGroupId ?? null,
          notifChannel: body.data.notifChannel ?? null,
        },
        request.server.io,
      );
      return reply.code(201).send({ invites });
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return reply.code(404).send({ error: 'Event not found' });
      }
      if (err instanceof EventForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Not an organiser of this event' });
      }
      throw err;
    }
  },

  async respondToInvite(request: FastifyRequest, reply: FastifyReply) {
    const params = inviteParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = rsvpBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const invite = await eventsService.respondToInvite(
        request.prismaTransaction,
        params.data.id,
        params.data.inviteId,
        request.user.id,
        body.data.status,
        request.server.io,
      );
      return reply.send(invite);
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return reply.code(404).send({ error: 'Event not found' });
      }
      if (err instanceof InviteNotFoundError) {
        return reply.code(404).send({ error: 'Invite not found' });
      }
      if (err instanceof InviteForbiddenError) {
        return reply.code(403).send({ error: err.message });
      }
      throw err;
    }
  },

  async rescindInvite(request: FastifyRequest, reply: FastifyReply) {
    const params = inviteParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await eventsService.rescindInvite(
        request.prismaTransaction,
        params.data.id,
        params.data.inviteId,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        return reply.code(404).send({ error: 'Event not found' });
      }
      if (err instanceof EventForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Not an organiser of this event' });
      }
      if (err instanceof InviteNotFoundError) {
        return reply.code(404).send({ error: 'Invite not found' });
      }
      throw err;
    }
  },
};

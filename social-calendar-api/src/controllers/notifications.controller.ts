import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  NotificationNotFoundError,
  notificationsService,
} from '../services/notifications.service.js';

// ─── Schemas ──────────────────────────────────────────────────────────────

const idParamsSchema = z.object({ id: z.string().min(1) });

const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    read: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) =>
        v === undefined ? undefined : v === 'true' ? true : false,
      ),
    includeDismissed: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => v === 'true'),
  })
  .strict();

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

// ─── Controller ───────────────────────────────────────────────────────────

export const notificationsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error);

    const [notifications, unreadCount] = await Promise.all([
      notificationsService.list(request.prismaTransaction, {
        userId: request.user.id,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        read: parsed.data.read,
        includeDismissed: parsed.data.includeDismissed,
      }),
      notificationsService.unreadCount(
        request.prismaTransaction,
        request.user.id,
      ),
    ]);

    return reply.send({ notifications, unreadCount });
  },

  async markRead(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await notificationsService.markRead(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof NotificationNotFoundError) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      throw err;
    }
  },

  async markAllRead(request: FastifyRequest, reply: FastifyReply) {
    const result = await notificationsService.markAllRead(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send(result);
  },

  async dismiss(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await notificationsService.dismiss(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof NotificationNotFoundError) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      throw err;
    }
  },

  async mute(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await notificationsService.mute(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof NotificationNotFoundError) {
        return reply.code(404).send({ error: 'Notification not found' });
      }
      throw err;
    }
  },
};

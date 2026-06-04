import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  ConversationForbiddenError,
  ConversationNotFoundError,
  DirectMessageForbiddenError,
  conversationsService,
} from '../services/conversations.service.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const idParamsSchema = z.object({ id: z.string().min(1) });
const friendIdParamsSchema = z.object({ friendId: z.string().min(1) });

const threadQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(30),
    // ISO timestamp cursor — fetch messages strictly older than this.
    before: z
      .string()
      .datetime()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
  })
  .strict();

const sendBodySchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

const readBodySchema = z.object({
  messageId: z.string().min(1),
});

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

/** Map conversation domain errors to HTTP. Re-throws anything unexpected. */
function handleDomainError(reply: FastifyReply, err: unknown): FastifyReply {
  if (
    err instanceof ConversationForbiddenError ||
    err instanceof DirectMessageForbiddenError
  ) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
  if (err instanceof ConversationNotFoundError) {
    return reply.code(404).send({ error: 'Conversation not found' });
  }
  throw err;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const conversationsController = {
  /** GET /conversations — the inbox. */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const conversations = await conversationsService.getInbox(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send({ conversations });
  },

  /** GET /conversations/:id/messages — paginated thread + header summary. */
  async thread(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const query = threadQuerySchema.safeParse(request.query);
    if (!query.success) return badRequest(reply, query.error);

    try {
      const result = await conversationsService.getThread(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
        { limit: query.data.limit, before: query.data.before },
      );
      return reply.send(result);
    } catch (err) {
      return handleDomainError(reply, err);
    }
  },

  /** POST /conversations/direct/:friendId — get-or-create a 1:1 (R17-9). */
  async getOrCreateDirect(request: FastifyRequest, reply: FastifyReply) {
    const params = friendIdParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      const conversation = await conversationsService.getOrCreateDirect(
        request.prismaTransaction,
        request.server.io,
        request.user.id,
        params.data.friendId,
      );
      return reply.send({ conversation });
    } catch (err) {
      return handleDomainError(reply, err);
    }
  },

  /** POST /conversations/:id/messages — send. */
  async send(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = sendBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const message = await conversationsService.sendMessage(
        request.prismaTransaction,
        request.server.io,
        request.user.id,
        params.data.id,
        body.data.content,
      );
      return reply.code(201).send({ message });
    } catch (err) {
      return handleDomainError(reply, err);
    }
  },

  /** POST /conversations/:id/read — advance the caller's read cursor (D1). */
  async markRead(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = readBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      await conversationsService.markRead(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
        body.data.messageId,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleDomainError(reply, err);
    }
  },
};

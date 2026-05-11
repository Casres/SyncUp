import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  AvailabilityBlockAlreadyExistsError,
  AvailabilityBlockSelfError,
  FriendshipAlreadyExistsError,
  FriendshipForbiddenError,
  FriendshipInvalidStateError,
  FriendshipNotFoundError,
  FriendshipSelfError,
  friendsService,
} from '../services/friends.service.js';

// ─── Schemas ───────────────────────────────────────────────────────────────

const idParamsSchema = z.object({ id: z.string().min(1) });
const userIdParamsSchema = z.object({ userId: z.string().min(1) });

const listFriendsQuerySchema = z
  .object({
    label: z.string().min(1).max(50).optional(),
  })
  .strict();

const sendRequestBodySchema = z
  .object({
    recipientId: z.string().min(1),
  })
  .strict();

const respondBodySchema = z
  .object({
    action: z.enum(['accept', 'decline']),
  })
  .strict();

const labelBodySchema = z
  .object({
    label: z.string().min(1).max(50),
  })
  .strict();

const createBlockBodySchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

// ─── Controller ────────────────────────────────────────────────────────────

export const friendsController = {
  async listFriends(request: FastifyRequest, reply: FastifyReply) {
    const query = listFriendsQuerySchema.safeParse(request.query);
    if (!query.success) return badRequest(reply, query.error);

    const friends = await friendsService.listAccepted(
      request.prismaTransaction,
      request.user.id,
      { label: query.data.label },
    );
    return reply.send({ friends });
  },

  async listIncomingRequests(request: FastifyRequest, reply: FastifyReply) {
    const requests = await friendsService.listIncomingRequests(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send({ requests });
  },

  async sendRequest(request: FastifyRequest, reply: FastifyReply) {
    const body = sendRequestBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const friendship = await friendsService.sendRequest(
        request.prismaTransaction,
        request.user.id,
        body.data.recipientId,
        request.server.io,
      );
      return reply.code(201).send(friendship);
    } catch (err) {
      if (err instanceof FriendshipSelfError) {
        return reply.code(400).send({ error: err.message });
      }
      if (err instanceof FriendshipAlreadyExistsError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  },

  async respondToRequest(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = respondBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const result = await friendsService.respondToRequest(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
        body.data.action,
        request.server.io,
      );
      // accept → friendship payload, decline → null (soft-deleted)
      if (result === null) {
        return reply.send({ id: params.data.id, status: 'DECLINED' });
      }
      return reply.send(result);
    } catch (err) {
      if (err instanceof FriendshipNotFoundError) {
        return reply.code(404).send({ error: 'Friendship not found' });
      }
      if (err instanceof FriendshipForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Only the receiver can respond to this request' });
      }
      if (err instanceof FriendshipInvalidStateError) {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  },

  async block(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      const friendship = await friendsService.block(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
      );
      return reply.send(friendship);
    } catch (err) {
      if (err instanceof FriendshipNotFoundError) {
        return reply.code(404).send({ error: 'Friendship not found' });
      }
      if (err instanceof FriendshipForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Not a party to this friendship' });
      }
      throw err;
    }
  },

  async unfriend(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await friendsService.unfriend(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof FriendshipNotFoundError) {
        return reply.code(404).send({ error: 'Friendship not found' });
      }
      if (err instanceof FriendshipForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Not a party to this friendship' });
      }
      throw err;
    }
  },

  // ─── Labels ──────────────────────────────────────────────────────────────

  async setLabel(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = labelBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const label = await friendsService.setLabel(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
        body.data.label,
      );
      return reply.send(label);
    } catch (err) {
      if (err instanceof FriendshipNotFoundError) {
        return reply.code(404).send({ error: 'Friendship not found' });
      }
      if (err instanceof FriendshipForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Not a party to this friendship' });
      }
      throw err;
    }
  },

  async removeLabel(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await friendsService.removeLabel(
        request.prismaTransaction,
        request.user.id,
        params.data.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof FriendshipNotFoundError) {
        return reply.code(404).send({ error: 'Friendship not found' });
      }
      if (err instanceof FriendshipForbiddenError) {
        return reply
          .code(403)
          .send({ error: 'Not a party to this friendship' });
      }
      throw err;
    }
  },

  // ─── Availability blocks ────────────────────────────────────────────────

  async listBlocks(request: FastifyRequest, reply: FastifyReply) {
    const blocks = await friendsService.listBlocks(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send({ blocks });
  },

  async createBlock(request: FastifyRequest, reply: FastifyReply) {
    const body = createBlockBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const block = await friendsService.createBlock(
        request.prismaTransaction,
        request.user.id,
        body.data.userId,
      );
      return reply.code(201).send(block);
    } catch (err) {
      if (err instanceof AvailabilityBlockSelfError) {
        return reply.code(400).send({ error: err.message });
      }
      if (err instanceof AvailabilityBlockAlreadyExistsError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  },

  async deleteBlock(request: FastifyRequest, reply: FastifyReply) {
    const params = userIdParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    await friendsService.deleteBlock(
      request.prismaTransaction,
      request.user.id,
      params.data.userId,
    );
    return reply.code(204).send();
  },
};

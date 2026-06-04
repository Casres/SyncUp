import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  FriendGroupForbiddenError,
  FriendGroupMemberAlreadyExistsError,
  FriendGroupNotFoundError,
  friendGroupsService,
} from '../services/friendGroups.service.js';

const idParamsSchema = z.object({ id: z.string().min(1) });
const idAndUserIdParamsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

const createBodySchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .strict();

const renameBodySchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .strict();

const addMemberBodySchema = z
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

function notFound(reply: FastifyReply) {
  return reply.code(404).send({ error: 'FriendGroup not found' });
}

function forbidden(reply: FastifyReply) {
  return reply.code(403).send({ error: 'Not the owner of this FriendGroup' });
}

export const friendGroupsController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const groups = await friendGroupsService.list(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send({ groups });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    const group = await friendGroupsService.create(
      request.prismaTransaction,
      request.user.id,
      body.data.name,
      request.server.io,
    );
    return reply.code(201).send(group);
  },

  async rename(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = renameBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const group = await friendGroupsService.rename(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data.name,
      );
      return reply.send(group);
    } catch (err) {
      if (err instanceof FriendGroupNotFoundError) return notFound(reply);
      if (err instanceof FriendGroupForbiddenError) return forbidden(reply);
      throw err;
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await friendGroupsService.delete(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof FriendGroupNotFoundError) return notFound(reply);
      if (err instanceof FriendGroupForbiddenError) return forbidden(reply);
      throw err;
    }
  },

  async listMembers(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      const members = await friendGroupsService.listMembers(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.send({ members });
    } catch (err) {
      if (err instanceof FriendGroupNotFoundError) return notFound(reply);
      if (err instanceof FriendGroupForbiddenError) return forbidden(reply);
      throw err;
    }
  },

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    const params = idParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const body = addMemberBodySchema.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);

    try {
      const member = await friendGroupsService.addMember(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data.userId,
        request.server.io,
      );
      return reply.code(201).send(member);
    } catch (err) {
      if (err instanceof FriendGroupNotFoundError) return notFound(reply);
      if (err instanceof FriendGroupForbiddenError) return forbidden(reply);
      if (err instanceof FriendGroupMemberAlreadyExistsError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }
  },

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const params = idAndUserIdParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    try {
      await friendGroupsService.removeMember(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        params.data.userId,
      );
      return reply.code(204).send();
    } catch (err) {
      if (err instanceof FriendGroupNotFoundError) return notFound(reply);
      if (err instanceof FriendGroupForbiddenError) return forbidden(reply);
      throw err;
    }
  },
};

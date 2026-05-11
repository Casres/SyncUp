import type { FastifyReply, FastifyRequest } from 'fastify';
import { SocialGroupRole, SuggestionVoteValue } from '@prisma/client';
import { z } from 'zod';
import {
  groupsService,
  PollClosedError,
  PollNotFoundError,
  PollOptionNotFoundError,
  PollVoteAlreadyExistsError,
  SocialGroupForbiddenError,
  SocialGroupLastAdminError,
  SocialGroupMemberAlreadyExistsError,
  SocialGroupNotFoundError,
  SuggestionNotFoundError,
  SuggestionVotingDisabledError,
} from '../services/groups.service.js';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const idParam = z.string().min(1);

const groupIdParams = z.object({ id: idParam });
const groupMemberParams = z.object({ id: idParam, userId: idParam });
const groupPollParams = z.object({ id: idParam, pollId: idParam });
const groupPollOptionParams = z.object({
  id: idParam,
  pollId: idParam,
  optionId: idParam,
});
const groupSuggestionParams = z.object({
  id: idParam,
  suggestionId: idParam,
});

const createGroupBody = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    avatarUrl: z.string().max(2000).optional(),
  })
  .strict();

const updateGroupBody = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    avatarUrl: z.string().max(2000).nullable().optional(),
  })
  .strict();

const addMemberBody = z.object({ userId: idParam }).strict();

const updateMemberRoleBody = z
  .object({ role: z.nativeEnum(SocialGroupRole) })
  .strict();

const listPollsQuery = z
  .object({
    open: z
      .union([z.literal('true'), z.literal('false')])
      .optional(),
  })
  .strict();

const createPollBody = z
  .object({
    question: z.string().min(1).max(500),
    options: z.array(z.string().min(1).max(200)).min(2).max(10),
    eventId: idParam.optional(),
  })
  .strict();

const createSuggestionBody = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    proposedDate: z.coerce.date().optional(),
    eventId: idParam.optional(),
  })
  .strict();

const suggestionVoteBody = z
  .object({ value: z.nativeEnum(SuggestionVoteValue) })
  .strict();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

/**
 * Maps domain errors to HTTP status codes. Anything not recognised
 * re-throws so Fastify's default error handler can surface it (and
 * the auth middleware can still roll the per-request transaction back).
 */
function handleError(reply: FastifyReply, err: unknown) {
  if (err instanceof SocialGroupNotFoundError) {
    return reply.code(404).send({ error: 'Group not found' });
  }
  if (err instanceof SocialGroupForbiddenError) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
  if (err instanceof SocialGroupLastAdminError) {
    return reply.code(400).send({ error: err.message });
  }
  if (err instanceof SocialGroupMemberAlreadyExistsError) {
    return reply.code(409).send({ error: err.message });
  }
  if (err instanceof PollNotFoundError) {
    return reply.code(404).send({ error: 'Poll not found' });
  }
  if (err instanceof PollOptionNotFoundError) {
    return reply.code(404).send({ error: 'Poll option not found' });
  }
  if (err instanceof PollClosedError) {
    return reply.code(400).send({ error: err.message });
  }
  if (err instanceof PollVoteAlreadyExistsError) {
    return reply.code(409).send({ error: err.message });
  }
  if (err instanceof SuggestionNotFoundError) {
    return reply.code(404).send({ error: 'Suggestion not found' });
  }
  if (err instanceof SuggestionVotingDisabledError) {
    return reply.code(403).send({ error: err.message });
  }
  throw err;
}

// ─── Controller ──────────────────────────────────────────────────────────────

export const groupsController = {
  // ── Groups ────────────────────────────────────────────────────────────────

  async list(request: FastifyRequest, reply: FastifyReply) {
    const groups = await groupsService.list(
      request.prismaTransaction,
      request.user.id,
    );
    return reply.send({ groups });
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      const group = await groupsService.getById(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.send(group);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const body = createGroupBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      const group = await groupsService.create(
        request.prismaTransaction,
        request.user.id,
        body.data,
      );
      return reply.code(201).send(group);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = updateGroupBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      const group = await groupsService.update(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data,
      );
      return reply.send(group);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async softDelete(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.softDelete(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  // ── Members ───────────────────────────────────────────────────────────────

  async listMembers(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      const members = await groupsService.listMembers(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.send({ members });
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = addMemberBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      const member = await groupsService.addMember(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data.userId,
        request.server.io,
      );
      return reply.code(201).send(member);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const params = groupMemberParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.removeMember(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        params.data.userId,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async updateMemberRole(request: FastifyRequest, reply: FastifyReply) {
    const params = groupMemberParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = updateMemberRoleBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      const member = await groupsService.updateMemberRole(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        params.data.userId,
        body.data.role,
      );
      return reply.send(member);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  // ── Polls ─────────────────────────────────────────────────────────────────

  async listPolls(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const query = listPollsQuery.safeParse(request.query);
    if (!query.success) return badRequest(reply, query.error);
    try {
      const polls = await groupsService.listPolls(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        query.data.open === 'true',
      );
      return reply.send({ polls });
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async createPoll(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = createPollBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      const poll = await groupsService.createPoll(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data,
        request.server.io,
      );
      return reply.code(201).send(poll);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async closePoll(request: FastifyRequest, reply: FastifyReply) {
    const params = groupPollParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      const poll = await groupsService.closePoll(
        request.prismaTransaction,
        params.data.id,
        params.data.pollId,
        request.user.id,
        request.server.io,
      );
      return reply.send(poll);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async deletePoll(request: FastifyRequest, reply: FastifyReply) {
    const params = groupPollParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.deletePoll(
        request.prismaTransaction,
        params.data.id,
        params.data.pollId,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  // ── Poll votes ────────────────────────────────────────────────────────────

  async votePollOption(request: FastifyRequest, reply: FastifyReply) {
    const params = groupPollOptionParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.voteOnPollOption(
        request.prismaTransaction,
        params.data.id,
        params.data.pollId,
        params.data.optionId,
        request.user.id,
        request.server.io,
      );
      return reply.code(201).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async removePollVote(request: FastifyRequest, reply: FastifyReply) {
    const params = groupPollOptionParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.removePollVote(
        request.prismaTransaction,
        params.data.id,
        params.data.pollId,
        params.data.optionId,
        request.user.id,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  // ── Suggestions ───────────────────────────────────────────────────────────

  async listSuggestions(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      const suggestions = await groupsService.listSuggestions(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
      );
      return reply.send({ suggestions });
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async createSuggestion(request: FastifyRequest, reply: FastifyReply) {
    const params = groupIdParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = createSuggestionBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      const suggestion = await groupsService.createSuggestion(
        request.prismaTransaction,
        params.data.id,
        request.user.id,
        body.data,
        request.server.io,
      );
      return reply.code(201).send(suggestion);
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async deleteSuggestion(request: FastifyRequest, reply: FastifyReply) {
    const params = groupSuggestionParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.deleteSuggestion(
        request.prismaTransaction,
        params.data.id,
        params.data.suggestionId,
        request.user.id,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  // ── Suggestion votes ──────────────────────────────────────────────────────

  async voteSuggestion(request: FastifyRequest, reply: FastifyReply) {
    const params = groupSuggestionParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    const body = suggestionVoteBody.safeParse(request.body);
    if (!body.success) return badRequest(reply, body.error);
    try {
      await groupsService.voteOnSuggestion(
        request.prismaTransaction,
        params.data.id,
        params.data.suggestionId,
        request.user.id,
        body.data.value,
        request.server.io,
      );
      return reply.code(201).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },

  async removeSuggestionVote(request: FastifyRequest, reply: FastifyReply) {
    const params = groupSuggestionParams.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);
    try {
      await groupsService.removeSuggestionVote(
        request.prismaTransaction,
        params.data.id,
        params.data.suggestionId,
        request.user.id,
        request.server.io,
      );
      return reply.code(204).send();
    } catch (err) {
      return handleError(reply, err);
    }
  },
};

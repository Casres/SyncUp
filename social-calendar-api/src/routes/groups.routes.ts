import type { FastifyPluginAsync } from 'fastify';
import { groupsController } from '../controllers/groups.controller.js';

export const groupsRoutes: FastifyPluginAsync = async (fastify) => {
  // ── Social Group CRUD ──────────────────────────────────────────────────────
  fastify.get('/', groupsController.list);
  fastify.get('/:id', groupsController.getById);
  fastify.post('/', groupsController.create);
  fastify.patch('/:id', groupsController.update);
  fastify.delete('/:id', groupsController.softDelete);

  // ── Members ───────────────────────────────────────────────────────────────
  fastify.get('/:id/members', groupsController.listMembers);
  fastify.post('/:id/members', groupsController.addMember);
  fastify.delete('/:id/members/:userId', groupsController.removeMember);
  fastify.patch('/:id/members/:userId', groupsController.updateMemberRole);

  // ── Polls ─────────────────────────────────────────────────────────────────
  fastify.get('/:id/polls', groupsController.listPolls);
  fastify.post('/:id/polls', groupsController.createPoll);
  fastify.patch('/:id/polls/:pollId', groupsController.closePoll);
  fastify.delete('/:id/polls/:pollId', groupsController.deletePoll);

  // ── Poll votes ────────────────────────────────────────────────────────────
  fastify.post(
    '/:id/polls/:pollId/options/:optionId/vote',
    groupsController.votePollOption,
  );
  fastify.delete(
    '/:id/polls/:pollId/options/:optionId/vote',
    groupsController.removePollVote,
  );

  // ── Suggestions ───────────────────────────────────────────────────────────
  fastify.get('/:id/suggestions', groupsController.listSuggestions);
  fastify.post('/:id/suggestions', groupsController.createSuggestion);
  fastify.delete(
    '/:id/suggestions/:suggestionId',
    groupsController.deleteSuggestion,
  );

  // ── Suggestion votes ──────────────────────────────────────────────────────
  fastify.post(
    '/:id/suggestions/:suggestionId/vote',
    groupsController.voteSuggestion,
  );
  fastify.delete(
    '/:id/suggestions/:suggestionId/vote',
    groupsController.removeSuggestionVote,
  );
};

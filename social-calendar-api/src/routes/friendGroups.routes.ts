import type { FastifyPluginAsync } from 'fastify';
import { friendGroupsController } from '../controllers/friendGroups.controller.js';

/**
 * Mounted at the `/friend-groups` prefix in `src/app.ts`.
 */
export const friendGroupsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', friendGroupsController.list);
  fastify.post('/', friendGroupsController.create);
  fastify.patch('/:id', friendGroupsController.rename);
  fastify.delete('/:id', friendGroupsController.delete);

  fastify.get('/:id/members', friendGroupsController.listMembers);
  fastify.post('/:id/members', friendGroupsController.addMember);
  fastify.delete('/:id/members/:userId', friendGroupsController.removeMember);
};

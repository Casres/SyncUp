import type { FastifyPluginAsync } from 'fastify';
import { friendsController } from '../controllers/friends.controller.js';

/**
 * Mounted at the `/friends` prefix in `src/app.ts`.
 *
 * Route order matters because Fastify's router prefers more-specific
 * paths, but to be safe the static segments (`/requests`, `/blocks`) are
 * registered before the `/:id` parameter routes.
 */
export const friendsRoutes: FastifyPluginAsync = async (fastify) => {
  // Friend requests
  fastify.get('/requests', friendsController.listIncomingRequests);
  fastify.post('/requests', friendsController.sendRequest);
  fastify.patch('/requests/:id', friendsController.respondToRequest);

  // Availability blocks (scoped to the friends domain — see
  // FRIENDS_HANDOFF.md)
  fastify.get('/blocks', friendsController.listBlocks);
  fastify.post('/blocks', friendsController.createBlock);
  fastify.delete('/blocks/:userId', friendsController.deleteBlock);

  // Friendship lifecycle
  fastify.get('/', friendsController.listFriends);
  fastify.patch('/:id/block', friendsController.block);
  fastify.delete('/:id', friendsController.unfriend);

  // Friendship labels
  fastify.put('/:id/label', friendsController.setLabel);
  fastify.delete('/:id/label', friendsController.removeLabel);
};

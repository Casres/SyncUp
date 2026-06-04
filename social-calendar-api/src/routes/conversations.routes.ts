import type { FastifyPluginAsync } from 'fastify';
import { conversationsController } from '../controllers/conversations.controller.js';

/**
 * Mounted at the `/conversations` prefix in `src/app.ts` (R18 messaging).
 *
 * Route order: the static `/direct/:friendId` create path is declared before
 * the `/:id/...` parameter routes so Fastify's router resolves the more
 * specific path first (mirrors the `/read-all` ordering in
 * notifications.routes.ts).
 *
 * Group-chat creation has NO route here — it is an internal side effect of
 * FriendGroup creation (R18 D4). Event-chat enable lives under `/events/:id/chat`
 * (events.routes.ts) because it is a deliberate host action on the event.
 */
export const conversationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Inbox.
  fastify.get('/', conversationsController.list);

  // Get-or-create a 1:1 (static segment before the param routes).
  fastify.post('/direct/:friendId', conversationsController.getOrCreateDirect);

  // Thread + per-conversation actions.
  fastify.get('/:id/messages', conversationsController.thread);
  fastify.post('/:id/messages', conversationsController.send);
  fastify.post('/:id/read', conversationsController.markRead);
};

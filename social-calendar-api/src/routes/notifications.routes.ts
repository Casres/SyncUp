import type { FastifyPluginAsync } from 'fastify';
import { notificationsController } from '../controllers/notifications.controller.js';

/**
 * Mounted at the `/notifications` prefix in `src/app.ts`.
 *
 * The mobile NotifSheet is the primary consumer — see
 * `social-calendar-mobile/src/api/notifications.ts` for the React Query
 * hook that calls these endpoints.
 *
 * Route order: the bulk action `/read-all` is declared BEFORE the
 * `/:id/...` parameter routes so Fastify's router picks the more
 * specific static path. The id-scoped sub-paths (`/:id/read`, `/:id/mute`,
 * `/:id`) come last.
 */
export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  // List + counts
  fastify.get('/', notificationsController.list);

  // Bulk: mark every unread → read.
  fastify.post('/read-all', notificationsController.markAllRead);

  // Per-row actions
  fastify.post('/:id/read', notificationsController.markRead);
  fastify.post('/:id/mute', notificationsController.mute);
  fastify.delete('/:id', notificationsController.dismiss);
};

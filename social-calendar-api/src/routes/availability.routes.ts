import type { FastifyPluginAsync } from 'fastify';
import { availabilityController } from '../controllers/availability.controller.js';

/**
 * Mounted at the `/availability` prefix in `src/app.ts`.
 *
 * Path mapping vs the mobile contract in
 * `social-calendar-mobile/src/api/availability.ts`:
 *
 *   Mobile call                          → Server route
 *   GET   /me/availability               → GET   /availability/me
 *   PUT   /me/availability                → PUT   /availability/me
 *   GET   /users/:id/availability         → GET   /availability/:userId
 *   GET   /me/broadcasts                  → GET   /availability/broadcasts
 *   PUT   /me/broadcasts                  → PUT   /availability/broadcasts
 *
 * The mobile-side `authedFetch('/me/availability')` calls need to be
 * updated to the new paths in the mobile agent's next pass. This is
 * documented in the commit body of the Availability domain commit.
 *
 * Two extra endpoints not in the original mobile contract (added per
 * the task description's parent spec):
 *   PUT   /availability/me/:date         → set a single day's state
 *   PATCH /availability/me               → bulk patch / multi-day brush
 *
 * Route order: static `me`, `broadcasts` segments are registered
 * before the `/:userId` parameter route. This matters because
 * Fastify's router otherwise treats `me` as a userId.
 */
export const availabilityRoutes: FastifyPluginAsync = async (fastify) => {
  // Current user's availability map
  fastify.get('/me', availabilityController.getMine);
  fastify.put('/me', availabilityController.replaceMine);
  fastify.patch('/me', availabilityController.patchMine);
  fastify.put('/me/:date', availabilityController.setDay);

  // Broadcast settings (per-state availability auto-broadcast rules)
  fastify.get('/broadcasts', availabilityController.getBroadcasts);
  fastify.put('/broadcasts', availabilityController.updateBroadcasts);

  // Friend's availability (gated by AvailabilityBlock → 403)
  fastify.get('/:userId', availabilityController.getFriend);
};

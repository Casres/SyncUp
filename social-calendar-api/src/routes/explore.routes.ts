import type { FastifyPluginAsync } from 'fastify';
import { exploreController } from '../controllers/explore.controller.js';
import { exploreRateLimit } from '../middleware/exploreRateLimit.js';

/**
 * Explore routes.
 *
 * Registered under /explore in app.ts (after the auth plugin), so every
 * handler receives request.user + request.prismaTransaction.
 *
 * Rate limiting:
 *   The feed endpoint gets the exploreRateLimit preHandler (sliding-window
 *   Redis counter, default 30 req/hr per user).  The detail endpoint is
 *   intentionally exempt — it's a cache hit ≥ 95% of the time and is only
 *   called after the user taps a card, so volume is much lower.
 */
export const exploreRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /explore/feed?lat=&lng=&category=&cursor=
  fastify.get(
    '/feed',
    { preHandler: [exploreRateLimit] },
    exploreController.getFeed,
  );

  // GET /explore/:id?lat=&lng=
  fastify.get('/:id', exploreController.getDetail);
};

/**
 * Explore controller.
 *
 * Routes:
 *   GET /explore/feed    — paginated venue feed for a given location + category
 *   GET /explore/:id     — venue detail by id (hint lat/lng for cache path)
 *
 * Query params are validated with Zod; invalid requests get a 400 with a
 * structured error object that matches the events controller convention.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { exploreService } from '../services/explore.service.js';
import type { ExploreCategory } from '../types/explore.types.js';

// ── Schemas ───────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'all', 'bar', 'club', 'restaurant', 'food-truck',
  'popup', 'cafe', 'live-music', 'outdoor',
] as const;

const feedQuerySchema = z
  .object({
    lat:      z.coerce.number().min(-90).max(90),
    lng:      z.coerce.number().min(-180).max(180),
    category: z.enum(VALID_CATEGORIES).default('all'),
    cursor:   z.coerce.number().int().min(0).default(0),
  })
  .strict();

const detailQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  })
  .strict();

const detailParamsSchema = z.object({ id: z.string().min(1) });

// ── Helper ────────────────────────────────────────────────────────────────────

function badRequest(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    error: 'Invalid request',
    details: error.flatten().fieldErrors,
  });
}

// ── Controller ────────────────────────────────────────────────────────────────

export const exploreController = {
  /**
   * GET /explore/feed?lat=&lng=&category=&cursor=
   *
   * Returns a page of ExploreVenue objects + a nextCursor for pagination.
   * The rate limiter (exploreRateLimit) is registered as a preHandler on
   * this route in explore.routes.ts.
   */
  async getFeed(request: FastifyRequest, reply: FastifyReply) {
    const parsed = feedQuerySchema.safeParse(request.query);
    if (!parsed.success) return badRequest(reply, parsed.error);

    const { lat, lng, category, cursor } = parsed.data;

    const page = await exploreService.getFeed(
      lat,
      lng,
      category as ExploreCategory,
      cursor,
    );

    return reply.send(page);
  },

  /**
   * GET /explore/:id?lat=&lng=
   *
   * The lat/lng hint is required so the service can check or build the feed
   * cache on a detail miss without making a separate geo-lookup API call.
   */
  async getDetail(request: FastifyRequest, reply: FastifyReply) {
    const params = detailParamsSchema.safeParse(request.params);
    if (!params.success) return badRequest(reply, params.error);

    const query = detailQuerySchema.safeParse(request.query);
    if (!query.success) return badRequest(reply, query.error);

    const venue = await exploreService.getDetail(
      params.data.id,
      query.data.lat,
      query.data.lng,
    );

    if (!venue) {
      return reply.code(404).send({ error: 'Venue not found' });
    }

    return reply.send(venue);
  },
};

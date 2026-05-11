/**
 * Per-user rate limiter for the Explore feed endpoint.
 *
 * Algorithm: fixed-window counter using Redis INCR + EXPIRE.
 *   Key:    explore:rate:{userId}
 *   Window: 3 600 s (1 hour), reset on first request in each window.
 *   Limit:  env.EXPLORE_RATE_LIMIT (default 30 req / hr).
 *
 * On limit exceeded → 429 with Retry-After header set to the remaining
 * seconds in the current window.
 *
 * Redis failures are non-fatal: if the INCR call throws the middleware
 * logs and passes through, preferring availability over enforcement.
 *
 * Usage: register this as a preHandler on the explore feed route only,
 * not on the detail route (detail is cache-heavy and user-triggered).
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const WINDOW_SECONDS = 3_600; // 1 hour

function rateLimitKey(userId: string): string {
  return `explore:rate:${userId}`;
}

export async function exploreRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.user.id;
  const key = rateLimitKey(userId);
  const limit = env.EXPLORE_RATE_LIMIT;

  let count: number;
  try {
    // INCR returns the value after the increment.
    count = await redis.incr(key);

    if (count === 1) {
      // First request in this window — set the expiry.
      // If this call fails the key has no TTL; it will accumulate until
      // eviction, which is a mild over-counting issue, not a security risk.
      await redis.expire(key, WINDOW_SECONDS);
    }
  } catch (err) {
    request.log.warn({ err }, 'exploreRateLimit: Redis error — passing through');
    return; // Fail open
  }

  if (count > limit) {
    // Calculate remaining TTL for the Retry-After header.
    let ttl = WINDOW_SECONDS;
    try {
      const remaining = await redis.ttl(key);
      if (remaining > 0) ttl = remaining;
    } catch {
      // Best-effort; fall back to the full window duration.
    }

    return reply
      .code(429)
      .header('Retry-After', String(ttl))
      .send({
        error: 'Explore rate limit exceeded',
        retryAfterSeconds: ttl,
        limit,
      });
  }
}

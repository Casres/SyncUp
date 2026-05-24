/**
 * Per-user rate limiter for the Explore feed endpoint.
 *
 * Two overlapping counters:
 *   Hour bucket:  explore:rate:{userId}:hour   — limit env.EXPLORE_RATE_LIMIT (default 20 req/hr)
 *   Burst bucket: explore:rate:{userId}:burst  — limit env.EXPLORE_RATE_LIMIT_BURST (default 5 req/60s)
 *
 * Both counters use Redis INCR + conditional EXPIRE (fixed-window).
 * On limit exceeded → 429 with Retry-After + X-RateLimit-* headers.
 * Every allowed response also carries X-RateLimit-* headers so clients can
 * self-throttle before hitting the limit.
 *
 * Redis failures are non-fatal: the middleware logs and passes through,
 * preferring availability over rate-limit enforcement.
 *
 * Usage: registered as a preHandler on GET /explore/feed only.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

const HOUR_WINDOW_SECONDS = 3_600;
const BURST_WINDOW_SECONDS = 60;

const hourKey  = (uid: string) => `explore:rate:${uid}:hour`;
const burstKey = (uid: string) => `explore:rate:${uid}:burst`;

async function incrWithTtl(key: string, ttl: number): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, ttl);
  return count;
}

export async function exploreRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.user.id;
  const limit  = env.EXPLORE_RATE_LIMIT;       // default 20 req/hr
  const burst  = env.EXPLORE_RATE_LIMIT_BURST; // default 5 req/60s

  let hourCount: number;
  let burstCount: number;
  try {
    [hourCount, burstCount] = await Promise.all([
      incrWithTtl(hourKey(userId),  HOUR_WINDOW_SECONDS),
      incrWithTtl(burstKey(userId), BURST_WINDOW_SECONDS),
    ]);
  } catch (err) {
    request.log.warn({ err }, 'exploreRateLimit: Redis error — passing through');
    return; // fail-open
  }

  // Derive the hour bucket TTL for X-RateLimit-Reset and Retry-After.
  let hourTtl = HOUR_WINDOW_SECONDS;
  try {
    const r = await redis.ttl(hourKey(userId));
    if (r > 0) hourTtl = r;
  } catch { /* best-effort */ }

  const resetsAt = Math.floor(Date.now() / 1000) + hourTtl;

  // Always emit headers (even on denied responses) so clients can self-throttle.
  reply.header('X-RateLimit-Limit', String(limit));
  reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - hourCount)));
  reply.header('X-RateLimit-Reset', String(resetsAt));

  // Burst quota deny — short Retry-After (≤60s).
  // Check burst before hour so the client gets the shorter Retry-After first.
  if (burstCount > burst) {
    return reply
      .code(429)
      .header('Retry-After', String(BURST_WINDOW_SECONDS))
      .send({
        error: 'Explore burst limit exceeded',
        reason: 'burst_quota',
        retryAfterSeconds: BURST_WINDOW_SECONDS,
        limit: burst,
      });
  }

  // Hour quota deny — long Retry-After (= remaining TTL in current window).
  if (hourCount > limit) {
    return reply
      .code(429)
      .header('Retry-After', String(hourTtl))
      .send({
        error: 'Explore rate limit exceeded',
        reason: 'hour_quota',
        retryAfterSeconds: hourTtl,
        limit,
      });
  }
}

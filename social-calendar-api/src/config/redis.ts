import { Redis } from 'ioredis';
import { env } from './env.js';

/**
 * ioredis singleton.
 *
 * Used for:
 *   1. Presence tracking — `presence:{userId}` JSON `{ socketId, connectedAt }` with TTL 60s.
 *   2. Future use: caching, sessions, etc.
 *
 * `lazyConnect: true` lets us create the client without immediately
 * connecting — the connection opens on first command. Avoids a hard
 * dependency on Redis being up at import time during local boot.
 *
 * `maxRetriesPerRequest: 3` keeps a flaky network from indefinitely
 * stalling presence writes; if Redis is down for longer the socket
 * handler logs and continues — presence is best-effort.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

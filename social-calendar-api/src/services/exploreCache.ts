/**
 * Typed Redis cache module for the Explore service.
 *
 * Discriminated key union keeps callsites strict; this module owns all
 * serialization rules. The serialized keys are identical to the inline
 * helpers previously in explore.service.ts so an in-place refactor does
 * not cold-start the cache.
 *
 *   explore:feed:{lat2}:{lng2}:{category}   TTL env.EXPLORE_CACHE_TTL_SECONDS (default 600 s)
 *   explore:detail:{id}                      TTL 1800 s (hardcoded — long-tail lookups)
 *
 * Redis failures are non-fatal: every helper swallows errors and returns
 * null / no-op, preserving the fail-open behaviour of the original service.
 */

import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import type { ExploreCategory, ExploreVenue } from '../types/explore.types.js';

export const EXPLORE_FEED_TTL = 600;    // seconds — fallback when env var absent
export const EXPLORE_DETAIL_TTL = 1800; // seconds — hardcoded, not env-controlled

/** Round to 2 dp — ~1.1 km bucketing. Matches mobile-side bucketing. */
function bucket(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Cache key discriminated union ──────────────────────────────────────────────

export type ExploreCacheKey =
  | { kind: 'feed'; lat: number; lng: number; category: ExploreCategory }
  | { kind: 'detail'; id: string };

/**
 * Serialize a cache key to the Redis string used by this service.
 * Byte-for-byte identical to the old feedKey/detailKey helpers.
 */
export function cacheKeyToString(key: ExploreCacheKey): string {
  switch (key.kind) {
    case 'feed':
      return `explore:feed:${bucket(key.lat)}:${bucket(key.lng)}:${key.category}`;
    case 'detail':
      return `explore:detail:${key.id}`;
  }
}

// ── Fail-open Redis helpers ────────────────────────────────────────────────────

async function safeGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: string, ttl: number): Promise<void> {
  try {
    await redis.set(key, value, 'EX', ttl);
  } catch {
    // Non-fatal — live fetch is the fallback
  }
}

// ── Public cache surface ───────────────────────────────────────────────────────

export const exploreCache = {
  async getFeed(lat: number, lng: number, category: ExploreCategory): Promise<ExploreVenue[] | null> {
    const raw = await safeGet(cacheKeyToString({ kind: 'feed', lat, lng, category }));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ExploreVenue[];
    } catch {
      return null;
    }
  },

  async setFeed(lat: number, lng: number, category: ExploreCategory, venues: ExploreVenue[]): Promise<void> {
    const ttl = env.EXPLORE_CACHE_TTL_SECONDS ?? EXPLORE_FEED_TTL;
    await safeSet(
      cacheKeyToString({ kind: 'feed', lat, lng, category }),
      JSON.stringify(venues),
      ttl,
    );
  },

  async getDetail(id: string): Promise<ExploreVenue | null> {
    const raw = await safeGet(cacheKeyToString({ kind: 'detail', id }));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ExploreVenue;
    } catch {
      return null;
    }
  },

  async setDetail(id: string, venue: ExploreVenue): Promise<void> {
    await safeSet(
      cacheKeyToString({ kind: 'detail', id }),
      JSON.stringify(venue),
      EXPLORE_DETAIL_TTL,
    );
  },
};

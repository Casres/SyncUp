/**
 * Explore service — Redis cache-aside layer over Eventbrite + Google Places.
 *
 * Cache keys
 *   explore:feed:{bucketedLat}:{bucketedLng}:{category}   TTL 600s  (10 min)
 *   explore:detail:{id}                                    TTL 1800s (30 min)
 *
 * GPS bucketing: lat/lng rounded to 2 decimal places (~1.1 km precision).
 * This matches the mobile client's own bucketing (src/api/explore.ts) so
 * client staleTime and server cache TTL are aligned.
 *
 * Feed merge order: featured (future DB query) → Eventbrite → Google Places.
 * Within each tier results are sorted by distance (nearest first).
 *
 * Redis failures are non-fatal — the service logs and falls back to a
 * live fetch on every request. This keeps the Explore tab working even
 * when Redis is temporarily unavailable.
 */

import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { fetchEventbriteVenues } from './eventbrite.client.js';
import { fetchGooglePlacesVenues } from './googlePlaces.client.js';
import type { ExploreCategory, ExploreVenue } from '../types/explore.types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const FEED_TTL = 600;    // seconds — matches client staleTime of 10 min
const DETAIL_TTL = 1800; // seconds — matches client staleTime of 30 min
const PAGE_SIZE = 20;

// ── Cache key helpers ─────────────────────────────────────────────────────────

/** Round to 2 dp — ~1.1 km precision, reduces cache key cardinality. */
function bucket(v: number): number {
  return Math.round(v * 100) / 100;
}

function feedKey(lat: number, lng: number, category: ExploreCategory): string {
  return `explore:feed:${bucket(lat)}:${bucket(lng)}:${category}`;
}

function detailKey(id: string): string {
  return `explore:detail:${id}`;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface ExploreFeedPage {
  venues: ExploreVenue[];
  /** Cursor to pass back as `cursor` on the next request; null = last page. */
  nextCursor: number | null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function byDistance(a: ExploreVenue, b: ExploreVenue): number {
  return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0);
}

function dedup(venues: ExploreVenue[]): ExploreVenue[] {
  const seen = new Set<string>();
  return venues.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

function paginate(all: ExploreVenue[], cursor: number): ExploreFeedPage {
  const slice = all.slice(cursor, cursor + PAGE_SIZE);
  const consumed = cursor + slice.length;
  return {
    venues: slice,
    nextCursor: consumed < all.length ? consumed : null,
  };
}

async function safeRedisGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function safeRedisSet(key: string, value: string, ttl: number): Promise<void> {
  try {
    await redis.set(key, value, 'EX', ttl);
  } catch {
    // Non-fatal — live fetch is the fallback
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const exploreService = {
  /**
   * Return a paginated page of venues for the given location and category.
   *
   * The full result set for this (bucketedLat, bucketedLng, category) tuple
   * is cached as a JSON array in Redis. Pagination is applied in-memory from
   * the cached array so downstream API calls happen at most once per TTL
   * window per unique bucket+category pair.
   */
  async getFeed(
    lat: number,
    lng: number,
    category: ExploreCategory,
    cursor: number,
  ): Promise<ExploreFeedPage> {
    const cacheKey = feedKey(lat, lng, category);

    // ── Cache read ─────────────────────────────────────────────────────────
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      const all = JSON.parse(cached) as ExploreVenue[];
      return paginate(all, cursor);
    }

    // ── Cache miss — fetch both APIs in parallel ────────────────────────────
    const [ebVenues, gpVenues] = await Promise.all([
      fetchEventbriteVenues(lat, lng, env.EXPLORE_RADIUS_METRES, category),
      fetchGooglePlacesVenues(lat, lng, env.EXPLORE_RADIUS_METRES, category),
    ]);

    // Featured venues will be loaded from the database in a future iteration.
    // The slot is intentionally left open here; the merge order is preserved.
    const featuredVenues: ExploreVenue[] = [];

    // Merge: featured → Eventbrite → Google, nearest-first within each tier.
    const merged = dedup([
      ...featuredVenues.sort(byDistance),
      ...ebVenues.sort(byDistance),
      ...gpVenues.sort(byDistance),
    ]);

    // ── Cache write ────────────────────────────────────────────────────────
    await safeRedisSet(cacheKey, JSON.stringify(merged), FEED_TTL);

    return paginate(merged, cursor);
  },

  /**
   * Return a single venue by ID.
   *
   * Strategy:
   *   1. Check the detail cache.
   *   2. Check the 'all' feed cache for this location (likely already warm).
   *   3. Fall back to a fresh full-API fetch and cache the result.
   *
   * The lat/lng hint is needed for steps 2–3 because neither API has a
   * free single-item lookup — we must always go through a geo-radius search.
   */
  async getDetail(
    id: string,
    lat: number,
    lng: number,
  ): Promise<ExploreVenue | null> {
    // Step 1: detail cache
    const detCacheKey = detailKey(id);
    const detCached = await safeRedisGet(detCacheKey);
    if (detCached) {
      return JSON.parse(detCached) as ExploreVenue;
    }

    // Step 2: try to find the venue in the warm 'all' feed cache
    const feedCacheKey = feedKey(lat, lng, 'all');
    const feedCached = await safeRedisGet(feedCacheKey);
    if (feedCached) {
      const feed = JSON.parse(feedCached) as ExploreVenue[];
      const found = feed.find((v) => v.id === id);
      if (found) {
        await safeRedisSet(detCacheKey, JSON.stringify(found), DETAIL_TTL);
        return found;
      }
    }

    // Step 3: cold path — fetch both APIs and search for the id
    const [ebVenues, gpVenues] = await Promise.all([
      fetchEventbriteVenues(lat, lng, env.EXPLORE_RADIUS_METRES, 'all'),
      fetchGooglePlacesVenues(lat, lng, env.EXPLORE_RADIUS_METRES, 'all'),
    ]);
    const venue = [...ebVenues, ...gpVenues].find((v) => v.id === id) ?? null;

    if (venue) {
      await safeRedisSet(detCacheKey, JSON.stringify(venue), DETAIL_TTL);
    }

    return venue;
  },
};

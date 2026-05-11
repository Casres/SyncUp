/**
 * Explore API — React Query hooks.
 *
 * DATA FLOW
 *   When EXPO_PUBLIC_API_URL (or EXPO_PUBLIC_DEV_TOKEN) is set the hooks call
 *   the real SyncUp backend.  Otherwise they fall back to MOCK_EXPLORE_VENUES
 *   so the Explore UI is exercisable without a running server or a Clerk token.
 *
 * REAL BACKEND ENDPOINTS
 *   GET /explore/feed?lat=&lng=&category=&cursor=
 *     → { venues: ExploreVenue[], nextCursor: number | null }
 *   GET /explore/:id?lat=&lng=
 *     → ExploreVenue
 *
 * CLERK INTEGRATION
 *   The hook calls `useApiFetch()` from `_client.ts` to obtain an
 *   already-authorized fetch, then hands it down to the fetch functions.
 *   Clerk is intentionally not imported in this file — all `useAuth()`
 *   plumbing lives in `_client.ts`.
 *
 *   The token is intentionally NOT part of the query key — changing the
 *   token (logout → login) triggers a full cache invalidation from the
 *   auth layer, not from these hooks. Embedding the token here would
 *   double-cache every request and leak Clerk session ids into devtools.
 *
 * COST CONTROLS — five layers:
 *   1. GPS BUCKETING (bucketLocation) — 2 dp, ~1.1 km precision
 *   2. staleTime 10 min (feed) / 30 min (detail) — max one network call per window
 *   3. gcTime 1 hr — cached data survives navigation and back
 *   4. refetchOnWindowFocus / refetchOnMount: false — foreground/remount never refetches fresh data
 *   5. Cursor-based pagination (PAGE_SIZE 20) — only loads what the user scrolls to
 *
 * The backend adds a sixth layer: Redis cache (feed TTL 600s, detail TTL 1800s)
 * + per-user rate limiting (default 30 feed loads/hr) on top of the above.
 */

import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { ExploreCategory, ExploreVenue } from '../../../TYPES';
import { MOCK_EXPLORE_VENUES } from '../mocks';
import { simulateLatency } from './_utils';
import { isApiConfigured, useApiFetch, type AuthedFetch } from './_client';
import { queryKeys } from './queryKeys';

// ─── Cost control constants ─────────────────────────────────────────────────

const PAGE_SIZE = 20;
const FEED_STALE_MS  = 10 * 60 * 1000; // 10 min
const DETAIL_STALE_MS = 30 * 60 * 1000; // 30 min
const GC_TIME_MS = 60 * 60 * 1000;      // 1 hr

// ─── GPS bucketing ──────────────────────────────────────────────────────────

/**
 * Round GPS coordinates to 2 decimal places (~1.1 km precision).
 * Two users within ~1 km, or a user who walked a block, share the same cache slot.
 */
export function bucketLocation(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

// ─── Response types ─────────────────────────────────────────────────────────

export interface ExploreFeedPage {
  venues: ExploreVenue[];
  /** null when no more pages remain. */
  nextCursor: number | null;
}

// ─── Fetch functions ─────────────────────────────────────────────────────────

/**
 * Real API fetch for the paginated feed.
 * Falls back to mock data when the API is not configured.
 */
async function fetchExploreFeed(
  authedFetch: AuthedFetch,
  lat: number,
  lng: number,
  category: ExploreCategory,
  cursor: number,
): Promise<ExploreFeedPage> {
  if (!isApiConfigured()) {
    // ── Mock path ──
    await simulateLatency();
    const filtered =
      category === 'all'
        ? MOCK_EXPLORE_VENUES
        : MOCK_EXPLORE_VENUES.filter((v) => v.category === category);
    const sorted = [
      ...filtered.filter((v) => v.isFeatured),
      ...filtered.filter((v) => !v.isFeatured),
    ];
    const slice = sorted.slice(cursor, cursor + PAGE_SIZE);
    return {
      venues: slice,
      nextCursor: cursor + slice.length < sorted.length ? cursor + slice.length : null,
    };
  }

  // ── Real API path ──
  const params = new URLSearchParams({
    lat:      String(lat),
    lng:      String(lng),
    category,
    cursor:   String(cursor),
  });
  return authedFetch<ExploreFeedPage>(`/explore/feed?${params.toString()}`);
}

/**
 * Real API fetch for a single venue detail.
 * Falls back to mock data when the API is not configured.
 */
async function fetchExploreVenueDetail(
  authedFetch: AuthedFetch,
  id: string,
  lat: number,
  lng: number,
): Promise<ExploreVenue> {
  if (!isApiConfigured()) {
    // ── Mock path ──
    await simulateLatency();
    const venue = MOCK_EXPLORE_VENUES.find((v) => v.id === id);
    if (!venue) throw new Error(`ExploreVenue not found: ${id}`);
    return venue;
  }

  // ── Real API path ──
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return authedFetch<ExploreVenue>(`/explore/${encodeURIComponent(id)}?${params.toString()}`);
}

// ─── React Query hooks ───────────────────────────────────────────────────────

/**
 * Paginated explore feed hook.
 *
 * Pass the user's actual GPS coordinates — bucketing is applied internally
 * so the query key is stable across small movements.
 */
export function useExploreVenues(
  category: ExploreCategory,
  userLat: number,
  userLng: number,
): UseInfiniteQueryResult<InfiniteData<ExploreFeedPage>, Error> {
  const { lat, lng } = bucketLocation(userLat, userLng);
  const authedFetch = useApiFetch();

  return useInfiniteQuery<ExploreFeedPage, Error>({
    queryKey: queryKeys.explore.feed(lat, lng, category),
    queryFn: ({ pageParam }) =>
      fetchExploreFeed(authedFetch, lat, lng, category, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: FEED_STALE_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Single venue detail hook.
 *
 * `userLat` / `userLng` are the same coordinates used to load the feed —
 * the backend needs them to locate the venue in its cache on a detail miss.
 */
export function useExploreVenueDetail(
  id: string,
  userLat?: number,
  userLng?: number,
): UseQueryResult<ExploreVenue, Error> {
  // Default to 0,0 when no location is provided (mock path ignores them).
  const { lat, lng } = bucketLocation(userLat ?? 0, userLng ?? 0);
  const authedFetch = useApiFetch();

  return useQuery<ExploreVenue, Error>({
    queryKey: queryKeys.explore.detail(id),
    queryFn: () => fetchExploreVenueDetail(authedFetch, id, lat, lng),
    staleTime: DETAIL_STALE_MS,
    gcTime: GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

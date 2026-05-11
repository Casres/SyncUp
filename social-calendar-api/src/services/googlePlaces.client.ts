/**
 * Google Places Nearby Search client.
 *
 * Thin typed wrapper around the Places API (legacy) Nearby Search endpoint.
 * Maps raw Place objects to ExploreVenue so the rest of the stack never sees
 * Google shapes.
 *
 * Returns an empty array when:
 *   - GOOGLE_PLACES_API_KEY is unset (dev / keys not configured yet)
 *   - The upstream API returns a non-OK status
 *   - A network error is thrown (graceful degradation)
 *
 * Cost: ~$0.032 per request (Nearby Search).
 * The Redis cache layer keeps actual API calls to one per bucketed grid cell
 * per 10 minutes — see explore.service.ts.
 */

import { env } from '../config/env.js';
import type { ExploreCategory, ExploreVenue } from '../types/explore.types.js';

// ── Category mappings ─────────────────────────────────────────────────────────

/** Google Places `types` entry → ExploreCategory */
const GP_TYPE_MAP: Record<string, ExploreCategory> = {
  bar:                'bar',
  night_club:         'club',
  restaurant:         'restaurant',
  cafe:               'cafe',
  bakery:             'cafe',
  food:               'restaurant',
  meal_takeaway:      'restaurant',
  meal_delivery:      'restaurant',
  amusement_park:     'outdoor',
  park:               'outdoor',
  stadium:            'outdoor',
  campground:         'outdoor',
};

/** ExploreCategory → Google Places `type` query param (best single match) */
const CATEGORY_TO_GP_TYPE: Partial<Record<ExploreCategory, string>> = {
  bar:        'bar',
  club:       'night_club',
  restaurant: 'restaurant',
  cafe:       'cafe',
  outdoor:    'park',
};

// ── Raw Google Places response shapes ─────────────────────────────────────────

interface GPhoto {
  photo_reference: string;
}

interface GOpeningHours {
  weekday_text: string[];
}

interface GPlace {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
  photos?: GPhoto[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: GOpeningHours;
}

interface GResponse {
  results: GPlace[];
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Haversine great-circle distance in miles. */
function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Build a Places Photo URL from a photo_reference. */
function photoUrl(ref: string): string {
  return (
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=800&photo_reference=${encodeURIComponent(ref)}` +
    `&key=${env.GOOGLE_PLACES_API_KEY ?? ''}`
  );
}

/** Pick the first recognisable type from a Place's types array. */
function mapType(types: string[]): ExploreCategory {
  for (const t of types) {
    const mapped = GP_TYPE_MAP[t];
    if (mapped) return mapped;
  }
  return 'popup';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch venues near the given location from Google Places Nearby Search.
 *
 * @param lat           Bucketed latitude (2 decimal places).
 * @param lng           Bucketed longitude (2 decimal places).
 * @param radiusMetres  Search radius, metres (from env.EXPLORE_RADIUS_METRES).
 * @param category      Optional category filter; 'all' means no filter.
 */
export async function fetchGooglePlacesVenues(
  lat: number,
  lng: number,
  radiusMetres: number,
  category: ExploreCategory,
): Promise<ExploreVenue[]> {
  if (!env.GOOGLE_PLACES_API_KEY) return [];

  const gpType =
    category !== 'all' ? (CATEGORY_TO_GP_TYPE[category] ?? undefined) : undefined;

  const params = new URLSearchParams({
    key: env.GOOGLE_PLACES_API_KEY,
    location: `${lat},${lng}`,
    radius: String(radiusMetres),
  });
  if (gpType) params.set('type', gpType);

  let data: GResponse;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return [];
    data = (await res.json()) as GResponse;
  } catch {
    return [];
  }

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];

  return data.results.map((p) => {
    const pLat = p.geometry.location.lat;
    const pLng = p.geometry.location.lng;

    // Build a readable hours string from the array Google returns.
    // Example entry: "Monday: 4:00 PM – 2:00 AM"
    const hours =
      p.opening_hours?.weekday_text && p.opening_hours.weekday_text.length > 0
        ? p.opening_hours.weekday_text.join('; ')
        : undefined;

    const firstPhoto = p.photos?.[0];
    const imageUrl = firstPhoto ? photoUrl(firstPhoto.photo_reference) : undefined;

    const venue: ExploreVenue = {
      id: `gp_${p.place_id}`,
      name: p.name,
      category: mapType(p.types),
      // Google Places Nearby Search doesn't return editorial descriptions.
      // The venue name is the best single-line summary we have; detail
      // fetches via Place Details (a separate API call) are deferred until
      // the product warrants the extra cost.
      description: p.name,
      address: p.vicinity,
      geo: { lat: pLat, lng: pLng },
      imageUrl,
      distanceMiles: haversineMiles(lat, lng, pLat, pLng),
      source: 'google',
      isFeatured: false,
      hours,
      rating: p.rating,
      ratingCount: p.user_ratings_total,
      externalUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    };
    return venue;
  });
}

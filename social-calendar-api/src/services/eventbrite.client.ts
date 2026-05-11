/**
 * Eventbrite Events API client.
 *
 * Thin typed wrapper around the Eventbrite v3 REST API.  Maps raw event
 * objects to ExploreVenue so the rest of the stack never sees Eventbrite
 * shapes.
 *
 * Returns an empty array when:
 *   - EVENTBRITE_API_KEY is unset (dev / keys not configured yet)
 *   - The upstream API returns a non-2xx response
 *   - A network error is thrown (graceful degradation)
 *
 * Rate limits (free tier): 1 000 req / hr, 2 req / s burst.
 * The Redis cache layer (explore.service.ts) keeps actual API calls
 * to a minimum — one per bucketed grid cell per 10 minutes.
 */

import { env } from '../config/env.js';
import type { ExploreCategory, ExploreVenue } from '../types/explore.types.js';

// ── Category mapping ──────────────────────────────────────────────────────────

/** Eventbrite category_id → ExploreCategory */
const EB_CATEGORY_MAP: Record<string, ExploreCategory> = {
  '110': 'restaurant',  // Food & Drink
  '109': 'live-music',  // Music
  '105': 'live-music',  // Performing Arts & Film
  '108': 'outdoor',     // Sports & Fitness
  '113': 'popup',       // Community & Culture
  '116': 'popup',       // Fashion & Beauty
  '103': 'popup',       // Business & Professional
};

// ── Raw Eventbrite response shapes ───────────────────────────────────────────

interface EbVenue {
  latitude: string;
  longitude: string;
  address: {
    localized_address_display: string;
  };
}

interface EbEvent {
  id: string;
  name: { text: string };
  description: { text: string | null };
  start: { utc: string };
  category_id: string | null;
  logo: { url: string } | null;
  venue: EbVenue | null;
  url: string;
}

interface EbResponse {
  events?: EbEvent[];
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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch upcoming events near the given location from Eventbrite.
 *
 * @param lat         Bucketed latitude (2 decimal places).
 * @param lng         Bucketed longitude (2 decimal places).
 * @param radiusMetres Search radius, metres (from env.EXPLORE_RADIUS_METRES).
 * @param category    Optional category filter; 'all' means no filter.
 */
export async function fetchEventbriteVenues(
  lat: number,
  lng: number,
  radiusMetres: number,
  category: ExploreCategory,
): Promise<ExploreVenue[]> {
  if (!env.EVENTBRITE_API_KEY) return [];

  const radiusKm = Math.max(1, Math.round(radiusMetres / 1000));

  const params = new URLSearchParams({
    token: env.EVENTBRITE_API_KEY,
    'location.latitude': String(lat),
    'location.longitude': String(lng),
    'location.within': `${radiusKm}km`,
    expand: 'venue,logo,category',
    // Only future events
    'start_date.range_start': new Date().toISOString().slice(0, 19) + 'Z',
    page_size: '30',
  });

  let data: EbResponse;
  try {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return [];
    data = (await res.json()) as EbResponse;
  } catch {
    return [];
  }

  const events = data.events ?? [];

  return events
    .filter((e): e is EbEvent & { venue: EbVenue } => e.venue !== null)
    .map((e) => {
      const vLat = parseFloat(e.venue.latitude);
      const vLng = parseFloat(e.venue.longitude);
      const mappedCategory: ExploreCategory = e.category_id
        ? (EB_CATEGORY_MAP[e.category_id] ?? 'popup')
        : 'popup';

      const venue: ExploreVenue = {
        id: `eb_${e.id}`,
        name: e.name.text,
        category: mappedCategory,
        description: e.description?.text?.slice(0, 500) ?? e.name.text,
        address: e.venue.address.localized_address_display,
        geo: { lat: vLat, lng: vLng },
        imageUrl: e.logo?.url ?? undefined,
        distanceMiles: haversineMiles(lat, lng, vLat, vLng),
        source: 'eventbrite',
        isFeatured: false,
        eventDate: e.start.utc,
        externalUrl: e.url,
      };
      return venue;
    })
    .filter((v) => category === 'all' || v.category === category);
}

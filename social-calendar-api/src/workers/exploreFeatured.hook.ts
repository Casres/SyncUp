import type { ExploreVenue } from '../types/explore.types.js';

/**
 * Featured-listings hook.
 *
 * Stub for the future B2B revenue layer:
 *   Featured listings are paid placements that surface at the top of the
 *   Explore feed for a location. Tracked in a Featured table created by a
 *   separate agent.
 *
 * Today: identity. Returns the venue list unchanged.
 *
 * When the Featured agent ships, this hook will:
 *   1. Query the `Featured` table for the lat/lng bucket + current time window.
 *   2. Mark matching ExploreVenue items with `isFeatured: true`.
 *   3. Reorder so featured items appear first (preserving relative order
 *      within the featured / non-featured sub-lists).
 *   4. Log an impression event per featured item shown.
 *
 * Do NOT extend this stub. The Featured agent owns the full implementation.
 */
export async function exploreFeaturedHook(venues: ExploreVenue[]): Promise<ExploreVenue[]> {
  return venues;
}

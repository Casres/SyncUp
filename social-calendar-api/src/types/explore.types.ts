/**
 * Explore feature types — API-side mirror of the shared TYPES.ts contract.
 *
 * These deliberately duplicate the ExploreCategory / ExploreSource /
 * ExploreVenue definitions from the root TYPES.ts because the API's tsconfig
 * constrains rootDir to ./src, making cross-package imports impossible.
 *
 * If the project migrates to a proper monorepo workspace the shared package
 * should replace both copies.
 */

export type ExploreCategory =
  | 'all'
  | 'bar'
  | 'club'
  | 'restaurant'
  | 'food-truck'
  | 'popup'
  | 'cafe'
  | 'live-music'
  | 'outdoor';

export type ExploreSource = 'eventbrite' | 'google' | 'featured';

export interface ExploreVenue {
  id: string;
  name: string;
  category: ExploreCategory;
  /** One-paragraph description pre-filled into the event draft. */
  description: string;
  /** Human-readable address. Maps to Draft.location. */
  address: string;
  /** Lat/lng pair. Maps to Draft.geo. */
  geo: { lat: number; lng: number };
  /** Cover photo URL. */
  imageUrl?: string;
  /** Straight-line distance from the user's bucketed location, in miles. */
  distanceMiles?: number;
  source: ExploreSource;
  /** Paid listing — shows "Featured" badge and sorts to top of feed. */
  isFeatured: boolean;
  /** Human-readable hours string, e.g. "Mon–Fri 4pm–2am". */
  hours?: string;
  /** Google Places rating 1–5. */
  rating?: number;
  /** Number of Google ratings. */
  ratingCount?: number;
  /**
   * ISO datetime for time-specific events (Eventbrite).
   * Absent for evergreen venue entries (Google Places).
   */
  eventDate?: string;
  /** Deep-link to Eventbrite listing or Google Maps. */
  externalUrl?: string;
}

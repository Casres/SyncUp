/**
 * Explore mock data — venues + events for dev/test.
 *
 * Covers all ExploreCategory values with a realistic mix of:
 *   - Google Places (evergreen venue listings, have rating/ratingCount)
 *   - Eventbrite (time-specific events, have eventDate)
 *   - Featured (paid listings, isFeatured = true, sort to top)
 *
 * ⚠️ DELETE before production. See MOCKS_HANDOFF.md.
 */
import type { ExploreVenue } from '../../../TYPES';

export const MOCK_EXPLORE_VENUES: ExploreVenue[] = [
  // ── FEATURED (paid listings — always sort first) ────────────────────────
  {
    id: 'ev-featured-1',
    name: 'The Rooftop at 5th',
    category: 'bar',
    description:
      'An elevated bar experience with panoramic city views, craft cocktails, and a curated small-plates menu. Perfect for a casual happy hour or a full night out with friends.',
    address: '500 5th Ave, Downtown',
    geo: { lat: 32.716, lng: -117.162 },
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    distanceMiles: 0.4,
    source: 'featured',
    isFeatured: true,
    hours: 'Mon–Sun 4pm–2am',
    rating: 4.7,
    ratingCount: 312,
  },
  {
    id: 'ev-featured-2',
    name: 'Umami Nights',
    category: 'restaurant',
    description:
      'Modern Japanese-Korean fusion with an omakase bar and a rotating seasonal menu. The private dining room seats up to 20 — ideal for group dinners and birthday celebrations.',
    address: '142 Market St, Gaslamp',
    geo: { lat: 32.713, lng: -117.159 },
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    distanceMiles: 0.7,
    source: 'featured',
    isFeatured: true,
    hours: 'Tue–Sun 5pm–11pm',
    rating: 4.9,
    ratingCount: 487,
  },

  // ── EVENTBRITE (time-specific events) ───────────────────────────────────
  {
    id: 'ev-eb-1',
    name: 'Warehouse Rave: Neon Circuit',
    category: 'club',
    description:
      'An all-night techno and house music event at a converted downtown warehouse. Featuring three rooms, resident DJs, and a full light installation by local artist Lena Solís.',
    address: '2200 Industrial Blvd',
    geo: { lat: 32.708, lng: -117.171 },
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    distanceMiles: 1.2,
    source: 'eventbrite',
    isFeatured: false,
    eventDate: '2026-05-17T21:00:00',
    hours: 'Sat May 17 · 9pm–4am',
    externalUrl: 'https://eventbrite.com',
  },
  {
    id: 'ev-eb-2',
    name: 'Sunday Farmer\'s Market Pop-Up',
    category: 'popup',
    description:
      'Weekly open-air market featuring 40+ local vendors — fresh produce, artisan goods, street food, and live acoustic performances. Free entry, dogs welcome.',
    address: 'Balboa Park East Lot',
    geo: { lat: 32.731, lng: -117.148 },
    imageUrl: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80',
    distanceMiles: 2.1,
    source: 'eventbrite',
    isFeatured: false,
    eventDate: '2026-05-11T09:00:00',
    hours: 'Sun May 11 · 9am–2pm',
    externalUrl: 'https://eventbrite.com',
  },
  {
    id: 'ev-eb-3',
    name: 'Jazz Under the Stars',
    category: 'live-music',
    description:
      'An outdoor jazz night in the park with three rotating acts, food trucks on site, and blanket seating. Bring your crew — no tickets required, first come first served.',
    address: 'Embarcadero Marina Park South',
    geo: { lat: 32.708, lng: -117.152 },
    imageUrl: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&q=80',
    distanceMiles: 1.8,
    source: 'eventbrite',
    isFeatured: false,
    eventDate: '2026-05-16T19:00:00',
    hours: 'Fri May 16 · 7pm–11pm',
    externalUrl: 'https://eventbrite.com',
  },
  {
    id: 'ev-eb-4',
    name: 'Taco Crawl — Old Town Edition',
    category: 'food-truck',
    description:
      'Hit 8 legendary taco spots in Old Town in one evening. Wristband gives you 1 taco + a drink sample at each stop. Ends with a group photo and a raffle.',
    address: 'Old Town San Diego State Historic Park',
    geo: { lat: 32.754, lng: -117.196 },
    imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80',
    distanceMiles: 3.4,
    source: 'eventbrite',
    isFeatured: false,
    eventDate: '2026-05-24T17:00:00',
    hours: 'Sat May 24 · 5pm–9pm',
    externalUrl: 'https://eventbrite.com',
  },
  {
    id: 'ev-eb-5',
    name: 'Sunrise Yoga in the Park',
    category: 'outdoor',
    description:
      'A free community yoga session for all skill levels on the grass at Pantoja Park. Mats not provided — bring your own or borrow one from the instructor.',
    address: 'Pantoja Park, W Date St',
    geo: { lat: 32.718, lng: -117.168 },
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    distanceMiles: 0.6,
    source: 'eventbrite',
    isFeatured: false,
    eventDate: '2026-05-10T06:30:00',
    hours: 'Sat May 10 · 6:30am–8am',
    externalUrl: 'https://eventbrite.com',
  },

  // ── GOOGLE PLACES (evergreen venue listings) ─────────────────────────────
  {
    id: 'ev-gp-1',
    name: 'Café Miel',
    category: 'cafe',
    description:
      'A sunlit neighborhood café known for its single-origin pour-overs, house-made pastries, and a back patio perfect for slow mornings or a quick catch-up with a friend.',
    address: '841 W Fir St, Middletown',
    geo: { lat: 32.735, lng: -117.170 },
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    distanceMiles: 1.5,
    source: 'google',
    isFeatured: false,
    hours: 'Mon–Fri 7am–5pm · Sat–Sun 8am–4pm',
    rating: 4.6,
    ratingCount: 228,
  },
  {
    id: 'ev-gp-2',
    name: 'Neon Palms',
    category: 'bar',
    description:
      'A tropical-themed dive bar with strong well drinks, a jukebox stacked with 90s R&B, and a photo booth that never misses. Cash only on weekends.',
    address: '3312 University Ave, North Park',
    geo: { lat: 32.749, lng: -117.134 },
    imageUrl: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800&q=80',
    distanceMiles: 2.8,
    source: 'google',
    isFeatured: false,
    hours: 'Daily 4pm–2am',
    rating: 4.3,
    ratingCount: 159,
  },
  {
    id: 'ev-gp-3',
    name: 'The Handle',
    category: 'club',
    description:
      'Downtown\'s most consistent late-night spot — three floors, a rooftop bar, and bookings that skew local talent. No dress code, but security is strict on capacity.',
    address: '770 6th Ave, Downtown',
    geo: { lat: 32.714, lng: -117.160 },
    imageUrl: 'https://images.unsplash.com/photo-1571266752236-d42f8c22a60f?w=800&q=80',
    distanceMiles: 0.5,
    source: 'google',
    isFeatured: false,
    hours: 'Thu–Sat 10pm–4am',
    rating: 4.1,
    ratingCount: 402,
  },
  {
    id: 'ev-gp-4',
    name: 'Smoke & Ember BBQ',
    category: 'restaurant',
    description:
      'Low-and-slow Texas-style BBQ with a covered patio that fits 80. Great for big groups — call ahead to reserve the picnic table section and skip the line.',
    address: '2280 Kettner Blvd, Little Italy',
    geo: { lat: 32.723, lng: -117.173 },
    imageUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80',
    distanceMiles: 1.1,
    source: 'google',
    isFeatured: false,
    hours: 'Tue–Sun 11am–10pm',
    rating: 4.8,
    ratingCount: 611,
  },
  {
    id: 'ev-gp-5',
    name: 'Curbside Collective',
    category: 'food-truck',
    description:
      'A rotating fleet of the city\'s best food trucks parked at the same lot every Thursday–Sunday. Usually 6–10 trucks at a time — tacos, ramen, smash burgers, dessert.',
    address: '1600 Pacific Hwy, Waterfront',
    geo: { lat: 32.718, lng: -117.175 },
    imageUrl: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800&q=80',
    distanceMiles: 0.9,
    source: 'google',
    isFeatured: false,
    hours: 'Thu–Sun 11am–9pm',
    rating: 4.5,
    ratingCount: 187,
  },
  {
    id: 'ev-gp-6',
    name: 'Balboa Trails',
    category: 'outdoor',
    description:
      'Six miles of paved and unpaved trails weaving through the park\'s canyons and gardens. Popular with joggers and cyclists — best entered from the 6th Ave parking lot.',
    address: 'Balboa Park, 6th Ave entrance',
    geo: { lat: 32.735, lng: -117.147 },
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    distanceMiles: 2.3,
    source: 'google',
    isFeatured: false,
    hours: 'Open daily · Sunrise to sunset',
    rating: 4.7,
    ratingCount: 890,
  },
  {
    id: 'ev-gp-7',
    name: 'Vinyl & Velvet Lounge',
    category: 'live-music',
    description:
      'An intimate listening lounge with no-talking sections during sets, a rotating DJ residency, and an expertly curated cocktail menu. Capacity 120 — arrive early on weekends.',
    address: '400 B St, Downtown',
    geo: { lat: 32.715, lng: -117.163 },
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    distanceMiles: 0.3,
    source: 'google',
    isFeatured: false,
    hours: 'Wed–Sun 7pm–2am',
    rating: 4.6,
    ratingCount: 274,
  },
];

/** Featured venues always sort to the top of the feed. */
export const MOCK_EXPLORE_FEATURED = MOCK_EXPLORE_VENUES.filter((v) => v.isFeatured);

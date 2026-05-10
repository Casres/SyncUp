/**
 * React Query key factories.
 *
 * Iron rule: screens NEVER write key strings inline. Always go through
 * `queryKeys.<resource>.<key>(...)`. This guarantees that invalidations,
 * prefetches, and optimistic updates from anywhere in the app target the
 * same cache slot.
 *
 * Each leaf returns `... as const` so TypeScript infers a literal tuple
 * type — necessary for React Query's key inference and for `setQueryData`
 * type-safety.
 */

export const queryKeys = {
  events: {
    all: () => ['events'] as const,
    detail: (id: string) => ['events', id] as const,
    rsvps: (id: string) => ['events', id, 'rsvps'] as const,
  },
  friends: {
    all: () => ['friends'] as const,
    list: (label?: string) =>
      (label ? (['friends', 'list', label] as const) : (['friends', 'list'] as const)),
    requests: () => ['friends', 'requests'] as const,
    profile: (id: string) => ['friends', id] as const,
    blocks: () => ['friends', 'blocks'] as const,
  },
  groups: {
    all: () => ['groups'] as const,
    detail: (id: string) => ['groups', id] as const,
    polls: (id: string) => ['groups', id, 'polls'] as const,
    suggestions: (id: string) => ['groups', id, 'suggestions'] as const,
  },
  availability: {
    mine: () => ['availability', 'me'] as const,
    friend: (id: string) => ['availability', id] as const,
    broadcasts: () => ['availability', 'broadcasts'] as const,
  },
  profile: {
    me: () => ['profile'] as const,
    notifications: () => ['profile', 'notifications'] as const,
    privacy: () => ['profile', 'privacy'] as const,
  },
  notifications: {
    /** Activity feed (NotifSheet items). Distinct from profile.notifications which holds SETTINGS. */
    all: () => ['notifications'] as const,
  },
  explore: {
    /**
     * Feed key includes bucketed location + active category filter so each
     * unique viewport gets its own cache slot without thrashing on every
     * GPS wiggle. Bucketed to ~1 km precision (2 decimal places).
     */
    feed: (bucketedLat: number, bucketedLng: number, category: string) =>
      ['explore', 'feed', bucketedLat, bucketedLng, category] as const,
    detail: (id: string) => ['explore', 'detail', id] as const,
  },
} as const;

/**
 * MOCK FRIENDSHIPS
 *
 * Friend records authored from 'me's perspective.
 *
 * The TYPES.ts `Friend` shape carries the friend's own profile fields
 * (id, name, letter, handle), a `category` (label) string id, lifecycle
 * `status`, and the FriendType ids the friend belongs to.
 *
 * The "label" categories (friend / coworker / family / BFF) are tracked
 * as the `Friend.category` field. The catalog of available labels is
 * exported as MOCK_FRIEND_LABELS so screens can render filter chips,
 * category badges, etc.
 *
 * Inferred shape (NOT in TYPES.ts):
 *   AvailabilityBlock = { blockerId: string; blockedId: string }
 *   — surfaces the "user X has blocked their availability from user Y"
 *     state required by Decision #4. The API Stub Layer should treat the
 *     presence of a row as authority and return 403 / empty for blocked
 *     availability lookups.
 */

import type { Friend } from '../../../TYPES';

/**
 * Catalog of friend-label categories. The `id` is what `Friend.category`
 * stores; the `label` is the user-facing string. Mirrors the four labels
 * required by the seed spec.
 */
export const MOCK_FRIEND_LABELS = [
  { id: 'bff', label: 'BFF' },
  { id: 'friend', label: 'Friend' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'family', label: 'Family' },
] as const;

/**
 * Accepted friendships from 'me's perspective. Each entry is the OTHER
 * party (not 'me'). All four label categories covered.
 */
export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'user-2',
    name: 'Sasha Kim',
    letter: 'S',
    handle: '@sasha',
    category: 'bff',
    status: 'accepted',
    friendTypes: ['ft-1'],
  },
  {
    id: 'user-3',
    name: 'Marcus Chen',
    letter: 'M',
    handle: '@marcus',
    category: 'coworker',
    status: 'accepted',
    friendTypes: ['ft-2'],
  },
  {
    id: 'user-4',
    name: 'Priya Osei',
    letter: 'P',
    handle: '@priya',
    category: 'family',
    status: 'accepted',
    friendTypes: ['ft-3'],
  },
  {
    id: 'user-6',
    name: 'Tomás Reyes',
    letter: 'T',
    handle: '@tomas',
    category: 'friend',
    status: 'accepted',
    friendTypes: ['ft-1'],
  },
];

/**
 * Incoming PENDING friend requests addressed to 'me'.
 * Render in the Friends screen "requests" zone.
 */
export const MOCK_PENDING_REQUESTS: Friend[] = [
  {
    id: 'user-5',
    name: 'Jordan Lake',
    letter: 'J',
    handle: '@jordan',
    category: 'friend',
    status: 'pending',
    friendTypes: [],
  },
];

/**
 * Availability blocks. Marcus (user-3) has blocked their availability
 * from 'me' — tests blocking. Inferred shape — see file header.
 */
export const MOCK_AVAILABILITY_BLOCKS = [
  { blockerId: 'user-3', blockedId: 'me' },
] as const;

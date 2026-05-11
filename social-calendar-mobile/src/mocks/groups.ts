/**
 * MOCK SOCIAL GROUPS
 *
 * Two groups required by the seed spec:
 *   group-1 "Weekend Crew" — 'me' is admin (AdminBar visible)
 *   group-2 "Book Club"    — 'me' is regular member (admin controls hidden)
 *
 * Polls (group-1):
 *   poll-1 — CLOSED with results in (closesAt is in the past)
 *   poll-2 — ACTIVE (closesAt is in the future, or omitted)
 *
 * Suggestion (group-1):
 *   sug-1 — single idea row authored by Sasha
 *
 * Inferred shape (NOT in TYPES.ts):
 *   - `Poll` has no explicit `closed` flag — we encode "closed" via
 *     `closesAt` being in the past. The API Stub Layer should derive
 *     closed-ness from `closesAt < now`. `MOCK_POLL_CLOSED` carries an
 *     ISO `closesAt` of today−2.
 *
 *   - The `MOCK_GROUP_MEMBERS` map is exposed as a flat array keyed by
 *     group id for stub convenience; the same data also lives inside
 *     `SocialGroup.members` per TYPES.ts.
 */

import type {
  Cover,
  GroupMember,
  Poll,
  SocialGroup,
  Suggestion,
} from '../../../TYPES';
import { isoOffset } from './availability';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoDateTime(offsetDays: number, hh: number, mm: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Covers
// ---------------------------------------------------------------------------

const COVER_WEEKEND: Cover = {
  id: 'cover-weekend',
  label: 'Sunset stripes',
  art: 'covers/weekend-sunset.svg',
};

const COVER_BOOK: Cover = {
  id: 'cover-book',
  label: 'Library spine',
  art: 'covers/book-spine.svg',
};

// ---------------------------------------------------------------------------
// Members per group
// ---------------------------------------------------------------------------

const WEEKEND_MEMBERS: GroupMember[] = [
  { id: 'me', name: 'Ben Rivera', letter: 'B', handle: '@ben', role: 'admin' },
  {
    id: 'user-2',
    name: 'Sasha Kim',
    letter: 'S',
    handle: '@sasha',
    role: 'member',
  },
  {
    id: 'user-4',
    name: 'Priya Osei',
    letter: 'P',
    handle: '@priya',
    role: 'member',
  },
  {
    id: 'user-6',
    name: 'Tomás Reyes',
    letter: 'T',
    handle: '@tomas',
    role: 'member',
  },
];

const BOOK_MEMBERS: GroupMember[] = [
  {
    id: 'user-4',
    name: 'Priya Osei',
    letter: 'P',
    handle: '@priya',
    role: 'admin',
  },
  { id: 'me', name: 'Ben Rivera', letter: 'B', handle: '@ben', role: 'member' },
  {
    id: 'user-3',
    name: 'Marcus Chen',
    letter: 'M',
    handle: '@marcus',
    role: 'member',
  },
];

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/** Group where 'me' is admin — AdminBar must render. */
export const MOCK_GROUP_ADMIN: SocialGroup = {
  id: 'group-1',
  name: 'Weekend Crew',
  cover: COVER_WEEKEND,
  isPrivate: false,
  members: WEEKEND_MEMBERS,
  userRole: 'admin',
};

/** Group where 'me' is a regular member — admin controls hidden. */
export const MOCK_GROUP_MEMBER: SocialGroup = {
  id: 'group-2',
  name: 'Book Club',
  cover: COVER_BOOK,
  isPrivate: true,
  members: BOOK_MEMBERS,
  userRole: 'member',
};

export const MOCK_SOCIAL_GROUPS: SocialGroup[] = [
  MOCK_GROUP_ADMIN,
  MOCK_GROUP_MEMBER,
];

/** Flat lookup of members per group id — convenience for the API stub. */
export const MOCK_GROUP_MEMBERS: Record<string, GroupMember[]> = {
  'group-1': WEEKEND_MEMBERS,
  'group-2': BOOK_MEMBERS,
};

// ---------------------------------------------------------------------------
// Polls — one closed (with results), one active
// ---------------------------------------------------------------------------

/**
 * CLOSED poll — `closesAt` is today−2, options carry final vote counts,
 * voters list is full. Per inferred-shape note above, "closed" is derived
 * from `closesAt < now`.
 */
export const MOCK_POLL_CLOSED: Poll = {
  id: 'poll-1',
  question: 'Where should we meet next weekend?',
  options: [
    { id: 'opt-1a', label: 'Rooftop bar on 5th', votes: 3 },
    { id: 'opt-1b', label: 'New ramen spot', votes: 1 },
    { id: 'opt-1c', label: 'Park picnic', votes: 0 },
  ],
  voters: ['me', 'user-2', 'user-4', 'user-6'],
  closesAt: isoDateTime(-2, 18, 0),
};

/** ACTIVE poll — `closesAt` is in the future, partial votes. */
export const MOCK_POLL_ACTIVE: Poll = {
  id: 'poll-2',
  question: 'Best night for the rooftop dinner?',
  options: [
    { id: 'opt-2a', label: 'Friday', votes: 1 },
    { id: 'opt-2b', label: 'Saturday', votes: 2 },
    { id: 'opt-2c', label: 'Sunday', votes: 0 },
  ],
  voters: ['me', 'user-2', 'user-6'],
  closesAt: isoDateTime(5, 23, 59),
};

export const MOCK_POLLS: Poll[] = [MOCK_POLL_CLOSED, MOCK_POLL_ACTIVE];

/** Polls keyed by group id (both attached to group-1). */
export const MOCK_POLLS_BY_GROUP: Record<string, Poll[]> = {
  'group-1': MOCK_POLLS,
  'group-2': [],
};

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: 'sug-1',
    authorId: 'user-2',
    text: 'New tapas place on Valencia — opens at 6, no reservations.',
    upvotes: ['me', 'user-4', 'user-6'],
    createdAt: isoDateTime(-3, 14, 12),
  },
];

/** Suggestions keyed by group id. */
export const MOCK_SUGGESTIONS_BY_GROUP: Record<string, Suggestion[]> = {
  'group-1': MOCK_SUGGESTIONS,
  'group-2': [],
};

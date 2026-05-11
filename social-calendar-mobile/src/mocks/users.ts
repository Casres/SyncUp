/**
 * MOCK USERS
 *
 * The "current user" is `MOCK_ME` with id 'me'. All other mocks
 * (friendships, RSVPs, group memberships, availability) are authored
 * relative to this user.
 *
 * Special seed roles encoded by id:
 *   'me'     — logged-in user (Ben Rivera, @ben)
 *   'user-2' — Sasha Kim — has NO availability set (tests "unknown" state)
 *   'user-3' — Marcus Chen — has BLOCKED availability from 'me' (see MOCK_AVAILABILITY_BLOCKS)
 *   'user-4' — Priya Osei — co-hosts MOCK_EVENT_COHOST with 'me'
 *   'user-5' — Jordan Lake — has a PENDING incoming friend request to 'me'
 *   'user-6' — Tomás Reyes — extra friend (BFF), used for full RSVP spread
 */

import type { User } from '../../../TYPES';

export const MOCK_ME: User = {
  id: 'me',
  name: 'Ben Rivera',
  handle: '@ben',
  letter: 'B',
  bio: 'Making plans actually happen.',
  email: 'ben@example.com',
  phone: '+1 555 0101',
  stats: { hosted: 12, attended: 34, friends: 5, groups: 2 },
};

export const MOCK_USERS: User[] = [
  MOCK_ME,
  {
    id: 'user-2',
    name: 'Sasha Kim',
    handle: '@sasha',
    letter: 'S',
    bio: 'Brunch enthusiast. Late to everything except concerts.',
    email: 'sasha@example.com',
    phone: '+1 555 0102',
    stats: { hosted: 4, attended: 22, friends: 9, groups: 2 },
  },
  {
    id: 'user-3',
    name: 'Marcus Chen',
    handle: '@marcus',
    letter: 'M',
    bio: 'Designer by day, climber by weekend.',
    email: 'marcus@example.com',
    phone: '+1 555 0103',
    stats: { hosted: 7, attended: 19, friends: 11, groups: 3 },
  },
  {
    id: 'user-4',
    name: 'Priya Osei',
    handle: '@priya',
    letter: 'P',
    bio: 'Hosting is my love language.',
    email: 'priya@example.com',
    phone: '+1 555 0104',
    stats: { hosted: 18, attended: 27, friends: 14, groups: 4 },
  },
  {
    id: 'user-5',
    name: 'Jordan Lake',
    handle: '@jordan',
    letter: 'J',
    bio: 'New in town, looking for a crew.',
    email: 'jordan@example.com',
    phone: '+1 555 0105',
    stats: { hosted: 0, attended: 3, friends: 2, groups: 0 },
  },
  {
    id: 'user-6',
    name: 'Tomás Reyes',
    handle: '@tomas',
    letter: 'T',
    bio: 'Lifelong best friend. Always down.',
    email: 'tomas@example.com',
    phone: '+1 555 0106',
    stats: { hosted: 9, attended: 31, friends: 8, groups: 2 },
  },
];

/** Lookup helper for tests / API stubs. */
export const MOCK_USERS_BY_ID: Record<string, User> = MOCK_USERS.reduce(
  (acc, u) => {
    acc[u.id] = u;
    return acc;
  },
  {} as Record<string, User>
);

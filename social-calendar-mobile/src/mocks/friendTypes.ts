/**
 * MOCK FRIEND TYPES
 *
 * FriendType = PRIVATE bucket the local user uses to organise their friends
 * (Hard Rule 8: Friend Type is PRIVATE; Social Group is SHARED).
 *
 * Audience targeting in BroadcastSettings ('types' mode) references these ids.
 *
 * R7-3 — FRIEND TYPES ARE NON-OVERLAPPING. One friend belongs to exactly
 * ONE FriendType. The `members[]` arrays below MUST be pairwise disjoint
 * across types — no user id may appear in more than one type. Assigning a
 * friend to a new type REMOVES them from any previous type. Verified
 * 2026-05-04: ft-1=[user-2,user-6], ft-2=[user-3], ft-3=[user-4],
 * ft-4=[user-5] → all pairwise disjoint.
 */

import type { FriendType } from '../../../TYPES';

// R7-3 — pairwise-disjoint member sets. Do not introduce overlap.
export const MOCK_FRIEND_TYPES: FriendType[] = [
  {
    id: 'ft-1',
    label: 'BFF',
    // Sasha + Tomás are the inner circle.
    members: ['user-2', 'user-6'],
  },
  {
    id: 'ft-2',
    label: 'Coworkers',
    members: ['user-3'],
  },
  {
    id: 'ft-3',
    label: 'Family',
    members: ['user-4'],
  },
  {
    id: 'ft-4',
    label: 'Acquaintances',
    members: ['user-5'],
  },
];

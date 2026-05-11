/**
 * MOCK AVAILABILITY + BROADCAST SETTINGS
 *
 * `MOCK_MY_AVAILABILITY` covers 30 consecutive days, today−4 through today+25.
 * The day at today+7 is `'busy'` to satisfy the Step 3 wire-back danger
 * banner contract: when `AvailabilityEntry[eventIso] === 'busy'`, Step 3 of
 * the Create Event flow renders a danger banner above the invite list.
 * `MOCK_EVENT_UPCOMING.iso` MUST equal isoOffset(7).
 *
 * 'user-2' (Sasha) is intentionally absent from MOCK_AVAILABILITY entirely
 * (empty map = "unknown" state on Step 3).
 *
 * 'user-3' (Marcus) is blocked from 'me' — present in MOCK_AVAILABILITY
 * here for completeness, but the API Stub Layer must consult
 * MOCK_AVAILABILITY_BLOCKS first and return forbidden / empty.
 */

import type { AvailabilityEntry, BroadcastSettings } from '../../../TYPES';

/**
 * Returns ISO-date string ('YYYY-MM-DD') for `today + days`. Pure helper —
 * no hardcoded calendar dates anywhere in the mocks.
 */
export function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * 'me' availability map — 30 consecutive days, today−4 through today+25.
 *
 * Pattern is hand-authored to give visual variety on the MonthGrid and
 * to land an interesting state on the upcoming event day:
 *
 *   today+7 is `'busy'` ← MUST stay 'busy' (Step 3 danger banner)
 */
export const MOCK_MY_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(-4)]: 'free',
  [isoOffset(-3)]: 'free',
  [isoOffset(-2)]: 'maybe',
  [isoOffset(-1)]: 'busy',
  [isoOffset(0)]: 'free',
  [isoOffset(1)]: 'free',
  [isoOffset(2)]: 'maybe',
  [isoOffset(3)]: 'free',
  [isoOffset(4)]: 'busy',
  [isoOffset(5)]: 'free',
  [isoOffset(6)]: 'free',
  [isoOffset(7)]: 'busy', // ← MOCK_EVENT_UPCOMING day — MUST be 'busy'
  [isoOffset(8)]: 'maybe',
  [isoOffset(9)]: 'free',
  [isoOffset(10)]: 'free',
  [isoOffset(11)]: 'busy',
  [isoOffset(12)]: 'free',
  [isoOffset(13)]: 'free',
  [isoOffset(14)]: 'maybe',
  [isoOffset(15)]: 'free',
  [isoOffset(16)]: 'free',
  [isoOffset(17)]: 'busy',
  [isoOffset(18)]: 'maybe',
  [isoOffset(19)]: 'free',
  [isoOffset(20)]: 'free',
  [isoOffset(21)]: 'free',
  [isoOffset(22)]: 'busy',
  [isoOffset(23)]: 'free',
  [isoOffset(24)]: 'maybe',
  [isoOffset(25)]: 'free',
};

/**
 * 'user-2' (Sasha) — intentionally empty so the Invite screen renders
 * the "unknown" availability state.
 */
export const MOCK_SASHA_AVAILABILITY: AvailabilityEntry = {};

/**
 * 'user-3' (Marcus) — has set availability but it is blocked from 'me'
 * (see MOCK_AVAILABILITY_BLOCKS). Stored here so the API Stub Layer can
 * unit-test the block path: data exists, but the lookup must refuse.
 */
export const MOCK_MARCUS_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(0)]: 'busy',
  [isoOffset(1)]: 'busy',
  [isoOffset(7)]: 'free',
  [isoOffset(14)]: 'free',
};

/**
 * 'user-4' (Priya) — partial set. Free on the upcoming event day so the
 * invite screen has a friend to confidently rely on.
 */
export const MOCK_PRIYA_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(5)]: 'free',
  [isoOffset(6)]: 'free',
  [isoOffset(7)]: 'free',
  [isoOffset(8)]: 'maybe',
  [isoOffset(9)]: 'busy',
  [isoOffset(14)]: 'free',
  [isoOffset(15)]: 'free',
};

/**
 * 'user-5' (Jordan) — pending friend request, not yet a friend. Has a
 * thin map so post-accept flows still have data.
 */
export const MOCK_JORDAN_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(7)]: 'maybe',
  [isoOffset(10)]: 'free',
};

/**
 * 'user-6' (Tomás) — BFF, fully populated.
 */
export const MOCK_TOMAS_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(0)]: 'free',
  [isoOffset(1)]: 'free',
  [isoOffset(2)]: 'free',
  [isoOffset(3)]: 'maybe',
  [isoOffset(4)]: 'free',
  [isoOffset(5)]: 'free',
  [isoOffset(6)]: 'busy',
  [isoOffset(7)]: 'free',
  [isoOffset(8)]: 'free',
  [isoOffset(9)]: 'maybe',
  [isoOffset(10)]: 'free',
};

/**
 * Availability map keyed by userId. The API Stub Layer reads this; absent
 * keys (e.g. 'user-2' below — DELIBERATELY ABSENT) signal "unknown".
 */
export const MOCK_AVAILABILITY: Record<string, AvailabilityEntry> = {
  me: MOCK_MY_AVAILABILITY,
  // 'user-2' Sasha — absent on purpose (tests "unknown" state)
  'user-3': MOCK_MARCUS_AVAILABILITY, // blocked — API stub must enforce
  'user-4': MOCK_PRIYA_AVAILABILITY,
  'user-5': MOCK_JORDAN_AVAILABILITY,
  'user-6': MOCK_TOMAS_AVAILABILITY,
};

/**
 * Broadcast settings for 'me'. One state ON, two OFF (per spec).
 *  - free: ON, targeting BFF friend type only
 *  - maybe: OFF
 *  - busy: OFF
 */
export const MOCK_BROADCAST_SETTINGS: BroadcastSettings = {
  free: {
    on: true,
    audience: 'types',
    targets: ['ft-1'], // BFF
  },
  maybe: {
    on: false,
    audience: 'everyone',
    targets: [],
  },
  busy: {
    on: false,
    audience: 'friends',
    targets: [],
  },
};

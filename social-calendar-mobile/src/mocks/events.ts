/**
 * MOCK EVENTS
 *
 * One past, one upcoming, one recurring (with cancelled + rescheduled
 * exceptions), and one where 'me' is co-host (not host).
 *
 * Inferred shapes (NOT in TYPES.ts — flagged for the API Stub Layer):
 *
 *   EventOrganiser = { eventId; userId; role: 'CREATOR' | 'COHOST' }
 *     — TYPES.ts only carries `Event.hostId`. Co-host membership comes
 *       from the backend's `EventOrganiser` join table (see Backend
 *       Events Domain handoff). We expose `MOCK_EVENT_ORGANISERS` so
 *       the Stub Layer can answer "is 'me' a co-host on this event?"
 *
 *   EventRecurrence = {
 *     rule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
 *     until?: string;
 *     exceptions: Array<
 *       | { date: string; type: 'cancelled' }
 *       | { date: string; type: 'rescheduled'; newDate: string; newStartAt?: string; newEndAt?: string }
 *     >;
 *   }
 *     — TYPES.ts has no recurrence field. The backend `EventException`
 *       table covers cancelled + rescheduled exceptions. Exposed as
 *       `MOCK_EVENT_RECURRENCE` keyed by event id.
 *
 * RSVP spec: event-1 has the full spread yes / maybe / no / null across
 * four users (me, user-2, user-3, user-4). 'user-4' has not responded
 * yet — null means "not yet responded".
 */

import type { Event, RSVPStatus } from '../../../TYPES';
import { isoOffset } from './availability';

// ---------------------------------------------------------------------------
// Inferred shapes
// ---------------------------------------------------------------------------

export type EventOrganiserRole = 'CREATOR' | 'COHOST';

export interface EventOrganiser {
  eventId: string;
  userId: string;
  role: EventOrganiserRole;
}

export type EventExceptionEntry =
  | { date: string; type: 'cancelled' }
  | {
      date: string;
      type: 'rescheduled';
      newDate: string;
      newStartAt?: string;
      newEndAt?: string;
    };

export interface EventRecurrence {
  rule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  /** Optional ISO date 'YYYY-MM-DD' the recurrence ends on. */
  until?: string;
  exceptions: EventExceptionEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compose an ISO start datetime: today+offsetDays at hh:mm (local-ish). */
function isoDateTime(offsetDays: number, hh: number, mm: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** UPCOMING — 'me' is host. Day at +7 is marked 'busy' in MOCK_MY_AVAILABILITY. */
export const MOCK_EVENT_UPCOMING: Event = {
  id: 'event-1',
  title: 'Rooftop Dinner',
  hostId: 'me',
  coHostIds: [],
  iso: isoOffset(7),
  startAt: isoDateTime(7, 19, 30),
  endAt: isoDateTime(7, 22, 30),
  location: 'The Aerie · 14th & Mission',
  geo: { lat: 37.7674, lng: -122.4194 },
  description:
    'Long table on the roof. BYO bottle, I’ll handle the food. Heaters on standby.',
  inviteeIds: ['user-2', 'user-3', 'user-4', 'user-6'],
  rsvps: {
    me: 'yes' satisfies RSVPStatus,
    'user-2': 'maybe' satisfies RSVPStatus,
    'user-3': 'no' satisfies RSVPStatus,
    'user-4': null satisfies RSVPStatus,
    // user-6 (Tomás) confirmed early
    'user-6': 'yes' satisfies RSVPStatus,
  },
  glyph: 'glyph-dinner',
  price: 0,
};

/** PAST — 'me' was host, attended, now closed. */
export const MOCK_EVENT_PAST: Event = {
  id: 'event-2',
  title: 'Birthday Karaoke',
  hostId: 'me',
  coHostIds: [],
  iso: isoOffset(-21),
  startAt: isoDateTime(-21, 21, 0),
  endAt: isoDateTime(-21, 23, 30),
  location: 'Mr. Lee’s · Sunset',
  description: 'Closed out with “Don’t Stop Believin’”.',
  inviteeIds: ['user-2', 'user-4', 'user-6'],
  rsvps: {
    me: 'yes',
    'user-2': 'yes',
    'user-4': 'yes',
    'user-6': 'maybe',
  },
  glyph: 'glyph-mic',
};

/** RECURRING — 'me' is host. Has cancelled + rescheduled exceptions. */
export const MOCK_EVENT_RECURRING: Event = {
  id: 'event-3',
  title: 'Tuesday Run Club',
  hostId: 'me',
  coHostIds: [],
  // First occurrence in the series — every Tuesday going forward.
  iso: isoOffset(2),
  startAt: isoDateTime(2, 7, 0),
  endAt: isoDateTime(2, 8, 0),
  location: 'Panhandle entrance',
  description: '5k, conversational pace. Coffee after.',
  inviteeIds: ['user-3', 'user-4', 'user-6'],
  rsvps: {
    me: 'yes',
    'user-3': 'yes',
    'user-4': 'yes',
    'user-6': 'maybe',
  },
  glyph: 'glyph-run',
};

/** CO-HOST — created by Priya (user-4); 'me' is co-host, not host. */
export const MOCK_EVENT_COHOST: Event = {
  id: 'event-4',
  title: 'Sunday Long Brunch',
  hostId: 'user-4',
  coHostIds: ['me'],
  iso: isoOffset(12),
  startAt: isoDateTime(12, 11, 0),
  endAt: isoDateTime(12, 14, 0),
  location: 'Priya’s place',
  description: 'Pancakes, mimosas, and at least one board game.',
  inviteeIds: ['me', 'user-2', 'user-6'],
  rsvps: {
    me: 'yes',
    'user-4': 'yes',
    'user-2': 'maybe',
    'user-6': 'yes',
  },
  glyph: 'glyph-brunch',
};

export const MOCK_EVENTS: Event[] = [
  MOCK_EVENT_UPCOMING,
  MOCK_EVENT_PAST,
  MOCK_EVENT_RECURRING,
  MOCK_EVENT_COHOST,
];

// ---------------------------------------------------------------------------
// Inferred-shape constants (consumed by API Stub Layer)
// ---------------------------------------------------------------------------

/**
 * Event organiser join — covers the CREATOR row (always present) plus
 * any COHOST rows. The Backend Events Domain enforces that creating an
 * event atomically inserts the CREATOR row. 'me' is co-host on event-4.
 */
export const MOCK_EVENT_ORGANISERS: EventOrganiser[] = [
  { eventId: 'event-1', userId: 'me', role: 'CREATOR' },
  { eventId: 'event-2', userId: 'me', role: 'CREATOR' },
  { eventId: 'event-3', userId: 'me', role: 'CREATOR' },
  { eventId: 'event-4', userId: 'user-4', role: 'CREATOR' },
  { eventId: 'event-4', userId: 'me', role: 'COHOST' },
];

/**
 * Per-event recurrence + exceptions. Only event-3 recurs.
 *  - Week 2 occurrence (today+9) is CANCELLED.
 *  - Week 3 occurrence (today+16) is RESCHEDULED to today+17 at 7:30am.
 */
export const MOCK_EVENT_RECURRENCE: Record<string, EventRecurrence> = {
  'event-3': {
    rule: 'WEEKLY',
    exceptions: [
      { date: isoOffset(9), type: 'cancelled' },
      {
        date: isoOffset(16),
        type: 'rescheduled',
        newDate: isoOffset(17),
        newStartAt: isoDateTime(17, 7, 30),
        newEndAt: isoDateTime(17, 8, 30),
      },
    ],
  },
};

/**
 * Convenience export: explicit RSVP roster per event id. Mirrors
 * `Event.rsvps` but in array form so screens that want to iterate
 * (e.g. attendees list) don't have to convert. event-1 carries the
 * full required spread: yes / maybe / no / null.
 */
export const MOCK_RSVPS: Record<
  string,
  ReadonlyArray<{ userId: string; status: RSVPStatus }>
> = {
  'event-1': [
    { userId: 'me', status: 'yes' },
    { userId: 'user-2', status: 'maybe' },
    { userId: 'user-3', status: 'no' },
    { userId: 'user-4', status: null },
    { userId: 'user-6', status: 'yes' },
  ],
  'event-2': [
    { userId: 'me', status: 'yes' },
    { userId: 'user-2', status: 'yes' },
    { userId: 'user-4', status: 'yes' },
    { userId: 'user-6', status: 'maybe' },
  ],
  'event-3': [
    { userId: 'me', status: 'yes' },
    { userId: 'user-3', status: 'yes' },
    { userId: 'user-4', status: 'yes' },
    { userId: 'user-6', status: 'maybe' },
  ],
  'event-4': [
    { userId: 'me', status: 'yes' },
    { userId: 'user-4', status: 'yes' },
    { userId: 'user-2', status: 'maybe' },
    { userId: 'user-6', status: 'yes' },
  ],
};

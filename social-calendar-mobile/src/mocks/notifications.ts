/**
 * MOCK NOTIFICATIONS — seed data for NotifSheet (Round 6 / Round 12).
 *
 * ⚠️ DEVELOPMENT ONLY — delete before production (see CLAUDE.md).
 *
 * Anchor rules driving this shape:
 *   R6-7  — day-grouping: TODAY · YESTERDAY · "TUE APR 22" · EARLIER.
 *           Seed spans today, yesterday, 3 days ago, and 8 days ago to
 *           exercise every group bucket.
 *   R7-4  — items older than 30 days are purged on sheet open. All seed
 *           rows are within 30 days of 2026-05-10.
 *   R7-5  — push copy === in-app copy verbatim. Plain summary strings
 *           (no "New activity from" / "SyncUp:" prefix).
 *   R12-1 — navigating cards (rsvp, event_reminder, co_host,
 *           group_activity, inbound_broadcast) carry every field the
 *           card body needs to render its destination intent.
 */

import type { Notif } from '../../../TYPES';

// Reference date: 2026-05-10 14:00 UTC. createdAt strings derive from this so
// the seed deterministically lands in the right group buckets when the
// development clock is set to today's date (TODAY / YESTERDAY / TUE-MAY-04
// once 8 days back / EARLIER).
const TODAY_2PM   = '2026-05-10T14:00:00.000Z';
const TODAY_9AM   = '2026-05-10T09:00:00.000Z';
const YESTERDAY   = '2026-05-09T18:00:00.000Z';
const THREE_DAYS  = '2026-05-07T11:00:00.000Z';   // "WED MAY 06" / named-day window
const EIGHT_DAYS  = '2026-05-02T19:00:00.000Z';   // "EARLIER" bucket (>7 days back)

export const MOCK_NOTIFICATIONS: Notif[] = [
  // ── TODAY ──────────────────────────────────────────────────────────────
  {
    id: '6a8c4f02-2d11-4b2e-a3a4-7d4bf7c0a201',
    type: 'rsvp',
    read: false,
    createdAt: TODAY_2PM,
    actorId: 'user-1',
    actorName: 'Sam Park',
    actorHandle: '@sam',
    actorInitial: 'S',
    eventId: 'event-1',
    eventName: 'Dinner Friday',
    rsvpStatus: 'yes',
  },
  {
    id: '0d9d56fb-7c4d-4d27-9eea-22c3f5f7b9a2',
    type: 'inbound_broadcast',
    read: false,
    createdAt: TODAY_9AM,
    actorId: 'user-2',
    actorName: 'Ana Reyes',
    actorHandle: '@ana',
    actorInitial: 'A',
    state: 'free',
    message: 'Free tonight if anyone wants to grab dinner',
  },
  {
    id: '1c9bff3a-9f0a-4e58-87b5-43e4c7e1c8f2',
    type: 'friend_request',
    read: false,
    createdAt: TODAY_9AM,
    actorId: 'user-7',
    actorName: 'Maya Chen',
    actorHandle: '@maya',
    actorInitial: 'M',
  },

  // ── YESTERDAY ──────────────────────────────────────────────────────────
  {
    id: '2f5c4f02-1d11-4b2e-a3a4-7d4bf7c0a233',
    type: 'co_host',
    read: false,
    createdAt: YESTERDAY,
    actorId: 'user-4',
    actorName: 'Priya Shah',
    actorHandle: '@priya',
    actorInitial: 'P',
    eventId: 'event-4',
    eventName: 'Rooftop Hang',
  },
  {
    id: '7f8e6d4c-3a1b-4f9d-95c2-2c91e6d3a44b',
    type: 'group_invite',
    read: false,
    createdAt: YESTERDAY,
    actorId: 'user-7',
    actorName: 'Maya Chen',
    actorInitial: 'M',
    groupId: 'group-3',
    groupName: 'Climbing Crew',
  },
  {
    id: 'a4dd1f6f-4f5b-44e3-8c9a-1d8c0aa9e455',
    type: 'event_reminder',
    read: true,
    createdAt: YESTERDAY,
    eventId: 'event-2',
    eventName: 'Brunch at Olo',
    eventStartsAt: '2026-05-11T11:00:00.000Z',
  },

  // ── 3 DAYS AGO (named-day group, e.g. "THU MAY 07") ────────────────────
  {
    id: 'b5b0c3a2-8e1c-4f99-a01d-9f3a72c44b66',
    type: 'rsvp',
    read: true,
    createdAt: THREE_DAYS,
    actorId: 'user-3',
    actorName: 'Marcus Lee',
    actorHandle: '@marcus',
    actorInitial: 'M',
    eventId: 'event-1',
    eventName: 'Dinner Friday',
    rsvpStatus: 'maybe',
  },
  {
    id: 'c901a45e-7d29-49b4-8d3b-1aa7e8d0f677',
    type: 'group_activity',
    read: true,
    createdAt: THREE_DAYS,
    groupId: 'group-3',
    groupName: 'Climbing Crew',
    groupInitial: 'C',
    summary: 'New poll: Saturday session — Brooklyn Boulders or VITAL?',
  },

  // ── EARLIER (>7 days back) ─────────────────────────────────────────────
  {
    id: 'd7e221b0-5f4c-4cf1-9e81-2bf3d51c0788',
    type: 'co_host_revoked',
    read: true,
    createdAt: EIGHT_DAYS,
    actorId: 'user-4',
    actorName: 'Priya Shah',
    actorInitial: 'P',
    eventId: 'event-4',
    eventName: 'Rooftop Hang',
  },
  {
    id: 'e4f3318e-6c13-4827-9b24-6e1c4b0e0899',
    type: 'rsvp',
    read: true,
    createdAt: EIGHT_DAYS,
    actorId: 'user-1',
    actorName: 'Sam Park',
    actorHandle: '@sam',
    actorInitial: 'S',
    eventId: 'event-3',
    eventName: 'Coffee Sunday',
    rsvpStatus: 'no',
  },
];

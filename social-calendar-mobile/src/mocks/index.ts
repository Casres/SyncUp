/**
 * ⚠️  TOMBSTONE — PRODUCTION-READINESS CLEANUP (2026-05-21)
 *
 * The dev-fixture seed data that lived in this directory has been EVACUATED
 * per the CLAUDE.md production rule:
 *
 *     "src/mocks/ seed file must be deleted before production.
 *      Do not ship mock data."
 *
 * The 8 prior data files (users / friendships / friendTypes / events / groups
 * / availability / notifications / explore) have been deleted. This single
 * tombstone file preserves the **symbol surface** so the API stub layer in
 * `src/api/` and the 8 screens that still import from `../mocks` continue to
 * compile (`tsc --noEmit` clean) until each stub is rewired to a real
 * backend endpoint.
 *
 * INTENT
 *   1. Ship NO seed data — every array is empty, every record is `{}`,
 *      singular records are minimal-valid empty shells with no real content.
 *   2. Keep the build green so feature work isn't blocked.
 *   3. Force each screen / API stub author to either (a) wire a real endpoint
 *      or (b) acknowledge an explicit empty-state code path. The app will
 *      render its zero-data empty states everywhere — that's the goal.
 *
 * NEXT STEP
 *   When the backend domains land (see LEAD_MANAGER `Backend Seed Rebuild` +
 *   per-domain endpoints), refactor each `src/api/*.ts` stub to call the real
 *   endpoint and delete the corresponding stub here. Once every consumer is
 *   gone, this whole directory can be removed.
 *
 * DO NOT add new seed data to this file. If a screen needs deterministic
 * fixture data during development, generate it inside that screen / test
 * file — not here.
 */

import type {
  AvailabilityEntry,
  BroadcastSettings,
  Event,
  ExploreVenue,
  Friend,
  FriendType,
  GroupMember,
  Notif,
  Poll,
  RSVPStatus,
  SocialGroup,
  Suggestion,
  User,
} from '../../../TYPES';

// ─────────────────────────────────────────────────────────────────────────────
// Type re-exports (kept so existing imports `type EventOrganiser, …` from
// '../mocks' still resolve — these describe runtime concepts the backend
// owns; they are stable contract surface, not seed data).
// ─────────────────────────────────────────────────────────────────────────────

export type EventOrganiserRole = 'CREATOR' | 'COHOST';

export interface EventOrganiser {
  eventId: string;
  userId: string;
  role: EventOrganiserRole;
}

export type EventExceptionEntry =
  | { type: 'cancelled'; date: string }
  | {
      type: 'rescheduled';
      date: string;
      newDate: string;
      newStartAt?: string;
      newEndAt?: string;
    };

export interface EventRecurrence {
  rule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  until?: string;
  exceptions: EventExceptionEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helper (pure math, no seed content). Used by date-relative empty
// fallbacks in screens; kept here to avoid breaking imports.
// ─────────────────────────────────────────────────────────────────────────────

export function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS — all empty.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local user shell. Populated from the auth layer in production
 * (Clerk profile sync). Keep `id: 'me'` because several screens key
 * "is this the current user?" off this literal until auth lands.
 */
export const MOCK_ME: User = {
  id: 'me',
  name: '',
  handle: '',
  letter: '',
  bio: '',
  email: '',
  phone: '',
  stats: { hosted: 0, attended: 0, friends: 0, groups: 0 },
};

export const MOCK_USERS: User[] = [];
export const MOCK_USERS_BY_ID: Record<string, User> = {};

// ─────────────────────────────────────────────────────────────────────────────
// FRIENDS — all empty.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_FRIENDS: Friend[] = [];
export const MOCK_PENDING_REQUESTS: Friend[] = [];
export const MOCK_FRIEND_LABELS: Array<{ id: string; label: string }> = [];
export const MOCK_AVAILABILITY_BLOCKS: Array<{ blockerId: string; blockedId: string }> = [];
export const MOCK_FRIEND_TYPES: FriendType[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABILITY — all empty maps.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_MY_AVAILABILITY: AvailabilityEntry = {};
export const MOCK_SASHA_AVAILABILITY: AvailabilityEntry = {};
export const MOCK_MARCUS_AVAILABILITY: AvailabilityEntry = {};
export const MOCK_PRIYA_AVAILABILITY: AvailabilityEntry = {};
export const MOCK_JORDAN_AVAILABILITY: AvailabilityEntry = {};
export const MOCK_TOMAS_AVAILABILITY: AvailabilityEntry = {};
export const MOCK_AVAILABILITY: Record<string, AvailabilityEntry> = {};

/**
 * Broadcast defaults: every channel OFF. Production source is profile.privacy
 * settings; this stub keeps the BroadcastSettings screen from crashing on a
 * missing record while real data is wired.
 */
export const MOCK_BROADCAST_SETTINGS: BroadcastSettings = {
  free: { on: false, audience: 'friends', targets: [] },
  maybe: { on: false, audience: 'friends', targets: [] },
  busy: { on: false, audience: 'friends', targets: [] },
};

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — empty arrays + minimal-shape singletons for direct-reference
// imports. Each singleton is shaped just well enough to satisfy the Event
// interface; no seed copy, no real ids, no PII.
// ─────────────────────────────────────────────────────────────────────────────

function emptyEvent(id: string): Event {
  return {
    id,
    title: '',
    hostId: '',
    coHostIds: [],
    iso: '',
    startAt: '',
    endAt: '',
    inviteeIds: [],
    rsvps: {},
  };
}

export const MOCK_EVENT_UPCOMING: Event = emptyEvent('');
export const MOCK_EVENT_PAST: Event = emptyEvent('');
export const MOCK_EVENT_RECURRING: Event = emptyEvent('');
export const MOCK_EVENT_COHOST: Event = emptyEvent('');
export const MOCK_EVENTS: Event[] = [];
export const MOCK_EVENT_ORGANISERS: EventOrganiser[] = [];
export const MOCK_EVENT_RECURRENCE: Record<string, EventRecurrence> = {};
export const MOCK_RSVPS: Record<string, Array<{ userId: string; status: RSVPStatus }>> = {};

// ─────────────────────────────────────────────────────────────────────────────
// GROUPS / POLLS / SUGGESTIONS — empty.
// ─────────────────────────────────────────────────────────────────────────────

function emptyGroup(id: string, isPrivate: boolean): SocialGroup {
  return {
    id,
    name: '',
    cover: { id: '', label: '', art: '' },
    isPrivate,
    members: [],
    userRole: 'admin',
  };
}

export const MOCK_GROUP_ADMIN: SocialGroup = emptyGroup('', true);
export const MOCK_GROUP_MEMBER: SocialGroup = emptyGroup('', false);
export const MOCK_SOCIAL_GROUPS: SocialGroup[] = [];
export const MOCK_GROUP_MEMBERS: Record<string, GroupMember[]> = {};

function emptyPoll(id: string): Poll {
  return { id, question: '', options: [], voters: [] };
}
export const MOCK_POLL_CLOSED: Poll = emptyPoll('');
export const MOCK_POLL_ACTIVE: Poll = emptyPoll('');
export const MOCK_POLLS: Poll[] = [];
export const MOCK_POLLS_BY_GROUP: Record<string, Poll[]> = {};

export const MOCK_SUGGESTIONS: Suggestion[] = [];
export const MOCK_SUGGESTIONS_BY_GROUP: Record<string, Suggestion[]> = {};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — empty feed.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: Notif[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE — empty.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_EXPLORE_VENUES: ExploreVenue[] = [];
export const MOCK_EXPLORE_FEATURED: ExploreVenue[] = [];

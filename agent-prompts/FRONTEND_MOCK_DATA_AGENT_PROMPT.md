# Frontend — Mock Data Layer Agent Prompt

> **You are the Frontend / Mock Data Layer agent.** Read this entire document before writing a single line of code. Your job is to create typed TypeScript constants that represent realistic sample data for every data shape in the SyncUp design system. This layer is the data source for the API Stub Layer — it is static, never fetched, never stored in state.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified:

| Agent | Output | Key files |
|-------|--------|-----------|
| Theme / Tokens | Full token system | `src/theme/` |

**Read these files before writing any code:**
- `TYPES.ts` (monorepo root) — all data shape type definitions. Every constant you create must satisfy one of these types.
- `ANCHOR.md` (monorepo root) — data shape definitions and the seed data spec (from `LEAD_MANAGER.md` — see below)
- `LEAD_MANAGER.md` (monorepo root) — the Seed Data Spec in Decision #4 defines exactly what mock records to create

---

## Non-Negotiable Contracts

### 1. All mock data is `as const` and typed

```ts
// ✅ correct
export const MOCK_USERS = [
  { id: 'user-1', name: 'Ben Rivera', handle: '@ben', ... },
] as const satisfies User[];

// ❌ wrong — loses type safety
export const MOCK_USERS = [{ id: 'user-1', ... }];
```

Use `satisfies` to catch shape mismatches at compile time without widening the type. If `satisfies` causes issues with circular `as const` inference, fall back to explicit `User[]` annotation.

### 2. No network calls, no async code
This file is pure constants. No `fetch`, no `axios`, no `setTimeout`. The API Stub Layer wraps these constants in async functions — not this layer.

### 3. No Zustand, no React Query
Mock data is not managed state. It is imported directly by the API Stub Layer as plain TypeScript values.

### 4. Seed data spec is the source of truth for what mock records to create
The Seed Data Spec from `LEAD_MANAGER.md` (Decision #4) defines exactly which records are needed. Build your mock data to satisfy all baseline and extended seed requirements.

### 5. The "current user" has id `'me'`
All mock data must be written from the perspective of a single logged-in user with `id: 'me'`. Relationships (friendships, group memberships, event RSVPs) are authored relative to this user.

---

## Seed Data Requirements

Build mock data that satisfies every item in the Seed Data Spec. Requirements duplicated here for completeness:

**Users:**
- `'me'` — the logged-in user (Ben Rivera, `@ben`)
- 3–4 additional users with varied profiles
- One friend with no availability set at all (tests "unknown" state on invite screen)
- One friend who has blocked their availability from `'me'` (tests availability blocking)

**Friendships:**
- Cover all label categories: friend, coworker, family, BFF — use `FriendshipLabel` type
- Mix of ACCEPTED friendships between `'me'` and the other users
- One PENDING friend request (incoming, from one of the users to `'me'`)

**Events:**
- One past event (attended, hosted by `'me'`)
- One upcoming event (created by `'me'`)
- One recurring event with at least one cancelled exception and one rescheduled exception
- One event where `'me'` is a co-host, not the creator
- One event with a full spread of RSVP states: `'me'` = yes, friend A = maybe, friend B = no, friend C = null (no response)

**SocialGroup:**
- One social group with `'me'` as admin and the other users as members
- One social group where `'me'` is a regular member (not admin) — verifies admin controls are hidden
- One closed poll with results already in
- One active poll with options
- One suggestion row

**Availability:**
- `'me'` has a populated `AvailabilityEntry` map covering 30 days (today−4 to today+25)
  - Mix of free, maybe, and busy days
  - Event day for the upcoming event should be marked `'busy'` (triggers Step 3 wire-back danger banner)
- Friend with no availability: absent from the availability map entirely
- Friend with availability blocked from `'me'`: present in `MOCK_AVAILABILITY_BLOCKS`

**BroadcastSettings:**
- `'me'` has realistic broadcast settings: one state ON targeting specific friend types, two states OFF

---

## Files to Create

Create these files inside `social-calendar-mobile/src/mocks/`:

```
src/mocks/
  users.ts            ← MOCK_USERS, MOCK_ME
  friendships.ts      ← MOCK_FRIENDSHIPS, MOCK_FRIEND_LABELS, MOCK_AVAILABILITY_BLOCKS
  friendTypes.ts      ← MOCK_FRIEND_TYPES (private groups — FriendType)
  events.ts           ← MOCK_EVENTS, MOCK_EVENT_ORGANISERS, MOCK_RSVPS
  groups.ts           ← MOCK_SOCIAL_GROUPS, MOCK_GROUP_MEMBERS, MOCK_POLLS, MOCK_SUGGESTIONS
  availability.ts     ← MOCK_AVAILABILITY, MOCK_BROADCAST_SETTINGS
  notifications.ts    ← MOCK_NOTIFICATIONS (placeholder — round 6 content)
  index.ts            ← barrel export
```

---

## File Specifications

### `users.ts`

```ts
import type { User } from '../../TYPES';

export const MOCK_ME: User = {
  id: 'me',
  name: 'Ben Rivera',
  handle: '@ben',
  letter: 'B',
  bio: 'Making plans actually happen.',
  email: 'ben@example.com',
  phone: '+1 555 0101',
  stats: { hosted: 12, attended: 34, friends: 8, groups: 3 },
};

export const MOCK_USERS: User[] = [
  MOCK_ME,
  {
    id: 'user-2',
    name: 'Sasha Kim',
    handle: '@sasha',
    letter: 'S',
    // ... realistic profile
    // NOTE: Sasha has NO availability set — tests "unknown" state
  },
  {
    id: 'user-3',
    name: 'Marcus Chen',
    handle: '@marcus',
    letter: 'M',
    // ...
    // NOTE: Marcus has blocked their availability from 'me'
  },
  {
    id: 'user-4',
    name: 'Priya Osei',
    handle: '@priya',
    letter: 'P',
    // ...
  },
  {
    id: 'user-5',
    name: 'Jordan Lake',
    handle: '@jordan',
    letter: 'J',
    // ...
  },
];
```

---

### `friendships.ts`

Satisfy the Anchor's `Friend` shape AND cover all required friendship states. The `Friend` shape is extended from the Anchor:

```ts
import type { Friend, FriendType } from '../../TYPES';

// MOCK_FRIENDS — accepted friendships from 'me' perspective
export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'friendship-1',
    // friend: user-2 (Sasha)
    // label: 'friend'
    // status: 'accepted'
    // friendTypes: ['ft-1'] // BFF type
  },
  {
    id: 'friendship-2',
    // friend: user-3 (Marcus)
    // label: 'coworker'
    // status: 'accepted'
  },
  {
    id: 'friendship-3',
    // friend: user-4 (Priya)
    // label: 'family'
    // status: 'accepted'
  },
];

// MOCK_PENDING_REQUESTS — incoming, receiverId === 'me'
export const MOCK_PENDING_REQUESTS: Friend[] = [
  {
    id: 'friendship-5',
    // initiatorId: 'user-5' (Jordan)
    // status: 'pending'
  },
];

// MOCK_AVAILABILITY_BLOCKS — users who have blocked their availability from 'me'
// blockerId: user-3 (Marcus), blockedId: 'me'
export const MOCK_AVAILABILITY_BLOCKS = [
  { blockerId: 'user-3', blockedId: 'me' },
] as const;
```

---

### `events.ts`

Build the full event set required by the seed spec. Events must have enough detail to render every screen in the Create Event flow and Event Detail:

```ts
import type { Event, RSVPStatus } from '../../TYPES';

// Upcoming event — 'me' is creator, event day is marked 'busy' in MOCK_AVAILABILITY
export const MOCK_EVENT_UPCOMING: Event = {
  id: 'event-1',
  title: 'Rooftop Dinner',
  // date: 7 days from today (compute with Date arithmetic at file level, store as ISO string)
  // ...
};

// Past event — 'me' attended, now closed
export const MOCK_EVENT_PAST: Event = { id: 'event-2', /* ... */ };

// Recurring event — has exceptions
export const MOCK_EVENT_RECURRING: Event = {
  id: 'event-3',
  // recurrence: { rule: 'WEEKLY', exceptions: [{ date: '...', type: 'cancelled' }, { date: '...', type: 'rescheduled', newDate: '...' }] }
};

// Event where 'me' is co-host, not creator
export const MOCK_EVENT_COHOST: Event = { id: 'event-4', creatorId: 'user-4', /* ... */ };

export const MOCK_EVENTS: Event[] = [
  MOCK_EVENT_UPCOMING,
  MOCK_EVENT_PAST,
  MOCK_EVENT_RECURRING,
  MOCK_EVENT_COHOST,
];

// RSVPs for the upcoming event — full spread of states
export const MOCK_RSVPS = {
  'event-1': [
    { userId: 'me',     status: 'yes'   as RSVPStatus },
    { userId: 'user-2', status: 'maybe' as RSVPStatus },
    { userId: 'user-3', status: 'no'    as RSVPStatus },
    { userId: 'user-4', status: null    as RSVPStatus }, // no response yet
  ],
} as const;
```

---

### `availability.ts`

The `AvailabilityEntry` type is `{ [iso: 'YYYY-MM-DD']: 'free' | 'maybe' | 'busy' }`. Absent key = unset.

```ts
import type { AvailabilityEntry, BroadcastSettings } from '../../TYPES';

// Helper to get ISO date strings relative to today
function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// 'me' availability — 30 days, today-4 to today+25
// The day of MOCK_EVENT_UPCOMING (today+7) must be 'busy' — triggers Step 3 danger banner
export const MOCK_MY_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(-4)]: 'free',
  [isoOffset(-3)]: 'free',
  [isoOffset(-2)]: 'maybe',
  [isoOffset(-1)]: 'busy',
  [isoOffset(0)]:  'free',
  [isoOffset(1)]:  'free',
  [isoOffset(2)]:  'maybe',
  [isoOffset(3)]:  'free',
  [isoOffset(4)]:  'busy',
  [isoOffset(5)]:  'free',
  [isoOffset(6)]:  'free',
  [isoOffset(7)]:  'busy',  // ← MOCK_EVENT_UPCOMING day — MUST be 'busy'
  // ... continue through today+25 with varied pattern
};

// Sasha (user-2) — no availability set at all (empty map = 'unknown' state)
export const MOCK_SASHA_AVAILABILITY: AvailabilityEntry = {};

// Priya (user-4) — has some availability set
export const MOCK_PRIYA_AVAILABILITY: AvailabilityEntry = {
  [isoOffset(5)]:  'free',
  [isoOffset(6)]:  'free',
  [isoOffset(7)]:  'maybe',
  // ...
};

// Availability map keyed by userId — for API stubs to look up per user
export const MOCK_AVAILABILITY: Record<string, AvailabilityEntry> = {
  'me':     MOCK_MY_AVAILABILITY,
  'user-2': MOCK_SASHA_AVAILABILITY, // empty = unknown
  // user-3 (Marcus) is blocked — API stub returns 403 / empty
  'user-4': MOCK_PRIYA_AVAILABILITY,
};

// Broadcast settings for 'me'
export const MOCK_BROADCAST_SETTINGS: BroadcastSettings = {
  free: {
    on: true,
    audience: 'types',
    targets: ['ft-1'],    // BFF friend type only
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
```

---

### `groups.ts`

```ts
import type { SocialGroup, GroupMember, Poll, Suggestion } from '../../TYPES';

// Group where 'me' is admin
export const MOCK_GROUP_ADMIN: SocialGroup = {
  id: 'group-1',
  name: 'Weekend Crew',
  // cover: ..., memberCount: 4, userRole: 'admin'
};

// Group where 'me' is regular member (not admin) — admin controls must be hidden
export const MOCK_GROUP_MEMBER: SocialGroup = {
  id: 'group-2',
  name: 'Book Club',
  // cover: ..., memberCount: 7, userRole: 'member'
};

export const MOCK_SOCIAL_GROUPS: SocialGroup[] = [MOCK_GROUP_ADMIN, MOCK_GROUP_MEMBER];

// Closed poll with results already in — for group-1
export const MOCK_POLL_CLOSED: Poll = {
  id: 'poll-1',
  groupId: 'group-1',
  question: 'Where should we meet?',
  closed: true,
  // options with vote counts
};

// Active poll — for group-1
export const MOCK_POLL_ACTIVE: Poll = {
  id: 'poll-2',
  groupId: 'group-1',
  question: 'Best night for rooftop dinner?',
  closed: false,
  // options without resolved counts
};

export const MOCK_POLLS: Poll[] = [MOCK_POLL_CLOSED, MOCK_POLL_ACTIVE];

export const MOCK_SUGGESTIONS: Suggestion[] = [
  { id: 'sug-1', groupId: 'group-1', text: 'Rooftop bar on 5th', votes: 3 },
];
```

---

### `notifications.ts`

Placeholder file for round 6 content:

```ts
// Notifications mock data — placeholder for Notifications screen (Round 6)
// This file will be populated once the notifications design is finalized.

export const MOCK_NOTIFICATIONS: unknown[] = [];
```

---

### `index.ts`

Barrel export of all constants:

```ts
export * from './users';
export * from './friendships';
export * from './friendTypes';
export * from './events';
export * from './groups';
export * from './availability';
export * from './notifications';
```

---

## Date Handling

Use the `isoOffset()` helper pattern (shown in `availability.ts`) for all date values computed relative to today. Never hardcode a specific calendar date — mock data must remain valid regardless of when the agent runs.

---

## Handoff Document

When all files are written and `npx tsc --noEmit` passes, write `src/mocks/MOCKS_HANDOFF.md`:

1. **What was built** — table of files and what each exports
2. **User reference table** — table of all mock users: id, name, handle, and their special role in the seed (e.g., "no availability set", "availability blocked from 'me'")
3. **Event reference table** — table of all mock events: id, title, date, creator, and special properties
4. **Wire-back dependency** — confirm that `MOCK_MY_AVAILABILITY[isoOffset(7)]` is `'busy'`, which is the event day for `MOCK_EVENT_UPCOMING`. The API Stub Layer uses this to trigger the Step 3 danger banner.
5. **Assumptions made** — any inferred field shapes not explicitly in `TYPES.ts`
6. **Suggested next agent** — API Stub Layer (reads this layer's exports)

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All mock records satisfy their corresponding type from `TYPES.ts` (via `satisfies` or explicit annotation)
- [ ] MOCK_MY_AVAILABILITY includes the event day for MOCK_EVENT_UPCOMING marked as `'busy'`
- [ ] Sasha (user-2) has an empty `AvailabilityEntry` (no keys)
- [ ] MOCK_AVAILABILITY_BLOCKS includes Marcus (user-3) blocking 'me'
- [ ] One pending friend request (incoming, status='pending', receiverId='me')
- [ ] One event where 'me' is co-host, not creator
- [ ] One recurring event with cancelled and rescheduled exceptions
- [ ] RSVP spread on event-1: yes/maybe/no/null across four users
- [ ] One closed poll with results, one active poll
- [ ] One group where 'me' is member (not admin)
- [ ] All date values use `isoOffset()` — no hardcoded calendar dates
- [ ] `src/mocks/index.ts` barrel exports everything
- [ ] `MOCKS_HANDOFF.md` is written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for Mock Data Layer → `COMPLETE (date)`

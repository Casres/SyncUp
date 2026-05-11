# Frontend — API Stub Layer Agent Prompt

> **You are the Frontend / API Stub Layer agent.** Read this entire document before writing a single line of code. Your job is to wrap the mock data layer in typed async functions that simulate the real API's shape, latency, and error behaviour. The Screens agent and React Query hooks consume these stubs — when the real backend is ready, stubs are swapped out without touching screen code.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified:

| Agent | Output | Key files |
|-------|--------|-----------|
| Theme / Tokens | Full token system | `src/theme/` |
| Mock Data Layer | Typed constants | `src/mocks/` — all mock data + `MOCKS_HANDOFF.md` |

**Read these files before writing any code:**
- `src/mocks/MOCKS_HANDOFF.md` — what mock constants are available and their special properties (especially the wire-back dependency)
- `src/mocks/index.ts` — barrel export of all mock constants; only import from here
- `TYPES.ts` (monorepo root) — all response type definitions; every stub return type must reference these
- `ANCHOR.md` (monorepo root) — for understanding what each "endpoint" returns, as described in the screen and component specs

---

## Non-Negotiable Contracts

### 1. API response data lives in React Query — never in Zustand

This is the iron rule from `LEAD_MANAGER.md` custom instructions:

> If data comes from the API, it lives in React Query. No exceptions.
> If data never touches the network, it lives in Zustand. No exceptions.
> Never store API response data manually in Zustand.

The stub functions are the "API" side. Screens use these stubs via React Query hooks only.

### 2. Every stub function is `async` and introduces a delay

All stubs simulate network latency:

```ts
// Standard delay range: 200–500ms, randomised per call
async function simulateLatency(): Promise<void> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

Every stub must `await simulateLatency()` before returning. This ensures loading states work correctly in the UI.

### 3. Stubs can throw typed errors

Stubs simulate realistic failure scenarios. Define error classes and throw them from stubs where appropriate:

```ts
export class ApiError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'OFFLINE' | 'SERVER_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

React Query's `onError` handler in screens will catch these. The error code maps to the `ErrorToast` or `ErrorState` preset to show.

### 4. No imports from `src/mocks/` except through the barrel index

```ts
// ✅ correct
import { MOCK_EVENTS, MOCK_RSVPS } from '../mocks';

// ❌ wrong — bypasses the barrel, brittle
import { MOCK_EVENTS } from '../mocks/events';
```

### 5. Every function has an explicit return type — no `any`

```ts
// ✅ correct
async function getEvent(id: string): Promise<Event> { ... }

// ❌ wrong
async function getEvent(id: string) { ... }
```

### 6. React Query keys are exported constants

Define and export all query keys as a typed constant object:

```ts
export const queryKeys = {
  events: {
    all:    () => ['events'] as const,
    detail: (id: string) => ['events', id] as const,
  },
  friends: {
    all:      () => ['friends'] as const,
    requests: () => ['friends', 'requests'] as const,
    profile:  (id: string) => ['friends', id] as const,
  },
  // ... one key per resource
} as const;
```

Screens import `queryKeys` and use them in `useQuery` calls — never write key strings inline in screen files.

---

## Files to Create

Create these files inside `social-calendar-mobile/src/api/`:

```
src/api/
  _utils.ts         ← simulateLatency(), ApiError, error-mapping helpers
  events.ts         ← event API stubs + React Query hooks
  friends.ts        ← friend API stubs + React Query hooks
  groups.ts         ← group API stubs + React Query hooks
  availability.ts   ← availability API stubs + React Query hooks
  profile.ts        ← user profile API stubs + React Query hooks
  queryKeys.ts      ← all React Query key factories (exported as queryKeys)
  index.ts          ← barrel export
```

---

## Stub Specifications

### `_utils.ts`

```ts
export class ApiError extends Error { /* code + message — see above */ }

export async function simulateLatency(): Promise<void> {
  const ms = 200 + Math.floor(Math.random() * 300);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Map ApiError code to ErrorToast preset key
export function toastPreset(err: ApiError): 'rsvp' | 'invite' | 'friend' | 'generic' {
  if (err.code === 'CONFLICT') return 'friend';
  return 'generic';
}
```

---

### `events.ts`

Each stub mirrors the corresponding backend endpoint from `LEAD_MANAGER.md` / `EVENTS_HANDOFF.md`.

**Stub functions (raw):**

```ts
getEvents(): Promise<Event[]>
  → returns MOCK_EVENTS (filter to non-deleted)

getEvent(id: string): Promise<Event>
  → returns the matching MOCK_EVENT or throws ApiError('NOT_FOUND', ...)

createEvent(draft: Omit<Event, 'id' | 'createdAt'>): Promise<Event>
  → returns a new Event with a generated id and today's date
  → simulates optimistic creation

updateEvent(id: string, patch: Partial<Event>): Promise<Event>
  → returns patched event (in-memory only; does not mutate the const)

deleteEvent(id: string): Promise<void>
  → simulates soft-delete; throws ApiError('FORBIDDEN') if id === 'event-4' and user is not co-host

getRSVPs(eventId: string): Promise<RSVPEntry[]>
  → returns MOCK_RSVPS[eventId] or []

submitRSVP(eventId: string, status: RSVPStatus): Promise<void>
  → simulates RSVP; 10% chance throws ApiError('SERVER_ERROR') to exercise the RSVP ErrorToast
```

**React Query hooks (exported alongside stubs):**

```ts
export function useEvents() {
  return useQuery({ queryKey: queryKeys.events.all(), queryFn: getEvents });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: queryKeys.events.detail(id), queryFn: () => getEvent(id) });
}

export function useSubmitRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: RSVPStatus }) =>
      submitRSVP(eventId, status),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}

// ... createEvent, updateEvent, deleteEvent mutations
```

---

### `friends.ts`

```ts
getFriends(label?: string): Promise<Friend[]>
  → returns MOCK_FRIENDS filtered by label if provided

getFriendRequests(): Promise<Friend[]>
  → returns MOCK_PENDING_REQUESTS

sendFriendRequest(recipientId: string): Promise<void>
  → simulates; throws ApiError('CONFLICT') if recipientId already in MOCK_FRIENDS

respondToFriendRequest(id: string, action: 'accept' | 'decline'): Promise<void>
  → simulates accept/decline

getFriendProfile(friendId: string): Promise<User>
  → returns matching user from MOCK_USERS or throws ApiError('NOT_FOUND')
```

**React Query hooks:**
```ts
export function useFriends(label?: string) { /* useQuery */ }
export function useFriendRequests() { /* useQuery */ }
export function useFriendProfile(id: string) { /* useQuery */ }
export function useSendFriendRequest() { /* useMutation */ }
export function useRespondToFriendRequest() { /* useMutation */ }
```

---

### `groups.ts`

```ts
getGroups(): Promise<SocialGroup[]>
  → returns MOCK_SOCIAL_GROUPS

getGroupDetail(id: string): Promise<SocialGroup>
  → returns matching group or throws ApiError('NOT_FOUND')

getGroupPolls(groupId: string): Promise<Poll[]>
  → returns MOCK_POLLS filtered by groupId

getGroupSuggestions(groupId: string): Promise<Suggestion[]>
  → returns MOCK_SUGGESTIONS filtered by groupId

createGroup(name: string): Promise<SocialGroup>
  → returns new group with generated id, createdAt: now, userRole: 'admin'

votePoll(pollId: string, optionId: string): Promise<void>
  → simulates poll vote

addSuggestion(groupId: string, text: string): Promise<Suggestion>
  → returns new suggestion
```

---

### `availability.ts`

```ts
getMyAvailability(): Promise<AvailabilityEntry>
  → returns MOCK_MY_AVAILABILITY

getFriendAvailability(userId: string): Promise<AvailabilityEntry>
  → checks MOCK_AVAILABILITY_BLOCKS first
  → if userId is blocked (blockerId === userId, blockedId === 'me'): throws ApiError('FORBIDDEN')
  → if userId === 'user-2' (Sasha): returns MOCK_SASHA_AVAILABILITY (empty — unknown state)
  → otherwise: returns MOCK_AVAILABILITY[userId]

updateAvailability(entry: AvailabilityEntry): Promise<void>
  → simulates write; no actual mutation of constants

getBroadcastSettings(): Promise<BroadcastSettings>
  → returns MOCK_BROADCAST_SETTINGS

updateBroadcastSettings(settings: BroadcastSettings): Promise<void>
  → simulates write
```

**React Query hooks:**
```ts
export function useMyAvailability() { /* useQuery */ }
export function useFriendAvailability(userId: string) { /* useQuery — enabled: !!userId */ }
export function useBroadcastSettings() { /* useQuery */ }
export function useUpdateAvailability() { /* useMutation */ }
export function useUpdateBroadcastSettings() { /* useMutation */ }
```

---

### `profile.ts`

```ts
getMyProfile(): Promise<User>
  → returns MOCK_ME

getNotificationSettings(): Promise<NotificationSettings>
  → returns sensible defaults matching ANCHOR defaults

getPrivacySettings(): Promise<PrivacySettings>
  → returns sensible defaults

updateProfile(patch: Partial<User>): Promise<User>
  → returns patched profile

updateNotificationSettings(settings: NotificationSettings): Promise<void>
  → simulates write

updatePrivacySettings(settings: PrivacySettings): Promise<void>
  → simulates write
```

---

### `queryKeys.ts`

```ts
export const queryKeys = {
  events: {
    all:    () => ['events'] as const,
    detail: (id: string) => ['events', id] as const,
    rsvps:  (id: string) => ['events', id, 'rsvps'] as const,
  },
  friends: {
    all:      () => ['friends'] as const,
    requests: () => ['friends', 'requests'] as const,
    profile:  (id: string) => ['friends', id] as const,
    blocks:   () => ['friends', 'blocks'] as const,
  },
  groups: {
    all:         () => ['groups'] as const,
    detail:      (id: string) => ['groups', id] as const,
    polls:       (id: string) => ['groups', id, 'polls'] as const,
    suggestions: (id: string) => ['groups', id, 'suggestions'] as const,
  },
  availability: {
    mine:     () => ['availability', 'me'] as const,
    friend:   (id: string) => ['availability', id] as const,
    broadcasts: () => ['availability', 'broadcasts'] as const,
  },
  profile: {
    me:            () => ['profile'] as const,
    notifications: () => ['profile', 'notifications'] as const,
    privacy:       () => ['profile', 'privacy'] as const,
  },
} as const;
```

---

### `index.ts`

Barrel export — screens import from `../../api`, not from individual files:

```ts
export * from './queryKeys';
export * from './_utils';
export * from './events';
export * from './friends';
export * from './groups';
export * from './availability';
export * from './profile';
```

---

## Optimistic Updates Pattern

For mutations that write data the user immediately sees reflected (RSVP, availability update, broadcast settings), implement optimistic updates in the React Query mutation:

```ts
export function useSubmitRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ...,
    onMutate: async ({ eventId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });
      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.events.detail(eventId));
      // Optimistically update
      queryClient.setQueryData(queryKeys.events.detail(eventId), (old: Event | undefined) =>
        old ? { ...old, myRsvp: status } : old
      );
      return { previous };
    },
    onError: (err, { eventId }, context) => {
      // Roll back on failure
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.events.detail(eventId), context.previous);
      }
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}
```

Apply this pattern to: RSVP submission, availability update, broadcast settings update.

---

## Handoff Document

When all files are written and `npx tsc --noEmit` passes, write `src/api/API_STUB_HANDOFF.md`:

1. **What was built** — table of files, stub functions per file, and hooks per file
2. **Error simulation** — document which stubs have non-zero failure rates (e.g., RSVP 10% failure) and what `ApiError` codes they throw
3. **Wire-back dependency** — confirm `getFriendAvailability('user-3')` throws `FORBIDDEN` (blocked), and `getMyAvailability()` returns `'busy'` for the event day, enabling the Step 3 danger banner
4. **Optimistic update coverage** — list which mutations implement optimistic updates
5. **Swapping for real API** — note that to swap in a real API, callers only need to replace the function body of each stub; the React Query hooks and `queryKeys` are already shaped correctly for production use
6. **Suggested next agent** — Screens agent

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Every stub function is `async` and `await simulateLatency()` before returning
- [ ] Every return type is explicit — no `any`
- [ ] `ApiError` is defined and thrown by at least 3 stubs
- [ ] `getFriendAvailability('user-3')` throws `ApiError('FORBIDDEN')` (Marcus is blocked)
- [ ] RSVP submission has ~10% failure rate to exercise the RSVP `ErrorToast`
- [ ] React Query hooks are exported for all stubs (not just raw functions)
- [ ] `queryKeys` is exported from `queryKeys.ts` and re-exported from `index.ts`
- [ ] Optimistic updates implemented for RSVP, availability, and broadcast settings mutations
- [ ] All imports from `../mocks` use the barrel index only
- [ ] `API_STUB_HANDOFF.md` is written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for API Stub Layer → `COMPLETE (date)`

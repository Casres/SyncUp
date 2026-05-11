# API Stub Layer — Handoff (2026-05-04)

The API Stub Layer wraps the Mock Data Layer in typed, async functions that simulate the
real backend's shape, latency, and failure modes. Screens consume these stubs through
React Query hooks; when the real backend lands, only the function bodies of the stubs
need to change.

All files live in `social-calendar-mobile/src/api/`. Screens import from `'../api'` (the
barrel) — never reach into individual stub files.

---

## 1. What was built

| File | Stub functions | React Query hooks |
|---|---|---|
| `_utils.ts` | `simulateLatency()`, `shouldSimulateFailure()`, `toastPreset()` + `ApiError` class | — |
| `events.ts` | 7 stubs: `getEvents`, `getEvent`, `createEvent`, `updateEvent`, `deleteEvent`, `getRSVPs`, `submitRSVP` | 6 hooks: `useEvents`, `useEvent`, `useEventRSVPs`, `useSubmitRSVP`, `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent` (7) |
| `friends.ts` | 5 stubs: `getFriends`, `getFriendRequests`, `sendFriendRequest`, `respondToFriendRequest`, `getFriendProfile` | 5 hooks: `useFriends`, `useFriendRequests`, `useFriendProfile`, `useSendFriendRequest`, `useRespondToFriendRequest` |
| `groups.ts` | 7 stubs: `getGroups`, `getGroupDetail`, `getGroupPolls`, `getGroupSuggestions`, `createGroup`, `votePoll`, `addSuggestion` (+ `pollIsClosed` helper) | 6 hooks: `useGroups`, `useGroupDetail`, `useGroupPolls`, `useGroupSuggestions`, `useCreateGroup`, `useVotePoll`, `useAddSuggestion` (7) |
| `availability.ts` | 5 stubs: `getMyAvailability`, `getFriendAvailability`, `updateAvailability`, `getBroadcastSettings`, `updateBroadcastSettings` | 5 hooks: `useMyAvailability`, `useFriendAvailability`, `useBroadcastSettings`, `useUpdateAvailability`, `useUpdateBroadcastSettings` |
| `profile.ts` | 6 stubs: `getMyProfile`, `getNotificationSettings`, `getPrivacySettings`, `updateProfile`, `updateNotificationSettings`, `updatePrivacySettings` | 6 hooks: `useMyProfile`, `useNotificationSettings`, `usePrivacySettings`, `useUpdateProfile`, `useUpdateNotificationSettings`, `useUpdatePrivacySettings` |
| `queryKeys.ts` | — | exports `queryKeys` factory covering events / friends / groups / availability / profile |
| `queryClient.ts` | — | exports `queryClient` (single `QueryClient` instance with mobile-tuned defaults) |
| `index.ts` | — | barrel re-exports `_utils`, `queryKeys`, `queryClient`, `events`, `friends`, `groups`, `availability`, `profile` |

Every stub function is `async`, has an explicit return type, and `await simulateLatency()`
before resolving. The latency range is 200–500ms randomised per call.

---

## 2. Error simulation

Stubs throw `ApiError(code, message)` for the documented failure modes. The `code`
discriminates between `'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'OFFLINE' | 'SERVER_ERROR'`.
`toastPreset(err)` maps a code to one of the `ErrorToastKind` presets the screen layer renders
(default `'generic'`; CONFLICT → `'friend'`).

| Stub | Trigger | Code thrown |
|---|---|---|
| `getEvent(id)` | id not in `MOCK_EVENTS` | `NOT_FOUND` |
| `updateEvent(id, …)` | id not in `MOCK_EVENTS` | `NOT_FOUND` |
| `deleteEvent('event-4')` | caller is not the CREATOR (only Priya is) | `FORBIDDEN` |
| `submitRSVP(eventId, status)` | randomised — ~10% per call (`shouldSimulateFailure(0.1)`) | `SERVER_ERROR` |
| `sendFriendRequest(recipientId)` | recipient already in `MOCK_FRIENDS` | `CONFLICT` |
| `respondToFriendRequest(id, …)` | id not in `MOCK_PENDING_REQUESTS` | `NOT_FOUND` |
| `getFriendProfile(friendId)` | id not in `MOCK_USERS_BY_ID` | `NOT_FOUND` |
| `getGroupDetail(id)` | id not in `MOCK_SOCIAL_GROUPS` | `NOT_FOUND` |
| `votePoll(pollId, optionId)` | poll not found | `NOT_FOUND` |
| `votePoll(pollId, optionId)` | poll closed (`closesAt < now`) | `CONFLICT` |
| `votePoll(pollId, optionId)` | option not in poll | `NOT_FOUND` |
| `addSuggestion(groupId, …)` | group not in `MOCK_SOCIAL_GROUPS` | `NOT_FOUND` |
| `getFriendAvailability('user-3')` | Marcus has blocked 'me' (see §3) | `FORBIDDEN` |

The four spec-mandated throws — `getEvent NOT_FOUND`, `sendFriendRequest CONFLICT`,
`getFriendAvailability FORBIDDEN`, `submitRSVP ~10% SERVER_ERROR` — were verified by
reading the implementations and are confirmed in place.

---

## 3. Wire-back dependency (Step 3 danger banner contract)

The Mock Data Layer carries an invariant the API Stub Layer must preserve: when the user
opens the upcoming event detail and proceeds to Step 3 (Date/Time), the danger banner
must fire because the user is busy on the event day.

Two facts make this work:

1. `getMyAvailability()` returns `MOCK_MY_AVAILABILITY`, in which
   `MOCK_MY_AVAILABILITY[isoOffset(7)] === 'busy'`. `MOCK_EVENT_UPCOMING.iso === isoOffset(7)`,
   so `myAvailability[event.iso] === 'busy'` — the danger banner condition holds.
2. `getFriendAvailability('user-3')` throws `ApiError('FORBIDDEN', …)`. The block table
   (`MOCK_AVAILABILITY_BLOCKS`) contains `{ blockerId: 'user-3', blockedId: 'me' }`, and
   `availability.ts` runs the block check FIRST, before falling through to the row lookup.
   Marcus is invited to the event, so the AvailabilitySummary on Step 1 will show his row
   in the "blocked" state without leaking calendar data.

Both invariants are exercised by reading the code:

- `availability.ts` lines 84–89 — block check throws `FORBIDDEN`.
- `availability.ts` lines 65–68 — `getMyAvailability` returns `{ ...MOCK_MY_AVAILABILITY }`.
- `src/mocks/availability.ts` line 50 — `[isoOffset(7)]: 'busy'` with the inline comment
  "MOCK_EVENT_UPCOMING day — MUST be 'busy'".

---

## 4. Optimistic update coverage

Three mutations implement the cancel → snapshot → patch → onError rollback → onSettled
invalidate pattern:

| Hook | Cache it patches | What gets patched optimistically |
|---|---|---|
| `useSubmitRSVP` | `queryKeys.events.detail(eventId)` | `Event.rsvps['me']` set to the new status |
| `useUpdateAvailability` | `queryKeys.availability.mine()` | replaces the entire `AvailabilityEntry` map |
| `useUpdateBroadcastSettings` | `queryKeys.availability.broadcasts()` | replaces the entire `BroadcastSettings` object |

On `SERVER_ERROR` (e.g. the 10% RSVP failure roll), the snapshot is restored from the
mutation context. `onSettled` always invalidates so the canonical truth wins after the
optimistic round-trip.

Other mutations (`useCreateEvent`, `useUpdateEvent`, `useDeleteEvent`, `useSendFriendRequest`,
`useRespondToFriendRequest`, `useCreateGroup`, `useVotePoll`, `useAddSuggestion`,
`useUpdateProfile`, `useUpdateNotificationSettings`, `useUpdatePrivacySettings`) use
straightforward `onSuccess` invalidations / `setQueryData` writes; per spec, they are not
on the optimistic-update path.

---

## 5. Swapping for a real API

When the real backend is ready, the only edits needed are inside the bodies of the stub
functions — none of the React Query hook signatures, query keys, error shapes, or screen
imports need to change.

Concretely, each `events.ts` / `friends.ts` / `groups.ts` / `availability.ts` / `profile.ts`
function currently looks like:

```ts
export async function getEvent(id: string): Promise<Event> {
  await simulateLatency();
  const evt = MOCK_EVENTS.find((e) => e.id === id);
  if (!evt) throw new ApiError('NOT_FOUND', `Event "${id}" not found.`);
  return evt;
}
```

The production version becomes:

```ts
export async function getEvent(id: string): Promise<Event> {
  const res = await fetch(`/api/events/${id}`);
  if (res.status === 404) throw new ApiError('NOT_FOUND', `Event "${id}" not found.`);
  if (!res.ok) throw new ApiError('SERVER_ERROR', await res.text());
  return res.json();
}
```

The hooks (`useEvent`, `useSubmitRSVP`, etc.), the `queryKeys` factory, the `ApiError`
shape, and the `toastPreset()` mapping all stay identical. Screens are not touched.

---

## 6. App.tsx wiring

The navigation tree is now wrapped in `<QueryClientProvider client={queryClient}>`. The
chosen ordering (outermost → innermost) is:

```
GestureHandlerRootView
  → SafeAreaProvider
    → QueryClientProvider          ← added by this agent
      → NavigationContainer
        → RootNavigator
```

`QueryClientProvider` is placed **outside** `NavigationContainer` deliberately: the React
Query cache must survive navigator remounts (modal push/pop, deep-link rehydration), and
hooks like `useEvent` are sometimes called from screens that mount transiently. Placing
the provider above `NavigationContainer` keeps the cache stable for the lifetime of the
app process.

`queryClient` is imported from `./src/api/queryClient` — there is exactly one instance
app-wide (defaults: `staleTime` 30s, `gcTime` 5min, `retry` 1, `refetchOnWindowFocus`
disabled — all tuned for stub data and React Native).

`tsc --noEmit` is clean for `App.tsx` and `src/api/**`. The only remaining errors come
from the parallel Component Library completion agent's in-flight `AvailDot` work
(`src/components/eventFlow/{AvailabilitySummaryBar,EventCard}.tsx` import
`'../profile/AvailDot'`, which that agent is creating). Those are not in this layer's
scope.

---

## 7. Suggested next agent

**Screens agent.** All the prerequisites are now in place:

- `src/theme/` — tokens
- `src/mocks/` — typed mock data
- `src/components/` — being completed in parallel by the Component Library agent
- `src/api/` — typed async stubs, query keys, hooks, `QueryClientProvider` wired

Screens should consume the API exclusively through the hooks exported from `'../api'`
(or `'../../api'`) and never call the raw stub functions directly. Per the iron rule,
API response data lives in React Query — never in Zustand.

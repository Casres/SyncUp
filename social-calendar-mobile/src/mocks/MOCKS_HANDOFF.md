# Mock Data Layer — Handoff (TOMBSTONE)

**Status:** EVACUATED (2026-05-21) — was COMPLETE (2026-05-04)
**Owner:** Frontend / Mock Data Layer agent
**Next agent:** Whichever Frontend agent rewires `src/api/*` to real backend endpoints.

---

## ⚠️ This directory has been evacuated

Per the project's production rule (CLAUDE.md → "Seed data reminder"), the seed
data that previously lived here has been removed. All 8 prior data files
(`users.ts`, `friendships.ts`, `friendTypes.ts`, `events.ts`, `groups.ts`,
`availability.ts`, `notifications.ts`, `explore.ts`) are deleted.

Only `index.ts` remains. It is a **tombstone** that re-exports the same
symbol names as empty / safe-default values so that:

1. The API stub layer in `src/api/*` still compiles (`tsc --noEmit` clean).
2. The 8 screens / components that still import from `../mocks` still compile.
3. **No mock data ships** — every array is empty, every record is `{}`,
   singular records are minimal empty shells with zero PII.

The app now renders its zero-data empty states everywhere — exactly what
production wiring will surface until the backend domains are reached.

---

## What was deleted

| File | Symbols evacuated |
|---|---|
| `users.ts` | MOCK_ME (kept as `{ id: 'me', name: '', … }` shell), MOCK_USERS, MOCK_USERS_BY_ID |
| `friendships.ts` | MOCK_FRIENDS, MOCK_PENDING_REQUESTS, MOCK_FRIEND_LABELS, MOCK_AVAILABILITY_BLOCKS |
| `friendTypes.ts` | MOCK_FRIEND_TYPES |
| `events.ts` | MOCK_EVENT_UPCOMING/PAST/RECURRING/COHOST (kept as empty Event shells), MOCK_EVENTS, MOCK_EVENT_ORGANISERS, MOCK_EVENT_RECURRENCE, MOCK_RSVPS, type exports preserved |
| `groups.ts` | MOCK_GROUP_ADMIN/MEMBER (kept as empty SocialGroup shells), MOCK_SOCIAL_GROUPS, MOCK_GROUP_MEMBERS, MOCK_POLL_CLOSED/ACTIVE, MOCK_POLLS, MOCK_POLLS_BY_GROUP, MOCK_SUGGESTIONS, MOCK_SUGGESTIONS_BY_GROUP |
| `availability.ts` | MOCK_MY/SASHA/MARCUS/PRIYA/JORDAN/TOMAS_AVAILABILITY, MOCK_AVAILABILITY, MOCK_BROADCAST_SETTINGS (all-off defaults), `isoOffset()` date helper kept |
| `notifications.ts` | MOCK_NOTIFICATIONS |
| `explore.ts` | MOCK_EXPLORE_VENUES, MOCK_EXPLORE_FEATURED |

The `EventOrganiser`, `EventOrganiserRole`, `EventRecurrence`, and
`EventExceptionEntry` type exports are preserved (they describe runtime
shapes the backend will own; they are stable contract surface, not seed
data).

---

## How to finish the cleanup

For each `src/api/*.ts` stub that still imports from `../mocks`, replace the
stub body with a real `authedFetch` call to the backend endpoint and remove
its mock import. Once every consumer is rewired:

1. Delete `src/mocks/index.ts`.
2. Delete this `MOCKS_HANDOFF.md`.
3. The `src/mocks/` directory then disappears.

Consumers still importing from `../mocks` as of 2026-05-21:

- `src/api/notifications.ts`
- `src/api/availability.ts`
- `src/api/profile.ts`
- `src/api/groups.ts`
- `src/api/friends.ts`
- `src/api/events.ts`
- `src/api/explore.ts`
- `src/components/social/SearchOverlay.tsx`
- `src/screens/profile/AudiencePickerSheetScreen.tsx`
- `src/screens/profile/AvailabilityEditorScreen.tsx`
- `src/screens/profile/BroadcastSettingsScreen.tsx`
- `src/screens/friends/FriendsListScreen.tsx`
- `src/screens/friends/FriendProfileScreen.tsx`
- `src/screens/friends/FriendTypesManagerScreen.tsx`
- `src/screens/groups/GroupDetailScreen.tsx`
- `src/screens/events/EventDetailScreen.tsx`
- `src/screens/create/Step3Screen.tsx`

DO NOT add new seed data to `index.ts`. If a screen needs deterministic
fixture data during development, generate it inside that screen / test file
(or behind a `__DEV__` guard) — not here.

---

## Original handoff (preserved for archaeology)

The original "what was built (2026-05-04)" reference table — user reference,
event reference, wire-back invariant, inferred-shape notes — is preserved
in git history. Read `git log src/mocks/users.ts` if you need to know what
each seed user looked like; the data is gone but the history isn't.

# AUTH ONBOARDING HANDOFF — R15-7 through R15-13

**Completed:** 2026-05-24  
**Rules:** R15-7 · R15-8 · R15-9 · R15-10 · R15-11 · R15-12 · R15-13

---

## New files

| File | Purpose |
|------|---------|
| `src/screens/auth/onboarding/useIsFirstRun.ts` | First-run gate — all three stats counters zero |
| `src/screens/auth/onboarding/useContactsPermissionStatus.ts` | One-shot OS Contacts permission query |
| `src/screens/auth/onboarding/useContactsMatches.ts` | React Query hook wrapping `contactsLookup()` |
| `src/api/onboarding.ts` | `ContactsMatch` type · `contactsLookup()` stub · `useSendFriendRequestFromMatches()` mutation |
| `src/screens/auth/PushPermissionGateScreen.tsx` | R15-9: near-invisible pass-through, fires push prompt |
| `src/screens/auth/FriendFindDecisionScreen.tsx` | R15-10: three-branch decision (Find friends / Not now / Skip) |
| `src/screens/auth/FriendFindMatchesScreen.tsx` | R15-10: contacts matches list with Add/Sent pills |
| `src/screens/auth/FriendFindNoWorriesScreen.tsx` | R15-10: unified denial/skip destination |
| `src/screens/auth/YoureInScreen.tsx` | R15-12: last pre-app beat with flow-fade-up animation |
| `src/components/foundation/ContactsDeniedAffordance.tsx` | R15-11: deep-link-to-Settings nudge in Friends tab |

---

## Modified files

| File | Change |
|------|--------|
| `src/navigation/types.ts` | Added `PushPermissionGate · FriendFindDecision · FriendFindMatches · FriendFindNoWorries · YoureIn` to `AuthStackParamList` |
| `src/navigation/AuthNavigator.tsx` | Registered all 5 new screens after SignUpStep6; `PushPermissionGate` has `animation:'none'`; all 5 have `gestureEnabled:false` |
| `src/screens/auth/SignUpStep6Screen.tsx` | `finishOnboarding()` now calls `navigation.navigate('PushPermissionGate')` |
| `src/api/queryKeys.ts` | Added `onboarding.contactsMatches(hashKey)` query key |
| `src/api/index.ts` | Added `export * from './onboarding'` |
| `src/components/emptyStates/EmptyHome.tsx` | Added `firstRun?: boolean` prop; first-run copy: "Plan your first event." / "Tap + to start." |
| `src/components/emptyStates/EmptyFriends.tsx` | Added `firstRun?: boolean` prop; first-run copy: "Find your first friend." |
| `src/components/emptyStates/EmptyGroups.tsx` | Added `firstRun?: boolean` prop; first-run copy: "Start a group for your regulars." |
| `src/components/notifications/NotifSheet.tsx` | Imports `useIsFirstRun`; passes `firstRun` to `EmptyNotifications`; EmptyNotifications supports first-run copy: "Nothing yet." |
| `src/screens/home/HomeScreen.tsx` | Wires `useIsFirstRun()` → passes `firstRun` to `EmptyHome` |
| `src/screens/friends/FriendsListScreen.tsx` | Wires `useIsFirstRun()` + `useContactsPermissionStatus()`; mounts `ContactsDeniedAffordance` when denied; passes `firstRun` to both `EmptyFriends` usages |
| `src/screens/groups/GroupsListScreen.tsx` | Wires `useIsFirstRun()`; passes `firstRun` to `EmptyGroups` |

---

## Nav graph (post-Step-6 onboarding)

```
SignUpStep6
  └─ finishOnboarding() → navigate('PushPermissionGate')
       └─ replace('FriendFindDecision')
             ├─ Find friends → Contacts.requestPermissionsAsync()
             │     ├─ granted → replace('FriendFindMatches')
             │     │     └─ Continue → replace('YoureIn')
             │     └─ denied  → replace('FriendFindNoWorries')
             │                      └─ Got it → replace('YoureIn')
             ├─ Not now → replace('FriendFindNoWorries')
             └─ Skip    → replace('FriendFindNoWorries')
```

All routes after Step 6 use `replace()` — none appear in the back stack.

---

## First-run gate (R15-13)

`useIsFirstRun()` returns `true` when `me.stats.hosted === 0 && me.stats.friends === 0 && me.stats.groups === 0`.

State is read directly from `useMyProfile()` on every render — no stored flag.
Transitions out of first-run automatically the instant any counter becomes non-zero.

Surfaces that receive `firstRun` prop: `EmptyHome`, `EmptyFriends`, `EmptyGroups`, `EmptyNotifications` (inline in NotifSheet).

---

## Stub notes

- `contactsLookup()` in `src/api/onboarding.ts` returns `[]` until real backend endpoint exists.
- `useSendFriendRequestFromMatches()` has 10% simulated failure rate for dev testing.
- `YoureInScreen.onGo()` fires `success` haptic; actual Clerk `setActive({ session })` hand-off is a TODO for when session management is fully integrated.
- `RingAvatar` in `YoureInScreen` shows initials only — photo URL support deferred until `User.photoUrl` field is added to the API schema.

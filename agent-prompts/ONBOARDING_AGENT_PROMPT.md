# Frontend — Onboarding (R15-7 .. R15-13) Agent Prompt

> **You are the Frontend / Onboarding agent.** Read this entire document before writing a single line of code. Your job is precisely scoped — finish the SyncUp onboarding stack per the Round 15 anchor rules (R15-7 through R15-13). The Welcome screen and Sign-Up Steps 1–6 already exist; you build the post-Step-6 tail (push permission gate → Friend-Find decision/matches/no-worries → "You're In"), the Friends-tab contacts-denied affordance (R15-11), and the first-run empty-state copy gating (R15-13). You do not invent behavior, you do not redesign anything, and you do not extend the spec.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified except for the surgical edits called out below:

| Already built | Where | Notes |
|---|---|---|
| Theme / Tokens | `src/theme/` | colors, typography, spacing, radii, motion, haptics, index |
| Component Library | `src/components/` | 63 components — `foundation/`, `polish/`, `eventFlow/`, `social/`, `profile/`, `emptyStates/` |
| AuthNavigator | `src/navigation/AuthNavigator.tsx` | native-stack with `Welcome`, `SignIn`, `SignUpStep1..6`, `ForgotPassword`, `ForgotPasswordConfirm` |
| Welcome + SignUpStep1..6 | `src/screens/auth/` | All six step screens and Welcome are wired and tsc-clean |
| ProgressDots, AuthInputField, InviteContextBanner | `src/components/foundation/` | Re-use, do NOT duplicate |
| EmptyHome, EmptyFriends, EmptyGroups | `src/components/emptyStates/` | These hold the *standard* copy — you add first-run copy via a variant prop or a wrapping selector (see R15-13 section below) |
| EmptyNotifications | inline inside `src/components/notifications/NotifSheet.tsx` (line ~567) | Standard copy already exists — you add first-run copy at this call site only |
| User.stats shape | `TYPES.ts` lines 116–121 | `{ hosted, attended, friends, groups }` — this is the source of truth for `isFirstRun` |
| API stub layer | `src/api/` | React Query hooks + `queryKeys`; profile/friends/events/availability all stubbed |

**Read these files before writing any code:**

- `ANCHOR-DESIGN.txt` (monorepo root) — full design spec, currently at **v3.5**. R15-7..R15-13 hard rules live at lines 163–391. The ONBOARDING SURFACE (Round 15) section starts at line 1276. The ONBOARDING HAPTICS — CONSOLIDATED (Round 15) table lives at line 1672.
- `CLAUDE.md` (monorepo root) — state management rules and non-negotiable hard rules.
- `FRONTEND-HANDOFF.txt` (monorepo root) — GAP 1 background context (Round 9 reference; R15 supersedes where they overlap).
- `social-calendar-mobile/src/screens/auth/WelcomeScreen.tsx` — entry point. Confirm CTAs route to `SignUpStep1` and `SignIn` (they do).
- `social-calendar-mobile/src/screens/auth/SignUpStep6Screen.tsx` — its "Continue" / "Skip for now" handlers are where the push-permission trigger fires (R15-9). You will modify the post-action navigation here.
- `social-calendar-mobile/src/navigation/AuthNavigator.tsx` — you will add the four new routes after `SignUpStep6`.
- `social-calendar-mobile/src/navigation/types.ts` — you add the new param-list entries.
- `social-calendar-mobile/src/navigation/RootNavigator.tsx` — confirm the auth-vs-app shell switching pattern; "You're In" → "Go" tap is what un-mounts the AuthStack and mounts the main shell.
- `social-calendar-mobile/src/components/emptyStates/EmptyHome.tsx`, `EmptyFriends.tsx`, `EmptyGroups.tsx` — note the existing prop shapes and copy maps. You'll add a `firstRun?: boolean` variant in a backwards-compatible way.
- `social-calendar-mobile/src/components/notifications/NotifSheet.tsx` — locate the `EmptyNotifications` inline function (~line 567) and the call site (~line 416). You wire first-run copy there.
- `social-calendar-mobile/src/api/profile.ts` (or the equivalent that exposes `useMe()`) — your `useIsFirstRun()` hook reads `User.stats` from here.
- `social-calendar-mobile/src/screens/friends/FriendsListScreen.tsx` — you will add the R15-11 contacts-denied affordance below the search bar.

---

## Non-Negotiable Contracts

These rules are locked. Do not deviate.

### 1. State management: React Query for cache, `useState` for local UI

```ts
// ✅ correct — server-derived data lives in React Query
const { data: me } = useMe(); // existing hook
const isFirstRun = useIsFirstRun(); // wraps useMe + applies R15-13 logic

// ✅ correct — local UI state (form fields, expand/collapse)
const [step, setStep] = useState<'decision' | 'noWorries' | 'matches'>('decision');

// ❌ wrong — there is NO Zustand in this project
const setUser = useUserStore(s => s.setUser); // NEVER
```

From `CLAUDE.md`:
- API response data → React Query. No exceptions.
- Local-only UI state → `useState` / `useReducer`.
- **There is no Zustand in this project. Do not add it.**

The onboarding stack's *form draft state* (credential, OTP code, name+handle in flight, etc.) already lives across the existing SignUpStepN screens via React Navigation params + screen-local `useState`. You do not change that pattern.

### 2. No hardcoded design values

Every color, font size, spacing value, border radius, and duration comes from `src/theme/`. No `#FFFFFF`, no `fontSize: 15`, no `borderRadius: 12` in any file you create.

### 3. Haptics via `useHaptic()` only

```ts
import { useHaptic } from '../../theme';
const fire = useHaptic();
fire('light'); // call ONCE per gesture
```

Never call `expo-haptics` directly. Never fire haptics on mount, scroll, or visual transitions (Hard Rules H-1, H-3). The full consolidated table for onboarding (ANCHOR line 1672) is reproduced in the "Haptic Map" section below; use it as the authoritative source when in doubt.

### 4. R15-7 through R15-13 are non-negotiable

These rules are Director-locked. Do not soften, extend, or "improve" them. Where this prompt and the anchor disagree, the **anchor wins**. Stop and escalate.

Specifically:
- **R15-7** — Onboarding flow order is locked. No inserted screens, no celebration between sign-up and friend-find. "You're In" is the ONLY celebratory beat.
- **R15-8** — Sign-Up Step 1 is one format-agnostic field. **Already implemented** — verify in `SignUpStep1Screen.tsx` and do not regress it.
- **R15-9** — Native iOS push prompt with no wrapper screen. Fires after Step 6 advances. You do NOT mount a SyncUp screen around it.
- **R15-10** — Friend-Find is a three-branch step. "Not now" and "Skip" go straight to "No worries" without triggering the system contacts prompt.
- **R15-11** — Contacts-denied affordance in Friends tab deep-links to Settings via `Linking.openSettings()`. Only renders when status === `denied`.
- **R15-12** — "You're In" is the last pre-app beat. No back arrow, no 6-dot indicator, success haptic with "Go" tap. "Go" mounts main shell.
- **R15-13** — First-run empty states apply to FOUR surfaces only (Home, Friends seg, Groups seg, Activity). One-way global transition the instant any `User.stats` counter becomes non-zero.

---

## Files to Create

Create only these files. Do not scaffold anything outside this list.

```
src/screens/auth/PushPermissionGateScreen.tsx        ← R15-9 trigger; fires native prompt then auto-advances
src/screens/auth/FriendFindDecisionScreen.tsx        ← R15-10 three-branch screen
src/screens/auth/FriendFindMatchesScreen.tsx         ← R15-10 matches list (granted path)
src/screens/auth/FriendFindNoWorriesScreen.tsx       ← R15-10 unified denial/skip destination
src/screens/auth/YoureInScreen.tsx                   ← R15-12 completion
src/screens/auth/onboarding/                         ← shared helpers folder
src/screens/auth/onboarding/useContactsMatches.ts    ← stub: contacts → hashed lookup → "is on SyncUp" result
src/screens/auth/onboarding/useIsFirstRun.ts         ← R15-13 derivation from User.stats
src/components/foundation/ContactsDeniedAffordance.tsx  ← R15-11 Friends-tab affordance

src/api/onboarding.ts                                ← stubs: contactsLookup(), sendFriendRequestFromMatches()
src/api/queryKeys.ts                                 ← MODIFY: add `onboarding.contactsMatches(hash)`
src/api/index.ts                                     ← MODIFY: re-export from onboarding.ts

src/screens/auth/SignUpStep6Screen.tsx               ← MODIFY: route to PushPermissionGate after Continue/Skip (not direct to main shell)
src/screens/auth/AvailabilityEditorOnboardingMode.tsx OR existing Step6 inline editor patch ← see R15-Step6 note below
src/navigation/AuthNavigator.tsx                     ← MODIFY: register the 4 new routes after SignUpStep6
src/navigation/types.ts                              ← MODIFY: add the 4 new route param entries + InviteContext type if missing
src/navigation/RootNavigator.tsx                     ← VERIFY: auth-shell un-mount triggers correctly when "Go" fires (no change expected; verify only)

src/screens/friends/FriendsListScreen.tsx            ← MODIFY: mount <ContactsDeniedAffordance/> below the search bar
src/screens/home/HomeScreen.tsx                      ← MODIFY: pass firstRun prop to <EmptyHome/> when useIsFirstRun() is true
src/screens/friends/FriendsListScreen.tsx            ← MODIFY: same for <EmptyFriends/>
src/screens/groups/GroupsListScreen.tsx              ← MODIFY: same for <EmptyGroups/>
src/components/emptyStates/EmptyHome.tsx             ← MODIFY: add firstRun variant (R15-13 locked copy)
src/components/emptyStates/EmptyFriends.tsx          ← MODIFY: same
src/components/emptyStates/EmptyGroups.tsx           ← MODIFY: same
src/components/notifications/NotifSheet.tsx         ← MODIFY: pass firstRun copy through to the inline EmptyNotifications function (R15-13)

src/screens/auth/AUTH_ONBOARDING_HANDOFF.md          ← write this LAST, after all code is done
```

> **Note on Step 6 inline Availability Editor (R15 spec):** Step 6 already renders an inline editor variant per the Round 15 ONBOARDING SURFACE spec. Verify the existing `SignUpStep6Screen.tsx` already disables the "Save as Quickset" affordance during onboarding. If it doesn't, add a `mode='onboarding'` prop to the underlying AvailabilityEditor that hides that pill — do not duplicate the whole editor. Flag in HANDOFF.

---

## Component Specifications

### `useIsFirstRun.ts` (R15-13)

```ts
import { useMe } from './profile'; // or wherever useMe lives — check src/api/index.ts

/**
 * R15-13: a user is "first-run" when ALL THREE counters are zero:
 *   User.stats.hosted   === 0
 *   User.stats.friends  === 0
 *   User.stats.groups   === 0
 *
 * The transition out of first-run is ONE-WAY and GLOBAL: the instant any
 * counter becomes non-zero, every R15-13 surface stops rendering first-run
 * copy. There is no persisted "first-run dismissed" flag — the derivation
 * is purely from User.stats, and React Query invalidation handles the
 * cross-surface refresh.
 *
 * Returns `false` while User is still loading (be conservative — avoid
 * flashing first-run copy to a returning user).
 */
export function useIsFirstRun(): boolean {
  const { data: me } = useMe();
  if (!me) return false;
  return me.stats.hosted === 0 && me.stats.friends === 0 && me.stats.groups === 0;
}
```

This hook MUST be a thin wrapper around React Query — it must not introduce any new client cache, store, or persisted flag.

---

### `PushPermissionGateScreen.tsx` (R15-9)

A near-invisible screen that fires the native iOS push permission prompt and auto-advances. **No SyncUp UI renders.** The screen mounts, fires the prompt, awaits resolution, and immediately pushes `FriendFindDecision` regardless of outcome.

**Anatomy:**
- Full-screen `<View>` with `backgroundColor: T.bg`
- Centered: nothing visible during the prompt. If the prompt resolution takes longer than expected (rare), render a `<Spinner size="md" />` centered after a 600ms delay. The spinner SHOULD NOT flash during the typical sub-300ms native prompt — only as a fallback if the OS is slow.

**Behaviour:**
1. On mount: call `Notifications.requestPermissionsAsync()` from `expo-notifications`. Add `expo-notifications` if not installed — flag in HANDOFF.
2. Await the promise; on resolve (grant OR deny — both treated identically per R15-9), call `navigation.replace('FriendFindDecision')`.
3. On error (unlikely on iOS), still `replace('FriendFindDecision')` — never block the user here.
4. NO haptic on either outcome (R15-9 explicit).
5. NO toast, no in-app warning.

**Edge case:** if the user previously granted/denied (this onboarding session was interrupted and resumed), `requestPermissionsAsync` resolves immediately with the existing status. Treat it as a normal resolution — silently advance.

**Props:**

```ts
export type PushPermissionGateProps = NativeStackScreenProps<
  AuthStackParamList,
  'PushPermissionGate'
>;
```

No params.

---

### `FriendFindDecisionScreen.tsx` (R15-10)

The three-branch decision screen. Renders the hero icon, heading, sub, and three CTAs. Each CTA routes per R15-10.

**Anatomy** (from the ONBOARDING SURFACE Round 15 section, line ~1496):

- No 6-dot indicator
- Back arrow returns to Step 6 (form state preserved per R9-3) — use `navigation.goBack()` but note that the user has already advanced past the push permission gate; going back should land on Step 6 with prior values intact. Implementation: use a navigation `popToTop` or `pop(2)` to skip the push gate during back navigation; the gate is `presentation: 'transparentModal'` with `gestureEnabled: false` so it never receives back-stack focus.

Actually — simpler approach: register `PushPermissionGate` with `animation: 'none'` and have it `replace` (not push) to `FriendFindDecision`. That way the back stack never contains the gate. **Use the `replace` approach.** Document this in HANDOFF.

- Hero icon: 56×56 view, `T.accentSoft` background, `radii.card` (16), users glyph (Ionicons `people-outline`) 24px `T.accent`, centered, 64px below safe-area top
- Heading: "Find friends from your contacts." `typography.h2` (22/800/-0.5), centered, 24px below hero, max-width 320
- Sub: "We'll match contacts who already have SyncUp. Nothing is uploaded." `typography.body` 13/500 `T.ink2`, centered, max-width 300, 12px below heading
- Spacer (`flex: 1`)
- CTA stack (14px horizontal margin, pinned above safe-area bottom):
  - `<PillBtn variant="primary">Find friends</PillBtn>` full-width
  - `<PillBtn variant="ghost">Not now</PillBtn>` full-width, 12px below primary
  - "Skip" 13/500 `T.ink3` text link, centered, 16px below ghost pill, hit area 44pt

**Branch behavior (R15-10):**
- "Find friends" → fire `light` haptic → `Contacts.requestPermissionsAsync()` from `expo-contacts` (install if needed, flag in HANDOFF):
  - granted → `navigation.replace('FriendFindMatches')`
  - denied → `navigation.replace('FriendFindNoWorries')`
- "Not now" → fire `light` haptic → `navigation.replace('FriendFindNoWorries')` (does NOT trigger system prompt)
- "Skip" → fire `light` haptic → `navigation.replace('FriendFindNoWorries')` (does NOT trigger system prompt)

The `replace` (vs. `push`) is critical: after the decision is resolved the user must not be able to return to the decision screen via back gesture, per the R15-10 implication that the next screens have no back arrow.

**A11y:**
- Hero icon: `accessibilityElementsHidden={true}`
- Heading: `accessibilityRole="header"`
- "Skip" text link: `accessibilityRole="button"` + `accessibilityLabel="Skip finding friends"`

---

### `FriendFindMatchesScreen.tsx` (R15-10)

Renders the contacts → matches list (granted path only). Two states: populated and zero-matches.

**Anatomy (populated)** — ANCHOR line 1537:

- No back arrow (decision has been resolved)
- Heading: "Friends already on SyncUp." `typography.h2`, left-aligned, 14px horizontal margin, 24px below safe-area top
- Sub: `"{N} of your contacts."` 13/500 `T.ink3`, left-aligned, 4px below heading. Omitted when N === 0 (zero-matches state below).
- ScrollView (or FlatList — prefer FlatList for performance) of match rows, 16px below sub
- "Continue" `<PillBtn variant="primary">` full-width, 14px horizontal margin, pinned above safe-area bottom, **always enabled**

**Row anatomy (R15-10):**
- 14px horizontal margin
- Row min-height 64
- `<RingAvatar size={40} status={null} />` — **NO status ring** (non-friends, per R12-6)
- Name 15/600 `T.ink`, 1-line ellipsis
- @handle mono 12/500 `T.ink3`, 1-line ellipsis, 2px below name
- "Add" `<PillBtn variant="primary" size="sm">` trailing
- 1px hair divider below each row

**Add interaction (mirrors R8-7):**
- Tap "Add" → fire `success` haptic immediately → call mutation
- On success: pill swaps to "Sent" `<PillBtn variant="ghost" size="sm" disabled>Sent</PillBtn>` (bgSunken / ink3 / non-interactive)
- On failure: revert pill to "Add"; render `<ErrorToast />` preset `'friend'` if toast infrastructure is wired, otherwise log a `// TODO: wire error toast from onboarding` comment and flag in HANDOFF
- **Row body tap: NO-OP** per R15-10 explicit ("QuickProfileSheet is NOT opened during onboarding"). No haptic. No nav.

**Zero-matches state (R15-10):**
- Replace the sub-line and the row list with an inline empty:
  - 56×56 `T.bgSunken` tile, `radii.card` (16), users glyph 24px `T.ink3`, centered, 96px below heading
  - "No one yet." 15/700 `T.ink`, centered, 12px below tile
  - "Friends will show up here once they join SyncUp." 13/500 `T.ink2`, centered, max-width 260, 6px below title
- "Continue" pill remains at the bottom, always enabled

**Sort order:** alphabetical by name, case-insensitive (`localeCompare`). This matches the OPEN QUESTIONS section of the anchor — Christian confirmed alphabetical.

**Data:** Use `useContactsMatches()` (your new hook in `src/screens/auth/onboarding/useContactsMatches.ts`):

```ts
/**
 * Stub-phase: returns 3–5 fake matches drawn from MOCK_USERS for development.
 * Production wire-in:
 *   1. Read contacts via Contacts.getContactsAsync()
 *   2. Hash phones + emails locally (SHA-256, lower-cased)
 *   3. POST hashes to /onboarding/contacts/lookup (returns matched users)
 *   4. NEVER upload raw contact data — only hashes (R15-10 explicit)
 *
 * For now the hook reads MOCK_USERS, filters to "not me", returns 5 random.
 */
export function useContactsMatches() {
  return useQuery({
    queryKey: queryKeys.onboarding.contactsMatches('stub'),
    queryFn: () => contactsLookup(),
    staleTime: 5 * 60 * 1000,
  });
}
```

Tap "Continue" → fire `light` haptic → `navigation.replace('YoureIn')`.

**A11y:**
- "Add" pill on each row: `accessibilityLabel={"Send friend request to " + name}`
- On Add → Sent transition: announce via `<A11yLive />` polite (A-26)

---

### `FriendFindNoWorriesScreen.tsx` (R15-10)

The unified denial/skip destination. All three "no" paths land here.

**Anatomy** — ANCHOR line 1521:

- **No back arrow** (the natural skip-exit; back would re-enter the Decision and confuse the user). Set `headerShown: false` on the route options and confirm `gestureEnabled: false` at the navigator level.
- Lime checkmark badge: 56×56, `T.limeFill` (or `T.lime` — check tokens), `radii.full` (999), white checkmark glyph 24px (Ionicons `checkmark`, color `T.bg` for contrast), centered, 64px below safe-area top
- Heading: "No worries." `typography.h2`, centered, 16px below badge
- Body: "You can add contacts permission anytime in Settings. For now, you can find friends by searching their @handle." 13/500 `T.ink2`, centered, max-width 320, 12px below heading
- Spacer (`flex: 1`)
- CTA: "Got it" `<PillBtn variant="ghost">` full-width, pinned above safe-area bottom

**Behavior:**
- Tap "Got it" → fire `light` haptic → `navigation.replace('YoureIn')`

---

### `YoureInScreen.tsx` (R15-12)

The final pre-app beat. No back arrow, no 6-dot indicator.

**Anatomy** — ANCHOR line 1579:

- 96px `<RingAvatar />` centered, 96px below safe-area top:
  - Photo source: user's Step 5 photo (read from form draft) if uploaded, else default initials avatar (accentSoft fill, accent text, 30/800 initials)
  - **NO status ring** (R15-12 explicit — not displayed here even if Step 6 completed)
  - Checkmark badge: 24×24, lime fill, `radii.full`, white checkmark glyph (Ionicons `checkmark`), 2px white border, docked bottom-right of avatar (absolute position: bottom: -4, right: -4)
- Heading: `"You're in, {FirstName}."` `typography.stepTitle` (24/800/-0.5), centered, 24px below avatar. `FirstName` = first word of display name from Step 3, trimmed.
- Sub: "Now go plan something." 15/500 `T.ink2`, centered, 8px below heading
- Spacer (`flex: 1`)
- CTA: "Go" `<PillBtn variant="primary">` full-width, 14px horizontal margin, pinned 32px above safe-area bottom

**"Go" routing (R15-12 / R9-8):**
```ts
function onGo() {
  fire('success'); // R15-12: ONE haptic only — not a sequence of light+success
  if (inviteContext) {
    // mount main shell + navigate to EventDetail for the invite
    completeOnboarding({ destination: 'EventDetail', eventId: inviteContext.eventId });
  } else {
    completeOnboarding({ destination: 'Home' });
  }
}
```

`completeOnboarding` is the function on `RootNavigator` (or a `useAuth()` context) that un-mounts `AuthNavigator` and mounts the main app shell. **Verify this hand-off path exists; if it doesn't, flag in HANDOFF rather than inventing it — Clerk integration (referenced in memory) will provide the real auth state. For the stub phase, leave a `// TODO(clerk-onboarding-complete)` comment at the wire point and have "Go" just `navigation.replace('Tabs')` (or whichever route mounts the main shell in dev).**

**Entrance animation:**
- Avatar + checkmark animate via the `flow-fade-up` keyframe (320ms spring, token-defined). Use `useSharedValue` + `withSpring` from `react-native-reanimated`.
- Reduced-motion fallback per A-11 / A-21: 200ms easeOut translate, no overshoot. Read the reduced-motion flag from the existing `useReducedMotion()` hook in `src/theme/` (or wherever it lives in the polish layer).

**Forbidden:**
- NEVER add a "Maybe later" or "Explore" alternate CTA (R15-12 explicit)
- NEVER auto-navigate from this screen — user must tap "Go" (R15-12 explicit)
- NEVER show a back arrow or 6-dot indicator (R15-12 explicit)

**A11y:**
- Root `accessibilityRole="dialog"` (final screen of the auth flow)
- "Go" pill is the first tab stop and the only interactive element

---

### `ContactsDeniedAffordance.tsx` (R15-11)

A small persistent affordance rendered in the Friends tab below the search bar when iOS Contacts permission status is `denied`.

**Anatomy** — ANCHOR line 263:

- Single-line text: "Find friends faster — Turn on contacts"
- 12/500 `T.ink3` base, "Turn on contacts" segment in `T.accent`
- Left-aligned, 8px below the FlowHeader search bar (or the screen's existing top spacing — adapt to FriendsListScreen's actual layout)
- 14px horizontal margin
- Tap target: ONLY the "Turn on contacts" phrase (a `<Pressable>` wrapping that span); the leading static text is non-interactive
- Hit area: 44pt minimum (use a wider invisible Pressable around the accent text)

**Behavior:**
- On tap: fire `light` haptic → call `Linking.openSettings()` from React Native
- App backgrounds; no in-app modal renders

**Render conditions (R15-11):**

| Contacts permission status | Affordance | Friends-tab empty-state CTA |
|---|---|---|
| `granted` | NOT rendered | standard "Add friends" |
| `not_determined` | NOT rendered | "Find friends from contacts" CTA that re-enters R15-10 Decision flow |
| `denied` | RENDERED | standard "Add friends" (denial state already surfaced by the affordance) |

**Permission status hook:**

You need a small hook that reads the current iOS contacts permission status. Use `Contacts.getPermissionsAsync()` from `expo-contacts`. Wrap it in:

```ts
// src/screens/auth/onboarding/useContactsPermissionStatus.ts
export function useContactsPermissionStatus(): 'granted' | 'denied' | 'not_determined' {
  const [status, setStatus] = useState<'granted' | 'denied' | 'not_determined'>('not_determined');
  useEffect(() => {
    let cancelled = false;
    Contacts.getPermissionsAsync().then(res => {
      if (cancelled) return;
      if (res.status === 'granted') setStatus('granted');
      else if (res.status === 'denied') setStatus('denied');
      else setStatus('not_determined');
    });
    return () => { cancelled = true; };
  }, []);
  return status;
}
```

This hook DOES NOT belong in React Query — it's a one-shot OS query, not a server fetch.

**Forbidden (R15-11):**
- NEVER deep-link to Settings without a prior failed permission attempt
- NEVER render the affordance permanently — it disappears the moment the user grants permission (re-derive on each FriendsList focus via `useFocusEffect`)

---

### First-Run Empty States (R15-13)

A user is first-run when ALL of `User.stats.hosted`, `User.stats.friends`, and `User.stats.groups` are 0. The transition out is one-way and global.

**Surfaces (4 total, locked):**

| Surface | Component | First-run title | First-run body | CTA (unchanged from standard) |
|---|---|---|---|---|
| Home | `EmptyHome` | `"Plan your first event."` | `"Tap + to start."` | `"Plan something"` |
| Friends seg | `EmptyFriends` | `"Find your first friend."` | `"Search by @handle or share your QR for them to scan."` | `"Add one"` + `"Share QR"` |
| Groups seg | `EmptyGroups` | `"Start a group for your regulars."` | `"Easier than tagging the same people every time."` | `"Create one"` |
| Activity (NotifSheet body) | inline `EmptyNotifications` in `NotifSheet.tsx` | `"Nothing yet."` | `"Add friends or plan an event to start seeing activity."` | NONE (EmptyNotifications NO-CTA lock unchanged) |

**Pattern — modify each emptyStates component:**

```ts
// Before
export interface EmptyHomeProps {
  T?: Theme;
  variant?: EmptyHomeVariant;
  onPlan?: () => void;
}

// After (backwards-compatible)
export interface EmptyHomeProps {
  T?: Theme;
  variant?: EmptyHomeVariant;
  /**
   * R15-13: when true, render the first-run copy variant instead of the
   * standard copy. Caller is responsible for deriving this from
   * useIsFirstRun(). The CTA does NOT change between standard and first-run.
   */
  firstRun?: boolean;
  onPlan?: () => void;
}

const FIRST_RUN_COPY = {
  headline: 'Plan your first event.',
  body: 'Tap + to start.',
} as const;

export function EmptyHome({
  T = colors.light,
  variant = 'today',
  firstRun = false,
  onPlan,
}: EmptyHomeProps): React.JSX.Element {
  const c = firstRun ? FIRST_RUN_COPY : COPY[variant];
  // ... rest unchanged
}
```

Apply the same pattern to `EmptyFriends` and `EmptyGroups`. The component anatomy must NOT change — only the title and body strings differ. The CTA stays whatever it was.

**For NotifSheet:** the inline `EmptyNotifications` function lives at ~line 567. Modify its props (or the call site at ~line 416) to receive `firstRun: boolean`. When `firstRun === true`, render the locked R15-13 copy ("Nothing yet." / "Add friends or plan an event to start seeing activity."). When false, render the existing standard copy. **Do not promote `EmptyNotifications` into its own file in this PR** — that's out of scope and would touch too much.

**Call-site wiring (3 screens + NotifSheet):**

```tsx
// HomeScreen.tsx
const isFirstRun = useIsFirstRun();
// ...
<EmptyHome T={T} variant={variant} firstRun={isFirstRun} onPlan={handlePlan} />

// FriendsListScreen.tsx
<EmptyFriends T={T} firstRun={isFirstRun} onAddOne={...} onShareQR={...} />

// GroupsListScreen.tsx
<EmptyGroups T={T} firstRun={isFirstRun} onCreate={...} />

// NotifSheet.tsx (at the call site ~line 416, NOT inside the inline fn)
const isFirstRun = useIsFirstRun();
<EmptyNotifications T={T} firstRun={isFirstRun} />
```

**Composition (R15-13 explicit):**
- Friends-tab contacts-denied affordance (R15-11) sits ABOVE the first-run `EmptyFriends`. Both render simultaneously when user is `denied` + first-run + has zero friends.
- AudiencePickerSheet zero-friend state (R13-4) is sheet-level and NOT first-run gated.

**Forbidden (R15-13 explicit):**
- NEVER add a separate nudge card, coachmark, modal, checklist, or overlay for first-run guidance
- NEVER modify the empty-state component anatomy — only copy differs
- NEVER apply first-run copy to Broadcast (always populated) or Profile (always populated)
- NEVER apply first-run copy to non-tab surfaces (Search overlay, AvailabilityEditor, AttendeesSheet, etc.)
- NEVER persist a "first-run dismissed" flag

---

## AuthNavigator + types Update

### `src/navigation/types.ts`

Add to `AuthStackParamList`:

```ts
export type AuthStackParamList = {
  // ... existing entries unchanged ...
  PushPermissionGate: undefined;
  FriendFindDecision: undefined;
  FriendFindMatches: undefined;
  FriendFindNoWorries: undefined;
  YoureIn: undefined;
};

export type PushPermissionGateProps = NativeStackScreenProps<AuthStackParamList, 'PushPermissionGate'>;
export type FriendFindDecisionProps  = NativeStackScreenProps<AuthStackParamList, 'FriendFindDecision'>;
export type FriendFindMatchesProps   = NativeStackScreenProps<AuthStackParamList, 'FriendFindMatches'>;
export type FriendFindNoWorriesProps = NativeStackScreenProps<AuthStackParamList, 'FriendFindNoWorries'>;
export type YoureInProps             = NativeStackScreenProps<AuthStackParamList, 'YoureIn'>;
```

If `InviteContext` type is not already defined (used by R9-8 invite-context branching), add it here:

```ts
export interface InviteContext {
  eventId: string;
  eventName: string;
  hostName: string;
}
```

### `src/navigation/AuthNavigator.tsx`

Register the four new screens AFTER `SignUpStep6`, in order:

```tsx
<Stack.Screen name="SignUpStep6" component={SignUpStep6Screen} />
<Stack.Screen
  name="PushPermissionGate"
  component={PushPermissionGateScreen}
  options={{ animation: 'none', gestureEnabled: false }}
/>
<Stack.Screen
  name="FriendFindDecision"
  component={FriendFindDecisionScreen}
  options={{ gestureEnabled: false }}
/>
<Stack.Screen
  name="FriendFindMatches"
  component={FriendFindMatchesScreen}
  options={{ gestureEnabled: false }}
/>
<Stack.Screen
  name="FriendFindNoWorries"
  component={FriendFindNoWorriesScreen}
  options={{ gestureEnabled: false }}
/>
<Stack.Screen
  name="YoureIn"
  component={YoureInScreen}
  options={{ gestureEnabled: false, animation: 'fade' }}
/>
```

**Why all `gestureEnabled: false` after Step 6:** these screens use `replace` between siblings; back-stack navigation would re-mount the push gate or the decision screen out of order. The existing `screenOptions` already sets `gestureEnabled: false` (verify in the current file) so these may be redundant — keep them for clarity.

### `src/screens/auth/SignUpStep6Screen.tsx` — surgical edit

Locate the Continue / Skip handlers. Change their navigation target from `Tabs` (or whatever mounts the main app shell) to:

```ts
function onContinue() {
  fire('light');
  // ... existing form persistence ...
  navigation.navigate('PushPermissionGate');
}

function onSkip() {
  fire('light');
  // ... existing skip persistence ...
  navigation.navigate('PushPermissionGate');
}
```

**Do not** remove the form-state persistence or the availability-editor logic — only redirect the post-Step-6 navigation.

---

## Onboarding API Stubs

### `src/api/queryKeys.ts` — add

```ts
export const queryKeys = {
  // ... existing entries unchanged ...
  onboarding: {
    contactsMatches: (hashKey: string) => ['onboarding', 'contactsMatches', hashKey] as const,
  },
} as const;
```

### `src/api/onboarding.ts` — new file

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { simulateLatency } from './_utils';
import { queryKeys } from './queryKeys';
import { MOCK_USERS } from '../mocks';

export interface ContactsMatch {
  id: string;
  name: string;
  handle: string;
  letter: string;
  photoUrl?: string | null;
  requestState: 'none' | 'sent';
}

/**
 * Stub-phase: returns the first 5 mock users (minus the local 'me' user)
 * as "matches". Production wire-in posts SHA-256 hashes of contact
 * phone numbers + emails to /onboarding/contacts/lookup (R15-10 explicit:
 * NEVER upload raw contact data).
 */
export async function contactsLookup(): Promise<ContactsMatch[]> {
  await simulateLatency();
  return MOCK_USERS
    .filter(u => u.id !== 'me')
    .slice(0, 5)
    .map(u => ({
      id: u.id,
      name: u.name,
      handle: u.handle,
      letter: u.letter,
      photoUrl: null,
      requestState: 'none' as const,
    }));
}

/**
 * Friend-request from the Matches list. Mirrors the mutation in the
 * standard Friends domain but lives here so the Matches screen doesn't
 * have to import from src/api/friends.ts and inherit unrelated invalidations.
 */
export function useSendFriendRequestFromMatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (personId: string) => {
      await simulateLatency();
      // 10% failure rate to exercise the error path during dev
      if (Math.random() < 0.1) throw new Error('Network error');
      return personId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.friends.requests() });
    },
  });
}
```

### `src/api/index.ts`

Add:

```ts
export * from './onboarding';
```

---

## Haptic Map (Lifted from ANCHOR · ONBOARDING HAPTICS CONSOLIDATED, line 1672)

You must fire exactly these — and only these — haptics:

| Event | Haptic | Where fired |
|---|---|---|
| Welcome "Create account" / "Log in" / legal-link tap | `light` | existing — verify unchanged |
| Primary CTA tap on Sign-Up Steps 1–6 | `light` | existing — verify unchanged |
| OTP auto-submit fire (R9-5) | `light` | existing |
| OTP "Change" link tap | `light` | existing |
| Handle availability check (taken or free) | NONE (visual only) | existing |
| Password requirement bullet checkmark fires | NONE (visual only) | existing |
| Photo selected | `light` | existing |
| "Find friends" CTA tap (BEFORE the system prompt) | `light` | `FriendFindDecisionScreen` |
| "Not now" / "Skip" CTA tap | `light` | `FriendFindDecisionScreen` |
| "Got it" on "No worries" | `light` | `FriendFindNoWorriesScreen` |
| Add friend on Matches List | `success` | `FriendFindMatchesScreen` |
| "Continue" on Matches List | `light` | `FriendFindMatchesScreen` |
| "Go" on "You're In" | `success` | `YoureInScreen` (ONE haptic — not light+success) |
| Sign-In "Log in" tap | `light` | existing |
| Sign-In "Forgot password?" tap | `light` | existing |
| Forgot-Password "Send reset link" | `light` | existing |
| Forgot-Password "Back to sign in" | `light` | existing |
| ContactsDeniedAffordance "Turn on contacts" tap | `light` | `ContactsDeniedAffordance` |

**Never** fire on:
- Push-prompt outcome (grant OR deny) — R15-9 explicit
- Matches-list row body tap — R15-10 explicit (it's a no-op)
- First-run empty-state render — these are not interactions
- Mount/unmount of any onboarding screen (H-3)
- Auto-navigation (e.g., PushPermissionGate → FriendFindDecision)

---

## A11y Checklist

| Element | Requirement |
|---|---|
| Onboarding screens root | `accessibilityRole="dialog"` where appropriate; back arrow first tab stop |
| PushPermissionGate | No focusable elements — it's a passthrough |
| FriendFindDecision heading | `accessibilityRole="header"` |
| Matches list "Add" pill | `accessibilityLabel={"Send friend request to " + name}`; transition to "Sent" announced via `<A11yLive />` polite (A-26) |
| Matches list zero-state | "No one yet." marked as `accessibilityRole="heading"` |
| YoureInScreen "Go" | `accessibilityLabel="Go to SyncUp"` |
| ContactsDeniedAffordance | "Turn on contacts" carries `accessibilityRole="button"` + `accessibilityHint="Opens iOS Settings"` |
| First-run empty states | Anatomy unchanged — existing A11y from EmptyStateBlock applies |

Reduced-motion handling (A-11, A-21) for the `flow-fade-up` keyframe on YoureInScreen: read `useReducedMotion()` and swap the spring for a 200ms easeOut translate. Backdrop animations are unaffected (there's no backdrop on YoureInScreen).

---

## Edge Cases — Apply Across Onboarding

- **Step 6 → Step 5 back gesture (R9-3):** Step 6 already preserves form state. Verify.
- **Push prompt previously resolved (interrupted session):** `requestPermissionsAsync` resolves instantly. Silently advance.
- **Contacts permission previously denied (FriendFindDecision "Find friends" tap):** the system prompt does NOT re-fire; `requestPermissionsAsync` resolves with the existing denied status. Treat as denied — route to NoWorries.
- **Contacts permission requires Settings change to grant:** if the user is in the `denied` state and taps "Find friends", we still call `requestPermissionsAsync` (it'll resolve with `denied` immediately). Do not invent a separate "go to Settings" path here — R15-11 handles that flow from inside the Friends tab after onboarding.
- **Zero matches on contacts lookup (granted but no SyncUp users):** render the inline EmptyState block from R15-10; "Continue" is always enabled.
- **InviteContext set + no InviteContextBanner on YoureInScreen:** correct — the banner is on Welcome and Step 6 only. "You're In" is the unified completion.
- **First-run boolean flips during Home/Friends/Groups view:** React Query revalidation on the underlying `useMe()` query causes a re-render with the new value. No additional wiring needed.

---

## What NOT to Build

- A SyncUp screen wrapping the push permission prompt (R15-9 explicit)
- A re-prompt path for push permission during onboarding (R15-9 explicit)
- A "Welcome to SyncUp" celebration between Step 6 and Friend-Find (R15-7 explicit)
- A "See full profile" or QuickProfileSheet trigger on Matches list rows (R15-10 explicit)
- A separate nudge card / coachmark / checklist for first-run guidance (R15-13 explicit)
- Any persisted "first-run dismissed" flag (R15-13 explicit)
- A new EmptyNotifications component file (modify in-place inside NotifSheet only)
- A new AvailabilityEditor variant — extend the existing one with a `mode='onboarding'` prop ONLY if "Save as Quickset" is not already hidden
- Any change to Zustand (there is none — do not introduce it)
- Any change to existing components in `src/components/foundation/`, `polish/`, `social/`, `profile/`, or `emptyStates/` beyond the surgical first-run prop addition on EmptyHome/EmptyFriends/EmptyGroups
- An "Onboarding Manager" wrapper component or React context — the existing AuthNavigator stack pattern is sufficient

---

## Verification Steps

Before writing `AUTH_ONBOARDING_HANDOFF.md`:

1. `cd social-calendar-mobile && npx tsc --noEmit` passes with zero errors.
2. Walk the flow on the simulator (or by reading): Welcome → SignUpStep1..6 → PushPermissionGate (transparent / no UI) → FriendFindDecision → (Find friends → Matches OR Not now/Skip → No worries) → YoureIn → "Go" → Tabs root.
3. Confirm AuthNavigator routes are registered in order, with `replace`-only transitions after Step 6 (no back stack).
4. Confirm Step 6 "Continue" / "Skip" both navigate to `PushPermissionGate`, NOT directly to Tabs.
5. Confirm the inline Availability Editor on Step 6 hides the "Save as Quickset" pill during onboarding.
6. Confirm FriendFindMatches "Continue" is ALWAYS enabled (adding zero is permitted, per R15-10).
7. Confirm FriendFindMatches row body tap is a no-op (no haptic, no nav).
8. Confirm "No worries" has NO back arrow.
9. Confirm YoureIn has NO back arrow and NO 6-dot indicator.
10. Confirm "Go" on YoureIn fires `success` haptic ONCE (not light+success).
11. Confirm ContactsDeniedAffordance renders only when status === `denied` in Friends tab; tapping "Turn on contacts" calls `Linking.openSettings()`.
12. Confirm first-run empty copy fires when `User.stats.{hosted,friends,groups}` are all 0; standard copy fires otherwise.
13. Confirm first-run transitions out the instant any stat counter is non-zero (e.g., after creating an event, EmptyHome no longer shows first-run copy — verify by mutating MOCK_ME.stats.hosted in dev).
14. Confirm Broadcast and Profile do NOT show first-run copy (they're populated surfaces — first-run does not apply).
15. Confirm NO Zustand introduced; no new client store; no persisted first-run flag.
16. Grep your created files for hardcoded `#` colors and bare `borderRadius:` numeric literals — every value should reference `colors.*` or `radii.*`.
17. Confirm `expo-notifications` and `expo-contacts` are listed in `package.json` (install if you had to add them; flag in HANDOFF).

---

## Handoff Document

When all code is done and `npx tsc --noEmit` passes clean, write `src/screens/auth/AUTH_ONBOARDING_HANDOFF.md`:

1. **What was built** — table of files, their role, and which R15 rule(s) they enforce (1 row per file)
2. **AuthNavigator state diagram** — ASCII flow from Welcome through "Go" landing on Tabs/EventDetail, with all branch points labelled with R15-N rule numbers
3. **R15 rule application** — for each of R15-7 through R15-13, one sentence describing where in the code the rule is enforced
4. **First-run derivation** — confirm `useIsFirstRun()` reads from `useMe()` only, no other state. Confirm transition is one-way and global.
5. **Haptic map applied** — table of (event → haptic → file:line) for new screens
6. **InviteContext branching** — describe how `InviteContext` flows from Welcome → Step 6 (`InviteContextBanner` already in place) → YoureIn ("Go" routes to EventDetail vs Home)
7. **Stub-phase deferrals** — list every `// TODO` left in code (Clerk onboarding-complete wire point, contacts hashing endpoint, error-toast wiring on Matches failure, etc.) and which agent or future work owns each
8. **Dependencies installed** — `expo-notifications`, `expo-contacts`, anything else
9. **Open items for the Lead Manager** — anything cross-section: the Clerk integration timing, the contacts hashing backend endpoint, the "Save as Quickset" availability-editor prop addition (if it required changes), the InviteContext capture flow before Welcome mounts
10. **Verification log** — confirm each of the 17 verification steps above passed

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors in `social-calendar-mobile/`
- [ ] PushPermissionGate fires native iOS prompt, NO SyncUp wrapper UI (R15-9)
- [ ] FriendFindDecision: 3 CTAs, "Not now" and "Skip" do NOT trigger system contacts prompt (R15-10)
- [ ] FriendFindMatches: row body tap is a no-op, "Add" pill is the only row action (R15-10)
- [ ] FriendFindMatches "Continue" always enabled (R15-10)
- [ ] FriendFindMatches zero-matches inline EmptyState renders correctly (R15-10)
- [ ] FriendFindNoWorries has NO back arrow (R15-10)
- [ ] YoureIn: NO back arrow, NO 6-dot indicator, success haptic ONCE on "Go" (R15-12)
- [ ] YoureIn "Go" branches by InviteContext: EventDetail vs Home (R9-8 / R15-12)
- [ ] Step 6 "Continue" / "Skip" both route to PushPermissionGate, NOT direct to Tabs
- [ ] ContactsDeniedAffordance renders only when status === `denied` (R15-11)
- [ ] ContactsDeniedAffordance tap fires `Linking.openSettings()` (R15-11)
- [ ] First-run empty copy applied to EmptyHome / EmptyFriends / EmptyGroups / EmptyNotifications (R15-13)
- [ ] First-run derivation is `User.stats.hosted === 0 && friends === 0 && groups === 0` (R15-13)
- [ ] First-run transitions out one-way, globally, on first non-zero stat (R15-13)
- [ ] First-run NOT applied to Broadcast, Profile, or non-tab surfaces (R15-13)
- [ ] All design values come from `src/theme/`; no hardcoded hex or px
- [ ] All haptics fire via `useHaptic()`; no direct `expo-haptics` imports
- [ ] API response data lives in React Query; local UI state via `useState`
- [ ] No Zustand introduced anywhere
- [ ] `AUTH_ONBOARDING_HANDOFF.md` written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker updated: Onboarding row → `COMPLETE (date)`

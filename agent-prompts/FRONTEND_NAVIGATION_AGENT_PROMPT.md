# Frontend — Navigation Setup Agent Prompt

> **You are the Frontend / Navigation Setup agent.** Read this entire document before writing a single line of code. Your job is to implement the full typed React Navigation structure for SyncUp. You do not build screens (they are placeholder stubs only), you do not fetch data, you do not write component logic.

---

## Context: What Has Already Been Built

You are working inside `social-calendar-mobile/`. The following is complete and must not be modified:

| Agent | Output | Key files |
|-------|--------|-----------|
| Theme / Tokens | Full token system | `src/theme/` |

**Read these files before writing any code:**
- `NAVIGATION.md` (monorepo root) — authoritative navigation structure produced by the Design Handoff Export agent. This defines every stack, every route, every param, and every transition.
- `ANCHOR.md` (monorepo root) — reference for any ambiguity in NAVIGATION.md, especially transition specs
- `TYPES.ts` (monorepo root) — data type definitions; route params reference these types

---

## Tech Stack

- React Navigation 6 (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`)
- TypeScript strict mode
- `react-native-screens` + `react-native-safe-area-context` (Expo managed)
- Transition configs from `src/theme/motion.ts`

---

## Non-Negotiable Contracts

### 1. All params are typed — no `any`
Every navigator must have a fully typed param list. Use `NativeStackScreenProps` and `BottomTabScreenProps` generics. Screens import their own props type from the navigation types file.

### 2. The "Create" tab is a modal trigger, not a tab screen
The center tab in the bottom tab bar opens the Create Event modal stack — it does not push a tab screen. This is a well-known React Navigation pattern: intercept the tab press and open a modal instead. The `CreateEventStack` is a modal navigator mounted at the root level.

### 3. Transition configs reference theme tokens
Do not hardcode `{ duration: 280 }` — use `durations.modalUp` from `src/theme/motion.ts`. Transition configs are the only place motion values are applied at the navigation level.

### 4. Stub screens are `<View>` placeholders only
This agent creates stub screen files so the navigator compiles. Each stub is a single-component file returning a plain `<View style={{ flex: 1 }} />`. The Screens agent will replace these with real implementations. Do not build any screen logic.

### 5. Type file lives at `src/navigation/types.ts`
All navigation type definitions (param lists, composite prop types) live in a single `types.ts` file. Every screen imports its props type from here — never from the navigator file directly.

---

## Files to Create

```
src/navigation/
  types.ts                    ← All param list types and screen prop types
  RootNavigator.tsx           ← Root navigator (tab + modal mounting)
  HomeStack.tsx               ← Home stack navigator
  CreateEventStack.tsx        ← Create Event modal stack
  FriendsStack.tsx            ← Friends stack navigator
  GroupsStack.tsx             ← Groups stack navigator
  ProfileStack.tsx            ← Profile stack navigator
  TabBar.tsx                  ← Custom bottom tab bar component
  NAVIGATION_HANDOFF.md       ← Written last

src/screens/                  ← Stub screen files only (real files come from Screens agent)
  home/HomeScreen.tsx
  events/EventDetailScreen.tsx
  create/Step1Screen.tsx
  create/Step2Screen.tsx
  create/Step3Screen.tsx
  create/ConfirmScreen.tsx
  friends/FriendsListScreen.tsx
  friends/AddFriendScreen.tsx
  friends/FriendProfileScreen.tsx
  friends/FriendTypesManagerScreen.tsx
  groups/GroupsListScreen.tsx
  groups/CreateGroupScreen.tsx
  groups/GroupDetailScreen.tsx
  groups/CoverPickerSheetScreen.tsx
  profile/ProfileSettingsScreen.tsx
  profile/AvailabilityEditorScreen.tsx
  profile/BroadcastSettingsScreen.tsx
  profile/AudiencePickerSheetScreen.tsx
```

---

## Navigation Structure

### Root Structure

```
RootNavigator
  ├── TabNavigator (BottomTabNavigator)
  │     ├── HomeStack (tab: Home)
  │     ├── CreateTab  ← intercepts press, opens CreateEventStack modal
  │     ├── FriendsStack (tab: Friends)
  │     ├── GroupsStack (tab: Groups)
  │     └── ProfileStack (tab: Profile)
  │
  └── CreateEventStack (modal, full-screen, mounted at root)
        ├── Step1
        ├── Step2
        └── Step3
              └── ConfirmScreen (pushed from Step3)
```

### Tab Bar

The tab bar has 5 tabs. The center tab (index 2, "Create") fires a navigation event to present the `CreateEventStack` modal rather than switching to a tab screen. Implement this using `tabPress` event listener in the custom `TabBar` component or via `listeners` on the tab.

Tab bar sits **above** the safe area bottom inset. `BroadcastToast` docks above the tab bar — tab bar height must be exported from `TabBar.tsx` as `TAB_BAR_HEIGHT` so toast components can calculate their `bottom` offset.

Tab bar visual spec (from ANCHOR):
- Background: `colors.bgElevated`
- Top border: `1px` `colors.hair`
- Active icon + label: `colors.accent`
- Inactive: `colors.ink3`
- Height: `TAB_BAR_HEIGHT = 83` (including safe area on iPhone)

### Stack Navigators

**HomeStack:**
```ts
type HomeStackParamList = {
  Home: undefined;
  EventDetail: { eventId: string };
};
```

**CreateEventStack (modal):**
```ts
type CreateEventStackParamList = {
  Step1: undefined;
  Step2: { draft: Draft };           // Draft from TYPES.ts
  Step3: { draft: Draft };
  Confirm: { eventId: string };
};
```
Transition: `presentation: 'fullScreenModal'`, duration `durations.modalUp`, `springSnappy` easing.

**FriendsStack:**
```ts
type FriendsStackParamList = {
  FriendsList: undefined;
  AddFriend: undefined;
  FriendProfile: { friendId: string };
  FriendTypesManager: undefined;
};
```

**GroupsStack:**
```ts
type GroupsStackParamList = {
  GroupsList: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string };
  CoverPickerSheet: { groupId: string };   // presented as modal sheet
};
```
`CoverPickerSheet` uses `presentation: 'containedModal'` or `'modal'` with sheet presentation.

**ProfileStack:**
```ts
type ProfileStackParamList = {
  ProfileSettings: undefined;
  AvailabilityEditor: undefined;
  BroadcastSettings: undefined;
  AudiencePickerSheet: {
    mode: 'types' | 'friends';
    selected: string[];
    onConfirm: (selected: string[]) => void;
  };
};
```
`AudiencePickerSheet` is a modal sheet. `onConfirm` callback pattern is acceptable in params for this case.

### Composite Props Type

Export a composite prop type for each screen so screens can type their own props cleanly:

```ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type HomeScreenProps       = NativeStackScreenProps<HomeStackParamList, 'Home'>;
export type EventDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'EventDetail'>;
// ... one per screen
```

---

## Custom Tab Bar (`TabBar.tsx`)

Build a custom tab bar using `tabBarStyle` / `tabBar` prop of the `BottomTabNavigator`. It must:
- Render 5 tabs with icon + label
- Center tab (Create) renders a `+` icon in an accent-colored circle (48×48, radius 999)
- Active state: accent icon + label
- Inactive state: ink3 icon + label
- Fires `light` haptic on tab change (Hard Rule haptic map: `light` = tab change)
- Respect safe area insets via `useSafeAreaInsets()`
- Export `TAB_BAR_HEIGHT` constant

Icons: use a single icon library consistently (recommend `@expo/vector-icons` with Ionicons or Feather — pick one and use it everywhere). Do not mix icon sets.

---

## Stub Screen Format

Each stub screen file must follow this exact template (Screens agent will replace the body):

```tsx
import React from 'react';
import { View } from 'react-native';
import type { HomeScreenProps } from '../../navigation/types';

// STUB — real implementation provided by Screens agent
export default function HomeScreen(_props: HomeScreenProps) {
  return <View style={{ flex: 1 }} />;
}
```

Use the correct props type for each screen. The stub must compile without TypeScript errors.

---

## Handoff Document

When all files are written and `npx tsc --noEmit` passes, write `src/navigation/NAVIGATION_HANDOFF.md`:

1. **What was built** — table of navigator files, stub screens, and the types file
2. **`TAB_BAR_HEIGHT` value** — document the exported constant so toast components know where to dock
3. **Create tab pattern** — document exactly how the modal is triggered from the center tab, so future agents don't break it
4. **Decisions made** — icon library chosen, any param shape decisions, presentation modes chosen for sheet routes
5. **Open items for Screens agent** — note that every stub in `src/screens/` is a placeholder; the Screens agent replaces them one by one

---

## Final Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `src/navigation/types.ts` exports param lists and screen prop types for every route
- [ ] Every stack navigator has a fully typed param list
- [ ] Create tab opens a modal, does not switch to a tab screen
- [ ] Custom tab bar exports `TAB_BAR_HEIGHT`
- [ ] Custom tab bar fires `light` haptic on tab change
- [ ] All stub screens compile with the correct props type from `types.ts`
- [ ] No screen logic in stub screens — `<View style={{ flex: 1 }} />` only
- [ ] `AudiencePickerSheet` and `CoverPickerSheet` are presented as modal sheets
- [ ] `NAVIGATION_HANDOFF.md` is written and complete
- [ ] `LEAD_MANAGER.md` Progress Tracker row for Navigation Setup → `COMPLETE (date)`

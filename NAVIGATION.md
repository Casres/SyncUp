# SyncUp — Navigation Structure

> Source: ANCHOR.pdf v2.5 (2026-04-27).
> Tab IA + Groups/Messages placement reconciled to the locked anchor (TAB BAR IA + R17) on 2026-06-03: Explore is a tab; Groups and Messages are segments of the Friends tab, not separate tabs.
> Convention: React Navigation route names are PascalCase.
> Token references map to `TOKENS.ts`. Type references map to `TYPES.ts`.

---

## Tab Navigator (Root)

5 slots (LEFT → RIGHT, locked TAB BAR IA): **Home** | **Explore** | **Create** (center, modal trigger) | **Friends** | **Profile**

- The "Create" slot does NOT push a tab screen — it opens the Create Event modal stack (`CreateEventStack`) full-screen.
- **Groups and Messages are NOT tabs** — they are the 2nd and 3rd segments of the Friends-tab SegmentedSwitcher (Friends · Groups · Messages, R17-1).
- Tab bar sits above the safe area bottom inset; `BroadcastToast` docks above it (`bottom: 24` from screen bottom).

| Tab | Screen / Behaviour |
|-----|--------------------|
| Home | `HomeStack` (initial: `Home`) |
| Explore | `ExploreStack` — internal screens not yet specced (forward placeholder; the tab slot is locked, routes finalize in a later round) |
| Create | Opens `CreateEventStack` modal — does not change selected tab visually (center slot) |
| Friends | `FriendsStack` (initial: `FriendsList`). FriendsList hosts a 3-way SegmentedSwitcher — **Friends · Groups · Messages** (R17-1); Groups and Messages live here, not as separate tabs. |
| Profile | `ProfileStack` (initial: `ProfileSettings`) |

---

## Stack Navigators

### HomeStack

| Route | Initial | Notes |
|-------|---------|-------|
| Home | yes | Today / Week / Month views (TabPills inside screen) |
| EventDetail | — | Pushed from Home feed item (or Group Detail Events tab) |
| EventChat | — | Event chat thread (host-enabled), pushed from EventDetail or an event-chat notif card (R17-12; route name non-normative, finalizes in R18) |

### CreateEventStack (modal, full-screen)

Presented modally above the active tab; swipe-down to dismiss.

| Route | Initial | Notes |
|-------|---------|-------|
| Step1 | yes | Basic info |
| Step2 | — | Pick a time (AvailabilitySummaryBar) |
| Step3 | — | Invite — banded availability viz; renders `Step3InviteWired` variant when `Draft.eventIso` is in the AvailabilityEntry map |
| Confirm | — | Success / Done |

### FriendsStack

Hosts the Friends tab's three segments (Friends · Groups · Messages, R17-1) plus every screen pushed from them. The former `GroupsStack` is folded in here.

| Route | Initial | Notes |
|-------|---------|-------|
| FriendsList | yes | Segmented host: **Friends** segment (friend list), **Groups** segment (group list — formerly the standalone `GroupsList` screen), **Messages** segment (inbox, R17-2) |
| AddFriend | — | QR / Link / Username (SegmentedSwitcher inside) |
| FriendProfile | — | Pushed from the Friends-segment row |
| FriendTypesManager | — | Reachable from Profile or Friend Profile |
| GroupsList | — | Now rendered as the **Groups segment** body of FriendsList; retained as a route name for the group-list view |
| CreateGroup | — | Pushed from the Groups-segment "+"; NO invite flow here (Hard Rule 10) |
| GroupDetail | — | Pushed from a Groups-segment card. TabPills: Members / Events / Polls / Ideas |
| CoverPickerSheet | — | Modal sheet within the group flow |
| MessageThread | — | DM/group thread, pushed from the Messages segment or a message notif card (R17-12; route name non-normative, finalizes in R18) |

> `GroupsStack` no longer exists — Groups is a segment of the Friends tab and its screens live in `FriendsStack` (locked TAB BAR IA + R17-1).

### ProfileStack

| Route | Initial | Notes |
|-------|---------|-------|
| ProfileSettings | yes | |
| AvailabilityEditor | — | Month / Week / Day modes inside |
| BroadcastSettings | — | 3-card stacked IA |
| AudiencePickerSheet | — | Modal sheet within Profile |

---

## Route Params

```ts
type RootTabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined; // internal screens not yet specced — forward placeholder
  CreateTab: undefined; // opens modal — never receives focus as a tab
  FriendsTab: undefined;
  ProfileTab: undefined;
};

type HomeStackParamList = {
  Home: undefined;
  EventDetail: { eventId: string };
  EventChat: { conversationId: string; eventId: string }; // R17-12 (route name non-normative)
};

type CreateEventStackParamList = {
  Step1: { prefilledInviteeIds?: string[]; prefilledIso?: string } | undefined;
  Step2: undefined;
  Step3: undefined; // reads Draft from context; renders wired variant when eventIso is in AvailabilityEntry
  Confirm: { eventId: string };
};

type FriendsStackParamList = {
  FriendsList: undefined; // hosts Friends · Groups · Messages segments (R17-1)
  AddFriend: { method?: AddFriendMethod } | undefined;
  FriendProfile: { friendId: string };
  FriendTypesManager: undefined;
  // Group screens — folded in from the former GroupsStack (Groups is a Friends-tab segment):
  GroupsList: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; tab?: GroupDetailTab };
  CoverPickerSheet: { selectedCoverId?: string };
  // Messaging thread (R17-12; route name non-normative, finalizes in R18):
  MessageThread: { conversationId: string; type: 'DIRECT' | 'GROUP' };
};

// GroupsStackParamList removed — Groups is a segment of the Friends tab; its screens are in FriendsStackParamList above.

type ProfileStackParamList = {
  ProfileSettings: undefined;
  AvailabilityEditor: { initialMode?: AvailabilityMode; focusIso?: string } | undefined;
  BroadcastSettings: undefined;
  AudiencePickerSheet: { mode: AudiencePickerMode; ruleState: AvailState };
};
```

Type references (`AddFriendMethod`, `GroupDetailTab`, `AvailabilityMode`, `AudiencePickerMode`, `AvailState`) are exported from `TYPES.ts`.

---

## Navigation Actions

Cross-screen events from the ANCHOR navigation graph (Round 4 + earlier rounds). Each row: trigger → destination → animation.

### Home / Event Flow

| Trigger | Destination | Animation |
|---------|-------------|-----------|
| Home feed row tap | EventDetail | step push (240ms easeStd) |
| "+" / Create tab tap | CreateEventStack > Step1 | modal up (280ms spring) |
| Step1 "Next" | Step2 | step push |
| Step2 "Next" | Step3 | step push |
| Step3 "Send invites" success | Confirm | step push |
| Confirm "Done" | dismiss modal stack | modal down |
| Confirm "View event" | dismiss modal, push EventDetail on previous stack | modal down + step push |
| EventDetail RSVP tap | RSVPSheet | sheet up (280ms spring · rubber-band @100px) |
| Step3 wire-back danger banner tap | AvailabilityEditor (focus the day) | step push (cross-stack via root) |

### Friends

| Trigger | Destination | Animation |
|---------|-------------|-----------|
| FriendsList row tap | FriendProfile | step push |
| FriendsList "+" tap | AddFriend | step push |
| Profile entry "Friend types" | FriendTypesManager | step push |
| FriendProfile "Plan together" | CreateEventStack > Step1 (prefilled) | modal up |

### Groups (Friends tab · Groups segment)

> All Groups screens live in `FriendsStack`, reached via the **Groups segment** of FriendsList (locked TAB BAR IA + R17-1). Pushes below are within-stack pushes from that segment.

| Trigger | Destination | Animation |
|---------|-------------|-----------|
| Groups-segment card tap | GroupDetail | step push |
| Groups-segment "+" tap | CreateGroup | step push |
| CreateGroup CoverArt picker | CoverPickerSheet | sheet up (280ms spring) |
| CreateGroup "Create" success | GroupDetail (replace) | step push |
| GroupDetail Members row (other user) | FriendProfile (cross-stack via root) | step push |
| GroupDetail Events row | EventDetail (cross-stack via root) | step push |
| AdminBar "Invite" | invite picker (in-screen overlay using AdminInviteRow) | sheet up |

### Profile / Availability / Broadcasts

| Trigger | Destination | Animation |
|---------|-------------|-----------|
| ProfileSettings → "Availability editor" | AvailabilityEditor | step push |
| ProfileSettings → "Broadcast settings" | BroadcastSettings | step push |
| AvailabilityEditor 38px broadcast shortcut (radio icon) | BroadcastSettings | step push |
| AvailabilityEditor back | ProfileSettings | step pop |
| BroadcastSettings card sheet preview row | AudiencePickerSheet | sheet up (280ms spring) |
| BroadcastSettings "Preview toast" | fires `BroadcastToast` (no nav) | toast fade-up (320ms spring) |
| BroadcastSettings back | caller (ProfileSettings or AvailabilityEditor) | step pop |
| AudiencePickerSheet "Done" | dismiss sheet | sheet down |

### Wire-Back (data flow, not navigation push)

```
[AvailabilityEditor].avail map ────▶ [Step 3 Invite] (Create flow)
  · busy on event day → danger banner appears (haptic: warning)
  · free/maybe on day → subtle status overline + AvailDot
```

---

## Transition Specs

Anchored motion values from the ANCHOR motion table (see `TOKENS.ts > MOTION`):

| Transition Type | Duration | Curve | Notes |
|-----------------|---------:|-------|-------|
| Tap / press feedback | 200ms | easeOut | UI affordance, not nav |
| Step push (Step 1→2→3, generic stack push) | 240ms | easeStd | Material-style standard |
| Sheet up (RSVP, Cover, Audience picker) | 280ms | spring | Rubber-band @100px overscroll |
| Modal up (CreateEventStack) | 280ms | spring | Swipe-down to close |
| Broadcast card open (in-screen accordion) | 320ms | spring | flow-fade-up |
| Toast fade-up (Broadcast / Error) | 320ms | spring | Auto-dismiss 3200ms |
| Stagger list entrance | 320ms | spring | 30ms/item, base 60ms, cap 12 |
| Long-press arm | 450ms | linear | Chip carousel, RSVP pill |
| Spinner rotation | 900ms | linear | su-spin loop |
| Day-cell drag-paint | 0ms (instant) | — | 1:1 finger tracking (haptic: light per enter) |
| Parallax / scroll-bound transforms | FORBIDDEN | — | Hard Rule R5-3 (motion-sickness rule) |

### Reduced-motion overrides (A-11)

Honor `prefers-reduced-motion`:
- Disable spring overshoot (use easeOut equivalent at same duration).
- Replace `flow-fade-up` with simple opacity fade (200ms easeOut).
- Disable stagger (render all-at-once).
- Keep spinner rotation (it's the only loading affordance).

---

## Modal vs Push vs Sheet — Decision Tree

| Surface kind | When | Animation |
|--------------|------|-----------|
| Modal (full-screen) | Create Event Flow only | modal up 280ms spring; swipe-down to dismiss |
| Stack push | Within a tab's stack (e.g. ProfileSettings → AvailabilityEditor) | step push 240ms easeStd |
| Sheet (bottom) | RSVPSheet, CoverPickerSheet, AudiencePickerSheet | sheet up 280ms spring; rubber-band @100px; grab handle 38×4 |
| Cross-stack | E.g. GroupDetail Events → EventDetail | Root navigator switches tab + pushes; transition: step push |
| In-screen accordion | Broadcast card OFF→ON | flow-fade-up 320ms spring |
| Toast | BroadcastToast / ErrorToast | flow-fade-up 320ms spring; auto-dismiss 3200ms |

---

## Deep Links

Not specified in ANCHOR. Deferred to a later round.

When implemented, suggested mapping:
- `syncup://event/:eventId` → EventDetail (HomeStack)
- `syncup://friend/:friendId` → FriendProfile (FriendsStack)
- `syncup://group/:groupId` → GroupDetail (FriendsStack · Groups segment)
- `syncup://invite/:inviteCode` → AddFriend with `method='link'` prefilled

These are placeholders — confirm with Director before implementation.

---

## Tab Bar Behaviour

- **Always visible** on top-level routes (Home, FriendsList, ProfileSettings; Explore once specced). The group list is no longer a top-level route — it is the Groups segment of FriendsList.
- **Hidden** during the Create Event modal stack (full-screen modal).
- **Optionally hidden** during deep-stack screens (e.g. EventDetail, FriendProfile) — implementation choice; ANCHOR doesn't mandate. Default: keep visible to preserve quick tab switching.
- **BroadcastToast docks above tab bar** (`bottom: 24` from screen bottom) regardless of which tab is active.
- **OfflineBar** slides down from `FlowHeader`, sits below safe-area top inset.

---

## Navigation Hard Rules (cross-cutting)

| Rule | Behaviour |
|------|-----------|
| Hard Rule 1 | Step 3 always renders the banded availability viz — wire-back variant only adds a banner ABOVE the banded list, never replaces it. |
| Hard Rule 7 | Destructive actions use `TwoTapDestructive` in-screen — never push a confirm modal. (Log out is the single-row exception in ProfileSettings.) |
| Hard Rule 9 | AdminBar always rendered on GroupDetail when `userRole === 'admin'`. Open question: collapse-on-scroll deferred. |
| Hard Rule 10 | Invite flow only lives in GroupDetail > AdminBar. CreateGroup MUST NOT include invite UI. |
| Hard Rule 17 | Step3Wired danger banner gets `role="alert"` to announce on mount; warning haptic fires with banner appearance. |
| H-3 | Auto-fired toasts (e.g. inbound broadcast received) MUST NOT trigger haptics. |

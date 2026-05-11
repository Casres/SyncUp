# Claude Code — GAP 6 + Docker Round-Trip
# SyncUp · Generated 2026-05-10
# Run this in the social-calendar-mobile/ directory (mobile) OR repo root (Docker).
# Complete both phases in order. Do not skip steps or mark done until tested.
================================================================

## MANDATORY PRE-FLIGHT — READ EVERY FILE LISTED BEFORE WRITING CODE

Read these files in full before touching a single line of code.
No exceptions, no skipping. They contain locking rules that override
any defaults or conventions you would otherwise apply.

  ANCHOR-DESIGN.txt                      (repo root)
  FRONTEND-HANDOFF.txt                   (repo root)
  SPEC-R12-NotifRouting.txt              (repo root)
  social-calendar-mobile/src/navigation/types.ts
  social-calendar-mobile/src/navigation/RootNavigator.tsx
  social-calendar-mobile/src/navigation/TabBar.tsx
  social-calendar-mobile/src/navigation/NAVIGATION_HANDOFF.md
  social-calendar-mobile/src/screens/home/HomeScreen.tsx
  social-calendar-mobile/src/mocks/notifications.ts
  social-calendar-mobile/src/theme/colors.ts
  social-calendar-mobile/src/theme/motion.ts
  social-calendar-mobile/src/theme/haptics.ts
  social-calendar-mobile/src/components/social/TwoTapDestructive.tsx
  social-calendar-mobile/src/components/polish/OfflineBar.tsx
  social-calendar-mobile/src/components/foundation/   (list + read key files)
  TYPES.ts                               (repo root)

Do not ask for clarification on any of the above. Read them silently
and proceed. If a file is missing, note it inline and continue.

================================================================
## CRITICAL PRE-BUILD NOTE — TAB BAR DISCREPANCY
================================================================

The current TabBar and RootNavigator implement this order:
  Home | Explore | [Create +] | Friends | Profile

The locked spec (ANCHOR R6-6, FRONTEND-HANDOFF) defines:
  Home | Broadcast | Activity (bell → NotifSheet) | Friends | Profile

These conflict. DO NOT silently pick one or restructure the tab bar
without flagging it. Your job here is:

  1. DO NOT change the existing tab order or tab names. Hard Rule 23
     locks the order — and even if the current order is wrong, you
     must not break working navigation in the same PR as GAP 6.

  2. Mount NotifSheet as a ROOT-LEVEL OVERLAY (not a tab screen). It
     renders above all tabs and the tab bar. Use a React context
     (NotifSheetContext) with openPeek(), openFull(), and dismiss()
     so any screen or the TabBar can control it without prop-drilling.

  3. Wire two entry points for this build:
       a. PULL-FROM-HOME: existing HomeScreen already has a
          pull-to-reveal pattern. Wire downward pan gesture on the
          home screen body → openPeek().
       b. BELL ICON in FlowHeader on HomeScreen: add a bell icon
          (Ionicons "notifications-outline" / "notifications") to the
          right slot of FlowHeader on HomeScreen. Tap → openFull().
          This is a TEMPORARY entry point. Comment it clearly:
          // TODO: Replace with ActivityTab press once tab order
          // is reconciled with ANCHOR R6-6.

  4. Leave a clearly commented block in RootNavigator.tsx:
     // DESIGN DISCREPANCY (2026-05-10): ANCHOR R6-6 specifies tab
     // order Home·Broadcast·Activity·Friends·Profile. Current impl
     // has Home·Explore·Create·Friends·Profile. The ActivityTab
     // (bell → NotifSheet) is not wired to a tab yet. NotifSheet
     // is currently accessible via HomeScreen FlowHeader bell icon
     // (pull-from-home + bell tap). Reconciling the tab order is a
     // separate task — do not combine with GAP 6.

================================================================
## PHASE 1 — GAP 6: NOTIFSHEET + CARDS + NAV WIRING
================================================================

The FRONTEND-HANDOFF says "notification cards already exist." They do
not. Only src/mocks/notifications.ts exists (empty placeholder). You
must build everything from scratch. Work in this exact order.

────────────────────────────────────────────────────────────────
STEP 1 — NOTIFICATION TYPE DEFINITIONS
────────────────────────────────────────────────────────────────

File: TYPES.ts (repo root) — ADD to existing file. Do not replace it.

Add a NotifType union and a typed interface per card kind. The shape
must cover everything the cards below need to render. Minimum:

  type NotifType =
    | 'rsvp'
    | 'event_reminder'
    | 'co_host'
    | 'co_host_revoked'
    | 'group_activity'
    | 'inbound_broadcast'
    | 'friend_request'
    | 'group_invite';

  interface BaseNotif {
    id: string;
    type: NotifType;
    read: boolean;
    createdAt: string;   // ISO-8601
  }

  interface RsvpNotif extends BaseNotif {
    type: 'rsvp';
    actorName: string;
    actorHandle: string;
    actorAvatar: string | null;
    eventId: string;
    eventName: string;
    rsvpStatus: 'going' | 'maybe' | 'not_going';
  }

  // … and so on for each card type. Model the fields from the card
  // content described in the ANCHOR component notes and from the
  // SPEC-R12-NotifRouting.txt card table. Do not guess — derive
  // fields from what each card actually needs to render.

  type Notif =
    | RsvpNotif
    | EventReminderNotif
    | CoHostNotif
    | CoHostRevokedNotif
    | GroupActivityNotif
    | InboundBroadcastNotif
    | FriendRequestNotif
    | GroupInviteNotif;

Also add RSVPStatus if not already present:
  type RSVPStatus = 'going' | 'maybe' | 'not_going' | 'no_response';

────────────────────────────────────────────────────────────────
STEP 2 — NOTIFICATION SEED DATA
────────────────────────────────────────────────────────────────

File: src/mocks/notifications.ts

Populate MOCK_NOTIFICATIONS with realistic seed data:
  - At least 2 RsvpNotif (different rsvpStatus values)
  - 1 EventReminderNotif
  - 1 CoHostNotif
  - 1 CoHostRevokedNotif (informational, no nav)
  - 1 GroupActivityNotif
  - 1 InboundBroadcastNotif
  - 1 FriendRequestNotif (pending, not yet accepted)
  - 1 GroupInviteNotif

Spread createdAt values across: today, yesterday, 3 days ago, 8 days
ago (to exercise TODAY / YESTERDAY / named-day / EARLIER grouping
per R6-7). Use real-looking names and handles. IDs must be valid
UUID strings (use crypto.randomUUID() pattern or hardcoded UUIDs).

────────────────────────────────────────────────────────────────
STEP 3 — NOTIFICATION CARD COMPONENTS
────────────────────────────────────────────────────────────────

Directory: src/components/notifications/
Create this directory. Build one file per card plus shared pieces.

SHARED PIECES (build first):

  NotifGroupHeader.tsx
    Props: label: string (e.g. "TODAY", "YESTERDAY", "TUE APR 22", "EARLIER")
    Style: overline 9/600 mono · ink3 · 12px top + 4px bottom padding ·
           16px horizontal. Same overline style as the rest of the app.

  RSVPBadge.tsx (if not already in components/social/)
    Pill · 11/600 · radius 999 · 6×10 padding
    Going      → limeSoft fill · limeInk text
    Maybe      → accentSoft fill · accent text
    Not going  → popSoft fill · popInk text
    No response→ bgSunken fill · ink3 text

  SwipeableRow.tsx
    Wraps a child with react-native-gesture-handler Swipeable.
    Left swipe reveals: Mute (bgSunken tile) + Dismiss (danger tile).
    Used by all cards except FriendRequestCard and GroupInviteCard
    (in-place action cards don't need swipe-to-dismiss).
    Dismiss fires `warning` haptic. Mute fires `light` haptic.

CARD COMPONENTS:

All cards share this layout contract:
  - Min-height 64px · 16px horizontal padding · 12px vertical padding
  - RingAvatar 40px left (with status ring ONLY if actor is a friend;
    non-friend actors get no status ring — R12-6)
  - Right side: content column
  - Row tap (where navigable): fires haptic THEN calls onNavigate

Build these files:

  RsvpCard.tsx
    Props: notif: RsvpNotif · onNavigate(eventId: string): void · onRead(): void
    Content: "{actorName} {rsvpStatus-label} to {eventName}"
    Sub: relative time (e.g. "2h ago")
    Trailing: chevron-forward 16px ink3
    Full row is tappable → onNavigate(eventId). Medium haptic at tap.
    onRead() called at tap moment (before navigation).
    SwipeableRow wrapper.

  EventReminderCard.tsx
    Props: notif: EventReminderNotif · onNavigate(eventId: string): void · onRead(): void
    Content: "{eventName} is coming up" or similar reminder copy
    No actor avatar — use a calendar icon tile (40×40 accentSoft · radius 12)
    Trailing: chevron-forward 16px ink3
    Full row tappable → onNavigate(eventId). Medium haptic at tap.
    SwipeableRow wrapper.

  CoHostCard.tsx
    Props: notif: CoHostNotif · onNavigate(eventId: string): void · onRead(): void
    Content: "{actorName} made you a co-host of {eventName}"
    Trailing: chevron-forward 16px ink3
    Full row tappable → onNavigate(eventId). Medium haptic.
    SwipeableRow wrapper.

  CoHostRevokedCard.tsx
    Props: notif: CoHostRevokedNotif · onRead(): void
    Content: "{actorName} removed you as co-host of {eventName}"
    NO trailing chevron. NO navigation. Informational only.
    SwipeableRow wrapper.
    Tap on row → onRead() only (light haptic). No navigation.

  GroupActivityCard.tsx
    Props: notif: GroupActivityNotif
           onNavigate(groupId: string, switchToGroupsSegment: boolean): void
           onRead(): void
    Content: activity description for the group
    Full row tappable → onNavigate(groupId, true). Medium haptic.
    SwipeableRow wrapper.

  InboundBroadcastCard.tsx
    Props: notif: InboundBroadcastNotif
           onNavigateFriendProfile(friendId: string): void
           onNavigateCreateEvent(friendId: string, friendName: string): void
           onRead(): void
    Content: broadcast message from {actorName}
    CTA pill: "Plan something" accent pill — medium haptic, opens Create
    Row body tap → onNavigateFriendProfile(). LIGHT haptic (already locked).
    R6-4 stack: if multiple broadcasts from same sender within 60 min,
      show "+N earlier" expandable pill. For now, build the single-card
      layout; stub the stacking with a comment // R6-4: stack per sender.
    SwipeableRow wrapper.

  FriendRequestCard.tsx
    Props: notif: FriendRequestNotif
           onAccept(): void
           onDecline(): void
           offline: boolean
    Content: "{actorName} wants to be friends"
    Two-up CTA: "Accept" accent pill + "Decline" ghost pill.
    "Decline" is TwoTapDestructive (light haptic arm + commit).
    When offline=true: both pills opacity 0.4 + pointerEvents='none'.
    NO navigation. NO SwipeableRow. In-place actions only.
    Sheet does NOT dismiss on Accept or Decline.

  GroupInviteCard.tsx
    Props: notif: GroupInviteNotif
           onJoin(): void
           onDecline(): void
           offline: boolean
    Content: "{actorName} invited you to {groupName}"
    Two-up CTA: "Join" accent pill + "Decline" ghost pill.
    "Decline" is TwoTapDestructive (light haptic arm + commit).
    When offline=true: both pills opacity 0.4 + pointerEvents='none'.
    NO navigation. NO SwipeableRow. In-place actions only.

  index.ts — re-export all of the above.

────────────────────────────────────────────────────────────────
STEP 4 — NOTIFSHEET CONTEXT PROVIDER
────────────────────────────────────────────────────────────────

File: src/components/notifications/NotifSheetContext.tsx

Create a React context that exposes:
  interface NotifSheetContextValue {
    openPeek: () => void;   // open at 44% (pull-from-home)
    openFull: () => void;   // open at 88% (activity-tab-tap)
    dismiss: () => void;    // close with animation
    isOpen: boolean;
  }

Use a Reanimated shared value for the sheet translateY position.
Expose the shared value via context so NotifSheet can animate.
Detents (as percentage of screen height):
  PEEK_DETENT = 0.44   → translateY = screenHeight * (1 - 0.44)
  FULL_DETENT = 0.88   → translateY = screenHeight * (1 - 0.88)
  CLOSED      = 1.0    → translateY = screenHeight

Mount the provider in RootNavigator.tsx (wrap the RootStack.Navigator
so all screens have context access):
  <NotifSheetProvider>
    <RootStack.Navigator …>
      …
    </RootStack.Navigator>
    <NotifSheet />   {/* rendered ABOVE navigator, inside provider */}
  </NotifSheetProvider>

────────────────────────────────────────────────────────────────
STEP 5 — NOTIFSHEET COMPONENT
────────────────────────────────────────────────────────────────

File: src/components/notifications/NotifSheet.tsx

This is the main sheet. Build it fully to spec before wiring navigation.

SHEET STRUCTURE:

  Backdrop (Animated.View behind sheet):
    Absolute full-screen. Black with opacity interpolated from sheet
    position: closed → 0, peek → 0.30, full → 0.42.
    Tap backdrop → dismiss(). Fires light haptic.
    pointerEvents: 'box-only' when open, 'none' when closed.

  Sheet (Animated.View):
    Position: absolute. Bottom: 0. Width: 100%.
    Height: 88% of screen height (covers full detent).
    translateY controlled by Reanimated shared value.
    Border radius: 22 22 0 0.
    Background: colors.bgElevated.
    Shadow: 0 -4px 24px rgba(0,0,0,0.12).

  Grab handle:
    38×4px · bgSunken · radius 2 · centered · 8px below top edge.
    44pt vertical hit area (use padding, not just the visual pill).
    Drag on handle → Phase B gesture (STEP 6).

  Header (non-scrollable, 56px):
    Title: "Activity" · 17/800 · left-aligned · 16px leading.
    "Mark all read" ghost pill · trailing-right of title area.
    "Clear all" ghost pill · rightmost.
    Both pills: tap → respective action + haptic (see below).
    "Mark all read" → success haptic.
    "Clear all"     → warning haptic + A11yLive.announce("Activity cleared").
    After "Clear all": feed clears → EmptyNotifications renders.
    Divider: 1px hair below header.

  Offline state (R13-2):
    When offline=true:
      OfflineBar renders immediately BELOW the header divider, ABOVE
      the first NotifGroupHeader.
      Below OfflineBar: mono 10/600 ink3 sub-line:
        "SYNCED {T} AGO" where T = relative time of last successful
        feed fetch. Omit this line if last sync time is unavailable.
      FriendRequestCard and GroupInviteCard render with offline=true.
      InboundBroadcastCard "Plan something" renders disabled
        (opacity 0.4, pointerEvents='none').
      Local actions (swipe-to-dismiss, Mark all read, Clear all)
        remain fully interactive.
    On reconnect: OfflineBar slides out. Feed invalidates via React
      Query. New items animate in via StaggerList.

  Feed (ScrollView):
    Grouped by day per R6-7:
      TODAY · YESTERDAY · "TUE APR 22" (day-name for ≤7 days) · EARLIER
    Each group: NotifGroupHeader + card list.
    30-day purge: on sheet open, remove any notif where
      createdAt < now - 30 days. Silent, no toast, no haptic.
    StaggerList entrance on initial load.
    Empty state: EmptyNotifications component (build a minimal inline
      version if it doesn't exist: bell-slash icon tile + "No activity"
      13/500 ink2).

  Loading state: 40px Spinner centered when data is fetching.
    Spinner only — no skeleton, no shimmer (R5-2).

DATA: Use React Query. Create src/api/notifications.ts with:
  - queryKey: ['notifications']
  - queryFn: returns MOCK_NOTIFICATIONS for now (will swap for real
    API endpoint later). Annotate: // TODO: replace with real endpoint.
  - staleTime: 60_000 (1 minute)
  Hook: useNotifications() returning { data, isLoading, error, refetch }.

────────────────────────────────────────────────────────────────
STEP 6 — DRAG GESTURE (PHASE B)
────────────────────────────────────────────────────────────────

Wire the grab handle drag using react-native-gesture-handler PanGesture.

Phase B rules (inter-detent, from ANCHOR R13-1):
  Velocity-first (|velocity| ≥ 0.7px/ms at release):
    Downward ≥ 0.7 from full  → snap to peek.
    Downward ≥ 1.2 from full  → snap to closed (skip peek).
    Downward ≥ 0.7 from peek  → snap to closed.
    Upward   ≥ 0.7 from peek  → snap to full.
    Upward   ≥ 0.7 from full  → rubber-band 12px, spring back to full.
  Displacement fallback (|velocity| < 0.7px/ms):
    From peek: down >40px → close; up >40px → full.
    From full: down >80px → peek; down >200px → close.
    Inside thresholds → spring back to current detent.

Snap animation:
  withSpring using cubic-bezier(0.34,1.56,0.64,1) approximation.
  Use springs.spring from src/theme/motion.ts.
  Duration envelope ~320ms.
  Haptic fires at snap moment (not at pointer-up). Use fire('light').
  Backdrop crossfades 280ms easeStd in lockstep.

Reduced-motion fallback:
  Check AccessibilityInfo.isReduceMotionEnabled().
  If true: snap = withTiming 200ms easings.easeOut (no spring).
  Backdrop: instant at release.
  NEVER suppress 1:1 live tracking.

Phase A (closed → peek via pull-from-home) is wired in STEP 8.

────────────────────────────────────────────────────────────────
STEP 7 — NAVIGATION WIRING (R12-1)
────────────────────────────────────────────────────────────────

This is the core of GAP 6. Wire every card's onNavigate prop.

RULE: Sheet dismisses FIRST (flow-sheet-down 240ms easeStd) CONCURRENT
with the destination mounting on the activated tab. The card is marked
read at the moment of tap — before animation starts.

Implement a `navigateFromNotif` helper inside NotifSheet (or a hook)
that takes a destination spec and executes:

  function navigateFromNotif(dest: NotifNavDest): void {
    // 1. Mark card read (call mutation or local state update)
    // 2. Fire haptic (medium, or light for InboundBroadcast row body)
    // 3. Start sheet dismiss animation (withTiming 240ms easeStd)
    // 4. CONCURRENTLY: switch tab + push screen via navigation
    //    Use navigation ref from RootNavigator (NavigationContainerRef)
    //    to navigate imperatively from outside the nav tree.
    //    See: navigationRef.current?.navigate(...)
  }

NotifNavDest type:
  | { kind: 'event_detail'; eventId: string }
  | { kind: 'group_detail'; groupId: string }
  | { kind: 'friend_profile'; friendId: string }
  | { kind: 'create_event'; prefilledInviteeIds: string[] }

DESTINATION WIRING (from SPEC-R12-NotifRouting.txt):

  RsvpCard          → event_detail     · Home tab activates
  EventReminderCard → event_detail     · Home tab activates
  CoHostCard        → event_detail     · Home tab activates
  GroupActivityCard → group_detail     · Friends tab activates
                      (GroupsStack via FriendsTab cross-tab nav;
                       see types.ts GroupsTab comment)
  InboundBroadcastCard row body → friend_profile · Friends tab activates
  InboundBroadcastCard "Plan something" → create_event (modal)
                      prefilledInviteeIds: [notif.actorId]
                      NO tab switch required — modal opens over current tab.

Tab activation implementation:
  navigation.navigate('HomeTab')    — for event_detail
  navigation.navigate('FriendsTab') — for friend_profile
  For group_detail:
    navigation.navigate('GroupsTab', {
      screen: 'GroupDetail',
      params: { groupId, tab: 'members' }
    });
  For create_event modal:
    navigation.navigate('CreateEventModal', {
      screen: 'Step1',
      params: { prefilledInviteeIds }
    });

After tab switch, push the destination screen:
  navigation.navigate('HomeTab', {
    screen: 'EventDetail',
    params: { eventId }
  });

BACK BEHAVIOR: Back from any notification-entry destination returns
to the tab's top-of-stack at close time — NOT back to NotifSheet.
This is automatic because NotifSheet is not in the navigation stack.
No extra work required, but verify with a comment.

EDGE CASES (from SPEC-R12-NotifRouting.txt):

  Event/Group deleted:
    On navigation, if the query returns 404:
    → ErrorState kind='notFound' renders at the destination route.
    → The originating card is removed from the feed silently (no toast).
    → ErrorState CTA: "Go home" → navigate to Home root.

  Offline tap:
    → dismiss() fires.
    → Home tab activates (or whichever tab).
    → OfflineBar appears on destination if offline.
    → Notification card stays in feed, stays unread.

  Cards with NO navigation:
    FriendRequestCard · GroupInviteCard · CoHostRevokedCard
    → sheet does NOT dismiss on these actions. In-place only.

NAVIGATION REF: If RootNavigator doesn't already have one, create it:
  In app/App.tsx or wherever NavigationContainer is mounted:
    export const navigationRef = createNavigationContainerRef<RootStackParamList>();
    // … and pass ref={navigationRef} to NavigationContainer

────────────────────────────────────────────────────────────────
STEP 8 — WIRE ENTRY POINTS
────────────────────────────────────────────────────────────────

Entry point A — Bell icon in HomeScreen FlowHeader:
  Add Ionicons "notifications-outline" (unfocused) / "notifications"
  (when unread count > 0) to the right slot of FlowHeader on HomeScreen.
  Tap → openFull(). Light haptic.
  Show unread dot (8px accent, absolute top-right of icon) when
    notifications.some(n => !n.read).
  // TODO: Replace with ActivityTab press per ANCHOR R6-6.

Entry point B — Pull-from-Home gesture (Phase A):
  Mount a PanGesture on the HomeScreen root view.
  Phase A rules (ANCHOR R13-1):
    velocity ≥ 0.5px/ms downward → openFull() directly.
    displacement < 60px → spring back (no sheet open).
    displacement 60–159px → openPeek().
    displacement ≥ 160px → openFull().
  Light haptic at snap moment.
  Displacement fallback at release if velocity < 0.5.
  This gesture should NOT conflict with ScrollView scroll —
  only activate when the ScrollView is at its top position
  (contentOffset.y === 0).

────────────────────────────────────────────────────────────────
STEP 9 — TYPESCRIPT CHECK + VERIFICATION
────────────────────────────────────────────────────────────────

Run from social-calendar-mobile/:

  npx tsc --noEmit

Zero type errors required. Fix every error before moving to Phase 2.

Then verify manually:
  □ No hardcoded hex values — only src/theme/colors.ts tokens
  □ No raw Haptics.* calls outside useHaptic()
  □ No Zustand imports anywhere
  □ All API data via React Query (useNotifications hook)
  □ TwoTapDestructive used for every Decline in FriendRequest/GroupInvite
  □ Loading state is Spinner only (no skeleton, no shimmer)
  □ NotifSheet has exactly 2 detents: peek (44%) and full (88%)
  □ All navigation haptics fire at tap moment, not on animation frame
  □ navigationRef is exported and passed to NavigationContainer

If any check fails, fix before proceeding.

================================================================
## PHASE 2 — DOCKER ROUND-TRIP TEST
================================================================

Work from the repo root (where docker-compose.yml lives).
Complete this phase only after Phase 1 TypeScript is clean.

────────────────────────────────────────────────────────────────
STEP 1 — PRE-FLIGHT READS
────────────────────────────────────────────────────────────────

Read these files before running anything:

  docker-compose.yml
  social-calendar-api/src/server.ts
  social-calendar-api/src/app.ts
  social-calendar-api/src/middleware/auth.middleware.ts
  social-calendar-api/src/middleware/AUTH_HANDOFF.md
  social-calendar-api/src/routes/health.routes.ts
  social-calendar-api/src/routes/events.routes.ts   (or friends.routes.ts)
  social-calendar-api/src/config/env.ts
  social-calendar-api/src/config/redis.ts
  social-calendar-api/.env.example                  (if it exists)

Identify:
  - Which services are declared in docker-compose.yml (Postgres, Redis, API)
  - What port the API runs on (expected: 3000)
  - What environment variables are required (CLERK_SECRET_KEY, DATABASE_URL, etc.)
  - What routes exist that skip auth (SKIP_PREFIXES: /webhooks/, /health)
  - What a protected route looks like (its path and expected response shape)
  - Whether a .env file exists at repo root or in social-calendar-api/

────────────────────────────────────────────────────────────────
STEP 2 — ENVIRONMENT SETUP
────────────────────────────────────────────────────────────────

Check if .env exists at repo root and at social-calendar-api/.
If neither exists and .env.example exists, copy it:
  cp .env.example .env    (or cp social-calendar-api/.env.example social-calendar-api/.env)

Verify these variables are set (inspect without printing values):
  CLERK_SECRET_KEY       — must be present (sk_test_... or sk_live_...)
  DATABASE_URL           — postgres connection string
  DATABASE_URL_APP       — app-role connection string
  REDIS_URL              — redis connection string
  PORT                   — API port (should be 3000)

If any required variable is missing, STOP and print:
  "BLOCKED: .env is missing [VAR_NAME]. Set it before running Docker."
Do NOT proceed past this point with a broken env.

────────────────────────────────────────────────────────────────
STEP 3 — BRING UP DOCKER
────────────────────────────────────────────────────────────────

From repo root:

  docker-compose down --remove-orphans   # clean slate
  docker-compose up -d --build

Wait for all services to be healthy. Poll with:
  docker-compose ps

Expected healthy services: postgres, redis, api (or whatever names
docker-compose.yml declares). If any service fails to become healthy
within 60 seconds, run:
  docker-compose logs [service-name]
and report the last 50 lines. Do not proceed until all are healthy.

────────────────────────────────────────────────────────────────
STEP 4 — HEALTH CHECK
────────────────────────────────────────────────────────────────

  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health

Expected: 200

If not 200:
  docker-compose logs api --tail=50
  Report the error and stop. Do not proceed.

If 200: report "✓ /health → 200"

────────────────────────────────────────────────────────────────
STEP 5 — AUTH MIDDLEWARE TEST: UNAUTHENTICATED REQUEST
────────────────────────────────────────────────────────────────

Hit a protected route with NO auth header. This must return 401.

Identify a protected GET route from events.routes.ts or friends.routes.ts.
Example (adjust path to match actual routes):

  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/events

Expected: 401 (auth middleware rejects it)

If not 401: report the actual status code and the relevant
auth.middleware.ts behavior. This is a bug — do not continue.

If 401: report "✓ Unauthenticated request → 401"

────────────────────────────────────────────────────────────────
STEP 6 — AUTH MIDDLEWARE TEST: AUTHENTICATED REQUEST
────────────────────────────────────────────────────────────────

This step verifies a real Clerk JWT flows through auth.middleware.ts,
hits the RLS SET CONFIG, and returns data.

APPROACH: Generate a test token via Clerk's Backend SDK.

  A. Check if social-calendar-api/src/ has any test utilities or
     scripts that already generate a test JWT or create a test user.
     (Look for test/, scripts/, or seeder files.)

  B. If none exist, create a one-off test script:
     File: social-calendar-api/scripts/get-test-token.ts

     This script should:
       1. Import Clerk Backend SDK (already in dependencies)
       2. Create or retrieve a test user via Clerk API
          (clerkClient.users.createUser or getUserList)
       3. Create a session token for that user
          (clerkClient.sessions.createSessionToken or equivalent)
       4. Print the token to stdout

     Run it:
       cd social-calendar-api
       npx tsx scripts/get-test-token.ts

     Capture the token in a shell variable:
       TOKEN=$(npx tsx scripts/get-test-token.ts)

  C. If Clerk test mode is configured (CLERK_SECRET_KEY starts with
     sk_test_), look for whether Clerk's development instance supports
     magic test tokens. Read the Clerk SDK docs from node_modules if
     needed. Do NOT fetch external URLs — work from local deps only.

  D. Hit the protected route with the token:
       curl -s -w "\n%{http_code}" \
         -H "Authorization: Bearer $TOKEN" \
         http://localhost:3000/events

     Expected: 200 (or whatever the route's success response is)
     Report the status code and first 200 chars of the response body.

  E. Verify RLS is working:
     The auth.middleware.ts sets `app.current_user_id` via
     SET CONFIG. Confirm this by checking that the response data
     is correctly scoped to the test user (e.g. events only shows
     events for that user, not all events in the DB).
     If the DB is empty for this user, 200 with [] is correct.

If 200: report "✓ Authenticated request → 200 · RLS scope confirmed"
If not 200: report status + error body + last 20 lines of API logs.

────────────────────────────────────────────────────────────────
STEP 7 — REDIS TEST
────────────────────────────────────────────────────────────────

A. Verify Redis is reachable from inside the API container:

  docker-compose exec api sh -c "redis-cli -u $REDIS_URL ping"

  Expected: PONG
  If not PONG: check redis service name and REDIS_URL format.

B. Verify rate limiting (if exploreRateLimit.ts is active):
  Read social-calendar-api/src/middleware/exploreRateLimit.ts.
  Identify which route it applies to and its limit (requests per window).
  Fire requests above the limit:

    for i in $(seq 1 [LIMIT+2]); do
      curl -s -o /dev/null -w "%{http_code}\n" \
        -H "Authorization: Bearer $TOKEN" \
        http://localhost:3000/[rate-limited-route]
    done

  Expected: first [LIMIT] requests → 200, then → 429.
  Report the status code sequence.

C. Verify Redis key was written during rate limiting:

  docker-compose exec redis redis-cli KEYS "*"

  Should show rate-limit key(s). Report what you see.

If all three pass: report "✓ Redis PONG · Rate limit → 429 at threshold
  · Redis keys written"

────────────────────────────────────────────────────────────────
STEP 8 — CLEANUP + FINAL REPORT
────────────────────────────────────────────────────────────────

  docker-compose down

Print a final summary:

  ═══════════════════════════════════════════
  GAP 6 + DOCKER — COMPLETION REPORT
  Date: [today]
  ═══════════════════════════════════════════

  PHASE 1 — GAP 6: NOTIFSHEET + NAV WIRING
  ─────────────────────────────────────────
  ✓/✗ TypeScript: 0 errors (tsc --noEmit)
  ✓/✗ NotifSheet built (2 detents: peek 44%, full 88%)
  ✓/✗ All 8 card types implemented
  ✓/✗ Navigation wiring: all 6 card→destination paths
  ✓/✗ Edge cases: deleted event/group, offline tap
  ✓/✗ FriendRequest + GroupInvite: in-place only, no dismiss
  ✓/✗ Haptics: correct type on every interaction
  ✓/✗ Offline state: OfflineBar + stale sub-line + disabled CTAs
  ✓/✗ Entry point A: bell icon in HomeScreen FlowHeader
  ✓/✗ Entry point B: pull-from-home gesture
  ✓/✗ Tab discrepancy documented in RootNavigator.tsx
  Known gaps / deferred:
    - ActivityTab (bell) wiring pending tab order reconciliation
    - R6-4 InboundBroadcast stacking (stub present, not built)

  PHASE 2 — DOCKER ROUND-TRIP
  ─────────────────────────────────────────
  ✓/✗ All Docker services healthy
  ✓/✗ GET /health → 200
  ✓/✗ Unauthenticated request → 401
  ✓/✗ Clerk JWT → authenticated request → 200
  ✓/✗ RLS scope confirmed (app.current_user_id set)
  ✓/✗ Redis PONG
  ✓/✗ Rate limit → 429 at threshold
  ✓/✗ Redis keys written during rate-limit test

  Files created:
    [list every new file]
  Files modified:
    [list every modified file]

  ═══════════════════════════════════════════

Any ✗ line means the task is NOT done. Fix before marking complete.

================================================================
## NON-NEGOTIABLE RULES (apply throughout both phases)
================================================================

  → Haptics: ONLY via useHaptic(). Never call expo-haptics directly.
  → Loading: Spinner only. No skeletons. No shimmer. (R5-2)
  → Destructive actions: ONLY TwoTapDestructive. No confirm modals.
  → Design tokens only: NEVER hardcode hex values. Use colors.ts.
  → State: API data → React Query. UI-only → useState/useReducer.
     No Zustand. No global stores for API responses.
  → Tab bar order: do not change it.
  → TweaksPanel: never reference it outside HTML deliverables.
  → Mocks seed file: do NOT delete src/mocks/ — it must be cleaned up
     before production but is required for development. Add a comment
     at the top of any file you add mock data to:
     // ⚠️ DEVELOPMENT ONLY — delete before production (see CLAUDE.md)
  → NotifSheet detents: exactly peek (44%) and full (88%). No others.
  → InboundBroadcastCard row body haptic: LIGHT (already locked in spec).
     All other navigating card haptics: MEDIUM.
  → "Clear all" is single-tap (NOT TwoTapDestructive). Warning haptic.

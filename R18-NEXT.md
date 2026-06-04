# R18 — What's Next (handoff)

_Created 2026-06-04. Branch: `r18-messaging-build` (pushed, NOT merged to `main`)._

The messaging build (1:1 DM · group chat · event chat) is code-complete — backend
+ mobile, both workspaces `tsc` green, `social-calendar-api` `npm run build` green.
Full context: `R18-PLAN.md` "Build notes" + the `CLAUDE.md` "Session of 2026-06-04
(R18)" block + memory `project_r18_messaging_built`.

**Paste-ready first message for the new session:**
> Continue R18. Step 2 (realtime socket client) is done — do step 1 (verify the
> backend against a live docker stack + run `messaging-roundtrip.sh`), then
> smoke-test realtime on device per step 4. See R18-PLAN.md "Build notes" and the
> CLAUDE.md 2026-06-04 block.

---

## To finish R18

### 1. Verify the backend against a live stack  ← do this first; it gates everything
- `cd social-calendar-api && npx prisma generate`
- From repo root: `docker compose up -d --build` (applies migration `20260603000001_messaging`)
- Set `CLERK_SECRET_KEY`, `TEST_USER_A_CLERK_ID`, `TEST_USER_B_CLERK_ID`, then run
  `./scripts/messaging-roundtrip.sh` — expect all-pass / 0 fail.
- (This is the one thing the build session couldn't do — needs Docker + Clerk creds.)

### 2. Build the realtime socket client on mobile  — ✅ DONE 2026-06-04
- Built `src/realtime/` (`socket.io-client@^4.8.3`, first socket client on mobile).
  `RealtimeProvider` (in `App.tsx`) owns the Clerk-session-bound socket + global
  subscriptions: `chat:message:new` → thread cache + inbox invalidation;
  `chat:conversation:new` → inbox invalidation. `useChatRoom(conversationId)` does
  `chat:join`/`chat:leave` + the typing relay; `ChatThreadView` feeds the resolved
  names into `TypingDots` and emits `markTyping()`/`stopTyping()`.
- Mobile `tsc` green. NOT yet exercised against a live socket server — needs step 1's
  docker stack, then the device smoke test in step 4.

### 3. Consolidate the Friends·Groups·Messages carousel (R17-1) — ✅ DONE 2026-06-04
- `FriendsListScreen` now hosts a 3-way `SegmentedSwitcher` (Friends·Groups·Messages)
  + `SegmentCarousel` (reanimated/gesture-handler swipe, wraps both directions).
- Groups → `GroupsPane`, Messages → `InboxPane` — both SEGMENTS, not routes. Friends
  pane keeps a pinned "BFFs" filter chip + an inline-expand pending-requests banner.
- `GroupsTab`/`GroupsStack` retired; group screens (GroupDetail/CreateGroup/
  CoverPickerSheet) moved into `FriendsStack`; Home search + NotifSheet repoint to
  `FriendsTab → GroupDetail`. Mobile `tsc` green. Device QA still pending (step 4).

### 4. Device / sim QA
- Run the app (`/run` or `/verify`); send messages across two accounts; check inbox
  unread badges, group/event chat, and notif-tap routing.
- Realtime smoke test (step 2 is built but unexercised): with the thread open on two
  devices, confirm a sent message appears live on the other (no manual refresh) and the
  `TypingDots` indicator shows while the other party types.

---

## Adjacent cleanup (optional, same area)
- **Decide on a dedicated `MESSAGE` NotifType.** Message notifs currently reuse
  `GROUP_ACTIVITY` with a `conversationId`/`conversationType`/`linkedEventId` routing
  hint (works, but conflates semantics). A real type = small enum migration + mobile
  union + a new card.
- **Update the `CLAUDE.md` R16 stub section** — it still says "DM stays a stub"; DM is
  now promoted to real (noted in the R18 block, but the R16 section itself is unedited).

---

## Pre-existing backlog (not R18, still open)
- Onboarding R15-7..R15-13 tail.
- AttendeesSheet R15-1..R15-6.
- Merge `r18-messaging-build` → `main` once verification (step 1) passes — open the PR.

---

## Non-regression rules for the messaging code (don't break these)
1. **All messaging WRITES route through the migration-owner `prisma` client**
   (`conversations.repository.ts` `…Owner` methods), NOT `prismaApp` — bypasses RLS so
   INSERT…RETURNING never re-evaluates a SELECT policy (the `5f30e3a` bug class).
2. **`ConversationParticipant` SELECT is own-rows-only**; co-participants are hydrated
   via the gated owner client (a co-participant policy self-recurses).
3. **Group chat auto-creates via `friendGroups.service`** (no public route, D4); **event
   chat** is the host action `POST /events/:id/chat` (organiser-only).
4. **Message notifs dispatch as `GROUP_ACTIVITY`** with the routing hint; NotifSheet
   `group_activity` routes to the thread when `conversationId` is present.

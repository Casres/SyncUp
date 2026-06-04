# R18 — What's Next (handoff)

_Created 2026-06-04. Branch: `r18-messaging-build` (pushed, NOT merged to `main`)._

The messaging build (1:1 DM · group chat · event chat) is code-complete — backend
+ mobile, both workspaces `tsc` green, `social-calendar-api` `npm run build` green.
Full context: `R18-PLAN.md` "Build notes" + the `CLAUDE.md` "Session of 2026-06-04
(R18)" block + memory `project_r18_messaging_built`.

**Paste-ready first message for the new session:**
> Continue R18. Start with step 2 — build the mobile realtime socket client
> (`src/realtime/`) for `chat:message:new` / `chat:conversation:new` /
> `chat:typing`, wiring pushes into React Query and typing into `ChatThreadView`'s
> `typingNames`. See R18-PLAN.md "Build notes" and the CLAUDE.md 2026-06-04 block.

---

## To finish R18

### 1. Verify the backend against a live stack  ← do this first; it gates everything
- `cd social-calendar-api && npx prisma generate`
- From repo root: `docker compose up -d --build` (applies migration `20260603000001_messaging`)
- Set `CLERK_SECRET_KEY`, `TEST_USER_A_CLERK_ID`, `TEST_USER_B_CLERK_ID`, then run
  `./scripts/messaging-roundtrip.sh` — expect all-pass / 0 fail.
- (This is the one thing the build session couldn't do — needs Docker + Clerk creds.)

### 2. Build the realtime socket client on mobile  ← biggest remaining piece
- No `socket.io-client` exists on mobile for ANY domain yet — net-new infra
  (`npm i socket.io-client`).
- Create `src/realtime/`: connect with the Clerk JWT; subscribe to
  - `chat:message:new` → push into the thread query cache / invalidate inbox,
  - `chat:conversation:new` → invalidate inbox,
  - `chat:typing` → local state (feed `ChatThreadView`'s `typingNames` slot — it's
    already wired to render `TypingDots`).
- Emit `chat:join`/`chat:leave` on thread mount/unmount; `chat:typing:start/stop`
  while typing.
- Backend emits are already live — this is purely client-side.

### 3. Consolidate the Friends·Groups·Messages carousel (R17-1)
- Today: FriendsList switcher is still All/BFFs/Pending, Groups is a separate hidden
  stack, and the inbox is reached via a "Messages" header pill.
- Fold `GroupsListScreen` + the Messages inbox under one top-level `SegmentedSwitcher`
  on the Friends tab (carousel wraps both directions).

### 4. Device / sim QA
- Run the app (`/run` or `/verify`); send messages across two accounts; check inbox
  unread badges, group/event chat, and notif-tap routing.

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

# R18 — What's Next (handoff)

_Created 2026-06-04. **MERGED to `main` via PR #1 (`a62668a`); `r18-messaging-build` deleted.** Steps 1–3 below are DONE; only device QA (step 4) + the live-socket smoke test remain._

The messaging build (1:1 DM · group chat · event chat) is code-complete — backend
+ mobile, both workspaces `tsc` green, `social-calendar-api` `npm run build` green.
Full context: `R18-PLAN.md` "Build notes" + the `CLAUDE.md` "Session of 2026-06-04
(R18)" block + memory `project_r18_messaging_built`.

**Paste-ready first message for the new session:**
> Continue R18. Steps 1–3 are done (backend verified 31/31, socket client built,
> carousel built) and R18 is merged to `main`. Remaining: device/sim QA (step 4)
> incl. the realtime smoke test against a live socket server. See R18-PLAN.md
> "Build notes" and the CLAUDE.md 2026-06-04 block.

---

## To finish R18

### 1. Verify the backend against a live stack  — ✅ DONE 2026-06-04 (31/31, 0 fail)
- `cd social-calendar-api && npx prisma generate`
- From repo root: `docker compose up -d --build`, then **`docker compose exec api npx
  prisma migrate deploy`** — the migration is NOT auto-applied at boot (Dockerfile
  `CMD` is just `node dist/server.js`).
- Set `CLERK_SECRET_KEY`, `TEST_USER_A_CLERK_ID`, `TEST_USER_B_CLERK_ID`, then run
  `./scripts/messaging-roundtrip.sh` — **ran 31/31, re-runnable** (`MESSAGING_ROUNDTRIP_RESULTS.md`).
- The run found+fixed a group-chat auto-create FK bug (`createWithGroupChatOwner`,
  atomic owner-client tx) + 2 script assertions; CI Test job fixed (Cloudinary env).

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

### 4. Device / sim QA  — ⏳ IN PROGRESS (started 2026-06-04 on iPhone 17 sim)
- **First live run (iPhone 17 sim, prod API):** native build + launch + JS bundle all
  green; app signs in and renders Home. **Found + fixed a real pre-existing bug** — see
  below. Full carousel swipe QA + messaging QA still pending (handed to device driver).
- **🐞 API list-envelope shape mismatch (FIXED, commit `6c3b22b`).** Backend wraps list
  responses (`{ friends }`, `{ requests }`, `{ groups }`, `{ polls }`, `{ suggestions }`)
  but five mobile fetchers cast to bare arrays → runtime `friends.filter is not a
  function` on first live render (FriendsListScreen, onboarding Step2Screen). NOT a
  carousel regression — first time the app ran against the real API. Fixed all five to
  unwrap defensively. NOTE: after the fix, a **full app reload** is needed (not just fast
  refresh) because React Query had cached the bad shape.
- Still TODO: drive the Friends·Groups·Messages swipe (wrap both ways, vertical-scroll
  coexistence, BFF chip, pending-banner expand); send messages across two accounts; inbox
  unread badges; group/event chat; notif-tap routing.
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
- ~~Merge `r18-messaging-build` → `main`~~ — ✅ DONE 2026-06-04 (PR #1, `a62668a`; branch deleted).

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

# SyncUp — Round 18 Plan: Messaging Build

# Type: Build round (code — API + mobile)
# Depends on: ANCHOR-DESIGN.txt v3.7 rules R17-1 … R17-15 (LOCKED 2026-06-03)
# Spec source: R17-PLAN.md (decisions) + ANCHOR-DESIGN.txt R17 section (rules)
# Locked: 2026-06-03
# Status: DONE + MERGED to `main` 2026-06-04 (PR #1, merge commit a62668a).
#         Verified: migrate-deploy + messaging-roundtrip.sh = 31/31, 0 fail.
#         Realtime socket client BUILT; R17-1 carousel BUILT (branch
#         r17-friends-carousel). Remaining: device QA + live-socket smoke test.

---

## What R18 Is

The build round for the messaging system specced in R17: 1:1 DM, group chat
(linked to `FriendGroup`), and event chat (linked to `Event`). Ships the
backend domain, real-time transport, and the mobile UI end-to-end, verified
by a round-trip test. Every UI decision is already locked in R17 rules —
this round writes code to those rules, it does NOT revisit design.

**Read first (fresh-instance startup):**
1. `ANCHOR-DESIGN.txt` v3.7 — the R17 section (rules R17-1…R17-15) is the
   UI contract. R17-13 is the non-normative data-model/transport sketch.
2. `R17-PLAN.md` — the locked decision tables + REST/socket lists.
3. `NAVIGATION.md` / `SCREENS.md` — reconciled to the locked tab IA on
   2026-06-03; MessageThread lives in FriendsStack, EventChat in HomeStack.
4. `social-calendar-api/src/sockets/SOCKETIO_HANDOFF.md` — the existing
   socket conventions you MUST follow (room naming, emit-from-service).
5. `scripts/notif-avail-invites-roundtrip.sh` — the round-trip test pattern
   to mirror for messaging.

**Stack reality (verified 2026-06-03):** Fastify + Prisma (RLS) + socket.io
`^4.8.3` already wired (`src/sockets/index.ts`, `app.io`, token auth via
`socket.handshake.auth.token`, per-user rooms `user:${id}`). Mobile is RN
0.83 / Expo 55 / React Query v5. Real-time infra EXISTS — build on it.

---

## Backend (`social-calendar-api`)

### B1. Prisma schema — 3 new models (from R17-13)
Add to `prisma/schema.prisma`:
- `Conversation` — id, type (`DIRECT|GROUP|EVENT` enum), linkedGroupId?
  (→ FriendGroup), linkedEventId? (→ Event), createdAt, lastMessageAt
  (inbox sort key), archivedAt? (EVENT-only).
- `Message` — id, conversationId, senderId, content (String), sentAt.
- `ConversationParticipant` — conversationId, userId, joinedAt,
  lastReadMessageId? (D1-resolved: the viewer's private read cursor —
  powers the V1 unread badge; NEVER surfaced to others as a read receipt).
- New enum `ConversationType`.
- Relations + indexes: `Conversation.lastMessageAt` (inbox sort),
  `Message.conversationId + sentAt` (thread pagination),
  `ConversationParticipant (conversationId, userId)` unique.
- Run `npm run prisma:generate` after editing (required before tsc — see
  CLAUDE.md note on the removed type shim).

### B2. Migration + RLS (the critical, error-prone part)
New migration under `prisma/migrations/`. RLS policies — follow the locked
lessons from CLAUDE.md and memory [[project-rls-investigation]]:
- **Visibility (SELECT):** a user may read a Conversation / its Messages /
  its Participants only if they are a participant. Inline the
  `ConversationParticipant EXISTS (...)` check DIRECTLY in the policy —
  do NOT call a SECURITY DEFINER helper (the snapshot-isolation bug that
  bit `event_select_participant` and the invitee leg — migrations
  `20260601000002`, commit `e77ec29`).
- **Cross-user INSERT** (a message row is read by other participants;
  notification dispatch writes recipient rows): route through the
  migration-owner `prisma` client, NOT `prismaApp`, exactly as
  `notificationsRepository.create` does (commit `4bf999b`,
  migration `20260601000001`). Service-layer checks gate WHO may send.
- INSERT policy on Message: sender must be a participant of the
  conversation AND `current_app_user_id()` = senderId.

### B3. Repository / service / route layer (mirror existing domains)
Add `conversations.repository.ts`, `conversations.service.ts`,
`conversations.routes.ts` (+ controller if the domain uses them). Reuse
`_userSelects.ts` `publicProfileSelect` for sender hydration. Endpoints
(R17-13, all participant-gated):
- `GET /conversations` — inbox; sorted by lastMessageAt desc; EXCLUDES
  archived; returns last-message preview + unread count (D1) + type-specific
  avatar data (R17-2/R17-3).
- `GET /conversations/:id/messages` — paginated thread (cursor on sentAt).
- `POST /conversations/direct/:friendId` — get-or-create 1:1 (idempotent;
  R17-9 "created on first message" → endpoint creates lazily, returns
  existing if present). Requires accepted friendship (reuse
  `friends.repository hasAcceptedFriendship`, block-check first).
- `POST /conversations/:id/messages` — send; bumps lastMessageAt; emits
  socket + dispatches notification to other participants.
- `POST /events/:id/chat` — host enables event chat (organiser-only;
  creates Conversation type=EVENT, seeds participants = all invitees).
- Group chat — NO public route (D4): auto-created as an internal
  `friendGroups.service` side effect of FriendGroup creation (see B4).

### B4. Auto-creation hooks (R17-10, R17-9)
- **Group chat:** hook into `friendGroups.service` create path — when a
  FriendGroup is created, create a GROUP Conversation with all members as
  participants. When a member is added to the group, add them as a
  participant (and emit `chat:conversation:new`).
- **Event chat:** only on host enable (`POST /events/:id/chat`) — never
  auto. Seed participants = all current invitees.
- **DM:** lazy — first `POST /conversations/direct/:friendId` (or first
  message) creates it. The "DM button" / long-press "Message" (R17-9) just
  navigates; the row is created on first send.

### B5. Real-time (extend existing socket layer — DO NOT reinvent)
Add `src/sockets/chat.socket.ts`, register in `sockets/index.ts`:
- Rooms: `conversation:${id}`. Client emits `chat:join` / `chat:leave` on
  thread mount/unmount (mirror the existing `group:join`/`group:leave`
  pattern in `groups.socket.ts`). Guard join with a participant check.
- Server→client events (emit from the service, per SOCKETIO_HANDOFF.md
  "emit from service" rule): `chat:message:new` (to `conversation:${id}`),
  `chat:conversation:new` (to each new participant's `user:${id}`).
- Client→server→broadcast: `chat:typing:start` / `chat:typing:stop`
  (relay to the conversation room minus sender; ephemeral, no persistence;
  R17-7). Read receipts: NONE in V1 (R17-14).

### B6. Event-chat lifecycle / archival (R17-10)
- One-time event: set `archivedAt` = event.endsAt + 48h. Recurring event:
  never archives (archivedAt stays null).
- Mechanism (D3-resolved): a `workers/` sweep job sets archivedAt
  (consistent with `explorePrewarm.worker.ts`) — NOT computed at read time —
  so the inbox `GET /conversations` stays a simple `archivedAt IS NULL`
  filter.

### B7. Round-trip test
Add `scripts/messaging-roundtrip.sh` mirroring
`notif-avail-invites-roundtrip.sh`: two+ users, create each conversation
type, send/receive, assert participant-gating (non-participant gets
FORBIDDEN), assert archived exclusion, assert unread counts. Expect N/0.

---

## Mobile (`social-calendar-mobile`)

### M1. API layer (React Query — hard rule: API data → React Query only)
- `src/api/conversations.ts` — `useInbox()`, `useThread(conversationId)`
  (infinite query), `useSendMessage()`, `useGetOrCreateDirect(friendId)`,
  `useEnableEventChat(eventId)`. Add keys to `queryKeys.ts`.
- Socket client wiring in the existing socket module: subscribe to
  `chat:message:new` → push into the thread query cache / invalidate inbox;
  `chat:conversation:new` → invalidate inbox. Typing events → local
  component state only (never global store — CLAUDE.md state rules).

### M2. Inbox — Messages segment (R17-1, R17-2, R17-3)
- Add the 3rd segment to the FriendsList `SegmentedSwitcher`
  (Friends · Groups · Messages; carousel wraps both directions, R17-1).
- Inbox rows per R17-2: circular type-specific avatar (R17-3 — 1:1 photo /
  group cluster ≤5 / event photo), name, 1-line preview, timestamp, unread
  count badge (accent fill, "9+" cap), unread-row weight treatment.
- `EmptyMessages` (NO-CTA) + spinner-only loading (R17-2, R5-2).

### M3. Thread screens (R17-4 … R17-8, R17-12)
- `MessageThread { conversationId, type }` in FriendsStack (DM + group);
  `EventChat { conversationId, eventId }` in HomeStack (route names locked
  per D2).
- Header per type (R17-4). Bubbles: sent right/accent, received
  left/bgElevated (R17-5). Sender label above bubble for group/event only,
  omitted 1:1 (R17-5). Timestamps gap-gated/date-aware (R17-6). Typing
  indicator = received-style 3-dot bubble (R17-7). Input bar: paper-plane
  send, hidden when empty, text-only + native emoji (R17-8).
- Components live in a new `src/components/messaging/` (bubble, inboxRow,
  typingDots, threadHeader, messageInput) — tokens only, `useHaptic()` only.

### M4. Notification routing (R17-11)
- Message notif cards route straight to the thread, NotifSheet dismissing
  concurrently (per R12-1). DM/group → Friends tab → Messages segment →
  thread; event → Home tab → EventChat. Medium haptic on tap.
- Extend the NotifSheet routing wired in GAP 6 / R12-1.

---

## Suggested phase order

1. **B1–B2** schema + migration + RLS (+ `prisma:generate`). Gate: migration
   applies, tsc clean.
2. **B3–B4** repo/service/routes + auto-create hooks. Gate: endpoints work
   via curl with two users.
3. **B5** sockets (chat.socket.ts + join/leave + emits).
4. **B7** round-trip script green (N/0) — backend done.
5. **M1** mobile API + socket subscriptions.
6. **M2** inbox segment. 7. **M3** thread screens. 8. **M4** notif routing.
9. Verify on device/sim (`/run` or `/verify`).

Backend (1–4) and mobile (5–8) can split across two git worktrees/branches
once the API contract (endpoints + socket events) is frozen after phase 2.

---

## Build decisions (all resolved · D1–D4 · 2026-06-03)

- **D1 — Unread count derivation. ✅ RESOLVED (Director-approved 2026-06-03).**
  R17-2 requires an unread *count* badge, but R17-14 defers read *receipts*
  to V2 and R17-13 calls `lastReadMessageId` "reserved for future read
  receipts." **Resolution (locked):** `ConversationParticipant.lastReadMessageId`
  is ACTIVE in V1 — it is the viewer's own private read cursor, used by the
  inbox to compute that viewer's unread count (messages sent after the
  marker). It is NEVER surfaced to other participants as a "seen by"
  receipt; that cross-user exposure is the sole thing V2 adds. The client
  advances the marker to the latest message when the viewer opens a thread
  (and while the thread stays foregrounded). This supersedes R17-13's
  "reserved" wording: the field is live in V1 for the badge, dormant only
  as a read receipt.
- **D2 — Thread route names/params. ✅ RESOLVED (2026-06-03).** Locked:
  `MessageThread { conversationId, type: 'DIRECT' | 'GROUP' }` in
  FriendsStack; `EventChat { conversationId, eventId }` in HomeStack. This
  finalizes the names R17-12 left non-normative — NAVIGATION.md already
  carries them.
- **D3 — Archival mechanism. ✅ RESOLVED (2026-06-03).** Locked: a `workers/`
  sweep job sets `archivedAt = event.endsAt + 48h` for one-time EVENT
  conversations (recurring stays null), mirroring `explorePrewarm.worker.ts`.
  The inbox query stays a simple `archivedAt IS NULL` filter — archival is
  NOT computed at read time.
- **D4 — Group-chat creation trigger. ✅ RESOLVED (2026-06-03).** Locked:
  internal service call only — NO public `POST /groups/:groupId/chat` route.
  Group-chat auto-create is a side effect of FriendGroup creation inside
  `friendGroups.service`, not a client action. (Event chat keeps its public
  `POST /events/:id/chat` route — that one IS a deliberate host action.)

---

## Build notes (2026-06-04) — what shipped, deviations, follow-ups

**Backend (complete, `tsc`+`build` green):**
- Schema: `Conversation` / `Message` / `ConversationParticipant` + `ConversationType`
  enum; migration `20260603000001_messaging` with RLS.
- RLS design (important): ALL writes (message/conversation/participant) route
  through the migration-owner `prisma` client (bypasses RLS), so the
  INSERT...RETURNING snapshot-isolation bug cannot occur on the write path.
  App-client reads are gated by inline-EXISTS SELECT policies. `ConversationParticipant`
  SELECT is own-rows-only (a co-participant policy would self-recurse →
  "infinite recursion in policy"); co-participants are hydrated via the gated
  owner client (the `…Owner` repo methods), same trust model as notif dispatch.
- Repo/service/routes/controller, auto-create hooks (group via friendGroups.service,
  event via `POST /events/:id/chat`), `chat.socket.ts` (join/leave + typing relay),
  `eventChatArchival.worker.ts`, and `scripts/messaging-roundtrip.sh`.
- Message notifications dispatch as `GROUP_ACTIVITY` (no dedicated `MESSAGE`
  NotifType — avoided a fragile `ALTER TYPE … ADD VALUE` migration). The payload
  carries `conversationId`/`conversationType`/`linkedEventId` as an M4 routing hint.

**Mobile (complete, `tsc` green):**
- `src/api/conversations.ts` + `.types.ts` (useInbox / useThread infinite /
  useSendMessage / useGetOrCreateDirect / useEnableEventChat / useMarkRead).
- `src/components/messaging/` (MessageBubble, TypingDots, ConversationAvatar,
  InboxRow, MessageInput, ThreadHeader, ChatThreadView) + `EmptyMessages`.
- Screens: MessagesScreen (inbox), MessageThreadScreen (FriendsStack),
  EventChatScreen (HomeStack); nav routes + types wired.
- DM promoted from the R16-9 stub → real (FriendProfile "DM" button, R17-9).
- NotifSheet M4 routing: message cards route to the thread (medium haptic).

**Deviations / deferred (need a decision or a follow-up round):**
1. **Realtime socket client — ✅ BUILT 2026-06-04 (follow-up session).** `src/realtime/`
   is the first socket.io client on mobile (`socket.io-client@^4.8.3`, hoisted to the
   workspace-root `node_modules`). `RealtimeProvider` (mounted in `App.tsx` inside
   QueryClientProvider) owns the socket lifecycle tied to the Clerk session — `auth`
   is supplied as a FUNCTION so a fresh Clerk JWT is fetched before every (re)connect —
   and registers the GLOBAL chat subscriptions: `chat:message:new` prepends into the
   thread query cache (dedupe by id) + invalidates the inbox; `chat:conversation:new`
   invalidates the inbox. `useChatRoom(conversationId)` handles per-thread `chat:join`/
   `chat:leave` and the bidirectional typing relay (`chat:typing` inbound → local state
   with per-user expiry; `markTyping()`/`stopTyping()` outbound, debounced). `ChatThreadView`
   now wires `useChatRoom` → maps typing user ids to participant names → drives the
   existing `TypingDots` slot; the composer calls `markTyping()` on keystroke and
   `stopTyping()` on send. Pushes update the React Query cache ONLY (no global store);
   typing is local component state — both per CLAUDE.md state rules. Mobile `tsc` green.
   NOTE: `chat:message:new` only arrives while a thread is open (room-scoped join) — the
   backend emits to `conversation:{id}` only; cross-thread awareness rides the
   GROUP_ACTIVITY notif. Not yet exercised against a live socket server (gated on step 1
   docker stack).
2. **R17-1 Friends·Groups·Messages carousel — ✅ CONSOLIDATED 2026-06-04 (follow-up
   session).** `FriendsListScreen` now hosts a 3-way `SegmentedSwitcher`
   (Friends·Groups·Messages) + `SegmentCarousel` — a reanimated/gesture-handler
   swipe pager that wraps both directions (clamped live drag; wrap on release via
   threshold/velocity). Groups → new `GroupsPane`, Messages → new `InboxPane`; both
   are SEGMENTS, not routes. The Friends pane keeps a pinned "BFFs" filter chip
   (union multi-select with the FriendType chips) and an inline-expand
   pending-requests banner (Director decisions 2026-06-04). IA cleanup: `GroupsTab`
   + `GroupsStack` retired; the group screens (GroupDetail/CreateGroup/
   CoverPickerSheet) moved into `FriendsStack`; `MessagesScreen`/`GroupsListScreen`
   deleted; Home search + NotifSheet `navGroupDetail` repoint to
   `FriendsTab → GroupDetail`. Mobile `tsc` green; device QA pending.
3. **Migration applied + round-trip run — ✅ DONE 2026-06-04 (31/31, 0 fail, re-runnable).**
   Note: the messaging migration is NOT auto-applied at boot (Dockerfile `CMD` is just
   `node dist/server.js`) — run `docker compose exec api npx prisma migrate deploy` after
   `docker compose up -d --build`. The run found+fixed a real group-chat auto-create FK
   bug: the FriendGroup was written in the uncommitted per-request app-client tx while the
   chat insert ran on a separate owner-client connection (FK `linkedGroupId` → no visible
   target → P2003, swallowed by best-effort catch). Fix: `friendGroupsRepository.
   createWithGroupChatOwner` creates group + GROUP conversation + owner participant in ONE
   owner-client `$transaction` (atomic, FK visible). Two `messaging-roundtrip.sh` assertions
   also fixed (friends-list shape `.friends[]?`; deterministic group-conversation selection
   by `linkedGroupId`). CI Test job, pre-existing red on `main` (ci.yml omitted the
   `CLOUDINARY_*` env `env.ts` requires), fixed via GitHub repo secrets wired into the Test
   job. Results: `MESSAGING_ROUNDTRIP_RESULTS.md`.

## Out of scope (unchanged from R17)
Read receipts (V2 · R17-14), media/files/reactions, message edit/delete,
group admin controls beyond creation, event host moderation. Also still
deferred: Explore tab screens (no spec), DM/Report promotion (R16-9 clock),
onboarding R15-7..R15-13, AttendeesSheet R15-1..R15-6.
```

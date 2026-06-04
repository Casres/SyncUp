# SyncUp — Round 18 Plan: Messaging Build

# Type: Build round (code — API + mobile)
# Depends on: ANCHOR-DESIGN.txt v3.7 rules R17-1 … R17-15 (LOCKED 2026-06-03)
# Spec source: R17-PLAN.md (decisions) + ANCHOR-DESIGN.txt R17 section (rules)
# Locked: 2026-06-03
# Status: NOT STARTED

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
  lastReadMessageId? (see Open Decision D1 — used for the unread badge,
  NOT exposed as a read receipt).
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
- `POST /groups/:groupId/chat` — auto-called on FriendGroup creation
  (internal/service-level, not necessarily a public route — see B5).

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
- Mechanism (Open Decision D3): either a `workers/` job that sweeps and
  sets archivedAt (consistent with `explorePrewarm.worker.ts`), OR compute
  archived-state at read time in the inbox query. Recommend the worker so
  the inbox `GET /conversations` stays a simple `archivedAt IS NULL` filter.

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
- `MessageThread` in FriendsStack (DM + group); `EventChat` in HomeStack.
  Finalize route names (Open Decision D2).
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

## Open build decisions (resolve early — flag to Director if needed)

- **D1 — Unread count derivation.** R17-2 requires an unread *count* badge,
  but R17-14 defers read *receipts* to V2 and R17-13 calls
  `lastReadMessageId` "reserved for future read receipts." Resolution:
  `lastReadMessageId` (or a `lastReadAt`) IS used in V1 to compute the
  VIEWER'S OWN unread count (messages after their marker). It is NOT
  surfaced to other users as "seen" — that exposure is what V2 adds. Write
  the marker when the viewer opens/leaves a thread. **This is a clarification
  of R17-13's framing the build must make; confirm with Director.**
- **D2 — Thread route names/params.** Non-normative in R17-12. Suggested:
  `MessageThread { conversationId, type }`, `EventChat { conversationId,
  eventId }`. Finalize here.
- **D3 — Archival mechanism** (B6): worker vs compute-at-read. Recommend
  worker.
- **D4 — `POST /groups/:groupId/chat`**: public route vs internal service
  call only. Recommend internal (auto-create is a side effect of group
  creation, not a client action).

---

## Out of scope (unchanged from R17)
Read receipts (V2 · R17-14), media/files/reactions, message edit/delete,
group admin controls beyond creation, event host moderation. Also still
deferred: Explore tab screens (no spec), DM/Report promotion (R16-9 clock),
onboarding R15-7..R15-13, AttendeesSheet R15-1..R15-6.
```

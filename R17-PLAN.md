# SyncUp — Round 17 Plan: Messaging Feature Spec
# Type: Design-only round (no code)
# Output: ANCHOR-DESIGN.txt rules R17-1 through R17-N
# Build round: R18
# Locked: 2026-06-03

---

## What R17 Is

A design-spec round for the full SyncUp messaging system: 1:1 DM, group chats
(linked to FriendGroups), and event chats (linked to Events). No code is
written in R17. The output is a locked set of ANCHOR rules that R18 agents
can build from without ambiguity.

Designing all three together is intentional — the data model must accommodate
all three conversation types from day one.

---

## All Decisions Locked (Director-approved)

### Nav & Inbox

| Decision | Ruling |
|---|---|
| Inbox placement | Friends tab — 3rd segment in the existing SegmentedSwitcher |
| SegmentedSwitcher | 3-way: **Friends · Groups · Messages** — carousel behavior, wraps in both directions (Messages → swipe right → Friends, Friends → swipe left → Messages) |
| Inbox row — avatar | Circle shape for all types (see avatar rules below) |
| Inbox row — content | Avatar · conversation name (top) · last message preview 1-line truncated (bottom) · timestamp top-right · unread badge |
| 1:1 avatar | Friend's circular profile photo |
| Group chat avatar | Cluster of up to 5 circular member avatars overlapping. Count matches real member count up to 5 (2 members = 2 icons, 6 members = still 5 icons) |
| Event chat avatar | Event photo, circular crop |

### Thread — Header

| Decision | Ruling |
|---|---|
| 1:1 header | Friend's name + circular profile photo |
| Group chat header | Group name + cluster avatar (same as inbox) |
| Event chat header | Event name + event photo (circular) |
| Participant count | Not shown in header — that information lives on the event/group page |

### Thread — Message Bubbles

| Decision | Ruling |
|---|---|
| Sent bubble | Right-aligned, accent color fill |
| Received bubble | Left-aligned, bgElevated fill |
| Sender label (group + event chats) | Name appears ABOVE the bubble, left-aligned, next to their avatar. 1:1 threads omit sender label entirely. |

### Thread — Timestamps

| Decision | Ruling |
|---|---|
| When shown | First message of a conversation + after any 5+ minute gap between messages |
| Format — today | Clock time only: "3:42 PM" |
| Format — older | Date + time: "Jun 1 · 3:42 PM" |

### Thread — Typing Indicator

| Decision | Ruling |
|---|---|
| Visual | Three animated dots as a received bubble at the bottom of the message list |
| Sender label | Follows same rule as received bubbles — name + avatar above dots for group/event, omitted for 1:1 |

### Thread — Input Bar

| Decision | Ruling |
|---|---|
| Send button | Paper plane/arrow icon |
| Empty state | Send icon hidden completely when input is empty; appears only when text is entered |
| Message types | Text only. Native emoji via device keyboard. No media, no reactions. |

### Real-Time

| Decision | Ruling |
|---|---|
| Delivery | Socket.io |
| Typing indicators | Yes — `chat:typing:start` / `chat:typing:stop` events |
| Read receipts | Not in V1 |

### Conversation Types — Behavior

| Decision | Ruling |
|---|---|
| 1:1 DM — creation | Conversation created when first message is sent (not on DM button tap) |
| 1:1 DM — entry points | (1) Friend Profile "DM" button. (2) Long-press friend row in FriendsListScreen → context menu with "Message" + "View Profile" |
| Long-press menu | Two options only: "Message" + "View Profile" |
| Group chat — creation | Auto-created when a FriendGroup is created. All members are participants from the start. |
| Group chat — new members | When a new member joins the group, they are added to the chat automatically |
| Event chat — creation | Host manually enables it. Chat does not exist until host turns it on. |
| Event chat — participants | All invitees |
| Event chat — lifecycle (one-time event) | Archives 48 hours after the event end time ("thank you / recap" window) |
| Event chat — lifecycle (recurring event) | Never archives. Stays active indefinitely. |

### Notifications

| Decision | Ruling |
|---|---|
| Card anatomy (all types) | Avatar (type-specific, per inbox rules) · conversation name · message preview 1-line · timestamp |
| Tap behavior | Routes directly to the thread. NotifSheet dismisses concurrent with thread opening (per R12-1). |
| DM tap routing | Friends tab activates → Messages segment → DM thread |
| Group chat tap routing | Friends tab activates → Messages segment → group thread |
| Event chat tap routing | Home tab activates → event thread |
| Haptic on tap | Medium (per R12-1 navigating card convention) |

### Data Model (Non-Normative — guides R18 build)

```
Conversation
  id
  type: DIRECT | GROUP | EVENT
  linkedGroupId?      (GROUP only)
  linkedEventId?      (EVENT only)
  createdAt
  lastMessageAt       (inbox sort key)
  archivedAt?         (EVENT only — set 48h after event.endsAt for one-time events)

Message
  id
  conversationId
  senderId
  content: string
  sentAt

ConversationParticipant
  conversationId
  userId
  joinedAt
  lastReadMessageId?  (nullable — reserved for future read receipts)
```

Socket.io events: `chat:message:new`, `chat:typing:start`, `chat:typing:stop`,
`chat:conversation:new` (notify participant when added to a new conversation).

REST endpoints:
- `GET /conversations` — inbox (sorted by lastMessageAt, excludes archived)
- `GET /conversations/:id/messages` — paginated thread
- `POST /conversations/direct/:friendId` — get-or-create 1:1 conversation
- `POST /conversations/:id/messages` — send message
- `POST /events/:id/chat` — host enables event chat
- `POST /groups/:groupId/chat` — auto-called on group creation

---

## Design Session Startup Checklist

1. Read `ANCHOR-DESIGN.txt` in full — load v3.6 context
2. Read `SCREENS.md` — FriendsListScreen, FriendProfileScreen, EventDetailScreen, GroupDetailScreen anatomy
3. Read `NAVIGATION.md` — FriendsStack + HomeStack structure
4. All decisions above are Director-locked — do not revisit them
5. Write rules in ANCHOR-DESIGN.txt under a new "Round 17 — Messaging" HARD RULES section
6. Follow the surface order: Nav/Inbox → Thread shared anatomy → 1:1 → Group → Event → Notif cards → Nav graph → Data model section
7. Bump anchor version to v3.7, update "Last updated"

---

## What R17 Does NOT Cover

- Any code (deferred to R18)
- Read receipts (explicitly V2)
- Media messages, file sharing, reactions (out of scope)
- Message editing or deletion (out of scope)
- Group chat admin controls beyond creation (out of scope)
- Event chat host moderation controls (out of scope for V1)
- Promoting the Report stub (separate future round)
- Onboarding R15-7..R15-13 (deferred)
- AttendeesSheet R15-1..R15-6 (deferred)
- API wiring for friends/availability/profile/groups/explore stubs (deferred)

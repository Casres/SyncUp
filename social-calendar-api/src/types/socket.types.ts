/**
 * Typed Socket.io event map.
 *
 * Payload shapes mirror the REST API response shapes EXACTLY. Whenever a
 * domain agent changes a response shape, this file MUST change in lockstep
 * — and the corresponding mobile client (`social-calendar-mobile/src/api/`)
 * must mirror this file. See `social-calendar-api/CLAUDE.md` ("Notes").
 *
 * Source-of-truth references:
 *   - Events:       src/routes/EVENTS_HANDOFF.md   (response shape)
 *   - Friends:      src/routes/FRIENDS_HANDOFF.md  (FriendshipResponse / AvailabilityBlockResponse)
 *   - Groups:       src/routes/GROUPS_HANDOFF.md   (GroupResponse / PollResponse / SuggestionResponse / member shape)
 */
import type {
  ConversationType,
  EventExceptionType,
  EventOrganiserRole,
  FriendshipStatus,
  InviteStatus,
  NotifChannel,
  NotifType,
  Recurrence,
  SocialGroupRole,
  SuggestionVoteValue,
} from '@prisma/client';

// ─── Common ──────────────────────────────────────────────────────────────────

/**
 * Public-profile shape used inside every domain response. Mirrors the
 * `publicProfileSelect` shape in the repositories.
 */
export type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Mirrors the response shape documented in EVENTS_HANDOFF.md for
 * GET /events/:id, POST /events, PATCH /events/:id.
 */
export type EventPayload = {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  recurrence: Recurrence;
  recurrenceRuleRaw: string | null;
  allowSuggestionVoting: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator: PublicProfile;
  organisers: Array<{
    id: string;
    role: EventOrganiserRole;
    user: PublicProfile;
  }>;
  invites: Array<{
    id: string;
    status: InviteStatus;
    friendGroupId: string | null;
    recipient: PublicProfile;
  }>;
};

/**
 * EventInvite payload. The Invites REST endpoints don't exist yet (see
 * EVENTS_HANDOFF "Open items #1"). Schema includes notification override
 * fields and friend-group audit trail.
 */
export type InvitePayload = {
  id: string;
  eventId: string;
  recipientId: string;
  status: InviteStatus;
  friendGroupId: string | null;
  notifChannel: NotifChannel | null;
  createdAt: string;
  updatedAt: string;
  recipient: PublicProfile;
};

/**
 * EventException payload. EventException management isn't in the current
 * Events slice (deferred per EVENTS_HANDOFF "Open items #3"). Included so
 * future agents can hook into the same socket map without a type
 * migration.
 */
export type EventExceptionPayload = {
  id: string;
  eventId: string;
  originalDate: string;
  type: EventExceptionType;
  title: string | null;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

// ─── Friends ─────────────────────────────────────────────────────────────────

/**
 * Mirrors `FriendshipResponse` from FRIENDS_HANDOFF.md. The `friend`
 * field is derived per-recipient at the service layer; when emitting via
 * socket, the server resolves "friend" from the perspective of each
 * connected user before push (so the receiver always sees the OTHER party).
 */
export type FriendshipPayload = {
  id: string;
  initiatorId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  friend: PublicProfile;
  label?: string;
};

export type AvailabilityBlockPayload = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blocked: PublicProfile;
};

// ─── Groups ──────────────────────────────────────────────────────────────────

/**
 * Mirrors `GroupResponse` from GROUPS_HANDOFF.md. `viewerRole` is
 * recipient-specific; when emitting via socket, the server should resolve
 * the viewer's role per-connected-user before push.
 */
export type GroupPayload = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  viewerRole: SocialGroupRole;
};

/**
 * Mirrors the SocialGroupMember response shape from GROUPS_HANDOFF.md.
 */
export type MemberPayload = {
  id: string;
  socialGroupId: string;
  userId: string;
  role: SocialGroupRole;
  joinedAt: string;
  user: PublicProfile;
};

/**
 * Mirrors `PollResponse` from GROUPS_HANDOFF.md. `viewerHasVoted` is
 * recipient-specific — see note on GroupPayload.viewerRole.
 */
export type PollOptionPayload = {
  id: string;
  text: string;
  order: number;
  voteCount: number;
  viewerHasVoted: boolean;
};

export type PollPayload = {
  id: string;
  socialGroupId: string;
  eventId: string | null;
  question: string;
  closedAt: string | null;
  createdAt: string;
  createdBy: PublicProfile;
  options: PollOptionPayload[];
  totalVotes: number;
};

/**
 * Mirrors `SuggestionResponse` from GROUPS_HANDOFF.md. `viewerVote` is
 * recipient-specific.
 */
export type SuggestionPayload = {
  id: string;
  socialGroupId: string;
  eventId: string | null;
  title: string;
  description: string | null;
  proposedDate: string | null;
  createdAt: string;
  suggestedBy: PublicProfile;
  upvotes: number;
  downvotes: number;
  viewerVote: SuggestionVoteValue | null;
};

// ─── Notifications ───────────────────────────────────────────────────────────

/**
 * Mirrors the `Notif` union in `social-calendar-mobile/TYPES.ts`. The
 * server stores the type-specific body in a JSON blob; the service
 * layer shapes it back to the discriminated union shape before
 * serialising.
 *
 * The wire shape is intentionally the SAME as the mobile `Notif` union
 * (top-level fields plus per-type body) so React Query consumes it
 * directly with no transform.
 */
export type NotifPayload = {
  id: string;
  type: NotifType;
  read: boolean;
  createdAt: string;
} & Record<string, unknown>;

// ─── Messaging (R17 / R18) ───────────────────────────────────────────────────

/** A single chat message in wire form (ISO timestamps). */
export type MessageWire = {
  id: string;
  conversationId: string;
  content: string;
  sentAt: string;
  sender: PublicProfile;
};

/**
 * Header / inbox-row shape shared by every conversation kind. `title` is
 * resolved per-type server-side (DM → other party's name, GROUP → group name,
 * EVENT → event title). `participants` carries every member's public profile
 * so the mobile client can render the type-specific avatar (R17-3).
 */
export type ConversationSummaryWire = {
  id: string;
  type: ConversationType;
  title: string;
  linkedGroupId: string | null;
  linkedEventId: string | null;
  participants: PublicProfile[];
};

/** Inbox row: a summary plus preview, sort key, and the viewer's unread count. */
export type InboxItemWire = ConversationSummaryWire & {
  lastMessage: MessageWire | null;
  lastMessageAt: string;
  unreadCount: number;
};

// ─── Server → Client ─────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  // Presence
  'presence:update': (data: {
    userId: string;
    status: 'online' | 'offline';
  }) => void;

  // Events
  'event:updated': (data: { eventId: string; event: EventPayload }) => void;
  'event:invite:received': (data: { invite: InvitePayload }) => void;
  'event:invite:rsvp': (data: {
    eventId: string;
    inviteId: string;
    status: InviteStatus;
  }) => void;

  // Friends
  'friend:request:received': (data: { friendship: FriendshipPayload }) => void;
  'friend:request:accepted': (data: { friendship: FriendshipPayload }) => void;

  // Groups
  'group:poll:created': (data: {
    groupId: string;
    poll: PollPayload;
  }) => void;
  'group:poll:closed': (data: { groupId: string; pollId: string }) => void;
  'group:poll:vote': (data: {
    groupId: string;
    pollId: string;
    optionId: string;
    voteCount: number;
  }) => void;
  'group:suggestion:created': (data: {
    groupId: string;
    suggestion: SuggestionPayload;
  }) => void;
  'group:suggestion:vote': (data: {
    groupId: string;
    suggestionId: string;
    upvotes: number;
    downvotes: number;
  }) => void;
  'group:member:added': (data: {
    groupId: string;
    member: MemberPayload;
  }) => void;
  'group:member:removed': (data: { groupId: string; userId: string }) => void;

  // Availability — minimal payload; clients re-fetch via REST.
  'availability:updated': (data: { userId: string }) => void;

  // Notifications — server pushes a new card to the recipient's
  // `user:{userId}` room. `notif:new` is the only push event today;
  // mark-as-read and dismiss are REST-only (no fan-out needed because
  // they're scoped to a single user).
  'notif:new': (data: { notification: NotifPayload }) => void;
  'notif:dismissed': (data: { notificationId: string }) => void;

  // Messaging (R17 / R18)
  // `chat:message:new` → the `conversation:{id}` room (joined participants).
  // `chat:conversation:new` → each new participant's `user:{id}` room; the
  //   client invalidates its inbox query on receipt (R18 M1).
  // `chat:typing` → the `conversation:{id}` room minus the typer; ephemeral,
  //   never persisted (R17-7).
  'chat:message:new': (data: {
    conversationId: string;
    message: MessageWire;
  }) => void;
  'chat:conversation:new': (data: { conversationId: string }) => void;
  'chat:typing': (data: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
}

// ─── Client → Server ─────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  'presence:join': (data: { userId: string }) => void;
  'presence:leave': (data: { userId: string }) => void;
  'group:join': (data: { groupId: string }) => void;
  'group:leave': (data: { groupId: string }) => void;

  // Messaging room membership + typing relay (R17-7 / R18 B5). The server
  // validates participation before honouring `chat:join` (silent no-op
  // otherwise — mirrors `group:join`). Typing events are relayed to the room
  // minus the sender and never persisted.
  'chat:join': (data: { conversationId: string }) => void;
  'chat:leave': (data: { conversationId: string }) => void;
  'chat:typing:start': (data: { conversationId: string }) => void;
  'chat:typing:stop': (data: { conversationId: string }) => void;
}

// ─── Inter-server (multi-instance) ──────────────────────────────────────────

/**
 * Reserved for the day we add a Redis adapter for horizontal scaling.
 * Empty for now — keeping the Server type parameter ready avoids a
 * breaking change when scaling lands.
 */
export interface InterServerEvents {
  ping: () => void;
}

// ─── Per-socket data ─────────────────────────────────────────────────────────

/**
 * Strongly-typed `socket.data` payload. `user` is populated by the auth
 * middleware in `src/sockets/index.ts` after Clerk JWT verification.
 */
export interface SocketData {
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

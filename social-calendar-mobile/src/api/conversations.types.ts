/**
 * Messaging wire types (R18).
 *
 * These mirror the backend response shapes byte-for-byte:
 *   - `social-calendar-api/src/types/socket.types.ts` (MessageWire,
 *     ConversationSummaryWire, InboxItemWire)
 *   - `conversations.service.ts` response shaping.
 *
 * Keep this file in lockstep with that contract — a backend payload change
 * must be reflected here (and surfaced by tsc at every consumer).
 */

export type ConversationType = 'DIRECT' | 'GROUP' | 'EVENT';

/** The safe-to-leak public profile embedded in every messaging payload. */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** A single chat message (ISO `sentAt`). */
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  sentAt: string;
  sender: PublicProfile;
}

/**
 * Header / row shape shared by every conversation kind. `title` is resolved
 * server-side per type (DM → other party, GROUP → group name, EVENT → event
 * title). `participants` carries every member's profile so the client can
 * render the type-specific avatar (R17-3).
 */
export interface ConversationSummary {
  id: string;
  type: ConversationType;
  title: string;
  linkedGroupId: string | null;
  linkedEventId: string | null;
  participants: PublicProfile[];
}

/** Inbox row: summary + preview + sort key + the viewer's unread count (D1). */
export interface InboxItem extends ConversationSummary {
  lastMessage: Message | null;
  lastMessageAt: string;
  unreadCount: number;
}

// ─── Endpoint envelope shapes ────────────────────────────────────────────────

export interface InboxResponse {
  conversations: InboxItem[];
}

export interface ThreadResponse {
  conversation: ConversationSummary;
  messages: Message[];
  nextCursor: string | null;
}

export interface SendMessageResponse {
  message: Message;
}

export interface ConversationResponse {
  conversation: ConversationSummary;
}

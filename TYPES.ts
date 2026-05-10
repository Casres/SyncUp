/**
 * SyncUp Data Type Definitions
 *
 * Source of truth: ANCHOR.pdf v2.5 (2026-04-27).
 * Field names match ANCHOR data shape definitions exactly.
 * Used by: mock data, API stubs, screen props, component props.
 */

import type { HapticType as TokenHapticType } from './TOKENS';

// ============================================================================
// PRIMITIVE UNIONS / ENUMS
// ============================================================================

/**
 * Round 4. Three availability states a user can mark a day as.
 */
export type AvailState = 'free' | 'maybe' | 'busy';

/**
 * Round 2. RSVP status on an event. Null = not yet responded.
 */
export type RSVPStatus = 'yes' | 'maybe' | 'no' | null;

/**
 * Round 4. Audience-targeting modes for a BroadcastRule.
 */
export type AudienceMode = 'everyone' | 'friends' | 'types';

/**
 * Round 3. Friendship lifecycle status.
 */
export type FriendStatus = 'accepted' | 'pending' | 'blocked';

/**
 * Round 4. Privacy: who can find this user.
 */
export type FindableBy = 'everyone' | 'friends-of-friends' | 'username-only';

/**
 * Round 4. Privacy: who can invite this user.
 */
export type InvitableBy = 'everyone' | 'friends' | 'bff-only';

/**
 * Round 4. Quickset id is one of a fixed enum (per ANCHOR Quickset shape).
 */
export type QuicksetId =
  | 'weekends-free'
  | 'weekdays-5pm'
  | 'next30-maybe'
  | 'clear-month';

/**
 * Round 4. Quickset target status. Null = clear (delete keys in window).
 */
export type QuicksetStatus = 'free' | 'maybe' | null;

/**
 * Round 3. Group member role. AdminBar visibility hinges on `'admin'`.
 */
export type GroupRole = 'admin' | 'member';

/**
 * Round 3. Tab on the Group Detail screen.
 */
export type GroupDetailTab = 'members' | 'events' | 'polls' | 'ideas';

/**
 * Round 4. Mode for the Availability Editor screen.
 */
export type AvailabilityMode = 'month' | 'week' | 'day';

/**
 * Round 4. Brush selection in the Availability Editor.
 */
export type AvailabilityBrush = 'free' | 'maybe' | 'busy' | 'clear';

/**
 * Round 4. Theme picker value.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Round 5. Haptic event type. Re-exported from TOKENS.ts; pinned at 6 (R5-8).
 */
export type HapticType = TokenHapticType;

/**
 * Round 5. ErrorState preset kinds.
 */
export type ErrorStateKind = 'network' | 'server' | 'notFound' | 'permission';

/**
 * Round 5. ErrorToast preset kinds.
 */
export type ErrorToastKind = 'rsvp' | 'invite' | 'friend' | 'generic';

/**
 * Round 5. Spinner size token name.
 */
export type SpinnerSizeName = 'XS' | 'SM' | 'MD' | 'LG';

/**
 * Round 3. Add-friend method on the AddFriend screen.
 */
export type AddFriendMethod = 'qr' | 'link' | 'username';

// ============================================================================
// USER & SETTINGS (Round 4)
// ============================================================================

/**
 * Round 4. The current user / profile shape.
 */
export interface UserStats {
  hosted: number;
  attended: number;
  friends: number;
  groups: number;
}

export interface User {
  /** Always 'you' for the local user. */
  id: string;
  name: string;
  /** e.g. '@ben'. */
  handle: string;
  /** Single-letter avatar initial. */
  letter: string;
  bio: string;
  email: string;
  phone: string;
  stats: UserStats;
}

/**
 * Round 4. Per-channel notification preferences. All bools default true
 * EXCEPT availBroadcasts (default false).
 */
export interface NotificationSettings {
  /** Default true. */
  eventInvites: boolean;
  /** Default true. */
  friendRequests: boolean;
  /** Default true. */
  groupInvites: boolean;
  /** Default true. RSVPs on YOUR events. */
  rsvps: boolean;
  /** Default true. */
  eventReminders: boolean;
  /** Default false. Friends broadcasting their availability. */
  availBroadcasts: boolean;
}

/**
 * Round 4. Discoverability + invitability privacy.
 */
export interface PrivacySettings {
  /** Default 'friends-of-friends'. */
  findableBy: FindableBy;
  /** Default 'friends'. */
  invitableBy: InvitableBy;
}

// ============================================================================
// AVAILABILITY (Round 4)
// ============================================================================

/**
 * Round 4. Stored as a flat map: { [iso: 'YYYY-MM-DD']: 'free'|'maybe'|'busy' }.
 * Absent key = unset. Never store nulls — delete on clear (Hard Rule 14).
 * Mock data: PA_AVAIL_DEFAULT covers 30 consecutive days starting today-4.
 */
export type AvailabilityEntry = {
  [iso: string]: AvailState;
};

/**
 * Round 4. One of four predefined Quicksets (pure functions over the
 * AvailabilityEntry map, scoped to sensible windows — Hard Rule 15).
 */
export interface Quickset {
  id: QuicksetId;
  label: string;
  /** One-line description shown under the label. */
  detail: string;
  /** null = clear (delete keys in window). */
  status: QuicksetStatus;
}

// ============================================================================
// BROADCASTS (Round 4)
// ============================================================================

/**
 * Round 4. One rule per state.
 */
export interface BroadcastRule {
  on: boolean;
  audience: AudienceMode;
  /**
   * Friend ids (when 'friends') or FriendType ids (when 'types').
   * Empty array when audience='everyone'.
   */
  targets: string[];
}

/**
 * Round 4. 3-card stacked IA — one rule per state (Hard Rule 12).
 */
export interface BroadcastSettings {
  free: BroadcastRule;
  maybe: BroadcastRule;
  busy: BroadcastRule;
}

// ============================================================================
// FRIENDS & GROUPS (Round 3)
// ============================================================================

/**
 * Round 3. Friend record. `category` is a string id (not an enum) since
 * categories live in FRIEND_CATEGORIES mock data.
 */
export interface Friend {
  id: string;
  name: string;
  /** Single-letter avatar initial. */
  letter: string;
  /** e.g. '@taro'. */
  handle: string;
  /** Category id (e.g. 'bff', 'work', 'gym'). Maps to mock catalog. */
  category: string;
  status: FriendStatus;
  /** Ids of FriendType buckets this friend belongs to. */
  friendTypes: string[];
}

/**
 * Round 3. Friend type (PRIVATE bucket — Hard Rule 8).
 * Was renamed from "FriendGroup" in v2.2.
 */
export interface FriendType {
  id: string;
  label: string;
  /** Member friend ids. */
  members: string[];
}

/**
 * Round 3. Cover artwork descriptor (used by Cover Picker Sheet).
 */
export interface Cover {
  id: string;
  /** Display label for the cover. */
  label: string;
  /** Reference to bundled artwork (path / id / url, depending on impl). */
  art: string;
}

/**
 * Round 3. A SHARED social group (Hard Rule 8).
 */
export interface SocialGroup {
  id: string;
  name: string;
  cover: Cover;
  /** True = private group (PrivateBadge shown). */
  isPrivate: boolean;
  members: GroupMember[];
  /** Whether the local user is admin of this group (drives AdminBar). */
  userRole: GroupRole;
}

/**
 * Round 3. A member entry within a SocialGroup.
 */
export interface GroupMember {
  /** Friend.id, or 'you'. */
  id: string;
  name: string;
  letter: string;
  handle: string;
  role: GroupRole;
}

/**
 * Round 3. A poll attached to a group.
 */
export interface PollOption {
  id: string;
  label: string;
  /** Number of votes. */
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  /** Friend ids that have voted. */
  voters: string[];
  /** Optional: poll close time (iso). */
  closesAt?: string;
}

/**
 * Round 3. An idea/suggestion attached to a group.
 */
export interface Suggestion {
  id: string;
  /** Author friend id. */
  authorId: string;
  text: string;
  /** Friend ids that upvoted. */
  upvotes: string[];
  /** Iso timestamp. */
  createdAt: string;
}

/**
 * Round 3. Shared planning history between two parties.
 */
export interface SharedHistory {
  /** Count of past events together. */
  eventCount: number;
  /** Iso of last event together. */
  lastEventAt?: string;
}

// ============================================================================
// EVENT FLOW (Round 2)
// ============================================================================

/**
 * Round 2. The in-progress event being authored across Step 1 → 2 → 3 → Confirm.
 * Optional `eventIso` is consumed by Step 3 wire-back to consult the
 * AvailabilityEntry map (Round 4 addition).
 */
export interface Draft {
  /** Event title (R5-6: 2-line clamp on render). */
  title: string;
  /** ISO date 'YYYY-MM-DD' — used by Step 3 wire-back. */
  eventIso?: string;
  /** ISO start time. */
  startAt?: string;
  /** ISO end time. */
  endAt?: string;
  /** Free-form location string. */
  location?: string;
  /** Optional: lat/lng pair for MiniMap. */
  geo?: { lat: number; lng: number };
  /** Description (R5-6: 3-line clamp + Read more on render). */
  description?: string;
  /** Friend ids invited so far. */
  inviteeIds: string[];
  /** Glyph/cover artwork id. */
  glyph?: string;
  /** Optional price selector value. */
  price?: number;
}

/**
 * Round 2. A canonical Event. Inferred from Create Event Flow + Event Detail
 * screens (no standalone shape in ANCHOR — assumption noted in
 * DESIGN_HANDOFF_EXPORT_HANDOFF.md).
 */
export interface Event {
  id: string;
  title: string;
  /** Host user id. */
  hostId: string;
  /** ISO date 'YYYY-MM-DD'. */
  iso: string;
  /** ISO start datetime. */
  startAt: string;
  /** ISO end datetime. */
  endAt: string;
  location?: string;
  geo?: { lat: number; lng: number };
  description?: string;
  /** Friend ids invited. */
  inviteeIds: string[];
  /** Map of friend id → RSVPStatus. */
  rsvps: Record<string, RSVPStatus>;
  glyph?: string;
  price?: number;
  /** Optional group id this event was created within. */
  groupId?: string;
}

// ============================================================================
// SUPPORTING / SCREEN-LEVEL TYPES
// ============================================================================

/**
 * Round 5. Empty state component identifier (per Empty inventory).
 */
export type EmptyStateName =
  | 'home-today'
  | 'home-week'
  | 'home-month'
  | 'friends'
  | 'groups'
  | 'search'
  | 'availability'
  | 'attendees'
  | 'polls'
  | 'suggestions'
  | 'mutual-events';

/**
 * Round 5. The flag a Step 3 footer pill renders. Defaults to
 * 'FROM YOUR AVAILABILITY' once wire-back is active.
 */
export type Step3FooterStatus =
  | 'from-availability'
  | 'from-availability-not-set';

/**
 * Round 5. OfflineBar state.
 */
export interface OfflineState {
  online: boolean;
  /** Iso of last successful sync, used to render "LAST SYNCED · 4M AGO". */
  lastSyncedAt?: string;
}

// ============================================================================
// COMPONENT PROP HELPERS
// ============================================================================

/**
 * Round 4. AvailDot status (extends AvailState with null sentinel).
 */
export type AvailDotStatus = AvailState | null;

/**
 * Round 3. Audience picker sheet body mode.
 */
export type AudiencePickerMode = 'friends' | 'types';

/**
 * Round 4. Toast variant — broadcast vs error (drives leading marker).
 */
export type ToastVariant = 'broadcast' | 'error';

// ============================================================================
// EXPLORE (Explore tab — venues + events feed)
// ============================================================================

/**
 * Category filter options for the Explore feed.
 * 'all' is the default — no filter applied.
 */
export type ExploreCategory =
  | 'all'
  | 'bar'
  | 'club'
  | 'restaurant'
  | 'food-truck'
  | 'popup'
  | 'cafe'
  | 'live-music'
  | 'outdoor';

/**
 * Where this venue/event came from.
 * 'eventbrite' — pulled from the Eventbrite Events API.
 * 'google'     — pulled from Google Places API.
 * 'featured'   — paid business listing (our revenue layer).
 */
export type ExploreSource = 'eventbrite' | 'google' | 'featured';

/**
 * A venue or event shown on the Explore screen.
 *
 * Design contract:
 *   - `name`, `category`, `address`, `source` are always present.
 *   - `imageUrl` is optional; ExploreCard shows a placeholder when absent.
 *   - `isFeatured` drives a "Featured" badge and top-of-feed placement.
 *   - `eventDate` is populated for time-specific events (Eventbrite);
 *     absent for evergreen venue listings (Google Places).
 *   - `rating` / `ratingCount` come from Google Places only.
 */
export interface ExploreVenue {
  id: string;
  name: string;
  category: ExploreCategory;
  /** One-paragraph description pre-filled into the event draft. */
  description: string;
  /** Human-readable address. Maps to Draft.location. */
  address: string;
  /** Lat/lng pair. Maps to Draft.geo. */
  geo: { lat: number; lng: number };
  /** Cover photo URL. Fetched from Eventbrite or Google Photos. */
  imageUrl?: string;
  /** Straight-line distance from user's bucketed location, in miles. */
  distanceMiles?: number;
  source: ExploreSource;
  /** Paid listing — shows "Featured" badge and sorts to top of feed. */
  isFeatured: boolean;
  /** Human-readable hours string, e.g. "Mon–Fri 4pm–2am". */
  hours?: string;
  /** Google Places rating 1–5. */
  rating?: number;
  /** Number of Google ratings. */
  ratingCount?: number;
  /**
   * ISO datetime for time-specific events (Eventbrite).
   * Absent for evergreen venue entries (Google Places).
   */
  eventDate?: string;
  /** Deep-link to Eventbrite listing or Google Maps. */
  externalUrl?: string;
}

// ============================================================================
// NOTIFICATIONS (Round 6 / Round 12 — NotifSheet feed)
// ============================================================================

/**
 * Discriminator for a notification entry. Each card kind is a separate
 * type in the `Notif` union below. Spec sources:
 *   - R6-1 / R6-2 / R6-7 (NotifSheet surface + day grouping)
 *   - R12-1 (sheet collapses on navigating tap)
 *   - SPEC-R12-NotifRouting.txt (per-card destinations)
 */
export type NotifType =
  | 'rsvp'
  | 'event_reminder'
  | 'co_host'
  | 'co_host_revoked'
  | 'group_activity'
  | 'inbound_broadcast'
  | 'friend_request'
  | 'group_invite';

/**
 * Subset of RSVPStatus used by RsvpNotif. A notif represents a response
 * that already happened, so `null` (no-response) is excluded.
 */
export type NotifRsvpStatus = Exclude<RSVPStatus, null>;

/** Common fields on every notif card. */
export interface BaseNotif {
  id: string;
  type: NotifType;
  read: boolean;
  /** ISO-8601 timestamp. Used for R6-7 day grouping + R7-4 30-day purge. */
  createdAt: string;
}

/**
 * "Sam said yes to Dinner Friday" — a friend RSVP'd to your event.
 * Tap → Event Detail (R12-1).
 */
export interface RsvpNotif extends BaseNotif {
  type: 'rsvp';
  actorId: string;
  actorName: string;
  actorHandle: string;
  /** Single character for RingAvatar letter. */
  actorInitial: string;
  eventId: string;
  eventName: string;
  rsvpStatus: NotifRsvpStatus;
}

/**
 * "Dinner Friday is coming up" — reminder for an upcoming event.
 * Tap → Event Detail (R12-1).
 */
export interface EventReminderNotif extends BaseNotif {
  type: 'event_reminder';
  eventId: string;
  eventName: string;
  /** ISO-8601 datetime the event starts. */
  eventStartsAt: string;
}

/**
 * "Maya made you a co-host of Dinner Friday."
 * Tap → Event Detail (R12-1).
 */
export interface CoHostNotif extends BaseNotif {
  type: 'co_host';
  actorId: string;
  actorName: string;
  actorHandle: string;
  actorInitial: string;
  eventId: string;
  eventName: string;
}

/**
 * "Maya removed you as co-host of Dinner Friday."
 * Informational only — no navigation, no chevron.
 */
export interface CoHostRevokedNotif extends BaseNotif {
  type: 'co_host_revoked';
  actorId: string;
  actorName: string;
  actorInitial: string;
  eventId: string;
  eventName: string;
}

/**
 * "New activity in Climbing Crew" — generic group-feed bump.
 * Tap → Group Detail on Friends/Groups segment (R12-1).
 */
export interface GroupActivityNotif extends BaseNotif {
  type: 'group_activity';
  groupId: string;
  groupName: string;
  /** Single character for the group cover-art avatar tile. */
  groupInitial: string;
  /** Plain-text summary of what happened (matches push copy verbatim per R7-5). */
  summary: string;
}

/**
 * "Ana is free tonight" — broadcast received from a friend.
 * Body tap → Friend Profile (light haptic — already locked).
 * "Plan something" pill → Create Event Step 1, friend pre-selected.
 * R6-3: receiving a broadcast NEVER fires a haptic.
 */
export interface InboundBroadcastNotif extends BaseNotif {
  type: 'inbound_broadcast';
  actorId: string;
  actorName: string;
  actorHandle: string;
  actorInitial: string;
  /** Avail state being broadcast. */
  state: AvailState;
  /** Free-text broadcast message ("Free tonight if anyone wants to grab dinner"). */
  message: string;
}

/**
 * "Maya wants to be friends" — pending inbound friend request.
 * In-place actions only (Accept / Decline). Sheet does NOT dismiss.
 */
export interface FriendRequestNotif extends BaseNotif {
  type: 'friend_request';
  actorId: string;
  actorName: string;
  actorHandle: string;
  actorInitial: string;
}

/**
 * "Maya invited you to Climbing Crew."
 * In-place actions only (Join / Decline). Sheet does NOT dismiss.
 */
export interface GroupInviteNotif extends BaseNotif {
  type: 'group_invite';
  actorId: string;
  actorName: string;
  actorInitial: string;
  groupId: string;
  groupName: string;
}

/** Union of every concrete notif kind. */
export type Notif =
  | RsvpNotif
  | EventReminderNotif
  | CoHostNotif
  | CoHostRevokedNotif
  | GroupActivityNotif
  | InboundBroadcastNotif
  | FriendRequestNotif
  | GroupInviteNotif;

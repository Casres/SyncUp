/**
 * TEMPORARY type augmentation for the new Prisma models introduced in
 * migration `20260525000001_notif_avail_broadcast`.
 *
 * Why this file exists:
 *   The schema was updated in this branch to add `Notification`,
 *   `BroadcastSettings`, the `AvailState` enum, and the `state` column on
 *   `UserAvailability`. `npx prisma generate` must be re-run on a host
 *   with network access before the generated `@prisma/client` types
 *   pick those up. Until then, this file plugs the gap so `tsc --noEmit`
 *   stays clean across the rest of the codebase.
 *
 * After `prisma generate` runs against the new schema:
 *   The real generated types will declare the same enums, model rows,
 *   and delegates. The declarations here are module-merged with the
 *   generated ones — duplicates are tolerated by TypeScript provided
 *   the shapes match. This file can be deleted at that point, but
 *   leaving it in place is also safe.
 *
 * Scope:
 *   Only the surface the new code reaches for. Do NOT extend this for
 *   unrelated tables — generated code is the source of truth.
 */
import type { NotifChannel, AvailabilityGranularity } from '@prisma/client';

declare module '@prisma/client' {
  // ── New enums ───────────────────────────────────────────────────────────

  export const AvailState: {
    readonly FREE: 'FREE';
    readonly MAYBE: 'MAYBE';
    readonly BUSY: 'BUSY';
  };
  export type AvailState = (typeof AvailState)[keyof typeof AvailState];

  export const NotifType: {
    readonly RSVP: 'RSVP';
    readonly EVENT_REMINDER: 'EVENT_REMINDER';
    readonly CO_HOST: 'CO_HOST';
    readonly CO_HOST_REVOKED: 'CO_HOST_REVOKED';
    readonly GROUP_ACTIVITY: 'GROUP_ACTIVITY';
    readonly INBOUND_BROADCAST: 'INBOUND_BROADCAST';
    readonly FRIEND_REQUEST: 'FRIEND_REQUEST';
    readonly GROUP_INVITE: 'GROUP_INVITE';
  };
  export type NotifType = (typeof NotifType)[keyof typeof NotifType];

  export const BroadcastAudienceMode: {
    readonly EVERYONE: 'EVERYONE';
    readonly FRIENDS: 'FRIENDS';
    readonly TYPES: 'TYPES';
  };
  export type BroadcastAudienceMode =
    (typeof BroadcastAudienceMode)[keyof typeof BroadcastAudienceMode];

  // ── New model row shapes ────────────────────────────────────────────────

  export interface NotificationModel {
    id: string;
    userId: string;
    type: NotifType;
    read: boolean;
    payload: unknown;
    groupKey: string | null;
    dismissedAt: Date | null;
    mutedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface BroadcastSettingsModel {
    id: string;
    userId: string;
    freeOn: boolean;
    freeAudience: BroadcastAudienceMode;
    freeTargets: unknown;
    maybeOn: boolean;
    maybeAudience: BroadcastAudienceMode;
    maybeTargets: unknown;
    busyOn: boolean;
    busyAudience: BroadcastAudienceMode;
    busyTargets: unknown;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface UserAvailabilityModel {
    id: string;
    userId: string;
    windowStart: Date;
    windowEnd: Date;
    granularity: AvailabilityGranularity;
    state: AvailState | null;
    notifOnChange: boolean;
    notifChannel: NotifChannel | null;
    createdAt: Date;
    updatedAt: Date;
  }
}

export {};

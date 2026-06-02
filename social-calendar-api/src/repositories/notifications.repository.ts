import { Prisma } from '@prisma/client';
import type {
  NotifType,
  Notification,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import type { Db } from './_types.js';

/**
 * Notifications repository.
 *
 * The new `Notification` table was added in migration
 * `20260525000001_notif_avail_broadcast`. RLS policies on the table
 * filter every read/write by `userId = current_app_user_id()`, so
 * passing `userId` into queries here is belt-and-braces — the policy is
 * the authoritative gate. We still pass it explicitly so the WHERE
 * clause is intent-clear and so unit tests against the migration-owner
 * client also enforce ownership.
 *
 * Cross-user write (`create`) is intentionally routed through the
 * migration-owner `prisma` client, NOT the per-request transaction.
 * Notifications are by definition written FROM one user TO another, so
 * the per-request app-role transaction (which sets app.current_user_id
 * to the SENDER) would fail the recipient-owner WITH CHECK that the
 * other Notification policies share. See migration
 * 20260601000001_fix_notification_insert_rls for full rationale. The
 * dispatch flow's service-layer checks (only event organisers can send
 * invites, only invite recipients can RSVP, etc.) gate WHO can write
 * a notification, so bypassing RLS here is a contained surgical fix.
 */

// Until `prisma generate` runs against the new schema, the `Db` type
// has no `notification` delegate. We funnel the cast through a single
// helper so the boundary is auditable in one place. Once the client is
// regenerated, this cast becomes a no-op and can be deleted.
//
// (Prisma's generated delegate is wider than what we use here. The
// shape matches the calls below — `findMany`, `findFirst`, `create`,
// `count`, `updateMany`. Argument shapes mirror what the generator
// produces.)
type NotificationDelegate = {
  findMany(args: {
    where?: NotifWhere;
    orderBy?: { createdAt?: 'asc' | 'desc' };
    take?: number;
    skip?: number;
  }): Promise<Notification[]>;

  findFirst(args: {
    where: { id: string; userId?: string; dismissedAt?: null };
  }): Promise<Notification | null>;

  count(args?: { where?: NotifWhere }): Promise<number>;

  create(args: {
    data: {
      userId: string;
      type: NotifType;
      payload: Prisma.InputJsonValue;
      groupKey?: string | null;
      read?: boolean;
    };
  }): Promise<Notification>;

  updateMany(args: {
    where: NotifWhere;
    data: {
      read?: boolean;
      dismissedAt?: Date | null;
      mutedAt?: Date | null;
    };
  }): Promise<{ count: number }>;
};

type NotifWhere = {
  id?: string;
  userId?: string;
  read?: boolean;
  dismissedAt?: null | { not: null };
  mutedAt?: null | { not: null };
  type?: NotifType;
};

function notif(db: Db): NotificationDelegate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).notification as NotificationDelegate;
}

export type ListNotificationsFilters = {
  userId: string;
  /** Optional. When true, includes dismissed rows (default false). */
  includeDismissed?: boolean;
  /** Optional read-status filter. Omit to return both. */
  read?: boolean;
  /** Page size. Default 50, max 100 — controller validates. */
  limit: number;
  /** Offset for paging. Default 0. */
  offset?: number;
};

export type CreateNotificationData = {
  userId: string;
  type: NotifType;
  payload: Record<string, unknown>;
  groupKey?: string | null;
};

export const notificationsRepository = {
  /**
   * List notifications for the given user, newest first. By default
   * dismissed rows are excluded — the mobile NotifSheet treats dismiss
   * as a soft-delete.
   */
  list(db: Db, filters: ListNotificationsFilters) {
    const where: NotifWhere = {
      userId: filters.userId,
      ...(filters.includeDismissed ? {} : { dismissedAt: null }),
      ...(filters.read !== undefined ? { read: filters.read } : {}),
    };
    return notif(db).findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      skip: filters.offset ?? 0,
    });
  },

  /**
   * Unread count for the bell badge. Excludes dismissed rows.
   */
  unreadCount(db: Db, userId: string) {
    return notif(db).count({
      where: { userId, read: false, dismissedAt: null },
    });
  },

  /**
   * Find a single notification by id. RLS + the explicit `userId`
   * filter both gate ownership. Returns null if the row is missing,
   * dismissed, or invisible.
   */
  findById(db: Db, id: string, userId: string) {
    return notif(db).findFirst({
      where: { id, userId, dismissedAt: null },
    });
  },

  /**
   * Insert a new notification. The service is responsible for shaping
   * the payload to match the mobile `Notif` discriminated union for
   * the chosen `type`.
   *
   * Routes through the migration-owner `prisma` client (NOT the per-
   * request transaction) so the row's `userId` (recipient) does not need
   * to equal `current_app_user_id()` (sender). The `_db` parameter is
   * retained for call-site readability and to preserve the symmetry of
   * other repository methods, but is intentionally unused.
   *
   * Trade-off: the notification row commits independently of the calling
   * request's transaction. For the dispatch flow this is correct — the
   * notification is a fire-and-forget side effect, mirrored by the
   * `io.emit` call in the service which is also outside the transaction.
   */
  create(_db: Db, data: CreateNotificationData) {
    return notif(prisma).create({
      data: {
        userId: data.userId,
        type: data.type,
        payload: data.payload as Prisma.InputJsonValue,
        groupKey: data.groupKey ?? null,
      },
    });
  },

  /**
   * Mark a single notification read. Idempotent — returns the row
   * count for the controller to decide on 204 vs 404.
   */
  async markRead(db: Db, id: string, userId: string) {
    const result = await notif(db).updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return result.count;
  },

  /**
   * Mark every (non-dismissed) notification read for this user.
   */
  async markAllRead(db: Db, userId: string) {
    const result = await notif(db).updateMany({
      where: { userId, read: false, dismissedAt: null },
      data: { read: true },
    });
    return result.count;
  },

  /**
   * Soft-delete a single notification. Idempotent.
   */
  async dismiss(db: Db, id: string, userId: string) {
    const result = await notif(db).updateMany({
      where: { id, userId, dismissedAt: null },
      data: { dismissedAt: new Date() },
    });
    return result.count;
  },

  /**
   * Mute a single notification (swipe-mute affordance on the mobile
   * NotifSheet). Idempotent — re-muting is a no-op.
   */
  async mute(db: Db, id: string, userId: string) {
    const result = await notif(db).updateMany({
      where: { id, userId, mutedAt: null },
      data: { mutedAt: new Date() },
    });
    return result.count;
  },
};

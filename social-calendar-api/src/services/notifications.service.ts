import type { Server } from 'socket.io';
import { NotifType } from '@prisma/client';
import type { Notification } from '@prisma/client';
import {
  notificationsRepository,
  type CreateNotificationData,
  type ListNotificationsFilters,
} from '../repositories/notifications.repository.js';
import type { Db } from '../repositories/_types.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  NotifPayload,
  ServerToClientEvents,
  SocketData,
} from '../types/socket.types.js';

type IoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ─── Domain errors ────────────────────────────────────────────────────────

export class NotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification ${id} not found`);
    this.name = 'NotificationNotFoundError';
  }
}

// ─── Response shaping ─────────────────────────────────────────────────────

/**
 * Convert the row (with JSON payload) into the wire shape — the mobile
 * `Notif` union expects the type-specific fields hoisted to the top
 * level alongside `id`, `type`, `read`, `createdAt`. The payload column
 * stores those extra fields verbatim.
 */
function toPayload(row: Notification): NotifPayload {
  const body =
    typeof row.payload === 'object' && row.payload !== null
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    type: row.type,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
    ...body,
  };
}

export const notificationsService = {
  /**
   * List for the current user. Newest first. Defaults limit=50.
   */
  async list(db: Db, filters: ListNotificationsFilters) {
    const rows = await notificationsRepository.list(db, filters);
    return rows.map(toPayload);
  },

  unreadCount(db: Db, userId: string) {
    return notificationsRepository.unreadCount(db, userId);
  },

  async markRead(db: Db, id: string, userId: string) {
    const count = await notificationsRepository.markRead(db, id, userId);
    if (count === 0) throw new NotificationNotFoundError(id);
  },

  async markAllRead(db: Db, userId: string) {
    const count = await notificationsRepository.markAllRead(db, userId);
    return { count };
  },

  /**
   * Soft-delete a notification AND push a `notif:dismissed` event to
   * the user's own socket room — handy for multi-device sync.
   */
  async dismiss(db: Db, id: string, userId: string, io?: IoServer) {
    const count = await notificationsRepository.dismiss(db, id, userId);
    if (count === 0) throw new NotificationNotFoundError(id);
    if (io) {
      io.to(`user:${userId}`).emit('notif:dismissed', {
        notificationId: id,
      });
    }
  },

  async mute(db: Db, id: string, userId: string) {
    const count = await notificationsRepository.mute(db, id, userId);
    if (count === 0) throw new NotificationNotFoundError(id);
  },

  /**
   * Server-side helper for other services to dispatch a notification
   * AFTER their REST transaction commits. Callers (e.g. friends'
   * sendRequest, events' invite RSVP) hand us the recipient userId,
   * a `NotifType`, and the per-type payload shape — we persist the row
   * and fan out the socket event.
   *
   * Returns the wire-shape payload so the caller can choose to
   * acknowledge with it.
   */
  async dispatch(
    db: Db,
    io: IoServer | undefined,
    data: CreateNotificationData,
  ): Promise<NotifPayload> {
    const row = await notificationsRepository.create(db, data);
    const payload = toPayload(row);
    if (io) {
      io.to(`user:${data.userId}`).emit('notif:new', {
        notification: payload,
      });
    }
    return payload;
  },
};

// Re-export NotifType so other domains can dispatch without importing
// from `@prisma/client` directly — matches the pattern other services
// use for InviteStatus etc.
export { NotifType };

/**
 * Notifications domain — integration tests.
 *
 * Tests the REST surface added by the Notifications agent
 * (2026-05-25). The new `Notification` table came in migration
 * `20260525000001_notif_avail_broadcast`. Socket emission is exercised
 * implicitly via `dismiss` (service drops the emit when `io` is
 * undefined — the test environment doesn't bring up Socket.io).
 *
 * Response shapes verified against
 * `src/controllers/notifications.controller.ts`:
 *   - GET /notifications → 200 { notifications: NotifPayload[], unreadCount: number }
 *   - POST /notifications/:id/read → 204
 *   - POST /notifications/read-all → 200 { count: number }
 *   - DELETE /notifications/:id → 204
 *   - POST /notifications/:id/mute → 204
 */
import supertest from 'supertest';
import { closeApp, getApp } from '../setup/app-factory.js';
import {
  disconnectTestDb,
  testPrisma,
  truncateAll,
} from '../setup/db-helpers.js';
import { authHeader, TEST_USER_SEED } from '../setup/auth-helpers.js';

describe('Notifications domain — integration', () => {
  let app: Awaited<ReturnType<typeof getApp>>;
  let userId: string;

  beforeAll(async () => {
    app = await getApp();
    await truncateAll();
    const user = await testPrisma.user.create({ data: TEST_USER_SEED });
    userId = user.id;
  });

  afterAll(async () => {
    await truncateAll();
    await closeApp();
    await disconnectTestDb();
  });

  // ── GET /notifications ────────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('returns a wrapped notifications array + unread count', async () => {
      const res = await supertest(app.server)
        .get('/notifications')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(typeof res.body.unreadCount).toBe('number');
    });

    it('returns 401 when no Authorization header is provided', async () => {
      const res = await supertest(app.server).get('/notifications');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /notifications/:id/read ──────────────────────────────────────

  describe('POST /notifications/:id/read', () => {
    it('marks the notification read (204) and removes it from the unread count', async () => {
      // Direct insert via the migration-owner client. The
      // `Notification` delegate exists once `prisma generate` runs
      // against the new schema; the runtime cast below mirrors the
      // pattern used by the repository.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await (testPrisma as any).notification.create({
        data: {
          userId,
          type: 'EVENT_REMINDER',
          payload: { eventId: 'evt-1', eventName: 'Coffee', eventStartsAt: new Date().toISOString() },
        },
      });

      const before = await supertest(app.server)
        .get('/notifications')
        .set(authHeader());
      expect(before.body.unreadCount).toBeGreaterThanOrEqual(1);

      const res = await supertest(app.server)
        .post(`/notifications/${created.id}/read`)
        .set(authHeader());
      expect(res.status).toBe(204);

      const after = await supertest(app.server)
        .get('/notifications')
        .set(authHeader());
      expect(after.body.unreadCount).toBe(before.body.unreadCount - 1);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await supertest(app.server)
        .post('/notifications/notarealid/read')
        .set(authHeader());
      expect(res.status).toBe(404);
    });
  });

  // ── POST /notifications/read-all ──────────────────────────────────────

  describe('POST /notifications/read-all', () => {
    it('marks every unread notification read and returns the count', async () => {
      const res = await supertest(app.server)
        .post('/notifications/read-all')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe('number');

      const after = await supertest(app.server)
        .get('/notifications')
        .set(authHeader());
      expect(after.body.unreadCount).toBe(0);
    });
  });

  // ── DELETE /notifications/:id ─────────────────────────────────────────

  describe('DELETE /notifications/:id', () => {
    it('dismisses the notification (204) and hides it from the list', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await (testPrisma as any).notification.create({
        data: {
          userId,
          type: 'FRIEND_REQUEST',
          payload: {
            actorId: 'u2',
            actorName: 'Maya',
            actorHandle: '@maya',
            actorInitial: 'M',
          },
        },
      });

      const res = await supertest(app.server)
        .delete(`/notifications/${created.id}`)
        .set(authHeader());
      expect(res.status).toBe(204);

      const after = await supertest(app.server)
        .get('/notifications')
        .set(authHeader());
      const ids = (after.body.notifications as Array<{ id: string }>).map(
        (n) => n.id,
      );
      expect(ids).not.toContain(created.id);
    });
  });

  // ── POST /notifications/:id/mute ──────────────────────────────────────

  describe('POST /notifications/:id/mute', () => {
    it('mutes the notification (204)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await (testPrisma as any).notification.create({
        data: {
          userId,
          type: 'GROUP_ACTIVITY',
          payload: {
            groupId: 'g1',
            groupName: 'Crew',
            groupInitial: 'C',
            summary: 'New poll',
          },
        },
      });

      const res = await supertest(app.server)
        .post(`/notifications/${created.id}/mute`)
        .set(authHeader());
      expect(res.status).toBe(204);
    });
  });
});

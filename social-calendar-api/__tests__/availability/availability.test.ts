/**
 * Availability domain — integration tests.
 *
 * The `UserAvailability` table gained a `state` column + unique
 * `(userId, windowStart, granularity)` index in migration
 * `20260525000001_notif_avail_broadcast`. `BroadcastSettings` is new
 * in the same migration.
 *
 * Wire shape: the mobile contract uses lowercase 'free' | 'maybe' |
 * 'busy' and broadcast-settings audience values
 * 'everyone' | 'friends' | 'types'. The controller normalises to the
 * Prisma enums on write and back to lowercase on read — these tests
 * exercise the lowercase wire shape end-to-end.
 *
 * Endpoint reference (per `src/routes/availability.routes.ts`):
 *   GET    /availability/me              → AvailabilityEntry (lowercase)
 *   PUT    /availability/me              → 204 (body: full map)
 *   PATCH  /availability/me              → 204 (body: partial map, null clears)
 *   PUT    /availability/me/:date        → 204
 *   GET    /availability/broadcasts      → BroadcastSettings
 *   PUT    /availability/broadcasts      → 204
 *   GET    /availability/:userId         → AvailabilityEntry | 403 if blocked
 */
import supertest from 'supertest';
import { closeApp, getApp } from '../setup/app-factory.js';
import {
  disconnectTestDb,
  testPrisma,
  truncateAll,
} from '../setup/db-helpers.js';
import { authHeader, TEST_USER_SEED } from '../setup/auth-helpers.js';

describe('Availability domain — integration', () => {
  let app: Awaited<ReturnType<typeof getApp>>;
  let callerUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    app = await getApp();
    await truncateAll();
    const caller = await testPrisma.user.create({ data: TEST_USER_SEED });
    const other = await testPrisma.user.create({
      data: {
        clerkId: 'test_clerk_other_id',
        username: 'otheruser',
        displayName: 'Other User',
      },
    });
    callerUserId = caller.id;
    otherUserId = other.id;
  });

  afterAll(async () => {
    await truncateAll();
    await closeApp();
    await disconnectTestDb();
  });

  // ── GET /availability/me ──────────────────────────────────────────────

  describe('GET /availability/me', () => {
    it('returns an empty map when nothing has been set', async () => {
      const res = await supertest(app.server)
        .get('/availability/me')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
  });

  // ── PUT /availability/me ──────────────────────────────────────────────

  describe('PUT /availability/me', () => {
    it('replaces the full map and survives a round trip', async () => {
      const put = await supertest(app.server)
        .put('/availability/me')
        .set(authHeader())
        .send({
          '2026-06-01': 'free',
          '2026-06-02': 'maybe',
          '2026-06-03': 'busy',
        });
      expect(put.status).toBe(204);

      const get = await supertest(app.server)
        .get('/availability/me')
        .set(authHeader());
      expect(get.status).toBe(200);
      expect(get.body).toEqual({
        '2026-06-01': 'free',
        '2026-06-02': 'maybe',
        '2026-06-03': 'busy',
      });
    });

    it('rejects a body with a malformed ISO key', async () => {
      const res = await supertest(app.server)
        .put('/availability/me')
        .set(authHeader())
        .send({ 'not-a-date': 'free' });
      expect(res.status).toBe(400);
    });
  });

  // ── PUT /availability/me/:date ────────────────────────────────────────

  describe('PUT /availability/me/:date', () => {
    it('sets a single day', async () => {
      const res = await supertest(app.server)
        .put('/availability/me/2026-06-10')
        .set(authHeader())
        .send({ state: 'maybe' });
      expect(res.status).toBe(204);

      const get = await supertest(app.server)
        .get('/availability/me')
        .set(authHeader());
      expect(get.body['2026-06-10']).toBe('maybe');
    });

    it('clears a single day when state=null', async () => {
      // first set it
      await supertest(app.server)
        .put('/availability/me/2026-06-11')
        .set(authHeader())
        .send({ state: 'busy' });

      // now clear it
      const res = await supertest(app.server)
        .put('/availability/me/2026-06-11')
        .set(authHeader())
        .send({ state: null });
      expect(res.status).toBe(204);

      const get = await supertest(app.server)
        .get('/availability/me')
        .set(authHeader());
      expect(get.body['2026-06-11']).toBeUndefined();
    });
  });

  // ── GET /availability/:userId (block contract) ────────────────────────

  describe('GET /availability/:userId', () => {
    it('returns 403 when the target has blocked the caller', async () => {
      // The other user blocks the caller — they're the blocker.
      await testPrisma.availabilityBlock.create({
        data: { blockerId: otherUserId, blockedId: callerUserId },
      });

      const res = await supertest(app.server)
        .get(`/availability/${otherUserId}`)
        .set(authHeader());
      expect(res.status).toBe(403);
    });
  });

  // ── /availability/broadcasts ──────────────────────────────────────────

  describe('Broadcast settings', () => {
    it('returns a default (all-off) settings blob when none has been saved', async () => {
      const res = await supertest(app.server)
        .get('/availability/broadcasts')
        .set(authHeader());
      expect(res.status).toBe(200);
      expect(res.body.free.on).toBe(false);
      expect(res.body.maybe.on).toBe(false);
      expect(res.body.busy.on).toBe(false);
    });

    it('round-trips a full broadcast settings blob', async () => {
      const settings = {
        free: { on: true, audience: 'friends', targets: [otherUserId] },
        maybe: { on: false, audience: 'everyone', targets: [] },
        busy: { on: false, audience: 'types', targets: ['type-1'] },
      };

      const put = await supertest(app.server)
        .put('/availability/broadcasts')
        .set(authHeader())
        .send(settings);
      expect(put.status).toBe(204);

      const get = await supertest(app.server)
        .get('/availability/broadcasts')
        .set(authHeader());
      expect(get.body.free).toEqual(settings.free);
      expect(get.body.maybe).toEqual(settings.maybe);
      expect(get.body.busy).toEqual(settings.busy);
    });
  });
});

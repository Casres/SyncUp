/**
 * Friends domain — integration tests.
 *
 * Friend-request flows need TWO User rows. The Clerk mock returns a
 * single test identity, so we pre-create:
 *   - Test User    (the authenticated caller — `TEST_USER_SEED`)
 *   - Friend User  (the recipient)
 *
 * We then exercise:
 *   - POST /friends/requests           caller → friend (caller is initiator)
 *   - PATCH /friends/requests/:id       to accept, the caller must be the
 *                                       receiver — so we create the
 *                                       PENDING row with friend → caller
 *                                       directly via testPrisma.
 *
 * Endpoint paths verified against `src/routes/friends.routes.ts` and
 * response shapes verified against `src/controllers/friends.controller.ts`.
 *
 * Notes:
 *   - GET /friends → 200 { friends: [...] }
 *   - GET /friends/requests → 200 { requests: [...] }
 *   - POST /friends/requests → 201 FriendshipResponse (rejects self-request 400, duplicates 409)
 *   - PATCH /friends/requests/:id → 200 FriendshipResponse for accept; 200 { id, status: "DECLINED" } for decline
 *
 * test.todo entries correspond to FRIENDS_HANDOFF.md §5 (no
 * "outgoing-requests" endpoint) and the friend-groups domain whose
 * routes live under `/friend-groups` (covered by their own future suite).
 */
import supertest from 'supertest';
import { closeApp, getApp } from '../setup/app-factory.js';
import {
  disconnectTestDb,
  testPrisma,
  truncateAll,
} from '../setup/db-helpers.js';
import { authHeader, TEST_USER_SEED } from '../setup/auth-helpers.js';

describe('Friends domain — integration', () => {
  let app: Awaited<ReturnType<typeof getApp>>;
  let callerUserId: string;
  let friendUserId: string;

  beforeAll(async () => {
    app = await getApp();
    await truncateAll();
    const caller = await testPrisma.user.create({ data: TEST_USER_SEED });
    const friend = await testPrisma.user.create({
      data: {
        clerkId: 'test_clerk_friend_id',
        username: 'frienduser',
        displayName: 'Friend User',
      },
    });
    callerUserId = caller.id;
    friendUserId = friend.id;
  });

  afterAll(async () => {
    await truncateAll();
    await closeApp();
    await disconnectTestDb();
  });

  // ── GET /friends ───────────────────────────────────────────────────────────

  describe('GET /friends', () => {
    it('returns 200 with a friends array (wrapped)', async () => {
      const res = await supertest(app.server)
        .get('/friends')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.friends)).toBe(true);
    });
  });

  // ── POST /friends/requests ─────────────────────────────────────────────────

  describe('POST /friends/requests', () => {
    it('creates a PENDING friendship (caller as initiator) and returns 201', async () => {
      const res = await supertest(app.server)
        .post('/friends/requests')
        .set(authHeader())
        .send({ recipientId: friendUserId });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        initiatorId: callerUserId,
        receiverId: friendUserId,
        status: 'PENDING',
      });
      expect(res.body.id).toBeDefined();
    });
  });

  // ── PATCH /friends/requests/:id (accept) ──────────────────────────────────

  describe('PATCH /friends/requests/:id', () => {
    it('accepts a request the caller is the receiver of and returns 200 with ACCEPTED', async () => {
      // Tear down any prior friendship between the two users so the
      // unique([initiatorId, receiverId]) constraint doesn't collide.
      await testPrisma.friendship.deleteMany({
        where: {
          OR: [
            { initiatorId: callerUserId, receiverId: friendUserId },
            { initiatorId: friendUserId, receiverId: callerUserId },
          ],
        },
      });

      // Friend → Caller PENDING request, so the caller is the receiver
      // and is allowed to accept.
      const pending = await testPrisma.friendship.create({
        data: {
          initiatorId: friendUserId,
          receiverId: callerUserId,
          status: 'PENDING',
        },
      });

      const res = await supertest(app.server)
        .patch(`/friends/requests/${pending.id}`)
        .set(authHeader())
        .send({ action: 'accept' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: pending.id, status: 'ACCEPTED' });
    });
  });

  // ── DELETE /friends/:id ────────────────────────────────────────────────────

  describe('DELETE /friends/:id', () => {
    it('returns 404 for a non-existent friendship', async () => {
      const res = await supertest(app.server)
        .delete('/friends/no-such-friendship-id')
        .set(authHeader());

      expect(res.status).toBe(404);
    });
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await supertest(app.server).get('/friends');
      expect(res.status).toBe(401);
    });
  });

  // ── Deferred ───────────────────────────────────────────────────────────────

  test.todo(
    'GET /friends/requests/outgoing — outgoing requests endpoint deferred (FRIENDS_HANDOFF §5)',
  );
  test.todo(
    'POST /friend-groups — friend-groups domain has its own future test suite',
  );
});

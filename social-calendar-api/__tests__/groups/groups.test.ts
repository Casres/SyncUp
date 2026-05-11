/**
 * Groups domain — integration tests.
 *
 * Pre-creates two users (caller + a second user we add to the group)
 * because adding a member requires a real `User.id` to exist.
 *
 * Endpoint paths verified against `src/routes/groups.routes.ts` and
 * response shapes verified against `src/controllers/groups.controller.ts`.
 *
 * Important shapes:
 *   - GET /groups → 200 { groups: [...] }
 *   - POST /groups → 201 GroupResponse
 *   - POST /groups/:id/members → 201 MemberResponse
 *   - POST /groups/:id/polls → 201 PollResponse
 *   - POST /groups/:id/polls/:pollId/options/:optionId/vote → 201 (no body)
 *
 * test.todo entries correspond to GROUPS_HANDOFF.md §9 (no PUT-style
 * single-select vote endpoint) and the suggestions sub-feature whose
 * fuller exercise is left for a domain author.
 */
import supertest from 'supertest';
import { closeApp, getApp } from '../setup/app-factory.js';
import {
  disconnectTestDb,
  testPrisma,
  truncateAll,
} from '../setup/db-helpers.js';
import { authHeader, TEST_USER_SEED } from '../setup/auth-helpers.js';

describe('Groups domain — integration', () => {
  let app: Awaited<ReturnType<typeof getApp>>;
  let secondUserId: string;

  beforeAll(async () => {
    app = await getApp();
    await truncateAll();
    await testPrisma.user.create({ data: TEST_USER_SEED });
    const second = await testPrisma.user.create({
      data: {
        clerkId: 'test_clerk_second_id',
        username: 'seconduser',
        displayName: 'Second User',
      },
    });
    secondUserId = second.id;
  });

  afterAll(async () => {
    await truncateAll();
    await closeApp();
    await disconnectTestDb();
  });

  // ── GET /groups ────────────────────────────────────────────────────────────

  describe('GET /groups', () => {
    it('returns 200 with a wrapped groups array', async () => {
      const res = await supertest(app.server)
        .get('/groups')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.groups)).toBe(true);
    });
  });

  // ── POST /groups ───────────────────────────────────────────────────────────

  describe('POST /groups', () => {
    it('creates a group (caller becomes ADMIN atomically) and returns 201', async () => {
      const res = await supertest(app.server)
        .post('/groups')
        .set(authHeader())
        .send({ name: 'Jest Test Group' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'Jest Test Group',
        viewerRole: 'ADMIN',
      });
      expect(res.body.id).toBeDefined();
    });
  });

  // ── POST /groups/:id/members ──────────────────────────────────────────────

  describe('POST /groups/:id/members', () => {
    it('adds a member to the group and returns 201', async () => {
      const groupRes = await supertest(app.server)
        .post('/groups')
        .set(authHeader())
        .send({ name: 'Group With Member' });
      const groupId = groupRes.body.id;

      const res = await supertest(app.server)
        .post(`/groups/${groupId}/members`)
        .set(authHeader())
        .send({ userId: secondUserId });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        socialGroupId: groupId,
        userId: secondUserId,
        role: 'MEMBER',
      });
    });
  });

  // ── POST /groups/:id/polls ────────────────────────────────────────────────

  describe('POST /groups/:id/polls', () => {
    it('creates a poll and returns 201 with options', async () => {
      const groupRes = await supertest(app.server)
        .post('/groups')
        .set(authHeader())
        .send({ name: 'Group With Poll' });
      const groupId = groupRes.body.id;

      const res = await supertest(app.server)
        .post(`/groups/${groupId}/polls`)
        .set(authHeader())
        .send({
          question: 'Friday or Saturday?',
          options: ['Friday', 'Saturday'],
        });

      expect(res.status).toBe(201);
      expect(res.body.question).toBe('Friday or Saturday?');
      expect(Array.isArray(res.body.options)).toBe(true);
      expect(res.body.options).toHaveLength(2);
    });
  });

  // ── POST /groups/:id/polls/:pollId/options/:optionId/vote ─────────────────

  describe('POST /groups/:id/polls/:pollId/options/:optionId/vote', () => {
    it('casts a vote on an option and returns 201', async () => {
      const groupRes = await supertest(app.server)
        .post('/groups')
        .set(authHeader())
        .send({ name: 'Group For Voting' });
      const groupId = groupRes.body.id;

      const pollRes = await supertest(app.server)
        .post(`/groups/${groupId}/polls`)
        .set(authHeader())
        .send({
          question: 'Pick a venue',
          options: ['A', 'B'],
        });
      const pollId = pollRes.body.id;
      const optionId = pollRes.body.options[0].id;

      const res = await supertest(app.server)
        .post(`/groups/${groupId}/polls/${pollId}/options/${optionId}/vote`)
        .set(authHeader());

      expect(res.status).toBe(201);
    });
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await supertest(app.server).get('/groups');
      expect(res.status).toBe(401);
    });
  });

  // ── Deferred ───────────────────────────────────────────────────────────────

  test.todo(
    'PUT /groups/:id/polls/:pollId/vote — single-select vote endpoint deferred (GROUPS_HANDOFF §9)',
  );
  test.todo(
    'POST /groups/:id/suggestions/:suggestionId/vote — suggestion voting requires Event.allowSuggestionVoting setup',
  );
});

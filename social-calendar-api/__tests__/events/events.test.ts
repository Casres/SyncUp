/**
 * Events domain — integration tests.
 *
 * Hits the real Fastify app via supertest. Database state is reset in
 * `beforeAll` / `afterAll`. The Clerk JWT verification is mocked at
 * `__tests__/setup/jest-setup.ts` — every Bearer token resolves to
 * `sub: TEST_CLERK_USER_ID`.
 *
 * Notes on response shapes (verified against
 * `src/controllers/events.controller.ts` at handoff time):
 *   - `GET /events` → 200 { events: EventResponse[] }     (NOT a bare array)
 *   - `POST /events` → 201 EventResponse
 *   - `GET /events/:id` → 200 EventResponse | 404
 *   - `DELETE /events/:id` → 204 (no body)
 *
 * `EventResponse.creatorId` is the SyncUp `User.id` (cuid), not the
 * Clerk id — the auth middleware upserts the User row keyed on clerkId
 * and that id is what's surfaced everywhere downstream.
 *
 * test.todo entries correspond to flagged items in
 * `src/routes/EVENTS_HANDOFF.md` "Open items the Lead Manager should
 * track" §1, §2, §3 — invite endpoints, co-host management, and
 * `EventException` handling are deferred.
 */
import supertest from 'supertest';
import { closeApp, getApp } from '../setup/app-factory.js';
import {
  disconnectTestDb,
  testPrisma,
  truncateAll,
} from '../setup/db-helpers.js';
import { authHeader, TEST_USER_SEED } from '../setup/auth-helpers.js';

describe('Events domain — integration', () => {
  let app: Awaited<ReturnType<typeof getApp>>;

  beforeAll(async () => {
    app = await getApp();
    await truncateAll();
    // Pre-create the test user so the auth middleware's upsert is a
    // no-op `update: {}` rather than an INSERT on every request.
    await testPrisma.user.create({ data: TEST_USER_SEED });
  });

  afterAll(async () => {
    await truncateAll();
    await closeApp();
    await disconnectTestDb();
  });

  // ── GET /events ────────────────────────────────────────────────────────────

  describe('GET /events', () => {
    it('returns 200 with a wrapped events array (empty when none exist)', async () => {
      const res = await supertest(app.server)
        .get('/events')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
    });
  });

  // ── POST /events ───────────────────────────────────────────────────────────

  describe('POST /events', () => {
    it('creates an event and returns 201 with the event payload', async () => {
      const res = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'Jest Test Event',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 90_000_000).toISOString(),
          allowSuggestionVoting: false,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Jest Test Event' });
      expect(res.body.id).toBeDefined();
      expect(res.body.creatorId).toBeDefined();
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 when no Authorization header is provided', async () => {
      const res = await supertest(app.server)
        .post('/events')
        .send({ title: 'Unauthorized' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /events/:id ────────────────────────────────────────────────────────

  describe('GET /events/:id', () => {
    it('returns 404 for a non-existent event id', async () => {
      const res = await supertest(app.server)
        .get('/events/non-existent-id')
        .set(authHeader());

      expect(res.status).toBe(404);
    });

    it('returns 200 with the event when the caller is the organiser', async () => {
      const created = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'Lookup Test',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 90_000_000).toISOString(),
        });

      expect(created.status).toBe(201);

      const res = await supertest(app.server)
        .get(`/events/${created.body.id}`)
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });
  });

  // ── DELETE /events/:id ─────────────────────────────────────────────────────

  describe('DELETE /events/:id', () => {
    it('soft-deletes an event, returns 204, and the event disappears from listing', async () => {
      const created = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'To Be Deleted',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 90_000_000).toISOString(),
        });

      expect(created.status).toBe(201);

      const del = await supertest(app.server)
        .delete(`/events/${created.body.id}`)
        .set(authHeader());

      expect(del.status).toBe(204);

      const list = await supertest(app.server)
        .get('/events')
        .set(authHeader());

      expect(list.status).toBe(200);
      const found = list.body.events.find(
        (e: { id: string }) => e.id === created.body.id,
      );
      expect(found).toBeUndefined();
    });
  });

  // ── Invites (Round-17 Invites Domain — EVENTS_HANDOFF §1 RESOLVED) ────────

  describe('Invites — incremental endpoints', () => {
    it('POST /events/:id/invites sends invites to a recipient list', async () => {
      // Need a second user to receive an invite. Direct insert via the
      // migration-owner client — RLS bypassed.
      const recipient = await testPrisma.user.create({
        data: {
          clerkId: 'test_clerk_invite_recipient',
          username: 'inviterec',
          displayName: 'Invite Recipient',
        },
      });

      const created = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'Invite Test Event',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 90_000_000).toISOString(),
        });
      expect(created.status).toBe(201);

      const res = await supertest(app.server)
        .post(`/events/${created.body.id}/invites`)
        .set(authHeader())
        .send({ recipientIds: [recipient.id] });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.invites)).toBe(true);
      expect(res.body.invites).toHaveLength(1);
      expect(res.body.invites[0]).toMatchObject({
        recipientId: recipient.id,
        status: 'PENDING',
      });
    });

    it('PATCH /events/:id/invites/:inviteId returns 403 when the caller is not the recipient', async () => {
      // Caller (the authenticated user) creates an event AND we direct-
      // insert an invite where the recipient is a DIFFERENT user. The
      // caller is the organiser, NOT the recipient — they cannot
      // change someone else's RSVP.
      const otherRecipient = await testPrisma.user.create({
        data: {
          clerkId: 'test_clerk_rsvp_other',
          username: 'rsvpother',
          displayName: 'Other RSVP',
        },
      });
      const event = await supertest(app.server)
        .post('/events')
        .set(authHeader())
        .send({
          title: 'RSVP Forbidden Test',
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 90_000_000).toISOString(),
        });
      const invite = await testPrisma.eventInvite.create({
        data: {
          eventId: event.body.id,
          recipientId: otherRecipient.id,
        },
      });

      const res = await supertest(app.server)
        .patch(`/events/${event.body.id}/invites/${invite.id}`)
        .set(authHeader())
        .send({ status: 'ACCEPTED' });
      expect(res.status).toBe(403);
    });
  });
  test.todo(
    'POST /events/:id/organisers — co-host management not yet implemented (EVENTS_HANDOFF §2)',
  );
  test.todo(
    'POST /events/:id/exceptions — EventException endpoints not yet implemented (EVENTS_HANDOFF §3)',
  );
});

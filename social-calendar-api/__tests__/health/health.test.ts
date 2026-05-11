/**
 * Health route — sanity check.
 *
 * Verifies the app factory builds, Fastify reaches `ready()`, and the
 * unauthenticated `/health` route responds. This is the smallest possible
 * integration smoke test — if it fails, none of the domain suites will
 * pass either.
 *
 * `/health` is registered before the auth plugin AND listed in the auth
 * middleware's SKIP_PREFIXES, so this request requires no token.
 */
import supertest from 'supertest';
import { closeApp, getApp } from '../setup/app-factory.js';
import { disconnectTestDb } from '../setup/db-helpers.js';

describe('GET /health — sanity', () => {
  let app: Awaited<ReturnType<typeof getApp>>;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closeApp();
    await disconnectTestDb();
  });

  it('returns 200 with { status: "ok" } and does not require auth', async () => {
    const res = await supertest(app.server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
